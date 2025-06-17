-- Pinclone Application Schema
-- Version: Simplified (No boards, tags, comments, likes, follows)
--
-- CRITICAL SUPABASE SETUP NOTES:
-- 1. .env.local: Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
-- 2. SQL Editor: Run this ENTIRE script in your Supabase SQL Editor.
-- 3. Storage Buckets:
--    - Create a bucket named 'pins'. Make it PUBLIC. (Used in /create page)
--    - Create a bucket named 'avatars'. Make it PUBLIC. (Used in /settings/profile page)
--    RLS policies for these buckets are defined below but depend on RLS being active on storage.objects.
-- 4. Refresh Schema Cache: In Supabase Dashboard -> API section -> Click "Reload schema".
-- 5. Restart Next.js: After any .env or schema changes.
--
-- IF YOU HAVE UPLOAD ISSUES (like 'new row violates row-level security policy'):
--    - Double-check that the RLS policies for storage.objects from this file have been applied.
--    - Consider MANUALLY ENABLING RLS on the 'storage.objects' table via the Supabase Dashboard (Database > Row Level Security)
--      if you want the storage RLS policies defined below to be active. If RLS is not enabled on 'storage.objects',
--      then access is controlled by the "Public bucket" toggle (for reads) and default Supabase behavior for authenticated users (for writes).

-- Drop schema if it exists to ensure a clean setup (optional, for fresh starts)
-- WARNING: This deletes ALL data in the public schema. Use with caution.
-- drop schema if exists public cascade;
-- create schema public;
-- grant usage on schema public to postgres, anon, authenticated, service_role;
-- alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
-- alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
-- alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;


-- Required Extensions
create extension if not exists "uuid-ossp" with schema extensions; -- Preferred schema for extensions
create extension if not exists "moddatetime" with schema extensions; -- For auto-updating updated_at

-- Function to automatically update 'updated_at' column
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- TABLE: profiles
-- Stores public user profile information.
create table public.profiles (
  id uuid not null primary key, -- Links to auth.users.id
  username text not null unique check (char_length(username) >= 3 and username ~ '^[a-zA-Z0-9_.]+$'),
  full_name text,
  bio text check (char_length(bio) <= 160),
  avatar_url text,
  website text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
comment on table public.profiles is 'Public user profiles, linked to Supabase Auth users.';
comment on column public.profiles.id is 'User ID, references auth.users.id.';
comment on column public.profiles.username is 'Unique public username for the user.';

-- Trigger for profiles updated_at
create trigger handle_updated_at_profiles
  before update on public.profiles
  for each row
  execute procedure public.update_updated_at_column();

-- RLS for profiles table
alter table public.profiles enable row level security;

drop policy if exists "Allow public read access to profiles" on public.profiles;
create policy "Allow public read access to profiles"
  on public.profiles for select
  using (true);

drop policy if exists "Allow individual user to insert their own profile" on public.profiles;
create policy "Allow individual user to insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Allow individual user to update their own profile" on public.profiles;
create policy "Allow individual user to update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id); -- Ensure they can only update their own

drop policy if exists "Allow individual user to delete their own profile" on public.profiles;
create policy "Allow individual user to delete their own profile"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);


-- TABLE: pins
-- Stores information about each pin.
create table public.pins (
  id uuid not null primary key default extensions.uuid_generate_v4(),
  user_id uuid not null,
  title text check (char_length(title) <= 100),
  description text check (char_length(description) <= 500),
  image_url text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint fk_user foreign key(user_id) references public.profiles(id) on delete cascade
);
comment on table public.pins is 'Represents individual pins created by users.';
comment on column public.pins.user_id is 'The user who created this pin.';

-- Indexes for pins
create index if not exists idx_pins_user_id on public.pins(user_id);
create index if not exists idx_pins_created_at on public.pins(created_at desc);
-- Full-text search index (optional but good for search performance)
-- CREATE INDEX pins_fts_idx ON public.pins USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));


-- Trigger for pins updated_at
create trigger handle_updated_at_pins
  before update on public.pins
  for each row
  execute procedure public.update_updated_at_column();

-- RLS for pins table
alter table public.pins enable row level security;

drop policy if exists "Allow public read access to pins" on public.pins;
create policy "Allow public read access to pins"
  on public.pins for select
  using (true);

drop policy if exists "Allow authenticated users to insert pins" on public.pins;
create policy "Allow authenticated users to insert pins"
  on public.pins for insert
  to authenticated
  with check (auth.uid() = user_id); -- user_id must match the uploader

drop policy if exists "Allow owner to update their pins" on public.pins;
create policy "Allow owner to update their pins"
  on public.pins for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Allow owner to delete their pins" on public.pins;
create policy "Allow owner to delete their pins"
  on public.pins for delete
  to authenticated
  using (auth.uid() = user_id);


-- Supabase Auth Hook: Handle New User
-- Creates a profile entry when a new user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  base_username text;
  final_username text;
  counter integer := 0;
  user_email_prefix text;
begin
  -- Extract email prefix for default username
  user_email_prefix := split_part(new.email, '@', 1);
  base_username := regexp_replace(user_email_prefix, '[^a-zA-Z0-9_.]', '', 'g');

  -- Ensure base_username is at least 3 characters
  if char_length(base_username) < 3 then
    base_username := base_username || 'user';
  end if;

  -- Ensure username is unique, appending counter if necessary
  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    counter := counter + 1;
    final_username := base_username || counter::text;
  end loop;

  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'full_name', null), -- From OAuth or signup metadata
    coalesce(new.raw_user_meta_data->>'avatar_url', null) -- From OAuth or signup metadata
  );
  return new;
end;
$$ language plpgsql security definer; -- security definer to allow writing to public.profiles

-- Trigger for new user
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- STORAGE RLS POLICIES
--
-- IMPORTANT NOTE:
-- The following policies for storage.objects are defined here for completeness.
-- However, they will ONLY BE ACTIVE if you MANUALLY ENABLE Row Level Security (RLS)
-- on the 'storage.objects' table itself via the Supabase Dashboard (Database > Row Level Security).
-- This script does NOT automatically enable RLS on 'storage.objects'.
--
-- If RLS is NOT enabled on 'storage.objects':
--   - Read access to buckets is controlled by the "Public bucket" toggle in the Supabase UI.
--     Ensure 'pins' and 'avatars' buckets are set to PUBLIC in the UI for images to be viewable.
--   - Write (insert, update, delete) access to buckets is generally allowed for ANY authenticated user
--     by Supabase default. Your application logic should ensure only intended users perform uploads.

-- Drop existing Storage RLS policies to avoid conflicts before recreating them
DROP POLICY IF EXISTS "Public read access for pins bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated insert for pins bucket" ON storage.objects;
DROP POLICY IF EXISTS "Owner update for pins bucket" ON storage.objects;
DROP POLICY IF EXISTS "Owner delete for pins bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for avatars bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated insert for avatars bucket" ON storage.objects;
DROP POLICY IF EXISTS "Owner update for avatars bucket" ON storage.objects;
DROP POLICY IF EXISTS "Owner delete for avatars bucket" ON storage.objects;

-- RLS policies for storage.objects (PINS bucket)
CREATE POLICY "Public read access for pins bucket"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'pins' );

CREATE POLICY "Authenticated insert for pins bucket"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK ( bucket_id = 'pins' AND auth.uid() IS NOT NULL ); -- Check user is authenticated

CREATE POLICY "Owner update for pins bucket"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING ( bucket_id = 'pins' AND auth.uid() = owner ); -- Owner is automatically set by Supabase to uploader's UID

CREATE POLICY "Owner delete for pins bucket"
  ON storage.objects FOR DELETE
  TO authenticated
  USING ( bucket_id = 'pins' AND auth.uid() = owner );

-- RLS policies for storage.objects (AVATARS bucket)
CREATE POLICY "Public read access for avatars bucket"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

CREATE POLICY "Authenticated insert for avatars bucket"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK ( bucket_id = 'avatars' AND auth.uid() IS NOT NULL );

CREATE POLICY "Owner update for avatars bucket"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING ( bucket_id = 'avatars' AND auth.uid() = owner );

CREATE POLICY "Owner delete for avatars bucket"
  ON storage.objects FOR DELETE
  TO authenticated
  USING ( bucket_id = 'avatars' AND auth.uid() = owner );

-- Ensure the an authenticated user can see their own user data from auth.users
-- This is often default but good to be explicit if issues arise with auth.uid() in policies.
-- GRANT SELECT ON TABLE auth.users TO authenticated;

-- Ensure the database owner can bypass RLS (usually default)
-- ALTER TABLE public.pins BYPASS RLS; -- Only for superuser or if specifically needed for admin tasks

-- Note: If you encounter "function extensions.uuid_generate_v4() does not exist",
-- ensure the "uuid-ossp" extension is enabled AND in the 'extensions' schema,
-- or adjust the default function call to `public.uuid_generate_v4()` if it's in 'public'.
-- This schema assumes it's in 'extensions'.
```
-- #############################################################################
-- # CRITICAL SETUP NOTE: CREATE SUPABASE STORAGE BUCKETS                    #
-- #############################################################################
-- Before your application can upload images, you MUST create the following
-- Storage buckets in your Supabase project dashboard:
--
-- 1. Bucket Name: `pins`
--    - Go to Supabase Dashboard -> Storage -> Create new bucket
--    - Name: `pins`
--    - Public bucket: YES (Toggle to ON) - This is the simplest setup.
--      (Alternatively, configure RLS policies for insert by authenticated users
--       and select by everyone if you need private buckets).
--
-- 2. Bucket Name: `avatars`
--    - Go to Supabase Dashboard -> Storage -> Create new bucket
--    - Name: `avatars`
--    - Public bucket: YES (Toggle to ON)
--      (Alternatively, configure RLS policies for insert/update by the owner
--       and select by everyone).
--
-- FAILURE TO CREATE THESE BUCKETS WILL RESULT IN "Bucket not found" ERRORS.
-- #############################################################################

-- Drop existing objects in the public schema
drop schema if exists public cascade;
create schema public;

-- Enable UUID generation
create extension if not exists "uuid-ossp" with schema public;

-- Function to automatically update 'updated_at' timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- TABLE: profiles
-- Stores public user profile information, linked to auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) >= 3 and username ~ '^[a-zA-Z0-9_.]+$'),
  full_name text,
  bio text,
  avatar_url text, -- URL to the avatar image in Supabase Storage
  website text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Trigger to update 'updated_at' for profiles
create trigger handle_profile_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

comment on table public.profiles is 'Public profile information for users.';
comment on column public.profiles.id is 'References auth.users.id.';

-- TABLE: pins
-- Stores information about pins created by users
create table public.pins (
  id uuid primary key default public.uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  description text,
  image_url text not null, -- URL to the pin image in Supabase Storage
  width integer not null,
  height integer not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Trigger to update 'updated_at' for pins
create trigger handle_pin_updated_at before update on public.pins
  for each row execute procedure public.update_updated_at_column();

comment on table public.pins is 'Individual pins created by users.';

-- INDEXES
create index idx_profiles_username_search on public.profiles using gin (username gin_trgm_ops);
create index idx_pins_user_id on public.pins(user_id);
create index idx_pins_title_search on public.pins using gin (title gin_trgm_ops);
create index idx_pins_description_search on public.pins using gin (description gin_trgm_ops);

-- Function to create a profile entry when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
declare
  base_username text;
  final_username text;
  username_suffix text;
  counter integer := 0;
begin
  -- Attempt to use the part of the email before the @ symbol as a base username
  base_username := split_part(new.email, '@', 1);
  -- Remove characters not allowed in usernames (allow alphanumeric, underscore, dot)
  base_username := regexp_replace(base_username, '[^a-zA-Z0-9_.]', '', 'g');
  -- Ensure username is at least 3 characters
  if char_length(base_username) < 3 then
    base_username := base_username || 'user';
  end if;
  -- Ensure username is not too long (e.g., max 20 chars for the base part)
  base_username := substr(base_username, 1, 20);

  final_username := base_username;
  -- Check if username exists and append a number if it does
  while exists (select 1 from public.profiles where username = final_username) loop
    counter := counter + 1;
    username_suffix := to_char(counter, 'FM999'); -- FM removes leading spaces
    final_username := base_username || username_suffix;
    -- Safety break if somehow too many users have similar names (highly unlikely)
    if counter > 1000 then
      final_username := base_username || public.uuid_generate_v4()::text; -- Fallback to UUID part
      exit;
    end if;
  end loop;

  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    final_username,
    new.raw_user_meta_data->>'full_name', -- Get full_name from metadata if provided at signup
    new.raw_user_meta_data->>'avatar_url' -- Get avatar_url from metadata if provided (e.g. OAuth)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call handle_new_user on new user creation in auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ROW LEVEL SECURITY (RLS) POLICIES

-- Profiles RLS
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update their own profile."
  on public.profiles for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

create policy "Users can delete their own profile."
  on public.profiles for delete
  using ( auth.uid() = id );

-- Pins RLS
alter table public.pins enable row level security;

create policy "Pins are viewable by everyone."
  on public.pins for select
  using ( true );

create policy "Authenticated users can create pins."
  on public.pins for insert
  with check ( auth.role() = 'authenticated' and auth.uid() = user_id );

create policy "Users can update their own pins."
  on public.pins for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

create policy "Users can delete their own pins."
  on public.pins for delete
  using ( auth.uid() = user_id );

-- Note on Storage RLS:
-- Policies for Supabase Storage are managed separately in the Supabase dashboard
-- under Storage -> Policies for each bucket.
-- For 'pins' bucket (if not public):
--   - Authenticated users can upload (insert).
--   - Everyone can read (select).
-- For 'avatars' bucket (if not public):
--   - Users can upload/update their own avatar (insert, update where auth.uid() matches user_id in path).
--   - Everyone can read (select).
-- If buckets are set to "Public", these RLS policies on Storage are not strictly needed for read access.
```
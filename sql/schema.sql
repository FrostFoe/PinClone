-- =====================================================================================
-- IMPORTANT SUPABASE SETUP (Run this in Supabase SQL Editor)
-- =====================================================================================
--
-- 1. ENVIRONMENT VARIABLES:
--    Ensure your Next.js project has a .env.local file with:
--    NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
--    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
--
-- 2. STORAGE BUCKETS (MANUAL SETUP IN SUPABASE DASHBOARD):
--    This SQL script DOES NOT create Storage buckets. You MUST create them manually:
--    - Go to Supabase Dashboard -> Storage -> Buckets.
--    - Create a bucket named 'pins' (all lowercase). Toggle 'Public bucket' ON.
--    - Create a bucket named 'avatars' (all lowercase). Toggle 'Public bucket' ON.
--    The RLS policies for these buckets ARE included in this script.
--
-- 3. APPLY THIS SQL SCRIPT:
--    Execute this entire script in your Supabase project's SQL Editor.
--
-- 4. REFRESH SUPABASE SCHEMA CACHE (CRITICAL):
--    After running this SQL, go to Supabase Dashboard -> API section -> Click "Reload schema".
--
-- 5. (RECOMMENDED) REGENERATE TYPES:
--    npx supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > src/types/supabase.ts
--
-- =====================================================================================

-- ⚠️ WARNING: This deletes ALL data in the public schema. Backup if needed.
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON SCHEMA public TO service_role;


-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA extensions; -- For auto-updating updated_at

-- =====================================================================================
-- Profiles Table (Linked to Supabase Auth)
-- =====================================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comment on profiles table
COMMENT ON TABLE public.profiles IS 'Stores public profile information for users, linked to Supabase Auth.';

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger to update 'updated_at' timestamp on profile update
CREATE TRIGGER handle_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime (updated_at);

-- =====================================================================================
-- Pins Table
-- =====================================================================================
CREATE TABLE public.pins (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comment on pins table
COMMENT ON TABLE public.pins IS 'Stores information about pins created by users.';

-- RLS for pins
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pins are viewable by everyone."
  ON public.pins FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own pins."
  ON public.pins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pins."
  ON public.pins FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pins."
  ON public.pins FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update 'updated_at' timestamp on pin update
CREATE TRIGGER handle_updated_at_pins
  BEFORE UPDATE ON public.pins
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime (updated_at);

-- =====================================================================================
-- Indexes for Performance
-- =====================================================================================
CREATE INDEX idx_profiles_username ON public.profiles USING BTREE (username);
ALTER TABLE public.profiles CLUSTER ON idx_profiles_username; -- Optional: physically order table

CREATE INDEX idx_pins_user_id ON public.pins USING BTREE (user_id);
-- Optional: For full-text search on pins (if you implement it later)
-- CREATE INDEX idx_pins_text_search ON public.pins USING GIN (to_tsvector('english', title || ' ' || description));

-- =====================================================================================
-- Function & Trigger to Handle New User (Create Profile)
-- =====================================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Attempt to use email prefix as username
  base_username := split_part(NEW.email, '@', 1);
  -- Sanitize and ensure minimum length if needed
  base_username := regexp_replace(base_username, '[^a-zA-Z0-9_.]', '', 'g');
  IF length(base_username) < 3 THEN
    base_username := base_username || 'user';
  END IF;
  base_username := left(base_username, 20); -- Max length for username part

  final_username := base_username;
  -- Check for uniqueness and append counter if necessary
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    final_username,
    NEW.raw_user_meta_data->>'full_name', -- Get full_name from metadata if provided during signup
    NEW.raw_user_meta_data->>'avatar_url' -- Get avatar_url from metadata if provided (e.g., by OAuth)
  );
  RETURN NEW;
END;
$$;

-- Trigger to call handle_new_user on new auth.users entry
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a new user profile upon account creation in auth.users.';


-- =====================================================================================
-- STORAGE Row Level Security (RLS)
-- =====================================================================================
-- These policies assume you have buckets named 'avatars' and 'pins'.
-- Create these buckets in the Supabase Dashboard (Storage -> Buckets) and set them to 'Public'.

-- First, drop existing policies for these specific names to avoid conflicts if re-running
DROP POLICY IF EXISTS "Allow public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to pins" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload to pins" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner update on avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner delete on avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner update on pins" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner delete on pins" ON storage.objects;

-- Allow public read access to 'avatars' (if bucket is marked public)
CREATE POLICY "Allow public read access to avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Allow public read access to 'pins' (if bucket is marked public)
CREATE POLICY "Allow public read access to pins" ON storage.objects
  FOR SELECT USING (bucket_id = 'pins');

-- Allow authenticated users to upload to 'avatars' bucket
-- The `auth.uid() = owner` check ensures the uploader becomes the owner.
CREATE POLICY "Allow authenticated upload to avatars" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);

-- Allow authenticated users to upload to 'pins' bucket
CREATE POLICY "Allow authenticated upload to pins" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pins' AND auth.uid() = owner);

-- Allow owner to update their own avatars
CREATE POLICY "Allow owner update on avatars" ON storage.objects
  FOR UPDATE TO authenticated USING (auth.uid() = owner AND bucket_id = 'avatars') WITH CHECK (auth.uid() = owner AND bucket_id = 'avatars');

-- Allow owner to delete their own avatars
CREATE POLICY "Allow owner delete on avatars" ON storage.objects
  FOR DELETE TO authenticated USING (auth.uid() = owner AND bucket_id = 'avatars');

-- Allow owner to update their own pin images (less common, but for completeness)
CREATE POLICY "Allow owner update on pins" ON storage.objects
  FOR UPDATE TO authenticated USING (auth.uid() = owner AND bucket_id = 'pins') WITH CHECK (auth.uid() = owner AND bucket_id = 'pins');

-- Allow owner to delete their own pin images
CREATE POLICY "Allow owner delete on pins" ON storage.objects
  FOR DELETE TO authenticated USING (auth.uid() = owner AND bucket_id = 'pins');

-- IMPORTANT: Enable RLS on the storage.objects table if not already enabled
-- This is usually enabled by default when you enable RLS on a bucket via UI,
-- but explicitly stating it here is good practice for SQL-first setup.
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Grant usage on storage schema to authenticated and anon roles
-- These are typically granted by default but good to be explicit.
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO anon;

-- Grant all privileges on buckets table for service_role (internal Supabase use)
-- GRANT ALL ON TABLE storage.buckets TO service_role; -- Not strictly needed for user app RLS usually

-- Grant necessary privileges on objects table for authenticated and anon roles based on policies
GRANT SELECT ON TABLE storage.objects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE storage.objects TO authenticated;


-- =====================================================================================
-- Final Check & Granting Default Privileges
-- =====================================================================================
-- Supabase automatically handles most default privileges, but explicitly ensuring anon
-- and authenticated roles can use the public schema and its contents is good.
-- These commands are often run by Supabase automatically but are included for completeness.

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role; -- If you use sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

-- Grant access to the storage schema if not already present
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;


-- (End of Script)
-- Remember to REFRESH Supabase Schema Cache after running this.
-- And create 'pins' and 'avatars' buckets in Supabase Storage Dashboard.
-- =====================================================================================

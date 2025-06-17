-- ==========================================================================================
-- PINCLONE APP DATABASE SCHEMA
-- Version: 2.0
-- Description: Schema for a Pinterest-style application with users, profiles, and pins.
-- Includes tables, RLS policies for tables and storage, and helper functions/triggers.
--
-- !! CRITICAL SETUP INSTRUCTIONS FOR SUPABASE STORAGE !!
-- !! THIS SQL DOES NOT CREATE STORAGE BUCKETS. YOU MUST DO IT MANUALLY. !!
--
-- 1. CREATE 'pins' BUCKET IN SUPABASE STORAGE:
--    - Go to Supabase Dashboard -> Storage -> Buckets.
--    - Click 'Create new bucket'.
--    - Bucket name: pins (all lowercase)
--    - Toggle 'Public bucket' to ON.
--    - Click 'Create bucket'.
--
-- 2. CREATE 'avatars' BUCKET IN SUPABASE STORAGE:
--    - Go to Supabase Dashboard -> Storage -> Buckets.
--    - Click 'Create new bucket'.
--    - Bucket name: avatars (all lowercase)
--    - Toggle 'Public bucket' to ON.
--    - Click 'Create bucket'.
--
-- The RLS policies for these buckets are included further down in this script.
-- After running this entire SQL script, REFRESH YOUR SUPABASE SCHEMA CACHE
-- (Supabase Dashboard -> API section -> "Reload schema").
-- ==========================================================================================

-- ⚠️ WARNING: This drops the entire 'public' schema and recreates it.
-- ALL EXISTING DATA IN THE 'public' SCHEMA WILL BE DELETED.
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Grant usage on the new public schema to necessary roles
GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- Optional: Revoke all from public for more security, then grant specifically.
-- REVOKE ALL ON SCHEMA public FROM public;
-- GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions; -- Ensure it's in a schema like 'extensions' or 'public' if 'extensions' doesn't exist

-- Enable moddatetime extension for automatic updated_at timestamps
CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA extensions;

-- ==========================================================================================
-- Profiles Table
-- Stores public user information, linked to Supabase Auth users.
-- ==========================================================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE CHECK (char_length(username) >= 3 AND username ~ '^[a-zA-Z0-9_.]+$'),
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    website TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.profiles IS 'Stores public user profile information linked to Supabase auth users.';
COMMENT ON COLUMN public.profiles.id IS 'User ID, references auth.users.id.';
COMMENT ON COLUMN public.profiles.username IS 'Unique public username for the user.';
COMMENT ON COLUMN public.profiles.full_name IS 'Full name of the user.';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to the user''s avatar image.';
COMMENT ON COLUMN public.profiles.bio IS 'Short biography of the user.';
COMMENT ON COLUMN public.profiles.website IS 'User''s personal or professional website URL.';

-- Indexes for profiles
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_full_name_gin ON public.profiles USING gin (to_tsvector('simple', full_name));

-- RLS Policies for profiles
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

CREATE POLICY "Users can delete their own profile."
    ON public.profiles FOR DELETE
    USING (auth.uid() = id);

-- ==========================================================================================
-- Pins Table
-- Stores information about pins created by users.
-- ==========================================================================================
CREATE TABLE public.pins (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.pins IS 'Stores information about pins created by users.';
COMMENT ON COLUMN public.pins.user_id IS 'The user who created the pin.';
COMMENT ON COLUMN public.pins.image_url IS 'URL of the pin image (typically from Supabase Storage).';
COMMENT ON COLUMN public.pins.width IS 'Original width of the image in pixels.';
COMMENT ON COLUMN public.pins.height IS 'Original height of the image in pixels.';

-- Indexes for pins
CREATE INDEX idx_pins_user_id ON public.pins(user_id);
CREATE INDEX idx_pins_title_description_gin ON public.pins USING gin (to_tsvector('english', title || ' ' || description));


-- RLS Policies for pins
CREATE POLICY "Pins are viewable by everyone."
    ON public.pins FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create pins."
    ON public.pins FOR INSERT
    TO authenticated -- Restrict to authenticated role
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pins."
    ON public.pins FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pins."
    ON public.pins FOR DELETE
    USING (auth.uid() = user_id);

-- ==========================================================================================
-- Helper Functions and Triggers
-- ==========================================================================================

-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ language 'plpgsql';

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Automatically updates the updated_at timestamp on row modification.';

-- Triggers for 'updated_at'
CREATE TRIGGER handle_profile_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER handle_pin_updated_at
    BEFORE UPDATE ON public.pins
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Function to create a profile entry when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  username_generated TEXT;
BEGIN
  -- Attempt to generate a username from email prefix
  username_generated := split_part(NEW.email, '@', 1);
  -- Clean the username (remove special chars, ensure min length, etc.)
  -- This is a basic cleaning, might need to be more robust
  username_generated := lower(regexp_replace(username_generated, '[^a-zA-Z0-9_.]', '', 'g'));
  IF char_length(username_generated) < 3 THEN
    username_generated := username_generated || '_user';
  END IF;
  -- Ensure uniqueness by appending a short random string if it already exists
  -- This is a simplified approach; a loop with checks would be more robust for collisions
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = username_generated) THEN
     username_generated := username_generated || '_' || substr(extensions.uuid_generate_v4()::text, 1, 4);
  END IF;

  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    username_generated,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL), -- Get full_name from metadata if available
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL) -- Get avatar_url from metadata if available
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a public.profiles entry for a new auth.users entry.';

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================================================================
-- Supabase Storage RLS Policies (storage.objects table)
--
-- CRITICAL: These policies assume you have MANUALLY CREATED buckets named
-- 'avatars' and 'pins' in your Supabase Storage dashboard and made them PUBLIC.
-- If buckets are private, RLS policies for SELECT would need to be more specific.
-- ==========================================================================================

-- Enable RLS on storage.objects if not already enabled.
-- This is crucial for the policies below to take effect.
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for a cleaner setup (optional, but good for resets)
-- Be cautious with these drop statements in a production environment if you have custom policies.
DROP POLICY IF EXISTS "Allow authenticated upload to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner to update their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner to delete their avatar" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated upload to pins" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to pins" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner to update their pin image" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner to delete their pin image" ON storage.objects;


-- Policies for 'avatars' bucket
CREATE POLICY "Allow authenticated upload to avatars"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner); -- owner is automatically set to auth.uid() by Supabase

CREATE POLICY "Allow public read access to avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Allow owner to update their avatar"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid() = owner)
    WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);

CREATE POLICY "Allow owner to delete their avatar"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid() = owner);


-- Policies for 'pins' bucket
CREATE POLICY "Allow authenticated upload to pins"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'pins' AND auth.uid() = owner); -- owner is automatically set to auth.uid() by Supabase

CREATE POLICY "Allow public read access to pins"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'pins');

CREATE POLICY "Allow owner to update their pin image"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'pins' AND auth.uid() = owner)
    WITH CHECK (bucket_id = 'pins' AND auth.uid() = owner);

CREATE POLICY "Allow owner to delete their pin image"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'pins' AND auth.uid() = owner);

-- ==========================================================================================
-- Final sanity checks and notes:
-- 1. Ensure your Supabase Project URL and Anon Key are correctly set in .env.local.
-- 2. After running this script, REFRESH THE SUPABASE SCHEMA CACHE via the Supabase Dashboard (API section).
-- 3. Manually create 'avatars' and 'pins' buckets in Supabase Storage and set them to PUBLIC.
-- 4. Test user signup, profile updates, pin creation, and image uploads.
-- ==========================================================================================
SELECT 'Pinclone Schema V2.0 setup complete.' AS status;

    
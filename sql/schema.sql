
-- Supabase Pinclone App Schema
-- Version: 1.0.0
--
-- This script creates the necessary tables, relationships,
-- indexes, and RLS policies for the Pinclone application.
-- It also includes a trigger to automatically create a user
-- profile when a new user signs up via Supabase Auth.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles Table
-- Stores public user profile information.
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3 AND char_length(username) <= 50 AND username ~ '^[a-zA-Z0-9_.]+$'),
    full_name TEXT CHECK (char_length(full_name) <= 100),
    avatar_url TEXT CHECK (char_length(avatar_url) <= 1024),
    bio TEXT CHECK (char_length(bio) <= 160),
    website TEXT CHECK (char_length(website) <= 255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.profiles IS 'User profile information linked to Supabase Auth users.';
COMMENT ON COLUMN public.profiles.id IS 'References auth.users.id from Supabase Auth.';
COMMENT ON COLUMN public.profiles.username IS 'Unique, publicly visible username. Min 3, Max 50 chars, alphanumeric, underscores, dots.';
COMMENT ON COLUMN public.profiles.full_name IS 'User''s full name.';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to the user''s avatar image.';
COMMENT ON COLUMN public.profiles.bio IS 'Short user biography, max 160 characters.';
COMMENT ON COLUMN public.profiles.website IS 'User''s personal or professional website.';

-- Make username case-insensitive unique and search-friendly
CREATE UNIQUE INDEX profiles_username_case_insensitive_idx ON public.profiles (lower(username));
-- Index for searching profiles by full_name
CREATE INDEX profiles_full_name_idx ON public.profiles USING gin (to_tsvector('english', full_name));


-- Row Level Security (RLS) for Profiles Table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Allow user to insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow user to update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow user to delete their own profile"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);


-- Pins Table
-- Stores information about each pin.
CREATE TABLE public.pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL CHECK (char_length(image_url) <= 1024),
    title TEXT CHECK (char_length(title) <= 100),
    description TEXT CHECK (char_length(description) <= 500),
    width INTEGER NOT NULL CHECK (width > 0),
    height INTEGER NOT NULL CHECK (height > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.pins IS 'Represents individual pins created by users.';
COMMENT ON COLUMN public.pins.user_id IS 'The user who created the pin, references auth.users.id.';
COMMENT ON COLUMN public.pins.image_url IS 'URL of the pin''s image.';
COMMENT ON COLUMN public.pins.title IS 'Title of the pin, max 100 characters.';
COMMENT ON COLUMN public.pins.description IS 'Description of the pin, max 500 characters.';
COMMENT ON COLUMN public.pins.width IS 'Width of the image in pixels.';
COMMENT ON COLUMN public.pins.height IS 'Height of the image in pixels.';

-- Indexes for Pins Table
CREATE INDEX idx_pins_user_id ON public.pins(user_id);
CREATE INDEX idx_pins_created_at ON public.pins(created_at DESC);
-- For text search on title and description
CREATE INDEX pins_text_search_idx ON public.pins USING gin (to_tsvector('english', title || ' ' || description));


-- Row Level Security (RLS) for Pins Table
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to pins"
ON public.pins FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated users to insert pins"
ON public.pins FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owner to update their pins"
ON public.pins FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owner to delete their pins"
ON public.pins FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- Function and Trigger to create a profile on new user signup
-- This function attempts to generate a username. If it fails due to uniqueness
-- or other constraints, the user will need to set their username in profile settings.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  generated_username TEXT;
  email_prefix TEXT;
  random_suffix TEXT;
  attempts INTEGER := 0;
BEGIN
  -- Extract prefix from email
  email_prefix := substring(new.email from 1 for position('@' in new.email) - 1);
  -- Sanitize email_prefix to be valid for username (alphanumeric, underscore, dot)
  email_prefix := lower(regexp_replace(email_prefix, '[^a-zA-Z0-9_.]', '', 'g'));
  -- Ensure prefix is not too short or too long
  IF char_length(email_prefix) < 2 THEN
    email_prefix := 'user';
  ELSIF char_length(email_prefix) > 30 THEN
    email_prefix := substring(email_prefix from 1 for 30);
  END IF;

  -- Attempt to generate a unique username
  LOOP
    random_suffix := to_char(floor(random() * 100000), 'FM00000');
    generated_username := email_prefix || '_' || random_suffix;
    -- Ensure generated_username does not exceed max length for username
    generated_username := substring(generated_username from 1 for 50);

    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = generated_username);
    attempts := attempts + 1;
    IF attempts > 10 THEN -- Prevent infinite loop in rare high-collision scenarios
      -- Fallback: use a generic prefix if too many collisions
      generated_username := 'new_user_' || to_char(floor(random() * 1000000), 'FM000000');
      generated_username := substring(generated_username from 1 for 50);
      IF EXISTS (SELECT 1 FROM public.profiles WHERE username = generated_username) THEN
         -- Extremely rare case, let the insert fail and user can set username manually
         RAISE WARNING 'Could not generate a unique username for user % after multiple attempts.', new.id;
         RETURN new; -- Or handle error more explicitly if needed
      END IF;
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    new.id,
    generated_username,
    new.raw_user_meta_data->>'full_name', -- Use full_name from auth metadata if available
    new.raw_user_meta_data->>'avatar_url' -- Use avatar_url from auth metadata if available
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger function to create a user profile upon new auth.users signup. Attempts to generate a unique username.';

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Storage Bucket Information (Manual Setup in Supabase Dashboard)
--
-- 1. Pins Bucket:
--    - Name: `pins`
--    - Public: Yes (or set appropriate RLS policies on bucket/objects)
--    - RLS for Storage Objects (example):
--      - Allow authenticated users to upload into their own folder:
--        For INSERT: (bucket_id = 'pins' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = 'public' AND (storage.foldername(name))[2] = auth.uid()::text)
--        This policy assumes uploads go to `public/<user_id>/<filename>`. Adjust as needed.
--      - Allow public read access: (SELECT: true for all roles)
--
-- 2. Avatars Bucket:
--    - Name: `avatars`
--    - Public: Yes
--    - RLS for Storage Objects (example):
--      - Allow authenticated user to upload/update their own avatar:
--        For INSERT/UPDATE: (bucket_id = 'avatars' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
--        This policy assumes avatars are uploaded to `<user_id>/avatar.<ext>`. Adjust as needed.
--      - Allow public read access: (SELECT: true for all roles)
--
-- Note: The RLS policies for storage are examples. Review Supabase Storage documentation
-- for detailed policy creation that matches your exact access control requirements.
-- Ensure the file paths used in your application code match the paths enforced by these policies.

-- End of Schema Script
-- Apply this script in your Supabase SQL Editor.
-- Remember to also create the Storage Buckets (`pins` and `avatars`) via the Supabase Dashboard.


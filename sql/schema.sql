-- ⚠️ WARNING: This script deletes ALL data in the public schema.
-- Make sure to backup any important data before running this.

-- Drop existing schema and objects if they exist to ensure a clean slate
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Grant usage on the new public schema to postgres and supabase_admin
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO supabase_admin;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions; -- Changed to extensions schema

--
-- TABLE: profiles
-- Stores user-specific public information.
--
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY, -- Linked to auth.users.id
  username TEXT NOT NULL UNIQUE,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS: Enable RLS for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS: Profiles are publicly viewable.
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (true);

-- RLS: Users can insert their own profile.
CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS: Users can update their own profile.
CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Constraint: Link profiles.id to Supabase Auth user.id
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_auth_user FOREIGN KEY (id)
  REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- TABLE: pins
-- Stores information about each pin.
--
CREATE TABLE public.pins (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(), -- Changed to extensions.uuid_generate_v4()
  user_id uuid NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT fk_pins_user FOREIGN KEY (user_id)
    REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- RLS: Enable RLS for pins table
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

-- RLS: Pins are publicly viewable.
CREATE POLICY "Pins are viewable by everyone."
  ON public.pins FOR SELECT
  USING (true);

-- RLS: Authenticated users can insert pins.
CREATE POLICY "Authenticated users can create pins."
  ON public.pins FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS: Users can update their own pins.
CREATE POLICY "Users can update their own pins."
  ON public.pins FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS: Users can delete their own pins.
CREATE POLICY "Users can delete their own pins."
  ON public.pins FOR DELETE
  USING (auth.uid() = user_id);

--
-- INDEXES
--
CREATE INDEX idx_profiles_username ON public.profiles(LOWER(username)); -- Index for case-insensitive username search
CREATE INDEX idx_pins_user_id ON public.pins(user_id);
CREATE INDEX idx_pins_created_at ON public.pins(created_at DESC);

--
-- TRIGGER FUNCTION: update_updated_at_column
-- This function updates the 'updated_at' column to the current timestamp.
--
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--
-- TRIGGERS for updated_at
--
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_pins_updated_at
  BEFORE UPDATE ON public.pins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- FUNCTION: handle_new_user
-- This function creates a profile entry for new users.
--
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  new_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Attempt to use the part of the email before the '@' as a base username
  base_username := SPLIT_PART(NEW.email, '@', 1);
  -- Basic sanitization: remove non-alphanumeric characters, except underscores and dots
  base_username := REGEXP_REPLACE(base_username, '[^a-zA-Z0-9_.]', '', 'g');
  -- Ensure username is not too short
  IF LENGTH(base_username) < 3 THEN
    base_username := base_username || 'user';
  END IF;
  -- Ensure username is not too long
  base_username := SUBSTRING(base_username FROM 1 FOR 20);

  new_username := base_username;

  -- Check for username uniqueness and append a counter if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = new_username) LOOP
    counter := counter + 1;
    new_username := base_username || counter::TEXT;
    -- If the appended counter makes it too long, truncate base_username further
    IF LENGTH(new_username) > 24 THEN -- Max length for username (e.g. 24 chars)
        new_username := SUBSTRING(base_username FROM 1 FOR (24 - LENGTH(counter::TEXT))) || counter::TEXT;
    END IF;
  END LOOP;

  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    new_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)), -- Use full_name from metadata or email part
    NEW.raw_user_meta_data->>'avatar_url' -- Use avatar_url from metadata if available
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

--
-- TRIGGER: on_auth_user_created
-- This trigger calls handle_new_user when a new user is created in auth.users.
--
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions to Supabase roles
-- (Supabase handles this well, but explicitly stating for clarity/completeness)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated; -- More specific RLS will control this
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';
COMMENT ON TABLE public.profiles IS 'Stores public user profile information, linked to auth.users.';
COMMENT ON COLUMN public.profiles.id IS 'User ID, references auth.users.id.';
COMMENT ON COLUMN public.profiles.username IS 'Unique public username for the user.';
COMMENT ON TABLE public.pins IS 'Stores information about visual pins created by users.';
COMMENT ON COLUMN public.pins.user_id IS 'The user who created the pin, references profiles.id.';

-- Note: Advanced features like Full-Text Search (FTS) vectors, tags, likes, comments, boards etc.
-- would require additional tables and potentially GIN/GIST indexes on tsvector columns.
-- This schema provides a foundational setup.

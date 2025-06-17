
-- Drop existing tables if they exist to ensure a clean setup.
-- CASCADE will also drop dependent objects like indexes and constraints.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.pins CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Enable Row Level Security
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create the profiles table
-- This table stores public user profile information.
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3 AND username ~ '^[a-zA-Z0-9_.]+$'),
  full_name TEXT,
  avatar_url TEXT CHECK (avatar_url ~* '^https?://.+'),
  bio TEXT CHECK (char_length(bio) <= 160),
  website TEXT CHECK (website ~* '^https?://.+'),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.profiles IS 'Public user profiles, linked to auth.users.';
COMMENT ON COLUMN public.profiles.id IS 'References auth.users.id';
COMMENT ON COLUMN public.profiles.username IS 'Unique, public username (3+ chars, alphanumeric, _, .)';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL for the user''s avatar image.';
COMMENT ON COLUMN public.profiles.bio IS 'Short user biography (max 160 chars).';
COMMENT ON COLUMN public.profiles.website IS 'User''s personal or professional website URL.';

-- Create an index on lowercase username for case-insensitive unique checks and searches
CREATE UNIQUE INDEX profiles_username_lower_idx ON public.profiles (LOWER(username));
-- Create an index on full_name for searching
CREATE INDEX profiles_full_name_idx ON public.profiles USING GIN (to_tsvector('english', full_name));


-- Create the pins table
-- This table stores information about each pin.
CREATE TABLE public.pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL CHECK (image_url ~* '^https?://.+'),
  title TEXT CHECK (char_length(title) <= 100),
  description TEXT CHECK (char_length(description) <= 500),
  width INT NOT NULL CHECK (width > 0),
  height INT NOT NULL CHECK (height > 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.pins IS 'Stores all pins created by users.';
COMMENT ON COLUMN public.pins.user_id IS 'References the uploader''s profile in public.profiles.';
COMMENT ON COLUMN public.pins.image_url IS 'Public URL of the pin image.';
COMMENT ON COLUMN public.pins.title IS 'Title of the pin (max 100 chars).';
COMMENT ON COLUMN public.pins.description IS 'Description of the pin (max 500 chars).';
COMMENT ON COLUMN public.pins.width IS 'Original width of the image in pixels.';
COMMENT ON COLUMN public.pins.height IS 'Original height of the image in pixels.';

-- Add indexes to pins table
CREATE INDEX pins_user_id_idx ON public.pins(user_id);
CREATE INDEX pins_created_at_idx ON public.pins(created_at DESC);
-- Create an index on title and description for searching
CREATE INDEX pins_text_search_idx ON public.pins USING GIN (to_tsvector('english', title || ' ' || description));


-- Function to create a profile for a new user.
-- This function is called by a trigger when a new user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Important for accessing auth.users table
SET search_path = public
AS $$
DECLARE
  random_suffix TEXT;
  base_username TEXT;
  final_username TEXT;
  attempts INT := 0;
BEGIN
  -- Generate a base username from the email prefix
  base_username := COALESCE(
    NULLIF(LOWER(regexp_replace(NEW.email, '@.*$', '')), ''), -- Get part before @
    'user'
  );
  -- Sanitize: remove non-alphanumeric characters, keep dots and underscores
  base_username := regexp_replace(base_username, '[^a-z0-9_.]', '', 'g');
  -- Ensure base_username is not too short
  IF char_length(base_username) < 3 THEN
    base_username := base_username || 'usr';
  END IF;
  -- Ensure base_username is not too long (e.g. max 20 chars before suffix)
  base_username := SUBSTRING(base_username FROM 1 FOR 20);

  -- Attempt to create a unique username
  LOOP
    random_suffix := SUBSTRING(md5(random()::text) FROM 1 FOR 5);
    final_username := base_username || '_' || random_suffix;

    -- Check if username already exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
      EXIT; -- Username is unique
    END IF;

    attempts := attempts + 1;
    IF attempts >= 5 THEN
      -- Fallback to a more generic unique username if multiple attempts fail
      final_username := 'user_' || NEW.id::text;
      IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
         -- This should be extremely rare, but as a last resort:
         final_username := 'user_' || NEW.id::text || '_' || SUBSTRING(md5(random()::text) FROM 1 FOR 3);
      END IF;
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    final_username,
    NEW.raw_user_meta_data->>'full_name', -- Assumes 'full_name' is passed in user_metadata
    NEW.raw_user_meta_data->>'avatar_url' -- Assumes 'avatar_url' is passed in user_metadata
  );
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a new user profile upon auth.users insertion.';

-- Trigger to call handle_new_user when a new user is created in auth.users.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Row Level Security (RLS) Policies for profiles table
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

CREATE POLICY "Users can delete their own profile." -- Typically not recommended to allow direct delete
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- Row Level Security (RLS) Policies for pins table
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pins are viewable by everyone."
  ON public.pins FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own pins."
  ON public.pins FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND public.pins.user_id = auth.uid())));

CREATE POLICY "Users can update their own pins."
  ON public.pins FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND public.pins.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND public.pins.user_id = auth.uid()));

CREATE POLICY "Users can delete their own pins."
  ON public.pins FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND public.pins.user_id = auth.uid()));


-- Storage Bucket Policies (Example - apply these in Supabase dashboard Storage policies)
-- These are illustrative. You'll need to set actual policies in the Supabase UI or via Management API.

/*
-- For 'pins' bucket:
-- Policy: Allow public read access to all files
CREATE POLICY "Public read access for pins"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'pins' );

-- Policy: Allow authenticated users to upload to their own folder within 'pins' bucket
-- Assumes files are stored like 'public/<user_id>/<filename>'
CREATE POLICY "Authenticated users can upload pins"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK ( bucket_id = 'pins' AND auth.uid()::text = (storage.foldername(name))[1] );

-- Policy: Allow users to delete their own pins
CREATE POLICY "Users can delete their own pin images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING ( bucket_id = 'pins' AND auth.uid()::text = (storage.foldername(name))[1] );


-- For 'avatars' bucket:
-- Policy: Allow public read access to all files
CREATE POLICY "Public read access for avatars"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

-- Policy: Allow authenticated users to upload/update their own avatar
-- Assumes files are stored like '<user_id>/avatar.<ext>' or similar
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );

CREATE POLICY "Users can update their own avatar images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );

-- Policy: Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );
*/

-- Grant usage on schema public to supabase_storage_admin
-- This might be needed if storage policies refer to functions/tables in public schema
GRANT USAGE ON SCHEMA public TO supabase_storage_admin;
GRANT SELECT ON TABLE public.profiles TO supabase_storage_admin;


-- After running this script, consider refreshing the Supabase schema cache:
-- 1. Go to your Supabase Project Dashboard.
-- 2. Navigate to API -> Click "Reload schema" button (or a similar option if UI changes).
-- OR make a trivial schema change via the Supabase UI (e.g., add/remove a comment on a column) and save.
--
-- Also, regenerate your TypeScript types:
-- npx supabase gen types typescript --project-id <your-project-id> --schema public > src/types/supabase.ts
----------------------------------------------------------------------------------------------------
-- Developer Note on handle_new_user trigger:
-- The username generation logic in `handle_new_user` attempts to create a unique username.
-- However, for absolute robustness in high-concurrency scenarios or with very common email prefixes,
-- a more sophisticated unique username generation strategy might be needed if collisions become frequent.
-- The current application logic in `src/app/settings/profile/page.tsx` which allows users to
-- set/update their username (with uniqueness checks) acts as a crucial fallback and user-driven
-- correction mechanism. If a default username is problematic, the user can change it.
----------------------------------------------------------------------------------------------------

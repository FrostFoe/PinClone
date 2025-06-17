-- ==========================================================================================
-- !! CRITICAL SUPABASE SETUP !!
-- ==========================================================================================
-- This script sets up your database schema. After running this SQL, you MUST also:
--
-- 1. CREATE SUPABASE STORAGE BUCKETS:
--    - Go to Supabase Dashboard > Storage > Create new bucket.
--    - Create a bucket named 'pins' (all lowercase). Make it PUBLIC.
--    - Create a bucket named 'avatars' (all lowercase). Make it PUBLIC.
--    Failure to do this will result in "Bucket not found" errors during image uploads.
--
-- 2. REFRESH SUPABASE SCHEMA CACHE:
--    - Go to Supabase Dashboard > API (or Project Settings > API) > Click "Reload schema".
--    This is crucial for Supabase to recognize your new schema.
--
-- 3. CONFIGURE ENVIRONMENT VARIABLES (.env.local):
--    - NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
--    - NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
--    Restart your Next.js dev server after setting these.
--
-- 4. (RECOMMENDED) REGENERATE TYPESCRIPT TYPES:
--    npx supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > src/types/supabase.ts
-- ==========================================================================================

-- ⚠️ WARNING: This deletes ALL data in the public schema and recreates it.
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Function to automatically update 'updated_at' timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TABLE: profiles
-- Stores public user profile information.
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY, -- References auth.users.id, uniquely identifies a user
  username TEXT NOT NULL UNIQUE, -- Public, unique username for the user
  full_name TEXT, -- User's full name, can be null
  bio TEXT, -- Short biography, can be null
  avatar_url TEXT, -- URL to the user's avatar image, can be null
  website TEXT, -- URL to the user's personal website, can be null
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add foreign key constraint to link profiles.id with auth.users.id
-- This ensures that every profile corresponds to an authenticated user.
-- Deleting a user in auth.users will cascade delete their profile.
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_auth_user FOREIGN KEY (id)
  REFERENCES auth.users(id) ON DELETE CASCADE;

-- Trigger to update 'updated_at' on profile row changes
CREATE TRIGGER handle_profile_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: Enable RLS for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS: Allow public read access to all profiles
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (true);

-- RLS: Allow users to insert their own profile
-- (Handled by trigger `handle_new_user` on auth.users creation,
--  but an explicit insert policy might be needed if manual profile creation is allowed later)
CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS: Allow users to update their own profile
CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- TABLE: pins
-- Stores information about each pin.
CREATE TABLE public.pins (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL, -- Foreign key referencing profiles.id of the uploader
  title TEXT, -- Title of the pin, can be null
  description TEXT, -- Description of the pin, can be null
  image_url TEXT NOT NULL, -- URL of the pin's image
  width INTEGER NOT NULL, -- Width of the image, important for masonry layout
  height INTEGER NOT NULL, -- Height of the image, important for masonry layout
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  CONSTRAINT fk_pins_user FOREIGN KEY (user_id)
    REFERENCES public.profiles(id) ON DELETE CASCADE -- If a profile is deleted, their pins are also deleted.
);

-- Trigger to update 'updated_at' on pin row changes
CREATE TRIGGER handle_pin_updated_at
  BEFORE UPDATE ON public.pins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: Enable RLS for pins table
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

-- RLS: Allow public read access to all pins
CREATE POLICY "Pins are viewable by everyone."
  ON public.pins FOR SELECT
  USING (true);

-- RLS: Allow authenticated users to insert pins
CREATE POLICY "Authenticated users can create pins."
  ON public.pins FOR INSERT
  WITH CHECK (auth.role() = 'authenticated'); -- Check user is logged in

-- RLS: Allow users to update their own pins
CREATE POLICY "Users can update their own pins."
  ON public.pins FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS: Allow users to delete their own pins
CREATE POLICY "Users can delete their own pins."
  ON public.pins FOR DELETE
  USING (auth.uid() = user_id);


-- INDEXES
-- Index on profiles.username for faster lookups (e.g., viewing a user's profile page by username)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
-- Index on pins.user_id for faster retrieval of all pins by a specific user
CREATE INDEX IF NOT EXISTS idx_pins_user_id ON public.pins(user_id);

-- Add GIN indexes for text search capabilities (ILIKE and full-text search)
-- For profiles: search by username and full_name
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fts tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(username, '') || ' ' || coalesce(full_name, ''))) STORED;
CREATE INDEX IF NOT EXISTS profiles_fts_idx ON public.profiles USING gin(fts);

-- For pins: search by title and description
ALTER TABLE public.pins ADD COLUMN IF NOT EXISTS fts tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))) STORED;
CREATE INDEX IF NOT EXISTS pins_fts_idx ON public.pins USING gin(fts);


-- Function to handle new user creation from Supabase Auth
-- This function is called by a trigger when a new user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  username_suffix TEXT;
  counter INTEGER;
BEGIN
  -- Attempt to generate a username from the email prefix
  base_username := split_part(NEW.email, '@', 1);
  -- Remove invalid characters (allow alphanumeric, underscore, dot)
  base_username := lower(regexp_replace(base_username, '[^a-zA-Z0-9_.]', '', 'g'));
  -- Ensure username is at least 3 characters long
  IF length(base_username) < 3 THEN
    base_username := base_username || 'user';
  END IF;
  -- Limit length if too long
  base_username := substr(base_username, 1, 20);

  final_username := base_username;
  counter := 0;

  -- Check for username uniqueness and append suffix if needed
  LOOP
    IF counter > 0 THEN
      -- Append a random 3-digit number or counter
      username_suffix := lpad(counter::text, 3, '0');
      final_username := base_username || username_suffix;
      -- Ensure final_username doesn't exceed max typical username length (e.g., 20-25 chars)
      IF length(final_username) > 25 THEN
          final_username := substr(base_username, 1, 25 - length(username_suffix)) || username_suffix;
      END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
      EXIT; -- Found a unique username
    END IF;

    counter := counter + 1;
    IF counter > 999 THEN -- Safety break to prevent infinite loop
        -- Fallback to UUID based username if too many conflicts
        final_username := 'user_' || substr(replace(extensions.uuid_generate_v4()::text, '-', ''), 1, 12);
        EXIT;
    END IF;
  END LOOP;

  -- Insert a new row into public.profiles, linking it to the new auth.users entry.
  -- The 'id' from auth.users becomes the primary key for the profiles table.
  -- 'username' is derived from the email or a unique generated string.
  -- 'full_name' can be pre-filled from auth metadata if available.
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    final_username,
    NEW.raw_user_meta_data->>'full_name', -- Prefill full_name if provided during signup
    NEW.raw_user_meta_data->>'avatar_url' -- Prefill avatar_url if provided (e.g. via OAuth)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user function after a new user is created in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant usage on schema public to supabase_functions_admin to allow trigger creation by services
-- This might be needed if triggers are created/managed by Supabase internal roles for certain features.
-- Typically, for user-defined triggers as above, this might not be strictly necessary if the
-- role executing the `CREATE TRIGGER` command has sufficient privileges.
-- However, it's a common grant in Supabase environments.
GRANT USAGE ON SCHEMA public TO supabase_functions_admin;
GRANT USAGE ON SCHEMA extensions TO supabase_functions_admin;

-- Ensure authenticated role can use the uuid-ossp functions if needed for default values
GRANT EXECUTE ON FUNCTION extensions.uuid_generate_v4() TO authenticated;


-- Ensure supabase_storage_admin has rights on public schema and tables for RLS with storage.
-- This is important if you use RLS policies that might involve checks against tables in the public schema
-- when accessing storage objects.
GRANT USAGE ON SCHEMA public TO supabase_storage_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO supabase_storage_admin;


-- Final check for RLS policies and ensure they are sensible defaults.
-- The policies above are basic. Review and enhance them based on your app's specific needs.
-- For example, you might want more granular control over who can update/delete pins,
-- or specific RLS for comments, likes, boards if you re-add those features.

-- Example: Allow users to see their own profile's email if you were to store it (not recommended for public display)
-- CREATE POLICY "Users can view their own email."
--   ON public.profiles FOR SELECT
--   USING (auth.uid() = id);

-- The 'fts' columns are auto-generated. RLS on the table also applies to them.
-- If you perform searches via Supabase API with user's session, RLS is enforced.
-- If you perform searches via a service role key (e.g., from a backend), RLS is bypassed unless `force_rls` is used.
-- Ensure search functions respect privacy.

COMMENT ON TABLE public.profiles IS 'Stores public user profile information, linked to Supabase Auth users.';
COMMENT ON COLUMN public.profiles.id IS 'References auth.users.id';
COMMENT ON COLUMN public.profiles.username IS 'Unique public username for the user.';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user avatar image.';

COMMENT ON TABLE public.pins IS 'Stores information about each pin, created by users.';
COMMENT ON COLUMN public.pins.user_id IS 'Owner of the pin, references profiles.id.';
COMMENT ON COLUMN public.pins.image_url IS 'URL of the pin image.';
COMMENT ON COLUMN public.pins.width IS 'Original width of the pin image in pixels.';
COMMENT ON COLUMN public.pins.height IS 'Original height of the pin image in pixels.';

ALTER PUBLICATION supabase_realtime ADD TABLE public.pins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

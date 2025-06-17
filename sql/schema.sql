-- ==========================================================================================
-- !! CRITICAL SUPABASE SETUP !!
-- ==========================================================================================
-- This SQL script sets up the database tables.
-- AFTER RUNNING THIS SCRIPT, YOU MUST ALSO:
--
-- 1. CREATE SUPABASE STORAGE BUCKETS:
--    - Go to your Supabase Project Dashboard -> Storage -> Buckets.
--    - Create a bucket named 'pins' (all lowercase). Toggle 'Public bucket' to ON.
--    - Create a bucket named 'avatars' (all lowercase). Toggle 'Public bucket' to ON.
--    Failure to do this will result in "Bucket not found" errors during image uploads.
--
-- 2. REFRESH SUPABASE SCHEMA CACHE:
--    - Go to your Supabase Project Dashboard -> API section (or Project Settings -> API).
--    - Click the "Reload schema" or "Refresh database" button.
--    This is VITAL for Supabase to recognize new tables/columns/policies.
--
-- 3. CONFIGURE ENVIRONMENT VARIABLES:
--    - Create a '.env.local' file in your project root.
--    - Add your Supabase URL and Anon Key:
--      NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
--      NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
--    - Restart your Next.js development server after creating/modifying .env.local.
-- ==========================================================================================

-- Drop existing schema and objects if they exist to start fresh.
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Enable UUID extension if not already enabled.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to automatically update 'updated_at' timestamp
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
  id uuid NOT NULL PRIMARY KEY, -- Links to auth.users.id
  username TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add foreign key constraint to link profiles.id to auth.users.id
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_auth_users FOREIGN KEY (id)
  REFERENCES auth.users(id) ON DELETE CASCADE;

-- Trigger to update 'updated_at' on profile changes
CREATE TRIGGER handle_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

-- RLS: Enable RLS for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS: Allow public read access to profiles
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (true);

-- RLS: Allow users to insert their own profile
-- (This is handled by the handle_new_user trigger, but an explicit insert policy can be added if needed)
-- For now, assuming the trigger is sufficient.

-- RLS: Allow users to update their own profile
CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- TABLE: pins
-- Stores information about each pin.
CREATE TABLE public.pins (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  image_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT fk_pins_user_id FOREIGN KEY(user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Trigger to update 'updated_at' on pin changes
CREATE TRIGGER handle_pin_update
  BEFORE UPDATE ON public.pins
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

-- RLS: Enable RLS for pins table
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

-- RLS: Allow public read access to pins
CREATE POLICY "Pins are viewable by everyone."
  ON public.pins FOR SELECT
  USING (true);

-- RLS: Allow authenticated users to insert pins
CREATE POLICY "Authenticated users can create pins."
  ON public.pins FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS: Allow users to update their own pins
CREATE POLICY "Users can update their own pins."
  ON public.pins FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS: Allow users to delete their own pins
CREATE POLICY "Users can delete their own pins."
  ON public.pins FOR DELETE
  USING (auth.uid() = user_id);


-- Function to create a profile entry when a new user signs up in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  -- Attempt to generate a username from the email prefix
  base_username := split_part(NEW.email, '@', 1);
  -- Remove invalid characters and ensure minimum length
  base_username := regexp_replace(base_username, '[^a-zA-Z0-9_.]', '', 'g');
  IF length(base_username) < 3 THEN
    base_username := base_username || 'user';
  END IF;
  base_username := substr(base_username, 1, 20); -- Ensure max length

  final_username := base_username;
  -- Check for username uniqueness and append counter if necessary
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
    final_username := substr(final_username, 1, 20); -- Ensure max length after appending counter
  END LOOP;

  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', final_username), -- Use full_name from metadata if available
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user on new user creation in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- INDEXES
-- Create indexes for frequently queried columns to improve performance.
CREATE INDEX idx_profiles_username ON public.profiles(username text_pattern_ops); -- For ILIKE '%query%'
CREATE INDEX idx_pins_user_id ON public.pins(user_id);
CREATE INDEX idx_pins_title_search ON public.pins USING gin (to_tsvector('english', title)); -- For full-text search on title
CREATE INDEX idx_pins_description_search ON public.pins USING gin (to_tsvector('english', description)); -- For full-text search on description


-- Seed Data (Optional - uncomment and modify if needed)
-- Example:
-- INSERT INTO public.profiles (id, username, full_name)
-- VALUES
--   ('some-auth-user-id-1', 'testuser1', 'Test User One'),
--   ('some-auth-user-id-2', 'testuser2', 'Test User Two');

-- INSERT INTO public.pins (user_id, image_url, title, description, width, height)
-- VALUES
--   ((SELECT id FROM public.profiles WHERE username = 'testuser1'), 'https://placehold.co/600x800.png', 'Sample Pin 1', 'Description for sample pin 1.', 600, 800),
--   ((SELECT id FROM public.profiles WHERE username = 'testuser1'), 'https://placehold.co/400x600.png', 'Sample Pin 2', 'Description for sample pin 2.', 400, 600);

-- Note: For seeding, ensure the user_id exists in auth.users and consequently in public.profiles.
-- You might need to manually create users in Supabase Auth first and then use their IDs here.
-- Or, create users and let the trigger populate profiles, then use those profile IDs for pins.

-- Grant usage on schema public to supabase_admin, anon, authenticated roles
GRANT USAGE ON SCHEMA public TO supabase_admin;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant all privileges on all tables in schema public to supabase_admin
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO supabase_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO supabase_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO supabase_admin;

-- Grant select, insert, update, delete on all tables in schema public to anon and authenticated
-- RLS policies will then control fine-grained access.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Ensure the postgres user (superuser) owns the schema for future modifications
ALTER SCHEMA public OWNER TO postgres;

-- Ensure postgres user (superuser) owns the tables
ALTER TABLE public.profiles OWNER TO postgres;
ALTER TABLE public.pins OWNER TO postgres;

-- Apply default privileges for future objects created by postgres
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO supabase_admin;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO supabase_admin;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO supabase_admin;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT USAGE ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT USAGE ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;

-- Reset role permissions to supabase_admin for safety.
-- This means only supabase_admin can create new tables by default unless postgres is used.
-- Individual table permissions will be handled by RLS and specific GRANT statements.
-- For development, this is usually fine. For production, review service role permissions carefully.
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO supabase_admin;
-- GRANT USAGE ON SCHEMA public TO postgres;
-- GRANT CREATE ON SCHEMA public TO postgres; -- Allow postgres (superuser) to create tables in public schema

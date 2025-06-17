-- Supabase Pinclone Schema

-- Create Pins Table
CREATE TABLE pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    width INTEGER, -- Recommended for masonry layout
    height INTEGER, -- Recommended for masonry layout
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security for pins
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pins table
CREATE POLICY "Allow public read access to pins" ON pins
FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert pins" ON pins
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owner to update their pins" ON pins
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owner to delete their pins" ON pins
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add indexes for pins table
CREATE INDEX idx_pins_user_id ON pins(user_id);
CREATE INDEX idx_pins_created_at ON pins(created_at DESC);


-- Create Profiles Table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    website TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Make username case-insensitive unique and not null
ALTER TABLE profiles ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX profiles_username_idx ON profiles (lower(username));

-- Enable Row Level Security for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
CREATE POLICY "Allow public read access to profiles" ON profiles
FOR SELECT USING (true);

CREATE POLICY "Allow user to insert their own profile" ON profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow user to update their own profile" ON profiles
FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Function and Trigger to create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    new.id,
    -- Attempt to generate a unique username from email prefix + random numbers
    -- This part might need refinement for true uniqueness in high-concurrency scenarios
    -- or if the generated username already exists.
    -- Consider checking for existing username in a loop or using a different generation strategy.
    substring(new.email from 1 for position('@' in new.email) - 1) || '-' || to_char(floor(random() * 10000), 'FM0000'),
    new.raw_user_meta_data->>'full_name', -- Assumes full_name is passed in auth.signUp options.data
    new.raw_user_meta_data->>'avatar_url' -- Assumes avatar_url might be passed (e.g., from OAuth)
  );
  RETURN new;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user on new auth.users signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Add index for profiles table
CREATE INDEX idx_profiles_username ON profiles(username);


-- Supabase Storage Buckets
-- --------------------------
-- The following buckets need to be created in your Supabase project dashboard
-- under Storage > Buckets:
--
-- 1. `pins`: For storing uploaded pin images.
--    - Make this bucket public or set appropriate access policies.
--    - Example RLS policies for the `pins` bucket allowing authenticated uploads:
--      (These are conceptual and should be set up in the Supabase dashboard or via Management API)
--      For INSERT: `(uid() IS NOT NULL)`
--
-- 2. `avatars`: For storing user profile avatars.
--    - Make this bucket public or set appropriate access policies.
--    - Example RLS policies for the `avatars` bucket allowing owner uploads:
--      For INSERT/UPDATE: `(bucket_id = 'avatars' AND (storage.foldername(name))[1] = uid()::text)`
--      (This implies files are uploaded to a path like `public/<user_id>/avatar.png`)
--
-- For detailed instructions on bucket and policy creation, refer to Supabase Storage documentation.
-- --------------------------

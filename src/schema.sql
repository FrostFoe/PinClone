
-- Pins Table
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

-- RLS Policies for pins
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to pins" ON pins
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert pins" ON pins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owner to update their pins" ON pins
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owner to delete their pins" ON pins
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes for pins
CREATE INDEX idx_pins_user_id ON pins(user_id);
CREATE INDEX idx_pins_created_at ON pins(created_at DESC);

-- Profiles Table
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
-- For case-insensitive unique constraint, create a unique index on lower(username)
-- The trigger below handles initial username generation. If you want to enforce it at DB level
-- for all inserts/updates, you might need a check constraint or a before insert/update trigger.
-- For now, the `UNIQUE` constraint on the column and the trigger logic should be sufficient for most cases.
-- If you already have a unique index like this from previous steps, ensure it's correct:
-- DROP INDEX IF EXISTS profiles_username_idx; -- If it exists and needs to be recreated
CREATE UNIQUE INDEX profiles_username_idx ON profiles (lower(username));


-- RLS Policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow user to insert their own profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow user to update their own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Indexes for profiles
-- CREATE INDEX idx_profiles_username ON profiles(username); -- This is covered by profiles_username_idx

-- Function and Trigger to create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  generated_username TEXT;
  email_prefix TEXT;
  random_suffix TEXT;
  max_attempts INTEGER := 5;
  attempt INTEGER := 0;
  is_username_taken BOOLEAN;
BEGIN
  -- Try to get username from provider data (e.g. GitHub username)
  -- Supabase stores provider-specific user data in raw_user_meta_data
  -- For GitHub, the username might be under 'user_name' or 'preferred_username' or similar.
  -- Inspect NEW.raw_user_meta_data for the exact key.
  -- Example: generated_username := NEW.raw_user_meta_data->>'user_name'; 
  
  -- If no provider username, generate from email or a default
  IF generated_username IS NULL THEN
    email_prefix := substring(NEW.email from 1 for position('@' in NEW.email) - 1);
    -- Sanitize email_prefix to be valid for username (alphanumeric, underscores, hyphens)
    email_prefix := lower(regexp_replace(email_prefix, '[^a-zA-Z0-9_-]', '', 'g'));
    -- Ensure prefix is not too short or empty
    IF email_prefix = '' OR length(email_prefix) < 3 THEN
      email_prefix := 'user';
    END IF;
  ELSE
    -- Sanitize provider username
    generated_username := lower(regexp_replace(generated_username, '[^a-zA-Z0-9_-]', '', 'g'));
    IF generated_username = '' OR length(generated_username) < 3 THEN
       generated_username := 'user' || substring(NEW.id::text from 1 for 4); -- fallback if sanitized provider username is bad
    END IF;
  END IF;

  -- Attempt to generate a unique username
  IF generated_username IS NULL THEN
    generated_username := email_prefix; -- Start with the sanitized prefix
  END IF;

  LOOP
    attempt := attempt + 1;
    IF attempt > 1 THEN -- Add random suffix on subsequent attempts
      random_suffix := to_char(floor(random() * 10000), 'FM0000');
      generated_username := email_prefix || '_' || random_suffix;
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(generated_username)) INTO is_username_taken;
    
    IF NOT is_username_taken THEN
      EXIT; -- Found a unique username
    END IF;

    IF attempt >= max_attempts THEN
      -- Fallback to a very likely unique username if generation fails repeatedly
      generated_username := 'user_' || replace(NEW.id::text, '-', ''); 
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    generated_username,
    NEW.raw_user_meta_data->>'full_name', -- For OAuth, this is usually populated. For email signup, pass it in options.data.
    NEW.raw_user_meta_data->>'avatar_url' -- For OAuth, this is usually populated.
  );
  RETURN NEW;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists to avoid errors on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Note on Storage Buckets:
-- You'll need to create 'pins' and 'avatars' buckets in Supabase Storage.
-- Example RLS for 'avatars' bucket (allow authenticated users to upload to their own folder):
-- This typically requires files to be uploaded into a folder named after the user's ID, e.g., `public/<user_id>/avatar.png`
-- For INSERT (profiles_bucket): (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
-- For SELECT (profiles_bucket): (bucket_id = 'avatars') -- if avatars are public

-- For 'pins' bucket (allow authenticated users to upload to their own folder):
-- For INSERT (pins_bucket): (bucket_id = 'pins' AND auth.uid()::text = (storage.foldername(name))[1])
-- For SELECT (pins_bucket): (bucket_id = 'pins') -- if pins are public
-- The actual path structure for uploads (e.g., public/user_id/filename.ext) will be handled in the application code.
-- Ensure your Storage RLS policies match how you intend to structure file paths and access.

# Pinclone with Firebase Studio & Supabase

This is a Next.js starter project for Pinclone, integrated with Supabase for backend services.

## Getting Started

1.  **Set up Supabase:**

    - Create a Supabase project.
    - In the SQL Editor, run the schemas provided below to create the `pins` and `profiles` tables.
    - Configure Row Level Security (RLS) policies for your tables.
    - Consider setting up a database trigger to create a new user profile when a new user signs up in `auth.users`.

2.  **Environment Variables:**

    - Create a `.env.local` file in the root of your project.
    - Add your Supabase project URL and Anon key:

      NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
      NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

3.  **Install Dependencies:**
    bash
    npm install

4.  **Run the Development Server:**
    bash
    npm run dev

    The app will be available at `http://localhost:9002` (or your configured port).

## Supabase Schemas

### Pins Table

sql
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

-- RLS Policies (Example: Allow public read, authenticated users can insert, owner can update/delete)
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to pins" ON pins
FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert pins" ON pins
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owner to update their pins" ON pins
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owner to delete their pins" ON pins
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create Supabase Storage Bucket for Pin Images
-- Go to Storage -> Create Bucket. Name it `pins`. Make it public or set appropriate access policies.
-- For file uploads to work from the client, ensure appropriate RLS and bucket policies are set.
-- Example storage policy for `pins` bucket allowing authenticated users to upload:
-- (This is a simplified example, review Supabase Storage docs for detailed policy creation)
-- For INSERT: (uid() IS NOT NULL)
-- This allows any authenticated user to upload. You might want to restrict by path or add more checks.

-- Add indexes for performance
CREATE INDEX idx_pins_user_id ON pins(user_id);
CREATE INDEX idx_pins_created_at ON pins(created_at DESC);

### Profiles Table

sql
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

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles" ON profiles
FOR SELECT USING (true);

CREATE POLICY "Allow user to insert their own profile" ON profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow user to update their own profile" ON profiles
FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Optional: Function and Trigger to create profile on new user signup
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
substring(new.email from 1 for position('@' in new.email) - 1) || '-' || to_char(floor(random() \* 10000), 'FM0000'),
new.raw_user_meta_data->>'full_name',
new.raw_user_meta_data->>'avatar_url'
);
RETURN new;
END;

$$
LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create Supabase Storage Bucket for Avatars
-- Go to Storage -> Create Bucket. Name it `avatars`. Make it public or set appropriate access policies.
-- Example storage policy for `avatars` bucket allowing owner to upload/update:
-- For INSERT/UPDATE: (bucket_id = 'avatars' AND (storage.foldername(name))[1] = uid()::text)
-- (This requires files to be uploaded into a folder named after the user's ID, e.g., `public/<user_id>/avatar.png`)

-- Add indexes
CREATE INDEX idx_profiles_username ON profiles(username);



## Project Structure

*   `src/app/`: Next.js App Router pages.
*   `src/components/`: Shared React components.
*   `src/components/ui/`: ShadCN UI components.
*   `src/lib/supabase/`: Supabase client and server configurations.
*   `src/services/`: Functions for interacting with Supabase (fetching data, etc.).
*   `src/types/`: TypeScript type definitions.

## Key Features

*   **Supabase Auth**: User signup, login, logout.
*   **Pin Display**: Fetches and displays pins from Supabase on the homepage and individual pin pages.
*   **Create Pin**: Users can upload images and create new pins, saved to Supabase.
*   **User Profiles**: Fetches and displays user profile information. Profile editing page allows updates to Supabase, including avatar uploads.
*   **User Search**: Search for users by username or full name.
*   **Responsive Design**: Masonry layout for pins, mobile-friendly UI.
*   **Loading & Error States**: Skeletons, spinners, and toasts for better UX.

## Next Steps / To-Do

*   Implement "forgot password" functionality.
*   Add OAuth providers (Google, GitHub, etc.).
*   Implement liking, saving/collecting pins into boards, and commenting features.
*   Refine infinite scrolling with more robust error handling and end-of-list indicators.
*   Implement optimistic updates for actions like creating pins or updating profiles.
*   Expand RLS policies for more complex features (e.g., sharing, private boards).
*   Add more sophisticated search filters (e.g., by tags, colors).
*   Implement image processing/resizing on upload for performance.
*   Add Framer Motion for more advanced animations.
$$

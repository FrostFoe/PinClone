# Pinclone with Firebase Studio & Supabase

This is a Next.js starter project for Pinclone, integrated with Supabase for backend services.

## Getting Started

1.  **Set up Supabase:**
    *   Create a Supabase project.
    *   In the SQL Editor, run the schemas provided below to create the `pins` and `profiles` tables.
    *   Configure Row Level Security (RLS) policies for your tables.
    *   Consider setting up a database trigger to create a new user profile when a new user signs up in `auth.users`.

2.  **Environment Variables:**
    *   Create a `.env.local` file in the root of your project.
    *   Add your Supabase project URL and Anon key:
        ```
        NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
        NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
        ```

3.  **Install Dependencies:**
    ```bash
    npm install
    ```

4.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    The app will be available at `http://localhost:9002` (or your configured port).

## Supabase Schemas

### Pins Table
```sql
CREATE TABLE pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow owner to delete their pins" ON pins
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
```
*Note: Added `width` and `height` to the suggested schema for better masonry layout support. If you stick to the original schema without these, the client will need to derive or simulate these dimensions.*

### Profiles Table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website TEXT, -- Added as per settings page
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Make username case-insensitive unique
CREATE UNIQUE INDEX profiles_username_idx ON profiles (lower(username));

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow user to insert their own profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow user to update their own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Optional: Function and Trigger to create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    new.id,
    substring(new.email from 1 for position('@' in new.email) - 1) || '-' || to_char(floor(random() * 10000), 'FM0000'), -- Generates a somewhat unique username
    new.raw_user_meta_data->>'full_name', -- if full_name is passed in metadata
    new.raw_user_meta_data->>'avatar_url' -- if avatar_url is passed in metadata
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## Project Structure

*   `src/app/`: Next.js App Router pages.
*   `src/components/`: Shared React components.
*   `src/components/ui/`: ShadCN UI components.
*   `src/lib/supabase/`: Supabase client and server configurations.
*   `src/services/`: Functions for interacting with Supabase (fetching data, etc.).
*   `src/types/`: TypeScript type definitions.

## Key Features (Post-Refactor)

*   **Pin Display**: Fetches and displays pins from Supabase on the homepage and individual pin pages.
*   **User Profiles**: Fetches and displays user profile information. Profile editing page allows updates to Supabase.
*   **User Search**: Basic search for users by username or full name.
*   **Cleaned Codebase**: Removed placeholder data and logic, focusing on Supabase integration.

## Next Steps / To-Do

*   Implement full Supabase Authentication UI for login and signup.
*   Implement "Create Pin" functionality (including image uploads to Supabase Storage).
*   Add liking, saving, and commenting features for pins.
*   Refine infinite scrolling for pin feeds.
*   Implement optimistic updates for better UX.
*   Expand RLS policies as needed for more complex features.

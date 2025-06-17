
-- Pinclone: Complete Database Schema
-- Version: 2.0
--
-- This script resets and rebuilds the public schema for a Pinterest-style application.
-- Features: Users, Profiles, Pins, Tags, Likes, Comments, Boards (Collections), Follows.
--
-- IMPORTANT:
-- 1. BACKUP YOUR DATA: This script WILL ERASE ALL DATA in the public schema.
-- 2. REVIEW RLS POLICIES: These are foundational and should be adapted to your specific security needs.
-- 3. REFRESH SUPABASE SCHEMA CACHE: After running, go to Supabase Dashboard > API > Reload Schema.
-- 4. (Recommended) REGENERATE TYPESCRIPT TYPES:
--    npx supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > src/types/supabase.ts

-- -----------------------------------------------------------------------------
-- SECTION 1: RESET SCHEMA (USE WITH CAUTION - DELETES ALL DATA IN public)
-- -----------------------------------------------------------------------------
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON SCHEMA public TO anon;

-- Enable UUID extension if not already enabled (Supabase usually handles this)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- SECTION 2: HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- SECTION 3: TABLES
-- -----------------------------------------------------------------------------

-- Profiles Table (Linked to Supabase Auth users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3 AND char_length(username) <= 50 AND username ~ '^[a-zA-Z0-9_.]+$'),
  full_name TEXT CHECK (char_length(full_name) <= 100),
  avatar_url TEXT CHECK (char_length(avatar_url) <= 1024),
  bio TEXT CHECK (char_length(bio) <= 255),
  website TEXT CHECK (char_length(website) <= 255),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.profiles IS 'User profile information, extending Supabase auth users.';
COMMENT ON COLUMN public.profiles.username IS 'Unique, public username for the user.';

-- Trigger for profiles updated_at
CREATE TRIGGER handle_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Pins Table
CREATE TABLE public.pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL CHECK (char_length(image_url) <= 1024),
  title TEXT CHECK (char_length(title) <= 255),
  description TEXT CHECK (char_length(description) <= 1000),
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.pins IS 'Individual pins (images with metadata) created by users.';

-- Trigger for pins updated_at
CREATE TRIGGER handle_pins_updated_at
BEFORE UPDATE ON public.pins
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Tags Table
CREATE TABLE public.tags (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL CHECK (name <> '' AND char_length(name) <= 50),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.tags IS 'Categorization tags for pins.';

-- Pin_Tags Join Table (Many-to-Many: Pins <-> Tags)
CREATE TABLE public.pin_tags (
  pin_id UUID NOT NULL REFERENCES public.pins(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (pin_id, tag_id)
);
COMMENT ON TABLE public.pin_tags IS 'Associates pins with multiple tags.';

-- Likes Table (Many-to-Many: Users <-> Pins)
CREATE TABLE public.likes (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pin_id UUID NOT NULL REFERENCES public.pins(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, pin_id)
);
COMMENT ON TABLE public.likes IS 'Records which users have liked which pins.';

-- Comments Table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pin_id UUID NOT NULL REFERENCES public.pins(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE, -- For threaded comments
  content TEXT NOT NULL CHECK (content <> '' AND char_length(content) <= 1000),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.comments IS 'User comments on pins, supports basic threading.';

-- Trigger for comments updated_at
CREATE TRIGGER handle_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Boards Table (Collections)
CREATE TABLE public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (name <> '' AND char_length(name) <= 100),
  description TEXT CHECK (char_length(description) <= 500),
  is_private BOOLEAN DEFAULT FALSE NOT NULL,
  cover_image_url TEXT CHECK (char_length(cover_image_url) <= 1024), -- Optional cover image for the board
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, name) -- A user cannot have two boards with the same name
);
COMMENT ON TABLE public.boards IS 'User-created boards/collections to organize pins.';

-- Trigger for boards updated_at
CREATE TRIGGER handle_boards_updated_at
BEFORE UPDATE ON public.boards
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Board_Pins Join Table (Many-to-Many: Boards <-> Pins, for saving pins to boards)
CREATE TABLE public.board_pins (
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  pin_id UUID NOT NULL REFERENCES public.pins(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (board_id, pin_id)
);
COMMENT ON TABLE public.board_pins IS 'Associates pins saved by users to their specific boards.';

-- Follows Table (Many-to-Many: Users <-> Users)
CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- User doing the following
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- User being followed
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id) -- Prevent self-follows
);
COMMENT ON TABLE public.follows IS 'Records user-to-user follow relationships.';

-- -----------------------------------------------------------------------------
-- SECTION 4: AUTH TRIGGER FOR NEW USER PROFILE CREATION
-- -----------------------------------------------------------------------------

-- Function to create a profile entry when a new user signs up in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  attempts INTEGER := 0;
  random_suffix TEXT;
BEGIN
  -- Attempt to generate a username from the email prefix
  base_username := regexp_replace(substring(NEW.email from '(.*)@'), '[^a-zA-Z0-9_.]', '', 'g');
  
  -- If base_username is too short or empty, use a default
  IF char_length(base_username) < 3 THEN
    base_username := 'user';
  END IF;
  base_username := lower(substring(base_username for 20)); -- Max length for base part

  final_username := base_username;

  -- Attempt to ensure username uniqueness by appending random chars if needed
  WHILE attempts < 5 LOOP
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
      INSERT INTO public.profiles (id, username, full_name, avatar_url)
      VALUES (
        NEW.id,
        final_username,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', final_username), -- Use full_name from metadata if available
        NEW.raw_user_meta_data->>'avatar_url' -- Use avatar_url from metadata if available
      );
      RETURN NEW;
    END IF;
    random_suffix := substr(md5(random()::text), 1, 5); -- Generate 5 random characters
    final_username := substring(base_username for (20 - char_length(random_suffix) - 1)) || '_' || random_suffix;
    attempts := attempts + 1;
  END LOOP;

  -- Fallback if unique username couldn't be generated after attempts (highly unlikely for small user base)
  -- Or, you could let the insert fail and rely on user to set it via profile settings.
  -- For this example, we'll proceed with potentially non-unique, and RLS/app logic must handle.
  -- A better production system might raise an error or use a sequence for guaranteed uniqueness.
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    base_username || '_' || substr(md5(random()::text), 1, 8), -- Last resort with longer random suffix
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', base_username),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (username) DO NOTHING; -- If it still conflicts, do nothing, user must set in UI

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user on new auth.users entries
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- SECTION 5: INDEXES FOR PERFORMANCE
-- -----------------------------------------------------------------------------

-- Profiles
CREATE INDEX idx_profiles_username_trgm ON public.profiles USING gin (username gin_trgm_ops); -- For ILIKE '%query%'
CREATE INDEX idx_profiles_full_name_trgm ON public.profiles USING gin (full_name gin_trgm_ops); -- For ILIKE '%query%'

-- Pins
CREATE INDEX idx_pins_user_id ON public.pins(user_id);
CREATE INDEX idx_pins_created_at ON public.pins(created_at DESC);
CREATE INDEX idx_pins_title_trgm ON public.pins USING gin (title gin_trgm_ops);
CREATE INDEX idx_pins_description_trgm ON public.pins USING gin (description gin_trgm_ops);

-- Tags
CREATE INDEX idx_tags_name_trgm ON public.tags USING gin (name gin_trgm_ops);

-- Pin_Tags
CREATE INDEX idx_pin_tags_pin_id ON public.pin_tags(pin_id);
CREATE INDEX idx_pin_tags_tag_id ON public.pin_tags(tag_id);

-- Likes
CREATE INDEX idx_likes_pin_id ON public.likes(pin_id);

-- Comments
CREATE INDEX idx_comments_pin_id_created_at ON public.comments(pin_id, created_at DESC);
CREATE INDEX idx_comments_user_id ON public.comments(user_id);
CREATE INDEX idx_comments_parent_comment_id ON public.comments(parent_comment_id);

-- Boards
CREATE INDEX idx_boards_user_id ON public.boards(user_id);
CREATE INDEX idx_boards_name_trgm ON public.boards USING gin (name gin_trgm_ops);

-- Board_Pins
CREATE INDEX idx_board_pins_pin_id ON public.board_pins(pin_id);
CREATE INDEX idx_board_pins_board_id ON public.board_pins(board_id);

-- Follows
CREATE INDEX idx_follows_following_id ON public.follows(following_id);


-- -----------------------------------------------------------------------------
-- SECTION 6: ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Policies for 'profiles'
CREATE POLICY "Profiles are viewable by everyone."
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." -- Trigger handles this, but policy for completeness
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
-- No delete policy for profiles by users, typically handled by auth.users cascade or admin action.

-- Policies for 'pins'
CREATE POLICY "Pins are viewable by everyone."
  ON public.pins FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create pins."
  ON public.pins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own pins."
  ON public.pins FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own pins."
  ON public.pins FOR DELETE USING (auth.uid() = user_id);

-- Policies for 'tags'
CREATE POLICY "Tags are viewable by everyone."
  ON public.tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create new tags." -- Consider restricting this further if needed
  ON public.tags FOR INSERT TO authenticated WITH CHECK (true);
-- No update/delete on tags by users, typically admin managed.

-- Policies for 'pin_tags'
CREATE POLICY "Pin_tags associations are viewable by everyone."
  ON public.pin_tags FOR SELECT USING (true);
CREATE POLICY "Owner of a pin can associate/disassociate tags."
  ON public.pin_tags FOR INSERT WITH CHECK (
    (SELECT user_id FROM public.pins WHERE id = pin_id) = auth.uid()
  );
CREATE POLICY "Owner of a pin can remove tag associations."
  ON public.pin_tags FOR DELETE USING (
    (SELECT user_id FROM public.pins WHERE id = pin_id) = auth.uid()
  );

-- Policies for 'likes'
CREATE POLICY "Likes are viewable by everyone." -- Adjust if likes should be private or semi-private
  ON public.likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like/unlike pins."
  ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their own likes."
  ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Policies for 'comments'
CREATE POLICY "Comments are viewable by everyone."
  ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments."
  ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments."
  ON public.comments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments."
  ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Policies for 'boards'
CREATE POLICY "Public boards are viewable by everyone, private boards by owner."
  ON public.boards FOR SELECT USING (is_private = false OR auth.uid() = user_id);
CREATE POLICY "Authenticated users can create boards."
  ON public.boards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own boards."
  ON public.boards FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own boards."
  ON public.boards FOR DELETE USING (auth.uid() = user_id);

-- Policies for 'board_pins'
CREATE POLICY "Pins in public boards or user's own boards are viewable."
  ON public.board_pins FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = board_id AND (b.is_private = false OR b.user_id = auth.uid())
    )
  );
CREATE POLICY "Users can add pins to their own boards."
  ON public.board_pins FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.boards WHERE id = board_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can remove pins from their own boards."
  ON public.board_pins FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.boards WHERE id = board_id AND user_id = auth.uid())
  );

-- Policies for 'follows'
CREATE POLICY "Follow relationships are public."
  ON public.follows FOR SELECT USING (true);
CREATE POLICY "Authenticated users can follow/unfollow other users."
  ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can remove their own follow actions (unfollow)."
  ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- -----------------------------------------------------------------------------
-- SECTION 7: STORAGE BUCKET SETUP (Informational Comments)
-- -----------------------------------------------------------------------------

-- Run these in Supabase Storage UI or via Supabase CLI/API if needed.

-- 1. Create 'pins' bucket for pin images:
--    - Public: Yes (or set up appropriate RLS policies for access)
--    - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
--    - File size limit: e.g., 5MB

-- Example RLS for 'pins' bucket objects (if not fully public):
-- Public read access for all objects:
-- CREATE POLICY "Public read access for pin images"
-- ON storage.objects FOR SELECT USING ( bucket_id = 'pins' );

-- Authenticated users can upload to their own folder (e.g., /public/{user_id}/*):
-- CREATE POLICY "Authenticated users can upload pin images"
-- ON storage.objects FOR INSERT TO authenticated WITH CHECK (
--   bucket_id = 'pins' AND auth.uid()::text = (storage.foldername(name))[2]
-- );

-- Users can delete their own pin images:
-- CREATE POLICY "Users can delete their own pin images"
-- ON storage.objects FOR DELETE TO authenticated USING (
--   bucket_id = 'pins' AND auth.uid()::text = (storage.foldername(name))[2]
-- );


-- 2. Create 'avatars' bucket for user profile avatars:
--    - Public: Yes
--    - Allowed MIME types: image/jpeg, image/png, image/webp
--    - File size limit: e.g., 2MB

-- Example RLS for 'avatars' bucket objects (if not fully public):
-- Public read access for all objects:
-- CREATE POLICY "Public read access for avatars"
-- ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );

-- Users can upload/update their own avatar:
-- CREATE POLICY "Users can upload/update their own avatar"
-- ON storage.objects FOR INSERT TO authenticated WITH CHECK (
--    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] -- Assuming path like {user_id}/avatar.png
-- );
-- CREATE POLICY "Users can update their own avatar"
-- ON storage.objects FOR UPDATE TO authenticated USING (
--    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
-- );

-- -----------------------------------------------------------------------------
-- END OF SCHEMA SCRIPT
-- -----------------------------------------------------------------------------

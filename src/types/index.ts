
export interface Profile {
  id: string; // Corresponds to auth.users.id
  username: string; // Now NOT NULL in DB
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  created_at: string;
  updated_at: string; // Added from new schema
}

export interface Pin {
  id: string;
  user_id: string; // Foreign key to profiles.id
  image_url: string;
  title: string | null;
  description: string | null;
  created_at: string;
  updated_at: string; // Added from new schema
  width: number; // Now NOT NULL in DB
  height: number; // Now NOT NULL in DB
  uploader: Pick<Profile, "username" | "avatar_url" | "full_name">; // username is string
  tags?: Tag[]; // Optional, if tags are loaded
  likes_count?: number;
  comments_count?: number;
}

// For Supabase responses that include joined profile data directly
export interface PinWithUploaderFromSupabase {
  id: string;
  user_id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  width: number; // From DB, NOT NULL
  height: number; // From DB, NOT NULL
  profiles: { // Assumed to be non-null due to FK relationship and select join
    username: string; // From DB, NOT NULL
    avatar_url: string | null;
    full_name: string | null;
  };
}

export interface Tag {
  id: number;
  name: string;
  created_at: string;
}

export interface Comment {
  id: string;
  pin_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
  commenter?: Pick<Profile, "username" | "avatar_url" | "full_name">;
}

export interface Board {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

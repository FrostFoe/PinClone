export interface Profile {
  id: string; // Corresponds to auth.users.id
  username: string; // NOT NULL in DB
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  created_at: string; // Timestamps are expected to be non-null strings (ISO 8601)
  updated_at: string; // Timestamps are expected to be non-null strings (ISO 8601)
}

export interface Pin {
  id: string;
  user_id: string; // Foreign key to profiles.id
  image_url: string;
  title: string | null;
  description: string | null;
  created_at: string; // Timestamps are expected to be non-null strings (ISO 8601)
  updated_at: string; // Timestamps are expected to be non-null strings (ISO 8601)
  width: number; // NOT NULL in DB
  height: number; // NOT NULL in DB
  uploader: Pick<Profile, "username" | "avatar_url" | "full_name">;
}

// For Supabase responses that include joined profile data directly
export interface PinWithUploaderFromSupabase {
  id: string;
  user_id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  created_at: string; // Timestamps are expected to be non-null strings (ISO 8601)
  updated_at: string; // Timestamps are expected to be non-null strings (ISO 8601)
  width: number; // NOT NULL in DB
  height: number; // NOT NULL in DB
  uploader_profile: {
    username: string; // From DB, NOT NULL
    avatar_url: string | null;
    full_name: string | null;
  };
}

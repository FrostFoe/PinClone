// Represents a user's public profile information.
export interface Profile {
  id: string; // Corresponds to auth.users.id
  username: string; // Unique public username, NOT NULL in DB
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  created_at: string; // ISO 8601 timestamp string, NOT NULL in DB
  updated_at: string; // ISO 8601 timestamp string, NOT NULL in DB
}

// Represents a single pin.
export interface Pin {
  id: string;
  user_id: string; // Foreign key to profiles.id (and transitively auth.users.id)
  image_url: string; // URL of the pin image, NOT NULL in DB
  title: string | null;
  description: string | null;
  width: number; // Original width of the image, NOT NULL in DB
  height: number; // Original height of the image, NOT NULL in DB
  created_at: string; // ISO 8601 timestamp string, NOT NULL in DB
  updated_at: string; // ISO 8601 timestamp string, NOT NULL in DB
  // Uploader information is denormalized here for easier access in the UI.
  // This data comes from joining with the 'profiles' table.
  uploader: Pick<Profile, "username" | "avatar_url" | "full_name">;
}

// Represents the shape of data when fetching a Pin and its uploader's profile
// directly from a Supabase query that performs a join.
export interface PinWithUploaderFromSupabase {
  id: string;
  user_id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  width: number; // NOT NULL in DB
  height: number; // NOT NULL in DB
  created_at: string; // NOT NULL in DB
  updated_at: string; // NOT NULL in DB
  // The joined profile data from Supabase. The foreign key relationship
  // and 'inner' join in queries should ensure this is non-null if a pin exists.
  uploader_profile: {
    username: string; // NOT NULL in DB
    avatar_url: string | null;
    full_name: string | null;
    // We don't need created_at/updated_at of the profile here,
    // but they would be available if selected in the query.
  };
}

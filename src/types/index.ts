export interface Profile {
  id: string;
  username: string | null; // Should become non-null after initial setup via trigger
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  created_at: string;
}

export interface Pin {
  id: string;
  user_id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  created_at: string;
  width: number;
  height: number;
  uploader?: Pick<Profile, "username" | "avatar_url" | "full_name">;
  // likes_count?: number; // Example, if you add this field directly to pins table or a view
}

// For Supabase responses that might include joined profile data
export interface PinWithUploader
  extends Omit<Pin, "uploader" | "width" | "height"> {
  width: number | null; // From DB
  height: number | null; // From DB
  profiles: {
    username: string | null;
    avatar_url: string | null;
    full_name: string | null;
  } | null; // Profile can be null if join fails or user deleted (though FK should prevent orphan pins)
}


export interface Profile {
  id: string; // UUID from auth.users
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  created_at: string;
}

export interface Pin {
  id: string; // UUID
  user_id: string; // UUID of the uploader
  image_url: string;
  title: string | null;
  description: string | null;
  created_at: string;
  width?: number; // Optional: for client-side masonry layout
  height?: number; // Optional: for client-side masonry layout
  // For UI display, we might join profile data
  uploader?: Pick<Profile, 'username' | 'avatar_url' | 'full_name'>; 
  likes?: number; // Example: if you add a likes count, not in base schema
}

// For Supabase responses that might include joined profile data
export interface PinWithUploader extends Omit<Pin, 'uploader'> {
  profiles: { // Supabase typically returns joined tables as an object or array
    username: string | null;
    avatar_url: string | null;
    full_name: string | null;
  } | null;
}

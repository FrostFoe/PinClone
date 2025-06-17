
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server"; // Use server client for server actions
import type { Profile } from "@/types";
import type { TablesInsert, TablesUpdate } from "@/types/supabase"; // Added TablesInsert

export async function fetchProfileByUsername(
  username: string,
): Promise<{ profile: Profile | null; error: string | null }> {
  const supabase = createSupabaseServerClient();
  if (!username) return { profile: null, error: "Username is required." };
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .ilike("username", username)
      .single();

    if (error) {
      if (error.code === "PGRST116")
        return { profile: null, error: "Profile not found." };
      return { profile: null, error: error.message };
    }
    return { profile: data, error: null };
  } catch (e: any) {
    return { profile: null, error: "An unexpected error occurred." };
  }
}

export async function fetchProfileById(
  userId: string,
): Promise<{ profile: Profile | null; error: string | null }> {
  const supabase = createSupabaseServerClient();
  if (!userId) return { profile: null, error: "User ID is required." };
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116")
        return { profile: null, error: "Profile not found for this user ID." };
      return { profile: null, error: error.message };
    }
    return { profile: data, error: null };
  } catch (e: any) {
    return { profile: null, error: "An unexpected error occurred." };
  }
}

export async function updateProfile(
  userId: string,
  updates: TablesUpdate<"profiles">, // Can also be TablesInsert if all fields are provided
): Promise<{ profile: Profile | null; error: string | null }> {
  const supabase = createSupabaseServerClient();
  if (!userId)
    return { profile: null, error: "User ID is required for update." };

  if (
    updates.username !== undefined &&
    (updates.username === null || updates.username.trim() === "")
  ) {
    return { profile: null, error: "Username cannot be empty." };
  }

  // Prepare data for upsert. It must include the `id`.
  const profileData: TablesInsert<"profiles"> = {
    id: userId, // Crucial for upsert to identify the row or create it with this ID
    username: updates.username || "", // Ensure username is not null for insert
    full_name: updates.full_name || null,
    avatar_url: updates.avatar_url || null,
    bio: updates.bio || null,
    website: updates.website || null,
    // created_at will be set by default by db
  };
  
  // Filter out undefined values from updates before merging,
  // but ensure essential fields for insert (like username) have defaults if not in updates.
   const dataToUpsert = { ...profileData, ...updates, id: userId };
   if (!dataToUpsert.username) {
     // Attempt to generate a default username if not provided and it's an insert scenario
     // This is tricky as email is not directly available here.
     // The form on settings page should ensure username is populated.
     // For now, we rely on `updates.username` being set by the form.
     // If `updates.username` is empty, the earlier check handles it.
   }


  try {
    // Using upsert to create the profile if it doesn't exist, or update if it does.
    // onConflict: 'id' means if a profile with this 'id' exists, it will be updated.
    // Otherwise, a new profile will be inserted.
    const { data, error } = await supabase
      .from("profiles")
      .upsert(dataToUpsert, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      if (error.message.includes("profiles_username_key") || error.message.includes("profiles_username_idx")) {
        return { profile: null, error: "This username is already taken." };
      }
      return { profile: null, error: error.message };
    }
    return { profile: data, error: null };
  } catch (e: any) {
    return { profile: null, error: "An unexpected error occurred." };
  }
}

export async function checkUsernameAvailability(
  username: string,
): Promise<{ available: boolean; error: string | null }> {
  const supabase = createSupabaseServerClient();
  if (!username || username.trim().length < 3) {
    return {
      available: false,
      error: "Username must be at least 3 characters.",
    };
  }
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .ilike("username", username.trim())
      .maybeSingle(); // Use maybeSingle to not error if not found

    if (error) {
      return { available: false, error: error.message };
    }
    return { available: !data, error: null }; // True if no data (username not found, so available)
  } catch (e: any) {
    return {
      available: false,
      error: "An unexpected error occurred while checking username.",
    };
  }
}

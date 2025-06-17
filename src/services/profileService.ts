"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";
import type { TablesInsert, TablesUpdate } from "@/types/supabase";

export async function fetchProfileByUsername(
  username: string,
): Promise<{ profile: Profile | null; error: string | null }> {
  const supabase = createSupabaseServerClient();
  if (!username) return { profile: null, error: "Username is required." };
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .ilike("username", username.trim()) // Ensure query uses trimmed username
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // "PGRST116" implies 0 rows returned, which is expected for "not found"
        return { profile: null, error: "Profile not found." };
      }
      console.error(
        `Error fetching profile by username "${username}":`,
        error.message,
      );
      return { profile: null, error: error.message };
    }
    return { profile: data, error: null };
  } catch (e: any) {
    console.error(
      "Unexpected error in fetchProfileByUsername:",
      (e as Error).message,
    );
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
      if (error.code === "PGRST116") {
        return { profile: null, error: "Profile not found for this user ID." };
      }
      console.error(`Error fetching profile by ID "${userId}":`, error.message);
      return { profile: null, error: error.message };
    }
    return { profile: data, error: null };
  } catch (e: any) {
    console.error(
      "Unexpected error in fetchProfileById:",
      (e as Error).message,
    );
    return { profile: null, error: "An unexpected error occurred." };
  }
}

export async function updateProfile(
  userId: string,
  updates: TablesUpdate<"profiles">,
): Promise<{ profile: Profile | null; error: string | null }> {
  const supabase = createSupabaseServerClient();
  if (!userId) {
    return { profile: null, error: "User ID is required for update." };
  }

  // Validate username: must exist and be non-empty if provided in updates
  if (updates.username !== undefined) {
    if (updates.username === null || updates.username.trim() === "") {
      return { profile: null, error: "Username cannot be empty." };
    }
    if (updates.username.trim().length < 3) {
      return {
        profile: null,
        error: "Username must be at least 3 characters.",
      };
    }
    updates.username = updates.username.trim(); // Use trimmed username
  }

  // Trim other string fields if they are provided
  if (updates.full_name !== undefined)
    updates.full_name = updates.full_name?.trim() || null;
  if (updates.bio !== undefined) updates.bio = updates.bio?.trim() || null;
  if (updates.website !== undefined)
    updates.website = updates.website?.trim() || null;

  const profileDataForUpsert: TablesInsert<"profiles"> = {
    id: userId,
    // If username is not in updates, it won't be changed by upsert unless it's a new insert.
    // For new insert, username must be provided or have a DB default (which our trigger aims to do).
    // The calling form (settings page) is responsible for ensuring username is present for new profiles.
    ...(updates.username && { username: updates.username }),
    ...(updates.full_name !== undefined && { full_name: updates.full_name }),
    ...(updates.avatar_url !== undefined && { avatar_url: updates.avatar_url }),
    ...(updates.bio !== undefined && { bio: updates.bio }),
    ...(updates.website !== undefined && { website: updates.website }),
  };

  // Remove undefined keys from profileDataForUpsert to avoid issues with Supabase client
  Object.keys(profileDataForUpsert).forEach((key) => {
    if (
      profileDataForUpsert[key as keyof typeof profileDataForUpsert] ===
      undefined
    ) {
      delete profileDataForUpsert[key as keyof typeof profileDataForUpsert];
    }
  });

  try {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(profileDataForUpsert, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error(
        `Error upserting profile for user "${userId}":`,
        error.message,
      );
      if (
        error.message.includes("profiles_username_key") ||
        error.message.includes("profiles_username_idx")
      ) {
        return { profile: null, error: "This username is already taken." };
      }
      return { profile: null, error: error.message };
    }
    return { profile: data, error: null };
  } catch (e: any) {
    console.error("Unexpected error in updateProfile:", (e as Error).message);
    return { profile: null, error: "An unexpected error occurred." };
  }
}

export async function checkUsernameAvailability(
  username: string,
): Promise<{ available: boolean; error: string | null }> {
  const supabase = createSupabaseServerClient();
  const trimmedUsername = username.trim();
  if (!trimmedUsername || trimmedUsername.length < 3) {
    return {
      available: false,
      error: "Username must be at least 3 characters.",
    };
  }
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .ilike("username", trimmedUsername) // Use trimmed username for check
      .maybeSingle();

    if (error) {
      console.error(
        `Error checking username availability for "${trimmedUsername}":`,
        error.message,
      );
      return { available: false, error: error.message };
    }
    return { available: !data, error: null }; // True if no data (username not found, so available)
  } catch (e: any) {
    console.error(
      "Unexpected error in checkUsernameAvailability:",
      (e as Error).message,
    );
    return {
      available: false,
      error: "An unexpected error occurred while checking username.",
    };
  }
}

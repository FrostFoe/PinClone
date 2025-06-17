
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";
import type { TablesInsert, TablesUpdate } from "@/types/supabase";

export async function fetchProfileByUsername(
  username: string,
): Promise<{ profile: Profile | null; error: string | null }> {
  const supabase = createSupabaseServerClient();
  if (!username || username.trim() === "") {
    return { profile: null, error: "Username is required." };
  }
  try {
    const { data, error, status, statusText } = await supabase
      .from("profiles")
      .select("*") 
      .ilike("username", username.trim()) // Case-insensitive search
      .single();

    if (error) {
      if (error.code === "PGRST116") { // "Searched for a single row, but found no rows"
        return { profile: null, error: "Profile not found." };
      }
      console.error(
        `Error fetching profile by username "${username}":`, { message: error.message, details: error.details, hint: error.hint, code: error.code, status, statusText },
      );
      return { profile: null, error: error.message };
    }
    return { profile: data, error: null };
  } catch (e: any) {
    console.error(
      "Unexpected error in fetchProfileByUsername:", { message: (e as Error).message, stack: (e as Error).stack },
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
    const { data, error, status, statusText } = await supabase
      .from("profiles")
      .select("*") 
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { profile: null, error: "Profile not found for this user ID." };
      }
      console.error(`Error fetching profile by ID "${userId}":`, { message: error.message, details: error.details, hint: error.hint, code: error.code, status, statusText });
      return { profile: null, error: error.message };
    }
    return { profile: data, error: null };
  } catch (e: any) {
    console.error(
      "Unexpected error in fetchProfileById:", { message: (e as Error).message, stack: (e as Error).stack },
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

  // Validate and sanitize username if provided
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
    if (!/^[a-zA-Z0-9_.]+$/.test(updates.username.trim())) {
       return {
        profile: null,
        error: "Username can only contain letters, numbers, underscores, and periods.",
      };
    }
    updates.username = updates.username.trim();
  }

  // Trim other string fields if they exist in updates
  if (updates.full_name !== undefined)
    updates.full_name = updates.full_name?.trim() || null;
  if (updates.bio !== undefined) updates.bio = updates.bio?.trim() || null;
  if (updates.website !== undefined)
    updates.website = updates.website?.trim() || null;
  
  // The 'updated_at' field is handled by the database trigger in schema.sql
  // Do not include it in the 'updates' object here to avoid overriding the trigger.
  if ('updated_at' in updates) {
    delete updates.updated_at;
  }

  const profileDataForUpdate: TablesUpdate<"profiles"> = {
    ...updates,
  };

  try {
    const { data, error, status, statusText } = await supabase
      .from("profiles")
      .update(profileDataForUpdate)
      .eq("id", userId) // Ensure we're updating the correct profile
      .select() 
      .single();

    if (error) {
      console.error(
        `Error updating profile for user "${userId}":`, { message: error.message, details: error.details, hint: error.hint, code: error.code, status, statusText },
      );
      if (
        error.message.includes("profiles_username_key") || 
        error.message.includes("profiles_username_idx") || 
        error.message.includes("duplicate key value violates unique constraint") && error.message.includes("username")
      ) {
        return { profile: null, error: "This username is already taken." };
      }
      return { profile: null, error: error.message };
    }
    if (!data) {
         console.error(`Profile data is null after update for user "${userId}", though no specific error was returned. This might be an RLS issue.`);
         return { profile: null, error: "Profile update succeeded but no data returned." };
    }
    return { profile: data, error: null };
  } catch (e: any) {
    console.error("Unexpected error in updateProfile:", { message: (e as Error).message, stack: (e as Error).stack });
    return { profile: null, error: "An unexpected error occurred." };
  }
}

export async function checkUsernameAvailability(
  username: string,
): Promise<{ available: boolean; error: string | null }> {
  const supabase = createSupabaseServerClient();
  const trimmedUsername = username.trim();
  if (!trimmedUsername) {
    return { available: false, error: "Username cannot be empty." };
  }
  if (trimmedUsername.length < 3) {
    return {
      available: false,
      error: "Username must be at least 3 characters.",
    };
  }
   if (!/^[a-zA-Z0-9_.]+$/.test(trimmedUsername)) {
      return {
        available: false,
        error: "Username can only contain letters, numbers, underscores, and periods.",
      };
    }

  try {
    const { data, error, status, statusText } = await supabase
      .from("profiles")
      .select("username")
      .ilike("username", trimmedUsername)
      .maybeSingle(); // Use maybeSingle to avoid error if username doesn't exist

    if (error && error.code !== 'PGRST116') { // Ignore "no rows found" error
      console.error(
        `Error checking username availability for "${trimmedUsername}":`, { message: error.message, details: error.details, hint: error.hint, code: error.code, status, statusText },
      );
      return { available: false, error: error.message };
    }
    // If data is null (username not found), it's available. If data exists, it's not available.
    return { available: !data, error: null };
  } catch (e: any) {
    console.error(
      "Unexpected error in checkUsernameAvailability:", { message: (e as Error).message, stack: (e as Error).stack },
    );
    return {
      available: false,
      error: "An unexpected error occurred while checking username.",
    };
  }
}

    

"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";
import type { TablesUpdate } from "@/types/supabase";

export async function fetchProfileByUsername(
  username: string,
): Promise<{ profile: Profile | null; error: string | null }> {
  console.log(`[profileService] fetchProfileByUsername: Fetching profile for username: ${username}`);
  const supabase = createSupabaseServerClient();
  if (!username || username.trim() === "") {
    console.warn("[profileService] fetchProfileByUsername: Username is required but was not provided.");
    return { profile: null, error: "Username is required." };
  }
  try {
    const { data, error, status, statusText } = await supabase
      .from("profiles")
      .select("*")
      .ilike("username", username.trim()) // Using ilike for case-insensitive match
      .single();

    if (error) {
      if (error.code === "PGRST116") { // "PGRST116" is "Searched item was not found"
        console.warn(`[profileService] fetchProfileByUsername: Profile not found for username "${username}" (PGRST116).`);
        return { profile: null, error: "Profile not found." };
      }
      console.error(`[profileService] fetchProfileByUsername: Error fetching profile by username "${username}":`, {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status,
        statusText,
      });
      return { profile: null, error: error.message };
    }

    if (!data) {
      // This case should ideally be covered by error.code === "PGRST116" if .single() is used and no row is found.
      console.warn(`[profileService] fetchProfileByUsername: Profile data is null for username "${username}" after fetch, though no specific error was returned. This might indicate an RLS issue or the profile truly does not exist.`);
      return { profile: null, error: "Profile data is unexpectedly null after fetch." };
    }
    console.log(`[profileService] fetchProfileByUsername: Successfully fetched profile for username "${username}":`, JSON.stringify(data, null, 2));
    return { profile: data as Profile, error: null };
  } catch (e: any) {
    console.error(
      `[profileService] fetchProfileByUsername: Unexpected error for username "${username}":`,
      {
        message: (e as Error).message,
        stack: (e as Error).stack,
      },
    );
    return { profile: null, error: "An unexpected error occurred." };
  }
}

export async function fetchProfileById(
  userId: string,
): Promise<{ profile: Profile | null; error: string | null }> {
  console.log(`[profileService] fetchProfileById: Fetching profile for user ID: ${userId}`);
  const supabase = createSupabaseServerClient();
  if (!userId) {
    console.warn("[profileService] fetchProfileById: User ID is required but was not provided.");
    return { profile: null, error: "User ID is required." };
  }
  try {
    const { data, error, status, statusText } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        console.warn(`[profileService] fetchProfileById: Profile not found for user ID "${userId}" (PGRST116). This can happen if a user signed up but their profile record wasn't created by the handle_new_user trigger, or if the ID is incorrect.`);
        return { profile: null, error: "Profile not found for this user ID." };
      }
      console.error(`[profileService] fetchProfileById: Error fetching profile by ID "${userId}":`, {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status,
        statusText,
      });
      return { profile: null, error: error.message };
    }

    if (!data) {
      console.warn(`[profileService] fetchProfileById: Profile data is null for user ID "${userId}" after fetch, though no specific error was returned.`);
      return { profile: null, error: "Profile data is unexpectedly null after fetch." };
    }
    console.log(`[profileService] fetchProfileById: Successfully fetched profile for user ID "${userId}":`, JSON.stringify(data, null, 2));
    return { profile: data as Profile, error: null };
  } catch (e: any) {
    console.error(`[profileService] fetchProfileById: Unexpected error for user ID "${userId}":`, {
      message: (e as Error).message,
      stack: (e as Error).stack,
    });
    return { profile: null, error: "An unexpected error occurred." };
  }
}

export async function updateProfile(
  userId: string,
  updates: TablesUpdate<"profiles">,
): Promise<{ profile: Profile | null; error: string | null }> {
  console.log(`[profileService] updateProfile: Attempting to update profile for user ID: ${userId} with updates:`, updates);
  const supabase = createSupabaseServerClient();
  if (!userId) {
    console.warn("[profileService] updateProfile: User ID is required for update.");
    return { profile: null, error: "User ID is required for update." };
  }

  if (updates.username !== undefined) {
    if (updates.username === null || updates.username.trim() === "") {
      console.warn("[profileService] updateProfile: Username cannot be empty.");
      return { profile: null, error: "Username cannot be empty." };
    }
    if (updates.username.trim().length < 3) {
      console.warn("[profileService] updateProfile: Username must be at least 3 characters.");
      return {
        profile: null,
        error: "Username must be at least 3 characters.",
      };
    }
    if (!/^[a-zA-Z0-9_.]+$/.test(updates.username.trim())) {
      console.warn("[profileService] updateProfile: Username contains invalid characters.");
      return {
        profile: null,
        error:
          "Username can only contain letters, numbers, underscores, and periods.",
      };
    }
    updates.username = updates.username.trim();
  }

  if (updates.full_name !== undefined)
    updates.full_name = updates.full_name?.trim() || null;
  if (updates.bio !== undefined) updates.bio = updates.bio?.trim() || null;
  if (updates.website !== undefined)
    updates.website = updates.website?.trim() || null;

  const profileDataForUpdate: TablesUpdate<"profiles"> = {
    ...updates,
    updated_at: new Date().toISOString(), // Explicitly set updated_at
  };
  // Remove id from update payload if present, as it's used in .eq()
  if ('id' in profileDataForUpdate) {
    delete profileDataForUpdate.id;
  }


  try {
    const { data, error, status, statusText } = await supabase
      .from("profiles")
      .update(profileDataForUpdate)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error(`[profileService] updateProfile: Error updating profile for user "${userId}":`, {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status,
        statusText,
        updatePayload: profileDataForUpdate,
      });
      if (
        error.message.includes("profiles_username_key") || // PostgreSQL specific for unique constraint
        error.message.includes("profiles_username_idx") || // Index name if used for unique constraint
        (error.message.includes( // Generic unique constraint violation message
          "duplicate key value violates unique constraint",
        ) &&
          error.message.includes("username")) // Check if 'username' is part of the constraint name
      ) {
        return { profile: null, error: "This username is already taken." };
      }
      return { profile: null, error: error.message };
    }
    if (!data) {
      console.error(
        `[profileService] updateProfile: Profile data is null after update for user "${userId}", though no specific error was returned. This might be an RLS issue or the profile does not exist.`,
      );
      return {
        profile: null,
        error: "Profile update succeeded but no data returned.",
      };
    }
    console.log(`[profileService] updateProfile: Successfully updated profile for user ID "${userId}":`, JSON.stringify(data, null, 2));
    return { profile: data as Profile, error: null };
  } catch (e: any) {
    console.error(`[profileService] updateProfile: Unexpected error for user "${userId}":`, {
      message: (e as Error).message,
      stack: (e as Error).stack,
      updatePayload: profileDataForUpdate,
    });
    return { profile: null, error: "An unexpected error occurred." };
  }
}

export async function checkUsernameAvailability(
  username: string,
): Promise<{ available: boolean; error: string | null }> {
  console.log(`[profileService] checkUsernameAvailability: Checking username: ${username}`);
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
      error:
        "Username can only contain letters, numbers, underscores, and periods.",
    };
  }

  try {
    const { data, error, status, statusText } = await supabase
      .from("profiles")
      .select("username")
      .ilike("username", trimmedUsername)
      .maybeSingle(); // Use maybeSingle to not error if no user found

    if (error && error.code !== "PGRST116") { // PGRST116 means no rows found, which is fine here
      console.error(
        `[profileService] checkUsernameAvailability: Error for "${trimmedUsername}":`,
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          status,
          statusText,
        },
      );
      return { available: false, error: error.message };
    }
    const isAvailable = !data; // If data exists, username is taken
    console.log(`[profileService] checkUsernameAvailability: Username "${trimmedUsername}" is ${isAvailable ? 'available' : 'taken'}.`);
    return { available: isAvailable, error: null };
  } catch (e: any) {
    console.error(
      `[profileService] checkUsernameAvailability: Unexpected error for "${trimmedUsername}":`,
      {
        message: (e as Error).message,
        stack: (e as Error).stack,
      },
    );
    return {
      available: false,
      error: "An unexpected error occurred while checking username.",
    };
  }
}

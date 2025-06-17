
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";
import type { TablesUpdate } from "@/types/supabase";

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
      .ilike("username", username.trim())
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        console.warn(`Profile not found for username "${username}" (PGRST116).`);
        return { profile: null, error: "Profile not found." };
      }
      console.error(`Error fetching profile by username "${username}":`, {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status,
        statusText,
      });
      return { profile: null, error: error.message };
    }
    return { profile: data, error: null };
  } catch (e: any) {
    console.error(
      `Unexpected error in fetchProfileByUsername for username "${username}":`,
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
        console.warn(`Profile not found for user ID "${userId}" (PGRST116). This can happen if a user signed up but their profile record wasn't created by the handle_new_user trigger, or if the ID is incorrect.`);
        return { profile: null, error: "Profile not found for this user ID." };
      }
      console.error(`Error fetching profile by ID "${userId}":`, {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status,
        statusText,
      });
      return { profile: null, error: error.message };
    }
    return { profile: data, error: null };
  } catch (e: any) {
    console.error(`Unexpected error in fetchProfileById for user ID "${userId}":`, {
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
  const supabase = createSupabaseServerClient();
  if (!userId) {
    return { profile: null, error: "User ID is required for update." };
  }

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
  };
  // Let the DB trigger handle updated_at
  delete profileDataForUpdate.updated_at;


  try {
    const { data, error, status, statusText } = await supabase
      .from("profiles")
      .update(profileDataForUpdate)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error(`Error updating profile for user "${userId}":`, {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status,
        statusText,
        updatePayload: profileDataForUpdate,
      });
      if (
        error.message.includes("profiles_username_key") ||
        error.message.includes("profiles_username_idx") ||
        (error.message.includes(
          "duplicate key value violates unique constraint",
        ) &&
          error.message.includes("username"))
      ) {
        return { profile: null, error: "This username is already taken." };
      }
      return { profile: null, error: error.message };
    }
    if (!data) {
      console.error(
        `Profile data is null after update for user "${userId}", though no specific error was returned. This might be an RLS issue or the profile does not exist.`,
      );
      return {
        profile: null,
        error: "Profile update succeeded but no data returned.",
      };
    }
    return { profile: data, error: null };
  } catch (e: any) {
    console.error(`Unexpected error in updateProfile for user "${userId}":`, {
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
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error(
        `Error checking username availability for "${trimmedUsername}":`,
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
    return { available: !data, error: null };
  } catch (e: any) {
    console.error(
      `Unexpected error in checkUsernameAvailability for "${trimmedUsername}":`,
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

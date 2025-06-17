
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
      .select("*") // Selects all columns including created_at and updated_at
      .ilike("username", username.trim())
      .single();

    if (error) {
      if (error.code === "PGRST116") {
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
      .select("*") // Selects all columns including created_at and updated_at
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
    updates.username = updates.username.trim();
  }

  if (updates.full_name !== undefined)
    updates.full_name = updates.full_name?.trim() || null;
  if (updates.bio !== undefined) updates.bio = updates.bio?.trim() || null;
  if (updates.website !== undefined)
    updates.website = updates.website?.trim() || null;

  // Ensure 'id' is part of the object for upsert.
  // 'updated_at' will be handled by the database trigger.
  const profileDataForUpsert: TablesInsert<"profiles"> = {
    id: userId,
    ...updates, // Spread the validated and trimmed updates
  };

  // Remove undefined keys to prevent issues with Supabase client
  Object.keys(profileDataForUpsert).forEach((key) => {
    const K = key as keyof typeof profileDataForUpsert;
    if (profileDataForUpsert[K] === undefined) {
      delete profileDataForUpsert[K];
    }
  });


  try {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(profileDataForUpsert, { onConflict: "id" })
      .select() // Selects all columns including created_at and updated_at
      .single();

    if (error) {
      console.error(
        `Error upserting profile for user "${userId}":`,
        error.message,
      );
      if (
        error.message.includes("profiles_username_key") || // Supabase < v14
        error.message.includes("profiles_username_idx") || // Supabase >= v14
        error.message.includes("duplicate key value violates unique constraint \"profiles_username_key\"") // More explicit PG error
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
      .ilike("username", trimmedUsername)
      .maybeSingle();

    if (error) {
      console.error(
        `Error checking username availability for "${trimmedUsername}":`,
        error.message,
      );
      return { available: false, error: error.message };
    }
    return { available: !data, error: null };
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

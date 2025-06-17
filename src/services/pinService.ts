
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Pin, PinWithUploader } from "@/types";
import type { TablesInsert } from "@/types/supabase";

// Helper to map Supabase pin data (with joined profile) to our Pin type
// Exporting for use in other services like searchService
export async function mapSupabasePin(supabasePin: PinWithUploader): Promise<Pin> {
  return {
    id: supabasePin.id,
    user_id: supabasePin.user_id || "",
    image_url: supabasePin.image_url,
    title: supabasePin.title,
    description: supabasePin.description,
    created_at: supabasePin.created_at,
    width: supabasePin.width || 300, // Default width if null
    height: supabasePin.height || 400, // Default height if null
    uploader: supabasePin.profiles
      ? {
          username: supabasePin.profiles.username || "unknown_user",
          avatar_url: supabasePin.profiles.avatar_url,
          full_name: supabasePin.profiles.full_name,
        }
      : undefined,
  };
}

export async function fetchAllPins(
  page: number = 1,
  limit: number = 20,
): Promise<{ pins: Pin[]; error: string | null }> {
  const supabase = createSupabaseServerClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    const { data, error } = await supabase
      .from("pins")
      .select(
        `
        *,
        profiles (
          username,
          avatar_url,
          full_name
        )
      `,
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching all pins:", error.message);
      return { pins: [], error: error.message };
    }

    const pins = data ? await Promise.all(data.map(mapSupabasePin)) : [];
    return { pins, error: null };
  } catch (e: any) {
    console.error("Unexpected error in fetchAllPins:", (e as Error).message);
    return { pins: [], error: "An unexpected error occurred." };
  }
}

export async function fetchPinById(
  id: string,
): Promise<{ pin: Pin | null; error: string | null }> {
  const supabase = createSupabaseServerClient();
  if (!id) return { pin: null, error: "Pin ID is required." };
  try {
    const { data, error } = await supabase
      .from("pins")
      .select(
        `
        *,
        profiles (
          username,
          avatar_url,
          full_name
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { pin: null, error: "Pin not found." };
      }
      console.error(`Error fetching pin by ID ${id}:`, error.message);
      return { pin: null, error: error.message };
    }

    return { pin: data ? await mapSupabasePin(data) : null, error: null };
  } catch (e: any) {
    console.error("Unexpected error in fetchPinById:", (e as Error).message);
    return { pin: null, error: "An unexpected error occurred." };
  }
}

export async function fetchPinsByUserId(
  userId: string,
  page: number = 1,
  limit: number = 20,
): Promise<{ pins: Pin[]; error: string | null }> {
  const supabase = createSupabaseServerClient();
  if (!userId) return { pins: [], error: "User ID is required." };
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  try {
    const { data, error } = await supabase
      .from("pins")
      .select(
        `
        *,
        profiles (
          username,
          avatar_url,
          full_name
        )
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error(`Error fetching pins for user ${userId}:`, error.message);
      return { pins: [], error: error.message };
    }

    const pins = data ? await Promise.all(data.map(mapSupabasePin)) : [];
    return { pins, error: null };
  } catch (e: any) {
    console.error("Unexpected error in fetchPinsByUserId:", (e as Error).message);
    return { pins: [], error: "An unexpected error occurred." };
  }
}

export async function createPin(
  pinData: Omit<TablesInsert<"pins">, "id" | "created_at" | "user_id">,
): Promise<{ pin: Pin | null; error: string | null }> {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Authentication error in createPin:", userError?.message);
    return { pin: null, error: userError?.message || "User must be authenticated to create a pin." };
  }

  if (!pinData.image_url) {
    return { pin: null, error: "Image URL is required." };
  }
  // Ensure width and height are provided as per application logic
  if (typeof pinData.width !== 'number' || typeof pinData.height !== 'number') {
    return {
      pin: null,
      error: "Image dimensions (width and height) are required and must be numbers.",
    };
  }

  const newPin: TablesInsert<"pins"> = {
    ...pinData,
    user_id: user.id,
    // created_at will be set by default by the database
  };

  try {
    const { data: insertedPinData, error: insertError } = await supabase
      .from("pins")
      .insert(newPin)
      .select(
        `
        *,
        profiles (
          username,
          avatar_url,
          full_name
        )
      `,
      )
      .single();

    if (insertError) {
      console.error("Error inserting pin:", insertError.message);
      return { pin: null, error: `Failed to create pin: ${insertError.message}` };
    }

    if (insertedPinData) {
      // Type assertion as PinWithUploader after successful insert and select
      let createdPin = insertedPinData as PinWithUploader;

      // If profile info wasn't joined (e.g., profile created just after pin insert)
      // or if the profile is still missing, we attempt one more fetch.
      // This is a fallback and ideally, the profile should exist due to the signup trigger.
      if (!createdPin.profiles) {
        console.warn(`Profile data for user ${user.id} not immediately available after pin creation. Attempting fallback fetch.`);
        const { data: profileData, error: profileFetchError } = await supabase
          .from("profiles")
          .select("username, avatar_url, full_name")
          .eq("id", user.id)
          .single();
        
        if (profileFetchError && profileFetchError.code !== 'PGRST116') {
            console.error("Error in fallback fetch for profile details after pin creation:", profileFetchError.message);
        }
        if (profileData) {
          createdPin.profiles = profileData;
        } else {
           console.warn(`Fallback profile fetch for user ${user.id} found no profile. Uploader info on pin will be undefined.`);
        }
      }
      return { pin: await mapSupabasePin(createdPin), error: null };
    }
    return {
      pin: null,
      error: "Failed to create pin or retrieve created pin data.",
    };
  } catch (e: any) {
    console.error("Unexpected error in createPin transaction:", (e as Error).message);
    return { pin: null, error: `An unexpected error occurred: ${(e as Error).message}` };
  }
}

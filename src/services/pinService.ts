
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Pin, PinWithUploaderFromSupabase } from "@/types";
import type { TablesInsert } from "@/types/supabase";

// Helper to map Supabase pin data (with joined profile) to our Pin type
export async function mapSupabasePin(
  supabasePin: PinWithUploaderFromSupabase,
): Promise<Pin> {
  // Ensure profiles is not null - it should be guaranteed by the FK and select query
  if (!supabasePin.profiles) {
    console.error(
      `Error in mapSupabasePin: profiles data missing for pin ID ${supabasePin.id}. This indicates an issue with the data fetch or schema.`,
    );
    // Fallback or throw error, depending on desired strictness.
    // For now, let's proceed but log, and uploader might be incomplete.
    // This path should ideally not be hit if queries and schema are correct.
  }

  return {
    id: supabasePin.id,
    user_id: supabasePin.user_id,
    image_url: supabasePin.image_url,
    title: supabasePin.title,
    description: supabasePin.description,
    created_at: supabasePin.created_at,
    updated_at: supabasePin.updated_at,
    width: supabasePin.width, // Directly use, as it's NOT NULL
    height: supabasePin.height, // Directly use, as it's NOT NULL
    uploader: {
      // profiles object is now expected to be non-null from PinWithUploaderFromSupabase
      username: supabasePin.profiles.username, // username is NOT NULL in profiles table
      avatar_url: supabasePin.profiles.avatar_url,
      full_name: supabasePin.profiles.full_name,
    },
    // tags, likes_count, comments_count would be populated by more complex queries if needed directly on Pin
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

    const pins = data
      ? await Promise.all(
          data.map((p) =>
            mapSupabasePin(p as PinWithUploaderFromSupabase),
          ),
        )
      : [];
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

    return data
      ? {
          pin: await mapSupabasePin(data as PinWithUploaderFromSupabase),
          error: null,
        }
      : { pin: null, error: "Pin data is null." };
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

    const pins = data
      ? await Promise.all(
          data.map((p) =>
            mapSupabasePin(p as PinWithUploaderFromSupabase),
          ),
        )
      : [];
    return { pins, error: null };
  } catch (e: any) {
    console.error(
      "Unexpected error in fetchPinsByUserId:",
      (e as Error).message,
    );
    return { pins: [], error: "An unexpected error occurred." };
  }
}

export async function createPin(
  pinData: Omit<
    TablesInsert<"pins">,
    "id" | "created_at" | "updated_at" | "user_id"
  > & { width: number; height: number }, // Ensure width/height are part of input
): Promise<{ pin: Pin | null; error: string | null }> {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Authentication error in createPin:", userError?.message);
    return {
      pin: null,
      error:
        userError?.message || "User must be authenticated to create a pin.",
    };
  }

  if (!pinData.image_url) {
    return { pin: null, error: "Image URL is required." };
  }
  // Width and height are now guaranteed by type and DB constraint
  if (typeof pinData.width !== "number" || typeof pinData.height !== "number") {
    return {
      pin: null,
      error:
        "Image dimensions (width and height) are required and must be numbers.",
    };
  }

  const newPin: TablesInsert<"pins"> = {
    ...pinData,
    user_id: user.id, // This user_id references profiles.id now
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
      return {
        pin: null,
        error: `Failed to create pin: ${insertError.message}`,
      };
    }

    if (insertedPinData) {
      // The joined 'profiles' data should be reliably returned here due to the FK constraint
      // and the select query. The fallback used previously is no longer necessary.
      return {
        pin: await mapSupabasePin(
          insertedPinData as PinWithUploaderFromSupabase,
        ),
        error: null,
      };
    }
    return {
      pin: null,
      error: "Failed to create pin or retrieve created pin data.",
    };
  } catch (e: any) {
    console.error(
      "Unexpected error in createPin transaction:",
      (e as Error).message,
    );
    return {
      pin: null,
      error: `An unexpected error occurred: ${(e as Error).message}`,
    };
  }
}

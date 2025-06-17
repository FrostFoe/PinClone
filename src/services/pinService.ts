
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Pin, PinWithUploaderFromSupabase } from "@/types";
import type { TablesInsert } from "@/types/supabase";

// Helper to map Supabase pin data (with joined profile) to our Pin type
// Exporting for use in other services like searchService
export async function mapSupabasePin(
  supabasePin: PinWithUploaderFromSupabase,
): Promise<Pin> {
  // uploader_profile is the alias from the query
  const profileData = supabasePin.uploader_profile;

  // Due to the !inner join in queries and FK constraints, profileData should always exist.
  // If it were somehow null, it would indicate a data integrity issue or a query problem.
  if (!profileData) {
    console.error(
      `Profile data missing for pin ${supabasePin.id} during mapping. This implies an issue with data integrity or the query itself.`,
    );
    // Fallback, though ideally this state should not be reached.
    return {
      id: supabasePin.id,
      user_id: supabasePin.user_id,
      image_url: supabasePin.image_url,
      title: supabasePin.title,
      description: supabasePin.description,
      created_at: supabasePin.created_at,
      updated_at: supabasePin.updated_at,
      width: supabasePin.width,
      height: supabasePin.height,
      uploader: {
        username: "unknown_user",
        avatar_url: null,
        full_name: "Unknown User",
      },
    };
  }

  return {
    id: supabasePin.id,
    user_id: supabasePin.user_id,
    image_url: supabasePin.image_url,
    title: supabasePin.title,
    description: supabasePin.description,
    created_at: supabasePin.created_at,
    updated_at: supabasePin.updated_at,
    width: supabasePin.width, // Directly use, as it's NOT NULL from DB
    height: supabasePin.height, // Directly use, as it's NOT NULL from DB
    uploader: {
      username: profileData.username, // username is NOT NULL in profiles table
      avatar_url: profileData.avatar_url,
      full_name: profileData.full_name,
    },
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
        id,
        user_id,
        image_url,
        title,
        description,
        created_at,
        updated_at,
        width,
        height,
        uploader_profile:profiles!inner (
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
        id,
        user_id,
        image_url,
        title,
        description,
        created_at,
        updated_at,
        width,
        height,
        uploader_profile:profiles!inner (
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
      : { pin: null, error: "Pin data is null after fetch." };
  } catch (e: any) {
    console.error(
      "Unexpected error in fetchPinById:",
      (e as Error).message,
    );
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
        id,
        user_id,
        image_url,
        title,
        description,
        created_at,
        updated_at,
        width,
        height,
        uploader_profile:profiles!inner (
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
      console.error(
        `Error fetching pins for user ID ${userId}:`,
        error.message,
      );
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

export async function createPin(pinData: {
  image_url: string;
  title: string | null;
  description: string | null;
  width: number;
  height: number;
}): Promise<{ pin: Pin | null; error: string | null }> {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { pin: null, error: "User not authenticated." };
  }

  // Ensure width and height are provided, as they are NOT NULL in the DB
  if (typeof pinData.width !== "number" || typeof pinData.height !== "number") {
    return {
      pin: null,
      error: "Pin width and height are required and must be numbers.",
    };
  }

  const newPin: TablesInsert<"pins"> = {
    user_id: user.id,
    image_url: pinData.image_url,
    title: pinData.title,
    description: pinData.description,
    width: pinData.width,
    height: pinData.height,
    // created_at and updated_at will be set by default/trigger
  };

  try {
    const { data: insertedPinData, error: insertError } = await supabase
      .from("pins")
      .insert(newPin)
      .select(
        `
        id,
        user_id,
        image_url,
        title,
        description,
        created_at,
        updated_at,
        width,
        height,
        uploader_profile:profiles!inner (
          username,
          avatar_url,
          full_name
        )
      `,
      )
      .single();

    if (insertError) {
      console.error("Error creating pin:", insertError.message);
      return { pin: null, error: insertError.message };
    }
    if (!insertedPinData) {
      return { pin: null, error: "Failed to create pin or retrieve its data." };
    }

    return {
      pin: await mapSupabasePin(
        insertedPinData as PinWithUploaderFromSupabase,
      ),
      error: null,
    };
  } catch (e: any) {
    console.error("Unexpected error in createPin:", (e as Error).message);
    return { pin: null, error: "An unexpected error occurred." };
  }
}

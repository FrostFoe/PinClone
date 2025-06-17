
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Pin, PinWithUploaderFromSupabase } from "@/types";
import type { TablesInsert } from "@/types/supabase";

// Helper to map Supabase pin data (with joined profile) to our Pin type
export async function mapSupabasePin(
  supabasePin: PinWithUploaderFromSupabase,
): Promise<Pin> {
  // The !inner join in the query means uploader_profile should always exist.
  // Added a check for robustness.
  if (!supabasePin.uploader_profile) {
    console.error(
      `Critical data integrity issue: Uploader profile missing for pin ${supabasePin.id}. This suggests a problem with the database join or RLS. Pin data:`, supabasePin
    );
    // This situation should ideally not be reached with an inner join.
    // Throw an error or return a Pin with partial/default uploader info if this happens.
    // For now, throwing an error as it indicates a fundamental data issue.
    throw new Error(
      `Data integrity issue: Uploader profile missing for pin ID ${supabasePin.id}.`,
    );
  }

  const profileData = supabasePin.uploader_profile;

  return {
    id: supabasePin.id,
    user_id: supabasePin.user_id,
    image_url: supabasePin.image_url,
    title: supabasePin.title,
    description: supabasePin.description,
    created_at: supabasePin.created_at, // Already a string from Supabase
    updated_at: supabasePin.updated_at, // Already a string from Supabase
    width: supabasePin.width, // Schema ensures this is NOT NULL
    height: supabasePin.height, // Schema ensures this is NOT NULL
    uploader: {
      username: profileData.username, // Schema ensures this is NOT NULL
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
    const { data, error, status, statusText } = await supabase
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
      console.error("Error fetching all pins from Supabase:", { message: error.message, details: error.details, hint: error.hint, code: error.code, status, statusText });
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
    console.error("Unexpected error in fetchAllPins service:", { message: (e as Error).message, stack: (e as Error).stack });
    return { pins: [], error: "An unexpected server error occurred." };
  }
}

export async function fetchPinById(
  id: string,
): Promise<{ pin: Pin | null; error: string | null }> {
  const supabase = createSupabaseServerClient();
  if (!id) return { pin: null, error: "Pin ID is required." };
  try {
    const { data, error, status, statusText } = await supabase
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
        // PGRST116: "Searched for a single row, but found no rows"
        return { pin: null, error: "Pin not found." };
      }
      console.error(`Error fetching pin by ID ${id} from Supabase:`, { message: error.message, details: error.details, hint: error.hint, code: error.code, status, statusText });
      return { pin: null, error: error.message };
    }

    if (!data) {
      // This case should ideally not be reached if error is null and no PGRST116
      console.warn(`Pin data is null for ID ${id} after fetch, though no specific error was returned by Supabase. This might indicate an RLS issue silently blocking the data.`);
      return { pin: null, error: "Pin data is unexpectedly null after fetch." };
    }

    return {
      pin: await mapSupabasePin(data as PinWithUploaderFromSupabase),
      error: null,
    };
  } catch (e: any) {
    console.error(
      `Unexpected error caught in fetchPinById service for ID ${id}:`,
      { message: (e as Error).message, stack: (e as Error).stack },
    );
    return {
      pin: null,
      error: "An unexpected server error occurred while fetching the pin.",
    };
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
    const { data, error, status, statusText } = await supabase
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
        `Error fetching pins for user ID ${userId} from Supabase:`,
        { message: error.message, details: error.details, hint: error.hint, code: error.code, status, statusText },
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
      `Unexpected error in fetchPinsByUserId service for user ID ${userId}:`,
      { message: (e as Error).message, stack: (e as Error).stack },
    );
    return { pins: [], error: "An unexpected server error occurred." };
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

  if (typeof pinData.width !== "number" || typeof pinData.height !== "number" || pinData.width <= 0 || pinData.height <= 0) {
    return {
      pin: null,
      error: "Pin width and height are required and must be positive numbers.",
    };
  }

  const newPin: TablesInsert<"pins"> = {
    user_id: user.id,
    image_url: pinData.image_url,
    title: pinData.title,
    description: pinData.description,
    width: pinData.width,
    height: pinData.height,
    // created_at and updated_at will be set by DB defaults/triggers
  };

  try {
    const { data: insertedPinData, error: insertError, status, statusText } = await supabase
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
      console.error("Error creating pin in Supabase:", { message: insertError.message, details: insertError.details, hint: insertError.hint, code: insertError.code, status, statusText });
      return { pin: null, error: insertError.message };
    }
    if (!insertedPinData) {
      console.error("Failed to create pin or retrieve its data after insert; insertedPinData is null. This might be an RLS issue or unexpected DB behavior.");
      return { pin: null, error: "Failed to create pin or retrieve its data." };
    }

    return {
      pin: await mapSupabasePin(
        insertedPinData as PinWithUploaderFromSupabase,
      ),
      error: null,
    };
  } catch (e: any) {
    console.error("Unexpected error in createPin service:", { message: (e as Error).message, stack: (e as Error).stack });
    return { pin: null, error: "An unexpected server error occurred." };
  }
}

    

"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Pin, PinWithUploaderFromSupabase } from "@/types";
import type { TablesInsert } from "@/types/supabase";

// Helper to map Supabase pin data (with joined profile) to our Pin type
export async function mapSupabasePin(
  supabasePin: PinWithUploaderFromSupabase,
): Promise<Pin> {
  // The !inner join in the query means uploader_profile should ideally exist.
  // However, we add a check for robustness.
  if (!supabasePin.uploader_profile) {
    console.error(
      `Error in mapSupabasePin: uploader_profile is missing for pin ID ${supabasePin.id}. This might indicate an issue with RLS, the join, or unexpected data.`,
      supabasePin,
    );
    // Depending on desired behavior, you could throw an error or return a Pin with partial uploader info.
    // For now, let's proceed but log heavily. This state should ideally not be reached.
    // This will likely cause issues downstream if uploader info is critical.
    throw new Error(
      `Critical data integrity issue: Uploader profile missing for pin ${supabasePin.id}`,
    );
  }

  const profileData = supabasePin.uploader_profile;

  return {
    id: supabasePin.id,
    user_id: supabasePin.user_id,
    image_url: supabasePin.image_url,
    title: supabasePin.title,
    description: supabasePin.description,
    created_at: supabasePin.created_at,
    updated_at: supabasePin.updated_at,
    width: supabasePin.width, // NOT NULL in DB
    height: supabasePin.height, // NOT NULL in DB
    uploader: {
      username: profileData.username, // NOT NULL in DB
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
      console.error("Error fetching all pins from Supabase:", error.message, error);
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
    console.error("Unexpected error in fetchAllPins service:", (e as Error).message, e);
    return { pins: [], error: "An unexpected server error occurred." };
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
        // PGRST116: "Searched for a single row, but found no rows"
        return { pin: null, error: "Pin not found." };
      }
      console.error(`Error fetching pin by ID ${id} from Supabase:`, error.message, error);
      return { pin: null, error: error.message };
    }

    if (!data) {
      console.error(`Pin data is null for ID ${id} after fetch, though no specific error was returned by Supabase.`);
      return { pin: null, error: "Pin data is unexpectedly null after fetch." };
    }

    return {
      pin: await mapSupabasePin(data as PinWithUploaderFromSupabase),
      error: null,
    };
  } catch (e: any) {
    console.error(
      `Unexpected error caught in fetchPinById service for ID ${id}:`,
      (e as Error).message,
      e,
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
        `Error fetching pins for user ID ${userId} from Supabase:`,
        error.message,
        error,
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
      (e as Error).message,
      e,
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
      console.error("Error creating pin in Supabase:", insertError.message, insertError);
      return { pin: null, error: insertError.message };
    }
    if (!insertedPinData) {
      console.error("Failed to create pin or retrieve its data after insert; insertedPinData is null.");
      return { pin: null, error: "Failed to create pin or retrieve its data." };
    }

    return {
      pin: await mapSupabasePin(
        insertedPinData as PinWithUploaderFromSupabase,
      ),
      error: null,
    };
  } catch (e: any) {
    console.error("Unexpected error in createPin service:", (e as Error).message, e);
    return { pin: null, error: "An unexpected server error occurred." };
  }
}

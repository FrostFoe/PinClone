
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Pin, PinWithUploaderFromSupabase } from "@/types";
import type { TablesInsert } from "@/types/supabase";

// Helper to map Supabase pin data (with joined profile) to our Pin type
export async function mapSupabasePin(
  supabasePin: PinWithUploaderFromSupabase,
): Promise<Pin> {
  // The !inner join in the query means uploader_profile should always exist.
  const profileData = supabasePin.uploader_profile;

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
      username: profileData.username, // This is fine as profileData.username is string
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
      console.error("Error fetching all pins:", error.message, error);
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
    console.error("Unexpected error in fetchAllPins:", (e as Error).message, e);
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
        // PGRST116: "Searched for a single row, but found no rows"
        // This is an expected case if the pin doesn't exist, so less verbose logging.
        // console.log(`Pin not found for ID ${id}. PGRST116.`);
        return { pin: null, error: "Pin not found." };
      }
      // Log the full error object for other types of errors
      console.error(`Error fetching pin by ID ${id}:`, error.message, error);
      return { pin: null, error: error.message };
    }

    if (!data) {
      // This case should ideally be covered by PGRST116 or other errors from .single(),
      // but as a safeguard if Supabase behaves unexpectedly (e.g. RLS issue not raising specific error)
      console.error(`Pin data is null for ID ${id} after fetch, though no specific error was returned by Supabase.`);
      return { pin: null, error: "Pin data is unexpectedly null after fetch."};
    }

    return {
        pin: await mapSupabasePin(data as PinWithUploaderFromSupabase),
        error: null,
    };

  } catch (e: any) {
    console.error(
      "Unexpected error caught in fetchPinById for ID " + id + ":",
      (e as Error).message,
      e
    );
    return { pin: null, error: "An unexpected server error occurred while fetching the pin." };
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
        error.message, error
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
      "Unexpected error in fetchPinsByUserId for user ID " + userId + ":",
      (e as Error).message, e
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

  if (typeof pinData.width !== "number" || typeof pinData.height !== "number") {
    return {
      pin: null,
      error: "Pin width and height are required and must be numbers.",
    };
  }

  const newPin: TablesInsert<"pins"> = {
    user_id: user.id, // This should be the profile ID which is same as auth.user.id
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
      console.error("Error creating pin:", insertError.message, insertError);
      return { pin: null, error: insertError.message };
    }
    if (!insertedPinData) {
      console.error("Failed to create pin or retrieve its data after insert, insertedPinData is null.");
      return { pin: null, error: "Failed to create pin or retrieve its data." };
    }

    return {
      pin: await mapSupabasePin(
        insertedPinData as PinWithUploaderFromSupabase,
      ),
      error: null,
    };
  } catch (e: any) {
    console.error("Unexpected error in createPin:", (e as Error).message, e);
    return { pin: null, error: "An unexpected error occurred." };
  }
}

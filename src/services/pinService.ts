
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Pin, PinWithUploaderFromSupabase } from "@/types";
import type { TablesInsert } from "@/types/supabase";

// Helper to map Supabase pin data (with joined profile) to our Pin type
export async function mapSupabasePin(
  supabasePin: PinWithUploaderFromSupabase,
): Promise<Pin> {
  if (!supabasePin.uploader_profile) {
    const errorMessage = `Data integrity issue in mapSupabasePin: 'uploader_profile' is missing for pin ID ${supabasePin.id}. This strongly suggests an RLS issue on the 'profiles' table preventing the join, or the profile record itself does not exist or is inaccessible. Pin data received: ${JSON.stringify(supabasePin, null, 2)}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  if (!supabasePin.uploader_profile.username) {
     const errorMessage = `Data integrity issue in mapSupabasePin: 'uploader_profile.username' is missing for pin ID ${supabasePin.id}. The 'uploader_profile' object was present but incomplete. Profile data: ${JSON.stringify(supabasePin.uploader_profile, null, 2)}. Full pin data: ${JSON.stringify(supabasePin, null, 2)}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
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
    width: supabasePin.width,
    height: supabasePin.height,
    uploader: {
      username: profileData.username,
      avatar_url: profileData.avatar_url,
      full_name: profileData.full_name,
    },
  };
}

export async function fetchAllPins(
  page: number = 1,
  limit: number = 20,
): Promise<{ pins: Pin[]; error: string | null }> {
  console.log(`[pinService] fetchAllPins: Fetching page ${page}, limit ${limit}`);
  const supabase = createSupabaseServerClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    const { data, error, status, statusText, count } = await supabase
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
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[pinService] fetchAllPins: Error fetching pins from Supabase:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status,
        statusText,
        queryRange: `from ${from} to ${to}`,
        returnedCount: count,
      });
      return { pins: [], error: error.message };
    }

    if (!data) {
      console.warn("[pinService] fetchAllPins: No data returned from Supabase, though no error was thrown. This might indicate RLS issues or an empty table.");
      return { pins: [], error: null };
    }
    
    console.log(`[pinService] fetchAllPins: Successfully fetched ${data.length} raw pin objects.`);

    const pins = await Promise.all(
        data.map((p) => mapSupabasePin(p as PinWithUploaderFromSupabase))
      );
    console.log(`[pinService] fetchAllPins: Mapped ${pins.length} pins successfully.`);
    return { pins, error: null };
  } catch (e: any) {
    console.error("[pinService] fetchAllPins: Unexpected error in service:", {
      originalError: e,
      message: (e as Error).message,
      stack: (e as Error).stack,
    });
    return { pins: [], error: `An unexpected server error occurred: ${(e as Error).message}` };
  }
}

export async function fetchPinById(
  id: string,
): Promise<{ pin: Pin | null; error: string | null }> {
  console.log(`[pinService] fetchPinById: Fetching pin with ID: ${id}`);
  const supabase = createSupabaseServerClient();
  if (!id) {
    console.warn("[pinService] fetchPinById: Pin ID is required but was not provided.");
    return { pin: null, error: "Pin ID is required." };
  }
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
        console.warn(`[pinService] fetchPinById: Pin not found for ID ${id} (PGRST116).`);
        return { pin: null, error: "Pin not found." };
      }
      console.error(`[pinService] fetchPinById: Error fetching pin by ID ${id} from Supabase:`, {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status,
        statusText,
      });
      return { pin: null, error: error.message };
    }

    if (!data) {
      console.warn(
        `[pinService] fetchPinById: Pin data is null for ID ${id} after fetch, though no specific error was returned by Supabase. This might indicate an RLS issue silently blocking the data or the pin truly does not exist.`,
      );
      return { pin: null, error: "Pin data is unexpectedly null after fetch." };
    }
    
    console.log(`[pinService] fetchPinById: Successfully fetched raw data for pin ID ${id}.`);
    const mappedPin = await mapSupabasePin(data as PinWithUploaderFromSupabase);
    console.log(`[pinService] fetchPinById: Successfully mapped pin ID ${id}.`);
    return { pin: mappedPin, error: null };

  } catch (e: any) {
    console.error(
      `[pinService] fetchPinById: Unexpected error caught in service for ID ${id}:`,
      { originalError: e, message: (e as Error).message, stack: (e as Error).stack },
    );
    return {
      pin: null,
      error: `An unexpected server error occurred while fetching the pin: ${(e as Error).message}`,
    };
  }
}

export async function fetchPinsByUserId(
  userId: string,
  page: number = 1,
  limit: number = 20,
): Promise<{ pins: Pin[]; error: string | null }> {
  console.log(`[pinService] fetchPinsByUserId: Fetching pins for user ID ${userId}, page ${page}, limit ${limit}`);
  const supabase = createSupabaseServerClient();
  if (!userId) {
    console.warn("[pinService] fetchPinsByUserId: User ID is required but was not provided.");
    return { pins: [], error: "User ID is required." };
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    const { data, error, status, statusText, count } = await supabase
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
        { count: "exact" },
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error(
        `[pinService] fetchPinsByUserId: Error fetching pins for user ID ${userId} from Supabase:`,
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          status,
          statusText,
          queryRange: `from ${from} to ${to}`,
          returnedCount: count,
        },
      );
      return { pins: [], error: error.message };
    }

    if (!data) {
      console.warn(`[pinService] fetchPinsByUserId: No data returned for user ID ${userId}. This might be due to RLS or the user has no pins.`);
      return { pins: [], error: null };
    }
    console.log(`[pinService] fetchPinsByUserId: Successfully fetched ${data.length} raw pin objects for user ID ${userId}.`);

    const pins = await Promise.all(
        data.map((p) => mapSupabasePin(p as PinWithUploaderFromSupabase))
      );
    console.log(`[pinService] fetchPinsByUserId: Mapped ${pins.length} pins successfully for user ID ${userId}.`);
    return { pins, error: null };
  } catch (e: any) {
    console.error(
      `[pinService] fetchPinsByUserId: Unexpected error in service for user ID ${userId}:`,
      { originalError: e, message: (e as Error).message, stack: (e as Error).stack },
    );
    return { pins: [], error: `An unexpected server error occurred: ${(e as Error).message}` };
  }
}

export async function createPin(pinData: {
  image_url: string;
  title: string | null;
  description: string | null;
  width: number;
  height: number;
}): Promise<{ pin: Pin | null; error: string | null }> {
  console.log("[pinService] createPin: Attempting to create pin with data:", pinData);
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.warn("[pinService] createPin: User not authenticated.");
    return { pin: null, error: "User not authenticated." };
  }

  if (
    typeof pinData.width !== "number" ||
    typeof pinData.height !== "number" ||
    pinData.width <= 0 ||
    pinData.height <= 0
  ) {
    console.warn("[pinService] createPin: Invalid pin dimensions provided.", pinData);
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
  };

  try {
    const {
      data: insertedPinData,
      error: insertError,
      status,
      statusText,
    } = await supabase
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
      console.error("[pinService] createPin: Error creating pin in Supabase:", {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
        status,
        statusText,
        insertedDataAttempt: newPin,
      });
      return { pin: null, error: insertError.message };
    }
    if (!insertedPinData) {
      console.error(
        "[pinService] createPin: Failed to create pin or retrieve its data after insert; insertedPinData is null. This might be an RLS issue, a problem with the !inner join to profiles, or unexpected DB behavior. Ensure the user's profile exists and the 'handle_new_user' trigger functions correctly.",
      );
      return { pin: null, error: "Failed to create pin or retrieve its data." };
    }
    
    console.log("[pinService] createPin: Successfully created pin, raw data from Supabase:", JSON.stringify(insertedPinData, null, 2));

    const mappedPin = await mapSupabasePin(insertedPinData as PinWithUploaderFromSupabase);
    console.log(`[pinService] createPin: Successfully mapped created pin ID ${mappedPin.id}.`);
    return { pin: mappedPin, error: null };
  } catch (e: any) {
    console.error("[pinService] createPin: Unexpected error in service:", {
      originalError: e,
      message: (e as Error).message,
      stack: (e as Error).stack,
      pinDataAttempt: pinData,
    });
    return { pin: null, error: `An unexpected server error occurred: ${(e as Error).message}` };
  }
}

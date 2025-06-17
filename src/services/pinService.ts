"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server"; // Use server client for server actions
import type { Pin, PinWithUploader } from "@/types";
import type { TablesInsert } from "@/types/supabase";

// Helper to map Supabase pin data (with joined profile) to our Pin type
function mapSupabasePin(supabasePin: PinWithUploader): Pin {
  return {
    id: supabasePin.id,
    user_id: supabasePin.user_id || "",
    image_url: supabasePin.image_url,
    title: supabasePin.title,
    description: supabasePin.description,
    created_at: supabasePin.created_at,
    width: supabasePin.width || 300,
    height: supabasePin.height || 400,
    uploader: supabasePin.profiles
      ? {
          username: supabasePin.profiles.username || "unknown",
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
      return { pins: [], error: error.message };
    }

    const pins = data?.map(mapSupabasePin) || [];
    return { pins, error: null };
  } catch (e: any) {
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
      return { pin: null, error: error.message };
    }

    return { pin: data ? mapSupabasePin(data) : null, error: null };
  } catch (e: any) {
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
      return { pins: [], error: error.message };
    }

    const pins = data?.map(mapSupabasePin) || [];
    return { pins, error: null };
  } catch (e: any) {
    return { pins: [], error: "An unexpected error occurred." };
  }
}

export async function createPin(
  pinData: Omit<TablesInsert<"pins">, "id" | "created_at" | "user_id">,
): Promise<{ pin: Pin | null; error: string | null }> {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { pin: null, error: "User must be authenticated to create a pin." };
  }

  if (!pinData.image_url) {
    return { pin: null, error: "Image URL is required." };
  }
  if (!pinData.width || !pinData.height) {
    return {
      pin: null,
      error: "Image dimensions (width and height) are required.",
    };
  }

  const newPin: TablesInsert<"pins"> = {
    ...pinData,
    user_id: user.id,
  };

  try {
    const { data, error } = await supabase
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

    if (error) {
      return { pin: null, error: `Failed to create pin: ${error.message}` };
    }

    if (data) {
      const createdPin = data as PinWithUploader;
      if (!createdPin.profiles && user.id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("username, avatar_url, full_name")
          .eq("id", user.id)
          .single();
        if (profileData) {
          createdPin.profiles = profileData;
        }
      }
      return { pin: mapSupabasePin(createdPin), error: null };
    }
    return {
      pin: null,
      error: "Failed to create pin or retrieve created pin data.",
    };
  } catch (e: any) {
    return { pin: null, error: `An unexpected error occurred: ${e.message}` };
  }
}


"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Pin, Profile } from "@/types";
import { mapSupabasePin } from "./pinService"; // Assuming mapSupabasePin is exported from pinService
import type { PinWithUploaderFromSupabase } from "@/types";


export async function searchUsers(
  query: string,
): Promise<{ users: Profile[]; error: string | null }> {
  const supabase = createSupabaseServerClient();
  if (!query || query.trim().length === 0) {
    return { users: [], error: null };
  }
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*") // Selects all columns including created_at and updated_at
      .or(`username.ilike.%${query.trim()}%,full_name.ilike.%${query.trim()}%`)
      .limit(10);

    if (error) {
      console.error("Error searching users:", error.message);
      return { users: [], error: error.message };
    }
    return { users: data || [], error: null };
  } catch (e: any) {
    console.error(
      "Unexpected error in searchUsers:",
      (e as Error).message,
    );
    return { users: [], error: "An unexpected error occurred during user search." };
  }
}

export async function searchPins(
  query: string,
  page: number = 1,
  limit: number = 20,
): Promise<{ pins: Pin[]; error: string | null }> {
  const supabase = createSupabaseServerClient();
  if (!query || query.trim().length === 0) {
    return { pins: [], error: null };
  }

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
      .or(`title.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%`) // Search in title and description
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error searching pins:", error.message);
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
      "Unexpected error in searchPins:",
      (e as Error).message,
    );
    return {
      pins: [],
      error: "An unexpected error occurred during pin search.",
    };
  }
}

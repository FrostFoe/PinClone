"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Pin, Profile } from "@/types";
import { mapSupabasePin } from "./pinService";
import type { PinWithUploaderFromSupabase } from "@/types";

export async function searchUsers(
  query: string,
): Promise<{ users: Profile[]; error: string | null }> {
  const supabase = createSupabaseServerClient();
  if (!query || query.trim().length === 0) {
    return { users: [], error: null }; // Return empty if query is blank
  }
  try {
    const { data, error, status, statusText } = await supabase
      .from("profiles")
      .select("*")
      // Search in username (case-insensitive) OR full_name (case-insensitive)
      .or(`username.ilike.%${query.trim()}%,full_name.ilike.%${query.trim()}%`)
      .limit(10); // Limit results for performance

    if (error) {
      console.error("Error searching users:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status,
        statusText,
      });
      return { users: [], error: error.message };
    }
    return { users: data || [], error: null };
  } catch (e: any) {
    console.error("Unexpected error in searchUsers:", {
      message: (e as Error).message,
      stack: (e as Error).stack,
    });
    return {
      users: [],
      error: "An unexpected error occurred during user search.",
    };
  }
}

export async function searchPins(
  query: string,
  page: number = 1,
  limit: number = 20,
): Promise<{ pins: Pin[]; error: string | null }> {
  const supabase = createSupabaseServerClient();
  if (!query || query.trim().length === 0) {
    return { pins: [], error: null }; // Return empty if query is blank
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    // Using textSearch for potentially better relevance on title and description.
    // Requires GIN index on to_tsvector of these columns, which is in schema.sql.
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
      // Use textSearch for FTS if available and configured, or fallback to ILIKE
      // For simplicity here, sticking to ILIKE for broad matching.
      // For more advanced search, consider using `rpc` to call a custom search function.
      .or(`title.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%`)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error searching pins:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status,
        statusText,
      });
      return { pins: [], error: error.message };
    }

    const pins = data
      ? await Promise.all(
          data.map((p) => mapSupabasePin(p as PinWithUploaderFromSupabase)),
        )
      : [];
    return { pins, error: null };
  } catch (e: any) {
    console.error("Unexpected error in searchPins:", {
      message: (e as Error).message,
      stack: (e as Error).stack,
    });
    return {
      pins: [],
      error: "An unexpected error occurred during pin search.",
    };
  }
}

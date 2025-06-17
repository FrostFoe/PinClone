
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Pin, Profile } from "@/types";
import { mapSupabasePin } from "./pinService"; // Assuming mapSupabasePin is exported from pinService

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
      .select("*")
      .or(`username.ilike.%${query.trim()}%,full_name.ilike.%${query.trim()}%`)
      .limit(10);

    if (error) {
      return { users: [], error: error.message };
    }
    return { users: data || [], error: null };
  } catch (e: any) {
    return { users: [], error: "An unexpected error occurred during search." };
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
        *,
        profiles (
          username,
          avatar_url,
          full_name
        )
      `,
      )
      .or(`title.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%`)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return { pins: [], error: error.message };
    }

    const pins = data ? await Promise.all(data.map(mapSupabasePin)) : [];
    return { pins, error: null };
  } catch (e: any) {
    return {
      pins: [],
      error: "An unexpected error occurred during pin search.",
    };
  }
}

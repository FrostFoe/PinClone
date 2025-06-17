"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

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

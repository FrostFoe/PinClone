import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

// Singleton pattern for browser client
let supabaseBrowserClient:
  | ReturnType<typeof createBrowserClient<Database>>
  | undefined;

export function createSupabaseBrowserClient() {
  // Ensure this code runs only in the browser environment
  if (typeof window === "undefined") {
    // This case should ideally not be reached if used correctly (only in "use client" components)
    // but as a safeguard, throw an error or return a mock/null client.
    throw new Error(
      "createSupabaseBrowserClient should only be called on the client side.",
    );
  }

  if (!supabaseBrowserClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Supabase URL or Anon Key is missing from environment variables. " +
          "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.",
      );
    }
    supabaseBrowserClient = createBrowserClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
    );
  }
  return supabaseBrowserClient;
}

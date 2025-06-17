import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

// Singleton pattern for browser client
let supabaseBrowserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createSupabaseBrowserClient() {
  if (!supabaseBrowserClient) {
     if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error("Supabase URL or Anon Key is missing from environment variables.");
    }
    supabaseBrowserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return supabaseBrowserClient;
}

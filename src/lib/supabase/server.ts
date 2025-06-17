
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

// For Server Components, Server Actions, and Route Handlers
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const errorMessage =
      "CRITICAL: Supabase URL or Anon Key is MISSING from environment variables. " +
      "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file (and for your deployment). " +
      "You MUST restart your Next.js development server after adding/changing .env.local.";
    console.error(
      `\n\n${"=".repeat(60)}\n${errorMessage}\n${"=".repeat(60)}\n\n`,
    );
    throw new Error(
      "Supabase server configuration error: Environment variables missing. Check server logs.",
    );
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}

// Specifically for Route Handlers (e.g., API routes)
export function createSupabaseRouteHandlerClient() {
  const cookieStore = cookies();
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const errorMessage =
      "CRITICAL: Supabase URL or Anon Key is MISSING for Route Handler client. " +
      "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file (and for your deployment). " +
      "You MUST restart your Next.js development server after adding/changing .env.local.";
    console.error(
      `\n\n${"=".repeat(60)}\n${errorMessage}\n${"=".repeat(60)}\n\n`,
    );
    throw new Error(
      "Supabase Route Handler configuration error: Environment variables missing. Check server logs.",
    );
  }
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    },
  );
}

    
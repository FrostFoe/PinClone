
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "CRITICAL MIDDLEWARE ERROR: Supabase URL or Anon Key is missing from environment variables. " +
        "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file (and for your deployment). " +
        "You MUST restart your Next.js development server after adding/changing .env.local.",
    );
    return new NextResponse(
      "Server configuration error: Supabase environment variables are missing. Please check server logs.",
      { status: 500 },
    );
  }

  let supabase;
  try {
    supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    });
  } catch (e: any) {
    console.error(
      "CRITICAL MIDDLEWARE ERROR: Failed to create Supabase client in middleware.",
      e.message,
      e.stack,
    );
    return new NextResponse(
      "Server error: Could not initialize authentication service in middleware. Please check server logs.",
      { status: 500 },
    );
  }

  try {
    // Refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-session-with-middleware
    // This will also ensure the session is available for Server Components.
    await supabase.auth.getSession();
  } catch (e: any) {
    // Log the error as a warning, but don't stop the request.
    // Let the page-level components handle the absence of a session if this fails.
    console.warn(
      "Middleware Warning: Error during supabase.auth.getSession(). The request will proceed, but the session might not be immediately available server-side. This could be due to network issues or temporary Supabase unavailability.",
      "Error message:",
      (e as Error).message,
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

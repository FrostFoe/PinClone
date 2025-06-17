
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

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
      'CRITICAL MIDDLEWARE ERROR: Supabase URL or Anon Key is missing from environment variables. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file (and for your deployment). ' +
      'You MUST restart your Next.js development server after adding/changing .env.local.'
    );
    return new NextResponse(
      'Server configuration error: Supabase environment variables are missing. Please check server logs.',
      { status: 500 }
    );
  }

  let supabase;
  try {
    supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // If the cookie is set, update the request cookies and response cookies
            request.cookies.set({ name, value, ...options });
            response = NextResponse.next({ // Re-create response to apply new cookies
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            // If the cookie is removed, update the request cookies and response cookies
            request.cookies.set({ name, value: '', ...options });
            response = NextResponse.next({ // Re-create response to apply new cookies
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );
  } catch (e: any) {
    console.error('CRITICAL MIDDLEWARE ERROR: Failed to create Supabase client.', e.message, e.stack);
    return new NextResponse(
      'Server error: Could not initialize authentication service. Please check server logs.',
      { status: 500 }
    );
  }

  try {
    // Refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-session-with-middleware
    // This will also ensure the session is available for Server Components.
    await supabase.auth.getSession();
  } catch (e: any) {
     console.error('CRITICAL MIDDLEWARE ERROR: Error during supabase.auth.getSession().', e.message, e.stack);
    // It's generally better to let the request proceed and let pages handle auth state,
    // rather than returning a 500 here, unless getSession itself is critical for all paths.
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

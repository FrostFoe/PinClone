import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/"; // Default redirect to homepage

  if (code) {
    const supabase = createSupabaseRouteHandlerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Successfully exchanged code for session.
      // The middleware and onAuthStateChange on the client will handle session updates.
      // Redirect to the 'next' parameter or homepage.
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("OAuth callback error during code exchange:", error.message);
    // Redirect to login with an error message if code exchange fails
    return NextResponse.redirect(
      `${origin}/login?error=OAuth-Callback-Failed&message=${encodeURIComponent(error.message)}`,
    );
  }

  // Redirect to login with an error if no code is found (e.g., user denied OAuth)
  console.error("OAuth callback error: No code found in callback.");
  return NextResponse.redirect(
    `${origin}/login?error=OAuth-Callback-Failed&message=No-auth-code-provided`,
  );
}

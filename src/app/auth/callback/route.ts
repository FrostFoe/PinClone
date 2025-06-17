import { NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createSupabaseRouteHandlerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if profile exists, this is usually handled by onAuthStateChange or a trigger
      // For OAuth, Supabase trigger handle_new_user should create the profile.
      // If additional profile setup from OAuth is needed beyond what the trigger does,
      // it could be handled here or client-side after redirect.
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('OAuth callback error:', error.message);
    // Redirect to an error page or login page with error message
    return NextResponse.redirect(`${origin}/login?error=OAuth-Callback-Failed&message=${encodeURIComponent(error.message)}`);
  }

  // return the user to an error page with instructions
  console.error('OAuth callback error: No code found in callback.');
  return NextResponse.redirect(`${origin}/login?error=OAuth-Callback-Failed&message=No-code-found`);
}

"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Provider } from "@supabase/supabase-js";

export async function signInWithOAuthBrowser(
  provider: Provider,
  redirectToNext?: string,
) {
  const supabase = createSupabaseBrowserClient();
  const origin = window.location.origin;

  let redirectTo = `${origin}/auth/callback`;
  if (redirectToNext) {
    // Append the 'next' parameter to the Supabase redirectTo URL
    // This 'next' parameter will be preserved by Supabase and passed back to our /auth/callback route
    const callbackUrl = new URL(redirectTo);
    callbackUrl.searchParams.set("next", redirectToNext);
    redirectTo = callbackUrl.toString();
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectTo,
      // You can add scopes if needed, e.g., for GitHub:
      // scopes: 'read:user user:email',
    },
  });

  if (error) {
    console.error("OAuth sign-in error:", error);
    return {
      data: null,
      error: { message: error.message, code: error.code?.toString() },
    };
  }
  // signInWithOAuth redirects, so a successful response usually means the redirect is imminent.
  return { data, error: null };
}

export async function signOutClient() {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Sign out error:", error);
    return { error: { message: error.message, code: error.code?.toString() } };
  }
  return { error: null };
}

'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Provider } from '@supabase/supabase-js';

export async function signInWithOAuthBrowser(provider: Provider) {
  const supabase = createSupabaseBrowserClient();
  const origin = window.location.origin; // Safe to use window here due to 'use client'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } };
  }
  // signInWithOAuth redirects, so a successful response here means the redirect is happening.
  // The actual session is established in the /auth/callback route.
  return { data, error: null };
}

export async function signOutClient() {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: { message: error.message, code: error.code } };
  }
  return { error: null };
}

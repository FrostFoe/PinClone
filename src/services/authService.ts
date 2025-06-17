'use server';

import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import type { Provider } from '@supabase/supabase-js';
// Removed createSupabaseBrowserClient as it's for client-side
// Removed signInWithOAuthBrowser and signOutClient from this file

export async function signUpWithEmail(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;

  const supabase = createSupabaseRouteHandlerClient();
  const callbackUrl = `${headers().get('origin')}/auth/callback`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl,
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { user: null, session: null, error: { message: error.message, code: error.code } };
  }
  // Handle cases where user might exist but isn't confirmed, or auto-confirmation is off
  if (data.user && !data.session) {
     // This typically means email confirmation is required
    return { user: data.user, session: null, error: null };
  }
  return { user: data.user, session: data.session, error: null };
}

export async function signInWithPassword(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const supabase = createSupabaseRouteHandlerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { session: null, error: { message: error.message, code: error.code } };
  }
  return { session: data.session, error: null };
}

// signInWithOAuthBrowser and signOutClient have been moved to src/lib/auth/client.ts

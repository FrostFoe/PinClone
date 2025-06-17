'use server';

import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'; // For server-side actions like callback
import { createSupabaseBrowserClient } from '@/lib/supabase/client'; // For client-side actions
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Provider } from '@supabase/supabase-js';

export async function signUpWithEmail(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string; // Ensure your form sends this

  // For client-side calls, you'd use createSupabaseBrowserClient.
  // This example assumes it might be called from a server action context if needed,
  // but typically signup form submission is client-side.
  // For a pure client-side form, this logic would be in the component.
  // Let's adjust to reflect typical client-side form handling expectations.
  // This function, if called from client, would need to be adapted or
  // the client would call Supabase directly.
  // For this structure, we'll assume it's a server action for form processing.

  const supabase = createSupabaseRouteHandlerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${new URL(headers().get('origin')!, process.env.NODE_ENV === 'production' ? 'https' : 'http').toString()}/auth/callback`,
      data: {
        full_name: fullName,
        // The trigger 'handle_new_user' will attempt to use this.
        // avatar_url could also be passed if collected at signup, though unusual for email/pass.
      },
    },
  });

  if (error) {
    return { user: null, error: { message: error.message, code: error.code } };
  }
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { user: null, error: { message: 'User with this email already exists, but might not be confirmed.', code: 'user_already_exists_unconfirmed' } };
  }
  // Note: Supabase signUp now returns user & session if email confirmation is disabled or auto-confirmed.
  // If email confirmation is required, data.user will exist but data.session will be null.
  return { user: data.user, session: data.session, error: null };
}

export async function signInWithPassword(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const supabase = createSupabaseRouteHandlerClient(); // Or browser client if called client-side

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { session: null, error: { message: error.message, code: error.code } };
  }
  return { session: data.session, error: null };
}

// This function is designed to be called client-side
export async function signInWithOAuthBrowser(provider: Provider) {
  const supabase = createSupabaseBrowserClient();
  const origin = window.location.origin;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: { message: error.message, code: error.code } };
  }
  // signInWithOAuth redirects, so a successful response here means the redirect is happening.
  // The actual session is established in the /auth/callback route.
  // We might not even reach this return if redirect is immediate.
  return { url: data.url, error: null };
}

// This function is designed to be called client-side for logout
export async function signOutClient() {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: { message: error.message, code: error.code } };
  }
  return { error: null };
}

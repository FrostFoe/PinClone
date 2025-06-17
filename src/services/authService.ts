"use server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import type { Provider } from "@supabase/supabase-js";

export async function signUpWithEmail(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string; // Ensure this is passed from the form

  const supabase = createSupabaseRouteHandlerClient();

  // Get origin for the email redirect link
  const origin = headers().get("origin");
  const callbackUrl = `${origin}/auth/callback`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl,
      data: {
        full_name: fullName, // This will be available in `raw_user_meta_data` for the trigger
        // You can add other metadata here if needed by your `handle_new_user` trigger
      },
    },
  });

  if (error) {
    return {
      user: null,
      session: null,
      error: { message: error.message, code: error.code?.toString() },
    };
  }
  // If data.user is present but data.session is null, it means email confirmation is pending.
  // If both are present, user is signed up and logged in (e.g., if auto-confirm is on).
  return { user: data.user, session: data.session, error: null };
}

export async function signInWithPassword(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = createSupabaseRouteHandlerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      session: null,
      error: { message: error.message, code: error.code?.toString() },
    };
  }
  return { session: data.session, error: null };
}

// signInWithOAuthBrowser and signOutClient are in @/lib/auth/client.ts because they use browser APIs

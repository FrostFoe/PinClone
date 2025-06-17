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
  if (!origin) {
    return {
      user: null,
      session: null,
      error: { message: "Could not determine request origin.", code: "500" },
    };
  }
  const callbackUrl = `${origin}/auth/callback`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl,
      data: {
        // This data is passed to the `handle_new_user` trigger in SQL
        full_name: fullName,
        // The trigger will attempt to get avatar_url from raw_user_meta_data if set by OAuth later
      },
    },
  });

  if (error) {
    console.error("signUpWithEmail error:", error.message);
    return {
      user: null,
      session: null,
      error: { message: error.message, code: error.code?.toString() },
    };
  }
  // If data.user is present but data.session is null, it means email confirmation is pending.
  // The handle_new_user trigger should have created the profile.
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
    console.error("signInWithPassword error:", error.message);
    return {
      session: null,
      error: { message: error.message, code: error.code?.toString() },
    };
  }
  return { session: data.session, error: null };
}

// Note: signInWithOAuthBrowser and signOutClient are in @/lib/auth/client.ts
// because they use browser-specific APIs (window.location).

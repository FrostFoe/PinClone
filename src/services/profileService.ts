
'use server'; // Or remove if only used client-side

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import type { TablesUpdate } from '@/types/supabase';

const supabase = createSupabaseBrowserClient(); // For client-side usage

export async function fetchProfileByUsername(username: string): Promise<{ profile: Profile | null, error: string | null }> {
  if (!username) return { profile: null, error: 'Username is required.' };
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', username) // Case-insensitive match
      .single();

    if (error) {
      console.error('Error fetching profile by username:', error);
      return { profile: null, error: error.message };
    }
    return { profile: data, error: null };
  } catch (e) {
    console.error('Unexpected error fetching profile by username:', e);
    return { profile: null, error: 'An unexpected error occurred.' };
  }
}

export async function fetchProfileById(userId: string): Promise<{ profile: Profile | null, error: string | null }> {
  if (!userId) return { profile: null, error: 'User ID is required.' };
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile by ID:', error);
      return { profile: null, error: error.message };
    }
    return { profile: data, error: null };
  } catch (e) {
    console.error('Unexpected error fetching profile by ID:', e);
    return { profile: null, error: 'An unexpected error occurred.' };
  }
}

export async function updateProfile(userId: string, updates: TablesUpdate<'profiles'>): Promise<{ profile: Profile | null, error: string | null }> {
  if (!userId) return { profile: null, error: 'User ID is required for update.' };
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return { profile: null, error: error.message };
    }
    return { profile: data, error: null };
  } catch (e) {
    console.error('Unexpected error updating profile:', e);
    return { profile: null, error: 'An unexpected error occurred.' };
  }
}

export async function checkUsernameAvailability(username: string): Promise<{ available: boolean, error: string | null }> {
  if (!username || username.trim().length < 3) {
    return { available: false, error: 'Username must be at least 3 characters.' };
  }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .ilike('username', username)
      .maybeSingle(); // Use maybeSingle to not error if no user found

    if (error) {
      console.error('Error checking username:', error);
      return { available: false, error: error.message };
    }
    return { available: !data, error: null }; // Available if no profile with that username is found
  } catch (e) {
    console.error('Unexpected error checking username:', e);
    return { available: false, error: 'An unexpected error occurred while checking username.' };
  }
}

// Note on profile creation on signup:
// This is typically handled via a Supabase Database Function that triggers
// on new user creation in `auth.users` table.
// See the `handle_new_user` function in the README.md SQL schema section.
// Client-side profile creation after signup is also possible but less robust.

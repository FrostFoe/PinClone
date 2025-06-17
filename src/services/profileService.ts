
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server'; // Use server client for server actions
import type { Profile } from '@/types';
import type { TablesUpdate } from '@/types/supabase';

export async function fetchProfileByUsername(username: string): Promise<{ profile: Profile | null, error: string | null }> {
  const supabase = createSupabaseServerClient();
  if (!username) return { profile: null, error: 'Username is required.' };
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { profile: null, error: 'Profile not found.' };
      return { profile: null, error: error.message };
    }
    return { profile: data, error: null };
  } catch (e: any) {
    return { profile: null, error: 'An unexpected error occurred.' };
  }
}

export async function fetchProfileById(userId: string): Promise<{ profile: Profile | null, error: string | null }> {
  const supabase = createSupabaseServerClient();
  if (!userId) return { profile: null, error: 'User ID is required.' };
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { profile: null, error: 'Profile not found for this user ID.' };
      return { profile: null, error: error.message };
    }
    return { profile: data, error: null };
  } catch (e: any) {
    return { profile: null, error: 'An unexpected error occurred.' };
  }
}

export async function updateProfile(userId: string, updates: TablesUpdate<'profiles'>): Promise<{ profile: Profile | null, error: string | null }> {
  const supabase = createSupabaseServerClient();
  if (!userId) return { profile: null, error: 'User ID is required for update.' };
  
  if (updates.username !== undefined && (updates.username === null || updates.username.trim() === '')) {
    return { profile: null, error: 'Username cannot be empty.'};
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      if (error.message.includes('profiles_username_key')) { 
        return { profile: null, error: 'This username is already taken.' };
      }
      return { profile: null, error: error.message };
    }
    return { profile: data, error: null };
  } catch (e: any) {
    return { profile: null, error: 'An unexpected error occurred.' };
  }
}

export async function checkUsernameAvailability(username: string): Promise<{ available: boolean, error: string | null }> {
  const supabase = createSupabaseServerClient();
  if (!username || username.trim().length < 3) {
    return { available: false, error: 'Username must be at least 3 characters.' };
  }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .ilike('username', username.trim()) 
      .maybeSingle(); 

    if (error) {
      return { available: false, error: error.message };
    }
    return { available: !data, error: null }; 
  } catch (e: any) {
    return { available: false, error: 'An unexpected error occurred while checking username.' };
  }
}

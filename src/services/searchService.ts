
'use server'; // Or remove if client-side only

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

const supabase = createSupabaseBrowserClient();

export async function searchUsers(query: string): Promise<{ users: Profile[], error: string | null }> {
  if (!query || query.trim().length === 0) {
    return { users: [], error: null }; // Return empty if query is empty
  }
  try {
    // Search by username OR full_name
    // Using .or() for Supabase query
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(10); // Add a limit for search results

    if (error) {
      console.error('Error searching users:', error);
      return { users: [], error: error.message };
    }
    return { users: data || [], error: null };
  } catch (e) {
    console.error('Unexpected error searching users:', e);
    return { users: [], error: 'An unexpected error occurred during search.' };
  }
}

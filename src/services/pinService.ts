
'use server'; // Or remove if only used client-side with client Supabase instance

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Pin, PinWithUploader } from '@/types';

// For client-side fetching
const supabase = createSupabaseBrowserClient();

export async function fetchAllPins(page: number = 1, limit: number = 20): Promise<{ pins: Pin[], error: string | null }> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    const { data, error } = await supabase
      .from('pins')
      .select(`
        *,
        profiles (
          username,
          avatar_url,
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching pins:', error);
      return { pins: [], error: error.message };
    }
    
    const pins = data?.map(mapSupabasePin) || [];
    return { pins, error: null };

  } catch (e) {
    console.error('Unexpected error fetching pins:', e);
    return { pins: [], error: 'An unexpected error occurred.' };
  }
}

export async function fetchPinById(id: string): Promise<{ pin: Pin | null, error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('pins')
      .select(`
        *,
        profiles (
          username,
          avatar_url,
          full_name
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching pin by ID:', error);
      return { pin: null, error: error.message };
    }
    
    return { pin: data ? mapSupabasePin(data) : null, error: null };

  } catch (e) {
    console.error('Unexpected error fetching pin by ID:', e);
    return { pin: null, error: 'An unexpected error occurred.' };
  }
}

export async function fetchPinsByUserId(userId: string, page: number = 1, limit: number = 20): Promise<{ pins: Pin[], error: string | null }> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  try {
    const { data, error } = await supabase
      .from('pins')
      .select(`
        *,
        profiles (
          username,
          avatar_url,
          full_name
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);
      
    if (error) {
      console.error('Error fetching pins by user ID:', error);
      return { pins: [], error: error.message };
    }

    const pins = data?.map(mapSupabasePin) || [];
    return { pins, error: null };

  } catch (e) {
    console.error('Unexpected error fetching pins by user ID:', e);
    return { pins: [], error: 'An unexpected error occurred.' };
  }
}


// Helper to map Supabase pin data (with joined profile) to our Pin type
function mapSupabasePin(supabasePin: PinWithUploader): Pin {
  return {
    id: supabasePin.id,
    user_id: supabasePin.user_id || '', // Should always exist
    image_url: supabasePin.image_url,
    title: supabasePin.title,
    description: supabasePin.description,
    created_at: supabasePin.created_at,
    width: supabasePin.width || 300, // Default width if not in DB
    height: supabasePin.height || 400, // Default height if not in DB
    uploader: supabasePin.profiles ? {
      username: supabasePin.profiles.username || 'unknown',
      avatar_url: supabasePin.profiles.avatar_url || `https://placehold.co/40x40.png?text=U`,
      full_name: supabasePin.profiles.full_name || 'Unknown User',
    } : {
      username: 'unknown',
      avatar_url: `https://placehold.co/40x40.png?text=U`,
      full_name: 'Unknown User',
    },
    // likes: supabasePin.likes_count || 0, // If you add a likes feature
  };
}

/*
* Bonus: Infinite Scroll
* To implement infinite scroll, you'd typically:
* 1. In your page component (e.g., HomePage), maintain a `page` state.
* 2. Use an IntersectionObserver to detect when the user scrolls near the bottom of the list.
* 3. When detected, increment the `page` state and call `fetchAllPins(newPage, PINS_PER_PAGE)`.
* 4. Append the newly fetched pins to your existing `pins` state array.
* 5. Keep track of `hasMore` state by checking if the fetchPins function returns fewer pins than `PINS_PER_PAGE`.
*
* Example hook (simplified):
*
* import { useState, useEffect, useCallback, useRef } from 'react';
*
* function useInfiniteScroll(fetchFunction, initialPage = 1, limit = 20) {
*   const [items, setItems] = useState([]);
*   const [page, setPage] = useState(initialPage);
*   const [hasMore, setHasMore] = useState(true);
*   const [loading, setLoading] = useState(false);
*   const loaderRef = useRef(null);
*
*   const loadMore = useCallback(async () => {
*     if (loading || !hasMore) return;
*     setLoading(true);
*     const { data: newItems, error } = await fetchFunction(page, limit); // Adjust based on your service
*     if (error) { /* handle error * / }
*     setItems(prev => [...prev, ...newItems]);
*     setPage(prev => prev + 1);
*     setHasMore(newItems.length === limit);
*     setLoading(false);
*   }, [loading, hasMore, page, fetchFunction, limit]);
*
*   useEffect(() => {
*     const observer = new IntersectionObserver(
*       entries => {
*         if (entries[0].isIntersecting) loadMore();
*       },
*       { threshold: 1.0 }
*     );
*     if (loaderRef.current) observer.observe(loaderRef.current);
*     return () => {
*       if (loaderRef.current) observer.unobserve(loaderRef.current);
*     };
*   }, [loadMore]);
*
*   return { items, loading, hasMore, loaderRef, loadMore };
* }
*/

/*
* Bonus: Optimistic Updates
* For actions like creating a pin, liking, or updating a profile:
* 1. When the user performs an action (e.g., clicks "Save" on profile edit):
*    a. Immediately update the local UI state with the new (optimistic) data.
*       For example, if editing profile name, update the displayed name instantly.
*    b. Make the actual API call to Supabase in the background.
* 2. If the Supabase call is successful:
*    a. The UI is already correct. You might want to re-fetch or ensure consistency if needed, but often not necessary for simple updates.
* 3. If the Supabase call fails:
*    a. Revert the UI state back to what it was before the optimistic update.
*    b. Show an error message (e.g., using a toast).
*
* This makes the app feel much faster and more responsive.
* Libraries like React Query or SWR have built-in support for optimistic updates.
*
* Example for profile update (conceptual):
*
* const [profile, setProfile] = useState(initialProfile);
* const { toast } = useToast();
*
* const handleSaveProfile = async (newProfileData) => {
*   const oldProfile = { ...profile };
*   setProfile(prev => ({ ...prev, ...newProfileData })); // Optimistic update
*
*   const { error } = await updateProfile(userId, newProfileData); // Call Supabase service
*
*   if (error) {
*     setProfile(oldProfile); // Revert on error
*     toast({ variant: "destructive", title: "Failed to update profile", description: error.message });
*   } else {
*     toast({ title: "Profile updated!" });
*   }
* };
*/

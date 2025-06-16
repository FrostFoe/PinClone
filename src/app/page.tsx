
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/app-header';
import PinGrid from '@/components/pin-grid';
import type { Pin } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchAllPins } from '@/services/pinService'; // Import Supabase service
import { useToast } from '@/hooks/use-toast';

const PINS_PER_PAGE = 20;

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [pins, setPins] = useState<Pin[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start true for initial load
  const [page, setPage] = useState(1); // Supabase pagination is 1-indexed for user understanding
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const loadMorePins = useCallback(async () => {
    if (isLoading && pins.length > 0) return; // Don't load more if already loading more
    if (!hasMore) return;

    setIsLoading(true);
    const { pins: newPins, error } = await fetchAllPins(page, PINS_PER_PAGE);
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error fetching pins',
        description: error,
      });
      setHasMore(false); // Stop trying if there's an error
    } else {
      if (newPins.length > 0) {
        setPins((prevPins) => page === 1 ? newPins : [...prevPins, ...newPins]);
        setPage((prevPage) => prevPage + 1);
        if (newPins.length < PINS_PER_PAGE) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    }
    setIsLoading(false);
  }, [page, isLoading, hasMore, toast, pins.length]);

  useEffect(() => {
    // Initial load
    loadMorePins();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMorePins();
        }
      },
      { threshold: 0.8 } 
    );

    const currentLoaderRef = loaderRef.current;
    if (currentLoaderRef && hasMore) { // Only observe if there's more to load
      observer.observe(currentLoaderRef);
    }

    return () => {
      if (currentLoaderRef) {
        observer.unobserve(currentLoaderRef);
      }
    };
  }, [loadMorePins, hasMore, isLoading]);

  const handlePinClick = (pin: Pin) => {
    router.push(`/pin/${pin.id}`);
  };

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      <AppHeader />
      <main className="flex-grow container mx-auto px-2 sm:px-4 py-6 sm:py-8">
        {pins.length > 0 ? (
          <PinGrid pins={pins} onPinClick={handlePinClick} showPinDetailsOverlay={true} />
        ) : isLoading && pins.length === 0 ? ( // Skeleton for initial load
          <div className="masonry-grid px-grid-gap md:px-0 mt-grid-gap">
            {[...Array(10)].map((_, i) => (
              <div key={`skeleton-home-${i}`} className="break-inside-avoid mb-grid-gap">
                <Skeleton className={`w-full h-[${250 + Math.floor(Math.random() * 250)}px] rounded-2xl bg-muted/80`} />
              </div>
            ))}
          </div>
        ) : !isLoading && pins.length === 0 && !hasMore ? (
           <div className="text-center py-16">
             <h2 className="text-2xl font-semibold text-muted-foreground">No pins yet!</h2>
             <p className="text-muted-foreground">Start exploring or create your first pin.</p>
           </div>
        ) : null}
        
        {isLoading && pins.length > 0 && ( // Spinner for loading more
          <div className="h-20 w-full flex justify-center items-center" aria-hidden="true">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        <div ref={loaderRef} className="h-1 w-full" aria-hidden="true"></div>
        {!hasMore && pins.length > 0 && (
          <p className="text-center text-muted-foreground font-medium py-10 text-lg">✨ You've explored all the pins! ✨</p>
        )}
      </main>
    </div>
  );
}

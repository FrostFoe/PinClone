
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PinGrid from '@/components/pin-grid';
import type { Pin } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchAllPins } from '@/services/pinService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

const PINS_PER_PAGE = 20;

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [pins, setPins] = useState<Pin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const loadPins = useCallback(async (currentPage: number, initialLoad = false) => {
    if (isFetchingMore && !initialLoad) return;
    if (!hasMore && !initialLoad) return;

    if (initialLoad) setIsLoading(true);
    else setIsFetchingMore(true);

    const { pins: newPins, error } = await fetchAllPins(currentPage, PINS_PER_PAGE);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error fetching pins',
        description: error,
      });
      setHasMore(false);
    } else {
      if (newPins.length > 0) {
        setPins((prevPins) => currentPage === 1 ? newPins : [...prevPins, ...newPins]);
        setPage(currentPage + 1);
        if (newPins.length < PINS_PER_PAGE) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    }
    if (initialLoad) setIsLoading(false);
    else setIsFetchingMore(false);
  }, [isFetchingMore, hasMore, toast]);

  useEffect(() => {
    loadPins(1, true); // Initial load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingMore && !isLoading) {
          loadPins(page);
        }
      },
      { threshold: 0.8 }
    );

    const currentLoaderRef = loaderRef.current;
    if (currentLoaderRef && hasMore) {
      observer.observe(currentLoaderRef);
    }

    return () => {
      if (currentLoaderRef) {
        observer.unobserve(currentLoaderRef);
      }
    };
  }, [loadPins, hasMore, isFetchingMore, isLoading, page]);

  const handlePinClick = (pin: Pin) => {
    router.push(`/pin/${pin.id}`);
  };

  if (isLoading && pins.length === 0) {
    return (
      <main className="flex-grow container mx-auto px-2 sm:px-4 py-6 sm:py-8 animate-fade-in">
        <div className="masonry-grid px-grid-gap md:px-0 mt-grid-gap">
          {[...Array(10)].map((_, i) => (
            <div key={`skeleton-home-${i}`} className="break-inside-avoid mb-grid-gap">
              <Skeleton className={`w-full h-[${250 + Math.floor(Math.random() * 250)}px] rounded-2xl bg-muted/80`} />
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (!isLoading && pins.length === 0 && !hasMore) {
    return (
       <main className="flex-grow container mx-auto px-2 sm:px-4 py-6 sm:py-8 flex flex-col items-center justify-center text-center min-h-[calc(100vh-var(--header-height)-100px)]">
         <Search className="h-24 w-24 text-muted-foreground/30 mb-6" />
         <h2 className="text-2xl font-semibold text-muted-foreground">No pins found.</h2>
         <p className="text-muted-foreground mb-6">It's a bit empty here. Why not create the first pin?</p>
         <Button onClick={() => router.push('/create')} size="lg" className="rounded-full">Create Pin</Button>
       </main>
    );
  }

  return (
    <main className="flex-grow container mx-auto px-2 sm:px-4 py-6 sm:py-8 animate-fade-in-up">
      {pins.length > 0 && (
        <PinGrid pins={pins} onPinClick={handlePinClick} showPinDetailsOverlay={true} />
      )}
      
      {isFetchingMore && (
        <div className="h-20 w-full flex justify-center items-center" aria-hidden="true">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      <div ref={loaderRef} className="h-1 w-full" aria-hidden="true"></div>
      {!hasMore && pins.length > 0 && (
        <p className="text-center text-muted-foreground font-medium py-10 text-lg">✨ You've explored all the pins! ✨</p>
      )}
    </main>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import AppHeader from '@/components/app-header';
import PinGrid from '@/components/pin-grid';
import ImageZoomModal from '@/components/image-zoom-modal';
import type { Pin } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

const PINS_PER_PAGE = 20;

// Helper to generate diverse placeholder dimensions and hints
const generateRandomPin = (id: number): Pin => {
  const widths = [250, 300, 350, 400];
  const heightRatios = [1.2, 1.5, 1.8, 2.0, 0.8, 0.6];
  const hints = [
    'landscape nature', 'abstract art', 'city skyline', 'food photography', 
    'minimalist design', 'fashion style', 'travel destination', 'animal wildlife',
    'interior decor', 'vintage illustration' 
  ];

  const randomWidth = widths[Math.floor(Math.random() * widths.length)];
  const randomHeight = Math.round(randomWidth * heightRatios[Math.floor(Math.random() * heightRatios.length)]);
  const randomHint = hints[Math.floor(Math.random() * hints.length)];
  
  return {
    id: `pin-${id}`,
    alt: `Pin image ${id} - ${randomHint}`,
    width: randomWidth,
    height: randomHeight,
    placeholderId: `ph-${id}`,
    aiHint: randomHint,
  };
};


const fetchPins = async (page: number): Promise<Pin[]> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const newPins: Pin[] = [];
      for (let i = 0; i < PINS_PER_PAGE; i++) {
        newPins.push(generateRandomPin(page * PINS_PER_PAGE + i));
      }
      resolve(newPins);
    }, 500); // Simulate network delay
  });
};

export default function HomePage() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const loadMorePins = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    const newPins = await fetchPins(page);
    if (newPins.length > 0) {
      setPins((prevPins) => [...prevPins, ...newPins]);
      setPage((prevPage) => prevPage + 1);
    } else {
      setHasMore(false);
    }
    setIsLoading(false);
  }, [page, isLoading, hasMore]);

  useEffect(() => {
    loadMorePins(); // Initial load
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- only on mount

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMorePins();
        }
      },
      { threshold: 1.0 } // Trigger when 100% of the loader is visible
    );

    const currentLoaderRef = loaderRef.current;
    if (currentLoaderRef) {
      observer.observe(currentLoaderRef);
    }

    return () => {
      if (currentLoaderRef) {
        observer.unobserve(currentLoaderRef);
      }
    };
  }, [loadMorePins]);

  const handlePinClick = (pin: Pin) => {
    setSelectedPin(pin);
  };

  const handleCloseModal = () => {
    setSelectedPin(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto py-6 sm:py-8">
        <PinGrid pins={pins} onPinClick={handlePinClick} />
        {isLoading && (
          <div className="masonry-grid px-grid-gap md:px-0 mt-grid-gap">
            {[...Array(5)].map((_, i) => (
              <div key={`skeleton-${i}`} className="break-inside-avoid mb-grid-gap">
                <Skeleton className={`w-full h-[${200 + Math.random() * 200}px] rounded-2xl`} />
              </div>
            ))}
          </div>
        )}
        <div ref={loaderRef} className="h-10 w-full" aria-hidden="true" />
        {!hasMore && pins.length > 0 && (
          <p className="text-center text-muted-foreground py-8">You've reached the end!</p>
        )}
      </main>
      <ImageZoomModal pin={selectedPin} isOpen={!!selectedPin} onClose={handleCloseModal} />
    </div>
  );
}

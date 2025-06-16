
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/app-header';
import PinGrid from '@/components/pin-grid';
import type { Pin } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

const PINS_PER_PAGE = 20;

const generateRandomPin = (id: number): Pin => {
  const widths = [250, 300, 350, 400, 450, 500, 550, 600];
  const heightRatios = [1.2, 1.5, 1.8, 2.0, 0.8, 0.6, 1.0, 1.3, 0.9, 1.1];
  const hints = [
    'landscape nature', 'abstract art', 'city skyline', 'food photography', 
    'minimalist design', 'fashion style', 'travel destination', 'animal wildlife',
    'interior decor', 'vintage illustration', 'portrait photography', 'street art',
    'botanical print', 'geometric pattern', 'watercolor painting', 'macro photography'
  ];
  const titles = [
    "Breathtaking Horizon", "Chromatic Dreams", "Urban Pulse", "Culinary Delight", 
    "Serene Simplicity", "Chic Ensemble", "Journey Awaits", "Wild Majesty",
    "Sanctuary Spaces", "Timeless Strokes", "Soulful Gaze", "Concrete Canvas",
    "Verdant Beauty", "Symmetric Forms", "Aqueous Hues", "Hidden Worlds"
  ];
  const descriptions = [
    "A stunning vista captured at the golden hour, showcasing nature's raw beauty.",
    "An innovative abstract piece that masterfully plays with vibrant colors and intricate forms.",
    "The city's dynamic heartbeat, viewed from a unique and compelling perspective.",
    "A mouth-watering culinary creation that is as visually appealing as it is delicious.",
    "Embracing the 'less is more' philosophy with this clean, modern, and elegant aesthetic.",
    "Discover the latest fashion trends alongside timeless statements of personal style.",
    "Inspiring and captivating scenes from far-flung lands and exotic destinations.",
    "A rare and intimate close encounter with the diverse inhabitants of the natural world.",
    "Cozy, stylish, and functional interior design ideas to transform your living space.",
    "Nostalgic and charming artwork imbued with a classic, retro touch.",
    "A powerful, expressive, and deeply moving look into the depths of someone's soul.",
    "The vibrant, ever-changing, and dynamic art found on the bustling city streets.",
    "Delicate botanical illustrations capturing the intricate beauty of plant life.",
    "Mesmerizing geometric patterns that play with symmetry and repetition.",
    "Ethereal watercolor paintings that evoke a sense of calm and tranquility.",
    "Revealing the unseen beauty in everyday objects through detailed macro shots."
  ];
  const uploaderNames = ["Alex P.", "Casey L.", "Jordan B.", "Morgan K.", "Riley S.", "Devon W.", "Sam T."];
  const uploaderUsernames = ["alexpics", "casey_creates", "jb_explores", "morgank", "riley_s", "devon_draws", "samtakesphotos"];
  
  const avatarPlaceholders = ['AP', 'CL', 'JB', 'MK', 'RS', 'DW', 'ST'];

  const randomIndex = Math.floor(Math.random() * hints.length);
  const randomWidth = widths[Math.floor(Math.random() * widths.length)];
  // Ensure height is reasonably proportional, avoid extremely tall or wide images for grid balance
  let randomHeight = Math.round(randomWidth * heightRatios[Math.floor(Math.random() * heightRatios.length)]);
  if (randomHeight > randomWidth * 2.2) randomHeight = Math.round(randomWidth * 2.2);
  if (randomHeight < randomWidth * 0.5) randomHeight = Math.round(randomWidth * 0.5);


  return {
    id: `pin-homepage-${id}-${Math.random().toString(36).substring(2, 9)}`,
    alt: `Pin image: ${hints[randomIndex]} - by ${uploaderNames[id % uploaderNames.length]}`,
    width: randomWidth,
    height: randomHeight,
    placeholderId: `ph-homepage-${id}`,
    aiHint: hints[randomIndex],
    title: titles[randomIndex],
    description: descriptions[randomIndex],
    likes: Math.floor(Math.random() * 1500) + 50,
    uploader: {
      name: uploaderNames[id % uploaderNames.length],
      avatarUrl: `https://placehold.co/40x40.png?text=${avatarPlaceholders[id % avatarPlaceholders.length]}`,
      username: uploaderUsernames[id % uploaderUsernames.length],
    },
  };
};

const fetchPins = async (page: number): Promise<Pin[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newPins: Pin[] = Array.from({ length: PINS_PER_PAGE }, (_, i) => 
        generateRandomPin(page * PINS_PER_PAGE + i)
      );
      resolve(newPins);
    }, 700); // Simulate network delay
  });
};

export default function HomePage() {
  const router = useRouter();
  const [pins, setPins] = useState<Pin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
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
    // Initial load
    if (pins.length === 0) {
      loadMorePins();
    }
  }, [loadMorePins, pins.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMorePins();
        }
      },
      { threshold: 0.8 } // Trigger a bit earlier
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
  }, [loadMorePins, hasMore, isLoading]);

  const handlePinClick = (pin: Pin) => {
    // Could implement a modal preview here or navigate directly
    router.push(`/pin/${pin.id}`);
  };

  return (
    <div className="flex flex-col flex-1 overflow-y-auto"> {/* Ensure it fills height */}
      <AppHeader />
      <main className="flex-grow container mx-auto px-2 sm:px-4 py-6 sm:py-8">
        {pins.length > 0 ? (
          <PinGrid pins={pins} onPinClick={handlePinClick} showPinDetailsOverlay={true} />
        ) : isLoading ? null : ( // Only show no pins if not loading and pins array is empty
           <div className="text-center py-16">
             <h2 className="text-2xl font-semibold text-muted-foreground">No pins yet!</h2>
             <p className="text-muted-foreground">Start exploring or create your first pin.</p>
           </div>
        )}
        
        {isLoading && (
          <div className="masonry-grid px-grid-gap md:px-0 mt-grid-gap">
            {[...Array(10)].map((_, i) => (
              <div key={`skeleton-home-${i}`} className="break-inside-avoid mb-grid-gap">
                <Skeleton className={`w-full h-[${250 + Math.random() * 300}px] rounded-2xl bg-muted/80`} />
              </div>
            ))}
          </div>
        )}
        <div ref={loaderRef} className="h-20 w-full flex justify-center items-center" aria-hidden="true">
          {isLoading && pins.length > 0 && ( // Show spinner only if loading more, not initial
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          )}
        </div>
        {!hasMore && pins.length > 0 && (
          <p className="text-center text-muted-foreground font-medium py-10 text-lg">✨ You've explored all the pins! ✨</p>
        )}
      </main>
    </div>
  );
}

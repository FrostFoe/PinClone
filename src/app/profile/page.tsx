
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PinGrid from '@/components/pin-grid';
import type { Pin } from '@/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SlidersHorizontal, Star, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const PINS_PER_PAGE = 20;

// Re-using the pin generation logic from homepage for simulation
const generateRandomUserPin = (id: number): Pin => {
  const widths = [250, 300, 350, 400, 450, 500];
  const heightRatios = [1.2, 1.5, 1.8, 2.0, 0.8, 0.6, 1.0, 1.3];
  const hints = [
    'DIY craft', 'home organization', 'recipe idea', 'fashion inspiration',
    'travel bucket list', 'fitness motivation', 'art project', 'gardening tips',
    'book recommendations', 'photography ideas', 'tech gadgets', 'music playlist'
  ];
  const titles = [
    "My Latest DIY", "Organization Hack", "Tasty Recipe", "Outfit Inspo",
    "Dream Destination", "Workout Goals", "Creative Art", "Garden Love",
    "Must Reads", "Photo Challenge", "Cool Tech", "Vibes Playlist"
  ];
  const uploaderNames = ["FrostFoe"]; // Assuming these are the user's pins
  const uploaderUsernames = ["frostfoe"];

  const randomIndex = Math.floor(Math.random() * hints.length);
  const randomWidth = widths[Math.floor(Math.random() * widths.length)];
  const randomHeight = Math.round(randomWidth * heightRatios[Math.floor(Math.random() * heightRatios.length)]);
  const randomHint = hints[randomIndex];
  
  return {
    id: `user-pin-${id}-${Math.random().toString(16).slice(2)}`, // Ensure unique ID
    alt: `User pin ${id} - ${randomHint}`,
    width: randomWidth,
    height: randomHeight,
    placeholderId: `ph-user-${id}`,
    aiHint: randomHint,
    title: titles[randomIndex % titles.length],
    uploader: {
      name: uploaderNames[0],
      avatarUrl: `https://placehold.co/40x40.png?text=F`,
      username: uploaderUsernames[0],
    },
    likes: Math.floor(Math.random() * 200),
  };
};

const fetchUserPins = async (page: number): Promise<Pin[]> => {
  // Simulate API call for user's pins
  return new Promise((resolve) => {
    setTimeout(() => {
      const newPins: Pin[] = [];
      for (let i = 0; i < PINS_PER_PAGE; i++) {
        newPins.push(generateRandomUserPin(page * PINS_PER_PAGE + i));
      }
      resolve(newPins);
    }, 500);
  });
};


export default function ProfilePage() {
  const router = useRouter();
  const [pins, setPins] = useState<Pin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState('pins');

  const loadMorePins = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    const newPins = await fetchUserPins(page);
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
      { threshold: 1.0 }
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
    router.push(`/pin/${pin.id}`);
  };

  return (
    <div className="container mx-auto py-6 sm:py-8 px-2 sm:px-4">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold font-headline mb-6 text-center sm:text-left">
          Your saved ideas
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 bg-transparent p-0 justify-start">
          <TabsTrigger 
            value="pins" 
            className="px-4 py-2 text-base font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none hover:bg-muted/50"
          >
            Pins
          </TabsTrigger>
          <TabsTrigger 
            value="boards"
            className="px-4 py-2 text-base font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none hover:bg-muted/50"
          >
            Boards
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-secondary">
              <SlidersHorizontal className="h-5 w-5" />
              <span className="sr-only">Filters</span>
            </Button>
            <Button variant="secondary" className="rounded-2xl h-10 px-4 text-sm font-medium bg-muted hover:bg-muted/80 text-foreground">
              <Star className="mr-2 h-4 w-4" /> Favorites
            </Button>
            <Button variant="secondary" className="rounded-2xl h-10 px-4 text-sm font-medium bg-muted hover:bg-muted/80 text-foreground">
              Created by you
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 hover:bg-secondary">
            <Plus className="h-6 w-6" />
            <span className="sr-only">Create</span>
          </Button>
        </div>

        <TabsContent value="pins">
          <PinGrid pins={pins} onPinClick={handlePinClick} />
          {isLoading && (
            <div className="masonry-grid px-grid-gap md:px-0 mt-grid-gap">
              {[...Array(5)].map((_, i) => (
                <div key={`skeleton-profile-${i}`} className="break-inside-avoid mb-grid-gap">
                  <Skeleton className={`w-full h-[${200 + Math.random() * 200}px] rounded-2xl`} />
                </div>
              ))}
            </div>
          )}
          <div ref={loaderRef} className="h-10 w-full" aria-hidden="true" />
          {!hasMore && pins.length > 0 && (
            <p className="text-center text-muted-foreground py-8">You've reached the end of your pins!</p>
          )}
          {!hasMore && pins.length === 0 && !isLoading && (
            <p className="text-center text-muted-foreground py-8">No pins saved yet. Start exploring!</p>
          )}
        </TabsContent>
        <TabsContent value="boards">
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-muted-foreground">Boards are coming soon!</h3>
            <p className="text-muted-foreground">Organize your pins into boards to keep your ideas tidy.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

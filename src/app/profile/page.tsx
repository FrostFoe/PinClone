
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import PinGrid from '@/components/pin-grid';
import type { Pin } from '@/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { SlidersHorizontal, Star, Plus, Edit2, Share2, Settings, Search, MoreHorizontal } from 'lucide-react';

const PINS_PER_PAGE = 18;

const generateRandomUserPin = (id: number): Pin => {
  const widths = [250, 300, 350, 400, 450, 500];
  const heightRatios = [1.0, 1.2, 1.5, 1.8, 0.8, 0.7];
  const hints = [ 'DIY project', 'home decor', 'recipe find', 'fashion moodboard', 'travel dream', 'fitness goal', 'art creation', 'garden inspiration', 'book collection', 'photo album', 'tech setup', 'music vibe' ];
  const titles = [ "My Latest Craft", "Home Sweet Home", "Delicious Discovery", "Style Inspiration", "Wanderlust List", "Fitness Journey", "Artistic Expression", "Green Thumb", "Reading Nook", "Captured Moments", "My Workspace", "Current Playlist" ];
  
  const randomIndex = Math.floor(Math.random() * hints.length);
  const randomWidth = widths[Math.floor(Math.random() * widths.length)];
  const randomHeight = Math.round(randomWidth * heightRatios[Math.floor(Math.random() * heightRatios.length)]);
  
  return {
    id: `user-pin-${id}-${Math.random().toString(16).slice(2)}`,
    alt: `User pin: ${hints[randomIndex]}`,
    width: randomWidth,
    height: randomHeight,
    placeholderId: `ph-user-${id}`,
    aiHint: hints[randomIndex],
    title: titles[randomIndex % titles.length],
    uploader: { name: 'FrostFoe', avatarUrl: `https://placehold.co/80x80.png?text=FF`, username: 'frostfoe' },
    likes: Math.floor(Math.random() * 250),
  };
};

const fetchUserPins = async (page: number, type: 'created' | 'saved'): Promise<Pin[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newPins: Pin[] = Array.from({ length: PINS_PER_PAGE }, (_, i) =>
        generateRandomUserPin(page * PINS_PER_PAGE + i)
      );
      resolve(newPins);
    }, 500);
  });
};

const UserProfile = {
  name: 'FrostFoe',
  username: 'frostfoe',
  avatarUrl: 'https://placehold.co/120x120.png?text=FF',
  bio: 'Exploring the digital frontiers, one pixel at a time. Collector of ideas and creator of things.',
  followers: 1258,
  following: 340,
  website: 'frostfoe.example.com'
};

export default function ProfilePage() {
  const router = useRouter();
  const [pins, setPins] = useState<Pin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState('created'); // 'created' or 'saved'

  const loadMorePins = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    const newPins = await fetchUserPins(page, activeTab as 'created' | 'saved');
    if (newPins.length > 0) {
      setPins((prevPins) => (page === 0 ? newPins : [...prevPins, ...newPins]));
      setPage((prevPage) => prevPage + 1);
    } else {
      setHasMore(false);
    }
    setIsLoading(false);
  }, [page, isLoading, hasMore, activeTab]);

  useEffect(() => {
    setPins([]);
    setPage(0);
    setHasMore(true);
    // Trigger loadMorePins after state reset, ensuring it uses the new 'activeTab'
    // Using a timeout to ensure state update completes before fetching
    const timer = setTimeout(() => {
      loadMorePins();
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab]); // loadMorePins is not in deps to avoid loop, it's called manually

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
    if (currentLoaderRef) {
      observer.observe(currentLoaderRef);
    }
    return () => {
      if (currentLoaderRef) observer.unobserve(currentLoaderRef);
    };
  }, [loadMorePins, hasMore, isLoading]);


  const handlePinClick = (pin: Pin) => {
    router.push(`/pin/${pin.id}`);
  };

  return (
    <div className="flex-1 flex flex-col animate-fade-in-up">
      {/* Profile Header Section */}
      <div className="container mx-auto px-4 pt-8 pb-6">
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-24 w-24 sm:h-28 sm:w-28 mb-4 border-4 border-card shadow-md">
            <AvatarImage src={UserProfile.avatarUrl} alt={UserProfile.name} data-ai-hint="profile avatar large" />
            <AvatarFallback className="text-4xl">{UserProfile.name[0]}</AvatarFallback>
          </Avatar>
          <h1 className="text-3xl sm:text-4xl font-bold font-headline">{UserProfile.name}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">@{UserProfile.username}</p>
          {UserProfile.bio && <p className="max-w-md mt-2 text-foreground/80 text-sm sm:text-base">{UserProfile.bio}</p>}
          {UserProfile.website && (
            <a href={`https://${UserProfile.website}`} target="_blank" rel="noopener noreferrer" className="mt-1 text-sm text-primary hover:underline">
              {UserProfile.website}
            </a>
          )}
          <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
            <span><strong className="text-foreground">{UserProfile.followers.toLocaleString()}</strong> followers</span>
            <span>·</span>
            <span><strong className="text-foreground">{UserProfile.following.toLocaleString()}</strong> following</span>
          </div>
          <div className="mt-6 flex gap-2">
            <Button variant="secondary" size="lg" className="rounded-full px-6 font-medium hover:bg-secondary/80 focus-ring">
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            <Button variant="secondary" size="lg" className="rounded-full px-6 font-medium hover:bg-secondary/80 focus-ring" onClick={() => router.push('/settings/profile')}>
              <Edit2 className="mr-2 h-4 w-4" /> Edit profile
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs and Content Section */}
      <div className="flex-1 container mx-auto px-2 sm:px-4 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="sticky top-[var(--header-height)] bg-background/80 backdrop-blur-md z-30 py-2 -mx-2 sm:-mx-4 px-2 sm:px-4 border-b">
            <div className="flex items-center justify-between">
                <TabsList className="bg-transparent p-0 gap-2">
                <TabsTrigger 
                    value="created" 
                    className="px-4 py-2.5 text-base font-medium rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/60 data-[state=inactive]:text-muted-foreground"
                >
                    Created
                </TabsTrigger>
                <TabsTrigger 
                    value="saved"
                    className="px-4 py-2.5 text-base font-medium rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/60 data-[state=inactive]:text-muted-foreground"
                >
                    Saved
                </TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
                        <SlidersHorizontal className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={() => router.push('/create')}> {/* Assuming /create route */}
                        <Plus className="h-6 w-6" />
                    </Button>
                     <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
                        <MoreHorizontal className="h-5 w-5" />
                    </Button>
                </div>
            </div>
          </div>

          <TabsContent value="created" className="pt-6">
            <PinGrid pins={pins} onPinClick={handlePinClick} />
          </TabsContent>
          <TabsContent value="saved" className="pt-6">
            <PinGrid pins={pins} onPinClick={handlePinClick} />
          </TabsContent>
        </Tabs>

        {isLoading && pins.length === 0 && ( // Initial load skeleton
          <div className="masonry-grid px-grid-gap md:px-0 mt-grid-gap pt-6">
            {[...Array(9)].map((_, i) => (
              <div key={`skeleton-profile-initial-${i}`} className="break-inside-avoid mb-grid-gap">
                <Skeleton className={`w-full h-[${200 + Math.random() * 250}px] rounded-2xl bg-muted/80`} />
              </div>
            ))}
          </div>
        )}
        {isLoading && pins.length > 0 && ( // Loading more skeleton (or spinner)
           <div className="h-20 w-full flex justify-center items-center mt-4">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
           </div>
        )}
        <div ref={loaderRef} className="h-1 w-full" aria-hidden="true" />
        {!hasMore && pins.length > 0 && (
          <p className="text-center text-muted-foreground font-medium py-10 text-lg">✨ You've explored all {activeTab} pins! ✨</p>
        )}
        {!hasMore && pins.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground">No {activeTab} pins yet</h3>
            <p className="text-muted-foreground mt-1">
              {activeTab === 'created' ? "Start creating and sharing your ideas!" : "Explore and save pins you love!"}
            </p>
            <Button className="mt-6 rounded-full px-6" size="lg" onClick={() => router.push(activeTab === 'created' ? '/create' : '/')}>
              {activeTab === 'created' ? 'Create Pin' : 'Explore Pins'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

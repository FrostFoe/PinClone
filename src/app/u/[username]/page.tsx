
// src/app/u/[username]/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import AppHeader from '@/components/app-header';
import PinGrid from '@/components/pin-grid';
import type { Pin, Uploader as UploaderType } from '@/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus, MessageSquare, Search, MoreHorizontal, CheckCircle } from 'lucide-react';

const PINS_PER_PAGE = 18;

// Simulate fetching user data
const fetchUserDataByUsername = async (username: string): Promise<UploaderType & { bio?: string, website?: string, followers?: number, following?: number, coverPhotoUrl?: string } | null> => {
  return new Promise(resolve => {
    setTimeout(() => {
      if (username === 'pinspirational') {
        resolve({
          name: 'Pinspirational User',
          username: 'pinspirational',
          avatarUrl: 'https://placehold.co/160x160.png?text=PU',
          bio: 'Curating the most inspiring visuals from around the web. Join my journey of discovery!',
          website: 'pinspirational.example.com',
          followers: 15200,
          following: 180,
          coverPhotoUrl: 'https://placehold.co/1200x300.png'
        });
      } else if (username === 'frostfoe') { // The current logged-in user for consistency
         resolve({
          name: 'FrostFoe',
          username: 'frostfoe',
          avatarUrl: 'https://placehold.co/160x160.png?text=FF',
          bio: 'Exploring the digital frontiers, one pixel at a time. Collector of ideas and creator of things.',
          website: 'frostfoe.example.com',
          followers: 1258,
          following: 340,
          coverPhotoUrl: 'https://placehold.co/1200x300.png'
        });
      }
      resolve(null); // User not found
    }, 300);
  });
};


const generateRandomUserPin = (id: number, uploader: UploaderType): Pin => {
  const widths = [250, 300, 350, 400, 450];
  const heightRatios = [1.0, 1.3, 1.6, 0.9, 0.75];
  const hints = [ 'travel photography', 'food styling', 'product design', 'architectural detail', 'fashion sketch', 'nature abstract', 'digital art', 'calligraphy' ];
  const titles = [ "Adventure Calls", "Gourmet Plate", "Innovative Product", "Building Beauty", "Style Concept", "Earth Patterns", "Pixel Magic", "Elegant Script" ];
  
  const randomIndex = Math.floor(Math.random() * hints.length);
  const randomWidth = widths[Math.floor(Math.random() * widths.length)];
  const randomHeight = Math.round(randomWidth * heightRatios[Math.floor(Math.random() * heightRatios.length)]);
  
  return {
    id: `public-user-pin-${uploader.username}-${id}-${Math.random().toString(16).slice(2)}`,
    alt: `Pin by ${uploader.name}: ${hints[randomIndex]}`,
    width: randomWidth,
    height: randomHeight,
    placeholderId: `ph-public-user-${id}`,
    aiHint: hints[randomIndex],
    title: titles[randomIndex % titles.length],
    uploader: uploader,
    likes: Math.floor(Math.random() * 450),
  };
};

const fetchPinsByUsername = async (page: number, uploader: UploaderType): Promise<Pin[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newPins: Pin[] = Array.from({ length: PINS_PER_PAGE }, (_, i) =>
        generateRandomUserPin(page * PINS_PER_PAGE + i, uploader)
      );
      resolve(newPins);
    }, 500);
  });
};


export default function UserPublicProfilePage() {
  const router = useRouter();
  const params = useParams();
  const username = params?.username as string;

  const [userData, setUserData] = useState<UploaderType & { bio?: string, website?: string, followers?: number, following?: number, coverPhotoUrl?: string } | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingPins, setIsLoadingPins] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState('created');
  const [isFollowing, setIsFollowing] = useState(false); // Mock follow state

  useEffect(() => {
    if (username) {
      setIsLoadingUser(true);
      setUserData(null);
      setPins([]);
      setPage(0);
      setHasMore(true);
      fetchUserDataByUsername(username).then(data => {
        setUserData(data);
        setIsLoadingUser(false);
        if (data) {
          // Initial pin load
          loadMorePins(0, data);
        }
      });
    }
  }, [username]);

  const loadMorePins = useCallback(async (currentPage: number, currentUserData: typeof userData) => {
    if (isLoadingPins || !hasMore || !currentUserData) return;
    setIsLoadingPins(true);
    const newPins = await fetchPinsByUsername(currentPage, currentUserData);
    if (newPins.length > 0) {
      setPins(prev => currentPage === 0 ? newPins : [...prev, ...newPins]);
      setPage(currentPage + 1);
    } else {
      setHasMore(false);
    }
    setIsLoadingPins(false);
  }, [isLoadingPins, hasMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingPins && userData) {
          loadMorePins(page, userData);
        }
      },
      { threshold: 0.8 }
    );
    const currentLoader = loaderRef.current;
    if (currentLoader) observer.observe(currentLoader);
    return () => {
      if (currentLoader) observer.unobserve(currentLoader);
    };
  }, [loadMorePins, hasMore, isLoadingPins, page, userData]);


  const handlePinClick = (pin: Pin) => {
    router.push(`/pin/${pin.id}`);
  };

  const handleFollowToggle = () => setIsFollowing(!isFollowing);

  if (isLoadingUser) {
    return (
      <div className="flex-1 flex flex-col animate-fade-in">
        <AppHeader />
        <div className="w-full h-48 sm:h-64 bg-muted animate-pulse" />
        <div className="container mx-auto px-4 -mt-16 sm:-mt-20 pb-8">
          <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 rounded-full border-4 border-background bg-muted mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto mt-4 rounded-md bg-muted" />
          <Skeleton className="h-5 w-32 mx-auto mt-2 rounded-md bg-muted" />
          <div className="flex justify-center gap-4 mt-6">
            <Skeleton className="h-10 w-24 rounded-full bg-muted" />
            <Skeleton className="h-10 w-24 rounded-full bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex-1 flex flex-col">
        <AppHeader />
        <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
          <UserPlus className="h-24 w-24 text-muted-foreground/50 mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-2">User Not Found</h1>
          <p className="text-lg text-muted-foreground mb-8">Sorry, we couldn't find a profile for @{username}.</p>
          <Button onClick={() => router.push('/')} size="lg" className="rounded-full px-8">
            Explore Pins
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col animate-fade-in-up">
      <AppHeader />
      {/* Cover Photo */}
      <div 
        className="h-48 sm:h-64 bg-cover bg-center relative" 
        style={{ backgroundImage: `url(${userData.coverPhotoUrl || 'https://placehold.co/1200x300.png?text=Cover'})` }}
        data-ai-hint="profile cover background"
      >
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* Profile Header Section */}
      <div className="container mx-auto px-4 -mt-16 sm:-mt-20 pb-6">
        <div className="flex flex-col items-center text-center relative">
          <Avatar className="h-24 w-24 sm:h-32 sm:w-32 mb-4 border-4 border-background bg-card shadow-lg">
            <AvatarImage src={userData.avatarUrl} alt={userData.name} data-ai-hint="user profile avatar large" />
            <AvatarFallback className="text-4xl">{userData.name[0]}</AvatarFallback>
          </Avatar>
          <h1 className="text-3xl sm:text-4xl font-bold font-headline text-foreground">{userData.name}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">@{userData.username}</p>
          {userData.bio && <p className="max-w-xl mt-2 text-foreground/80 text-sm sm:text-base">{userData.bio}</p>}
          {userData.website && (
            <a href={`https://${userData.website}`} target="_blank" rel="noopener noreferrer" className="mt-1 text-sm text-primary hover:underline">
              {userData.website}
            </a>
          )}
          <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
            <span><strong className="text-foreground">{userData.followers?.toLocaleString() || 0}</strong> followers</span>
            <span>·</span>
            <span><strong className="text-foreground">{userData.following?.toLocaleString() || 0}</strong> following</span>
          </div>
          <div className="mt-6 flex gap-2">
            <Button 
              variant={isFollowing ? "secondary" : "default"} 
              size="lg" 
              className="rounded-full px-6 font-medium focus-ring transition-all duration-150 ease-in-out"
              onClick={handleFollowToggle}
            >
              {isFollowing ? <CheckCircle className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
              {isFollowing ? "Following" : "Follow"}
            </Button>
            <Button variant="outline" size="lg" className="rounded-full px-6 font-medium hover:bg-secondary/50 focus-ring">
              <MessageSquare className="mr-2 h-4 w-4" /> Message
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs and Content Section */}
      <div className="flex-1 container mx-auto px-2 sm:px-4 pb-8">
         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="sticky top-[var(--header-height)] bg-background/80 backdrop-blur-md z-30 py-2 -mx-2 sm:-mx-4 px-2 sm:px-4 border-b">
            <div className="flex items-center justify-center"> {/* Centered TabsList */}
                <TabsList className="bg-transparent p-0 gap-2">
                <TabsTrigger 
                    value="created" 
                    className="px-5 py-2.5 text-base font-medium rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm hover:bg-muted/60 data-[state=inactive]:text-muted-foreground"
                >
                    Created
                </TabsTrigger>
                <TabsTrigger 
                    value="saved"
                    className="px-5 py-2.5 text-base font-medium rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm hover:bg-muted/60 data-[state=inactive]:text-muted-foreground"
                >
                    Saved
                </TabsTrigger>
                </TabsList>
            </div>
          </div>

          <TabsContent value="created" className="pt-6">
            <PinGrid pins={pins} onPinClick={handlePinClick} showPinDetailsOverlay={true} />
          </TabsContent>
          <TabsContent value="saved" className="pt-6">
             <PinGrid pins={pins} onPinClick={handlePinClick} showPinDetailsOverlay={true} />
          </TabsContent>
        </Tabs>

        {isLoadingPins && pins.length === 0 && (
          <div className="masonry-grid px-grid-gap md:px-0 mt-grid-gap pt-6">
            {[...Array(6)].map((_, i) => (
              <div key={`skeleton-user-public-initial-${i}`} className="break-inside-avoid mb-grid-gap">
                <Skeleton className={`w-full h-[${220 + Math.random() * 200}px] rounded-2xl bg-muted/80`} />
              </div>
            ))}
          </div>
        )}
        {isLoadingPins && pins.length > 0 && (
           <div className="h-20 w-full flex justify-center items-center mt-4">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
           </div>
        )}
        <div ref={loaderRef} className="h-1 w-full" aria-hidden="true" />
        {!hasMore && pins.length > 0 && (
          <p className="text-center text-muted-foreground font-medium py-10 text-lg">✨ End of {userData.name}'s {activeTab} pins! ✨</p>
        )}
        {!hasMore && pins.length === 0 && !isLoadingPins && (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground">No {activeTab} pins to show</h3>
            <p className="text-muted-foreground mt-1">
              {userData.name} hasn't {activeTab} any pins yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

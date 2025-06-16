
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppHeader from '@/components/app-header';
import PinGrid from '@/components/pin-grid';
import type { Pin, Profile } from '@/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus, MessageSquare, Search as SearchIcon, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchProfileByUsername } from '@/services/profileService';
import { fetchPinsByUserId } from '@/services/pinService';

const PINS_PER_PAGE = 18;

export default function UserPublicProfilePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const username = params?.username as string;

  const [userData, setUserData] = useState<Profile | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingPins, setIsLoadingPins] = useState(false);
  const [pinsPage, setPinsPage] = useState(1);
  const [hasMorePins, setHasMorePins] = useState(true);
  const pinsLoaderRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState('created');
  const [isFollowing, setIsFollowing] = useState(false); // Mock follow state

  const loadUserProfile = useCallback(async (uname: string) => {
    setIsLoadingUser(true);
    const { profile, error } = await fetchProfileByUsername(uname);
    if (error || !profile) {
      toast({ variant: 'destructive', title: 'Error', description: error || 'User not found.' });
      setUserData(null);
    } else {
      setUserData(profile);
      setPins([]); // Reset pins for the new profile
      setPinsPage(1);
      setHasMorePins(true);
      loadMorePins(profile.id, 1, true); // Load initial pins
    }
    setIsLoadingUser(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  useEffect(() => {
    if (username) {
      loadUserProfile(username);
    }
  }, [username, loadUserProfile]);

  const loadMorePins = useCallback(async (userId: string, pageToLoad: number, initialLoad = false) => {
    if (isLoadingPins && !initialLoad) return;
    if (!hasMorePins && !initialLoad) return;

    setIsLoadingPins(true);
    // For now, 'saved' tab will show the same as 'created' for public profiles
    const { pins: newPins, error } = await fetchPinsByUserId(userId, pageToLoad, PINS_PER_PAGE);

    if (error) {
      toast({ variant: 'destructive', title: `Error fetching ${activeTab} pins`, description: error });
      setHasMorePins(false);
    } else {
      if (newPins.length > 0) {
        setPins((prevPins) => initialLoad ? newPins : [...prevPins, ...newPins]);
        setPinsPage(pageToLoad + 1);
        if (newPins.length < PINS_PER_PAGE) setHasMorePins(false);
      } else {
        setHasMorePins(false);
      }
    }
    setIsLoadingPins(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, toast, isLoadingPins, hasMorePins]);

  useEffect(() => {
    // Reset pins and pagination when tab changes
    if (userData?.id) {
        setPins([]);
        setPinsPage(1);
        setHasMorePins(true);
        loadMorePins(userData.id, 1, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userData?.id]);


  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMorePins && !isLoadingPins && userData?.id) {
          loadMorePins(userData.id, pinsPage);
        }
      },
      { threshold: 0.8 }
    );
    const currentLoader = pinsLoaderRef.current;
    if (currentLoader && hasMorePins) observer.observe(currentLoader);
    return () => {
      if (currentLoader) observer.unobserve(currentLoader);
    };
  }, [loadMorePins, hasMorePins, isLoadingPins, pinsPage, userData?.id]);


  const handlePinClick = (pin: Pin) => {
    router.push(`/pin/${pin.id}`);
  };

  const handleFollowToggle = () => setIsFollowing(!isFollowing); // Mock

  if (isLoadingUser) {
    return (
      <div className="flex-1 flex flex-col animate-fade-in">
        <AppHeader />
        <Skeleton className="w-full h-48 sm:h-64 bg-muted" />
        <div className="container mx-auto px-4 -mt-16 sm:-mt-20 pb-8 text-center">
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
  
  // Use a placeholder for cover photo or make it optional in your data
  const coverPhotoUrl = `https://placehold.co/1200x300.png?text=${userData.username}`;

  return (
    <div className="flex-1 flex flex-col animate-fade-in-up">
      <AppHeader />
      <div 
        className="h-48 sm:h-64 bg-cover bg-center relative" 
        style={{ backgroundImage: `url(${coverPhotoUrl})` }}
        data-ai-hint="profile cover background"
      >
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      <div className="container mx-auto px-4 -mt-16 sm:-mt-20 pb-6">
        <div className="flex flex-col items-center text-center relative">
          <Avatar className="h-24 w-24 sm:h-32 sm:w-32 mb-4 border-4 border-background bg-card shadow-lg">
            <AvatarImage src={userData.avatar_url || undefined} alt={userData.full_name || userData.username || 'User'} data-ai-hint="user profile avatar large" />
            <AvatarFallback className="text-4xl">{userData.full_name?.[0]?.toUpperCase() || userData.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <h1 className="text-3xl sm:text-4xl font-bold font-headline text-foreground">{userData.full_name || userData.username}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">@{userData.username}</p>
          {userData.bio && <p className="max-w-xl mt-2 text-foreground/80 text-sm sm:text-base">{userData.bio}</p>}
          {userData.website && (
            <a href={!userData.website.startsWith('http') ? `https://${userData.website}` : userData.website} target="_blank" rel="noopener noreferrer" className="mt-1 text-sm text-primary hover:underline">
              {userData.website}
            </a>
          )}
          {/* Followers/Following requires more DB work */}
          <div className="mt-6 flex gap-2">
            <Button 
              variant={isFollowing ? "secondary" : "default"} 
              size="lg" 
              className="rounded-full px-6 font-medium focus-ring transition-all duration-150 ease-in-out"
              onClick={handleFollowToggle} // Mock action
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

      <div className="flex-1 container mx-auto px-2 sm:px-4 pb-8">
         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="sticky top-[var(--header-height)] bg-background/80 backdrop-blur-md z-10 py-2 -mx-2 sm:-mx-4 px-2 sm:px-4 border-b mb-6">
            <div className="flex items-center justify-center">
                <TabsList className="bg-transparent p-0 gap-2">
                <TabsTrigger 
                    value="created" 
                    className="px-5 py-2.5 text-base font-medium rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm hover:bg-muted/60 data-[state=inactive]:text-muted-foreground"
                >
                    Created
                </TabsTrigger>
                <TabsTrigger 
                    value="saved"
                    disabled // Saved feature not implemented yet
                    className="px-5 py-2.5 text-base font-medium rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm hover:bg-muted/60 data-[state=inactive]:text-muted-foreground"
                >
                    Saved
                </TabsTrigger>
                </TabsList>
            </div>
          </div>

          <TabsContent value="created">
            <PinGrid pins={pins} onPinClick={handlePinClick} showPinDetailsOverlay={true} />
          </TabsContent>
          <TabsContent value="saved">
             <div className="text-center py-16">
                <SearchIcon className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground">Saved Pins Feature Coming Soon</h3>
                <p className="text-muted-foreground mt-1">This user's saved pins will appear here.</p>
              </div>
          </TabsContent>
        </Tabs>

        {isLoadingPins && pins.length === 0 && (
          <div className="masonry-grid px-grid-gap md:px-0 mt-grid-gap pt-6">
            {[...Array(6)].map((_, i) => (
              <div key={`skeleton-user-public-initial-${i}`} className="break-inside-avoid mb-grid-gap">
                <Skeleton className={`w-full h-[${220 + Math.floor(Math.random() * 180)}px] rounded-2xl bg-muted/80`} />
              </div>
            ))}
          </div>
        )}
        {isLoadingPins && pins.length > 0 && (
           <div className="h-20 w-full flex justify-center items-center mt-4">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
           </div>
        )}
        <div ref={pinsLoaderRef} className="h-1 w-full" aria-hidden="true" />
        {!hasMorePins && pins.length > 0 && (
          <p className="text-center text-muted-foreground font-medium py-10 text-lg">✨ End of @{userData.username}'s {activeTab} pins! ✨</p>
        )}
        {!hasMorePins && pins.length === 0 && !isLoadingPins && (
          <div className="text-center py-16">
            <SearchIcon className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground">No {activeTab} pins to show</h3>
            <p className="text-muted-foreground mt-1">
              @{userData.username} hasn't {activeTab} any pins yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

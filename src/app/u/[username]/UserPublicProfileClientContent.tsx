
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import PinGrid from "@/components/pin-grid";
import type { Pin, Profile } from "@/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserPlus,
  MessageSquare,
  Search as SearchIconLucide,
  CheckCircle,
  Users,
  ExternalLink,
  LogIn,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchProfileByUsername } from "@/services/profileService";
import { fetchPinsByUserId } from "@/services/pinService";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const PINS_PER_PAGE = 18;

interface UserPublicProfileClientContentProps {
  params: { username: string };
}

export default function UserPublicProfileClientContent({
  params: routeParams,
}: UserPublicProfileClientContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const username = routeParams?.username as string;
  const supabase = createSupabaseBrowserClient();

  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [userData, setUserData] = useState<Profile | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingPins, setIsLoadingPins] = useState(false);
  const [pinsPage, setPinsPage] = useState(1);
  const [hasMorePins, setHasMorePins] = useState(true);
  const pinsLoaderRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState("created");
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user ?? null);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);


  const loadMorePins = useCallback(
    async (
      userId: string,
      pageToLoad: number,
      initialLoad = false,
      currentTab: string,
    ) => {
      if (isLoadingPins && !initialLoad) return;
      if (!hasMorePins && !initialLoad) return;

      setIsLoadingPins(true);
      let fetchedData;
      if (currentTab === "created") {
        fetchedData = await fetchPinsByUserId(
          userId,
          pageToLoad,
          PINS_PER_PAGE,
        );
      } else {
        fetchedData = { pins: [], error: null };
        setHasMorePins(false);
      }
      const { pins: newPins, error } = fetchedData;

      if (error) {
        toast({
          variant: "destructive",
          title: `Error fetching ${currentTab} pins`,
          description: error,
        });
        setHasMorePins(false);
      } else {
        if (newPins.length > 0) {
          setPins((prevPins) =>
            initialLoad ? newPins : [...prevPins, ...newPins],
          );
          setPinsPage(pageToLoad + 1);
          if (newPins.length < PINS_PER_PAGE) setHasMorePins(false);
        } else {
          setHasMorePins(false);
        }
      }
      setIsLoadingPins(false);
    },
    [toast, isLoadingPins, hasMorePins],
  );

  const loadUserProfile = useCallback(
    async (uname: string) => {
      setIsLoadingUser(true);
      setUserData(null);
      setPins([]);
      setPinsPage(1);
      setHasMorePins(true);

      const { profile, error } = await fetchProfileByUsername(uname);
      if (error || !profile) {
        toast({
          variant: "destructive",
          title: "User Not Found",
          description: error || `Profile for @${uname} could not be loaded.`,
        });
        router.push("/not-found");
      } else {
        setUserData(profile);
        if (typeof document !== "undefined") {
          document.title = `${profile.full_name || profile.username}'s Profile | Pinclone`;
        }
      }
      setIsLoadingUser(false);
    },
    [toast, router],
  );

  useEffect(() => {
    if (username) {
      loadUserProfile(username);
    }
  }, [username, loadUserProfile]);

  useEffect(() => {
    if (userData?.id && activeTab) {
      setPins([]);
      setPinsPage(1);
      setHasMorePins(true);
      loadMorePins(userData.id, 1, true, activeTab);
    }
  }, [userData?.id, activeTab, loadMorePins]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMorePins &&
          !isLoadingPins &&
          userData?.id &&
          activeTab === "created"
        ) {
          loadMorePins(userData.id, pinsPage, false, activeTab);
        }
      },
      { threshold: 0.8 },
    );
    const currentLoader = pinsLoaderRef.current;
    if (currentLoader && hasMorePins && activeTab === "created")
      observer.observe(currentLoader);
    return () => {
      if (currentLoader) observer.unobserve(currentLoader);
    };
  }, [
    loadMorePins,
    hasMorePins,
    isLoadingPins,
    pinsPage,
    userData?.id,
    activeTab,
  ]);

  const handlePinClick = (pin: Pin) => {
    router.push(`/pin/${pin.id}`);
  };

  const handleFollowToggle = () => {
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setIsFollowing(!isFollowing);
    // Add actual follow/unfollow logic here
  };

  if (isLoadingUser) {
    return (
      <div className="flex-1 flex flex-col animate-fade-in pt-8">
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
        <div className="container mx-auto px-4 py-8">
          <div className="masonry-grid px-grid-gap md:px-0 mt-grid-gap">
            {[...Array(6)].map((_, i) => (
              <div
                key={`skeleton-profile-pins-${i}`}
                className="break-inside-avoid mb-grid-gap"
              >
                <Skeleton
                  className={`w-full h-[${200 + Math.floor(Math.random() * 150)}px] rounded-2xl bg-muted/80`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
          <Users className="h-24 w-24 text-muted-foreground/50 mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-2">
            User Not Found
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Sorry, we couldn't find a profile for @{username}.
          </p>
          <Button
            onClick={() => router.push("/")}
            size="lg"
            className="rounded-full px-8"
          >
            Explore Pins
          </Button>
        </div>
      </div>
    );
  }

  const coverPhotoUrl = `https://placehold.co/1600x400.png`;
  const isOwnProfile = currentUser?.id === userData.id;


  return (
    <div className="flex-1 flex flex-col animate-fade-in-up pt-8">
      <div
        className="h-48 sm:h-64 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${coverPhotoUrl})` }}
        data-ai-hint="profile cover abstract"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent"></div>
      </div>
      <div className="container mx-auto px-4 -mt-16 sm:-mt-20 pb-6">
        <div className="flex flex-col items-center text-center relative">
          <Avatar className="h-24 w-24 sm:h-32 sm:w-32 mb-4 border-4 border-background bg-card shadow-lg">
            <AvatarImage
              src={userData.avatar_url || undefined}
              alt={userData.full_name || userData.username || "User"}
              data-ai-hint="user profile avatar large"
            />
            <AvatarFallback className="text-4xl">
              {userData.full_name?.[0]?.toUpperCase() ||
                userData.username?.[0]?.toUpperCase() ||
                "U"}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-3xl sm:text-4xl font-bold font-headline text-foreground">
            {userData.full_name || userData.username}
          </h1>
          {userData.username && (
            <p className="text-muted-foreground text-sm sm:text-base">
              @{userData.username}
            </p>
          )}
          {userData.bio && (
            <p className="max-w-xl mt-2 text-foreground/80 text-sm sm:text-base">
              {userData.bio}
            </p>
          )}
          {userData.website && (
            <a
              href={
                !userData.website.startsWith("http")
                  ? `https://${userData.website}`
                  : userData.website
              }
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              {userData.website.replace(/^https?:\/\//, "")}{" "}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {!isOwnProfile && (
            <div className="mt-6 flex gap-2">
                <Button
                variant={isFollowing ? "secondary" : "default"}
                size="lg"
                className="rounded-full px-6 font-medium focus-ring transition-all duration-150 ease-in-out"
                onClick={handleFollowToggle}
                >
                {currentUser ? (
                    isFollowing ? (
                    <CheckCircle className="mr-2 h-4 w-4" />
                    ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                    )
                ) : (
                    <LogIn className="mr-2 h-4 w-4" />
                )}
                {currentUser ? (isFollowing ? "Following" : "Follow") : "Login to Follow"}
                </Button>
              {currentUser && (
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full px-6 font-medium hover:bg-secondary/50 focus-ring"
                >
                  <MessageSquare className="mr-2 h-4 w-4" /> Message
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 container mx-auto px-0 sm:px-4 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="sticky top-[calc(var(--header-height)+var(--header-height))] sm:top-[var(--header-height)] bg-background/90 backdrop-blur-md z-10 py-3 -mx-2 sm:-mx-4 px-2 sm:px-4 border-b mb-6">
            <div className="flex items-center justify-center">
              <TabsList className="bg-transparent p-0 gap-2 sm:gap-3">
                <TabsTrigger
                  value="created"
                  className="px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-medium rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm hover:bg-muted/60 data-[state=inactive]:text-muted-foreground"
                >
                  Created
                </TabsTrigger>
                <TabsTrigger
                  value="saved"
                  className="px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-medium rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm hover:bg-muted/60 data-[state=inactive]:text-muted-foreground"
                >
                  Saved
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="created">
            {pins.length > 0 && (
              <PinGrid
                pins={pins}
                onPinClick={handlePinClick}
                showPinDetailsOverlay={true}
              />
            )}
            {isLoadingPins && pins.length === 0 && (
              <div className="masonry-grid px-grid-gap md:px-0 mt-grid-gap pt-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={`skeleton-user-public-created-${i}`}
                    className="break-inside-avoid mb-grid-gap"
                  >
                    <Skeleton
                      className={`w-full h-[${220 + Math.floor(Math.random() * 180)}px] rounded-2xl bg-muted/80`}
                    />
                  </div>
                ))}
              </div>
            )}
            {!hasMorePins && pins.length === 0 && !isLoadingPins && (
              <div className="text-center py-16">
                <SearchIconLucide className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground">
                  No created pins yet
                </h3>
                <p className="text-muted-foreground mt-1">
                  @{userData.username} hasn't shared any pins.
                </p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="saved">
            <div className="text-center py-16">
              <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground">
                No saved pins yet
              </h3>
              <p className="text-muted-foreground mt-1">
                @{userData.username} hasn't saved any pins.
              </p>
               {currentUser && currentUser.id === userData.id && (
                 <Button asChild className="mt-6 rounded-full px-6" size="lg">
                    <Link href="/">Explore Pins</Link>
                 </Button>
               )}
            </div>
          </TabsContent>
        </Tabs>

        {isLoadingPins && pins.length > 0 && (
          <div className="h-20 w-full flex justify-center items-center mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        <div ref={pinsLoaderRef} className="h-1 w-full" aria-hidden="true" />
        {!hasMorePins && pins.length > 0 && activeTab === "created" && (
          <p className="text-center text-muted-foreground font-medium py-10 text-lg">
            ✨ End of @{userData.username}'s created pins! ✨
          </p>
        )}
      </div>
    </div>
  );
}

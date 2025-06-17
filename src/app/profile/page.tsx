"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import PinGrid from "@/components/pin-grid";
import type { Pin, Profile as UserProfileType } from "@/types"; // Renamed Profile to UserProfileType
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SlidersHorizontal,
  Plus,
  Edit2,
  Share2,
  Search as SearchIcon,
  Users,
  Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchProfileById } from "@/services/profileService";
import { fetchPinsByUserId } from "@/services/pinService";
// AppHeader is now globally available via AppClientLayout

const PINS_PER_PAGE = 18;

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();

  const [userProfile, setUserProfile] = useState<UserProfileType | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingPins, setIsLoadingPins] = useState(false);
  const [pinsPage, setPinsPage] = useState(1);
  const [hasMorePins, setHasMorePins] = useState(true);
  const pinsLoaderRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState("created");

  const loadUserProfile = useCallback(
    async (userId: string) => {
      setIsLoadingProfile(true);
      const { profile, error } = await fetchProfileById(userId);
      if (error || !profile) {
        toast({
          variant: "destructive",
          title: "Error fetching profile",
          description: error || "Profile not found.",
        });
        setUserProfile(null);
        router.push("/"); // Redirect if profile not found for logged-in user
      } else {
        setUserProfile(profile);
        setPins([]);
        setPinsPage(1);
        setHasMorePins(true);
        loadMorePins(userId, 1, true, activeTab);
      }
      setIsLoadingProfile(false);
    },
    [toast, router, activeTab],
  ); // Added activeTab

  useEffect(() => {
    const fetchUserSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        toast({
          variant: "destructive",
          title: "Not Authenticated",
          description: "Please log in to view your profile.",
        });
        router.push("/login");
        setIsLoadingProfile(false);
      }
    };
    fetchUserSession();
  }, [supabase.auth, router, toast, loadUserProfile]);

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
        // Placeholder for 'saved' pins - for now, show nothing or a message
        fetchedData = { pins: [], error: null };
        setHasMorePins(false); // No "saved" pins functionality yet
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

  useEffect(() => {
    if (userProfile?.id) {
      setPins([]);
      setPinsPage(1);
      setHasMorePins(true);
      loadMorePins(userProfile.id, 1, true, activeTab);
    }
  }, [activeTab, userProfile?.id, loadMorePins]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMorePins &&
          !isLoadingPins &&
          userProfile?.id &&
          activeTab === "created"
        ) {
          loadMorePins(userProfile.id, pinsPage, false, activeTab);
        }
      },
      { threshold: 0.8 },
    );

    const currentLoaderRef = pinsLoaderRef.current;
    if (currentLoaderRef && hasMorePins && activeTab === "created") {
      observer.observe(currentLoaderRef);
    }
    return () => {
      if (currentLoaderRef) observer.unobserve(currentLoaderRef);
    };
  }, [
    loadMorePins,
    hasMorePins,
    isLoadingPins,
    userProfile?.id,
    pinsPage,
    activeTab,
  ]);

  const handlePinClick = (pin: Pin) => {
    router.push(`/pin/${pin.id}`);
  };

  if (isLoadingProfile || !userProfile) {
    return (
      <div className="flex-1 flex flex-col animate-fade-in-up pt-8">
        <div className="container mx-auto px-4 pb-6 text-center">
          <Skeleton className="h-28 w-28 rounded-full mx-auto mb-4 bg-muted" />
          <Skeleton className="h-8 w-48 mx-auto mb-2 bg-muted" />
          <Skeleton className="h-5 w-32 mx-auto mb-3 bg-muted" />
          <Skeleton className="h-10 w-64 mx-auto bg-muted" />
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

  return (
    <div className="flex-1 flex flex-col animate-fade-in-up pt-8">
      <main className="flex-grow container mx-auto px-4 pb-6">
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-24 w-24 sm:h-28 sm:w-28 mb-4 border-4 border-card shadow-md">
            <AvatarImage
              src={userProfile.avatar_url || undefined}
              alt={userProfile.full_name || userProfile.username || "User"}
              data-ai-hint="profile avatar large"
            />
            <AvatarFallback className="text-4xl">
              {userProfile.full_name?.[0]?.toUpperCase() ||
                userProfile.username?.[0]?.toUpperCase() ||
                "U"}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-3xl sm:text-4xl font-bold font-headline">
            {userProfile.full_name || userProfile.username}
          </h1>
          {userProfile.username && (
            <p className="text-muted-foreground text-sm sm:text-base">
              @{userProfile.username}
            </p>
          )}
          {userProfile.bio && (
            <p className="max-w-md mt-2 text-foreground/80 text-sm sm:text-base">
              {userProfile.bio}
            </p>
          )}
          {userProfile.website && (
            <a
              href={
                !userProfile.website.startsWith("http")
                  ? `https://${userProfile.website}`
                  : userProfile.website
              }
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 text-sm text-primary hover:underline"
            >
              {userProfile.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          {/* <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
            <span><strong className="text-foreground">0</strong> followers</span>
            <span>·</span>
            <span><strong className="text-foreground">0</strong> following</span>
          </div> */}
          <div className="mt-6 flex gap-2">
            <Button
              variant="secondary"
              size="lg"
              className="rounded-full px-6 font-medium hover:bg-secondary/80 focus-ring"
            >
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="rounded-full px-6 font-medium hover:bg-secondary/80 focus-ring"
              onClick={() => router.push("/settings/profile")}
            >
              <Settings className="mr-2 h-4 w-4" /> Edit profile
            </Button>
          </div>
        </div>

        <div className="flex-1 container mx-auto px-0 sm:px-4 pb-8 mt-8">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="sticky top-[calc(var(--header-height)+var(--header-height))] sm:top-[var(--header-height)] bg-background/90 backdrop-blur-md z-10 py-3 -mx-2 sm:-mx-4 px-2 sm:px-4 border-b mb-6">
              <div className="flex items-center justify-between">
                <TabsList className="bg-transparent p-0 gap-2 sm:gap-3">
                  <TabsTrigger
                    value="created"
                    className="px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-medium rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/60 data-[state=inactive]:text-muted-foreground"
                  >
                    Created
                  </TabsTrigger>
                  <TabsTrigger
                    value="saved"
                    className="px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-medium rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/60 data-[state=inactive]:text-muted-foreground"
                  >
                    Saved
                  </TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <SlidersHorizontal className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                    onClick={() => router.push("/create")}
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                </div>
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
                      key={`skeleton-profile-created-${i}`}
                      className="break-inside-avoid mb-grid-gap"
                    >
                      <Skeleton
                        className={`w-full h-[${200 + Math.floor(Math.random() * 150)}px] rounded-2xl bg-muted/80`}
                      />
                    </div>
                  ))}
                </div>
              )}
              {!hasMorePins && pins.length === 0 && !isLoadingPins && (
                <div className="text-center py-16">
                  <SearchIcon className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground">
                    No created pins yet
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    Start creating and sharing your ideas!
                  </p>
                  <Button
                    className="mt-6 rounded-full px-6"
                    size="lg"
                    onClick={() => router.push("/create")}
                  >
                    Create Pin
                  </Button>
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
                  Explore and save pins you love to see them here.
                </p>
                <Button
                  className="mt-6 rounded-full px-6"
                  size="lg"
                  onClick={() => router.push("/")}
                >
                  Explore Pins
                </Button>
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
              ✨ You've explored all your created pins! ✨
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

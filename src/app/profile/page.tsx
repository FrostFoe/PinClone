"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PinGrid from "@/components/pin-grid";
import type { Pin, Profile as UserProfileType } from "@/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SlidersHorizontal,
  Plus,
  Settings,
  Share2,
  Search as SearchIcon,
  Users,
  AlertTriangle,
  Edit3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchProfileById } from "@/services/profileService";
import { fetchPinsByUserId } from "@/services/pinService";

export const dynamic = "force-dynamic";

const PINS_PER_PAGE = 18;

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();

  const [userProfile, setUserProfile] = useState<UserProfileType | null>(null);
  const [profileState, setProfileState] = useState<
    "loading" | "loaded" | "not_found" | "error"
  >("loading");
  const [pins, setPins] = useState<Pin[]>([]);
  const [isLoadingPins, setIsLoadingPins] = useState(false);
  const [pinsPage, setPinsPage] = useState(1);
  const [hasMorePins, setHasMorePins] = useState(true);
  const pinsLoaderRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState("created");

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
        // Placeholder for "Saved" tab (if you implement it)
        fetchedData = { pins: [], error: null };
        setHasMorePins(false); // For now, assume "Saved" has no content or is not paged
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
    async (userId: string) => {
      setProfileState("loading");
      const { profile, error } = await fetchProfileById(userId);

      if (error) {
        if (error === "Profile not found for this user ID.") {
          setProfileState("not_found");
        } else {
          setProfileState("error");
          toast({
            variant: "destructive",
            title: "Error fetching profile",
            description: error,
          });
        }
        setUserProfile(null);
      } else if (profile) {
        setUserProfile(profile);
        setProfileState("loaded");
        setPins([]);
        setPinsPage(1);
        setHasMorePins(true);
        // Initial pins load will be triggered by useEffect watching activeTab & userProfile.id
      } else {
        setProfileState("not_found");
        setUserProfile(null);
      }
    },
    [toast],
  );

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
        router.push("/login?next=/profile");
        setProfileState("error");
      }
    };
    fetchUserSession();
  }, [supabase.auth, router, toast, loadUserProfile]);

  useEffect(() => {
    if (userProfile?.id && activeTab && profileState === "loaded") {
      setPins([]);
      setPinsPage(1);
      setHasMorePins(true);
      loadMorePins(userProfile.id, 1, true, activeTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userProfile?.id, profileState]); // loadMorePins removed

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMorePins &&
          !isLoadingPins &&
          userProfile?.id &&
          activeTab === "created" && // Only paginate for "created" tab for now
          profileState === "loaded"
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
    profileState,
  ]);

  const handlePinClick = (pin: Pin) => {
    router.push(`/pin/${pin.id}`);
  };

  if (profileState === "loading") {
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

  if (profileState === "not_found" || profileState === "error") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-fade-in-up pt-8">
        <AlertTriangle className="h-20 w-20 text-amber-500 mb-6" />
        <h1 className="text-2xl font-bold text-foreground mb-3">
          {profileState === "not_found"
            ? "Profile Setup Incomplete"
            : "Error Loading Profile"}
        </h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          {profileState === "not_found"
            ? "Your profile information is missing. Please complete your profile setup in the settings."
            : "We couldn't load your profile information. Please try again later or contact support."}
        </p>
        {profileState === "not_found" && (
          <Button
            size="lg"
            className="rounded-full px-8"
            onClick={() => router.push("/settings/profile")}
          >
            <Edit3 className="mr-2 h-5 w-5" /> Go to Settings
          </Button>
        )}
      </div>
    );
  }

  if (!userProfile) {
    // Should be covered by profileState checks, but as a fallback
    return (
      <div className="flex-1 flex items-center justify-center">
        <p>An unexpected error occurred.</p>
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

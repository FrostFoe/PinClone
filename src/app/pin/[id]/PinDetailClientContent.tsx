
"use client";

import type { Pin } from "@/types";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Maximize2,
  Search as SearchIconLucide,
  Link2,
  Download,
  Flag,
  Code2,
  Send,
  Smile,
  MoreHorizontal,
  Loader2,
  LogIn,
} from "lucide-react";
import PinGrid from "@/components/pin-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPinById, fetchPinsByUserId } from "@/services/pinService";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import dynamic from "next/dynamic";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const ImageZoomModal = dynamic(() => import("@/components/image-zoom-modal"), {
  loading: () => (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Loader2 className="h-10 w-10 animate-spin text-white" />
    </div>
  ),
  ssr: false,
});

const RELATED_PINS_LIMIT = 10;

interface PinDetailClientContentProps {
  params: { id: string };
}

export default function PinDetailClientContent({
  params: routeParams,
}: PinDetailClientContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const pinId = routeParams?.id as string;
  const supabase = createSupabaseBrowserClient();

  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [pinDetail, setPinDetail] = useState<Pin | null>(null);
  const [relatedPins, setRelatedPins] = useState<Pin[]>([]);
  const [isLoadingPin, setIsLoadingPin] = useState(true);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const [relatedPage, setRelatedPage] = useState(1);
  const [hasMoreRelated, setHasMoreRelated] = useState(true);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);

  useEffect(() => {
    console.log("[PinDetailClient] Component mounted/updated. Pin ID from params:", pinId);
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user ?? null);
      console.log("[PinDetailClient] Current user session:", session?.user?.id || "No user");
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      console.log("[PinDetailClient] Auth state changed. New user:", session?.user?.id || "No user");
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, pinId]);


  const loadPinDetails = useCallback(
    async (id: string) => {
      console.log(`[PinDetailClient] loadPinDetails called for ID: ${id}`);
      setIsLoadingPin(true);
      setPinDetail(null); // Reset pin detail on new load
      setRelatedPins([]); // Reset related pins
      setRelatedPage(1); // Reset related pins page
      setHasMoreRelated(true); // Reset hasMoreRelated

      const { pin, error } = await fetchPinById(id);
      if (error || !pin) {
        console.error(`[PinDetailClient] Error fetching pin ${id}:`, error || "Pin not found.");
        toast({
          variant: "destructive",
          title: "Error",
          description: error || "Pin not found.",
        });
        router.push("/not-found"); // Redirect to a generic not-found page
      } else {
        console.log(`[PinDetailClient] Successfully fetched pin ${id}:`, pin);
        setPinDetail(pin);
        if (typeof document !== "undefined") {
          document.title = `${pin.title || "Pin"} by ${pin.uploader?.username || "User"} | Pinclone`;
        }
      }
      setIsLoadingPin(false);
      console.log(`[PinDetailClient] Finished loadPinDetails for ID: ${id}. isLoadingPin: false`);
    },
    [toast, router],
  );

  const loadMoreRelatedPins = useCallback(
    async (
      userId: string,
      pageToLoad: number,
      initialLoad = false,
      currentPinId: string,
    ) => {
      console.log(`[PinDetailClient] loadMoreRelatedPins called for user ${userId}, page ${pageToLoad}, initial: ${initialLoad}`);
      if (isLoadingRelated && !initialLoad) {
        console.log("[PinDetailClient] loadMoreRelatedPins: Already fetching related pins.");
        return;
      }
      if (!hasMoreRelated && !initialLoad) {
        console.log("[PinDetailClient] loadMoreRelatedPins: No more related pins to fetch.");
        return;
      }

      setIsLoadingRelated(true);
      const { pins: newPins, error } = await fetchPinsByUserId(
        userId,
        pageToLoad,
        RELATED_PINS_LIMIT,
      );

      if (error) {
        console.error(`[PinDetailClient] Error fetching related pins for user ${userId}:`, error);
        toast({
          variant: "destructive",
          title: "Error fetching related pins",
          description: error,
        });
        setHasMoreRelated(false);
      } else {
        const filteredNewPins = newPins.filter((p) => p.id !== currentPinId);
        console.log(`[PinDetailClient] Fetched ${newPins.length} related pins, ${filteredNewPins.length} after filtering current pin.`);
        if (filteredNewPins.length > 0) {
          setRelatedPins((prevPins) =>
            initialLoad ? filteredNewPins : [...prevPins, ...filteredNewPins],
          );
          setRelatedPage(pageToLoad + 1);
          if (newPins.length < RELATED_PINS_LIMIT) {
            console.log("[PinDetailClient] loadMoreRelatedPins: Fetched less than limit, no more related pins.");
            setHasMoreRelated(false);
          }
        } else if (newPins.length === 0 || (newPins.length <= 1 && newPins.some(p => p.id === currentPinId))) {
          // This condition checks if no new pins were fetched, or if the only pins fetched were the current one (and thus filtered out)
           console.log("[PinDetailClient] loadMoreRelatedPins: No new related pins found or only current pin fetched.");
           setHasMoreRelated(false);
        }
      }
      setIsLoadingRelated(false);
      console.log(`[PinDetailClient] Finished loadMoreRelatedPins for user ${userId}. isLoadingRelated: false, hasMoreRelated: ${hasMoreRelated}`);
    },
    [toast, isLoadingRelated, hasMoreRelated],
  );

  useEffect(() => {
    if (pinId) {
      console.log(`[PinDetailClient] useEffect (pinId watcher): pinId is ${pinId}, calling loadPinDetails.`);
      loadPinDetails(pinId);
    } else {
      console.warn("[PinDetailClient] useEffect (pinId watcher): pinId is missing.");
    }
  }, [pinId, loadPinDetails]);

  useEffect(() => {
    if (pinDetail?.user_id && pinDetail.id) {
      console.log(`[PinDetailClient] useEffect (pinDetail watcher): Pin detail loaded for user ${pinDetail.user_id}. Fetching initial related pins.`);
      // Reset related pins state before loading new ones for the current pinDetail
      setRelatedPins([]);
      setRelatedPage(1);
      setHasMoreRelated(true);
      loadMoreRelatedPins(pinDetail.user_id, 1, true, pinDetail.id);
    } else {
      console.log("[PinDetailClient] useEffect (pinDetail watcher): No pinDetail or user_id, skipping related pins load.");
    }
  }, [pinDetail?.id, pinDetail?.user_id, loadMoreRelatedPins]); // key dependency is pinDetail.id to reload when pin changes

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreRelated &&
          !isLoadingRelated &&
          pinDetail?.user_id &&
          pinDetail.id
        ) {
          console.log("[PinDetailClient] IntersectionObserver: Loader visible, fetching more related pins.");
          loadMoreRelatedPins(
            pinDetail.user_id,
            relatedPage,
            false,
            pinDetail.id,
          );
        }
      },
      { threshold: 0.8 },
    );

    const currentLoaderRef = loaderRef.current;
    if (currentLoaderRef && hasMoreRelated) {
      observer.observe(currentLoaderRef);
    }
    return () => {
      if (currentLoaderRef) observer.unobserve(currentLoaderRef);
    };
  }, [
    loadMoreRelatedPins,
    hasMoreRelated,
    isLoadingRelated,
    pinDetail, // Ensure observer re-evaluates if pinDetail changes
    relatedPage,
  ]);

  const openZoomModal = () => {
    if (pinDetail) setIsZoomModalOpen(true);
  };

  console.log(`[PinDetailClient] Rendering. isLoadingPin: ${isLoadingPin}, pinDetail: ${pinDetail ? pinDetail.id : 'null'}`);

  if (isLoadingPin) {
    return (
      <div className="flex flex-col min-h-screen bg-background animate-fade-in">
        <div className="sticky top-[var(--header-height)] z-20 h-[var(--header-height)] bg-background/80 backdrop-blur-md flex items-center px-4 border-b">
          <Skeleton className="h-8 w-8 rounded-full mr-2" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-9 w-20 ml-auto rounded-full" />
        </div>
        <div className="mx-auto my-4 sm:my-8 w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl p-2 sm:p-4">
          <div className="bg-card rounded-3xl shadow-card overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-6 p-4 sm:p-6 md:p-8">
              <Skeleton className="lg:w-1/2 aspect-[3/4] rounded-2xl bg-muted/80" />
              <div className="lg:w-1/2 space-y-6">
                <Skeleton className="h-10 w-3/4 rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-32 rounded-md" />
                    <Skeleton className="h-4 w-24 rounded-md" />
                  </div>
                  <Skeleton className="h-10 w-24 rounded-full" />
                </div>
                <Skeleton className="h-6 w-1/3 mt-4 rounded-md" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-12 flex-1 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!pinDetail) {
    // This state should ideally be brief if loadPinDetails pushes to /not-found on error.
    // If it lingers, it means loadPinDetails didn't redirect but also didn't set pinDetail.
    console.warn("[PinDetailClient] Rendering with no pinDetail and not loading. This might indicate an issue.");
    return (
      <div className="flex flex-col min-h-screen bg-background justify-center items-center p-8 animate-fade-in">
        <SearchIconLucide className="h-24 w-24 text-muted-foreground/50 mb-6" />
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Pin Information Unavailable
        </h1>
        <p className="text-lg text-muted-foreground mb-8 text-center">
          We couldn't load the details for this pin. It might have been removed or there was a temporary issue.
        </p>
        <Button
          onClick={() => router.push("/")}
          size="lg"
          className="rounded-full px-8"
        >
          <ArrowLeft className="mr-2 h-5 w-5" /> Go Back Home
        </Button>
      </div>
    );
  }

  const displayWidth = pinDetail.width || 600;
  const displayHeight = pinDetail.height || displayWidth * 1.2;

  return (
    <>
      <div className="flex flex-col min-h-[calc(100vh-var(--header-height))] bg-background animate-fade-in">
        <div className="sticky top-[var(--header-height)] z-30 bg-background/90 backdrop-blur-md flex items-center px-2 sm:px-4 border-b h-[var(--header-height)]">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            aria-label="Go back"
            className="mr-1 sm:mr-2 rounded-full text-foreground/80 hover:text-primary hover:bg-primary/10"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          {pinDetail.uploader && (
            <Link
              href={`/u/${pinDetail.uploader.username}`}
              className="flex items-center gap-2 overflow-hidden group"
            >
              <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                <AvatarImage
                  src={pinDetail.uploader.avatar_url || undefined}
                  alt={
                    pinDetail.uploader.full_name ||
                    pinDetail.uploader.username ||
                    "Uploader"
                  }
                  data-ai-hint="uploader avatar small"
                />
                <AvatarFallback>
                  {pinDetail.uploader.full_name?.[0]?.toUpperCase() ||
                    pinDetail.uploader.username?.[0]?.toUpperCase() ||
                    "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="font-semibold text-sm truncate group-hover:text-primary">
                  {pinDetail.uploader.full_name || pinDetail.uploader.username}
                </p>
                {pinDetail.uploader.username && (
                  <p className="text-xs text-muted-foreground truncate">
                    @{pinDetail.uploader.username}
                  </p>
                )}
              </div>
            </Link>
          )}
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="More options"
                  className="rounded-full text-foreground/80 hover:text-primary hover:bg-primary/10"
                >
                  <MoreHorizontal className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="shadow-modal">
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" /> Download image
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link2 className="mr-2 h-4 w-4" /> Copy link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Flag className="mr-2 h-4 w-4" /> Report Pin
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Code2 className="mr-2 h-4 w-4" /> Get Pin embed code
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {currentUser ? (
              <Button
                size="lg"
                className="rounded-full px-5 sm:px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Save
              </Button>
            ) : (
              <Button asChild size="lg" className="rounded-full px-5 sm:px-6">
                <Link href={`/login?next=${encodeURIComponent(pathname)}`}>
                  <LogIn className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Save
                </Link>
              </Button>
            )}
          </div>
        </div>

        <main className="flex-grow pb-16">
          <div className="mt-4 sm:mt-8 mx-auto w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl px-2 sm:px-4">
            <div className="bg-card rounded-3xl shadow-xl overflow-hidden">
              <div className="flex flex-col lg:flex-row gap-0">
                <div
                  className="lg:w-[55%] xl:w-1/2 bg-muted/30 flex justify-center items-center p-4 sm:p-6 md:p-8 relative group cursor-pointer"
                  onClick={openZoomModal}
                >
                  {pinDetail.image_url ? (
                    <Image
                      src={pinDetail.image_url}
                      alt={pinDetail.title || "Pin image"}
                      width={displayWidth > 800 ? 800 : displayWidth}
                      height={
                        (displayWidth > 800 ? 800 : displayWidth) /
                        (displayWidth / displayHeight)
                      }
                      className="rounded-2xl object-contain w-full h-full max-h-[75vh] shadow-md"
                      data-ai-hint={pinDetail.title || "pin detail"}
                      priority
                      sizes="(max-width: 1280px) 50vw, (max-width: 1024px) 55vw, 800px"
                    />
                  ) : (
                    <Skeleton className="w-full h-[400px] rounded-2xl" />
                  )}
                  <div className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5 flex flex-col gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="rounded-full h-10 w-10 bg-black/40 hover:bg-black/60 text-white border-none shadow-md"
                      aria-label="Zoom image"
                      onClick={(e) => {
                        e.stopPropagation();
                        openZoomModal();
                      }}
                    >
                      <Maximize2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="lg:w-[45%] xl:w-1/2 flex flex-col p-4 sm:p-6 md:p-8">
                  {pinDetail.title && (
                    <h1 className="text-2xl sm:text-3xl font-bold font-headline leading-tight mb-3">
                      {pinDetail.title}
                    </h1>
                  )}
                  {pinDetail.description && (
                    <p className="text-base text-foreground/80 mb-6 leading-relaxed whitespace-pre-wrap">
                      {pinDetail.description}
                    </p>
                  )}

                  {pinDetail.uploader && (
                    <div className="flex items-center justify-between mb-6">
                      <Link
                        href={`/u/${pinDetail.uploader.username}`}
                        className="flex items-center gap-3 group focus-ring rounded-full p-1 -m-1"
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={pinDetail.uploader.avatar_url || undefined}
                            alt={
                              pinDetail.uploader.full_name ||
                              pinDetail.uploader.username ||
                              "Uploader"
                            }
                            data-ai-hint="uploader avatar large"
                          />
                          <AvatarFallback className="text-lg">
                            {pinDetail.uploader.full_name?.[0]?.toUpperCase() ||
                              pinDetail.uploader.username?.[0]?.toUpperCase() ||
                              "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-md group-hover:text-primary transition-colors">
                            {pinDetail.uploader.full_name ||
                              pinDetail.uploader.username}
                          </p>
                          {pinDetail.uploader.username && (
                            <p className="text-sm text-muted-foreground">
                              @{pinDetail.uploader.username}
                            </p>
                          )}
                        </div>
                      </Link>
                      {currentUser && currentUser.id !== pinDetail.user_id && (
                        <Button
                          variant="secondary"
                          className="rounded-full px-5 h-10 text-sm font-medium hover:bg-secondary/80 focus-ring"
                        >
                          Follow
                        </Button>
                      )}
                       {!currentUser && (
                         <Button asChild variant="secondary" className="rounded-full px-5 h-10 text-sm font-medium hover:bg-secondary/80 focus-ring">
                            <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Follow</Link>
                         </Button>
                       )}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground mb-6">
                    Uploaded{" "}
                    {formatDistanceToNow(new Date(pinDetail.created_at), {
                      addSuffix: true,
                    })}
                  </div>

                  <div className="mt-auto">
                    <h3 className="font-semibold text-lg mb-3">Comments (0)</h3>
                     {currentUser ? (
                        <>
                        <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
                        <p className="text-sm text-muted-foreground">
                            No comments yet. Be the first to share your thoughts!
                        </p>
                        </div>
                        <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 mt-1">
                            <AvatarImage
                            src={currentUser.user_metadata?.avatar_url || "https://placehold.co/40x40.png?text=Me"}
                            alt="Your avatar"
                            data-ai-hint="profile avatar current user"
                            />
                            <AvatarFallback>
                                {currentUser.email?.[0]?.toUpperCase() || "Me"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 relative">
                            <Textarea
                            placeholder="Add a comment..."
                            className="rounded-2xl pr-20 min-h-[48px] py-3 text-sm resize-none focus-ring"
                            rows={1}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-primary rounded-full"
                            >
                                <Smile className="h-5 w-5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-primary rounded-full"
                            >
                                <Send className="h-5 w-5" />
                            </Button>
                            </div>
                        </div>
                        </div>
                        </>
                    ) : (
                        <div className="text-center p-4 border rounded-lg bg-muted/50">
                            <p className="text-muted-foreground">
                                <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="text-primary hover:underline font-semibold">
                                Log in
                                </Link>{" "}
                                or{" "}
                                <Link href={`/signup?next=${encodeURIComponent(pathname)}`} className="text-primary hover:underline font-semibold">
                                Sign up
                                </Link>{" "}
                                to leave a comment.
                            </p>
                        </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {(relatedPins.length > 0 ||
            (isLoadingRelated && relatedPins.length === 0)) && (
            <div className="mt-12 sm:mt-16 container mx-auto px-2 sm:px-4">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center font-headline">
                More like this
              </h2>
              <PinGrid
                pins={relatedPins}
                onPinClick={(pin) => router.push(`/pin/${pin.id}`)}
                showPinDetailsOverlay={true}
              />
              {isLoadingRelated && relatedPins.length === 0 && ( // Show skeletons only if related pins are loading and list is empty
                <div className="masonry-grid px-grid-gap md:px-0 mt-grid-gap">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={`skeleton-related-${i}`}
                      className="break-inside-avoid mb-grid-gap"
                    >
                      <Skeleton
                        className={`w-full h-[${180 + Math.floor(Math.random() * 150)}px] rounded-2xl bg-muted/80`}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div
                ref={loaderRef}
                className="h-20 w-full flex justify-center items-center"
                aria-hidden="true"
              >
                {isLoadingRelated && relatedPins.length > 0 && ( // Show spinner only if loading more and some pins are already there
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                )}
              </div>
              {!hasMoreRelated && relatedPins.length > 0 && (
                <p className="text-center text-muted-foreground font-medium py-10 text-lg">
                  ✨ You've explored all related pins! ✨
                </p>
              )}
              {!hasMoreRelated &&
                relatedPins.length === 0 &&
                !isLoadingRelated &&
                pinDetail && ( // Only show this if not loading and no related pins were ever found
                  <p className="text-center text-muted-foreground py-8">
                    No more pins from this uploader.
                  </p>
                )}
            </div>
          )}
        </main>
      </div>
      <Suspense
        fallback={
          <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
          </div>
        }
      >
        {pinDetail && isZoomModalOpen && (
          <ImageZoomModal
            pin={pinDetail}
            isOpen={isZoomModalOpen}
            onClose={() => setIsZoomModalOpen(false)}
          />
        )}
      </Suspense>
    </>
  );
}

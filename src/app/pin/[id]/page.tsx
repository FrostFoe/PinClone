
'use client';

import type { Pin, Uploader } from '@/types';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Upload,
  MoreHorizontal,
  ChevronDown,
  Maximize2,
  Search,
} from 'lucide-react';
import PinGrid from '@/components/pin-grid';
import { Skeleton } from '@/components/ui/skeleton';

const PINS_PER_PAGE = 15; // For "More like this"

// Simulated fetch function for a single pin
const fetchPinById = async (id: string): Promise<Pin | null> => {
  // In a real app, you'd fetch this from your backend
  // For simulation, we'll generate one, trying to make it consistent if id is just a number
  const numericId = parseInt(id.replace('pin-', ''), 10);
  if (isNaN(numericId)) return null;

  // Basic details, can be expanded
  const widths = [600, 700, 800];
  const heightRatios = [0.7, 1, 1.3, 1.5];
   const hints = [
    'anime art', 'cute illustration', 'meme relatable', 'chibi character', 
    'fan art', 'digital painting', 'adorable expression', 'kawaii style',
    'funny moments', 'sticker design'
  ];
  const titles = [
    "So Cute!", "Gimme Attention", "Pwease?", "Mood.", 
    "Relatable Content", "Sweet Face", "Tiny Friend", "Heart Melter",
    "Just Baby Things", "Need Cuddles"
  ];
   const descriptions = [
    "An absolutely adorable depiction of a popular character.",
    "This little one just wants some love and attention.",
    "The cutest plea you'll see all day!",
    "Current mood: this little guy.",
    "We've all been there, haven't we?",
    "Look at that sweet, innocent face!",
    "A tiny character with a huge personality.",
    "This image is guaranteed to melt your heart.",
    "Capturing the essence of babyhood.",
    "Who wouldn't want to give this cutie a cuddle?"
  ];
  const uploaderNames = ["Shazz", "AnimeLover22", "MemeQueen", "KawaiiArtist", "FanArtCentral"];
  const uploaderUsernames = ["shazz_uploads", "animeluv", "meme_q", "kawaii_art", "fanart_central"];

  const randomIndex = numericId % hints.length;
  const randomWidth = widths[numericId % widths.length];
  const randomHeight = Math.round(randomWidth * heightRatios[numericId % heightRatios.length]);

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: `pin-${numericId}`,
        alt: `Detailed view of pin ${numericId} - ${hints[randomIndex]}`,
        width: randomWidth,
        height: randomHeight,
        placeholderId: `ph-detail-${numericId}`,
        aiHint: hints[randomIndex],
        title: titles[randomIndex],
        description: descriptions[randomIndex],
        likes: Math.floor(Math.random() * 500) + 50, // Ensure some likes
        uploader: {
          name: uploaderNames[numericId % uploaderNames.length],
          avatarUrl: `https://placehold.co/40x40.png?text=${uploaderNames[numericId % uploaderNames.length][0]}`,
          username: uploaderUsernames[numericId % uploaderUsernames.length],
        },
      });
    }, 300);
  });
};

// Simulated fetch for related pins (reusing homepage logic for now)
const generateRandomRelatedPin = (id: number): Pin => {
  const widths = [250, 300, 350, 400];
  const heightRatios = [1.2, 1.5, 1.8, 0.8, 0.6];
   const hints = [
    'anime art', 'cute illustration', 'meme relatable', 'chibi character', 
    'fan art', 'digital painting', 'adorable expression', 'kawaii style',
    'funny moments', 'sticker design'
  ];
  const randomIndex = Math.floor(Math.random() * hints.length);
  const randomWidth = widths[Math.floor(Math.random() * widths.length)];
  const randomHeight = Math.round(randomWidth * heightRatios[Math.floor(Math.random() * heightRatios.length)]);
  
  return {
    id: `related-pin-${id}-${Math.random().toString(36).substring(7)}`, // Ensure unique IDs
    alt: `Related pin image ${id} - ${hints[randomIndex]}`,
    width: randomWidth,
    height: randomHeight,
    placeholderId: `ph-related-${id}`,
    aiHint: hints[randomIndex],
    likes: Math.floor(Math.random() * 100),
     uploader: {
      name: "Community Artist",
      avatarUrl: `https://placehold.co/40x40.png?text=C`,
      username: "communityartist",
    },
  };
};

const fetchRelatedPins = async (pinId: string, page: number): Promise<Pin[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newPins: Pin[] = [];
      for (let i = 0; i < PINS_PER_PAGE; i++) {
        newPins.push(generateRandomRelatedPin(page * PINS_PER_PAGE + i));
      }
      resolve(newPins.filter(p => p.id !== pinId)); // Exclude the main pin if it appears
    }, 500);
  });
};


export default function PinDetailPage() {
  const router = useRouter();
  const params = useParams();
  const pinId = params?.id as string;

  const [pinDetail, setPinDetail] = useState<Pin | null>(null);
  const [relatedPins, setRelatedPins] = useState<Pin[]>([]);
  const [isLoadingPin, setIsLoadingPin] = useState(true);
  const [isLoadingRelated, setIsLoadingRelated] = useState(true); // Changed initial state
  const [relatedPage, setRelatedPage] = useState(0);
  const [hasMoreRelated, setHasMoreRelated] = useState(true);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (pinId) {
      setIsLoadingPin(true);
      fetchPinById(pinId).then((data) => {
        setPinDetail(data);
        setIsLoadingPin(false);
      });
    }
  }, [pinId]);

  const loadMoreRelatedPins = useCallback(async () => {
    if (isLoadingRelated && relatedPage !== 0) return; // Prevent multiple loads if already loading, unless initial
    if (!hasMoreRelated || !pinId) return;
    
    setIsLoadingRelated(true);
    const newPins = await fetchRelatedPins(pinId, relatedPage);
    if (newPins.length > 0) {
      setRelatedPins((prevPins) => [...prevPins, ...newPins]);
      setRelatedPage((prevPage) => prevPage + 1);
    } else {
      setHasMoreRelated(false);
    }
    setIsLoadingRelated(false);
  }, [pinId, relatedPage, isLoadingRelated, hasMoreRelated]);


  useEffect(() => {
    if (pinId) {
      // Reset related pins when pinId changes
      setRelatedPins([]);
      setRelatedPage(0);
      setHasMoreRelated(true);
      setIsLoadingRelated(true); // Set to true before initial load
      // Initial load for related pins
      loadMoreRelatedPins();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinId]); // Removed loadMoreRelatedPins from deps to avoid re-triggering on its own change


  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRelated && !isLoadingRelated) {
          loadMoreRelatedPins();
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
  }, [loadMoreRelatedPins, hasMoreRelated, isLoadingRelated]);


  if (isLoadingPin) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="mx-auto my-8 w-full max-w-4xl lg:max-w-5xl p-4">
          {/* Simplified Skeleton for header bar */}
          <Skeleton className="h-14 w-full mb-4 rounded-t-2xl" /> 
          <div className="flex flex-col lg:flex-row gap-8 p-4 sm:p-6 md:p-8 lg:p-0"> {/* Added padding for smaller screens, removed for lg */}
            <Skeleton className="lg:w-1/2 h-[50vh] sm:h-[60vh] rounded-2xl" />
            <div className="lg:w-1/2 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-20 w-full" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                 <Skeleton className="h-9 w-20 ml-auto rounded-full" />
              </div>
              <Skeleton className="h-10 w-full mt-4" /> {/* Comments title placeholder */}
              <div className="flex items-center gap-3">
                 <Skeleton className="h-10 w-10 rounded-full" />
                 <Skeleton className="h-10 flex-1 rounded-full" />
              </div>
            </div>
          </div>
        </div>
        {/* Skeleton for "More like this" */}
        <div className="mt-10 sm:mt-16 container mx-auto px-2 sm:px-4">
            <Skeleton className="h-8 w-1/3 mx-auto mb-6" />
            <div className="masonry-grid px-grid-gap md:px-0 mt-grid-gap">
              {[...Array(5)].map((_, i) => (
                <div key={`skeleton-related-loading-${i}`} className="break-inside-avoid mb-grid-gap">
                  <Skeleton className={`w-full h-[${150 + Math.random() * 150}px] rounded-2xl`} />
                </div>
              ))}
            </div>
        </div>
      </div>
    );
  }

  if (!pinDetail) {
    return (
      <div className="flex flex-col min-h-screen bg-background justify-center items-center">
        <p className="text-xl text-muted-foreground">Pin not found.</p>
        <Button onClick={() => router.push('/')} className="mt-4">Go Home</Button>
      </div>
    );
  }
  
  const mainImageWidth = pinDetail.width > 800 ? 800 : pinDetail.width;
  const mainImageHeight = (mainImageWidth / pinDetail.width) * pinDetail.height;

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-12">
        <div className="bg-card rounded-b-2xl sm:rounded-2xl shadow-xl mx-auto my-0 sm:my-8 w-full max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl flex flex-col">
          {/* Top action bar */}
          <div className="p-3 sm:p-4 flex items-center justify-between border-b sticky top-0 sm:relative bg-card rounded-t-2xl z-10">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
                <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Like pin">
                <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
                {pinDetail.likes !== undefined && (
                  <span className="ml-1 text-xs sm:text-sm font-medium">{pinDetail.likes}</span>
                )}
              </Button>
              <Button variant="ghost" size="icon" aria-label="Comment on pin">
                <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Share pin">
                <Upload className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="More options">
                <MoreHorizontal className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="px-2 sm:px-3 py-1 sm:py-1.5 h-auto text-xs sm:text-sm hidden md:flex items-center">
                    Profile <ChevronDown className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View Profile</DropdownMenuItem>
                  <DropdownMenuItem>My Pins</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button className="px-3 sm:px-4 py-1.5 sm:py-2 h-auto text-xs sm:text-sm">Save</Button>
            </div>
          </div>

          {/* Main content: image and details */}
          <div className="flex flex-col lg:flex-row p-3 sm:p-4 md:p-6 lg:p-8 gap-4 md:gap-6 lg:gap-8">
            {/* Left: Image */}
            <div className={`lg:w-1/2 bg-muted rounded-2xl flex justify-center items-center p-2 relative aspect-[${pinDetail.width}/${pinDetail.height}] max-h-[80vh]`}>
              <Image
                src={`https://placehold.co/${pinDetail.width}x${pinDetail.height}.png`}
                alt={pinDetail.alt}
                width={mainImageWidth}
                height={mainImageHeight}
                className="rounded-xl object-contain w-full h-full max-h-[75vh]"
                data-ai-hint={pinDetail.aiHint}
                unoptimized={true}
                priority
              />
              <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 flex flex-col gap-2">
                <Button variant="secondary" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10" aria-label="Zoom image">
                  <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button variant="secondary" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10" aria-label="Search similar images">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>

            {/* Right: Details */}
            <div className="lg:w-1/2 flex flex-col gap-4 pt-4 lg:pt-0">
              {pinDetail.title && <h1 className="text-xl sm:text-2xl font-bold font-headline leading-tight">{pinDetail.title}</h1>}
              {pinDetail.description && <p className="text-sm sm:text-base text-foreground/80">{pinDetail.description}</p>}
              
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                    <AvatarImage src={pinDetail.uploader?.avatarUrl || `https://placehold.co/40x40.png`} alt={pinDetail.uploader?.name || 'Uploader'} data-ai-hint="user avatar" />
                    <AvatarFallback>{pinDetail.uploader?.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm sm:text-base">{pinDetail.uploader?.name || 'User Name'}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">@{pinDetail.uploader?.username || 'username'}</p>
                  </div>
                </div>
                <Button variant="secondary" className="text-xs sm:text-sm px-3 py-1.5 h-auto">Follow</Button>
              </div>

              <div className="mt-4">
                <h3 className="font-semibold mb-2 text-base sm:text-lg">Comments</h3>
                {/* Placeholder for actual comments list */}
                <p className="text-sm text-muted-foreground mb-3">No comments yet. Be the first!</p>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                    <AvatarImage src="https://placehold.co/40x40.png" alt="Current user" data-ai-hint="profile avatar current" />
                    <AvatarFallback>Y</AvatarFallback>
                  </Avatar>
                  <Input placeholder="Add a comment..." className="rounded-full h-10 text-sm sm:text-base"/>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* "More like this" section */}
        <div className="mt-10 sm:mt-16 container mx-auto px-2 sm:px-4">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center font-headline">More like this</h2>
          <PinGrid pins={relatedPins} onPinClick={(pin) => router.push(`/pin/${pin.id}`)} />
          {isLoadingRelated && relatedPins.length === 0 && ( // Show skeleton only if no pins loaded yet
             <div className="masonry-grid px-grid-gap md:px-0 mt-grid-gap">
              {[...Array(5)].map((_, i) => (
                <div key={`skeleton-related-${i}`} className="break-inside-avoid mb-grid-gap">
                  <Skeleton className={`w-full h-[${150 + Math.random() * 150}px] rounded-2xl`} />
                </div>
              ))}
            </div>
          )}
          <div ref={loaderRef} className="h-10 w-full" aria-hidden="true" />
          {!hasMoreRelated && relatedPins.length > 0 && (
            <p className="text-center text-muted-foreground py-8">No more related pins to show.</p>
          )}
           {!hasMoreRelated && relatedPins.length === 0 && !isLoadingRelated && (
             <p className="text-center text-muted-foreground py-8">No related pins found.</p>
           )}
        </div>
      </main>
    </div>
  );
}

    

'use client';

import type { Pin } from '@/types';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link'; // Added missing import
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  Link2,
  Download,
  Flag,
  Code2,
  Send,
  Smile,
} from 'lucide-react';
import PinGrid from '@/components/pin-grid';
import { Skeleton } from '@/components/ui/skeleton';
import ImageZoomModal from '@/components/image-zoom-modal';

const PINS_PER_PAGE_RELATED = 15;

const fetchPinById = async (id: string): Promise<Pin | null> => {
  const numericId = parseInt(id.replace(/pin-(homepage|related|user)-/i, ''), 10);
  if (isNaN(numericId)) return null;

  const hints = [ 'anime art', 'cute illustration', 'meme relatable', 'chibi character', 'fan art', 'digital painting', 'adorable expression', 'kawaii style', 'funny moments', 'sticker design', 'concept art', 'character sketch' ];
  const titles = [ "Adorable Doodle", "Expressive Eyes", "Funny Reaction", "Chibi Cutie", "Masterpiece", "Digital Wonder", "Sweet Smile", "Kawaii Overload", "LOL Moment", "Perfect Sticker", "Imaginative World", "Quick Sketch" ];
  const descriptions = [ "An incredibly charming anime-style illustration that brightens the day.", "This artwork features captivatingly expressive eyes that tell a story.", "A relatable and humorous meme capturing a universal feeling.", "An irresistibly cute chibi character that will melt your heart.", "A stunning piece of fan art showcasing incredible talent and dedication.", "A breathtaking digital painting with rich colors and intricate details.", "The most adorable and heartwarming smile you'll encounter today.", "An explosion of kawaii (cuteness) in this delightful artwork.", "A genuinely funny moment perfectly captured in this image.", "This design would make an amazing sticker for any collection.", "Explore a new world with this stunning piece of concept art.", "A detailed character sketch showing the artist's process." ];
  const uploaderNames = ["Shazz", "AnimeFanatic", "MemeLord", "KawaiiDreams", "ArtCollector", "DigiPainter", "SmileMaker", "ChibiWorld", "FunnyFinds", "StickerStar", "ConceptKing", "SketchArtist"];
  const uploaderUsernames = ["shazzy", "anime_fan_22", "meme_lord_99", "kawaii_dreams_art", "art_collector_gallery", "digi_painter_pro", "smile_maker_studio", "chibi_world_creations", "funny_finds_daily", "sticker_star_designs", "concept_king_art", "sketch_artist_folio"];
  const avatarPlaceholders = ['SZ', 'AF', 'ML', 'KD', 'AC', 'DP', 'SM', 'CW', 'FF', 'SS', 'CK', 'SA'];


  const randomIndex = numericId % hints.length;
  const baseWidth = 600 + (numericId % 5) * 50; // 600 to 800
  const heightRatio = 0.6 + (numericId % 10) * 0.1; // 0.6 to 1.5

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: `pin-detail-${numericId}`,
        alt: `Detailed view of pin: ${hints[randomIndex]}`,
        width: baseWidth,
        height: Math.round(baseWidth * heightRatio),
        placeholderId: `ph-detail-${numericId}`,
        aiHint: hints[randomIndex],
        title: titles[randomIndex],
        description: descriptions[randomIndex],
        likes: Math.floor(Math.random() * 1200) + 100,
        uploader: {
          name: uploaderNames[randomIndex],
          avatarUrl: `https://placehold.co/80x80.png?text=${avatarPlaceholders[randomIndex]}`,
          username: uploaderUsernames[randomIndex],
        },
        tags: ['illustration', hints[randomIndex].split(' ')[0], hints[randomIndex].split(' ')[1]].filter(Boolean).slice(0,3)
      });
    }, 400);
  });
};

const generateRandomRelatedPin = (id: number, mainPinHint: string = ''): Pin => {
  const widths = [250, 300, 350, 400];
  const heightRatios = [1.2, 1.5, 1.8, 0.8, 0.6, 1.0];
  const hints = [ 'anime art', 'cute illustration', 'meme relatable', 'chibi character', 'fan art', 'digital painting', 'adorable expression', 'kawaii style', 'funny moments', 'sticker design', 'vector art', 'pixel art' ];
  const uploaderNames = ["CommunityArtist", "CreativeSoul", "InspirationHub", "ArtSharer"];
  const avatarPlaceholders = ['CA', 'CS', 'IH', 'AS'];
  
  let chosenHint = hints[Math.floor(Math.random() * hints.length)];
  if (mainPinHint && Math.random() > 0.5) {
    const mainHintWords = mainPinHint.toLowerCase().split(' ');
    const relatedHintAttempt = hints.find(h => h.toLowerCase().split(' ').some(hw => mainHintWords.includes(hw)));
    if (relatedHintAttempt) chosenHint = relatedHintAttempt;
  }

  const randomIndex = Math.floor(Math.random() * uploaderNames.length);
  const randomWidth = widths[Math.floor(Math.random() * widths.length)];
  const randomHeight = Math.round(randomWidth * heightRatios[Math.floor(Math.random() * heightRatios.length)]);
  
  return {
    id: `related-pin-${id}-${Math.random().toString(36).substring(7)}`,
    alt: `Related pin: ${chosenHint}`,
    width: randomWidth,
    height: randomHeight,
    placeholderId: `ph-related-${id}`,
    aiHint: chosenHint,
    likes: Math.floor(Math.random() * 300),
    uploader: {
      name: uploaderNames[randomIndex],
      avatarUrl: `https://placehold.co/40x40.png?text=${avatarPlaceholders[randomIndex]}`,
      username: uploaderNames[randomIndex].toLowerCase().replace(' ', ''),
    },
  };
};

const fetchRelatedPins = async (originalPin: Pin | null, page: number): Promise<Pin[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newPins: Pin[] = Array.from({ length: PINS_PER_PAGE_RELATED }, (_, i) =>
        generateRandomRelatedPin(page * PINS_PER_PAGE_RELATED + i, originalPin?.aiHint)
      );
      resolve(newPins.filter(p => p.id !== originalPin?.id));
    }, 600);
  });
};


export default function PinDetailPage() {
  const router = useRouter();
  const params = useParams();
  const pinId = params?.id as string;

  const [pinDetail, setPinDetail] = useState<Pin | null>(null);
  const [relatedPins, setRelatedPins] = useState<Pin[]>([]);
  const [isLoadingPin, setIsLoadingPin] = useState(true);
  const [isLoadingRelated, setIsLoadingRelated] = useState(true);
  const [relatedPage, setRelatedPage] = useState(0);
  const [hasMoreRelated, setHasMoreRelated] = useState(true);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);

  useEffect(() => {
    if (pinId) {
      setIsLoadingPin(true);
      setPinDetail(null);
      setRelatedPins([]);
      setRelatedPage(0);
      setHasMoreRelated(true);

      fetchPinById(pinId).then((data) => {
        setPinDetail(data);
        setIsLoadingPin(false);
        if (data) {
          loadMoreRelatedPins(data, 0);
        } else {
          setIsLoadingRelated(false);
        }
      });
    }
  }, [pinId]); // Removed loadMoreRelatedPins from dependency array

  const loadMoreRelatedPins = useCallback(async (currentPin: Pin | null, pageToLoad: number) => {
    if (!hasMoreRelated || !currentPin) return;
    
    setIsLoadingRelated(true);
    const newPins = await fetchRelatedPins(currentPin, pageToLoad);
    if (newPins.length > 0) {
      setRelatedPins((prevPins) => pageToLoad === 0 ? newPins : [...prevPins, ...newPins]);
      setRelatedPage(pageToLoad + 1);
    } else {
      setHasMoreRelated(false);
    }
    setIsLoadingRelated(false);
  }, [hasMoreRelated]); // Removed isLoadingRelated, pinDetail, relatedPage

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRelated && !isLoadingRelated && pinDetail) {
          loadMoreRelatedPins(pinDetail, relatedPage);
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
  }, [loadMoreRelatedPins, hasMoreRelated, isLoadingRelated, pinDetail, relatedPage]);

  const openZoomModal = () => {
    if (pinDetail) setIsZoomModalOpen(true);
  };


  if (isLoadingPin) {
    return (
      <div className="flex flex-col min-h-screen bg-background animate-fade-in">
        <div className="sticky top-0 z-20 h-[var(--header-height)] bg-background/80 backdrop-blur-md flex items-center px-4 border-b">
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
    return (
      <div className="flex flex-col min-h-screen bg-background justify-center items-center p-8 animate-fade-in">
        <Search className="h-24 w-24 text-muted-foreground/50 mb-6" />
        <h1 className="text-3xl font-bold text-foreground mb-2">Pin Not Found</h1>
        <p className="text-lg text-muted-foreground mb-8 text-center">Oops! We couldn't find the pin you were looking for. It might have been removed or the link is incorrect.</p>
        <Button onClick={() => router.push('/')} size="lg" className="rounded-full px-8">
          <ArrowLeft className="mr-2 h-5 w-5" /> Go Back Home
        </Button>
      </div>
    );
  }
  
  const mainImageWidth = pinDetail.width > 800 ? 800 : pinDetail.width;
  const mainImageHeight = (mainImageWidth / pinDetail.width) * pinDetail.height;

  return (
    <>
      <div className="flex flex-col min-h-screen bg-background animate-fade-in">
        <div className="sticky top-0 z-20 h-[var(--header-height)] bg-background/80 backdrop-blur-md flex items-center px-2 sm:px-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back" className="mr-1 sm:mr-2 rounded-full text-foreground/80 hover:text-primary hover:bg-primary/10">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          {pinDetail.uploader && (
            <div className="flex items-center gap-2 overflow-hidden">
              <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                <AvatarImage src={pinDetail.uploader.avatarUrl} alt={pinDetail.uploader.name} data-ai-hint="uploader avatar small" />
                <AvatarFallback>{pinDetail.uploader.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="font-semibold text-sm truncate">{pinDetail.uploader.name}</p>
                <p className="text-xs text-muted-foreground truncate">@{pinDetail.uploader.username}</p>
              </div>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More options" className="rounded-full text-foreground/80 hover:text-primary hover:bg-primary/10">
                  <MoreHorizontal className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="shadow-modal">
                <DropdownMenuItem><Download className="mr-2 h-4 w-4" /> Download image</DropdownMenuItem>
                <DropdownMenuItem><Link2 className="mr-2 h-4 w-4" /> Copy link</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem><Flag className="mr-2 h-4 w-4" /> Report Pin</DropdownMenuItem>
                <DropdownMenuItem><Code2 className="mr-2 h-4 w-4" /> Get Pin embed code</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="lg" className="rounded-full px-5 sm:px-6 bg-primary hover:bg-primary/90 text-primary-foreground">Save</Button>
          </div>
        </div>

        <main className="flex-grow pb-16">
          <div className="mt-4 sm:mt-8 mx-auto w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl px-2 sm:px-4">
            <div className="bg-card rounded-3xl shadow-card overflow-hidden">
              <div className="flex flex-col lg:flex-row gap-0">
                <div className="lg:w-[55%] xl:w-1/2 bg-muted/50 flex justify-center items-center p-4 sm:p-6 md:p-8 relative group cursor-pointer" onClick={openZoomModal}>
                  <Image
                    src={`https://placehold.co/${pinDetail.width}x${pinDetail.height}.png`}
                    alt={pinDetail.alt}
                    width={mainImageWidth}
                    height={mainImageHeight}
                    className="rounded-2xl object-contain w-full h-full max-h-[75vh] shadow-md"
                    data-ai-hint={pinDetail.aiHint}
                    unoptimized={true}
                    priority
                  />
                  <div className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5 flex flex-col gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button variant="secondary" size="icon" className="rounded-full h-10 w-10 bg-black/40 hover:bg-black/60 text-white border-none shadow-md" aria-label="Zoom image" onClick={(e) => {e.stopPropagation(); openZoomModal();}}>
                      <Maximize2 className="h-5 w-5" />
                    </Button>
                    <Button variant="secondary" size="icon" className="rounded-full h-10 w-10 bg-black/40 hover:bg-black/60 text-white border-none shadow-md" aria-label="Search similar images" onClick={(e) => e.stopPropagation()}>
                      <Search className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="lg:w-[45%] xl:w-1/2 flex flex-col p-4 sm:p-6 md:p-8">
                  {pinDetail.title && <h1 className="text-2xl sm:text-3xl font-bold font-headline leading-tight mb-3">{pinDetail.title}</h1>}
                  {pinDetail.description && <p className="text-base text-foreground/80 mb-6 leading-relaxed">{pinDetail.description}</p>}
                  
                  {pinDetail.uploader && (
                    <div className="flex items-center justify-between mb-6">
                      <Link href={`/u/${pinDetail.uploader.username}`} className="flex items-center gap-3 group focus-ring rounded-full p-1 -m-1">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={pinDetail.uploader.avatarUrl} alt={pinDetail.uploader.name} data-ai-hint="uploader avatar large" />
                          <AvatarFallback className="text-lg">{pinDetail.uploader.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-md group-hover:text-primary transition-colors">{pinDetail.uploader.name}</p>
                          <p className="text-sm text-muted-foreground">@{pinDetail.uploader.username}</p>
                        </div>
                      </Link>
                      <Button variant="secondary" className="rounded-full px-5 h-10 text-sm font-medium hover:bg-secondary/80 focus-ring">Follow</Button>
                    </div>
                  )}
                  
                  {pinDetail.tags && pinDetail.tags.length > 0 && (
                    <div className="mb-6">
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                            {pinDetail.tags.map(tag => (
                                <Button key={tag} variant="outline" size="sm" className="rounded-full text-xs px-3 py-1 hover:bg-secondary/50 hover:border-primary/50">
                                    {tag}
                                </Button>
                            ))}
                        </div>
                    </div>
                  )}

                  <div className="mt-auto">
                    <h3 className="font-semibold text-lg mb-3">Comments (0)</h3>
                    <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
                      <p className="text-sm text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 mt-1">
                        <AvatarImage src="https://placehold.co/40x40.png?text=U" alt="Your avatar" data-ai-hint="profile avatar current user" />
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 relative">
                        <Textarea placeholder="Add a comment..." className="rounded-2xl pr-20 min-h-[48px] py-3 text-sm resize-none focus-ring" rows={1}/>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary rounded-full">
                                <Smile className="h-5 w-5"/>
                            </Button>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary rounded-full">
                                <Send className="h-5 w-5"/>
                            </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {(relatedPins.length > 0 || isLoadingRelated) && (
            <div className="mt-12 sm:mt-16 container mx-auto px-2 sm:px-4">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center font-headline">More like this</h2>
              <PinGrid pins={relatedPins} onPinClick={(pin) => router.push(`/pin/${pin.id}`)} />
              {isLoadingRelated && relatedPins.length === 0 && (
                <div className="masonry-grid px-grid-gap md:px-0 mt-grid-gap">
                  {[...Array(8)].map((_, i) => (
                    <div key={`skeleton-related-${i}`} className="break-inside-avoid mb-grid-gap">
                      <Skeleton className={`w-full h-[${180 + Math.random() * 200}px] rounded-2xl bg-muted/80`} />
                    </div>
                  ))}
                </div>
              )}
              <div ref={loaderRef} className="h-20 w-full flex justify-center items-center" aria-hidden="true">
                 {isLoadingRelated && relatedPins.length > 0 && (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                 )}
              </div>
              {!hasMoreRelated && relatedPins.length > 0 && (
                <p className="text-center text-muted-foreground font-medium py-10 text-lg">✨ You've explored all related pins! ✨</p>
              )}
              {!hasMoreRelated && relatedPins.length === 0 && !isLoadingRelated && pinDetail && (
                <p className="text-center text-muted-foreground py-8">No more related pins found for this one.</p>
              )}
            </div>
          )}
        </main>
      </div>
      <ImageZoomModal pin={pinDetail} isOpen={isZoomModalOpen} onClose={() => setIsZoomModalOpen(false)} />
    </>
  );
}

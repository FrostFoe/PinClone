
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Pin } from '@/types';
import { cn } from '@/lib/utils';
import { Heart, MoreHorizontal } from 'lucide-react'; // MessageCircle removed as not used here
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton'; // For image loading state

interface PinCardProps {
  pin: Pin;
  onClick?: (pin: Pin) => void;
  className?: string;
  showDetails?: boolean;
  priority?: boolean; // For LCP optimization
}

export default function PinCard({ pin, onClick, className, showDetails = false, priority = false }: PinCardProps) {
  // Use actual width/height from pin data if available, otherwise provide defaults for robustness
  const imageWidth = pin.width || 300; 
  const imageHeight = pin.height || Math.round(imageWidth * 1.33); // Default aspect ratio if height is missing

  const handleInteraction = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (onClick) {
      e.stopPropagation(); 
      onClick(pin);
    }
  };

  const content = (
    <div
      className={cn(
        "group relative break-inside-avoid mb-grid-gap rounded-2xl overflow-hidden shadow-subtle hover:shadow-card transition-all duration-300 ease-in-out transform hover:-translate-y-1",
        "bg-muted animate-scale-in", // Animate scale-in for a nice entry
        className
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? handleInteraction : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && handleInteraction(e) : undefined}
      aria-label={onClick ? `View pin: ${pin.title || 'Untitled Pin'}` : undefined}
    >
      <Image
        src={pin.image_url}
        alt={pin.title || 'Pin image'}
        width={imageWidth}
        height={imageHeight}
        className="w-full h-auto object-cover transition-brightness duration-300 group-hover:brightness-[0.85]"
        priority={priority}
        data-ai-hint={pin.title || "pin image"} // Using title as a more relevant hint
        // If not using placehold.co or another service that doesn't require unoptimized:
        // unoptimized={pin.image_url.startsWith('https://placehold.co')} 
      />
      {showDetails && pin.uploader && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3 text-white">
          <div className="flex justify-between items-start">
            {pin.title && <h3 className="font-headline text-sm font-semibold line-clamp-2">{pin.title}</h3>}
            {/* More options button for future actions like save, hide, report */}
            {/* <Button variant="secondary" size="icon" className="bg-white/20 hover:bg-white/30 text-white rounded-full h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button> */}
          </div>
          <div className="flex items-center justify-between text-xs">
            <Link href={`/u/${pin.uploader.username}`} className="flex items-center gap-1.5 group/uploaderinfo hover:underline" onClick={(e) => e.stopPropagation()}>
              <Avatar className="h-6 w-6 border-2 border-white/50">
                <AvatarImage src={pin.uploader.avatar_url || undefined} alt={pin.uploader.full_name || pin.uploader.username || 'Uploader'} data-ai-hint="uploader avatar small"/>
                <AvatarFallback className="text-xs bg-muted text-muted-foreground">{pin.uploader.full_name?.[0]?.toUpperCase() || pin.uploader.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <span className="truncate">{pin.uploader.full_name || pin.uploader.username}</span>
            </Link>
            {pin.likes !== undefined && (
              <div className="flex items-center gap-0.5">
                <Heart className="h-3.5 w-3.5" />
                <span>{pin.likes}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
  
  // If onClick is provided (e.g., opening a detail view/modal), the div itself handles the click.
  // Otherwise, wrap with Next.js Link for direct navigation to the pin's page.
  if (onClick) {
    return content;
  }

  return (
    <Link href={`/pin/${pin.id}`} passHref className="focus-ring rounded-2xl block">
      {content}
    </Link>
  );
}

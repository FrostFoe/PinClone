
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Pin } from '@/types';
import { cn } from '@/lib/utils';
import { Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';

interface PinCardProps {
  pin: Pin;
  onClick?: (pin: Pin) => void;
  className?: string;
  showDetails?: boolean; // New prop to toggle overlay details
}

export default function PinCard({ pin, onClick, className, showDetails = false }: PinCardProps) {
  const width = Number(pin.width) || 300;
  const height = Number(pin.height) || Math.round(width * 1.2); // Default aspect ratio if height missing

  const handleInteraction = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (onClick) {
      e.stopPropagation(); // Prevent Link navigation if onClick is primary
      onClick(pin);
    }
  };

  const content = (
    <div
      className={cn(
        "group relative break-inside-avoid mb-grid-gap rounded-2xl overflow-hidden shadow-subtle hover:shadow-card transition-all duration-300 ease-in-out transform hover:-translate-y-1",
        "bg-muted animate-scale-in",
        className
      )}
      role="button" // Keep role if onClick is primary, Link handles its own semantics
      tabIndex={onClick ? 0 : -1} // Only tabbable if onClick is primary
      onClick={handleInteraction}
      onKeyDown={(e) => e.key === 'Enter' && handleInteraction(e)}
      aria-label={`View pin: ${pin.alt}`}
    >
      <Image
        src={`https://placehold.co/${width}x${height}.png`}
        alt={pin.alt}
        width={width}
        height={height}
        className="w-full h-auto object-cover transition-brightness duration-300 group-hover:brightness-[0.85]"
        priority={false} // Consider setting priority for above-the-fold images
        data-ai-hint={pin.aiHint}
        unoptimized={true} // Keep for placeholders
      />
      {showDetails && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3 text-white">
          <div className="flex justify-between items-start">
            {pin.title && <h3 className="font-headline text-sm font-semibold line-clamp-2">{pin.title}</h3>}
            <Button variant="secondary" size="icon" className="bg-white/20 hover:bg-white/30 text-white rounded-full h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Avatar className="h-6 w-6 border-2 border-white/50">
                <AvatarImage src={pin.uploader?.avatarUrl} alt={pin.uploader?.name} data-ai-hint="uploader avatar small"/>
                <AvatarFallback className="text-xs bg-muted text-muted-foreground">{pin.uploader?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <span>{pin.uploader?.name || 'User'}</span>
            </div>
            <div className="flex items-center gap-2">
              {pin.likes !== undefined && (
                <div className="flex items-center gap-0.5">
                  <Heart className="h-3.5 w-3.5" />
                  <span>{pin.likes}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
  // If onClick is provided (e.g., from PinGrid on the homepage, opening a detail view), use it.
  // Otherwise, wrap with Link for direct navigation (e.g., if this card is used in a context where each click goes to a page).
  if (onClick) {
    return content; // The div itself handles the click
  }

  return (
    <Link href={`/pin/${pin.id}`} passHref legacyBehavior>
      <a className="focus-ring rounded-2xl block">{content}</a>
    </Link>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import type { Pin } from "@/types";
import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { useState, memo } from "react"; // Import memo

interface PinCardProps {
  pin: Pin;
  onClick?: (pin: Pin) => void;
  className?: string;
  showDetails?: boolean;
  priority?: boolean; // For LCP optimization on first few pins
}

// Memoized PinCard to prevent unnecessary re-renders if props haven't changed.
const PinCard = memo(function PinCard({
  pin,
  onClick,
  className,
  showDetails = false,
  priority = false,
}: PinCardProps) {
  const [isImageLoading, setIsImageLoading] = useState(true);
  // Use pin's actual dimensions, fallback if not available (though schema requires them)
  const imageWidth = pin.width || 300; // Fallback width
  const imageHeight = pin.height || Math.round(imageWidth * 1.33); // Fallback height maintaining aspect ratio

  const handleInteraction = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (onClick) {
      e.stopPropagation(); // Prevent event bubbling if card is wrapped in another clickable element
      onClick(pin);
    }
  };

  const content = (
    <div
      className={cn(
        "group relative break-inside-avoid mb-grid-gap rounded-2xl overflow-hidden shadow-subtle hover:shadow-card transition-all duration-300 ease-in-out transform hover:-translate-y-1",
        "bg-muted animate-scale-in", // Added for subtle animation and background while loading
        className,
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? handleInteraction : undefined}
      onKeyDown={
        onClick ? (e) => e.key === "Enter" && handleInteraction(e) : undefined
      }
      aria-label={
        onClick ? `View pin: ${pin.title || "Untitled Pin"}` : undefined
      }
    >
      {isImageLoading && (
        // Position skeleton absolutely to be behind the image, revealed if image fails or while loading
        <Skeleton className="absolute inset-0 w-full h-full rounded-2xl bg-muted/70" />
      )}
      <Image
        src={pin.image_url}
        alt={pin.title || "Pin image"}
        width={imageWidth} // Use actual or fallback width
        height={imageHeight} // Use actual or fallback height
        className={cn(
          "w-full h-auto object-cover transition-all duration-300 group-hover:brightness-[0.85]",
          isImageLoading ? "opacity-0" : "opacity-100", // Hide image until loaded
        )}
        priority={priority} // For LCP optimization
        data-ai-hint={pin.title || "pin image"} // AI hint for image search
        onLoad={() => setIsImageLoading(false)}
        onError={() => setIsImageLoading(false)} // Also set loading to false on error to show fallback/skeleton
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" // Responsive image sizes
      />
      {showDetails && pin.uploader && !isImageLoading && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3 text-white">
          <div className="flex justify-end items-start">
            <Button
              variant="secondary"
              size="icon"
              className="bg-white/20 hover:bg-white/30 text-white rounded-full h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click if interacting with button
                // Add logic for more options if needed
              }}
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between text-xs">
            <Link
              href={`/u/${pin.uploader.username}`}
              className="flex items-center gap-1.5 group/uploaderinfo hover:underline"
              onClick={(e) => e.stopPropagation()} // Prevent card click when clicking uploader link
            >
              <Avatar className="h-6 w-6 border-2 border-white/50">
                <AvatarImage
                  src={pin.uploader.avatar_url || undefined}
                  alt={
                    pin.uploader.full_name ||
                    pin.uploader.username ||
                    "Uploader"
                  }
                  data-ai-hint="uploader avatar small"
                />
                <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                  {pin.uploader.full_name?.[0]?.toUpperCase() ||
                    pin.uploader.username?.[0]?.toUpperCase() ||
                    "U"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate font-medium">
                {pin.uploader.full_name || pin.uploader.username}
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );

  // If onClick is provided, the div itself is the interactive element.
  if (onClick) {
    return content;
  }

  // Otherwise, wrap with a Link for navigation.
  return (
    <Link
      href={`/pin/${pin.id}`}
      passHref
      className="focus-ring rounded-2xl block" // Ensure focus ring is on the link
    >
      {content}
    </Link>
  );
});

export default PinCard;

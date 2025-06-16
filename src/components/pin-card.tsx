'use client';

import Image from 'next/image';
import type { Pin } from '@/types';
import { cn } from '@/lib/utils';

interface PinCardProps {
  pin: Pin;
  onClick: () => void;
}

export default function PinCard({ pin, onClick }: PinCardProps) {
  // Ensure width and height are numbers
  const width = Number(pin.width);
  const height = Number(pin.height);

  return (
    <div
      className="group relative break-inside-avoid mb-grid-gap cursor-pointer animate-scale-in"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`View pin: ${pin.alt}`}
    >
      <div className="rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 bg-muted">
        <Image
          src={`https://placehold.co/${width || 300}x${height || 400}.png`}
          alt={pin.alt}
          width={width || 300} // Provide a default if not set
          height={height || 400} // Provide a default if not set
          className="w-full h-auto object-cover group-hover:brightness-75 transition-all duration-300"
          priority={false} // Lazy load images not in initial viewport
          data-ai-hint={pin.aiHint}
          unoptimized={true} // For placeholder.co, optimization might not be needed or could fail
        />
      </div>
      {/* Future: Add overlay with Save button, More options icon (ellipsis) */}
      {/* <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        <Button variant="primary">Save</Button>
      </div> */}
    </div>
  );
}

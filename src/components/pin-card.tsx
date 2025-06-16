
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Pin } from '@/types';

interface PinCardProps {
  pin: Pin;
  onClick?: (pin: Pin) => void; // Make onClick optional, it will be used by PinGrid
}

export default function PinCard({ pin, onClick }: PinCardProps) {
  const width = Number(pin.width);
  const height = Number(pin.height);

  const content = (
    <div
      className="group relative break-inside-avoid mb-grid-gap cursor-pointer animate-scale-in"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(pin)}
      aria-label={`View pin: ${pin.alt}`}
    >
      <div className="rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 bg-muted">
        <Image
          src={`https://placehold.co/${width || 300}x${height || 400}.png`}
          alt={pin.alt}
          width={width || 300}
          height={height || 400}
          className="w-full h-auto object-cover group-hover:brightness-75 transition-all duration-300"
          priority={false}
          data-ai-hint={pin.aiHint}
          unoptimized={true}
        />
      </div>
    </div>
  );
  
  // If onClick is provided (e.g. from PinGrid on the homepage), use it. Otherwise, assume it's for navigation.
  if (onClick) {
    return <div onClick={() => onClick(pin)}>{content}</div>;
  }

  return (
    <Link href={`/pin/${pin.id}`} passHref legacyBehavior>
      <a>{content}</a>
    </Link>
  );
}

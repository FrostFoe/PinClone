'use client';

import type { Pin } from '@/types';
import PinCard from './pin-card';

interface PinGridProps {
  pins: Pin[];
  onPinClick: (pin: Pin) => void;
}

export default function PinGrid({ pins, onPinClick }: PinGridProps) {
  if (!pins || pins.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No pins to display.</p>;
  }

  return (
    <div className="masonry-grid px-grid-gap md:px-0" role="list">
      {pins.map((pin) => (
        <PinCard key={pin.id} pin={pin} onClick={() => onPinClick(pin)} />
      ))}
    </div>
  );
}

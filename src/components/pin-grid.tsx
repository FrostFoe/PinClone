
'use client';

import type { Pin } from '@/types';
import PinCard from './pin-card';

interface PinGridProps {
  pins: Pin[];
  onPinClick: (pin: Pin) => void;
  showPinDetailsOverlay?: boolean; // New prop
}

export default function PinGrid({ pins, onPinClick, showPinDetailsOverlay = false }: PinGridProps) {
  if (!pins || pins.length === 0) {
    // This case should ideally be handled by the parent component to show a more contextual message
    return null; 
  }

  return (
    <div className="masonry-grid px-grid-gap md:px-0" role="list">
      {pins.map((pin) => (
        <PinCard 
          key={pin.id} 
          pin={pin} 
          onClick={() => onPinClick(pin)} 
          showDetails={showPinDetailsOverlay}
        />
      ))}
    </div>
  );
}

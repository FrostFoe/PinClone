
"use client";

import type { Pin } from "@/types";
import PinCard from "./pin-card";

interface PinGridProps {
  pins: Pin[];
  onPinClick: (pin: Pin) => void;
  showPinDetailsOverlay?: boolean; // New prop
}

export default function PinGrid({
  pins,
  onPinClick,
  showPinDetailsOverlay = false, // Default to false if not provided
}: PinGridProps) {
  if (!pins || pins.length === 0) {
    // This case should ideally be handled by the parent component 
    // to show a more contextual message (e.g., "No pins found").
    // Returning null here to avoid rendering an empty grid container.
    return null;
  }

  return (
    <div className="masonry-grid px-grid-gap md:px-0" role="list">
      {pins.map((pin, index) => (
        <PinCard
          key={pin.id}
          pin={pin}
          onClick={() => onPinClick(pin)}
          showDetails={showPinDetailsOverlay}
          priority={index < 6} // Prioritize loading for the first few pins (e.g., first 6)
        />
      ))}
    </div>
  );
}

    

'use client';

import Image from 'next/image';
import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog';
import type { Pin } from '@/types';
import { X } from 'lucide-react';
import { Button } from './ui/button';

interface ImageZoomModalProps {
  pin: Pin | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageZoomModal({ pin, isOpen, onClose }: ImageZoomModalProps) {
  if (!pin) return null;

  // Ensure width and height are numbers
  const width = Number(pin.width);
  const height = Number(pin.height);
  const aspectRatio = width && height ? width / height : 1;


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="bg-black/70 backdrop-blur-sm" />
      <DialogContent 
        className="max-w-[90vw] md:max-w-2xl lg:max-w-4xl xl:max-w-5xl w-auto p-0 bg-transparent border-none shadow-none flex flex-col items-center justify-center"
        aria-labelledby="image-zoom-title"
        aria-describedby="image-zoom-description"
      >
        <div className="relative rounded-xl overflow-hidden bg-card shadow-2xl">
          <Image
            src={`https://placehold.co/${width || 600}x${Math.round((width || 600) / aspectRatio) || 800}.png`}
            alt={pin.alt}
            width={width || 600}
            height={Math.round((width || 600) / aspectRatio) || 800}
            className="object-contain max-h-[85vh] w-auto h-auto animate-scale-in"
            data-ai-hint={pin.aiHint}
            unoptimized={true}
          />
          <div id="image-zoom-description" className="sr-only">
            Enlarged view of: {pin.alt}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full bg-black/50 text-white hover:bg-black/70 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/50"
            aria-label="Close image zoom"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
        <p id="image-zoom-title" className="text-center text-sm text-white/80 mt-4 font-headline">{pin.alt}</p>
      </DialogContent>
    </Dialog>
  );
}

// This component is no longer used on the homepage for showing pin details.
// It's kept here in case you want to use a modal zoom for other images in the future.
// If you are sure you won't need it, you can ask me to delete this file.

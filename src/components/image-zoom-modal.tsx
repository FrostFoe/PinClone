
'use client';

import Image from 'next/image';
import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog';
import type { Pin } from '@/types';
import { X, Download, Link2 } from 'lucide-react';
import { Button } from './ui/button';

interface ImageZoomModalProps {
  pin: Pin | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageZoomModal({ pin, isOpen, onClose }: ImageZoomModalProps) {
  if (!pin) return null;

  const width = Number(pin.width) || 800;
  const height = Number(pin.height) || Math.round(width * (pin.height / pin.width || 1.2)); // Use aspect ratio or default
  const aspectRatio = width / height;

  const handleDownload = () => {
    // In a real app, you'd link to the original image URL for download
    const link = document.createElement('a');
    link.href = `https://placehold.co/${width}x${height}.png`; // Placeholder
    link.download = `${pin.title || pin.alt || 'pin'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href); // Copies current page URL, or pin detail URL
    // Consider adding a toast notification for "Link copied!"
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="bg-black/80 backdrop-blur-sm fixed inset-0 z-[999]" />
      <DialogContent 
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 outline-none"
        onInteractOutside={(e) => e.preventDefault()} // Prevents closing on outside click if needed
      >
        <div className="relative bg-card rounded-xl shadow-modal w-auto h-auto max-w-[95vw] max-h-[90vh] flex flex-col animate-scale-in">
           <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/30 to-transparent rounded-t-xl">
            <p id="image-zoom-title" className="text-sm sm:text-base font-semibold text-white truncate max-w-[calc(100%-100px)]">
              {pin.title || pin.alt}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="rounded-full bg-black/40 text-white hover:bg-black/60 focus-ring"
                aria-label="Download image"
              >
                <Download className="h-5 w-5" />
              </Button>
               <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyLink}
                className="rounded-full bg-black/40 text-white hover:bg-black/60 focus-ring"
                aria-label="Copy link"
              >
                <Link2 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full bg-black/40 text-white hover:bg-black/60 focus-ring"
                aria-label="Close image zoom"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="flex-grow flex items-center justify-center overflow-hidden p-2 sm:p-4 pt-16 sm:pt-16"> {/* Added padding top for controls */}
            <Image
              src={`https://placehold.co/${width}x${height}.png`}
              alt={pin.alt}
              width={width}
              height={height}
              className="object-contain max-h-[calc(90vh-80px)] w-auto h-auto rounded-lg" // Adjusted max-h
              data-ai-hint={pin.aiHint}
              unoptimized={true}
            />
          </div>
          <div id="image-zoom-description" className="sr-only">
            Enlarged view of: {pin.alt}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

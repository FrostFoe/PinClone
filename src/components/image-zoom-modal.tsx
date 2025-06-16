
'use client';

import Image from 'next/image';
import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog';
import type { Pin } from '@/types';
import { X, Download, Link2 } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';

interface ImageZoomModalProps {
  pin: Pin | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageZoomModal({ pin, isOpen, onClose }: ImageZoomModalProps) {
  const { toast } = useToast();

  if (!pin) return null;

  const imageWidth = pin.width || 800; // Default if not provided
  const imageHeight = pin.height || Math.round(imageWidth * 1.2); // Default aspect ratio
  
  const handleDownload = () => {
    if (!pin.image_url) {
      toast({ variant: "destructive", title: "Download failed", description: "Image source is not available." });
      return;
    }
    const link = document.createElement('a');
    link.href = pin.image_url; 
    link.download = `${pin.title || pin.id || 'pin-image'}.png`; // Better default filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Image Download Started" });
  };

  const handleCopyLink = () => {
    // Prefer copying the direct pin detail page URL
    const pinUrl = `${window.location.origin}/pin/${pin.id}`;
    navigator.clipboard.writeText(pinUrl)
      .then(() => toast({ title: "Link Copied!", description: "Pin URL copied to clipboard." }))
      .catch(() => toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy link." }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="bg-black/80 backdrop-blur-sm fixed inset-0 z-[999]" />
      <DialogContent 
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 outline-none border-none bg-transparent shadow-none w-full h-full"
        onInteractOutside={(e) => {
          // Allow closing by clicking outside the image, but not on the image itself
          if (e.target === e.currentTarget) { 
            onClose();
          }
        }}
      >
        <div className="relative bg-card rounded-xl shadow-modal w-auto h-auto max-w-[95vw] max-h-[90vh] flex flex-col animate-scale-in">
           <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 via-black/20 to-transparent rounded-t-xl">
            <p id="image-zoom-title" className="text-sm sm:text-base font-semibold text-white truncate max-w-[calc(100%-120px)]">
              {pin.title || 'Image Preview'}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="rounded-full bg-black/50 text-white hover:bg-black/70 focus-ring backdrop-blur-sm"
                aria-label="Download image"
              >
                <Download className="h-5 w-5" />
              </Button>
               <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyLink}
                className="rounded-full bg-black/50 text-white hover:bg-black/70 focus-ring backdrop-blur-sm"
                aria-label="Copy link"
              >
                <Link2 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full bg-black/50 text-white hover:bg-black/70 focus-ring backdrop-blur-sm"
                aria-label="Close image zoom"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="flex-grow flex items-center justify-center overflow-hidden p-2 sm:p-4 pt-16 sm:pt-16">
            <Image
              src={pin.image_url}
              alt={pin.title || 'Zoomed pin image'}
              width={imageWidth} 
              height={imageHeight}
              className="object-contain max-h-[calc(90vh-80px)] w-auto h-auto rounded-lg shadow-2xl" 
              data-ai-hint={pin.title || "zoomed image"}
              // unoptimized={pin.image_url.startsWith('https://placehold.co')}
              priority // Prioritize loading the main zoomed image
            />
          </div>
          <div id="image-zoom-description" className="sr-only">
            Enlarged view of: {pin.title || 'Image'}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

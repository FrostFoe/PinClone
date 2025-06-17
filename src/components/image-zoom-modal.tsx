"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Pin } from "@/types";
import { X, Download, Link2 } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ImageZoomModalProps {
  pin: Pin | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageZoomModal({
  pin,
  isOpen,
  onClose,
}: ImageZoomModalProps) {
  const { toast } = useToast();
  const [isImageLoading, setIsImageLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsImageLoading(true); // Reset loading state when modal opens or pin changes
    }
  }, [isOpen, pin?.id]);

  if (!pin) return null;

  // Use pin's actual dimensions, fallback if not available (though schema requires them)
  const imageWidth = pin.width || 800;
  const imageHeight = pin.height || Math.round(imageWidth * 1.2);

  const handleDownload = async () => {
    if (!pin.image_url) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Image source is not available.",
      });
      return;
    }
    try {
      const response = await fetch(pin.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const titleSanitized =
        pin.title?.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "pin_image";
      const fileExtension =
        pin.image_url.split(".").pop()?.split("?")[0] || "png";
      link.download = `${titleSanitized}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({ title: "Image Download Started" });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Could not download image.",
      });
    }
  };

  const handleCopyLink = () => {
    const pinUrl = `${window.location.origin}/pin/${pin.id}`;
    navigator.clipboard
      .writeText(pinUrl)
      .then(() =>
        toast({
          title: "Link Copied!",
          description: "Pin URL copied to clipboard.",
        }),
      )
      .catch(() =>
        toast({
          variant: "destructive",
          title: "Copy Failed",
          description: "Could not copy link.",
        }),
      );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="bg-black/80 backdrop-blur-sm fixed inset-0 z-[999]" />
      <DialogContent
        className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 outline-none border-none bg-transparent shadow-none w-full h-full"
        onInteractOutside={(e) => {
          // Close only if clicking directly on the overlay, not its children
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        aria-labelledby="image-zoom-title"
        aria-describedby="image-zoom-description"
      >
        <div className="relative bg-card rounded-xl shadow-modal w-auto h-auto max-w-[95vw] max-h-[90vh] flex flex-col animate-scale-in">
          <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 via-black/20 to-transparent rounded-t-xl">
            <DialogTitle
              id="image-zoom-title"
              className="text-sm sm:text-base font-semibold text-white truncate max-w-[calc(100%-140px)]"
            >
              {pin.title || "Image Preview"}
            </DialogTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="rounded-full bg-black/40 text-white hover:bg-black/60 focus-ring backdrop-blur-sm h-9 w-9 sm:h-10 sm:w-10"
                aria-label="Download image"
              >
                <Download className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyLink}
                className="rounded-full bg-black/40 text-white hover:bg-black/60 focus-ring backdrop-blur-sm h-9 w-9 sm:h-10 sm:w-10"
                aria-label="Copy link"
              >
                <Link2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full bg-black/40 text-white hover:bg-black/60 focus-ring backdrop-blur-sm h-9 w-9 sm:h-10 sm:w-10"
                aria-label="Close image zoom"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
          <div className="flex-grow flex items-center justify-center overflow-hidden p-2 sm:p-4 pt-16 sm:pt-16">
            {isImageLoading && (
              <Skeleton className="w-full max-w-[80vw] h-[70vh] rounded-lg bg-muted/50" />
            )}
            <Image
              src={pin.image_url}
              alt={pin.title || "Zoomed pin image"}
              width={imageWidth}
              height={imageHeight}
              className={cn(
                "object-contain max-h-[calc(90vh-80px)] w-auto h-auto rounded-lg shadow-2xl transition-opacity duration-300",
                isImageLoading ? "opacity-0" : "opacity-100",
              )}
              data-ai-hint={pin.title || "zoomed image detail"}
              priority
              onLoad={() => setIsImageLoading(false)}
              onError={() => {
                setIsImageLoading(false);
                toast({
                  variant: "destructive",
                  title: "Image Error",
                  description: "Could not load the zoomed image.",
                });
              }}
              sizes="90vw" // Provide sizes prop for responsive optimization
            />
          </div>
          <DialogDescription id="image-zoom-description" className="sr-only">
            Enlarged view of: {pin.title || "Image"}. Press escape to close.
          </DialogDescription>
        </div>
      </DialogContent>
    </Dialog>
  );
}

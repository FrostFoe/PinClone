
import type { Metadata } from "next";
import { Suspense } from "react";
import { fetchPinById } from "@/services/pinService";
import PinDetailClientContent from "./PinDetailClientContent";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

// For SEO: Generate metadata on the server
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  // Ensure fetchPinById is robust to ID not found scenarios for metadata generation
  const { pin } = await fetchPinById(params.id);

  if (!pin) {
    return {
      title: "Pin Not Found | Pinclone",
      description: "The pin you are looking for could not be found.",
    };
  }

  return {
    title: `${pin.title || "Untitled Pin"} by ${pin.uploader?.full_name || pin.uploader?.username || "a user"} | Pinclone`,
    description:
      pin.description ||
      `View this pin on Pinclone: ${pin.title || "Untitled Pin"}. Discover more ideas.`,
    openGraph: {
      title: `${pin.title || "Untitled Pin"} | Pinclone`,
      description:
        pin.description || "Discover and save creative ideas on Pinclone.",
      images: [
        {
          url: pin.image_url,
          width: pin.width || 800,
          height: pin.height || 600,
          alt: pin.title || "Pin image",
        },
      ],
      type: "article",
      url: `/pin/${pin.id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${pin.title || "Untitled Pin"} | Pinclone`,
      description:
        pin.description || "Discover and save creative ideas on Pinclone.",
      images: [pin.image_url],
    },
  };
}

// This is now a Server Component that renders the Client Component
export default function PinDetailPageContainer({ params }: { params: { id: string }}) {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen bg-background animate-fade-in items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Pin Details...</p>
      </div>
    }>
      <PinDetailClientContent params={params} />
    </Suspense>
  );
}



import type { Metadata } from "next";
import { Suspense } from "react";
import { fetchProfileByUsername } from "@/services/profileService";
import UserPublicProfileClientContent from "./UserPublicProfileClientContent";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

// For SEO: Generate metadata on the server
export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const { profile } = await fetchProfileByUsername(params.username);

  if (!profile) {
    return {
      title: "User Not Found | Pinclone",
      description: "The user profile you are looking for could not be found.",
    };
  }

  const title = `${profile.full_name || profile.username}'s Profile | Pinclone`;
  const description =
    profile.bio ||
    `View ${profile.full_name || profile.username}'s profile on Pinclone. Discover their pins and ideas.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: profile.avatar_url
        ? [
            {
              url: profile.avatar_url,
              width: 128, // Standard avatar size, adjust if known
              height: 128, // Standard avatar size, adjust if known
              alt: `${profile.full_name || profile.username}'s avatar`,
            },
          ]
        : [],
      type: "profile",
      username: profile.username || undefined, // Ensure username is string or undefined
      url: `/u/${profile.username}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: profile.avatar_url ? [profile.avatar_url] : [],
    },
  };
}

// This is now a Server Component that renders the Client Component
export default function UserPublicProfilePageContainer({ params }: { params: { username: string }}) {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col animate-fade-in pt-8 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Profile...</p>
      </div>
    }>
      <UserPublicProfileClientContent params={params} />
    </Suspense>
  );
}


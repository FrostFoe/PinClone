
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
  console.log(`[generateMetadata /u/${params.username}] Attempting to fetch profile data for metadata.`);
  const { profile, error: fetchError } = await fetchProfileByUsername(params.username);
  console.log(`[generateMetadata /u/${params.username}] Service call fetchProfileByUsername returned:`, { usernameParam: params.username, profileData: profile, error: fetchError });
  
  if (fetchError) {
    console.error(`[generateMetadata /u/${params.username}] Error received while fetching profile for metadata: ${fetchError}. Profile object:`, profile);
    // Return fallback metadata to prevent metadata generation from crashing the page
    return {
      title: "Error Loading Profile | Pinclone",
      description: "There was an error loading the details for this profile.",
    };
  }

  if (!profile) {
    console.warn(`[generateMetadata /u/${params.username}] Profile not found (profile object is null) for username: ${params.username}. Error from fetch: ${fetchError || 'None'}`);
    return {
      title: "User Not Found | Pinclone",
      description: "The user profile you are looking for could not be found.",
    };
  }
  
  console.log(`[generateMetadata /u/${params.username}] Successfully fetched profile for metadata. Username: ${profile.username}`);

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
              width: 128, 
              height: 128, 
              alt: `${profile.full_name || profile.username}'s avatar`,
            },
          ]
        : [],
      type: "profile",
      username: profile.username || undefined, 
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
export default function UserPublicProfilePageContainer({
  params,
}: {
  params: { username: string };
}) {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex flex-col animate-fade-in pt-8 items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading Profile...</p>
        </div>
      }
    >
      <UserPublicProfileClientContent params={params} />
    </Suspense>
  );
}

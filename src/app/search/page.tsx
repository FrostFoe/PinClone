
import { Suspense } from "react";
import SearchUI, { SearchPageSkeleton as SearchUIInternalSkeleton } from "./SearchUI"; // Renamed import
import { Skeleton } from "@/components/ui/skeleton"; // Use the global Skeleton

// This tells Next.js to render this page dynamically at request time,
// preventing issues with prerendering a page that depends on runtime search params.
export const dynamic = 'force-dynamic';

export default function SearchPage() {
  return (
    <main className="flex-grow container mx-auto px-4 py-8 animate-fade-in-up">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold font-headline mb-2 text-center sm:text-left">
          Explore Users
        </h1>
        <p className="text-muted-foreground mb-8 text-center sm:text-left">
          Find and connect with other creators on Pinclone.
        </p>
        <Suspense fallback={<SearchPageSkeleton />}>
          <SearchUI />
        </Suspense>
      </div>
    </main>
  );
}

// Define a simple skeleton content for the main page fallback
// The more detailed skeleton is part of SearchUI.tsx for the client component's internal suspense
function SearchPageSkeleton() {
  return (
    <>
      <div className="mb-10 flex gap-2 items-center sticky top-[var(--header-height)] bg-background py-4 z-10">
        <Skeleton className="h-12 flex-grow rounded-full" />
        <Skeleton className="h-12 w-24 rounded-full" />
      </div>
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={`skeleton-search-user-outer-${i}`}
            className="bg-card p-4 rounded-xl shadow-md flex items-center space-x-4"
          >
            <Skeleton className="h-16 w-16 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/5 rounded bg-muted" />
              <Skeleton className="h-4 w-2/5 rounded bg-muted" />
            </div>
            <Skeleton className="h-9 w-24 rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </>
  );
}

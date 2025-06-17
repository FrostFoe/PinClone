
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton as ShadSkeleton } from "@/components/ui/skeleton"; // Use ShadCN Skeleton
import { Input } from "@/components/ui/input";
import type { Profile } from "@/types";
import { searchUsers } from "@/services/searchService";
import { Users, Search as SearchIconLucide, Frown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SearchUI() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const query = searchParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(query);
  const [results, setResults] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    setSearchQuery(query); // Sync local state with URL query param
    if (query) {
      performSearch(query);
    } else {
      setResults([]);
      setHasSearched(false); // Reset if query is cleared
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]); // Re-run search if URL query param changes

  const performSearch = async (currentQuery: string) => {
    if (!currentQuery.trim()) {
      setResults([]);
      setHasSearched(true); // Considered a search, even if empty, to show 'no results' or initial state
      return;
    }
    setIsLoading(true);
    setHasSearched(true);
    const { users, error } = await searchUsers(currentQuery);
    if (error) {
      toast({
        variant: "destructive",
        title: "Search Error",
        description: error,
      });
      setResults([]);
    } else {
      setResults(users);
    }
    setIsLoading(false);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    // Update URL, which will trigger the useEffect to perform the search
    if (trimmedQuery) {
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    } else {
      router.push("/search"); // Clear query in URL
    }
  };

  return (
    <>
      <form
        onSubmit={handleSearchSubmit}
        className="mb-10 flex gap-2 items-center sticky top-[var(--header-height)] bg-background py-4 z-10"
      >
        <div className="relative flex-grow">
          <SearchIconLucide className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            value={searchQuery}
            onChange={handleSearchInputChange}
            placeholder="Search by username or name..."
            className="w-full h-12 pl-11 pr-4 rounded-full bg-secondary border-transparent focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary text-base"
            aria-label="Search users"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="rounded-full h-12 px-6"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
          ) : (
            "Search"
          )}
        </Button>
      </form>

      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <SearchPageSkeletonItem key={`skeleton-user-item-${i}`} />
          ))}
        </div>
      )}

      {!isLoading && hasSearched && results.length === 0 && (
        <div className="text-center py-16 animate-fade-in">
          <Frown className="h-20 w-20 text-muted-foreground/50 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-foreground">
            No Users Found
          </h2>
          <p className="text-muted-foreground mt-1">
            We couldn't find anyone matching "{query}". Try a different search
            term.
          </p>
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <div className="space-y-4 animate-fade-in-up">
          {results.map((user) => (
            <Link
              key={user.id}
              href={`/u/${user.username}`}
              className="block group"
            >
              <div className="bg-card p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center space-x-4 transform hover:-translate-y-0.5 hover:border-primary border border-transparent">
                <Avatar className="h-16 w-16 border-2 border-transparent group-hover:border-primary/30 transition-colors">
                  <AvatarImage
                    src={user.avatar_url || undefined}
                    alt={user.full_name || user.username || "User"}
                    data-ai-hint="user avatar search result"
                  />
                  <AvatarFallback className="text-xl">
                    {user.full_name?.[0]?.toUpperCase() ||
                      user.username?.[0]?.toUpperCase() ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <h3 className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {user.full_name || user.username}
                  </h3>
                  {user.username && (
                    <p className="text-sm text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  )}
                  {user.bio && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {user.bio}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors ml-auto shrink-0"
                  tabIndex={-1} // So it's not focusable when whole card is a link
                >
                  View Profile
                </Button>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!isLoading && !hasSearched && !query && (
        <div className="text-center py-16">
          <Users className="h-20 w-20 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-foreground">
            Search for Creators
          </h2>
          <p className="text-muted-foreground mt-1">
            Enter a name or username above to find people on Pinclone.
          </p>
        </div>
      )}
    </>
  );
}

// Skeleton for individual list items
function SearchPageSkeletonItem() {
  return (
    <div className="bg-card p-4 rounded-xl shadow-md flex items-center space-x-4">
      <ShadSkeleton className="h-16 w-16 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <ShadSkeleton className="h-5 w-3/5 rounded bg-muted" />
        <ShadSkeleton className="h-4 w-2/5 rounded bg-muted" />
      </div>
      <ShadSkeleton className="h-9 w-24 rounded-full bg-muted" />
    </div>
  );
}

// Skeleton for the whole search UI, used as fallback in page.tsx
export function SearchPageSkeleton() {
  return (
    <>
      <div className="mb-10 flex gap-2 items-center sticky top-[var(--header-height)] bg-background py-4 z-10">
        <ShadSkeleton className="h-12 flex-grow rounded-full" />
        <ShadSkeleton className="h-12 w-24 rounded-full" />
      </div>
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <SearchPageSkeletonItem key={`skeleton-search-item-outer-${i}`} />
        ))}
      </div>
    </>
  );
}

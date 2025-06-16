
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/app-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import type { Profile } from '@/types';
import { searchUsers } from '@/services/searchService';
import { Users, Search as SearchIcon, Frown } from 'lucide-react'; // Frown for no results
import { useToast } from '@/hooks/use-toast';

function SearchPageComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const query = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(query);
  const [results, setResults] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    setSearchQuery(query); // Sync input with URL query on initial load or URL change
    if (query) {
      performSearch(query);
    } else {
      setResults([]);
      setHasSearched(false); // Reset if query is cleared
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const performSearch = async (currentQuery: string) => {
    if (!currentQuery.trim()) {
      setResults([]);
      setHasSearched(true); // Mark as searched even if query is empty
      return;
    }
    setIsLoading(true);
    setHasSearched(true);
    const { users, error } = await searchUsers(currentQuery);
    if (error) {
      toast({ variant: 'destructive', title: 'Search Error', description: error });
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
    // Update URL to reflect new search query, which will trigger useEffect
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <AppHeader /> {/* AppHeader now has its own search bar, consider how they interact or if this page needs its own */}
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold font-headline mb-2 text-center sm:text-left">Explore Users</h1>
        <p className="text-muted-foreground mb-8 text-center sm:text-left">Find and connect with other creators on Pinclone.</p>
        
        <form onSubmit={handleSearchSubmit} className="mb-8 flex gap-2 items-center">
          <div className="relative flex-grow">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              value={searchQuery}
              onChange={handleSearchInputChange}
              placeholder="Search by username or name..."
              className="w-full h-12 pl-10 pr-4 rounded-full bg-secondary border-transparent focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary text-base"
              aria-label="Search users"
            />
          </div>
          <Button type="submit" size="lg" className="rounded-full h-12 px-6" disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </form>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={`skeleton-user-${i}`} className="bg-card p-4 rounded-xl shadow-md flex flex-col items-center text-center space-y-3">
                <Skeleton className="h-20 w-20 rounded-full bg-muted" />
                <Skeleton className="h-5 w-3/4 rounded bg-muted" />
                <Skeleton className="h-4 w-1/2 rounded bg-muted" />
                <Skeleton className="h-9 w-24 rounded-full bg-muted mt-2" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && hasSearched && results.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <Frown className="h-20 w-20 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-foreground">No Users Found</h2>
            <p className="text-muted-foreground mt-1">
              We couldn't find anyone matching "{query}". Try a different search term.
            </p>
          </div>
        )}
        
        {!isLoading && results.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in-up">
            {results.map((user) => (
              <Link key={user.id} href={`/u/${user.username}`} className="block group">
                <div className="bg-card p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col items-center text-center space-y-2 transform hover:-translate-y-1">
                  <Avatar className="h-20 w-20 mb-2 border-2 border-transparent group-hover:border-primary transition-colors">
                    <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || user.username || 'User'} data-ai-hint="user avatar search result" />
                    <AvatarFallback className="text-2xl">{user.full_name?.[0] || user.username?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <h3 className="text-lg font-semibold text-foreground truncate w-full group-hover:text-primary transition-colors">{user.full_name || user.username}</h3>
                  {user.username && <p className="text-sm text-muted-foreground">@{user.username}</p>}
                  {user.bio && <p className="text-xs text-muted-foreground line-clamp-2 h-8">{user.bio}</p>}
                  <Button variant="outline" size="sm" className="rounded-full mt-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
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
                <h2 className="text-2xl font-semibold text-foreground">Search for Creators</h2>
                <p className="text-muted-foreground mt-1">Enter a name or username above to find people on Pinclone.</p>
            </div>
        )}
      </main>
    </div>
  );
}


// Wrap with Suspense for useSearchParams
export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchPageComponent />
    </Suspense>
  );
}

function SearchPageSkeleton() {
  return (
     <div className="flex flex-col flex-1 min-h-screen">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-1/3 mb-2 rounded-lg" />
        <Skeleton className="h-5 w-1/2 mb-8 rounded-lg" />
        <div className="mb-8 flex gap-2 items-center">
          <Skeleton className="h-12 flex-grow rounded-full" />
          <Skeleton className="h-12 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={`skeleton-user-${i}`} className="bg-card p-4 rounded-xl shadow-md flex flex-col items-center text-center space-y-3">
                <Skeleton className="h-20 w-20 rounded-full bg-muted" />
                <Skeleton className="h-5 w-3/4 rounded bg-muted" />
                <Skeleton className="h-4 w-1/2 rounded bg-muted" />
                <Skeleton className="h-9 w-24 rounded-full bg-muted mt-2" />
              </div>
            ))}
          </div>
      </main>
    </div>
  )
}

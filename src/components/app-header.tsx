
'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, Bell, MessageCircle, ChevronDown, UserCircle, Settings, LogOut, PlusSquare, ExternalLink, LifeBuoy, FileText, ShieldCheck, GripVertical, Loader2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useSidebar } from '@/components/ui/sidebar';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { Profile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import PincloneLogo from './pinclone-logo';

export default function AppHeader() {
  const { isMobile, toggleSidebar } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();

  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    // Update search query input if URL query param changes
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoadingUser(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') { 
          // console.error("Error fetching profile for header:", error);
        }
        setCurrentUserProfile(profileData as Profile | null);
      } else {
        setCurrentUserProfile(null);
      }
      setIsLoadingUser(false);
    };

    fetchUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
         const {data, error} = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
         if (error && error.code !== 'PGRST116') { /* console.error(error); */ } else setCurrentUserProfile(data as Profile | null);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUserProfile(null);
        if (pathname !== '/login' && pathname !== '/signup' && pathname !== '/') { // Avoid redirect loops
           router.push('/login');
        }
      } else if (event === 'USER_UPDATED' && session?.user) {
        // Refetch profile if user object updated (e.g. email change verified)
         const {data, error} = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
         if (error && error.code !== 'PGRST116') { /* console.error(error); */ } else setCurrentUserProfile(data as Profile | null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, router, pathname]);

  const handleLogout = async () => {
    setIsLoadingUser(true); // Indicate loading state during logout
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ variant: 'destructive', title: 'Logout Failed', description: error.message });
    } else {
      setCurrentUserProfile(null);
      router.push('/login'); 
      router.refresh(); // Important to re-evaluate server components
      toast({ title: 'Logged Out', description: "You have been successfully logged out." });
    }
    setIsLoadingUser(false);
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/search'); // Go to search page even if query is empty
    }
  };

  const avatarFallbackText = currentUserProfile?.full_name?.[0]?.toUpperCase() || currentUserProfile?.username?.[0]?.toUpperCase() || (currentUserProfile?.id ? 'P' : '');
  const isHomePage = pathname === '/';
  const showCreateButton = currentUserProfile && !isHomePage; // Show "Create" if logged in and not on home

  return (
    <header className="sticky top-0 z-40 w-full bg-background/90 backdrop-blur-md border-b border-border/80 shadow-sm">
      <div className="container mx-auto px-2 sm:px-4 h-[var(--header-height)] flex items-center justify-between gap-x-1 sm:gap-x-3">
        
        <div className="flex items-center gap-x-1 sm:gap-x-2">
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-foreground/70 hover:text-foreground">
                <GripVertical className="h-5 w-5" />
                <span className="sr-only">Toggle Sidebar</span>
              </Button>
            )}
            {!isMobile && (
              <Link href="/" className="p-2 focus-ring rounded-md hidden md:block">
                <PincloneLogo className="h-7 w-7 text-primary" />
                <span className="sr-only">Pinclone Home</span>
              </Link>
            )}
             <Button 
                variant={isHomePage ? "default" : "ghost"} 
                size="default" 
                className={`rounded-full px-4 font-medium text-base hidden md:inline-flex ${isHomePage ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-foreground hover:bg-secondary'}`}
                onClick={() => router.push('/')}
            >
                Home
            </Button>
            {showCreateButton && (
                 <Button 
                    variant="ghost" 
                    size="default" 
                    className="rounded-full px-4 font-medium text-base text-foreground hover:bg-secondary hidden md:inline-flex"
                    onClick={() => router.push('/create')}
                >
                    Create
                </Button>
            )}
        </div>

        <div className="flex-1 px-1 sm:px-2 max-w-2xl">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-4 rounded-full bg-secondary border-transparent focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary placeholder:text-muted-foreground/80 text-base"
                aria-label="Search Pinclone"
              />
          </form>
        </div>

        <nav className="flex items-center gap-0.5 sm:gap-1.5">
          <Button variant="ghost" size="icon" className="rounded-full h-11 w-11 sm:h-12 sm:w-12 text-foreground/70 hover:text-primary hover:bg-primary/10 focus-ring" aria-label="Notifications">
            <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full h-11 w-11 sm:h-12 sm:w-12 text-foreground/70 hover:text-primary hover:bg-primary/10 focus-ring" aria-label="Messages">
            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
          
          {isLoadingUser ? (
            <Skeleton className="h-10 w-10 rounded-full" />
          ) : currentUserProfile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full h-11 w-11 sm:h-12 sm:w-12 p-0 hover:bg-secondary focus-ring" aria-label="User Menu">
                  <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                    <AvatarImage src={currentUserProfile.avatar_url || undefined} alt={currentUserProfile.full_name || currentUserProfile.username || 'User'} data-ai-hint="profile avatar" />
                    <AvatarFallback>{avatarFallbackText}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 mt-2 shadow-modal" sideOffset={8}>
                <DropdownMenuLabel className="text-xs text-muted-foreground px-3 pt-2 pb-1">Currently in</DropdownMenuLabel>
                <Link href="/profile" passHref>
                  <DropdownMenuItem asChild className="cursor-pointer focus:bg-secondary/80 !p-0 mx-1">
                    <div className="flex items-center gap-3 p-2.5 rounded-md hover:bg-secondary/50 w-full">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={currentUserProfile.avatar_url || undefined} alt={currentUserProfile.full_name || currentUserProfile.username || 'User'} data-ai-hint="profile avatar large"/>
                        <AvatarFallback className="text-lg">{avatarFallbackText}</AvatarFallback>
                      </Avatar>
                      <div className='overflow-hidden flex-1'>
                        <p className="text-sm font-semibold truncate text-foreground">{currentUserProfile.full_name || currentUserProfile.username}</p>
                        {currentUserProfile.username && <p className="text-xs text-muted-foreground truncate">@{currentUserProfile.username}</p>}
                         {supabase.auth.getUser() && <p className="text-xs text-muted-foreground truncate">{supabase.auth.getUser().then(u=>u.data.user?.email)}</p>}
                      </div>
                    </div>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator className="my-1.5" />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground px-3 pt-1 pb-1">Your account</DropdownMenuLabel>
                  <Link href="/settings/profile" passHref>
                      <DropdownMenuItem className="focus:bg-secondary/80"><Settings className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> Settings</DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem className="focus:bg-secondary/80 disabled:opacity-50 cursor-not-allowed" disabled><PlusSquare className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> Add account</DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-1.5"/>
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground px-3 pt-1 pb-1">More options</DropdownMenuLabel>
                  <DropdownMenuItem className="focus:bg-secondary/80 disabled:opacity-50 cursor-not-allowed" disabled><ExternalLink className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> Tune your home feed</DropdownMenuItem>
                   <DropdownMenuItem className="focus:bg-secondary/80 disabled:opacity-50 cursor-not-allowed" disabled><LifeBuoy className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> Get help</DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-secondary/80 disabled:opacity-50 cursor-not-allowed" disabled><FileText className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> See terms of service</DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-secondary/80 disabled:opacity-50 cursor-not-allowed" disabled><ShieldCheck className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> See privacy policy</DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-1.5"/>
                <DropdownMenuItem 
                  className="text-red-600 dark:text-red-500 focus:bg-red-50 dark:focus:bg-red-900/50 focus:text-red-700 dark:focus:text-red-400 cursor-pointer"
                  onClick={handleLogout}
                  disabled={isLoadingUser} // Disable logout if already processing something
                >
                  {isLoadingUser && currentUserProfile ? <Loader2 className="mr-2.5 h-4.5 w-4.5 animate-spin"/> : <LogOut className="mr-2.5 h-4.5 w-4.5" />}
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
             <Button asChild size="sm" className="rounded-full px-4 h-10">
                <Link href="/login">Log In</Link>
             </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
```
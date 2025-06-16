
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Added for search submit
import { Search, Bell, MessageCircle, ChevronDown, UserCircle, Edit3, LogOut, Settings, PlusSquare, LifeBuoy, FileText, ShieldCheck, GripVertical, Loader2 } from 'lucide-react';
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
import { useSidebar } from '@/components/ui/sidebar';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { Profile } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function AppHeader() {
  const { isMobile, toggleSidebar } = useSidebar();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
        
        if (error && error.code !== 'PGRST116') { // PGRST116: no rows found, which is fine if profile not fully set up
          console.error("Error fetching profile for header:", error);
        }
        setCurrentUser(profileData as Profile | null);
      } else {
        setCurrentUser(null);
      }
      setIsLoadingUser(false);
    };

    fetchUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
         supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({data, error}) => {
           if (error && error.code !== 'PGRST116') console.error(error); else setCurrentUser(data as Profile | null);
         });
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        // router.push('/login'); // Optionally redirect on sign out
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase.auth]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ variant: 'destructive', title: 'Logout Failed', description: error.message });
    } else {
      setCurrentUser(null);
      router.push('/login'); // Redirect to login after logout
      router.refresh();
      toast({ title: 'Logged Out', description: "You have been successfully logged out." });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const avatarFallbackText = currentUser?.full_name?.[0] || currentUser?.username?.[0] || (currentUser?.id ? 'U' : '');

  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/80 shadow-sm">
      <div className="container mx-auto px-4 h-[var(--header-height)] flex items-center justify-between gap-x-2 sm:gap-x-4">
        
        <div className="flex items-center gap-x-2 flex-1">
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-2 -ml-2 text-foreground/70 hover:text-foreground">
                <GripVertical className="h-6 w-6" />
                <span className="sr-only">Toggle Sidebar</span>
              </Button>
            )}
            {/* Search bar - navigates to /search page */}
            <form onSubmit={handleSearchSubmit} className="relative flex-grow max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                <Input
                  type="search"
                  placeholder="Search users, pins..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 rounded-full bg-secondary border-transparent focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary placeholder:text-muted-foreground/80 text-base"
                  aria-label="Search Pinclone"
                />
            </form>
        </div>

        <nav className="flex items-center gap-1 sm:gap-2">
          {/* Notification and Message buttons are placeholders for now */}
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 text-foreground/70 hover:text-primary hover:bg-primary/10 focus-ring" aria-label="Notifications">
            <Bell className="h-6 w-6" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 text-foreground/70 hover:text-primary hover:bg-primary/10 focus-ring" aria-label="Messages">
            <MessageCircle className="h-6 w-6" />
          </Button>
          
          {isLoadingUser ? (
            <Skeleton className="h-10 w-10 rounded-full" />
          ) : currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full h-12 w-auto p-1.5 hover:bg-secondary focus-ring" aria-label="User Menu">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={currentUser.avatar_url || undefined} alt={currentUser.full_name || currentUser.username || 'User'} data-ai-hint="profile avatar" />
                    <AvatarFallback>{avatarFallbackText}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-1 hidden sm:inline-block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 mt-2 shadow-modal" sideOffset={8}>
                <DropdownMenuLabel className="text-xs text-muted-foreground px-3 pt-2 pb-1">Currently in</DropdownMenuLabel>
                <Link href="/profile" passHref>
                  <DropdownMenuItem asChild className="cursor-pointer focus:bg-secondary/80 !p-0 mx-1">
                    <div className="flex items-center gap-3 p-2.5 rounded-md hover:bg-secondary/50 w-full">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={currentUser.avatar_url || undefined} alt={currentUser.full_name || currentUser.username || 'User'} data-ai-hint="profile avatar large"/>
                        <AvatarFallback>{avatarFallbackText}</AvatarFallback>
                      </Avatar>
                      <div className='overflow-hidden flex-1'>
                        <p className="text-sm font-semibold truncate text-foreground">{currentUser.full_name || currentUser.username}</p>
                        {currentUser.username && <p className="text-xs text-muted-foreground truncate">@{currentUser.username}</p>}
                        {/* Email might not be directly on profile, but on auth.user */}
                        {/* <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p> */}
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />
                    </div>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground px-3 pt-1 pb-1">Your account</DropdownMenuLabel>
                  {/* Add account and convert to business are future features */}
                  <DropdownMenuItem className="focus:bg-secondary/80 disabled:opacity-50" disabled><UserCircle className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> Add account</DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-secondary/80 disabled:opacity-50" disabled><PlusSquare className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> Convert to business</DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-2"/>
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground px-3 pt-1 pb-1">More options</DropdownMenuLabel>
                  <Link href="/settings/profile" passHref>
                      <DropdownMenuItem className="focus:bg-secondary/80"><Settings className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> Settings</DropdownMenuItem>
                  </Link>
                  {/* Tune home feed is a future feature */}
                  <DropdownMenuItem className="focus:bg-secondary/80 disabled:opacity-50" disabled><Edit3 className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> Tune your home feed</DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-2"/>
                <DropdownMenuGroup>
                  <DropdownMenuItem className="focus:bg-secondary/80 disabled:opacity-50" disabled><LifeBuoy className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> Get help</DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-secondary/80 disabled:opacity-50" disabled><FileText className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> See terms of service</DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-secondary/80 disabled:opacity-50" disabled><ShieldCheck className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> See privacy policy</DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-2"/>
                <DropdownMenuItem 
                  className="text-red-600 dark:text-red-500 focus:bg-red-50 dark:focus:bg-red-900/50 focus:text-red-700 dark:focus:text-red-400 cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2.5 h-4.5 w-4.5" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
             <Button asChild size="sm" className="rounded-full">
                <Link href="/login">Log In</Link>
             </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

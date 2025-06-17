"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Search,
  Bell,
  MessageCircle,
  Settings,
  LogOut,
  GripVertical,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from "@/components/ui/sidebar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile } from "@/types";
import { useToast } from "@/hooks/use-toast";
import PincloneLogo from "./pinclone-logo";
import { signOutClient } from "@/lib/auth/client";

export default function AppHeader() {
  const { isMobile, toggleSidebar } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const searchParamsHook = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();

  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(
    null,
  );
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState(
    searchParamsHook.get("q") || "",
  );
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  useEffect(() => {
    setSearchQuery(searchParamsHook.get("q") || "");
  }, [searchParamsHook]);

  useEffect(() => {
    const fetchUserAndProfile = async (
      userId: string,
      userEmail: string | undefined,
    ) => {
      setIsLoadingUser(true); // Set loading true at the start of fetch
      setCurrentUserEmail(userEmail || null);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          console.error(
            "AppHeader: Supabase error fetching profile:",
            profileError.message,
          );
          setCurrentUserProfile(null);
        } else {
          setCurrentUserProfile(profileData as Profile | null);
        }
      } catch (e: any) {
        console.error(
          "AppHeader: Unexpected error fetching profile:",
          e.message,
        );
        setCurrentUserProfile(null);
      } finally {
        setIsLoadingUser(false);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await fetchUserAndProfile(session.user.id, session.user.email);
        } else {
          setCurrentUserProfile(null);
          setCurrentUserEmail(null);
          setIsLoadingUser(false); // Ensure loading is false if no session
        }
      },
    );

    // Initial fetch
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await fetchUserAndProfile(session.user.id, session.user.email);
      } else {
        setCurrentUserProfile(null);
        setCurrentUserEmail(null);
        setIsLoadingUser(false); // Ensure loading is false if no session
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await signOutClient();
    setIsLoggingOut(false);
    if (error) {
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      // router.push('/login'); // Handled by AppClientLayout's onAuthStateChange > router.refresh
    }
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      if (pathname === "/search") {
        router.push("/search");
      } else {
        router.push("/search");
      }
    }
  };

  const avatarFallbackText =
    currentUserProfile?.full_name?.[0]?.toUpperCase() ||
    currentUserProfile?.username?.[0]?.toUpperCase() ||
    currentUserEmail?.[0]?.toUpperCase() ||
    "P";
  const isHomePage = pathname === "/";

  return (
    <header className="sticky top-0 z-40 w-full bg-background/90 backdrop-blur-md border-b border-border/80 shadow-sm">
      <div className="container mx-auto px-2 sm:px-4 h-[var(--header-height)] flex items-center justify-between gap-x-1 sm:gap-x-3">
        <div className="flex items-center gap-x-1 sm:gap-x-2">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="text-foreground/70 hover:text-foreground"
              aria-label="Toggle sidebar"
            >
              <GripVertical className="h-5 w-5" />
            </Button>
          )}
          {!isMobile && (
            <Link
              href="/"
              className="p-2 focus-ring rounded-md hidden md:block"
              aria-label="Pinclone Home"
            >
              <PincloneLogo className="h-7 w-7 text-primary" />
            </Link>
          )}
          <Button
            variant={isHomePage ? "default" : "ghost"}
            size="default"
            className={`rounded-full px-4 font-medium text-base hidden md:inline-flex ${isHomePage ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-foreground hover:bg-secondary"}`}
            onClick={() => router.push("/")}
          >
            Home
          </Button>
          {currentUserProfile && (
            <Button
              variant="ghost"
              size="default"
              className="rounded-full px-4 font-medium text-base text-foreground hover:bg-secondary hidden md:inline-flex"
              onClick={() => router.push("/create")}
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
              placeholder="Search pins, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-full bg-secondary border-transparent focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary placeholder:text-muted-foreground/80 text-base"
              aria-label="Search Pinclone"
            />
          </form>
        </div>

        <nav className="flex items-center gap-0.5 sm:gap-1.5">
          {currentUserProfile && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-11 w-11 sm:h-12 sm:w-12 text-foreground/70 hover:text-primary hover:bg-primary/10 focus-ring"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-11 w-11 sm:h-12 sm:w-12 text-foreground/70 hover:text-primary hover:bg-primary/10 focus-ring"
                aria-label="Messages"
              >
                <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </>
          )}

          {isLoadingUser ? (
            <Skeleton className="h-10 w-10 rounded-full" />
          ) : currentUserProfile || currentUserEmail ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="rounded-full h-11 w-11 sm:h-12 sm:w-12 p-0 hover:bg-secondary focus-ring"
                  aria-label="User Menu"
                >
                  <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                    <AvatarImage
                      src={currentUserProfile?.avatar_url || undefined}
                      alt={
                        currentUserProfile?.full_name ||
                        currentUserProfile?.username ||
                        "User"
                      }
                      data-ai-hint="profile avatar"
                    />
                    <AvatarFallback>{avatarFallbackText}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-80 mt-2 shadow-modal"
                sideOffset={8}
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground px-3 pt-2 pb-1">
                  Currently in
                </DropdownMenuLabel>
                <Link href="/profile" passHref>
                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer focus:bg-secondary/80 !p-0 mx-1"
                  >
                    <div className="flex items-center gap-3 p-2.5 rounded-md hover:bg-secondary/50 w-full">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={currentUserProfile?.avatar_url || undefined}
                          alt={
                            currentUserProfile?.full_name ||
                            currentUserProfile?.username ||
                            "User"
                          }
                          data-ai-hint="profile avatar large"
                        />
                        <AvatarFallback className="text-lg">
                          {avatarFallbackText}
                        </AvatarFallback>
                      </Avatar>
                      <div className="overflow-hidden flex-1">
                        <p className="text-sm font-semibold truncate text-foreground">
                          {currentUserProfile?.full_name ||
                            currentUserProfile?.username ||
                            "My Profile"}
                        </p>
                        {currentUserProfile?.username && (
                          <p className="text-xs text-muted-foreground truncate">
                            @{currentUserProfile.username}
                          </p>
                        )}
                        {currentUserEmail && (
                          <p className="text-xs text-muted-foreground truncate">
                            {currentUserEmail}
                          </p>
                        )}
                      </div>
                    </div>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator className="my-1.5" />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground px-3 pt-1 pb-1">
                    Your account
                  </DropdownMenuLabel>
                  <Link href="/settings/profile" passHref>
                    <DropdownMenuItem className="focus:bg-secondary/80">
                      <Settings className="mr-2.5 h-4 w-4 text-muted-foreground" />{" "}
                      Settings
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-1.5" />
                <DropdownMenuItem
                  className="text-red-600 dark:text-red-500 focus:bg-red-50 dark:focus:bg-red-900/50 focus:text-red-700 dark:focus:text-red-400 cursor-pointer"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <Loader2 className="mr-2.5 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2.5 h-4 w-4" />
                  )}
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="rounded-full px-4 h-10 hidden sm:inline-flex"
              >
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full px-4 h-10">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}


"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import PincloneLogo from "@/components/pinclone-logo";
import {
  Home,
  PlusSquare,
  User,
  Settings,
  Search,
  LogIn,
  FileSignature,
  Compass,
  Loader2,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import AppHeader from "@/components/app-header";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

const AUTH_ROUTES = ["/login", "/signup"];
const PROTECTED_ROUTES = ["/create", "/profile", "/settings/profile"];
const PUBLIC_ONLY_ROUTES = ["/login", "/signup"]; // Routes only accessible when logged out

// Routes that are public but might show different content if logged in (don't force redirect if unauth)
const PUBLIC_ROUTES_WITH_AUTH_CONTENT = ["/", "/search"];
const PIN_DETAIL_REGEX = /^\/pin\/[a-zA-Z0-9-]+$/;
const USER_PROFILE_REGEX = /^\/u\/[a-zA-Z0-9_.-]+$/;


export default function AppClientLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const { toast } = useToast();

  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isProtectedRoute = PROTECTED_ROUTES.includes(pathname);
  const isPublicOnlyRoute = PUBLIC_ONLY_ROUTES.includes(pathname);


  useEffect(() => {
    const {
      data: { subscription: authListener },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newCurrentUser = session?.user ?? null;
      setCurrentUser(newCurrentUser);
      setIsLoadingAuth(false); // Auth state determined

      // Refresh server components that might depend on auth state
      // This is important after login/logout for UI to update correctly
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        router.refresh();
      }
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      setIsLoadingAuth(false);
    });

    return () => {
      authListener.unsubscribe();
    };
  }, [supabase, router]);


  useEffect(() => {
    if (isLoadingAuth) return; // Don't run redirect logic until auth state is known

    if (currentUser) {
      // User is logged in
      if (isPublicOnlyRoute) {
        // If logged in and on a public-only page (login/signup), redirect to home
        const nextUrl = searchParams.get('next') || '/';
        router.push(nextUrl);
      }
    } else {
      // User is not logged in
      if (isProtectedRoute) {
        // If not logged in and on a protected route, redirect to login
        // Preserve the intended destination via 'next' query param
        const redirectTo = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
        router.push(`/login?next=${encodeURIComponent(redirectTo)}`);
      }
    }
  }, [currentUser, isLoadingAuth, pathname, router, searchParams, isProtectedRoute, isPublicOnlyRoute]);

  // Display error/message toasts from URL params (e.g., after OAuth redirect)
  useEffect(() => {
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    if (error) {
      toast({
        variant: "destructive",
        title: decodeURIComponent(error).replace(/-/g, ' '),
        description: message ? decodeURIComponent(message).replace(/-/g, ' ') : "An unexpected error occurred.",
      });
      // Clean up URL params by replacing the current entry in history
      router.replace(pathname, { scroll: false });
    } else if (message && message === 'confirmation_pending') {
       toast({
        title: "Signup Almost Complete!",
        description: "Please check your email to confirm your account.",
      });
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, toast, router, pathname]);


  const navItems = [
    { href: "/", label: "Home", icon: Home, exact: true },
    { href: "/search", label: "Explore", icon: Search },
    { href: "/create", label: "Create", icon: PlusSquare, authRequired: true },
    {
      href: "/profile",
      label: "Profile",
      icon: User,
      authRequired: true,
    },
  ];

  const footerNavItems = [
    {
      href: "/settings/profile",
      label: "Settings",
      icon: Settings,
      authRequired: true,
    },
  ];

  const isNotFoundPage = pathname === "/not-found";

  if (isLoadingAuth && !currentUser) { // Show full page loader only on initial load if no user yet
    return (
      <>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <Toaster />
      </>
    );
  }
  
  if (isAuthRoute || isNotFoundPage) {
    // For login/signup/not-found pages, render children directly without main layout
    // unless user is already logged in and on login/signup, in which case redirect handled above.
    if (currentUser && isAuthRoute) {
       // Still loading auth or redirecting, show loader
        return (
          <>
            <div className="flex items-center justify-center min-h-screen bg-background">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <Toaster />
          </>
        );
    }
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }


  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar
        collapsible="icon"
        variant="sidebar"
        side="left"
        className="border-r border-sidebar-border shadow-sm bg-card"
      >
        <SidebarHeader className="p-0 flex items-center justify-center h-[var(--header-height)]">
          <Link
            href="/"
            aria-label="Pinclone Home"
            className="focus-ring rounded-md"
          >
            <PincloneLogo className="h-8 w-8 text-primary" />
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {navItems.map((item) => {
              // Auth check for item visibility
              if (item.authRequired && !currentUser) return null;
              
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <SidebarMenuItem key={item.href}>
                   <SidebarMenuButton
                    asChild
                    tooltip={{
                      children: item.label,
                      side: "right",
                      align: "center",
                    }}
                    isActive={isActive}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span className="group-data-[state=expanded]:inline group-data-[state=collapsed]:hidden">
                        {item.label}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2 mt-auto">
          <SidebarMenu>
            {footerNavItems.map((item) => {
              if (item.authRequired && !currentUser) return null;
              const isActive = pathname.startsWith(item.href);
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={{
                      children: item.label,
                      side: "right",
                      align: "center",
                    }}
                    isActive={isActive}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span className="group-data-[state=expanded]:inline group-data-[state=collapsed]:hidden">
                        {item.label}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
            {!currentUser && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={{
                      children: "Login",
                      side: "right",
                      align: "center",
                    }}
                    isActive={pathname === "/login"}
                  >
                    <Link href="/login">
                      <LogIn />
                      <span className="group-data-[state=expanded]:inline group-data-[state=collapsed]:hidden">
                        Login
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={{
                      children: "Sign Up",
                      side: "right",
                      align: "center",
                    }}
                    isActive={pathname === "/signup"}
                  >
                    <Link href="/signup">
                      <FileSignature />
                      <span className="group-data-[state=expanded]:inline group-data-[state=collapsed]:hidden">
                        Sign Up
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col bg-background">
        <AppHeader />
        {children}
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-6 right-6 rounded-full h-14 w-14 bg-card shadow-lg z-50 hover:bg-muted focus-ring border-2 border-primary/50 hover:border-primary text-primary hover:text-primary/90"
          aria-label="Help & Support"
        >
          <Compass className="h-7 w-7" />
        </Button>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}

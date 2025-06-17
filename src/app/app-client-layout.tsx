
'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Toaster } from '@/components/ui/toaster';
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
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import PincloneLogo from '@/components/pinclone-logo';
import { Home, PlusSquare, User, Settings, Search, LogIn, FileSignature, Compass } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import AppHeader from '@/components/app-header';
import type { User as SupabaseUser } from '@supabase/supabase-js';


export default function AppClientLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setCurrentUser(session?.user ?? null);
        setIsLoadingAuth(false);
        if (event === 'SIGNED_OUT' && !['/login', '/signup'].includes(pathname)) {
          router.push('/login');
        }
        if (event === 'SIGNED_IN' && ['/login', '/signup'].includes(pathname)) {
          router.push('/');
        }
      }
    );
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      setIsLoadingAuth(false);
      if (!session && !['/login', '/signup', '/'].includes(pathname) && !pathname.startsWith('/pin/') && !pathname.startsWith('/u/')) {
        if (!['/', '/search'].includes(pathname) && !pathname.startsWith('/pin/') && !pathname.startsWith('/u/')) {
           router.push('/login');
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, pathname, router]);

  const navItems = [
    { href: '/', label: 'Home', icon: Home, exact: true },
    { href: '/search', label: 'Explore', icon: Search },
    { href: '/create', label: 'Create', icon: PlusSquare, authRequired: true },
    { href: '/profile', label: 'Profile', icon: User, authRequired: true },
  ];

  const footerNavItems = [
    { href: '/settings/profile', label: 'Settings', icon: Settings, authRequired: true },
  ];

  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isNotFoundPage = pathname === '/not-found'; 

  if (isAuthPage || isNotFoundPage) {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  if (isLoadingAuth) {
     return (
      <>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <Toaster />
      </>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r border-sidebar-border shadow-sm bg-card">
        <SidebarHeader className="p-0 flex items-center justify-center h-[var(--header-height)]">
          <Link href="/" aria-label="Pinclone Home" className="focus-ring rounded-md">
            <PincloneLogo className="h-8 w-8 text-primary" />
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {navItems.map((item) => {
              if (item.authRequired && !currentUser) return null;
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <SidebarMenuItem key={item.href}>
                   <SidebarMenuButton
                      asChild
                      tooltip={{ children: item.label, side: "right", align: "center" }}
                      isActive={isActive}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span className="group-data-[state=expanded]:inline group-data-[state=collapsed]:hidden">{item.label}</span>
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
                      tooltip={{ children: item.label, side: "right", align: "center" }}
                      isActive={isActive}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span className="group-data-[state=expanded]:inline group-data-[state=collapsed]:hidden">{item.label}</span>
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
                    tooltip={{ children: "Login", side: "right", align: "center" }}
                    isActive={pathname === '/login'}
                  >
                    <Link href="/login">
                      <LogIn />
                      <span className="group-data-[state=expanded]:inline group-data-[state=collapsed]:hidden">Login</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={{ children: "Sign Up", side: "right", align: "center" }}
                    isActive={pathname === '/signup'}
                  >
                    <Link href="/signup">
                      <FileSignature />
                      <span className="group-data-[state=expanded]:inline group-data-[state=collapsed]:hidden">Sign Up</span>
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
        <Button variant="outline" size="icon" className="fixed bottom-6 right-6 rounded-full h-14 w-14 bg-card shadow-lg z-50 hover:bg-muted focus-ring border-2 border-primary/50 hover:border-primary text-primary hover:text-primary/90" aria-label="Help & Support">
          <Compass className="h-7 w-7" />
        </Button>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}

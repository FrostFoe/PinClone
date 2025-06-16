
'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
import { Home, PlusSquare, User, Settings, HelpCircle, LogIn, FileSignature, Search } from 'lucide-react';

export default function AppClientLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home', icon: Home, exact: true },
    { href: '/create', label: 'Create', icon: PlusSquare }, // Assuming /create will exist
    { href: '/search', label: 'Explore', icon: Search }, // Example, could be different
    { href: '/profile', label: 'Profile', icon: User },
  ];

  const footerNavItems = [
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  // A simple check for auth pages to hide sidebar/header, can be more robust
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  if (isAuthPage) {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r border-sidebar-border shadow-sm">
        <SidebarHeader className="p-0 flex items-center justify-center h-[var(--header-height)]">
          <Link href="/" aria-label="Pinclone Home" className="focus-ring rounded-md">
            <PincloneLogo className="h-7 w-7 text-primary" />
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    tooltip={{ children: item.label, side: "right", align: "center" }} 
                    isActive={item.exact ? pathname === item.href : pathname.startsWith(item.href)}
                  >
                    <a>
                      <item.icon />
                      <span className="group-data-[state=expanded]:inline group-data-[state=collapsed]:hidden">{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2 mt-auto">
          <SidebarMenu>
            {footerNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton 
                    asChild
                    tooltip={{ children: item.label, side: "right", align: "center" }}
                    isActive={pathname.startsWith(item.href)}
                  >
                    <a>
                      <item.icon />
                      <span className="group-data-[state=expanded]:inline group-data-[state=collapsed]:hidden">{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
             {/* Placeholder for Login/Signup if not authenticated */}
             {!true && ( // Replace `!true` with actual auth check
                <>
                <SidebarMenuItem>
                    <Link href="/login">
                    <SidebarMenuButton 
                        asChild
                        tooltip={{ children: "Login", side: "right", align: "center" }}
                        isActive={pathname === '/login'}
                    >
                        <a><LogIn /><span className="group-data-[state=expanded]:inline group-data-[state=collapsed]:hidden">Login</span></a>
                    </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <Link href="/signup">
                    <SidebarMenuButton 
                        asChild
                        tooltip={{ children: "Sign Up", side: "right", align: "center" }}
                        isActive={pathname === '/signup'}
                    >
                        <a><FileSignature /><span className="group-data-[state=expanded]:inline group-data-[state=collapsed]:hidden">Sign Up</span></a>
                    </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                </>
            )}
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col"> {/* Ensure SidebarInset is flex column */}
        {children}
        <Button variant="outline" size="icon" className="fixed bottom-6 right-6 rounded-full h-14 w-14 bg-card shadow-lg z-50 hover:bg-muted focus-ring border-2 border-primary/50 hover:border-primary text-primary hover:text-primary/90" aria-label="Help & Support">
          <HelpCircle className="h-7 w-7" />
        </Button>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}


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
import { Home, Plus, Bell, MessageCircle, Settings, HelpCircle } from 'lucide-react';

export default function AppClientLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <SidebarProvider defaultOpen={true}> {/* Default to expanded for desktop, icon for mobile is handled by component */}
      <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r border-sidebar-border">
        <SidebarHeader className="p-0 flex items-center justify-center h-[var(--header-height)]">
          <Link href="/" aria-label="Pinclone Home">
            <PincloneLogo />
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/" passHref legacyBehavior>
                <SidebarMenuButton 
                  asChild 
                  tooltip={{ children: "Home", side: "right", align: "center" }} 
                  isActive={pathname === '/'}
                >
                  <a>
                    <Home />
                    <span className="group-data-[state=expanded]:inline group-data-[state=collapsed]:hidden">Home</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              {/* Assuming /create is a valid route or will be */}
              <Link href="/create" passHref legacyBehavior>
                <SidebarMenuButton 
                  asChild
                  tooltip={{ children: "Create", side: "right", align: "center" }}
                  isActive={pathname === '/create'}
                >
                  <a>
                    <Plus />
                    <span className="group-data-[state=expanded]:inline group-data-[state=collapsed]:hidden">Create</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
               {/* Assuming /notifications is a valid route or will be */}
              <Link href="/notifications" passHref legacyBehavior>
                <SidebarMenuButton 
                  asChild
                  tooltip={{ children: "Notifications", side: "right", align: "center" }}
                  isActive={pathname === '/notifications'}
                >
                  <a>
                    <Bell />
                    <span className="group-data-[state=expanded]:inline group-data-[state=collapsed]:hidden">Notifications</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              {/* Assuming /messages is a valid route or will be */}
              <Link href="/messages" passHref legacyBehavior>
                <SidebarMenuButton 
                  asChild
                  tooltip={{ children: "Messages", side: "right", align: "center" }}
                  isActive={pathname === '/messages'}
                >
                  <a>
                    <MessageCircle />
                    <span className="group-data-[state=expanded]:inline group-data-[state=collapsed]:hidden">Messages</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              {/* Assuming /settings is a valid route or will be */}
              <Link href="/settings" passHref legacyBehavior>
                <SidebarMenuButton 
                  asChild
                  tooltip={{ children: "Settings", side: "right", align: "center" }}
                  isActive={pathname === '/settings'}
                >
                  <a>
                    <Settings />
                    <span className="group-data-[state=expanded]:inline group-data-[state=collapsed]:hidden">Settings</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        {children}
        <Button variant="outline" size="icon" className="fixed bottom-6 right-6 rounded-full h-14 w-14 bg-card shadow-lg z-50 hover:bg-muted" aria-label="Help">
          <HelpCircle className="h-7 w-7" />
        </Button>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}

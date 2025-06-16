
'use client';

import Link from 'next/link';
import { Search, Bell, MessageCircle, ChevronDown, UserCircle, Edit3, LogOut, Settings, PlusSquare, LifeBuoy, FileText, ShieldCheck, GripVertical, Sun, Moon } from 'lucide-react';
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
import { useSidebar } from '@/components/ui/sidebar'; // To get sidebar trigger on mobile

const loggedInUser = {
  name: 'FrostFoe',
  username: 'frostfoe',
  email: 'frost.foe@example.com',
  avatarUrl: 'https://placehold.co/80x80.png?text=FF',
  avatarFallback: 'FF',
};

export default function AppHeader() {
  const { isMobile, toggleSidebar } = useSidebar();
  // const { theme, setTheme } = useTheme(); // If you implement theme switching

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
            <div className="relative flex-grow max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                <Input
                  type="search"
                  placeholder="Search Pins, ideas, people..."
                  className="w-full h-12 pl-12 pr-4 rounded-full bg-secondary border-transparent focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary placeholder:text-muted-foreground/80 text-base"
                  aria-label="Search Pinclone"
                />
            </div>
        </div>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 text-foreground/70 hover:text-primary hover:bg-primary/10 focus-ring" aria-label="Notifications">
            <Bell className="h-6 w-6" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 text-foreground/70 hover:text-primary hover:bg-primary/10 focus-ring" aria-label="Messages">
            <MessageCircle className="h-6 w-6" />
          </Button>
          
          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="rounded-full h-12 w-auto p-1.5 hover:bg-secondary focus-ring" aria-label="User Menu">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={loggedInUser.avatarUrl} alt={loggedInUser.name} data-ai-hint="profile avatar" />
                  <AvatarFallback>{loggedInUser.avatarFallback}</AvatarFallback>
                </Avatar>
                 <ChevronDown className="h-4 w-4 text-muted-foreground ml-1 hidden sm:inline-block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 mt-2 shadow-modal" sideOffset={8}>
              <DropdownMenuLabel className="text-xs text-muted-foreground px-3 pt-2 pb-1">Currently in</DropdownMenuLabel>
              <Link href="/profile" passHref>
                <DropdownMenuItem asChild className="cursor-pointer focus:bg-secondary/80 !p-0 mx-1">
                  <a className="flex items-center gap-3 p-2.5 rounded-md hover:bg-secondary/50 w-full">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={loggedInUser.avatarUrl} alt={loggedInUser.name} data-ai-hint="profile avatar large"/>
                      <AvatarFallback>{loggedInUser.avatarFallback}</AvatarFallback>
                    </Avatar>
                    <div className='overflow-hidden flex-1'>
                      <p className="text-sm font-semibold truncate text-foreground">{loggedInUser.name}</p>
                      <p className="text-xs text-muted-foreground truncate">@{loggedInUser.username}</p>
                      <p className="text-xs text-muted-foreground truncate">{loggedInUser.email}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />
                  </a>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-muted-foreground px-3 pt-1 pb-1">Your account</DropdownMenuLabel>
                <DropdownMenuItem className="focus:bg-secondary/80"><UserCircle className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> Add account</DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-secondary/80"><PlusSquare className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> Convert to business</DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="my-2"/>
               <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-muted-foreground px-3 pt-1 pb-1">More options</DropdownMenuLabel>
                <Link href="/settings" passHref>
                    <DropdownMenuItem className="focus:bg-secondary/80"><Settings className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> Settings</DropdownMenuItem>
                </Link>
                <DropdownMenuItem className="focus:bg-secondary/80"><Edit3 className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> Tune your home feed</DropdownMenuItem>
                {/* <Button 
                  variant="ghost" 
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  className="w-full justify-start px-2 py-1.5 text-sm"
                >
                  {theme === 'light' ? <Moon className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> : <Sun className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" />}
                  Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
                </Button> */}
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="my-2"/>
               <DropdownMenuGroup>
                 <DropdownMenuItem className="focus:bg-secondary/80"><LifeBuoy className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> Get help</DropdownMenuItem>
                 <DropdownMenuItem className="focus:bg-secondary/80"><FileText className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> See terms of service</DropdownMenuItem>
                 <DropdownMenuItem className="focus:bg-secondary/80"><ShieldCheck className="mr-2.5 h-4.5 w-4.5 text-muted-foreground" /> See privacy policy</DropdownMenuItem>
               </DropdownMenuGroup>
              <DropdownMenuSeparator className="my-2"/>
              <DropdownMenuItem className="text-red-600 dark:text-red-500 focus:bg-red-50 dark:focus:bg-red-900/50 focus:text-red-700 dark:focus:text-red-400">
                <LogOut className="mr-2.5 h-4.5 w-4.5" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}

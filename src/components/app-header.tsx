
'use client';

import Link from 'next/link';
import { Search, Bell, MessageCircle, ChevronDown, UserCircle, Edit3, LogOut, Settings, PlusSquare, LifeBuoy, FileText, ShieldCheck } from 'lucide-react';
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

// Simulate logged-in user data
const loggedInUser = {
  name: 'FrostFoe',
  username: 'frostfoe',
  email: 'skid...@example.com', // Email partially obscured as in typical UI
  avatarUrl: 'https://placehold.co/40x40.png?text=F',
  avatarFallback: 'FF',
};

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4 h-[var(--header-height)] flex items-center justify-between gap-x-2 sm:gap-x-4">
        
        <div className="flex items-center gap-x-2 flex-1">
            {/* Search bar container - adjusted to take available space */}
            <div className="relative flex-grow max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search your Pins" // Updated placeholder
                className="w-full h-12 pl-12 pr-4 rounded-3xl bg-secondary border-transparent focus:border-transparent focus-visible:ring-primary"
                aria-label="Search Pinclone"
                />
            </div>
        </div>

        <div className="flex items-center gap-1">
          {/* "Your Pins" Dropdown - Placeholder structure */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="hidden sm:flex items-center gap-1 px-3 py-2 h-12 rounded-3xl text-sm font-medium hover:bg-secondary">
                Your Pins
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2">
              <DropdownMenuItem>All Pins</DropdownMenuItem>
              <DropdownMenuItem>Boards</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Create Pin</DropdownMenuItem>
              <DropdownMenuItem>Create Board</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>


          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 text-muted-foreground hover:bg-secondary" aria-label="Notifications">
            <Bell className="h-6 w-6" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 text-muted-foreground hover:bg-secondary" aria-label="Messages">
            <MessageCircle className="h-6 w-6" />
          </Button>
          
          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-1 rounded-full h-12 w-auto p-1 hover:bg-secondary" aria-label="User Menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={loggedInUser.avatarUrl} alt={loggedInUser.name} data-ai-hint="profile avatar" />
                  <AvatarFallback>{loggedInUser.avatarFallback}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 mt-2"> {/* Increased width for better layout */}
              <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">Currently in</DropdownMenuLabel>
              <Link href="/profile" passHref>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <a>
                    <div className="flex items-center gap-3 p-2 hover:bg-accent/50 dark:hover:bg-accent rounded-md mx-1 w-full">
                      <Avatar className="h-12 w-12"> {/* Larger avatar in dropdown */}
                        <AvatarImage src={loggedInUser.avatarUrl} alt={loggedInUser.name} data-ai-hint="profile avatar large" />
                        <AvatarFallback>{loggedInUser.avatarFallback}</AvatarFallback>
                      </Avatar>
                      <div className='overflow-hidden flex-1'>
                        <p className="text-sm font-semibold truncate">{loggedInUser.name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{loggedInUser.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{loggedInUser.email}</p>
                      </div>
                       <Button variant="secondary" size="sm" className="ml-auto h-8 px-3 rounded-full">View profile</Button>
                    </div>
                  </a>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">Your account</DropdownMenuLabel>
                <DropdownMenuItem><PlusSquare className="mr-2 h-4 w-4" /> Add account</DropdownMenuItem>
                <DropdownMenuItem><UserCircle className="mr-2 h-4 w-4" /> Convert to business</DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
               <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">More options</DropdownMenuLabel>
                <Link href="/settings" passHref>
                    <DropdownMenuItem><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
                </Link>
                <DropdownMenuItem><Edit3 className="mr-2 h-4 w-4" /> Tune your home feed</DropdownMenuItem>
                {/* <DropdownMenuItem>Install the app</DropdownMenuItem> */}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
               <DropdownMenuGroup>
                 <DropdownMenuItem><LifeBuoy className="mr-2 h-4 w-4" /> Get help</DropdownMenuItem>
                 <DropdownMenuItem><FileText className="mr-2 h-4 w-4" /> See terms of service</DropdownMenuItem>
                 <DropdownMenuItem><ShieldCheck className="mr-2 h-4 w-4" /> See privacy policy</DropdownMenuItem>
               </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem><LogOut className="mr-2 h-4 w-4" /> Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-12 w-10 text-muted-foreground hover:bg-secondary -ml-2" aria-label="More options">
                <ChevronDown className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 mt-2">
                {/* This dropdown seems redundant now with the more comprehensive user menu */}
                {/* Keeping for consistency if some items are distinct, or can be merged */}
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Your Profile</DropdownMenuItem>
                <DropdownMenuSeparator/>
                <DropdownMenuItem>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

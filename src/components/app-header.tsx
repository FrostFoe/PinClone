
'use client';

import { Search, Bell, MessageCircle, ChevronDown } from 'lucide-react';
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
} from '@/components/ui/dropdown-menu';

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4 h-[var(--header-height)] flex items-center justify-between gap-x-2 sm:gap-x-4">
        <div className="flex-1 max-w-xl"> {/* Search bar container */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search"
              className="w-full h-12 pl-12 pr-4 rounded-3xl bg-secondary border-transparent focus:border-transparent"
              aria-label="Search Pinclone"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 text-muted-foreground hover:bg-secondary" aria-label="Notifications">
            <Bell className="h-6 w-6" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 text-muted-foreground hover:bg-secondary" aria-label="Messages">
            <MessageCircle className="h-6 w-6" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-1 rounded-full h-12 w-auto p-1 hover:bg-secondary" aria-label="User Menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://placehold.co/32x32.png" alt="User Profile" data-ai-hint="profile avatar" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 mt-2">
              <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">Currently in</DropdownMenuLabel>
              <div className="flex items-center gap-3 p-2 hover:bg-accent/50 dark:hover:bg-accent rounded-md mx-1 cursor-pointer">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="https://placehold.co/40x40.png" alt="User Profile" data-ai-hint="profile avatar large" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className='overflow-hidden'>
                  <p className="text-sm font-medium truncate">Username</p>
                  <p className="text-xs text-muted-foreground">Personal</p>
                  <p className="text-xs text-muted-foreground truncate">user@example.com</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View public profile</DropdownMenuItem>
              <DropdownMenuItem>Edit profile</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Tune your home feed</DropdownMenuItem>
              <DropdownMenuItem>Install the app</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-12 w-10 text-muted-foreground hover:bg-secondary -ml-2" aria-label="More options">
                <ChevronDown className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 mt-2">
                <DropdownMenuItem>Add account</DropdownMenuItem>
                <DropdownMenuItem>Convert to business</DropdownMenuItem>
                <DropdownMenuSeparator/>
                <DropdownMenuItem>Get help</DropdownMenuItem>
                <DropdownMenuItem>See terms of service</DropdownMenuItem>
                <DropdownMenuItem>See privacy policy</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

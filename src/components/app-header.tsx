'use client';

import Link from 'next/link';
import { Search, Bell, MessageCircle, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PincloneLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Pinclone Logo">
    <path fillRule="evenodd" clipRule="evenodd" d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32ZM14.5816 10.0089C14.0504 10.0089 13.5774 10.1991 13.1923 10.5548C12.7046 10.9828 12.5 11.6276 12.5 12.3991C12.5 13.5366 13.0312 14.6022 13.1861 14.8689L13.2207 14.9276C13.6937 15.7349 13.9302 16.4703 13.9302 17.2889C13.9302 18.7349 13.1086 19.9911 11.6774 19.9911C11.0774 19.9911 10.5546 19.7548 10.1861 19.3349C9.91941 19.0222 9.75 18.6372 9.75 18.2316C9.75 17.5776 10.1802 16.8803 10.2857 16.7189L10.7302 15.9658C11.4707 14.6743 11.7657 13.3012 11.7657 11.9911C11.7657 9.23991 13.7046 7.43491 16.4302 7.43491C19.1557 7.43491 21.25 9.23991 21.25 11.9911C21.25 13.3012 20.9546 14.6743 20.2143 15.9658L19.7698 16.7189C19.6643 16.8803 19.25 17.5776 19.25 18.2316C19.25 18.6372 19.0802 19.0222 18.8139 19.3349C18.4454 19.7548 17.9226 19.9911 17.3226 19.9911C15.8914 19.9911 15.0698 18.7349 15.0698 17.2889C15.0698 16.4703 15.3063 15.7349 15.7793 14.9276L15.8139 14.8689C15.9688 14.6022 16.5 13.5366 16.5 12.3991C16.5 11.6276 16.2954 10.9828 15.8077 10.5548C15.4226 10.1991 15.0086 10.0089 14.5816 10.0089Z" fill="hsl(var(--primary))"/>
  </svg>
);

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-sm shadow-sm">
      <div className="container mx-auto px-4 h-header-height flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" aria-label="Pinclone Home">
            <PincloneLogo />
          </Link>
          <Button variant="default" className="font-headline hidden sm:inline-flex bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-4 rounded-3xl">Home</Button>
        </div>

        <div className="flex-1 px-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search"
              className="w-full h-12 pl-12 pr-4 rounded-3xl bg-secondary border-none focus:bg-gray-200 dark:focus:bg-gray-700 transition-colors"
              aria-label="Search Pinclone"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 text-muted-foreground hover:bg-secondary" aria-label="Notifications">
            <Bell className="h-6 w-6" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 text-muted-foreground hover:bg-secondary" aria-label="Messages">
            <MessageCircle className="h-6 w-6" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 text-muted-foreground hover:bg-secondary" aria-label="Profile">
            <UserCircle className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </header>
  );
}

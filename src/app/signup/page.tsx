
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PincloneLogo from '@/components/pinclone-logo';
import { User, Mail, Lock, FileSignature } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Handle signup logic here
    console.log('Signup submitted');
    router.push('/'); // Redirect to homepage after signup
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-rose-50 to-red-100 p-4 animate-fade-in">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block mb-6 focus-ring rounded-full">
            <PincloneLogo className="h-16 w-16 text-primary" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">
            Create your account
          </h1>
          <p className="mt-2 text-muted-foreground">
            Join Pinclone to discover and save what inspires you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-8 bg-card shadow-xl rounded-2xl">
          <div>
            <Label htmlFor="fullName" className="text-foreground/80">Full Name</Label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                placeholder="Your Name"
                className="pl-10 h-12 text-base focus-ring"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="email" className="text-foreground/80">Email address</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="pl-10 h-12 text-base focus-ring"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password" className="text-foreground/80">Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Create a strong password"
                className="pl-10 h-12 text-base focus-ring"
              />
            </div>
          </div>

          <div>
            <Button type="submit" className="w-full h-12 text-base font-semibold rounded-full bg-primary hover:bg-primary/90 focus-ring">
              <FileSignature className="mr-2 h-5 w-5" /> Sign Up
            </Button>
          </div>
           <p className="text-xs text-muted-foreground text-center pt-2">
            By signing up, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-primary">Terms of Service</Link> and{' '}
            <Link href="/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
          </p>
        </form>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:text-primary/80">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

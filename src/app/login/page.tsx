
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PincloneLogo from '@/components/pinclone-logo';
import { Mail, Lock, LogIn as LogInIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'Please check your credentials and try again.',
      });
    } else {
      toast({
        title: 'Login Successful!',
        description: "Welcome back! You're being redirected...",
      });
      router.push('/'); // Redirect to homepage after login
      router.refresh(); // Important to refresh server components that depend on auth state
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-rose-50 to-red-100 p-4 animate-fade-in">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block mb-6 focus-ring rounded-full">
            <PincloneLogo className="h-16 w-16 text-primary" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">
            Welcome back
          </h1>
          <p className="mt-2 text-muted-foreground">
            Log in to continue your visual journey.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-8 bg-card shadow-xl rounded-2xl">
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-10 h-12 text-base focus-ring"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-foreground/80">Password</Label>
              <div className="text-sm">
                {/* Password reset functionality to be implemented */}
                <Link href="#" className="font-medium text-primary hover:text-primary/80">
                  Forgot your password?
                </Link>
              </div>
            </div>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 h-12 text-base focus-ring"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <Button type="submit" className="w-full h-12 text-base font-semibold rounded-full bg-primary hover:bg-primary/90 focus-ring" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogInIcon className="mr-2 h-5 w-5" />}
              {isLoading ? 'Logging in...' : 'Log in'}
            </Button>
          </div>
        </form>
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Not a member?{' '}
          <Link href="/signup" className="font-medium text-primary hover:text-primary/80">
            Sign up now
          </Link>
        </p>
      </div>
    </div>
  );
}

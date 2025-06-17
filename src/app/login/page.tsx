
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PincloneLogo from "@/components/pinclone-logo";
import { Mail, Lock, LogIn as LogInIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { signInWithPassword } from "@/services/authService"; 
import { signInWithOAuthBrowser } from "@/lib/auth/client"; 
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const GitHubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
  </svg>
);


export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient(); // Not strictly needed here if AppClientLayout handles state

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);

  // This effect to display errors from URL is now handled globally in AppClientLayout.tsx
  // useEffect(() => {
  //   const error = searchParams.get('error');
  //   const message = searchParams.get('message');
  //   if (error) {
  //     toast({
  //       variant: "destructive",
  //       title: error.replace(/-/g, ' '),
  //       description: message ? message.replace(/-/g, ' ') : "An unexpected error occurred.",
  //     });
  //     router.replace('/login', { scroll: false });
  //   }
  // }, [searchParams, toast, router]);

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const { session, error } = await signInWithPassword(formData);

    setIsLoading(false);
    if (error) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Please check your credentials and try again.",
      });
    } else if (session) {
      toast({
        title: "Login Successful!",
        description: "Welcome back! Redirecting...",
      });
      // AppClientLayout's onAuthStateChange will handle redirect
      // router.refresh() in AppClientLayout will also handle re-rendering server components
      // No explicit router.push needed here.
    } else {
       // Should not happen if Supabase client call is correct and no error
       toast({
        variant: "destructive",
        title: "Login Issue",
        description: "Could not complete login. Please try again.",
      });
    }
  };

  const handleGitHubLogin = async () => {
    setIsGitHubLoading(true);
    const nextUrl = searchParams.get('next');
    const { error } = await signInWithOAuthBrowser('github', nextUrl || undefined);
    if (error) {
      toast({
        variant: "destructive",
        title: "GitHub Sign-In Failed",
        description: error.message || "Could not sign in with GitHub. Please try again.",
      });
      setIsGitHubLoading(false);
    }
    // On success, Supabase redirects to /auth/callback.
    // setIsGitHubLoading(false) might not be reached on success.
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

        <div className="p-8 bg-card shadow-xl rounded-2xl space-y-6">
          <form
            onSubmit={handleEmailLogin}
            className="space-y-6"
          >
            <div>
              <Label htmlFor="email" className="text-foreground/80">
                Email address
              </Label>
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
                  disabled={isLoading || isGitHubLoading}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground/80">
                  Password
                </Label>
                <div className="text-sm">
                  <Link
                    href="/forgot-password" 
                    className="font-medium text-primary hover:text-primary/80"
                  >
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
                  disabled={isLoading || isGitHubLoading}
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold rounded-full bg-primary hover:bg-primary/90 focus-ring"
                disabled={isLoading || isGitHubLoading || !email || !password}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <LogInIcon className="mr-2 h-5 w-5" />
                )}
                {isLoading ? "Logging in..." : "Log in"}
              </Button>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div>
            <Button
              variant="outline"
              type="button"
              className="w-full h-12 text-base font-semibold rounded-full focus-ring"
              onClick={handleGitHubLogin}
              disabled={isLoading || isGitHubLoading}
            >
              {isGitHubLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <GitHubIcon className="mr-2 h-5 w-5" />
              )}
              {isGitHubLoading ? "Redirecting..." : "GitHub"}
            </Button>
          </div>
        </div>
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Not a member?{" "}
          <Link
            href="/signup"
            className="font-medium text-primary hover:text-primary/80"
          >
            Sign up now
          </Link>
        </p>
      </div>
    </div>
  );
}

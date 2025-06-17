"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PincloneLogo from "@/components/pinclone-logo";
import { User, Mail, Lock, FileSignature, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { signUpWithEmail } from "@/services/authService";
import { signInWithOAuthBrowser } from "@/lib/auth/client";

// This tells Next.js to render this page dynamically at request time.
export const dynamic = "force-dynamic";

const GitHubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
  </svg>
);

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);

  const handleEmailSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const { user, session, error } = await signUpWithEmail(formData);

    setIsLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description:
          error.message || "Could not create your account. Please try again.",
      });
    } else if (user && !session) {
      // This case means email confirmation is pending.
      // The handle_new_user trigger in Supabase should have created a profile.
      toast({
        title: "Signup Almost Complete!",
        description: "Please check your email to confirm your account.",
      });
      // Redirect to login, which might show a message if 'confirmation_pending' is passed
      router.push("/login?message=confirmation_pending");
    } else if (user && session) {
      // This case means user is signed up and logged in (e.g., auto-confirm might be on, or already confirmed).
      // The handle_new_user trigger in Supabase should have created a profile.
      toast({
        title: "Signup Successful!",
        description: "Welcome! You're being logged in...",
      });
      // AppClientLayout's onAuthStateChange will handle redirect based on new session
      // If new user, they might be redirected to complete profile if that logic exists
    } else {
      // Fallback for unexpected scenarios
      toast({
        variant: "destructive",
        title: "Signup Issue",
        description:
          "An unexpected issue occurred during signup. Please try again.",
      });
    }
  };

  const handleGitHubSignup = async () => {
    setIsGitHubLoading(true);
    const nextUrl = searchParams.get("next");
    const { error } = await signInWithOAuthBrowser(
      "github",
      nextUrl || undefined,
    );
    if (error) {
      toast({
        variant: "destructive",
        title: "GitHub Sign-Up Failed",
        description:
          error.message || "Could not sign up with GitHub. Please try again.",
      });
      setIsGitHubLoading(false);
    }
    // On success, Supabase redirects. The handle_new_user trigger should create a profile.
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

        <div className="space-y-6 p-8 bg-card shadow-xl rounded-2xl">
          <form onSubmit={handleEmailSignup} className="space-y-6">
            <div>
              <Label htmlFor="fullName" className="text-foreground/80">
                Full Name
              </Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Name"
                  className="pl-10 h-12 text-base focus-ring"
                  disabled={isLoading || isGitHubLoading}
                />
              </div>
            </div>

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
              <Label htmlFor="password" className="text-foreground/80">
                Password
              </Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password (min. 6 characters)"
                  className="pl-10 h-12 text-base focus-ring"
                  disabled={isLoading || isGitHubLoading}
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold rounded-full bg-primary hover:bg-primary/90 focus-ring"
                disabled={
                  isLoading ||
                  isGitHubLoading ||
                  !email ||
                  !password ||
                  !fullName
                }
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <FileSignature className="mr-2 h-5 w-5" />
                )}
                {isLoading ? "Creating account..." : "Sign Up"}
              </Button>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or sign up with
              </span>
            </div>
          </div>

          <div>
            <Button
              variant="outline"
              type="button"
              className="w-full h-12 text-base font-semibold rounded-full focus-ring"
              onClick={handleGitHubSignup}
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
          <p className="text-xs text-muted-foreground text-center pt-2">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-primary">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-primary">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:text-primary/80"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

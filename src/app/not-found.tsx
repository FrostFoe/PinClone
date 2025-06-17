// src/app/not-found.tsx
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import PincloneLogo from "@/components/pinclone-logo";
import { Compass, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    // Wrap the main content with Suspense
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-red-50 to-amber-100 p-8 text-center animate-fade-in">
        <div className="mb-8">
          <AlertTriangle className="h-24 w-24 text-amber-500 mx-auto" />
        </div>
        <h1 className="text-6xl font-extrabold text-primary font-headline tracking-tighter">
          404
        </h1>
        <h2 className="mt-4 text-3xl font-bold text-foreground tracking-tight sm:text-4xl">
          Oops! Page Not Found.
        </h2>
        <p className="mt-4 text-lg text-muted-foreground max-w-md">
          It seems you've ventured into uncharted territory. The page you're
          looking for doesn't exist or has been moved.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button
            asChild
            size="lg"
            className="rounded-full px-8 py-3 text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg focus-ring"
          >
            <Link href="/">
              <Compass className="mr-2 h-5 w-5" />
              Go Back Home
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-full px-8 py-3 text-base font-semibold focus-ring hover:bg-secondary/70"
          >
            <Link href="/help">
              {" "}
              {/* Assuming a help page might exist */}
              Contact Support
            </Link>
          </Button>
        </div>
        <div className="mt-16">
          <PincloneLogo className="h-10 w-10 text-primary/70" />
        </div>
      </div>
    </Suspense>
  );
}

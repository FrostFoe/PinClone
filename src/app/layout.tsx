
import type { Metadata, Viewport } from "next";
import { Suspense } from 'react';
import AppClientLayout from "./app-client-layout";
import "./globals.css";
import { Loader2 } from 'lucide-react';
import { Poppins, PT_Sans } from 'next/font/google';

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
});

const ptSans = PT_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '700'],
  variable: '--font-pt-sans',
});

export const metadata: Metadata = {
  title: "Pinclone | Your Visual Discovery Engine",
  description:
    "Discover, save, and share inspiring ideas. A clone of Pinterest, built with Next.js and Supabase.",
  applicationName: "Pinclone",
  authors: [{ name: "Firebase Studio AI" }],
  keywords: [
    "pinterest clone",
    "visual discovery",
    "image sharing",
    "ideas",
    "inspiration",
    "supabase",
    "nextjs",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#E60023",
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

function LayoutSuspenseFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${ptSans.variable}`} suppressHydrationWarning>
      <head>
        {/* Removed direct Google Font links, next/font handles this */}
      </head>
      <body>
        <Suspense fallback={<LayoutSuspenseFallback />}>
          <AppClientLayout>{children}</AppClientLayout>
        </Suspense>
      </body>
    </html>
  );
}

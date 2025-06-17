
import type { Metadata, Viewport } from "next";
import { Suspense } from 'react';
import AppClientLayout from "./app-client-layout";
import "./globals.css";
import { Loader2 } from 'lucide-react';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Suspense fallback={<LayoutSuspenseFallback />}>
          <AppClientLayout>{children}</AppClientLayout>
        </Suspense>
      </body>
    </html>
  );
}


import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import AppClientLayout from "./app-client-layout";
import "./globals.css";
import { Loader2 } from "lucide-react";
import { Poppins, PT_Sans } from "next/font/google";

// Initialize Poppins font with specified subsets, display strategy, weights, and CSS variable.
const poppins = Poppins({
  subsets: ["latin"],
  display: "swap", // Ensures text remains visible during font loading by using a fallback font.
  weight: ["300", "400", "500", "600", "700"], // Specifies the font weights to load.
  variable: "--font-poppins", // CSS variable for use in Tailwind.
});

// Initialize PT Sans font with specified subsets, display strategy, weights, and CSS variable.
const ptSans = PT_Sans({
  subsets: ["latin"],
  display: "swap", // Ensures text remains visible during font loading.
  weight: ["400", "700"], // Specifies the font weights to load.
  variable: "--font-pt-sans", // CSS variable for use in Tailwind.
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
  themeColor: "#E60023", // Matches the primary color
  colorScheme: "light dark", // Supports both light and dark mode
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevents zooming, common in native-like apps
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
    <html
      lang="en"
      className={`${poppins.variable} ${ptSans.variable}`} // Apply font variables to HTML tag.
      suppressHydrationWarning // Recommended for Next.js 13+ App Router with theme switching
    >
      <head>
        {/* next/font handles optimized font loading. No direct <link> tags for Google Fonts needed here. */}
        {/* Preload warnings in the browser console regarding fonts are often performance hints and may not indicate critical issues if fonts display correctly. */}
      </head>
      <body>
        <Suspense fallback={<LayoutSuspenseFallback />}>
          <AppClientLayout>{children}</AppClientLayout>
        </Suspense>
      </body>
    </html>
  );
}

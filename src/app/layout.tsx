
import type { Metadata, Viewport } from 'next';
import AppClientLayout from './app-client-layout';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pinclone | Your Visual Discovery Engine',
  description: 'Discover, save, and share inspiring ideas. A clone of Pinterest, built with Next.js and Supabase.',
  applicationName: 'Pinclone',
  authors: [{ name: 'Firebase Studio AI' }],
  keywords: ['pinterest clone', 'visual discovery', 'image sharing', 'ideas', 'inspiration', 'supabase', 'nextjs'],
  // themeColor: '#E60023', // Primary color for browser UI theming, can also be set in manifest
  manifest: '/manifest.json', // Example, you'd need to create this
  icons: {
    icon: '/favicon.ico', // Example
    apple: '/apple-touch-icon.png', // Example
  }
};

export const viewport: Viewport = {
  themeColor: '#E60023', // Primary color for browser UI theming
  colorScheme: 'light dark', // Supports both light and dark mode based on user preference
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AppClientLayout>{children}</AppClientLayout>
      </body>
    </html>
  );
}


import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      // Add your Supabase project's image hostname here if using Supabase Storage
      // Example: yourprojectid.supabase.co
      // You'll need to extract the hostname from your NEXT_PUBLIC_SUPABASE_URL
      // If NEXT_PUBLIC_SUPABASE_URL is https://xyz.supabase.co, then hostname is xyz.supabase.co
      // This is a common pattern, but adjust if your URL structure is different.
      process.env.NEXT_PUBLIC_SUPABASE_URL
        ? {
            protocol: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).protocol.slice(0, -1) as 'http' | 'https',
            hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
            port: '',
            pathname: '/storage/v1/object/public/**',
          }
        : undefined,
    ].filter(Boolean) as any, // Filter out undefined if env var is not set
  },
};

export default nextConfig;


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
      // Example:
      // {
      //   protocol: 'https',
      //   hostname: 'yourprojectid.supabase.co', // Replace with your Supabase project ID
      //   port: '',
      //   pathname: '/storage/v1/object/public/**',
      // },
    ],
  },
};

export default nextConfig;

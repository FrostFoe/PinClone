import type { NextConfig } from "next";

let supabaseImagePattern: any = undefined;
try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    supabaseImagePattern = {
      protocol: supUrl.protocol.slice(0, -1) as "http" | "https",
      hostname: supUrl.hostname,
      port: supUrl.port || "", // Ensure port is handled correctly
      pathname: "/storage/v1/object/public/**",
    };
  }
} catch (error) {
  console.warn(
    `Warning: Could not parse NEXT_PUBLIC_SUPABASE_URL ('${process.env.NEXT_PUBLIC_SUPABASE_URL}') for image optimization. Supabase image remote pattern will not be configured. Error: ${(error as Error).message}`,
  );
}

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
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      supabaseImagePattern, // This will be undefined if parsing failed or env var not set
    ].filter(Boolean) as any, // Filter out undefined if env var is not set or parsing failed
  },
  webpack: (config) => {
    // Configuration to suppress the "Critical dependency: the request of a dependency is an expression" warning
    // often seen with @supabase/realtime-js. This is generally safe.
    config.module = {
      ...config.module,
      exprContextCritical: false,
    };
    return config;
  },
};

export default nextConfig;

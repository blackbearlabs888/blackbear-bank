import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel handles output automatically, no need for standalone
  // output: "standalone", // Uncomment for Docker/self-hosted deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    'localhost',
    '.space.z.ai',
    '.vercel.app',
  ],
  // Enable experimental features if needed
  experimental: {
    // serverActions is now default in Next.js 15+
  },
};

export default nextConfig;

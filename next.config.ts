import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel handles build output automatically
  // Uncomment below for Docker/self-hosted deployment:
  // output: "standalone",
  
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    'localhost',
    '.space.z.ai',
    '.vercel.app',
  ],
};

export default nextConfig;

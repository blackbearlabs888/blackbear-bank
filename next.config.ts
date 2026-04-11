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
    'preview-chat-d538e41c-3eb4-445b-b8d8-1c6f3bcbeee8.space.z.ai',
    '.vercel.app',
  ],
};

// Force restart for Prisma schema update
export default nextConfig;

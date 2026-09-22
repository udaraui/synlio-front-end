import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    INTEGRATION_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  output: 'standalone',
  // Note: eslint configuration is no longer supported in Next.js 16
  // Use next.config.js with ESLINT_IGNORE or .eslintignore file instead
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.blob.core.windows.net",
      },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // can be '2mb', '10mb', '1gb'
    },
  }
};

export default nextConfig;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize images for Vercel deployment
  images: {
    domains: ["localhost"],
    formats: ["image/webp", "image/avif"],
  },

  // Compression configuration
  compress: true,

  // Environment variables that should be available to the client
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  },

  // Webpack configuration for Blob storage
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ⬇️ REQUIRED for Netlify Drop (Generates 'out' folder)
  output: 'export',

  // ⬇️ OPTIONAL: Disables source maps to fix "Unable to read file" warnings
  productionBrowserSourceMaps: false,

  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // ⬇️ Unoptimized is often needed for 'export' if you don't use a paid loader
    unoptimized: true, 
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

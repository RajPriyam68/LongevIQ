import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep the dev-server build output separate from `next build`'s `.next` so
  // running a production build never clobbers a running dev server.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  allowedDevOrigins: ['.monkeycode-ai.live'],
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";
// @ts-expect-error - next-pwa ne fournit pas de types TypeScript officiels
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  // Vos configurations Next.js s'il y en a
};

export default withPWA(nextConfig);
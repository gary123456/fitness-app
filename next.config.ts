import type { NextConfig } from "next";
// @ts-expect-error - next-pwa ne fournit pas de types TypeScript officiels
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // 🛡️ STRATÉGIE DE CACHE POUR LE MODE HORS-LIGNE
  runtimeCaching: [
    {
      // Les polices et styles restent en cache pour charger vite
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 }, // 1 an
      },
    },
    {
      // Les requêtes vers Supabase (API) ne doivent JAMAIS être mises en cache PWA
      // (Elles sont gérées par SWR côté React)
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: "NetworkOnly",
    },
    {
      // Les fichiers CSS, JS, HTML de base sont mis en cache
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "static-font-assets" },
    },
    {
      // Les images statiques
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-image-assets",
        expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 }, // 24 heures
      },
    },
  ],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
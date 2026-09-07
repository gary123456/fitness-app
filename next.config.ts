import type { NextConfig } from "next";
// @ts-expect-error - next-pwa ne fournit pas de types TypeScript officiels
import withPWAInit from "next-pwa";

// 🛡️ SÉCURITÉ 1 : On va chercher la fonction au bon endroit, peu importe comment Next.js compile
const pluginPWA = typeof withPWAInit === 'function' ? withPWAInit : withPWAInit.default;

const withPWA = pluginPWA ? pluginPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  importScripts: ['/custom-sw.js'], // 💉 Notre script de Notifications Push
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: "NetworkOnly",
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "static-font-assets" },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-image-assets",
        expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
  ],
}) : null;

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

// 🛡️ SÉCURITÉ 2 : Si la PWA échoue, on démarre l'application quand même pour ne jamais bloquer le serveur
export default typeof withPWA === "function" ? withPWA(nextConfig) : nextConfig;
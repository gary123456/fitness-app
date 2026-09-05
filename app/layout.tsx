import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider"; // <-- IMPORT DU THEME
import { SWRConfig } from "swr"; // <-- AJOUT

export const viewport: Viewport = {
  themeColor: "#14b8a6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Vivex | Masterclass Fitness",
  description: "Écosystème de recomposition corporelle sur-mesure.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vivex",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" translate="no" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col antialiased bg-zinc-50 dark:bg-zinc-950 pb-20 md:pb-0">
        
        {/* ENVELOPPE DE THÈME POUR LE MODE SOMBRE */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SWRConfig value={{ revalidateOnFocus: false }}> {/* <-- AJOUT */}
          
          <Navbar />

          <main className="flex-1 flex flex-col">
            {children}
          </main>

          <footer className="w-full py-6 mt-auto border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 relative z-40">
            <div className="container mx-auto px-4 flex flex-col items-center justify-center space-y-3">
              <div className="flex items-center space-x-3">
                <img 
                  src="/Logo_GSC_NoBG.png" 
                  alt="GSC Logo" 
                  className="h-9 w-auto object-contain drop-shadow-sm" 
                />
                <p className="text-sm md:text-base font-medium text-zinc-500 dark:text-zinc-400 text-center">
                  Application développée par <span className="font-bold text-zinc-900 dark:text-zinc-100">Gary Sextius</span> - Gsextius Consulting LLC
                </p>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-600">
                © {new Date().getFullYear()} Tous droits réservés.
              </p>
            </div>
          </footer>

          </SWRConfig> {/* <-- FIN AJOUT */}
        </ThemeProvider>
      </body>
    </html>
  );
}
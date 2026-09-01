"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Dumbbell, LogOut, Globe, Activity } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/lib/useLanguage";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang } = useLanguage();

  if (pathname === "/login" || pathname === "/onboarding" || pathname === "/") return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Dictionnaire avec l'onglet Analytics ajouté
  const t = {
    FR: { dash: "Dashboard", prog: "Programme", stats: "Analytics", logout: "Sortir" },
    EN: { dash: "Dashboard", prog: "Workout", stats: "Analytics", logout: "Logout" }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

  const navItems = [
    { name: txt.dash, href: "/dashboard", icon: LayoutDashboard },
    { name: txt.prog, href: "/workout", icon: Dumbbell },
    { name: txt.stats, href: "/analytics", icon: Activity },
  ];

  const LanguageSelector = () => (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center space-x-2 rounded-md p-2 text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 focus:outline-none">
        <Globe className="h-5 w-5" />
        {/* CORRECTION : Suppression de "hidden md:inline" pour forcer l'affichage sur mobile et PC */}
        <span>{lang === "FR" ? "🇫🇷 FR" : "🇬🇧 EN"}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
        <DropdownMenuItem onClick={() => setLang("FR")} className="cursor-pointer font-bold dark:text-zinc-100">🇫🇷 Français</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLang("EN")} className="cursor-pointer font-bold dark:text-zinc-100">🇬🇧 English</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {/* NAVIGATION DESKTOP */}
      <nav className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 hidden md:block">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="flex items-center">
              <img src="/logo.png" alt="Vivex Logo" className="h-20 w-auto object-contain drop-shadow-sm" />
            </Link>

            <div className="flex space-x-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} className={`flex items-center space-x-2 rounded-md px-4 py-2 text-sm font-bold transition-all ${
                      isActive ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-50"
                    }`}>
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <LanguageSelector />
            <button onClick={handleLogout} className="flex items-center space-x-2 rounded-md p-2 text-sm font-bold text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-500">
              <LogOut className="h-5 w-5" />
              <span>{txt.logout}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* TOP BAR MOBILE (Logo Agrandi et Drapeau visible) */}
      <div className="md:hidden sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 h-20 flex items-center justify-between px-4">
        <Link href="/dashboard">
          <img src="/logo.png" alt="Vivex Logo" className="h-14 w-auto object-contain drop-shadow-sm" />
        </Link>
        <LanguageSelector />
      </div>

      {/* BOTTOM BAR MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 z-50 w-full border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center space-y-1 p-2 w-20 transition-colors ${
                  isActive ? "text-teal-500 dark:text-teal-400" : "text-zinc-400 dark:text-zinc-500"
                }`}>
                <Icon className={`h-6 w-6 ${isActive ? "stroke-[2.5px]" : "stroke-[2px]"}`} />
                <span className="text-[10px] font-extrabold uppercase tracking-wider">{item.name}</span>
              </Link>
            );
          })}
          <button onClick={handleLogout} className="flex flex-col items-center space-y-1 p-2 w-20 text-zinc-400 hover:text-red-500 transition-colors">
            <LogOut className="h-6 w-6 stroke-[2px]" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">{txt.logout}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
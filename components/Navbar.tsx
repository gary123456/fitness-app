"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Dumbbell, LogOut, Globe, Activity, Sun, Moon, Camera, User, Wrench, Settings, Utensils } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/lib/useLanguage";
import { useTheme } from "next-themes";
import useSWR from "swr";

const fetchNavbarProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("first_name, avatar_url").eq("id", user.id).single();
  return profile;
};

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();
  
  const { data: profile } = useSWR('navbarProfile', fetchNavbarProfile, { revalidateOnFocus: false });

  if (pathname === "/login" || pathname === "/onboarding" || pathname === "/") return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const t = {
    FR: { dash: "Dashboard", prog: "Programme", nutrition: "Nutrition", stats: "Analytics", track: "Progression", tools: "Outils", profile: "Profil", settings: "Paramètres", logout: "Sortir", account: "Mon Compte" },
    EN: { dash: "Dashboard", prog: "Workout", nutrition: "Diet", stats: "Analytics", track: "Progress", tools: "Tools", profile: "Profile", settings: "Settings", logout: "Logout", account: "My Account" }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

  const navItems = [
    { name: txt.dash, href: "/dashboard", icon: LayoutDashboard },
    { name: txt.prog, href: "/workout", icon: Dumbbell },
    { name: txt.nutrition, href: "/nutrition", icon: Utensils },
    { name: txt.track, href: "/progress", icon: Camera },
    { name: txt.stats, href: "/analytics", icon: Activity },
    { name: txt.tools, href: "/tools", icon: Wrench },
  ];

  const LanguageSelector = () => (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center space-x-2 rounded-xl px-4 py-2 text-sm font-bold bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md shadow-sm border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 transition-all outline-none">
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{lang === "FR" ? "🇫🇷 FR" : "🇬🇧 EN"}</span>
        <span className="sm:hidden">{lang === "FR" ? "🇫🇷" : "🇬🇧"}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-zinc-200 dark:border-zinc-800 mt-2 rounded-2xl p-2 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
        <DropdownMenuItem onClick={() => setLang("FR")} className="font-bold cursor-pointer rounded-xl p-3 focus:bg-teal-50 dark:focus:bg-teal-500/10 focus:text-teal-600 dark:focus:text-teal-400 transition-colors outline-none">🇫🇷 Français</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLang("EN")} className="font-bold cursor-pointer rounded-xl p-3 mt-1 focus:bg-teal-50 dark:focus:bg-teal-500/10 focus:text-teal-600 dark:focus:text-teal-400 transition-colors outline-none">🇬🇧 English</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const ThemeToggle = () => (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative flex items-center justify-center p-2 rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 transition-colors focus:outline-none"
    >
      <Sun className="h-5 w-5 transition-all scale-100 rotate-0 dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-5 w-5 transition-all scale-0 rotate-90 dark:scale-100 dark:rotate-0" />
      <span className="sr-only">Toggle theme</span>
    </button>
  );

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative outline-none group focus:ring-2 focus:ring-teal-500 rounded-full shrink-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-teal-400 to-indigo-500 flex items-center justify-center text-white font-black shadow-sm group-hover:shadow-md transition-all">
            {profile?.avatar_url && profile.avatar_url !== 'default' ? (
              <span className="text-xl sm:text-2xl leading-none">{profile.avatar_url}</span>
            ) : (
              <span className="text-lg sm:text-xl leading-none">{profile?.first_name ? profile.first_name.charAt(0).toUpperCase() : <User className="w-5 h-5 sm:w-6 sm:h-6" />}</span>
            )}
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] mt-2">
        <DropdownMenuLabel className="px-3 py-2 text-xs font-black tracking-widest text-zinc-400 uppercase">{txt.account}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800/50 my-2" />
        
        <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer p-3 rounded-xl font-bold dark:text-zinc-100 focus:bg-teal-50 dark:focus:bg-teal-500/10 focus:text-teal-600 dark:focus:text-teal-400 transition-colors outline-none">
          <User className="w-5 h-5 mr-3 opacity-70" /> {txt.profile}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer p-3 rounded-xl font-bold dark:text-zinc-100 focus:bg-teal-50 dark:focus:bg-teal-500/10 focus:text-teal-600 dark:focus:text-teal-400 transition-colors outline-none">
          <Settings className="w-5 h-5 mr-3 opacity-70" /> {txt.settings}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800/50 my-2" />
        
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer p-3 rounded-xl font-bold text-orange-600 focus:bg-orange-50 dark:focus:bg-orange-500/10 focus:text-orange-500 transition-colors outline-none">
          <LogOut className="w-5 h-5 mr-3 opacity-70" /> {txt.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 hidden md:block">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="flex items-center">
              <img src="/Logo_GSC_NoBG.png" alt="Vivex Logo" className="h-10 w-auto object-contain drop-shadow-sm hover:opacity-80 transition-opacity" />
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

          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <LanguageSelector />
            <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-2"></div>
            <UserMenu />
          </div>
        </div>
      </nav>

      {/* TOP BAR MOBILE */}
      <div className="md:hidden sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 h-20 flex items-center justify-between px-4 shadow-sm">
        <Link href="/dashboard">
          <img src="/Logo_GSC_NoBG.png" alt="Vivex Logo" className="h-10 w-auto object-contain drop-shadow-sm" />
        </Link>
        <div className="flex items-center space-x-3">
          <ThemeToggle />
          <LanguageSelector />
          <UserMenu />
        </div>
      </div>

      {/* BOTTOM NAV MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 z-50 w-full border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center space-y-1 p-2 w-16 transition-colors ${
                  isActive ? "text-teal-500 dark:text-teal-400" : "text-zinc-400 dark:text-zinc-500"
                }`}>
                <Icon className={`h-6 w-6 ${isActive ? "stroke-[2.5px]" : "stroke-[2px]"}`} />
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-center line-clamp-1">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
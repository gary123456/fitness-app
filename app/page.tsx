"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dumbbell, Brain, Activity, ArrowRight, Globe, Lock, Sun, Moon } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function LandingPage() {
  const { lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();

  const t = {
    FR: { 
      login: "Espace Athlète", 
      heroTitle: "L'ingénierie au service de votre physique.", 
      heroSub: "Vivex Fitness n'est pas une simple application. C'est un écosystème algorithmique qui adapte votre volume d'entraînement, calcule vos macros et cartographie votre fatigue en temps réel.", 
      start: "Commencer l'expérience", 
      feat1Title: "Auto-Régulation Algorithmique", 
      feat1Sub: "Fini les programmes figés. L'IA ajuste vos charges et séries selon votre fatigue, votre matériel et vos sports complémentaires (Foot, JJB, etc).", 
      feat2Title: "Matrice Nutritionnelle", 
      feat2Sub: "Calcul dynamique de vos calories, macronutriments et recommandations de vitamines/minéraux pour optimiser les hormones et la récupération.", 
      feat3Title: "Tracker & Analytics Pro", 
      feat3Sub: "Chronomètre intégré, duplication rapide, historique à vie et graphiques de volume pour garantir la surcharge progressive mathématique." 
    },
    EN: { 
      login: "Athlete Portal", 
      heroTitle: "Engineering applied to your physique.", 
      heroSub: "Vivex Fitness is not just an app. It's an algorithmic ecosystem that adapts your training volume, calculates your macros, and maps your fatigue in real-time.", 
      start: "Start the experience", 
      feat1Title: "Algorithmic Auto-Regulation", 
      feat1Sub: "No more rigid programs. The AI adjusts your weights and sets based on fatigue, equipment, and other sports (Soccer, BJJ, etc).", 
      feat2Title: "Nutritional Matrix", 
      feat2Sub: "Dynamic calculation of calories, macros, and vitamin/mineral recommendations to optimize hormones and recovery.", 
      feat3Title: "Pro Tracker & Analytics", 
      feat3Sub: "Built-in timer, quick duplication, lifetime history, and volume charts to guarantee mathematical progressive overload." 
    }
  };

  const txt = t[lang as keyof typeof t] || t.FR;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col selection:bg-teal-500 selection:text-white">
      
      {/* HEADER SPÉCIFIQUE LANDING PAGE */}
      <header className="absolute top-0 w-full z-50 px-6 py-6 flex items-center justify-between">
        <div className="flex items-center">
          <img src="/Logo_GSC_NoBG.png" alt="Vivex Logo" className="h-12 w-auto object-contain drop-shadow-sm" />
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          
          {/* BOUTON THEME */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative flex items-center justify-center p-2 rounded-full bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors hover:bg-white dark:hover:bg-zinc-900 focus:outline-none"
          >
            <Sun className="h-4 w-4 transition-all scale-100 rotate-0 dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute h-4 w-4 transition-all scale-0 rotate-90 dark:scale-100 dark:rotate-0" />
            <span className="sr-only">Toggle theme</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center space-x-2 rounded-full px-3 py-1.5 text-sm font-bold bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors hover:bg-white dark:hover:bg-zinc-900">
              <Globe className="h-4 w-4" /><span>{lang === "FR" ? "FR" : "EN"}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white dark:bg-zinc-950">
              <DropdownMenuItem onClick={() => setLang("FR")} className="font-bold">🇫🇷 Français</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("EN")} className="font-bold">🇬🇧 English</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/login">
            <Button variant="outline" className="hidden sm:flex font-bold border-zinc-300 dark:border-zinc-700 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <Lock className="w-4 h-4 mr-2" /> {txt.login}
            </Button>
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative flex-1 flex flex-col items-center justify-center px-4 pt-32 pb-20 text-center overflow-hidden">
        {/* Background Effets Visuels */}
        <div className="absolute inset-0 w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-teal-500 opacity-20 blur-[100px]"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center space-x-2 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-4 py-2 rounded-full font-bold text-sm border border-teal-200 dark:border-teal-800 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
            <span>V1.0 Stable Release</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            {txt.heroTitle.split('.')[0]}<span className="text-teal-500">.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            {txt.heroSub}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 pt-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <Link href="/onboarding" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-bold bg-teal-500 hover:bg-teal-600 text-white shadow-xl shadow-teal-500/20 transition-transform active:scale-95">
                {txt.start} <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto sm:hidden">
              <Button size="lg" variant="outline" className="w-full h-14 font-bold border-zinc-300 dark:border-zinc-700">
                {txt.login}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="relative z-10 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 py-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          
          {/* Feature 1 */}
          <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
            <div className="h-16 w-16 bg-teal-50 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center text-teal-500 mb-2">
              <Brain className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{txt.feat1Title}</h3>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">{txt.feat1Sub}</p>
          </div>

          {/* Feature 2 */}
          <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
            <div className="h-16 w-16 bg-orange-50 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-500 mb-2">
              <Dumbbell className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{txt.feat2Title}</h3>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">{txt.feat2Sub}</p>
          </div>

          {/* Feature 3 */}
          <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
            <div className="h-16 w-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-500 mb-2">
              <Activity className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{txt.feat3Title}</h3>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">{txt.feat3Sub}</p>
          </div>

        </div>
      </section>

    </div>
  );
}
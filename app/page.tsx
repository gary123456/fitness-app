"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dumbbell, Brain, Activity, ArrowRight, Globe, Lock, Sun, Moon, Zap, ShieldCheck, Smartphone, Sparkles, ScanLine } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function LandingPage() {
  const { lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();

  const t = {
    FR: { 
      login: "Espace Athlète", 
      heroBadge: "Moteur Algorithmique V1.0",
      heroTitle1: "L'ingénierie au service",
      heroTitle2: "de votre physique.", 
      heroSub: "Plus qu'une simple application. Un écosystème qui dicte votre volume d'entraînement, calcule vos macros et cartographie votre fatigue centrale en temps réel.", 
      start: "Démarrer la transformation", 
      feat1Title: "Auto-Régulation IA", 
      feat1Sub: "L'algorithme ajuste vos charges et séries selon votre Readiness Score, votre sommeil et votre historique. Finis les plateaux.", 
      feat2Title: "Nutrition Métabolique", 
      feat2Sub: "Calcul clinique de vos macros, micronutriments et gestion de la déshydratation pour un anabolisme maximal.", 
      feat3Title: "Tracker Pro & Hors-Ligne", 
      feat3Sub: "Chronomètre OLED, calculatrice de disques et sauvegarde locale. Entraînez-vous dans un bunker, vos données seront synchronisées.",
      feat4Title: "Bientôt : Scanner IA",
      feat4Sub: "Prenez votre repas en photo, l'IA calcule vos calories instantanément.",
      ctaTitle: "Prêt à dominer votre génétique ?",
      ctaSub: "Rejoignez l'élite. Prenez le contrôle de votre physiologie avec l'outil le plus avancé du marché.",
      footer: "© 2026 Vivex Consulting LLC. Tous droits réservés."
    },
    EN: { 
      login: "Athlete Portal", 
      heroBadge: "Algorithmic Engine V1.0",
      heroTitle1: "Engineering applied",
      heroTitle2: "to your physique.", 
      heroSub: "More than just an app. An ecosystem that dictates your training volume, calculates macros, and maps your central fatigue in real-time.", 
      start: "Start your transformation", 
      feat1Title: "AI Auto-Regulation", 
      feat1Sub: "The algorithm adjusts your weights and sets based on your Readiness Score, sleep, and history. No more plateaus.", 
      feat2Title: "Metabolic Nutrition", 
      feat2Sub: "Clinical calculation of your macros, micronutrients, and hydration management for maximal anabolism.", 
      feat3Title: "Pro Tracker & Offline", 
      feat3Sub: "OLED timer, plate calculator, and local save. Train in a bunker, your data will sync when you're back online.",
      feat4Title: "Soon: AI Food Scanner",
      feat4Sub: "Snap a photo of your meal, AI calculates your calories instantly.",
      ctaTitle: "Ready to dominate your genetics?",
      ctaSub: "Join the elite. Take control of your physiology with the most advanced tool on the market.",
      footer: "© 2026 Vivex Consulting LLC. All rights reserved."
    }
  };

  const txt = t[lang as keyof typeof t] || t.FR;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col selection:bg-teal-500 selection:text-white font-sans transition-colors duration-300">
      
      {/* 🟢 HEADER */}
      <header className="absolute top-0 w-full z-50 px-4 sm:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="bg-zinc-900 dark:bg-white p-2 rounded-xl shadow-lg">
            <img src="/Logo_GSC_NoBG.png" alt="Vivex Logo" className="h-6 w-auto object-contain invert dark:invert-0" />
          </div>
          <span className="font-black text-xl tracking-widest text-zinc-900 dark:text-white hidden sm:block">VIVEX</span>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative flex items-center justify-center p-2.5 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Sun className="h-4 w-4 transition-all scale-100 rotate-0 dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute h-4 w-4 transition-all scale-0 rotate-90 dark:scale-100 dark:rotate-0" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center space-x-2 rounded-full px-4 py-2 text-sm font-bold bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Globe className="h-4 w-4" /><span>{lang === "FR" ? "FR" : "EN"}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white dark:bg-zinc-950 font-bold border-zinc-200 dark:border-zinc-800 rounded-xl">
              <DropdownMenuItem onClick={() => setLang("FR")} className="cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-900">🇫🇷 Français</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("EN")} className="cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-900">🇬🇧 English</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/login">
            <Button variant="outline" className="hidden sm:flex h-10 px-6 font-bold border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all hover:scale-105 active:scale-95">
              <Lock className="w-4 h-4 mr-2" /> {txt.login}
            </Button>
          </Link>
        </div>
      </header>

      {/* 🟢 HERO SECTION */}
      <section className="relative flex flex-col items-center justify-center px-4 pt-32 pb-20 text-center min-h-[90vh] overflow-hidden">
        {/* Grille de fond et Halos lumineux de type Silicon Valley */}
        <div className="absolute inset-0 w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[300px] w-[300px] sm:h-[500px] sm:w-[500px] rounded-full bg-teal-500 opacity-20 dark:opacity-10 blur-[100px]"></div>
        <div className="absolute left-1/4 top-1/4 -z-10 h-[200px] w-[200px] rounded-full bg-indigo-500 opacity-20 dark:opacity-10 blur-[80px]"></div>
        
        <div className="relative z-10 max-w-5xl mx-auto space-y-8 flex flex-col items-center">
          
          {/* Badge V1.0 */}
          <div className="inline-flex items-center space-x-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-widest shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="flex h-2 w-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span>{txt.heroBadge}</span>
          </div>
          
          {/* Titre avec dégradé */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter leading-[1.05] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 text-zinc-900 dark:text-white">
            {txt.heroTitle1} <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-500 via-indigo-500 to-purple-500 animate-gradient-x">
              {txt.heroTitle2}
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            {txt.heroSub}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 pt-8 animate-in fade-in zoom-in-95 duration-700 delay-300 w-full sm:w-auto px-4">
            <Link href="/onboarding" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-14 sm:h-16 px-8 text-lg font-black bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95">
                {txt.start} <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto sm:hidden">
              <Button size="lg" variant="outline" className="w-full h-14 font-black border-zinc-300 dark:border-zinc-700 rounded-full">
                <Lock className="w-5 h-5 mr-2" /> {txt.login}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 🟢 BENTO GRID FEATURES */}
      <section className="relative z-10 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-3xl border-t border-zinc-200 dark:border-zinc-900 py-24 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Bento 1: IA (Prend 2 colonnes sur desktop) */}
            <div className="md:col-span-2 bg-gradient-to-br from-zinc-100 to-white dark:from-zinc-900 dark:to-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 sm:p-12 shadow-sm hover:shadow-xl transition-shadow flex flex-col justify-between group overflow-hidden relative">
              <div className="absolute -right-20 -bottom-20 opacity-5 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none">
                <Brain className="w-96 h-96 text-indigo-500" />
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-500/30">
                  <Activity className="w-7 h-7" />
                </div>
                <h3 className="text-3xl font-black text-zinc-900 dark:text-white mb-4">{txt.feat1Title}</h3>
                <p className="text-lg text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed max-w-lg">{txt.feat1Sub}</p>
              </div>
            </div>

            {/* Bento 2: Hors ligne */}
            <div className="bg-gradient-to-br from-zinc-100 to-white dark:from-zinc-900 dark:to-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 sm:p-12 shadow-sm hover:shadow-xl transition-shadow flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 bg-teal-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-teal-500/30">
                  <Smartphone className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-4">{txt.feat3Title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">{txt.feat3Sub}</p>
              </div>
            </div>

            {/* Bento 3: Nutrition */}
            <div className="bg-gradient-to-br from-zinc-100 to-white dark:from-zinc-900 dark:to-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 sm:p-12 shadow-sm hover:shadow-xl transition-shadow flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-orange-500/30">
                  <Dumbbell className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-4">{txt.feat2Title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">{txt.feat2Sub}</p>
              </div>
            </div>

            {/* Bento 4: Teaser Phase 7 (Scanner IA) - Prend 2 colonnes */}
            <div className="md:col-span-2 bg-gradient-to-r from-purple-600 to-indigo-600 border border-indigo-500/50 rounded-[2rem] p-8 sm:p-12 shadow-xl shadow-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between group overflow-hidden relative text-white">
              <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
                <ScanLine className="w-64 h-64" />
              </div>
              <div className="relative z-10 max-w-md">
                <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                  <Sparkles className="w-4 h-4 text-yellow-300" /> <span>Phase 7 Sneak Peek</span>
                </div>
                <h3 className="text-3xl font-black mb-4">{txt.feat4Title}</h3>
                <p className="text-indigo-100 font-medium leading-relaxed">{txt.feat4Sub}</p>
              </div>
              <div className="relative z-10 mt-8 sm:mt-0 flex-shrink-0 bg-white/10 p-6 rounded-2xl border border-white/20 backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                  <ShieldCheck className="w-8 h-8 text-green-400" />
                  <div className="text-left">
                    <p className="text-xs uppercase font-black opacity-70">GPT Vision API</p>
                    <p className="text-lg font-bold">100% Automatique</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 🟢 CTA SECTION FINAL */}
      <section className="py-32 px-6 relative overflow-hidden bg-zinc-100 dark:bg-zinc-900">
        <div className="absolute inset-0 bg-grid-zinc-200/50 dark:bg-grid-zinc-800/50 bg-[length:32px_32px]"></div>
        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-6xl font-black text-zinc-900 dark:text-white tracking-tight">{txt.ctaTitle}</h2>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 font-medium max-w-xl mx-auto">{txt.ctaSub}</p>
          <div className="pt-4">
            <Link href="/onboarding">
              <Button size="lg" className="h-16 px-10 text-xl font-black bg-teal-500 hover:bg-teal-600 text-white rounded-full shadow-2xl shadow-teal-500/30 transition-transform hover:scale-110 active:scale-95">
                {txt.start}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 🟢 FOOTER */}
      <footer className="py-8 text-center text-sm font-bold text-zinc-400 dark:text-zinc-600 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 relative z-10">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <img src="/Logo_GSC_NoBG.png" alt="Logo" className="h-4 w-auto grayscale opacity-50" />
          <span>VIVEX FITNESS</span>
        </div>
        {txt.footer}
      </footer>
    </div>
  );
}
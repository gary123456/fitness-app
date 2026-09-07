"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Trophy, Flame, Award, Star, Target, Zap, Loader2, Brain, BookOpen, GraduationCap } from "lucide-react";

interface GamificationData {
  level: number;
  current_xp: number;
  streak_days: number;
  unlocked_badges: string[];
}

export default function ProfilePage() {
  const [data, setData] = useState<GamificationData | null>(null);
  const [loading, setLoading] = useState(true);

  // 🛡️ LISTE DES BADGES ENRICHIE (SPORT + QUIZ)
  const ALL_BADGES = [
    { id: "first_step", name: "Premier Pas", icon: Star, color: "text-yellow-400" },
    { id: "warrior", name: "Warrior", icon: Trophy, color: "text-teal-400" },
    { id: "constance", name: "Constance", icon: Flame, color: "text-orange-500" },
    { id: "titan", name: "Titan", icon: Zap, color: "text-blue-400" },
    { id: "precision", name: "Précision", icon: Target, color: "text-indigo-400" },
    { id: "legend", name: "Légende", icon: Award, color: "text-purple-400" },
    { id: "quiz_initie", name: "Initié (5 Quiz)", icon: BookOpen, color: "text-cyan-400" },
    { id: "quiz_erudit", name: "Érudit (15 Quiz)", icon: Brain, color: "text-fuchsia-400" },
    { id: "quiz_genie", name: "Génie (30 Quiz)", icon: GraduationCap, color: "text-yellow-500" },
  ];

  useEffect(() => {
    loadGamification();
  }, []);

  const loadGamification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let { data: gamification, error: fetchError } = await supabase
        .from("user_gamification")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!gamification) {
        const { data: newGamification, error: insertError } = await supabase
          .from("user_gamification")
          .insert([{ user_id: user.id }])
          .select()
          .maybeSingle();
          
        if (insertError) {
          if (insertError.code === '23505') {
            const { data: existingData } = await supabase.from("user_gamification").select("*").eq("user_id", user.id).single();
            gamification = existingData;
          } else {
            throw insertError;
          }
        } else {
          gamification = newGamification;
        }
      }

      setData(gamification);
    } catch (error) {
      console.error("Erreur de chargement Gamification:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[80vh] items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-teal-500" /></div>;
  }

  if (!data) {
    return <div className="flex min-h-[80vh] items-center justify-center font-bold text-zinc-500">Impossible de charger le profil.</div>;
  }

  const nextLevelXP = data.level * 1000;
  const xpProgress = Math.min((data.current_xp / nextLevelXP) * 100, 100);

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-5xl mx-auto w-full pb-24">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-zinc-100 mb-2">Profil Athlète</h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">Suivez votre progression et vos réalisations.</p>
      </div>

      <div className="mb-6 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <span className="text-2xl font-black text-white">{data.level}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Niveau {data.level}</h2>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {data.current_xp} / {nextLevelXP} XP
              </p>
            </div>
          </div>
          <Trophy className="w-8 h-8 text-teal-500 opacity-80" />
        </div>
        
        <div className="relative w-full h-3 bg-zinc-200 dark:bg-zinc-800/80 rounded-full overflow-hidden shadow-inner">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-1000 rounded-full"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mt-3 text-right">
          {Math.round(xpProgress)}% vers le niveau suivant
        </p>
      </div>

      <div className="mb-6 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">Série de Jours Actifs</h3>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Continuez à vous entraîner !</p>
          </div>
          <div className="flex items-center gap-3">
            <Flame className={`w-8 h-8 ${data.streak_days > 0 ? 'text-orange-500 drop-shadow-lg animate-pulse' : 'text-zinc-400'}`} />
            <span className={`text-4xl font-black ${data.streak_days > 0 ? 'bg-gradient-to-br from-orange-400 to-red-500 bg-clip-text text-transparent' : 'text-zinc-400'}`}>
              {data.streak_days}
            </span>
          </div>
        </div>
        <div className="mt-6 flex gap-1.5">
          {[...Array(7)].map((_, i) => {
            const isActive = i < Math.min(data.streak_days, 7);
            return (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full transition-all duration-500 ${
                  isActive ? "bg-gradient-to-r from-orange-400 to-red-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" : "bg-zinc-200 dark:bg-zinc-800"
                }`}
              />
            );
          })}
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mt-3 text-center">
          Activité sur les 7 derniers jours
        </p>
      </div>

      <div className="mb-6 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-5 h-5 text-teal-500" />
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Badges Débloqués</h3>
        </div>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-6">
          {data.unlocked_badges?.length || 0} / {ALL_BADGES.length} badges obtenus
        </p>
        
        {/* 🛠️ GRILLE RÉACTIVE POUR AFFICHER TOUS LES BADGES SANS DÉBORDER */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {ALL_BADGES.map((badge) => {
            const isUnlocked = data.unlocked_badges?.includes(badge.id);
            const Icon = badge.icon;
            
            return (
              <div
                key={badge.id}
                className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl border transition-all ${
                  isUnlocked
                    ? "border-teal-500/30 bg-teal-50 dark:bg-teal-500/5 shadow-sm"
                    : "border-zinc-200 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20 opacity-60 grayscale hover:grayscale-0"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isUnlocked
                      ? "bg-gradient-to-br from-teal-400 to-cyan-500 shadow-lg shadow-teal-500/20"
                      : "bg-zinc-200 dark:bg-zinc-800"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isUnlocked ? "text-white" : "text-zinc-400"}`} />
                </div>
                <span className={`text-[11px] font-black uppercase tracking-wider text-center ${isUnlocked ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"}`}>
                  {badge.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
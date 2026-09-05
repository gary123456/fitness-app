"use client";

import { Trophy, Flame, Award, Star, Target, Zap } from "lucide-react";

export default function ProfilePage() {
  // Données UI statiques (placeholders)
  const level = 5;
  const currentXP = 2450;
  const nextLevelXP = 3000;
  const xpProgress = (currentXP / nextLevelXP) * 100;
  const streak = 12; // Jours consécutifs
  
  const badges = [
    { id: 1, name: "Premier Pas", icon: Star, unlocked: true, color: "text-yellow-400" },
    { id: 2, name: "Warrior", icon: Trophy, unlocked: true, color: "text-teal-400" },
    { id: 3, name: "Constance", icon: Flame, unlocked: true, color: "text-orange-500" },
    { id: 4, name: "Titan", icon: Zap, unlocked: false, color: "text-zinc-600" },
    { id: 5, name: "Précision", icon: Target, unlocked: false, color: "text-zinc-600" },
    { id: 6, name: "Légende", icon: Award, unlocked: false, color: "text-zinc-600" },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Profil
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Suivez votre progression et vos réalisations
        </p>
      </div>

      {/* Section Niveau et XP */}
      <div className="mb-6 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-white">{level}</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Niveau {level}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {currentXP} / {nextLevelXP} XP
              </p>
            </div>
          </div>
          <Trophy className="w-8 h-8 text-teal-500" />
        </div>
        
        {/* Barre de progression XP */}
        <div className="relative w-full h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500 rounded-full"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2 text-right">
          {Math.round(xpProgress)}% vers le niveau suivant
        </p>
      </div>

      {/* Section Streak */}
      <div className="mb-6 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Série de Jours Actifs
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Continuez à vous entraîner chaque jour !
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="w-10 h-10 text-orange-500 drop-shadow-lg" />
            <span className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              {streak}
            </span>
          </div>
        </div>
        <div className="mt-4 flex gap-1">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-2 rounded-full transition-all ${
                i < 5
                  ? "bg-gradient-to-r from-orange-500 to-red-500"
                  : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2 text-center">
          Derniers 7 jours
        </p>
      </div>

      {/* Section Badges */}
      <div className="mb-6 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-6 h-6 text-teal-500" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Badges Débloqués
          </h3>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          {badges.filter(b => b.unlocked).length} / {badges.length} badges obtenus
        </p>
        
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {badges.map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.id}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  badge.unlocked
                    ? "border-teal-500/50 bg-teal-500/10 dark:bg-teal-500/5"
                    : "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/50 opacity-50"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    badge.unlocked
                      ? "bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 ${
                      badge.unlocked ? "text-white" : "text-zinc-500 dark:text-zinc-600"
                    }`}
                  />
                </div>
                <span
                  className={`text-xs font-medium text-center ${
                    badge.unlocked
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-500 dark:text-zinc-600"
                  }`}
                >
                  {badge.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section Statistiques Rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Entraînements</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">47</p>
        </div>
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Temps Total</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">32h</p>
        </div>
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Calories</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">18.5k</p>
        </div>
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Record Streak</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">21</p>
        </div>
      </div>
    </div>
  );
}

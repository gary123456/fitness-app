import { supabase } from "@/lib/supabase";

// 🛡️ NOUVEAU SYSTÈME DE TIERS (Fer, Bronze, Argent, Or, Diamant)
const checkStreakBadges = (streak: number, badges: string[]) => {
  const newBadges: string[] = [];
  if (streak >= 3 && !badges.includes("streak_fer")) newBadges.push("streak_fer");
  if (streak >= 7 && !badges.includes("streak_bronze")) newBadges.push("streak_bronze");
  if (streak >= 21 && !badges.includes("streak_argent")) newBadges.push("streak_argent");
  if (streak >= 90 && !badges.includes("streak_or")) newBadges.push("streak_or");
  if (streak >= 365 && !badges.includes("streak_diamant")) newBadges.push("streak_diamant");
  return newBadges;
};

const checkLevelBadges = (level: number, badges: string[]) => {
  const newBadges: string[] = [];
  if (level >= 5 && !badges.includes("level_fer")) newBadges.push("level_fer");
  if (level >= 10 && !badges.includes("level_bronze")) newBadges.push("level_bronze");
  if (level >= 25 && !badges.includes("level_argent")) newBadges.push("level_argent");
  if (level >= 50 && !badges.includes("level_or")) newBadges.push("level_or");
  if (level >= 100 && !badges.includes("level_diamant")) newBadges.push("level_diamant");
  return newBadges;
};

const checkQuizBadges = (totalAnswered: number, badges: string[]) => {
  const newBadges: string[] = [];
  if (totalAnswered >= 5 && !badges.includes("quiz_fer")) newBadges.push("quiz_fer");
  if (totalAnswered >= 15 && !badges.includes("quiz_bronze")) newBadges.push("quiz_bronze");
  if (totalAnswered >= 30 && !badges.includes("quiz_argent")) newBadges.push("quiz_argent");
  if (totalAnswered >= 60 && !badges.includes("quiz_or")) newBadges.push("quiz_or");
  if (totalAnswered >= 100 && !badges.includes("quiz_diamant")) newBadges.push("quiz_diamant");
  return newBadges;
};

export async function awardWorkoutXP(userId: string, sessionTonnage: number, isReplay: boolean = false) {
  try {
    let { data: gamification } = await supabase.from("user_gamification").select("*").eq("user_id", userId).maybeSingle();

    if (!gamification) {
      const { data: newGamification } = await supabase.from("user_gamification").insert([{ user_id: userId }]).select().single();
      gamification = newGamification;
    }

    if (isReplay) {
      return { success: true, xpEarned: 0, leveledUp: false, newLevel: gamification.level || 1, newBadges: [], isReplay: true };
    }

    const baseXP = 150;
    const diminishingTonnageXP = Math.floor(Math.sqrt(sessionTonnage) * 2.5); 
    const earnedXP = Math.min(baseXP + diminishingTonnageXP, 800); 

    let newLevel = gamification.level || 1;
    let newXp = (gamification.current_xp || 0) + earnedXP;
    let leveledUp = false;

    let nextLevelXP = Math.floor(1000 * Math.pow(1.15, newLevel - 1));
    while (newXp >= nextLevelXP) {
      newXp -= nextLevelXP;
      newLevel++;
      leveledUp = true;
      nextLevelXP = Math.floor(1000 * Math.pow(1.15, newLevel - 1));
    }

    const today = new Date().toISOString().split('T')[0];
    let newStreak = gamification.streak_days || 0;
    let lastActive = gamification.last_active_date;

    if (lastActive !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastActive === yesterdayStr) newStreak++;
      else newStreak = 1;
      lastActive = today;
    }

    // 🛡️ VÉRIFICATION DES BADGES TIERÉS
    let badges: string[] = gamification.unlocked_badges || [];
    const newBadges: string[] = [];

    if (!badges.includes("first_step")) { badges.push("first_step"); newBadges.push("first_step"); }
    
    // Check Levels
    const leveledBadges = checkLevelBadges(newLevel, badges);
    if (leveledBadges.length > 0) { badges.push(...leveledBadges); newBadges.push(...leveledBadges); }

    // Check Streaks
    const streakedBadges = checkStreakBadges(newStreak, badges);
    if (streakedBadges.length > 0) { badges.push(...streakedBadges); newBadges.push(...streakedBadges); }

    await supabase.from("user_gamification").update({
      level: newLevel, current_xp: Math.round(newXp), streak_days: newStreak, last_active_date: lastActive, unlocked_badges: badges
    }).eq("user_id", userId);

    return { success: true, xpEarned: earnedXP, leveledUp, newLevel, newBadges, isReplay: false };

  } catch (error) {
    return { success: false, error };
  }
}

export async function awardQuizXP(userId: string, difficulty: string) {
  try {
    const { data: gamification } = await supabase.from("user_gamification").select("*").eq("user_id", userId).single();
    if (!gamification) throw new Error("Profil introuvable");

    const xpReward = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 60 : 100;
    const newXp = (gamification.current_xp || 0) + xpReward;
    
    let newLevel = gamification.level || 1;
    let leveledUp = false;
    let tempXp = newXp;
    let nextLevelXP = Math.floor(1000 * Math.pow(1.15, newLevel - 1));
    
    while (tempXp >= nextLevelXP) {
      tempXp -= nextLevelXP;
      newLevel++;
      leveledUp = true;
      nextLevelXP = Math.floor(1000 * Math.pow(1.15, newLevel - 1));
    }

    const totalAnswered = (gamification.answered_quizzes || []).length + 1;
    let badges: string[] = gamification.unlocked_badges || [];
    
    // 🛡️ VÉRIFICATION DES BADGES TIERÉS POUR LES QUIZ
    const newQuizBadges = checkQuizBadges(totalAnswered, badges);
    if (newQuizBadges.length > 0) badges.push(...newQuizBadges);

    const isMilestone = newQuizBadges.length > 0;
    
    // CALCUL DYNAMIQUE DU TITRE
    let rankName = "Initié 📘";
    if (totalAnswered >= 100) rankName = "Sage de l'Olympe 🏛️";
    else if (totalAnswered >= 60) rankName = "Génie Ultime 🌌";
    else if (totalAnswered >= 30) rankName = "Maître Biomécanique 🧬";
    else if (totalAnswered >= 15) rankName = "Érudit 🧠";

    await supabase.from("user_gamification").update({ current_xp: newXp, level: newLevel, unlocked_badges: badges }).eq("user_id", userId);

    return { success: true, xpEarned: xpReward, isMilestone, rankName, totalAnswered };
  } catch (error) {
    return { success: false, error };
  }
}
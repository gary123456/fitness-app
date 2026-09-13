import { supabase } from "@/lib/supabase";

export async function awardWorkoutXP(userId: string, sessionTonnage: number, isReplay: boolean = false) {
  try {
    let { data: gamification } = await supabase.from("user_gamification").select("*").eq("user_id", userId).maybeSingle();

    if (!gamification) {
      const { data: newGamification } = await supabase.from("user_gamification").insert([{ user_id: userId }]).select().single();
      gamification = newGamification;
    }

    // 🛡️ SÉCURITÉ ANTI-TRICHE
    if (isReplay) {
      return { success: true, xpEarned: 0, leveledUp: false, newLevel: gamification.level || 1, newBadges: [], isReplay: true };
    }

    // 🎯 COURBE D'XP LOGARITHMIQUE (QOL AMÉLIORÉ)
    // Au lieu d'une courbe plate, les premiers kilos rapportent plus (encouragement), puis la récompense diminue (anti-abus des powerlifters).
    const baseXP = 150;
    const diminishingTonnageXP = Math.floor(Math.sqrt(sessionTonnage) * 2.5); // Récompense log pour le tonnage
    const earnedXP = Math.min(baseXP + diminishingTonnageXP, 800); // Plafond absolu

    let newLevel = gamification.level || 1;
    let newXp = (gamification.current_xp || 0) + earnedXP;
    let leveledUp = false;

    // Échelle exponentielle pour les niveaux (Exigences plus dures au fil du temps)
    let nextLevelXP = Math.floor(1000 * Math.pow(1.15, newLevel - 1));
    while (newXp >= nextLevelXP) {
      newXp -= nextLevelXP;
      newLevel++;
      leveledUp = true;
      nextLevelXP = Math.floor(1000 * Math.pow(1.15, newLevel - 1));
    }

    // STREAK LOGIC
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

    let badges: string[] = gamification.unlocked_badges || [];
    const newBadges: string[] = [];

    const unlockBadge = (id: string) => {
      if (!badges.includes(id)) { badges.push(id); newBadges.push(id); }
    };

    unlockBadge("first_step");
    if (newLevel >= 5) unlockBadge("warrior");
    if (newStreak >= 7) unlockBadge("constance");
    if (newLevel >= 10) unlockBadge("titan");
    if (newStreak >= 30) unlockBadge("legend");

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
    
    if (totalAnswered >= 5 && !badges.includes("quiz_initie")) badges.push("quiz_initie");
    if (totalAnswered >= 15 && !badges.includes("quiz_erudit")) badges.push("quiz_erudit");
    if (totalAnswered >= 30 && !badges.includes("quiz_genie")) badges.push("quiz_genie");

    const isMilestone = totalAnswered === 5 || totalAnswered === 15 || totalAnswered === 30 || totalAnswered === 60;
    
    let rankName = "Initié 📘";
    if (totalAnswered >= 60) rankName = "Génie Ultime 🌌";
    else if (totalAnswered >= 30) rankName = "Maître Biomécanique 🧬";
    else if (totalAnswered >= 15) rankName = "Érudit 🧠";

    await supabase.from("user_gamification").update({ current_xp: newXp, level: newLevel, unlocked_badges: badges }).eq("user_id", userId);

    return { success: true, xpEarned: xpReward, isMilestone, rankName, totalAnswered };
  } catch (error) {
    return { success: false, error };
  }
}
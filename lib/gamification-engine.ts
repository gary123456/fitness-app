import { supabase } from "@/lib/supabase";

export async function awardWorkoutXP(userId: string, sessionTonnage: number, isReplay: boolean = false) {
  try {
    // 1. Récupération du profil
    let { data: gamification } = await supabase
      .from("user_gamification")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!gamification) {
      const { data: newGamification } = await supabase
        .from("user_gamification")
        .insert([{ user_id: userId }])
        .select()
        .single();
      gamification = newGamification;
    }

    // 🛡️ SÉCURITÉ ANTI-TRICHE (IDEMPOTENCE)
    if (isReplay) {
      return {
        success: true,
        xpEarned: 0,
        leveledUp: false,
        newLevel: gamification.level || 1,
        newBadges: [],
        isReplay: true // Flag pour l'interface
      };
    }

    // 2. Calcul dynamique de l'XP
    // 150 XP de base + 10 XP par tranche de 100kg soulevés (Max 800 XP)
    const baseXP = 150;
    const bonusXP = Math.floor(sessionTonnage / 100) * 10;
    const earnedXP = Math.min(baseXP + bonusXP, 800); 

    let newLevel = gamification.level || 1;
    let newXp = (gamification.current_xp || 0) + earnedXP;
    let leveledUp = false;

    let nextLevelXP = newLevel * 1000;
    while (newXp >= nextLevelXP) {
      newXp -= nextLevelXP;
      newLevel++;
      leveledUp = true;
      nextLevelXP = newLevel * 1000;
    }

    // 3. Logique du Streak
    const today = new Date().toISOString().split('T')[0];
    let newStreak = gamification.streak_days || 0;
    let lastActive = gamification.last_active_date;

    if (lastActive !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastActive === yesterdayStr) {
        newStreak++;
      } else {
        newStreak = 1;
      }
      lastActive = today;
    }

    // 4. Badges
    let badges: string[] = gamification.unlocked_badges || [];
    const newBadges: string[] = [];

    const unlockBadge = (id: string) => {
      if (!badges.includes(id)) {
        badges.push(id);
        newBadges.push(id);
      }
    };

    unlockBadge("first_step");
    if (newLevel >= 5) unlockBadge("warrior");
    if (newStreak >= 7) unlockBadge("constance");
    if (newLevel >= 10) unlockBadge("titan");
    if (newStreak >= 30) unlockBadge("legend");

    // 5. Sauvegarde
    await supabase
      .from("user_gamification")
      .update({
        level: newLevel,
        current_xp: Math.round(newXp),
        streak_days: newStreak,
        last_active_date: lastActive,
        unlocked_badges: badges
      })
      .eq("user_id", userId);

    return {
      success: true,
      xpEarned: earnedXP,
      leveledUp,
      newLevel,
      newBadges,
      isReplay: false
    };

  } catch (error) {
    console.error("Erreur critique Gamification:", error);
    return { success: false, error };
  }
}

export async function awardQuizXP(userId: string, difficulty: string) {
  try {
    const { data: gamification } = await supabase
      .from("user_gamification")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!gamification) throw new Error("Profil introuvable");

    const xpReward = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 60 : 100;
    const newXp = (gamification.current_xp || 0) + xpReward;
    
    // Calcul de l'évolution de niveau
    let newLevel = gamification.level || 1;
    let leveledUp = false;
    let tempXp = newXp;
    let nextLevelXP = newLevel * 1000;
    
    while (tempXp >= nextLevelXP) {
      tempXp -= nextLevelXP;
      newLevel++;
      leveledUp = true;
      nextLevelXP = newLevel * 1000;
    }

    const totalAnswered = (gamification.answered_quizzes || []).length + 1; // +1 car on vient de répondre juste
    let badges: string[] = gamification.unlocked_badges || [];
    
    // 🛡️ DÉBLOCAGE DES BADGES QUIZ
    if (totalAnswered >= 5 && !badges.includes("quiz_initie")) badges.push("quiz_initie");
    if (totalAnswered >= 15 && !badges.includes("quiz_erudit")) badges.push("quiz_erudit");
    if (totalAnswered >= 30 && !badges.includes("quiz_genie")) badges.push("quiz_genie");

    // Détection des Paliers de Rang pour le Partage Social
    const isMilestone = totalAnswered === 5 || totalAnswered === 15 || totalAnswered === 30 || totalAnswered === 60;
    
    let rankName = "Initié 📘";
    if (totalAnswered >= 60) rankName = "Génie Ultime 🌌";
    else if (totalAnswered >= 30) rankName = "Maître Biomécanique 🧬";
    else if (totalAnswered >= 15) rankName = "Érudit 🧠";

    await supabase
      .from("user_gamification")
      .update({
        current_xp: newXp,
        level: newLevel,
        unlocked_badges: badges
      })
      .eq("user_id", userId);

    return { success: true, xpEarned: xpReward, isMilestone, rankName, totalAnswered };
  } catch (error) {
    return { success: false, error };
  }
}
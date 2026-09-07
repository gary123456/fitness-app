import { supabase } from "@/lib/supabase";

export async function awardWorkoutXP(userId: string, sessionTonnage: number) {
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

    // 2. Calcul dynamique de l'XP
    // 100 XP de base + 10 XP par tranche de 100kg soulevés (Max 800 XP)
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
      newBadges
    };

  } catch (error) {
    console.error("Erreur critique Gamification:", error);
    return { success: false, error };
  }
}
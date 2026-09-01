export interface Exercise {
  id: string;
  name: string;
  movement_pattern: string;
  equipment_required: string;
  cns_impact: number;
  effectiveness_score: number;
  target_muscle: string;
  gif_url?: string;
}

export interface UserProfile {
  current_goal: string;
  training_frequency: string;
  equipment_access: string;
  weekly_schedule?: Record<string, string[]>;
}

const DAYS_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// NOUVEAU : On ajoute "history" pour que l'algo lise vos anciennes performances
export function generateSmartWorkoutPlan(profile: UserProfile, library: Exercise[], history: any[] = []) {
  const userEquipment = profile.equipment_access.split(",").map(e => e.trim());
  const availableExercises = library.filter(ex => userEquipment.includes(ex.equipment_required));
  
  const schedule = profile.weekly_schedule || {};
  
  let externalSportsCount = 0;
  DAYS_ORDER.forEach(day => {
    if (schedule[day] && schedule[day].length > 0) {
      externalSportsCount += schedule[day].length;
    }
  });

  let targetFrequency = 3; 
  if (profile.training_frequency.includes("2")) targetFrequency = 2;
  if (profile.training_frequency.includes("4")) targetFrequency = 4;
  if (profile.training_frequency.includes("5")) targetFrequency = 5;

  let liftingDays: string[] = [];
  
  if (externalSportsCount === 0) {
    const OPTIMAL_SPLITS: Record<number, string[]> = {
      2: ["monday", "thursday"],
      3: ["monday", "wednesday", "friday"],
      4: ["monday", "tuesday", "thursday", "friday"],
      5: ["monday", "tuesday", "wednesday", "friday", "saturday"]
    };
    liftingDays = OPTIMAL_SPLITS[targetFrequency] || OPTIMAL_SPLITS[3];
  } else {
    for (const day of DAYS_ORDER) {
      if (liftingDays.length < targetFrequency && (!schedule[day] || schedule[day].length === 0)) {
        liftingDays.push(day);
      }
    }
    for (const day of DAYS_ORDER) {
      if (liftingDays.length < targetFrequency && schedule[day] && schedule[day].length === 1 && !liftingDays.includes(day)) {
        liftingDays.push(day);
      }
    }
  }

  const volumeReductionFactor = externalSportsCount >= 3 ? 0.70 : 1.0;

  const TEMPLATE_A = ["Squat", "Push Horizontal", "Pull Vertical", "Core"];
  const TEMPLATE_B = ["Hinge", "Push Vertical", "Pull Horizontal", "Core"];
  let workoutCounter = 0;

  const plan = DAYS_ORDER.map(day => {
    const daySports = schedule[day] || [];
    const isLiftingDay = liftingDays.includes(day);

    if (!isLiftingDay) {
      return { day, type: daySports.length > 0 ? 'external_sports_only' : 'sports', sports: daySports, exercises: [] };
    }

    let basePatterns = workoutCounter % 2 === 0 ? [...TEMPLATE_A] : [...TEMPLATE_B];
    workoutCounter++;

    if (daySports.some(s => ["football", "basketball", "running", "cyclisme", "padel_tennis"].includes(s))) {
      basePatterns = basePatterns.filter(p => p !== "Squat"); 
      if (!basePatterns.includes("Isolation Hinge")) basePatterns.push("Isolation Hinge"); 
    }
    if (daySports.includes("natation")) {
      basePatterns = basePatterns.filter(p => p !== "Pull Vertical");
      if (!basePatterns.includes("Pull Horizontal")) basePatterns.push("Pull Horizontal");
    }
    
    let maxCnsAllowed = 5;
    if (daySports.some(s => ["jjb", "boxe"].includes(s))) {
      maxCnsAllowed = 3; 
    }
    if (daySports.includes("randonnee")) {
      maxCnsAllowed = 4; 
    }

    const sessionExercises: any[] = [];
    const uniquePatterns = Array.from(new Set(basePatterns));

    uniquePatterns.forEach((pattern, idx) => {
      let candidates = availableExercises.filter(ex => 
        ex.movement_pattern === pattern && ex.cns_impact <= maxCnsAllowed
      );
      
      candidates.sort((a, b) => b.effectiveness_score - a.effectiveness_score);

      if (candidates.length > 0) {
        const ex = candidates[0];
        const baseSets = ex.cns_impact >= 4 ? 3 : 4;
        const finalSets = Math.max(2, Math.round(baseSets * volumeReductionFactor));
        
        let defaultReps = externalSportsCount >= 3 ? "6-8" : "8-12";
        let recommendedWeight = null;

        // --- MAGIE DE LA SURCHARGE PROGRESSIVE ---
        const pastLogs = history.filter(h => h.exercise_id === ex.id);
        
        if (pastLogs.length > 0) {
          pastLogs.sort((a, b) => b.weight - a.weight || b.reps - a.reps);
          const bestSet = pastLogs[0];
          const maxTargetRep = parseInt(defaultReps.split('-')[1]);
          
          if (bestSet.reps >= maxTargetRep) {
            // L'utilisateur a réussi la fourchette haute : on augmente le poids !
            recommendedWeight = bestSet.weight > 0 ? bestSet.weight + 2.5 : 2.5;
            defaultReps = `${parseInt(defaultReps.split('-')[0])}-${maxTargetRep}`; 
          } else {
            // L'utilisateur n'a pas fini ses reps : on garde le poids, on vise plus de reps.
            recommendedWeight = bestSet.weight;
            defaultReps = `Viser > ${bestSet.reps} reps`;
          }
        }

        sessionExercises.push({
          exercise: ex,
          sets: finalSets,
          target_reps: defaultReps,
          recommended_weight: recommendedWeight, 
          rest_seconds: ex.cns_impact >= 4 ? 120 : 90,
          order_index: idx + 1
        });
      }
    });

    return {
      day,
      type: daySports.length > 0 ? 'hybrid_day' : 'lifting_only',
      sports: daySports,
      exercises: sessionExercises
    };
  });

  return plan;
}
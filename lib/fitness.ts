// lib/fitness.ts

export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  return Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1));
}

export function calculateEstimatedBodyFat(bmi: number, age: number, gender: string): number {
  const s = gender === 'homme' ? 1 : gender === 'femme' ? 0 : 0.5; 
  const bodyFat = (1.20 * bmi) + (0.23 * age) - (10.8 * s) - 5.4;
  return Number(Math.max(2, bodyFat).toFixed(1)); 
}

export function calculateBMR(weightKg: number, heightCm: number, age: number, gender: string): number {
  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  if (gender === 'homme') return Math.round(base + 5);
  if (gender === 'femme') return Math.round(base - 161);
  return Math.round(base - 78);
}

export function calculateTDEE(bmr: number, activityLevel: string): number {
  const multipliers: Record<string, number> = { sedentaire: 1.2, actif: 1.55, tres_actif: 1.9 };
  return Math.round(bmr * (multipliers[activityLevel] || 1.2));
}

export function calculateTargetCalories(tdee: number, goal: string): number {
  switch (goal) {
    case 'perte_poids': return Math.round(tdee * 0.80); 
    case 'recomposition': return Math.round(tdee * 0.95); 
    case 'performance': return Math.round(tdee * 1.05); 
    case 'prise_masse': return Math.round(tdee * 1.15); 
    default: return tdee;
  }
}

export function calculateMacros(weightKg: number, targetCalories: number, goal: string, frequency: string) {
  let proteinMultiplier = 1.6;
  if (goal === 'perte_poids' || goal === 'recomposition') proteinMultiplier = 2.0;
  else if (goal === 'prise_masse') proteinMultiplier = 1.8;
  
  if (frequency === '4_jours' || frequency === '5_plus') proteinMultiplier += 0.2;
  proteinMultiplier = Math.min(2.4, proteinMultiplier); 
  
  const proteinGrams = Math.round(weightKg * proteinMultiplier);
  const proteinCals = proteinGrams * 4;

  let fatCals = targetCalories * 0.25;
  let fatGrams = Math.round(fatCals / 9);
  if (fatGrams < weightKg * 0.8) {
    fatGrams = Math.round(weightKg * 0.8);
    fatCals = fatGrams * 9;
  }

  const remainingCals = targetCalories - proteinCals - fatCals;
  const carbGrams = Math.max(0, Math.round(remainingCals / 4));

  return {
    protein: proteinGrams, proteinPct: Math.round((proteinCals / targetCalories) * 100),
    fat: fatGrams, fatPct: Math.round((fatCals / targetCalories) * 100),
    carbs: carbGrams, carbPct: Math.round(((carbGrams * 4) / targetCalories) * 100)
  };
}

export function getMicronutrients(gender: string, frequency: string, weightKg: number) {
  const isHardcore = frequency === '4_jours' || frequency === '5_plus';
  return [
    { name: "Magnésium (Bisglycinate)", amount: gender === 'homme' ? "400mg" : "320mg", role: "Relaxation du SNC, qualité du sommeil, prévention des crampes." },
    { name: "Zinc (Picolinate)", amount: isHardcore ? "15mg" : "11mg", role: "Production de testostérone, immunité (perdu via la sudation massive)." },
    { name: "Vitamine D3 + K2", amount: "3000 - 4000 UI", role: "Densité osseuse, régulation hormonale et humeur." },
    { name: "Oméga-3 (EPA/DHA)", amount: "2g - 3g", role: "Anti-inflammatoire majeur pour les articulations, santé cardiovasculaire." },
    { name: "Sodium (Sel marin)", amount: isHardcore ? "+1000mg pré-workout" : "À discrétion", role: "Volume sanguin, contraction musculaire, congestion (Pump)." }
  ];
}

export function calculateWaterIntake(weightKg: number, activityLevel: string): number {
  let base = weightKg * 0.033;
  if (activityLevel === 'actif') base += 0.5;
  if (activityLevel === 'tres_actif') base += 1.0;
  return Number(base.toFixed(1));
}

export function calculateIdealWeight(heightCm: number, gender: string): number {
  const heightInches = heightCm / 2.54;
  if (heightInches <= 60) return gender === 'femme' ? 45.5 : 50.0;
  let ideal = gender === 'femme' ? 45.5 + 2.3 * (heightInches - 60) : 50.0 + 2.3 * (heightInches - 60);
  return Number(ideal.toFixed(1));
}

export function getContextualGreeting(lang: string, name: string): string {
  const hour = new Date().getHours();
  let greeting = lang === 'FR' ? "Bonjour" : "Good morning";
  if (hour >= 12 && hour < 18) greeting = lang === 'FR' ? "Bon après-midi" : "Good afternoon";
  if (hour >= 18) greeting = lang === 'FR' ? "Bonsoir" : "Good evening";
  return `${greeting} ${name}`;
}

export function calculateWeeklyTonnage(logs: any[], lang: string): { total: number, equivalent: string } {
  if (!logs || logs.length === 0) return { total: 0, equivalent: lang === 'FR' ? "Rien du tout ! On s'y met 💪" : "Nothing yet! Let's work 💪" };

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const recentLogs = logs.filter(log => new Date(log.created_at) >= oneWeekAgo);
  const total = recentLogs.reduce((acc, log) => acc + ((log.weight || 0) * (log.reps || 0)), 0);

  let equivalent = "";
  if (total === 0) equivalent = lang === 'FR' ? "Rien du tout ! On s'y met 💪" : "Nothing yet! Let's work 💪";
  else if (total < 1000) equivalent = lang === 'FR' ? "Une moto 🏍️" : "A motorcycle 🏍️";
  else if (total < 5000) equivalent = lang === 'FR' ? "Un gros SUV 🚙" : "A large SUV 🚙";
  else if (total < 15000) equivalent = lang === 'FR' ? "Un éléphant 🐘" : "An elephant 🐘";
  else if (total < 30000) equivalent = lang === 'FR' ? "Un char d'assaut 🪖" : "A military tank 🪖";
  else equivalent = lang === 'FR' ? "Un avion de chasse ✈️" : "A fighter jet ✈️";

  return { total, equivalent };
}

export function calculateStreak(logs: any[]): number {
  if (!logs || logs.length === 0) return 0;
  
  const uniqueDates = Array.from(new Set(logs.map(log => new Date(log.created_at).toISOString().split('T')[0]))).sort().reverse();
  if (uniqueDates.length === 0) return 0;

  let streak = 1;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const lastWorkoutDate = new Date(uniqueDates[0]);
  const diffTime = Math.abs(today.getTime() - lastWorkoutDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  
  if (diffDays > 3 && uniqueDates[0] !== todayStr) return 0;

  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const current = new Date(uniqueDates[i]);
    const prev = new Date(uniqueDates[i+1]);
    const diff = Math.ceil(Math.abs(current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff <= 4) { 
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// CORRECTION DU NOM : getCurrentWeekStreak
export function getCurrentWeekStreak(logs: any[], lang: string) {
  const days = [];
  const today = new Date();
  const currentDayOfWeek = today.getDay() || 7; 
  const logDates = new Set(logs.map(l => new Date(l.created_at).toISOString().split('T')[0]));

  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - currentDayOfWeek + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = new Intl.DateTimeFormat(lang === 'FR' ? 'fr-FR' : 'en-US', { weekday: 'short' }).format(d);
    
    days.push({
      date: dateStr,
      dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      completed: logDates.has(dateStr),
      isToday: dateStr === today.toISOString().split('T')[0],
      isFuture: d.setHours(0,0,0,0) > today.setHours(0,0,0,0) 
    });
  }
  return days;
}

export function generateMealIdeas(macro: 'protein' | 'carbs' | 'fat', targetGrams: number, lang: string) {
  const ratio = targetGrams / 100;

  if (macro === 'protein') {
    return [
      {
        title: lang === 'FR' ? "L'Omnivore (Viande & Œufs)" : "The Omnivore",
        icon: "🥩",
        meals: [
          { time: lang === 'FR' ? "Petit-Déjeuner" : "Breakfast", amount: Math.round(3 * ratio), food: lang === 'FR' ? "Œufs entiers" : "Whole eggs", prot: Math.round(18 * ratio) },
          { time: lang === 'FR' ? "Déjeuner" : "Lunch", amount: Math.round(150 * ratio), food: lang === 'FR' ? "g de Poulet" : "g Chicken", prot: Math.round(45 * ratio) },
          { time: lang === 'FR' ? "Collation" : "Snack", amount: Math.round(30 * ratio), food: lang === 'FR' ? "g de Whey" : "g Whey Isolate", prot: Math.round(25 * ratio) },
          { time: lang === 'FR' ? "Dîner" : "Dinner", amount: Math.round(100 * ratio), food: lang === 'FR' ? "g de Saumon" : "g Salmon", prot: Math.round(12 * ratio) }
        ]
      },
      {
        title: lang === 'FR' ? "Le Végétarien (Plantes & Laitiers)" : "The Vegetarian",
        icon: "🌱",
        meals: [
          { time: lang === 'FR' ? "Petit-Déjeuner" : "Breakfast", amount: Math.round(250 * ratio), food: lang === 'FR' ? "g de Fromage Blanc 0%" : "g Greek Yogurt", prot: Math.round(20 * ratio) },
          { time: lang === 'FR' ? "Déjeuner" : "Lunch", amount: Math.round(150 * ratio), food: lang === 'FR' ? "g de Tofu ferme" : "g Firm Tofu", prot: Math.round(25 * ratio) },
          { time: lang === 'FR' ? "Collation" : "Snack", amount: Math.round(40 * ratio), food: lang === 'FR' ? "g d'Amandes" : "g Almonds", prot: Math.round(10 * ratio) },
          { time: lang === 'FR' ? "Dîner" : "Dinner", amount: Math.round(150 * ratio), food: lang === 'FR' ? "g de Lentilles corail" : "g Red Lentils", prot: Math.round(45 * ratio) }
        ]
      }
    ];
  }

  if (macro === 'carbs') {
    return [
      {
        title: lang === 'FR' ? "Performance (Glucides purs)" : "Performance",
        icon: "🍚",
        meals: [
          { time: lang === 'FR' ? "Petit-Déjeuner" : "Breakfast", amount: Math.round(80 * ratio), food: lang === 'FR' ? "g de Flocons d'avoine" : "g Oats", carbs: Math.round(45 * ratio) },
          { time: lang === 'FR' ? "Déjeuner" : "Lunch", amount: Math.round(100 * ratio), food: lang === 'FR' ? "g de Riz Basmati" : "g Basmati Rice", carbs: Math.round(75 * ratio) },
          { time: lang === 'FR' ? "Autour du sport" : "Around Workout", amount: Math.round(1 * ratio), food: lang === 'FR' ? "Grosse Banane" : "Large Banana", carbs: Math.round(25 * ratio) },
          { time: lang === 'FR' ? "Dîner" : "Dinner", amount: Math.round(300 * ratio), food: lang === 'FR' ? "g de Patate douce" : "g Sweet Potato", carbs: Math.round(60 * ratio) }
        ]
      }
    ];
  }

  if (macro === 'fat') {
    return [
      {
        title: lang === 'FR' ? "Hormones & Cerveau" : "Hormones & Brain",
        icon: "🥑",
        meals: [
          { time: lang === 'FR' ? "Petit-Déjeuner" : "Breakfast", amount: Math.round(3 * ratio), food: lang === 'FR' ? "Jaunes d'œufs" : "Egg yolks", fat: Math.round(15 * ratio) },
          { time: lang === 'FR' ? "Déjeuner" : "Lunch", amount: Math.round(1 * ratio), food: lang === 'FR' ? "C.à.s d'Huile d'Olive" : "Tbsp Olive Oil", fat: Math.round(15 * ratio) },
          { time: lang === 'FR' ? "Collation" : "Snack", amount: Math.round(40 * ratio), food: lang === 'FR' ? "g de Noix/Beurre cacahuète" : "g Nuts/Peanut butter", fat: Math.round(20 * ratio) },
          { time: lang === 'FR' ? "Dîner" : "Dinner", amount: Math.round(100 * ratio), food: lang === 'FR' ? "g d'Avocat" : "g Avocado", fat: Math.round(15 * ratio) }
        ]
      }
    ];
  }
  
  return [];
}
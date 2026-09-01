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
    case 'perte_poids': return Math.round(tdee * 0.80); // Déficit de 20%
    case 'recomposition': return Math.round(tdee * 0.95); // Léger déficit / Maintien
    case 'performance': return Math.round(tdee * 1.05); // Surplus léger (Carburant)
    case 'prise_masse': return Math.round(tdee * 1.15); // Surplus de 15%
    default: return tdee;
  }
}

export function calculateMacros(weightKg: number, targetCalories: number, goal: string, frequency: string) {
  // 1. Calcul des Protéines (Ratio dynamique)
  let proteinMultiplier = 1.6;
  if (goal === 'perte_poids' || goal === 'recomposition') proteinMultiplier = 2.0;
  else if (goal === 'prise_masse') proteinMultiplier = 1.8;
  
  if (frequency === '4_jours' || frequency === '5_plus') proteinMultiplier += 0.2;
  proteinMultiplier = Math.min(2.4, proteinMultiplier); // Plafond physiologique
  
  const proteinGrams = Math.round(weightKg * proteinMultiplier);
  const proteinCals = proteinGrams * 4;

  // 2. Calcul des Lipides (Protection hormonale)
  let fatCals = targetCalories * 0.25;
  let fatGrams = Math.round(fatCals / 9);
  if (fatGrams < weightKg * 0.8) {
    fatGrams = Math.round(weightKg * 0.8);
    fatCals = fatGrams * 9;
  }

  // 3. Calcul des Glucides (Énergie restante)
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

export function calculateEstimatedVO2Max(age: number, bmi: number, gender: string, activityLevel: string): number {
  let par = 1;
  if (activityLevel === 'actif') par = 4;
  if (activityLevel === 'tres_actif') par = 7;
  const vo2max = 56.363 + (1.921 * par) - (0.381 * age) - (0.754 * bmi) + (10.987 * (gender === 'homme' ? 1 : 0));
  return Number(Math.max(20, vo2max).toFixed(1));
}
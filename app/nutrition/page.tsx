"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Utensils, Droplets, Plus, Flame, Play, CheckCircle2, Activity, ChevronRight } from "lucide-react";
import { calculateAge, calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacros } from "@/lib/fitness";
import { useLanguage } from "@/lib/useLanguage";
import { calculateRecipePortions } from "@/lib/nutrition-engine";

const MacroRing = ({ pct, color, label, value, unit = "g" }: any) => {
  const radius = 32;
  const circum = 2 * Math.PI * radius;
  const offset = circum - (Math.min(pct, 100) / 100) * circum;
  return (
    <div className="flex flex-col items-center justify-center relative">
      <svg width="80" height="80" className="transform -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="transparent" stroke="currentColor" strokeWidth="6" className="text-zinc-100 dark:text-zinc-800" />
        <circle cx="40" cy="40" r={radius} fill="transparent" stroke={color} strokeWidth="6" strokeDasharray={circum} strokeDashoffset={offset} className="transition-all duration-1000 ease-out" strokeLinecap="round" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center pointer-events-none">
        <span className="font-black text-[13px] dark:text-zinc-100 leading-none">{value}{unit}</span>
        <span className="text-[9px] font-bold text-zinc-400 uppercase mt-0.5">{label}</span>
      </div>
    </div>
  );
};

const fetchNutritionData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const today = new Date().toISOString().split('T')[0];

  let dailyLog = null;
  
  try {
    const { data: existingLog } = await supabase.from("daily_nutrition_logs").select("*").eq("user_id", user.id).eq("date", today).maybeSingle();
    if (!existingLog) {
      const { data: newLog } = await supabase.from("daily_nutrition_logs").insert([{ user_id: user.id, date: today }]).select().maybeSingle();
      dailyLog = newLog;
    } else {
      dailyLog = existingLog;
    }
  } catch (error) {
    console.error("Erreur DB Log Nutrition:", error);
  }

  // 🛡️ SAFETY NET ABSOLU : Si Supabase échoue, on simule une journée vide
  const safeLog = dailyLog || {
    id: "temp_log",
    total_kcal: 0, total_prot: 0, total_carbs: 0, total_fats: 0, total_fibers: 0,
    logged_meals: []
  };

  const { data: recipes } = await supabase.from("nutrition_recipes").select("*");

  const age = calculateAge(profile.birth_date);
  const bmr = calculateBMR(profile.weight_kg, profile.height_cm, age, profile.gender, null);
  const tdee = calculateTDEE(bmr, profile.activity_level);
  const targetCals = calculateTargetCalories(tdee, profile.current_goal);
  const targetMacros = calculateMacros(profile.weight_kg, targetCals, profile.current_goal, profile.training_frequency);

  const mealDistribution = {
    breakfast: { pct: 0.20, labelFR: "Matin (20%)", labelEN: "Morning (20%)" },
    lunch: { pct: 0.30, labelFR: "Déjeuner (30%)", labelEN: "Lunch (30%)" },
    snack: { pct: 0.20, labelFR: "Collation P.W (20%)", labelEN: "P.W Snack (20%)" },
    dinner: { pct: 0.30, labelFR: "Dîner (30%)", labelEN: "Dinner (30%)" }
  };

  const targetFibers = Math.round((targetCals / 1000) * 14);

  return { profile, dailyLog: safeLog, recipes: recipes || [], targets: { calories: targetCals, ...targetMacros, fibers: targetFibers }, mealDistribution };
};

export default function NutritionPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const { data, isLoading, mutate } = useSWR('nutritionData', fetchNutritionData);

  const [activeMealType, setActiveMealType] = useState<string | null>(null);
  const [recipeModal, setRecipeModal] = useState<any | null>(null);
  const [quickAddModal, setQuickAddModal] = useState(false);
  const [isSolving, setIsSolving] = useState(false);

  const [qaName, setQaName] = useState("");
  const [qaKcal, setQaKcal] = useState("");
  const [qaProt, setQaProt] = useState("");
  const [qaCarb, setQaCarb] = useState("");
  const [qaFat, setQaFat] = useState("");

  if (isLoading || !data) {
    return <div className="p-8 text-center font-bold text-teal-500 animate-pulse">Chargement de la Matrice Nutritionnelle...</div>;
  }

  const t = {
    FR: { title: "Nutrition", sub: "Autopilote Métabolique & Chrononutrition.", cals: "Kcal", prot: "Prot", carb: "Gluc", fat: "Lip", fib: "Fibres", add: "Ajout Rapide", selectMeal: "Choisissez un protocole", solve: "Calculer mes portions", genMenu: "Générer", cook: "Cuisiner & Valider", success: "Repas validé avec succès !" },
    EN: { title: "Nutrition", sub: "Metabolic Autopilot & Chrononutrition.", cals: "Kcal", prot: "Pro", carb: "Carbs", fat: "Fat", fib: "Fiber", add: "Quick Add", selectMeal: "Select a protocol", solve: "Calculate my portions", genMenu: "Generate", cook: "Cook & Log", success: "Meal successfully logged!" }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

  // 🛡️ DOUBLE VÉRIFICATION DE SÉCURITÉ
  const log = data?.dailyLog || { total_kcal: 0, total_prot: 0, total_carbs: 0, total_fats: 0, total_fibers: 0, logged_meals: [] };
  const tgs = data?.targets || { calories: 2000, protein: 150, carbs: 200, fat: 60, fibers: 30 };

  const handleQuickAdd = async () => {
    const k = parseFloat(qaKcal)||0; const p = parseFloat(qaProt)||0; const c = parseFloat(qaCarb)||0; const f = parseFloat(qaFat)||0;
    const newMeal = { title: qaName || "Repas Libre", kcal: k, protein: p, carbs: c, fats: f, fiber: 0 };
    const updatedMeals = [...(log.logged_meals || []), newMeal];
    
    if (log.id !== "temp_log") {
      await supabase.from("daily_nutrition_logs").update({
        total_kcal: (log.total_kcal || 0) + k, total_prot: (log.total_prot || 0) + p,
        total_carbs: (log.total_carbs || 0) + c, total_fats: (log.total_fats || 0) + f,
        logged_meals: updatedMeals
      }).eq("id", log.id);
    }
    
    setQuickAddModal(false);
    mutate();
  };

  const openRecipeSolver = async (recipeId: string, mealType: string) => {
    setIsSolving(true);
    try {
      const dist = (data.mealDistribution as any)[mealType].pct;
      const mealTargets = { protein: tgs.protein * dist, carbs: tgs.carbs * dist, fats: tgs.fat * dist };
      const solved = await calculateRecipePortions(recipeId, mealTargets);
      setRecipeModal(solved);
    } catch (e) {
      alert("Erreur de calcul. Assurez-vous d'avoir inséré le script SQL.");
    } finally {
      setIsSolving(false);
    }
  };

  const confirmAndLogRecipe = async () => {
    if (!recipeModal || log.id === "temp_log") return;
    const m = recipeModal.macros;
    const newMeal = { title: lang === 'FR' ? recipeModal.recipe.title_fr : recipeModal.recipe.title_en, ...m };
    const updatedMeals = [...(log.logged_meals || []), newMeal];
    
    await supabase.from("daily_nutrition_logs").update({
      total_kcal: (log.total_kcal || 0) + m.kcal, total_prot: (log.total_prot || 0) + m.protein,
      total_carbs: (log.total_carbs || 0) + m.carbs, total_fats: (log.total_fats || 0) + m.fats,
      total_fibers: (log.total_fibers || 0) + m.fiber, logged_meals: updatedMeals
    }).eq("id", log.id);
    
    setRecipeModal(null); setActiveMealType(null);
    mutate();
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-5xl mx-auto w-full pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
            <Utensils className="w-8 h-8 mr-3 text-teal-500" /> {txt.title}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">{txt.sub}</p>
        </div>
        <Button onClick={() => setQuickAddModal(true)} className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold rounded-full">
          <Plus className="w-4 h-4 mr-2" /> {txt.add}
        </Button>
      </div>

      <Card className="bg-zinc-950 border-none shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Activity className="w-48 h-48 text-white" /></div>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="col-span-2 md:col-span-1 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-zinc-800 pb-4 md:pb-0">
              <Flame className="w-8 h-8 text-orange-500 mb-2" />
              <span className="text-3xl font-black text-white leading-none">{Math.round(log.total_kcal || 0)}</span>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">/ {tgs.calories} {txt.cals}</span>
            </div>
            <MacroRing pct={((log.total_prot || 0)/tgs.protein)*100} color="#3b82f6" label={txt.prot} value={Math.round(log.total_prot || 0)} />
            <MacroRing pct={((log.total_carbs || 0)/tgs.carbs)*100} color="#10b981" label={txt.carb} value={Math.round(log.total_carbs || 0)} />
            <MacroRing pct={((log.total_fats || 0)/tgs.fat)*100} color="#f59e0b" label={txt.fat} value={Math.round(log.total_fats || 0)} />
            <MacroRing pct={((log.total_fibers || 0)/tgs.fibers)*100} color="#8b5cf6" label={txt.fib} value={Math.round(log.total_fibers || 0)} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4 relative">
        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-zinc-200 dark:bg-zinc-800"></div>
        
        {Object.entries(data.mealDistribution).map(([type, info]: any) => {
          const targetKcal = Math.round(tgs.calories * info.pct);

          return (
            <div key={type} className="relative pl-14">
              <div className="absolute left-4 top-5 w-4 h-4 rounded-full border-4 border-white dark:border-zinc-950 bg-teal-500 shadow-sm"></div>
              <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                <CardHeader className="py-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-black dark:text-zinc-100">{lang === 'FR' ? info.labelFR : info.labelEN}</CardTitle>
                    <CardDescription className="font-bold text-teal-600 dark:text-teal-400">Cible : ~{targetKcal} kcal</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveMealType(activeMealType === type ? null : type)} className="font-bold border-teal-500 text-teal-600 hover:bg-teal-50">
                    <Utensils className="w-4 h-4 mr-2" /> {txt.genMenu}
                  </Button>
                </CardHeader>
                {activeMealType === type && (
                  <CardContent className="pt-0 border-t border-zinc-100 dark:border-zinc-800 mt-4 py-4 bg-zinc-50 dark:bg-zinc-950/50">
                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">{txt.selectMeal}</h4>
                    {data.recipes.length === 0 ? (
                      <p className="text-sm font-bold text-zinc-500">Base de données vide. Veuillez injecter le script SQL.</p>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {data.recipes.filter((r: any) => r.meal_type === type).map((recipe: any) => (
                          <button key={recipe.id} onClick={() => openRecipeSolver(recipe.id, type)} disabled={isSolving} className="text-left flex items-center p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-teal-500 transition-all shadow-sm">
                            <span className="text-2xl mr-3">{recipe.image_emoji}</span>
                            <div className="flex-1">
                              <span className="block font-bold text-sm text-zinc-900 dark:text-zinc-100">{lang === 'FR' ? recipe.title_fr : recipe.title_en}</span>
                              <span className="text-[10px] text-zinc-500 font-medium">{recipe.prep_time_min} min • {recipe.is_supplement ? "Supplément" : "Whole Food"}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-400" />
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            </div>
          );
        })}
      </div>

      <Dialog open={recipeModal !== null} onOpenChange={(open) => !open && setRecipeModal(null)}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
          {recipeModal && (
            <>
              <DialogHeader>
                <div className="flex justify-center mb-4"><span className="text-6xl drop-shadow-md">{recipeModal.recipe.image_emoji}</span></div>
                <DialogTitle className="text-2xl font-black text-center dark:text-zinc-100">{lang === 'FR' ? recipeModal.recipe.title_fr : recipeModal.recipe.title_en}</DialogTitle>
                <DialogDescription className="text-center font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 py-2 rounded-lg mt-2 mx-8">
                  {recipeModal.macros.kcal} kcal • {recipeModal.macros.protein}g P • {recipeModal.macros.carbs}g G • {recipeModal.macros.fats}g L
                  <span className="block text-xs mt-1 text-purple-500">+ {recipeModal.macros.fiber}g Fibres</span>
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div>
                  <h4 className="font-black text-sm uppercase tracking-widest text-zinc-500 mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">Ingrédients Calculés</h4>
                  <ul className="space-y-2">
                    {recipeModal.ingredients.map((ing: any, i: number) => (
                      <li key={i} className="flex justify-between items-center text-sm font-bold dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-md">
                        <span>{lang === 'FR' ? ing.name_fr : ing.name_en}</span>
                        <span className="text-teal-600 bg-teal-100 dark:bg-teal-900/40 px-2 py-0.5 rounded">{ing.grams} g</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-black text-sm uppercase tracking-widest text-zinc-500 mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">Préparation</h4>
                  <ol className="space-y-3">
                    {(lang === 'FR' ? recipeModal.recipe.instructions_fr : recipeModal.recipe.instructions_en).map((step: string, i: number) => (
                      <li key={i} className="flex space-x-3 text-sm font-medium dark:text-zinc-300">
                        <span className="font-black text-teal-500 shrink-0">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              
              <DialogFooter>
                <Button onClick={confirmAndLogRecipe} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-black h-12 text-lg">
                  <Play className="w-5 h-5 mr-2" /> {txt.cook}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={quickAddModal} onOpenChange={setQuickAddModal}>
        <DialogContent className="sm:max-w-[400px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <DialogHeader><DialogTitle className="dark:text-zinc-100 flex items-center"><Plus className="w-5 h-5 mr-2 text-teal-500" /> {txt.add}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom de l'aliment</Label>
              <Input value={qaName} onChange={(e) => setQaName(e.target.value)} placeholder="Ex: Riz blanc cuit" className="dark:bg-zinc-900" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-orange-500">Calories</Label><Input type="number" value={qaKcal} onChange={(e) => setQaKcal(e.target.value)} className="dark:bg-zinc-900 font-bold" /></div>
              <div className="space-y-2"><Label className="text-blue-500">Protéines (g)</Label><Input type="number" value={qaProt} onChange={(e) => setQaProt(e.target.value)} className="dark:bg-zinc-900 font-bold" /></div>
              <div className="space-y-2"><Label className="text-green-500">Glucides (g)</Label><Input type="number" value={qaCarb} onChange={(e) => setQaCarb(e.target.value)} className="dark:bg-zinc-900 font-bold" /></div>
              <div className="space-y-2"><Label className="text-yellow-500">Lipides (g)</Label><Input type="number" value={qaFat} onChange={(e) => setQaFat(e.target.value)} className="dark:bg-zinc-900 font-bold" /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleQuickAdd} className="w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold">Valider</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
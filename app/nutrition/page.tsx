"use client";

import { useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Utensils, Plus, Flame, Play, Activity, ChevronRight, Trash2, History, Target, Search, Brain, XCircle } from "lucide-react";
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

  let { data: dailyLog } = await supabase.from("daily_nutrition_logs").select("*").eq("user_id", user.id).eq("date", today).maybeSingle();
  
  if (!dailyLog) {
    const { data: newLog } = await supabase.from("daily_nutrition_logs").insert([{ user_id: user.id, date: today }]).select().maybeSingle();
    dailyLog = newLog;
  }

  const safeLog = dailyLog || { id: "temp_log", total_kcal: 0, total_prot: 0, total_carbs: 0, total_fats: 0, total_fibers: 0, logged_meals: [] };

  const [ { data: recipes }, { data: ingredients } ] = await Promise.all([
    supabase.from("nutrition_recipes").select("*"),
    supabase.from("nutrition_ingredients").select("*").order("name_fr", { ascending: true })
  ]);

  const age = calculateAge(profile.birth_date);
  const bmr = calculateBMR(profile.weight_kg, profile.height_cm, age, profile.gender, null);
  const tdee = calculateTDEE(bmr, profile.activity_level);
  const targetCals = calculateTargetCalories(tdee, profile.current_goal);
  const targetMacros = calculateMacros(profile.weight_kg, targetCals, profile.current_goal, profile.training_frequency);

  return { 
    profile, dailyLog: safeLog, 
    recipes: recipes || [], 
    ingredients: ingredients || [],
    targets: { calories: targetCals, ...targetMacros, fibers: Math.round((targetCals / 1000) * 14) }
  };
};

export default function NutritionPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  
  // 1. TOUS LES HOOKS SONT APPELÉS ICI (AVANT LE RETURN EARLY)
  const { data, isLoading, mutate } = useSWR('nutritionData', fetchNutritionData);

  const [activeTab, setActiveTab] = useState<"autopilot" | "tracker">("autopilot");
  const [mealCount, setMealCount] = useState<"3" | "4" | "5">("4");
  const [activeMealType, setActiveMealType] = useState<string | null>(null);
  const [recipeModal, setRecipeModal] = useState<any | null>(null);
  const [isSolving, setIsSolving] = useState(false);

  const [searchIng, setSearchIng] = useState("");
  const [selectedIng, setSelectedIng] = useState<any | null>(null);
  const [ingUnit, setIngUnit] = useState<string>("g");
  const [ingQty, setIngQty] = useState<string>("100");
  const [quickAddModal, setQuickAddModal] = useState(false);
  const [qaName, setQaName] = useState("");
  const [qaKcal, setQaKcal] = useState("");
  const [qaProt, setQaProt] = useState("");
  const [qaCarb, setQaCarb] = useState("");
  const [qaFat, setQaFat] = useState("");

  const units: Record<string, number> = {
    "g": 1, "ml": 1, "c.à.s (15g)": 15, "c.à.c (5g)": 5, "scoop (30g)": 30, "poignée (20g)": 20, "cup (250g)": 250
  };

  const calculatedTrackerMacros = useMemo(() => {
    if (!selectedIng) return { k:0, p:0, c:0, f:0, fib:0 };
    const multiplier = units[ingUnit] || 1;
    const totalGrams = (parseFloat(ingQty) || 0) * multiplier;
    const ratio = totalGrams / 100;
    return {
      k: selectedIng.kcal_per_100g * ratio,
      p: selectedIng.prot_per_100g * ratio,
      c: selectedIng.carb_per_100g * ratio,
      f: selectedIng.fat_per_100g * ratio,
      fib: selectedIng.fiber_per_100g * ratio
    };
  }, [selectedIng, ingQty, ingUnit]);

  // 2. CONDITION DE CHARGEMENT *APRÈS* LES HOOKS
  if (isLoading || !data) {
    return <div className="p-8 text-center font-bold text-teal-500 animate-pulse">Chargement de l'Autopilote Métabolique...</div>;
  }

  const log = data.dailyLog;
  const tgs = data.targets;
  const loggedMealsList = log.logged_meals || [];

  const t = {
    FR: { title: "Nutrition", sub: "Autopilote Métabolique & Chrononutrition.", cals: "Kcal", prot: "Prot", carb: "Gluc", fat: "Lip", fib: "Fibres", add: "Ajout Rapide", selectMeal: "Choisissez un protocole", solve: "Calculer mes portions", genMenu: "Générer", cook: "Cuisiner & Valider", history: "Repas Consommés", emptyHist: "Aucun repas enregistré aujourd'hui." },
    EN: { title: "Nutrition", sub: "Metabolic Autopilot & Chrononutrition.", cals: "Kcal", prot: "Pro", carb: "Carbs", fat: "Fat", fib: "Fiber", add: "Quick Add", selectMeal: "Select a protocol", solve: "Calculate my portions", genMenu: "Generate", cook: "Cook & Log", history: "Consumed Meals", emptyHist: "No meals logged today." }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

  const getDistribution = (count: string) => {
    if (count === "3") return {
      breakfast: { pct: 0.30, labelFR: "Matin (30%)", labelEN: "Breakfast (30%)", type: "breakfast" },
      lunch: { pct: 0.40, labelFR: "Déjeuner (40%)", labelEN: "Lunch (40%)", type: "lunch" },
      dinner: { pct: 0.30, labelFR: "Dîner (30%)", labelEN: "Dinner (30%)", type: "dinner" }
    };
    if (count === "5") return {
      breakfast: { pct: 0.20, labelFR: "Matin (20%)", labelEN: "Breakfast (20%)", type: "breakfast" },
      snack1: { pct: 0.10, labelFR: "Collation Matin (10%)", labelEN: "AM Snack (10%)", type: "snack" },
      lunch: { pct: 0.30, labelFR: "Déjeuner (30%)", labelEN: "Lunch (30%)", type: "lunch" },
      snack2: { pct: 0.10, labelFR: "Collation A.M (10%)", labelEN: "PM Snack (10%)", type: "snack" },
      dinner: { pct: 0.30, labelFR: "Dîner (30%)", labelEN: "Dinner (30%)", type: "dinner" }
    };
    return { 
      breakfast: { pct: 0.20, labelFR: "Matin (20%)", labelEN: "Morning (20%)", type: "breakfast" },
      lunch: { pct: 0.30, labelFR: "Déjeuner (30%)", labelEN: "Lunch (30%)", type: "lunch" },
      snack: { pct: 0.20, labelFR: "Collation P.W (20%)", labelEN: "P.W Snack (20%)", type: "snack" },
      dinner: { pct: 0.30, labelFR: "Dîner (30%)", labelEN: "Dinner (30%)", type: "dinner" }
    };
  };

  const currentDistribution = getDistribution(mealCount);

  const filteredIngredients = searchIng 
    ? data.ingredients.filter((i: any) => i.name_fr.toLowerCase().includes(searchIng.toLowerCase()) || i.name_en.toLowerCase().includes(searchIng.toLowerCase())).slice(0, 10)
    : data.ingredients.slice(0, 10);

  const handleAddTrackerMeal = async () => {
    if (!selectedIng || log.id === "temp_log") return;
    const m = calculatedTrackerMacros;
    const title = `${parseFloat(ingQty)}${ingUnit} ${lang === 'FR' ? selectedIng.name_fr : selectedIng.name_en}`;
    const newMeal = { id: Date.now().toString(), title, image_emoji: "⚖️", kcal: m.k, protein: m.p, carbs: m.c, fats: m.f, fiber: m.fib };
    
    await supabase.from("daily_nutrition_logs").update({
      total_kcal: (log.total_kcal || 0) + m.k, total_prot: (log.total_prot || 0) + m.p,
      total_carbs: (log.total_carbs || 0) + m.c, total_fats: (log.total_fats || 0) + m.f,
      total_fibers: (log.total_fibers || 0) + m.fib, logged_meals: [...loggedMealsList, newMeal]
    }).eq("id", log.id);
    
    setSelectedIng(null); setSearchIng(""); setIngQty("100"); setIngUnit("g");
    mutate();
  };

  const handleQuickAdd = async () => {
    const k = parseFloat(qaKcal)||0; const p = parseFloat(qaProt)||0; const c = parseFloat(qaCarb)||0; const f = parseFloat(qaFat)||0;
    const newMeal = { title: qaName || "Repas Libre", kcal: k, protein: p, carbs: c, fats: f, fiber: 0, id: Date.now().toString() };
    const updatedMeals = [...loggedMealsList, newMeal];
    
    if (log.id !== "temp_log") {
      await supabase.from("daily_nutrition_logs").update({
        total_kcal: (log.total_kcal || 0) + k, total_prot: (log.total_prot || 0) + p,
        total_carbs: (log.total_carbs || 0) + c, total_fats: (log.total_fats || 0) + f,
        logged_meals: updatedMeals
      }).eq("id", log.id);
    }
    
    setQaName(""); setQaKcal(""); setQaProt(""); setQaCarb(""); setQaFat("");
    setQuickAddModal(false);
    mutate();
  };

  const openRecipeSolver = async (recipeId: string, distKey: string) => {
    setIsSolving(true);
    try {
      const distPct = (currentDistribution as any)[distKey].pct;
      const mealTargets = { protein: tgs.protein * distPct, carbs: tgs.carbs * distPct, fats: tgs.fat * distPct };
      const solved = await calculateRecipePortions(recipeId, mealTargets);
      setRecipeModal(solved);
    } catch (e: any) {
      alert(e.message || "Erreur de calcul.");
    } finally {
      setIsSolving(false);
    }
  };

  const confirmAndLogRecipe = async () => {
    if (!recipeModal || log.id === "temp_log") return;
    const m = recipeModal.macros;
    const newMeal = { id: Date.now().toString(), title: lang === 'FR' ? recipeModal.recipe.title_fr : recipeModal.recipe.title_en, image_emoji: recipeModal.recipe.image_emoji, ...m };
    
    await supabase.from("daily_nutrition_logs").update({
      total_kcal: (log.total_kcal || 0) + m.kcal, total_prot: (log.total_prot || 0) + m.protein,
      total_carbs: (log.total_carbs || 0) + m.carbs, total_fats: (log.total_fats || 0) + m.fats,
      total_fibers: (log.total_fibers || 0) + m.fiber, logged_meals: [...loggedMealsList, newMeal]
    }).eq("id", log.id);
    
    setRecipeModal(null); setActiveMealType(null);
    mutate();
  };

  const handleRemoveMeal = async (mealId: string) => {
    if (log.id === "temp_log") return;
    const mealToRemove = loggedMealsList.find((m: any) => m.id === mealId);
    if (!mealToRemove) return;
    const updatedMeals = loggedMealsList.filter((m: any) => m.id !== mealId);

    await supabase.from("daily_nutrition_logs").update({
      total_kcal: Math.max(0, (log.total_kcal || 0) - mealToRemove.kcal), 
      total_prot: Math.max(0, (log.total_prot || 0) - mealToRemove.protein),
      total_carbs: Math.max(0, (log.total_carbs || 0) - mealToRemove.carbs), 
      total_fats: Math.max(0, (log.total_fats || 0) - mealToRemove.fats),
      total_fibers: Math.max(0, (log.total_fibers || 0) - (mealToRemove.fiber || 0)), 
      logged_meals: updatedMeals
    }).eq("id", log.id);
    mutate();
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full pb-24">
      {/* HEADER & TABS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
            <Utensils className="w-8 h-8 mr-3 text-teal-500" /> Nutrition Élite
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">Contrôle Métabolique & Suivi Quotidien.</p>
        </div>
        
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl shadow-inner border border-zinc-200 dark:border-zinc-800 w-full sm:w-auto">
          <button onClick={() => setActiveTab("autopilot")} className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === "autopilot" ? "bg-white dark:bg-zinc-800 text-teal-600 dark:text-teal-400 shadow-sm" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"}`}>
            <Brain className="w-4 h-4 inline mr-2" /> Autopilote IA
          </button>
          <button onClick={() => setActiveTab("tracker")} className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === "tracker" ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"}`}>
            <Target className="w-4 h-4 inline mr-2" /> Tracker Libre
          </button>
        </div>
      </div>

      {/* JAUGE CENTRALE (Commune) */}
      <Card className="bg-zinc-950 border-none shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Activity className="w-48 h-48 text-white" /></div>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="col-span-2 md:col-span-1 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-zinc-800 pb-4 md:pb-0">
              <Flame className="w-8 h-8 text-orange-500 mb-2" />
              <span className="text-3xl font-black text-white leading-none">{Math.round(log.total_kcal || 0)}</span>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">/ {tgs.calories} Kcal</span>
            </div>
            <MacroRing pct={((log.total_prot || 0)/tgs.protein)*100} color="#3b82f6" label="Protéines" value={Math.round(log.total_prot || 0)} />
            <MacroRing pct={((log.total_carbs || 0)/tgs.carbs)*100} color="#10b981" label="Glucides" value={Math.round(log.total_carbs || 0)} />
            <MacroRing pct={((log.total_fats || 0)/tgs.fat)*100} color="#f59e0b" label="Lipides" value={Math.round(log.total_fats || 0)} />
            <MacroRing pct={((log.total_fibers || 0)/tgs.fibers)*100} color="#8b5cf6" label="Fibres" value={Math.round(log.total_fibers || 0)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* COLONNE GAUCHE */}
        <div className="space-y-4">
          
          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 ml-2">Fréquence des repas :</span>
            <Select value={mealCount} onValueChange={(val: any) => setMealCount(val)}>
              <SelectTrigger className="w-32 bg-white dark:bg-zinc-950 font-bold dark:border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="font-bold dark:bg-zinc-950">
                <SelectItem value="3">3 Repas</SelectItem>
                <SelectItem value="4">4 Repas</SelectItem>
                <SelectItem value="5">5 Repas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activeTab === "autopilot" && (
            <div className="relative">
              <div className="absolute left-6 top-6 bottom-4 w-0.5 bg-zinc-200 dark:bg-zinc-800"></div>
              {Object.entries(currentDistribution).map(([distKey, info]: any) => {
                const targetKcal = Math.round(tgs.calories * info.pct);
                return (
                  <div key={distKey} className="relative pl-14 mb-4">
                    <div className="absolute left-4 top-5 w-4 h-4 rounded-full border-4 border-white dark:border-zinc-950 bg-teal-500 shadow-sm"></div>
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:border-teal-500/30 transition-colors">
                      <CardHeader className="py-4 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-black dark:text-zinc-100">{lang === 'FR' ? info.labelFR : info.labelEN}</CardTitle>
                          <CardDescription className="font-bold text-teal-600 dark:text-teal-400">Cible IA : ~{targetKcal} kcal</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setActiveMealType(activeMealType === distKey ? null : distKey)} className="font-bold border-teal-500 text-teal-600 hover:bg-teal-50">
                          <Utensils className="w-4 h-4 mr-2" /> Générer
                        </Button>
                      </CardHeader>
                      {activeMealType === distKey && (
                        <CardContent className="pt-0 border-t border-zinc-100 dark:border-zinc-800 mt-4 py-4 bg-zinc-50 dark:bg-zinc-950/50">
                          <div className="grid gap-3">
                            {data.recipes.filter((r: any) => r.meal_type === info.type).slice(0, 8).map((recipe: any) => (
                              <button key={recipe.id} onClick={() => openRecipeSolver(recipe.id, distKey)} disabled={isSolving} className="text-left flex items-center p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-teal-500 transition-all shadow-sm">
                                <span className="text-3xl mr-4">{recipe.image_emoji}</span>
                                <div className="flex-1">
                                  <span className="block font-bold text-sm text-zinc-900 dark:text-zinc-100">{lang === 'FR' ? recipe.title_fr : recipe.title_en}</span>
                                  <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest mt-1 block">{recipe.prep_time_min} min • IA Adaptative</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-zinc-400" />
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "tracker" && (
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm animate-in fade-in zoom-in-95">
              <CardHeader className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-t-xl border-b border-zinc-100 dark:border-zinc-800">
                <CardTitle className="text-lg font-black text-indigo-600 dark:text-indigo-400 flex items-center">
                  <Search className="w-5 h-5 mr-2" /> Base de Données (200+ Ingrédients)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <Input 
                  placeholder="Rechercher un aliment (ex: Poulet, Avoine, Sriracha...)" 
                  value={searchIng} onChange={(e) => setSearchIng(e.target.value)} 
                  className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-12 font-bold" 
                />
                
                {!selectedIng ? (
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                    {filteredIngredients.map((ing: any) => (
                      <button key={ing.id} onClick={() => setSelectedIng(ing)} className="w-full text-left p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors flex justify-between items-center group">
                        <div>
                          <span className="block font-bold text-sm dark:text-zinc-100">{lang === 'FR' ? ing.name_fr : ing.name_en}</span>
                          <span className="text-[10px] text-zinc-400 font-black tracking-widest uppercase">{ing.kcal_per_100g} kcal / 100g</span>
                        </div>
                        <Plus className="w-5 h-5 text-zinc-300 group-hover:text-indigo-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
                      <h4 className="font-black text-lg dark:text-zinc-100">{lang === 'FR' ? selectedIng.name_fr : selectedIng.name_en}</h4>
                      <button onClick={() => setSelectedIng(null)} className="text-zinc-400 hover:text-red-500"><XCircle className="w-5 h-5" /></button>
                    </div>
                    
                    <div className="flex space-x-3">
                      <div className="flex-1 space-y-2">
                        <Label>Quantité</Label>
                        <Input type="number" value={ingQty} onChange={(e) => setIngQty(e.target.value)} className="font-black text-lg h-12 dark:bg-zinc-900" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label>Unité</Label>
                        <Select value={ingUnit} onValueChange={setIngUnit}>
                          <SelectTrigger className="h-12 font-bold dark:bg-zinc-900"><SelectValue /></SelectTrigger>
                          <SelectContent className="font-bold dark:bg-zinc-900">
                            {Object.keys(units).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 shadow-sm">
                      <div className="text-center"><span className="block font-black text-orange-500">{Math.round(calculatedTrackerMacros.k)}</span><span className="text-[9px] font-bold text-zinc-400 uppercase">Kcal</span></div>
                      <div className="text-center"><span className="block font-black text-blue-500">{Math.round(calculatedTrackerMacros.p)}g</span><span className="text-[9px] font-bold text-zinc-400 uppercase">Prot</span></div>
                      <div className="text-center"><span className="block font-black text-green-500">{Math.round(calculatedTrackerMacros.c)}g</span><span className="text-[9px] font-bold text-zinc-400 uppercase">Gluc</span></div>
                      <div className="text-center"><span className="block font-black text-yellow-500">{Math.round(calculatedTrackerMacros.f)}g</span><span className="text-[9px] font-bold text-zinc-400 uppercase">Lip</span></div>
                    </div>

                    <Button onClick={handleAddTrackerMeal} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black h-12 shadow-lg shadow-indigo-500/20">
                      Ajouter au Journal
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>

        {/* COLONNE DROITE : HISTORIQUE COMMUN */}
        <div>
          <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 mb-4 flex items-center">
            <History className="w-5 h-5 mr-2 text-indigo-500" /> Repas Consommés
          </h3>
          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 min-h-[300px]">
            {loggedMealsList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 opacity-60 pt-12">
                <Utensils className="w-12 h-12 mb-2" />
                <p className="font-bold">Aucun aliment enregistré aujourd'hui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {loggedMealsList.map((meal: any) => (
                  <div key={meal.id} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl flex items-center justify-between shadow-sm group hover:border-indigo-500 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-xl shrink-0">
                        {meal.image_emoji || "🍽️"}
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm line-clamp-1">{meal.title}</h4>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">
                          {Math.round(meal.kcal)} kcal • {Math.round(meal.protein)}g P • {Math.round(meal.carbs)}g G • {Math.round(meal.fats)}g L
                        </p>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveMeal(meal.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODALE DU SOLVEUR IA */}
      <Dialog open={recipeModal !== null} onOpenChange={(open) => !open && setRecipeModal(null)}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
          {recipeModal && (
            <>
              <DialogHeader>
                <div className="flex justify-center mb-4"><span className="text-6xl drop-shadow-md">{recipeModal.recipe.image_emoji}</span></div>
                <DialogTitle className="text-2xl font-black text-center dark:text-zinc-100">{lang === 'FR' ? recipeModal.recipe.title_fr : recipeModal.recipe.title_en}</DialogTitle>
                <DialogDescription className="text-center font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 py-2 rounded-lg mt-2 mx-8 shadow-sm">
                  {recipeModal.macros.kcal} kcal • {recipeModal.macros.protein}g P • {recipeModal.macros.carbs}g G • {recipeModal.macros.fats}g L
                  <span className="block text-xs mt-1 text-purple-500">+ {recipeModal.macros.fiber}g Fibres</span>
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div>
                  <h4 className="font-black text-sm uppercase tracking-widest text-zinc-500 mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">Ingrédients Calculés à la volée</h4>
                  <ul className="space-y-2">
                    {recipeModal.ingredients.map((ing: any, i: number) => (
                      <li key={i} className="flex justify-between items-center text-sm font-bold dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                        <span>{lang === 'FR' ? ing.name_fr : ing.name_en}</span>
                        <span className="text-teal-700 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/40 px-2.5 py-1 rounded-md">{ing.grams} g</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-black text-sm uppercase tracking-widest text-zinc-500 mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">Préparation Clinique</h4>
                  <ol className="space-y-4">
                    {(lang === 'FR' ? recipeModal.recipe.instructions_fr : recipeModal.recipe.instructions_en).map((step: string, i: number) => (
                      <li key={i} className="flex space-x-3 text-sm font-medium dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                        <span className="font-black text-teal-500 shrink-0 bg-teal-50 dark:bg-teal-900/30 w-6 h-6 flex items-center justify-center rounded-full">{i + 1}</span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              
              <DialogFooter>
                <Button onClick={confirmAndLogRecipe} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-black h-12 text-lg shadow-lg shadow-teal-500/20">
                  <Play className="w-5 h-5 mr-2" /> Valider le Repas
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
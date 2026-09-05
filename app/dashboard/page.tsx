"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Activity, Flame, Settings, LogOut, Trash2, Edit3, AlertTriangle, Utensils, Pill, Calendar, RefreshCw, Play, Trophy, Moon, ChevronRight, Zap, Droplets, ShieldCheck, Clock, Apple, ArrowLeftRight, Medal } from "lucide-react";
import { calculateAge, calculateBMI, calculateBMR, calculateTDEE, calculateEstimatedBodyFat, calculateIdealWeight, calculateTargetCalories, calculateMacros, getMicronutrients, getContextualGreeting, calculateStreak, calculateWeeklyTonnage, generateMealIdeas, calculateWaterIntake, getCurrentWeekStreak } from "@/lib/fitness";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/useLanguage";

const EXTRA_SPORTS = [ 
  { id: "jjb", label: "JJB / MMA" }, { id: "football", label: "Football / Rugby" }, 
  { id: "basketball", label: "Basketball / Volley" }, { id: "running", label: "Running / Sprint" }, 
  { id: "natation", label: "Natation" }, { id: "cyclisme", label: "Cyclisme / Vélo" }, 
  { id: "randonnee", label: "Randonnée / Marche" }, { id: "padel_tennis", label: "Padel / Tennis" } 
];

const getMicroDetails = (name: string, lang: string) => {
  if (name.includes("Magnésium")) return { benefits: lang==="FR"?"Détend le système nerveux (SNC), améliore le sommeil profond et prévient les crampes.":"Relaxes the nervous system (CNS), improves deep sleep and prevents cramps.", timing: lang==="FR"?"Le soir, 30 à 60 minutes avant le coucher.":"Evening, 30-60 minutes before bed.", form: "Bisglycinate (Meilleure absorption, doux pour l'estomac).", food: lang==="FR"?"Épinards, graines de courge, chocolat noir, amandes.":"Spinach, pumpkin seeds, dark chocolate, almonds." };
  if (name.includes("Zinc")) return { benefits: lang==="FR"?"Optimise la production naturelle de testostérone et renforce le système immunitaire.":"Optimizes natural testosterone production and strengthens the immune system.", timing: lang==="FR"?"Le soir au coucher, ou pendant un repas (si nausées à jeun).":"At bedtime, or with a meal (if nauseous on empty stomach).", form: "Picolinate ou Bisglycinate.", food: lang==="FR"?"Huîtres, bœuf, graines de chanvre, lentilles.":"Oysters, beef, hemp seeds, lentils." };
  if (name.includes("D3")) return { benefits: lang==="FR"?"Fixe le calcium sur les os, régule l'humeur et booste les hormones.":"Fixes calcium to bones, regulates mood and boosts hormones.", timing: lang==="FR"?"Le matin ou le midi, au cours d'un repas contenant des graisses (liposoluble).":"Morning or noon, during a meal containing fats (fat-soluble).", form: "Vitamine D3 couplée à la K2 (gouttes ou capsules).", food: lang==="FR"?"Saumon, jaunes d'œufs, exposition au soleil.":"Salmon, egg yolks, sun exposure." };
  if (name.includes("Oméga")) return { benefits: lang==="FR"?"Puissant anti-inflammatoire articulaire, soutient le cœur et le cerveau.":"Powerful joint anti-inflammatory, supports heart and brain.", timing: lang==="FR"?"Pendant les repas pour une meilleure absorption.":"During meals for better absorption.", form: "Huile de poisson sauvage concentrée en EPA et DHA (Triglycérides).", food: lang==="FR"?"Saumon, sardines, maquereau, graines de chia/lin.":"Salmon, sardines, mackerel, chia/flax seeds." };
  if (name.includes("Sodium")) return { benefits: lang==="FR"?"Améliore l'hydratation cellulaire, la contraction musculaire et la congestion (Pump).":"Improves cellular hydration, muscle contraction and pump.", timing: lang==="FR"?"30 minutes avant l'entraînement, et pendant si forte sudation.":"30 mins before training, and during if sweating heavily.", form: lang==="FR"?"Sel marin non raffiné ou sel rose de l'Himalaya.":"Unrefined sea salt or pink Himalayan salt.", food: lang==="FR"?"Bouillons, eau minéralisée, aliments naturellement salés.":"Broths, mineralized water, naturally salty foods." };
  return { benefits: "", timing: "", form: "", food: "" };
};

const MacroRing = ({ pct, color, label, value, onClick }: any) => {
  const radius = 32;
  const circum = 2 * Math.PI * radius;
  const offset = circum - (Math.min(pct, 100) / 100) * circum;
  
  return (
    <div onClick={onClick} className="flex flex-col items-center justify-center relative cursor-pointer hover:scale-105 transition-transform group">
      <svg width="80" height="80" className="transform -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="transparent" stroke="currentColor" strokeWidth="6" className="text-zinc-100 dark:text-zinc-800 transition-colors group-hover:text-zinc-200 dark:group-hover:text-zinc-700" />
        <circle cx="40" cy="40" r={radius} fill="transparent" stroke={color} strokeWidth="6" strokeDasharray={circum} strokeDashoffset={offset} className="transition-all duration-1000 ease-out" strokeLinecap="round" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center pointer-events-none">
        <span className="font-black text-[13px] dark:text-zinc-100 leading-none">{value}g</span>
        <span className="text-[9px] font-bold text-zinc-400 uppercase mt-0.5">{label}</span>
      </div>
    </div>
  );
};

const fetchDashboardData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user");
  
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: logs } = await supabase.from("workout_logs").select("created_at, weight, reps, session_id").eq("user_id", user.id);
  
  let todayWorkoutId: string | null = null;
  let isTodayWorkoutCompleted = false;

  const { data: program } = await supabase.from("user_programs").select("id").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(1).single();
  if (program) {
    const todayKey = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
    const { data: session } = await supabase.from("workout_sessions").select(`id, workout_exercises(id)`).eq("program_id", program.id).eq("day_name", todayKey).single();
    if (session && session.workout_exercises && session.workout_exercises.length > 0) {
      todayWorkoutId = session.id;
      const todayStr = new Date().toISOString().split('T')[0];
      const todayLogs = (logs || []).filter(l => l.session_id === todayWorkoutId && l.created_at.startsWith(todayStr));
      if (todayLogs.length > 0) isTodayWorkoutCompleted = true;
    }
  }
  return { profile, todayWorkoutId, isTodayWorkoutCompleted, logs: logs || [] };
};

export default function DashboardPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const { data, isLoading, mutate } = useSWR('dashboardData', fetchDashboardData);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [isCalModalOpen, setIsCalModalOpen] = useState(false);
  const [isImgModalOpen, setIsImgModalOpen] = useState(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
  const [microModal, setMicroModal] = useState({ show: false, micro: null as any });
  const [mealModal, setMealModal] = useState<{show: boolean, type: 'protein'|'carbs'|'fat', target: number} | null>(null);

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  
  const [editWeight, setEditWeight] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editExperience, setEditExperience] = useState("");
  const [editSchedule, setEditSchedule] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (data?.profile) {
      setEditWeight(data.profile.weight_kg.toString());
      setEditGoal(data.profile.current_goal);
      setEditExperience(data.profile.experience_level || "debutant");
      setEditSchedule(data.profile.weekly_schedule || { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] });
    }
  }, [data?.profile]);

  type TranslationDict = Record<string, string>;
  const t: Record<string, TranslationDict> = {
    FR: { title: "Moniteur", sub: "Analyse systémique et prescriptions métaboliques.", param: "Paramètres", account: "Mon Compte", edit: "Modifier constantes & planning", out: "Se déconnecter", del: "Effacer l'écosystème", goal: "Objectif Actuel", ideal: "Idéal", cals: "Calories", maint: "Maintien", bio: "Biométrie", bmi: "IMC", weight: "Normal", under: "Insuffisance", over: "Surpoids", obese: "Obésité", macros: "Objectifs Macros", macrosSub: "Cibles journalières en grammes", prot: "Prot", carb: "Glucides", fat: "Lipides", micros: "Micronutriments", microsSub: "Cofacteurs métaboliques recommandés", cancel: "Annuler", save: "Sauvegarder", confirm: "Confirmer", deleteMsg: "Tapez 'SUPPRIMER'", deleteWarn: "Cette action détruira définitivement vos données.", understood: "Compris", adjust: "Ajuster mon profil", changeGoal: "Changer d'objectif", updateBio: "Mettre à jour le poids", pendingWorkout: "Séance prévue aujourd'hui", completedWorkout: "Séance accomplie", restDay: "Jour de repos", goWorkout: "Démarrer", streakUnit: "Série", tonnageTitle: "Tonnage Hebdomadaire", tonnageDesc: "Vous avez soulevé l'équivalent de : ", bioMsg: "Une modification ajustera votre IMC, IMG et vos calories.", changeGoalMsg: "Modifier votre objectif ajustera instantanément vos calories cibles et la répartition de vos macros.", water: "Hydratation", streakTitle: "Votre Semaine", streakSub: "Ne brisez pas la chaîne ! Consistance > Intensité.", imgTitle: "Le Radar Corporel", imgSub: "L'Indice de Masse Grasse est une estimation de la quantité de gras sur votre corps.", imgWhere: "Où vous situez-vous ?", calTitle: "La Salle des Machines", calSub: "Comment votre corps brûle-t-il l'énergie ?", calBmr: "Survie pure (BMR)", calBmrSub: "Énergie brûlée au repos (Cerveau, Cœur, Organes).", calMove: "Votre Mouvement", calMoveSub: "Énergie liée à vos entraînements et la digestion.", calObj: "Objectif du jour", mealTitle: "Atteindre vos", mealSub: "Voici des exemples de journée type pour atteindre exactement ce quota, calculés pour vous.", waterTitle: "Science de l'Hydratation", waterTotal: "Besoin Total", waterPure: "Eau Pure (~70%)", water1: "🍎 Le Mythe des 100% : Vous n'avez pas besoin de boire tout ce volume en eau pure. Environ 30% de votre hydratation provient des fruits, légumes, café ou thé.", water2: "💪 Congestion & Force : Chaque gramme de glucide stocké dans vos muscles retient 3g d'eau. Une bonne hydratation garantit des muscles pleins (Pump).", water3: "🛡️ Prévention des Blessures : L'eau lubrifie vos articulations et maintient l'élasticité de vos tendons sous charge lourde." },
    EN: { title: "Monitor", sub: "Systemic analysis and metabolic prescriptions.", param: "Settings", account: "My Account", edit: "Edit metrics & schedule", out: "Log Out", del: "Purge Ecosystem", goal: "Current Goal", ideal: "Ideal", cals: "Calories", maint: "Maint.", bio: "Biometrics", bmi: "BMI", weight: "Normal", under: "Underweight", over: "Overweight", obese: "Obese", macros: "Macro Targets", macrosSub: "Daily targets in grams", prot: "Pro", carb: "Carbs", fat: "Fats", micros: "Micronutrients", microsSub: "Recommended metabolic cofactors", cancel: "Cancel", save: "Save", confirm: "Confirm", deleteMsg: "Type 'DELETE'", deleteWarn: "This action will permanently destroy your data.", understood: "Got it", adjust: "Adjust my profile", changeGoal: "Change Goal", updateBio: "Update Weight", pendingWorkout: "Scheduled workout today", completedWorkout: "Workout completed", restDay: "Rest day", goWorkout: "Start", streakUnit: "Streak", tonnageTitle: "Weekly Tonnage", tonnageDesc: "You lifted the equivalent of: ", bioMsg: "Updating this will recalculate your BMI, estimated body fat, and daily calories.", changeGoalMsg: "Changing your goal will instantly adjust your target calories and macronutrient distribution.", water: "Hydration", streakTitle: "Your Week", streakSub: "Don't break the chain! Consistency > Intensity.", imgTitle: "Body Radar", imgSub: "The Body Fat Index is an estimation of the amount of fat on your body.", imgWhere: "Where do you stand?", calTitle: "The Engine Room", calSub: "How does your body burn energy?", calBmr: "Pure Survival (BMR)", calBmrSub: "Energy burned at rest (Brain, Heart, Organs).", calMove: "Your Movement", calMoveSub: "Energy from workouts and digestion.", calObj: "Today's Target", mealTitle: "Reach your", mealSub: "Here are typical daily meal examples to hit exactly this quota, calculated for you.", waterTitle: "Hydration Science", waterTotal: "Total Need", waterPure: "Pure Water (~70%)", water1: "🍎 The 100% Myth: You don't need to drink this entire volume in pure water. About 30% comes from fruits, veggies, coffee, or tea.", water2: "💪 Pump & Strength: Each gram of carb stored in your muscles holds 3g of water. Good hydration ensures full muscles.", water3: "🛡️ Injury Prevention: Water lubricates your joints and maintains tendon elasticity under heavy loads." }
  };
  const txt = t[lang as keyof typeof t] || t.FR;
  const DAYS = lang === "FR" ? { monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi", sunday: "Dimanche" } : { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };

  const handleUpdateProfile = async () => {
    if (!data?.profile) return;
    setActionLoading(true);
    try {
      const newWeight = parseFloat(editWeight);
      await supabase.from("profiles").update({ 
        weight_kg: newWeight, 
        current_goal: editGoal, 
        experience_level: editExperience, 
        weekly_schedule: editSchedule 
      }).eq("id", data.profile.id);
      
      if (newWeight !== data.profile.weight_kg) await supabase.from("measurements").insert([{ user_id: data.profile.id, weight_kg: newWeight }]);
      await mutate();
      setIsEditModalOpen(false); setIsGoalModalOpen(false); setIsBioModalOpen(false);
    } catch (error) { alert("Erreur."); } finally { setActionLoading(false); }
  };

  const handleDeleteProfile = async () => {
    if (!data?.profile || (deleteConfirmText !== "SUPPRIMER" && deleteConfirmText !== "DELETE")) return;
    setActionLoading(true);
    
    const userId = data.profile.id;
    try {
      const { data: files } = await supabase.storage.from('progress-photos').list(userId);
      if (files && files.length > 0) {
        const filePaths = files.map(file => `${userId}/${file.name}`);
        await supabase.storage.from('progress-photos').remove(filePaths);
      }
      await supabase.rpc('delete_account');
    } catch (error) {
      console.error("Erreur lors de la purge :", error);
    }
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleSportToggle = (day: string, sportId: string, checked: boolean) => {
    setEditSchedule((prev) => {
      const daySports = prev[day] || [];
      return { ...prev, [day]: checked ? [...daySports, sportId] : daySports.filter((s) => s !== sportId) };
    });
  };

  if (isLoading || !data?.profile) return <div className="flex min-h-[80vh] items-center justify-center"><div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>;

  const { profile, todayWorkoutId, isTodayWorkoutCompleted, logs } = data;
  const age = calculateAge(profile.birth_date);
  const bmi = calculateBMI(profile.weight_kg, profile.height_cm);
  const bmr = calculateBMR(profile.weight_kg, profile.height_cm, age, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activity_level);
  const img = calculateEstimatedBodyFat(bmi, age, profile.gender);
  const idealWeight = calculateIdealWeight(profile.height_cm, profile.gender);
  const waterTotal = calculateWaterIntake(profile.weight_kg, profile.activity_level);
  const waterPure = Number((waterTotal * 0.7).toFixed(1)); 
  
  const displayGoal = editGoal || profile.current_goal;
  const targetCals = calculateTargetCalories(tdee, displayGoal); 
  const macros = calculateMacros(profile.weight_kg, targetCals, displayGoal, profile.training_frequency);
  const micros = getMicronutrients(profile.gender, profile.training_frequency, profile.weight_kg);
  
  const streak = calculateStreak(logs);
  const currentWeek = getCurrentWeekStreak(logs, lang);
  const tonnage = calculateWeeklyTonnage(logs, lang);
  const greeting = getContextualGreeting(lang, profile.first_name);

  let bmiColor = "text-teal-500"; let bmiLabel = txt.weight;
  if (bmi < 18.5) { bmiColor = "text-blue-500"; bmiLabel = txt.under; }
  else if (bmi >= 25 && bmi < 30) { bmiColor = "text-orange-500"; bmiLabel = txt.over; }
  else if (bmi >= 30) { bmiColor = "text-red-600 font-bold"; bmiLabel = txt.obese; }

  const formatGoal = (goal: string, l: string) => {
    if (l === "EN") return { perte_poids: "Fat Loss", recomposition: "Body Recomp", performance: "Performance", prise_masse: "Muscle Building" }[goal] || goal;
    return { perte_poids: "Perte de masse grasse", recomposition: "Recomposition Corporelle", performance: "Performance & Force", prise_masse: "Prise de masse musculaire" }[goal] || goal;
  };

  const renderSmartBanner = () => {
    const todayName = DAYS[["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()] as keyof typeof DAYS];
    
    if (isTodayWorkoutCompleted) {
      return (
        <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl p-4 shadow-lg shadow-amber-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm"><Trophy className="w-6 h-6 text-white" /></div>
            <div>
              <p className="text-amber-100 text-xs font-bold uppercase tracking-wider">{txt.completedWorkout}</p>
              <h3 className="text-white font-black text-lg">{todayName} : {lang === 'FR' ? 'Repos mérité !' : 'Well deserved rest!'}</h3>
            </div>
          </div>
        </div>
      );
    }
    
    if (todayWorkoutId) {
      return (
        <div onClick={() => router.push(`/workout/${todayWorkoutId}`)} className="cursor-pointer bg-gradient-to-r from-teal-500 to-teal-700 rounded-2xl p-4 shadow-lg shadow-teal-500/20 flex items-center justify-between transition-transform hover:scale-[1.01] active:scale-95">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm"><Play className="w-6 h-6 text-white fill-white" /></div>
            <div>
              <p className="text-teal-100 text-xs font-bold uppercase tracking-wider">{txt.pendingWorkout}</p>
              <h3 className="text-white font-black text-lg">{todayName}</h3>
            </div>
          </div>
          <Button variant="secondary" className="bg-white text-teal-700 hover:bg-zinc-50 font-bold rounded-full">{txt.goWorkout}</Button>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-2xl p-4 shadow-lg shadow-indigo-500/20 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm"><Moon className="w-6 h-6 text-white fill-white" /></div>
          <div>
            <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider">{txt.restDay}</p>
            <h3 className="text-white font-black text-lg">{lang === 'FR' ? 'La croissance musculaire est en cours.' : 'Muscle growth in progress.'}</h3>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full pb-24">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
              {greeting}
            </h2>
            {streak > 0 && (
              <div onClick={() => setIsStreakModalOpen(true)} className="cursor-pointer flex items-center bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full font-black text-sm border border-orange-200 dark:border-orange-800 shadow-sm hover:scale-105 transition-transform">
                🔥 {streak} {txt.streakUnit}
              </div>
            )}
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">{txt.sub}</p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md hover:bg-white dark:hover:bg-zinc-800 transition-all rounded-xl font-bold px-5 h-10">
              <Settings className="w-4 h-4 mr-2 text-zinc-500 dark:text-zinc-400" /> {txt.param}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
            <DropdownMenuLabel className="px-3 py-2 text-xs font-black tracking-widest text-zinc-400 uppercase">{txt.account}</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800/50 my-2" />
            
            <DropdownMenuItem onClick={() => setIsEditModalOpen(true)} className="cursor-pointer p-3 rounded-xl font-bold dark:text-zinc-100 focus:bg-teal-50 dark:focus:bg-teal-500/10 focus:text-teal-600 dark:focus:text-teal-400 transition-colors outline-none">
              <Edit3 className="w-5 h-5 mr-3 opacity-70" /> {txt.edit}
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="cursor-pointer p-3 rounded-xl font-bold text-orange-600 focus:bg-orange-50 dark:focus:bg-orange-500/10 focus:text-orange-500 transition-colors outline-none">
              <LogOut className="w-5 h-5 mr-3 opacity-70" /> {txt.out}
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800/50 my-2" />
            
            <DropdownMenuItem onClick={() => setIsDeleteModalOpen(true)} className="cursor-pointer p-3 rounded-xl font-bold text-red-600 focus:bg-red-50 dark:focus:bg-red-500/10 focus:text-red-500 transition-colors outline-none">
              <Trash2 className="w-5 h-5 mr-3 opacity-70" /> {txt.del}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {renderSmartBanner()}

      <div onClick={() => router.push("/analytics#tonnage-chart")} className="cursor-pointer bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 rounded-xl p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-zinc-700 hover:ring-2 hover:ring-zinc-600 transition-all group">
        <div className="flex items-center space-x-4">
          <div className="bg-white/10 p-2 rounded-lg group-hover:bg-yellow-400/20 transition-colors"><Zap className="w-5 h-5 text-yellow-400" /></div>
          <div>
            <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">{txt.tonnageTitle}</h4>
            <p className="text-lg font-medium">{txt.tonnageDesc} <span className="font-black text-yellow-400">{tonnage.equivalent}</span></p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-2xl font-black">{tonnage.total.toLocaleString()} kg</div>
          <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer hover:bg-zinc-800 dark:hover:bg-white transition-colors group relative overflow-hidden" onClick={() => setIsGoalModalOpen(true)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-bold opacity-80">{txt.goal}</CardTitle><RefreshCw className="h-5 w-5 opacity-40 group-hover:opacity-100 transition-opacity" /></CardHeader>
          <CardContent><div className="text-xl font-black leading-tight mb-1 uppercase tracking-tight">{formatGoal(profile.current_goal, lang)}</div><p className="text-xs opacity-80 font-medium">{txt.ideal} : {idealWeight} kg</p></CardContent>
        </Card>
        
        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all group" onClick={() => setIsCalModalOpen(true)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-300 flex items-center">{txt.cals}</CardTitle>
            <Flame className="h-5 w-5 text-orange-500 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent><div className="text-3xl font-black text-zinc-900 dark:text-zinc-50 transition-all">{targetCals} <span className="text-lg font-medium text-zinc-500">kcal</span></div><p className="text-xs text-zinc-500 mt-1 font-medium">{txt.maint} : {tdee} kcal</p></CardContent>
        </Card>
        
        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group" onClick={() => setIsImgModalOpen(true)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-300 flex items-center">{txt.imgTitle}</CardTitle>
            <Activity className="h-5 w-5 text-indigo-500 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent><div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">~{img}<span className="text-lg font-medium text-zinc-500">%</span></div><p className="text-xs text-zinc-500 mt-1 font-medium">{lang === 'FR' ? "Cliquez pour analyser ➔" : "Click to analyze ➔"}</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-zinc-900 dark:text-zinc-100">
              <Utensils className="h-5 w-5 text-zinc-700 dark:text-zinc-300 mr-2" />
              <span>{txt.macros}</span>
            </CardTitle>
            <CardDescription>{txt.macrosSub}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="flex justify-around items-center pt-2 pb-4">
              <MacroRing pct={macros.proteinPct} color="#3b82f6" label={txt.prot} value={macros.protein} onClick={() => setMealModal({show: true, type: 'protein', target: macros.protein})} />
              <MacroRing pct={macros.carbPct} color="#10b981" label={txt.carb} value={macros.carbs} onClick={() => setMealModal({show: true, type: 'carbs', target: macros.carbs})} />
              <MacroRing pct={macros.fatPct} color="#f59e0b" label={txt.fat} value={macros.fat} onClick={() => setMealModal({show: true, type: 'fat', target: macros.fat})} />
            </div>
            
            <div className="flex items-center justify-center p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              💡 {lang === 'FR' ? "Cliquez sur un anneau pour voir un exemple de menu." : "Click on a ring to see meal examples."}
            </div>

            <div onClick={() => setIsWaterModalOpen(true)} className="pt-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 cursor-pointer group hover:bg-blue-50/50 dark:hover:bg-blue-900/10 p-2 -mx-2 rounded-lg transition-colors">
              <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400 group-hover:text-blue-600 transition-colors">{txt.water}</span>
              <span className="font-black flex items-center dark:text-zinc-100 text-lg group-hover:text-blue-500 transition-colors"><Droplets className="h-5 w-5 mr-1 text-blue-400"/> {waterTotal} L</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-xl text-zinc-900 dark:text-zinc-100">
              <Pill className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
              <span>{txt.micros}</span>
            </CardTitle>
            <CardDescription>{txt.microsSub}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {micros.map((micro: any, index: number) => (
                <div key={index} onClick={() => setMicroModal({ show: true, micro: micro })} className="flex flex-col space-y-1 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800 cursor-pointer hover:border-teal-500 dark:hover:border-teal-600 transition-colors group shadow-sm">
                  <div className="flex justify-between items-center"><span className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{micro.name}</span><span className="text-sm font-extrabold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded">{micro.amount}</span></div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">{lang==="EN" ? (micro.name.includes("Zinc") ? "Testosterone & Immunity" : "Sleep & Recovery") : micro.role}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isStreakModalOpen} onOpenChange={setIsStreakModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-orange-500 flex items-center justify-center">
              <Flame className="mr-2 w-6 h-6" /> {txt.streakTitle}
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              {txt.streakSub}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="flex justify-between items-center px-2">
              {currentWeek.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${day.completed ? 'bg-orange-100 border-orange-500 dark:bg-orange-900/40 text-orange-500 shadow-sm' : day.isFuture ? 'border-dashed border-zinc-200 dark:border-zinc-800 bg-transparent' : 'border-solid border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900'}`}>
                    <Flame className={`w-5 h-5 ${day.completed ? 'fill-orange-500' : 'fill-transparent text-zinc-300 dark:text-zinc-700'}`} />
                  </div>
                  <span className={`text-[10px] font-bold uppercase ${day.isToday ? 'text-teal-600 dark:text-teal-400' : 'text-zinc-400 dark:text-zinc-600'}`}>{day.dayName}</span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter><Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold" onClick={() => setIsStreakModalOpen(false)}>{txt.understood}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isWaterModalOpen} onOpenChange={setIsWaterModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-blue-500 flex items-center">
              <Droplets className="mr-2" /> {txt.waterTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div>
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">{txt.waterTotal}</p>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{waterTotal} L</p>
              </div>
              <ArrowLeftRight className="w-5 h-5 text-blue-300" />
              <div className="text-right">
                <p className="text-xs font-bold text-teal-500 uppercase tracking-widest">{txt.waterPure}</p>
                <p className="text-2xl font-black text-teal-600 dark:text-teal-400">{waterPure} L</p>
              </div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-sm font-medium text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
              <p>{txt.water1}</p>
              <p>{txt.water2}</p>
              <p>{txt.water3}</p>
            </div>
          </div>
          <DialogFooter><Button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold" onClick={() => setIsWaterModalOpen(false)}>{txt.understood}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={mealModal?.show || false} onOpenChange={(open) => !open && setMealModal(null)}>
        <DialogContent className="sm:max-w-[450px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
              {txt.mealTitle} {mealModal?.target}g
            </DialogTitle>
            <DialogDescription>
              {txt.mealSub}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            {mealModal && generateMealIdeas(mealModal.type, mealModal.target, lang).map((idea: any, i: number) => (
              <div key={i} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                <h4 className="font-bold text-lg mb-3 flex items-center dark:text-zinc-100"><span className="text-2xl mr-2">{idea.icon}</span> {idea.title}</h4>
                <div className="space-y-3">
                  {idea.meals.map((m: any, j: number) => (
                    <div key={j} className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-2 last:border-0 last:pb-0">
                      <div>
                        <span className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">{m.time}</span>
                        <span className="font-medium text-sm dark:text-zinc-300">{m.amount} {m.food}</span>
                      </div>
                      <span className={`font-black text-sm mt-4 ${mealModal.type === 'protein' ? 'text-blue-500' : mealModal.type === 'carbs' ? 'text-green-500' : 'text-orange-500'}`}>
                        +{m[mealModal.type === 'protein' ? 'prot' : mealModal.type === 'carbs' ? 'carbs' : 'fat']}g
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter><Button className="w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold" onClick={() => setMealModal(null)}>{txt.understood}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCalModalOpen} onOpenChange={setIsCalModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-orange-500 flex items-center"><Flame className="mr-2" /> {txt.calTitle}</DialogTitle>
            <DialogDescription>{txt.calSub}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
              <h4 className="font-bold text-orange-700 dark:text-orange-400 flex justify-between"><span>{txt.calBmr}</span> <span>{bmr} kcal</span></h4>
              <p className="text-xs font-medium text-orange-600/80 dark:text-orange-400/80 mt-1">{txt.calBmrSub}</p>
            </div>
            <div className="flex justify-center"><ArrowLeftRight className="w-5 h-5 text-zinc-300 dark:text-zinc-700 rotate-90" /></div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <h4 className="font-bold text-zinc-800 dark:text-zinc-200 flex justify-between"><span>{txt.calMove}</span> <span>+{tdee - bmr} kcal</span></h4>
              <p className="text-xs font-medium text-zinc-500 mt-1">{txt.calMoveSub}</p>
            </div>
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <span className="font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest text-sm">{txt.calObj}</span>
              <span className="text-2xl font-black text-orange-500">{targetCals} kcal</span>
            </div>
          </div>
          <DialogFooter><Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold" onClick={() => setIsCalModalOpen(false)}>{txt.understood}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isImgModalOpen} onOpenChange={setIsImgModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-indigo-500 flex items-center"><Activity className="mr-2" /> {txt.imgTitle}</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center space-y-4">
            <div className="text-6xl font-black text-zinc-900 dark:text-zinc-100">~{img}%</div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {txt.imgSub}
            </p>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 mt-4">
              <h4 className="font-bold text-indigo-700 dark:text-indigo-400 mb-2">{txt.imgWhere}</h4>
              {profile.gender === 'homme' ? (
                <ul className="text-xs text-left space-y-2 text-indigo-900 dark:text-indigo-200">
                  <li><strong>&lt; 10% :</strong> {lang === 'FR' ? 'Athlète sec (Abdos ultra-visibles)' : 'Shredded Athlete (Visible abs)'}</li>
                  <li><strong>10 - 15% :</strong> {lang === 'FR' ? 'Fitness (Abdos visibles)' : 'Fitness (Slightly visible abs)'}</li>
                  <li><strong>15 - 20% :</strong> {lang === 'FR' ? 'Forme normale (Ventre plat)' : 'Normal Shape (Flat belly)'}</li>
                  <li><strong>&gt; 20% :</strong> {lang === 'FR' ? 'Embonpoint' : 'Overweight'}</li>
                </ul>
              ) : (
                <ul className="text-xs text-left space-y-2 text-indigo-900 dark:text-indigo-200">
                  <li><strong>&lt; 20% :</strong> {lang === 'FR' ? 'Athlète sèche (Abdos visibles)' : 'Shredded Athlete (Visible abs)'}</li>
                  <li><strong>20 - 25% :</strong> {lang === 'FR' ? 'Fitness (Silhouette tonique)' : 'Fitness (Toned silhouette)'}</li>
                  <li><strong>25 - 30% :</strong> {lang === 'FR' ? 'Forme normale' : 'Normal Shape'}</li>
                  <li><strong>&gt; 30% :</strong> {lang === 'FR' ? 'Embonpoint' : 'Overweight'}</li>
                </ul>
              )}
            </div>
          </div>
          <DialogFooter><Button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold" onClick={() => setIsImgModalOpen(false)}>{txt.understood}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={microModal.show} onOpenChange={(open) => !open && setMicroModal({ show: false, micro: null })}>
        <DialogContent className="sm:max-w-[450px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          {microModal.micro && (
            <>
              <DialogHeader><DialogTitle className="text-2xl font-black text-teal-600 dark:text-teal-400">{microModal.micro.name}</DialogTitle><DialogDescription className="font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-3">{lang === 'FR' ? "Objectif :" : "Target:"} {microModal.micro.amount}</DialogDescription></DialogHeader>
              <div className="space-y-5 pt-2">
                {(() => {
                  const details = getMicroDetails(microModal.micro.name, lang);
                  return (
                    <>
                      <div className="flex items-start space-x-3"><ShieldCheck className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" /><div><p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{lang==='FR'?"Bénéfices physiologiques":"Physiological benefits"}</p><p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{details.benefits}</p></div></div>
                      <div className="flex items-start space-x-3"><Clock className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" /><div><p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{lang==='FR'?"Timing optimal":"Optimal timing"}</p><p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{details.timing}</p></div></div>
                      <div className="flex items-start space-x-3"><Pill className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" /><div><p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{lang==='FR'?"Format de complément":"Supplement form"}</p><p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{details.form}</p></div></div>
                      <div className="flex items-start space-x-3"><Apple className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" /><div><p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{lang==='FR'?"Sources naturelles":"Natural sources"}</p><p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{details.food}</p></div></div>
                    </>
                  );
                })()}
              </div>
              <DialogFooter className="mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-4"><Button className="w-full bg-teal-500 text-white hover:bg-teal-600 font-bold" onClick={() => setMicroModal({ show: false, micro: null })}>{txt.understood}</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader><DialogTitle className="dark:text-zinc-100">{txt.changeGoal}</DialogTitle><DialogDescription className="pt-2">{txt.changeGoalMsg}</DialogDescription></DialogHeader>
          <div className="py-4">
            <Select value={editGoal} onValueChange={(val) => { setEditGoal(val); }}>
              <SelectTrigger className="w-full dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"><SelectValue /></SelectTrigger>
              <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                <SelectItem value="perte_poids">Perte de masse grasse (Déficit)</SelectItem>
                <SelectItem value="recomposition">Recomposition corporelle (Maintien)</SelectItem>
                <SelectItem value="performance">Performance martiale (Léger surplus)</SelectItem>
                <SelectItem value="prise_masse">Prise de masse musculaire (Surplus)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsGoalModalOpen(false); setEditGoal(profile.current_goal); }} className="dark:border-zinc-700 dark:text-zinc-300 font-bold">{txt.cancel}</Button>
            <Button onClick={handleUpdateProfile} disabled={actionLoading} className="bg-teal-500 hover:bg-teal-600 text-white font-bold">{actionLoading ? "..." : txt.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBioModalOpen} onOpenChange={setIsBioModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader><DialogTitle className="dark:text-zinc-100">{txt.updateBio}</DialogTitle><DialogDescription className="pt-2">{txt.bioMsg}</DialogDescription></DialogHeader>
          <div className="py-4 space-y-2">
            <Label className="dark:text-zinc-300">Poids (kg)</Label>
            <Input type="number" step="0.1" value={editWeight} onChange={(e) => { setEditWeight(e.target.value); }} className="text-xl font-bold dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 h-14" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsBioModalOpen(false); setEditWeight(profile.weight_kg.toString()); }} className="dark:border-zinc-700 dark:text-zinc-300 font-bold">{txt.cancel}</Button>
            <Button onClick={handleUpdateProfile} disabled={actionLoading} className="bg-teal-500 hover:bg-teal-600 text-white font-bold">{actionLoading ? "..." : txt.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader><DialogTitle className="dark:text-zinc-100">{txt.adjust}</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-zinc-300">Poids (kg)</Label>
                  <Input type="number" step="0.1" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100" />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-zinc-300">Objectif Principal</Label>
                  <Select value={editGoal} onValueChange={(val) => { setEditGoal(val); }}>
                    <SelectTrigger className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"><SelectValue /></SelectTrigger>
                    <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                      <SelectItem value="perte_poids">Perte de masse grasse</SelectItem>
                      <SelectItem value="recomposition">Recomposition corporelle</SelectItem>
                      <SelectItem value="performance">Performance martiale</SelectItem>
                      <SelectItem value="prise_masse">Prise de masse musculaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="dark:text-zinc-300 flex items-center"><Medal className="w-4 h-4 mr-2" /> Niveau d'Expérience</Label>
              <Select value={editExperience} onValueChange={(val) => { setEditExperience(val); }}>
                <SelectTrigger className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"><SelectValue placeholder="Sélectionnez un niveau" /></SelectTrigger>
                <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                  <SelectItem value="debutant">Débutant (0 - 1 an)</SelectItem>
                  <SelectItem value="intermediaire">Intermédiaire (1 - 3 ans)</SelectItem>
                  <SelectItem value="avance">Avancé (+3 ans)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500 mt-1">L'IA ajustera le volume et la difficulté nerveuse des prochains programmes générés.</p>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold flex items-center border-b border-zinc-200 dark:border-zinc-800 pb-2 dark:text-zinc-100"><Calendar className="h-4 w-4 mr-2"/> Sports Annexes (Fatigue)</h4>
              <div className="space-y-3">
                {Object.keys(DAYS).map((dayKey) => (
                  <div key={dayKey} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 gap-2 text-sm">
                    <span className="font-bold w-24 text-zinc-700 dark:text-zinc-300">{DAYS[dayKey as keyof typeof DAYS]}</span>
                    <div className="flex flex-wrap gap-3">
                      {EXTRA_SPORTS.map((sport) => {
                        const isChecked = (editSchedule[dayKey] as string[] || []).includes(sport.id);
                        return (
                          <div key={sport.id} className="flex items-center space-x-1">
                            <Checkbox id={`edit-${dayKey}-${sport.id}`} checked={isChecked} onCheckedChange={(c) => {
                              if (typeof c === 'boolean') handleSportToggle(dayKey, sport.id, c);
                            }} className="dark:border-zinc-700 dark:data-[state=checked]:bg-teal-500" />
                            <Label htmlFor={`edit-${dayKey}-${sport.id}`} className="text-xs cursor-pointer dark:text-zinc-400">{sport.label}</Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 font-bold">{txt.cancel}</Button>
            <Button onClick={handleUpdateProfile} disabled={actionLoading} className="bg-teal-500 text-white hover:bg-teal-600 font-bold">{actionLoading ? "..." : txt.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px] border-red-200 bg-red-50 dark:border-red-900 dark:bg-zinc-950">
          <DialogHeader><DialogTitle className="text-red-600 dark:text-red-500 flex items-center"><AlertTriangle className="mr-2 h-5 w-5"/> Purge</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-red-700 dark:text-red-400">{txt.deleteMsg}</Label>
              <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} className="border-red-300 dark:border-red-900 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="dark:border-zinc-800 dark:text-zinc-300 font-bold">{txt.cancel}</Button>
            <Button variant="destructive" onClick={handleDeleteProfile} disabled={(deleteConfirmText !== "SUPPRIMER" && deleteConfirmText !== "DELETE") || actionLoading} className="dark:bg-red-600 dark:hover:bg-red-700 font-bold">{txt.confirm}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
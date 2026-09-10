"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { toPng } from "html-to-image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Activity, Flame, Settings, LogOut, Trash2, Edit3, AlertTriangle, Utensils, Pill, Calendar, RefreshCw, Play, Trophy, Moon, ChevronRight, Zap, Droplets, ShieldCheck, Clock, Apple, ArrowLeftRight, Medal, Brain, CheckCircle2, Check, XCircle, User, Share2, Loader2, BellRing, Scale, BatteryCharging, BatteryWarning, Battery, Info, Frown, Meh, Smile, Target, Dumbbell } from "lucide-react";
import { calculateAge, calculateBMI, calculateBMR, calculateTDEE, calculateEstimatedBodyFat, calculateIdealWeight, calculateTargetCalories, calculateMacros, getMicronutrients, getContextualGreeting, calculateStreak, calculateWeeklyTonnage, generateMealIdeas, calculateWaterIntake, getCurrentWeekStreak } from "@/lib/fitness";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/useLanguage";
import { awardQuizXP } from "@/lib/gamification-engine";
import { generateSmartWorkoutPlan } from "@/lib/workout-generator";

const EXTRA_SPORTS = [ 
  { id: "jjb", label: "JJB / MMA" }, { id: "football", label: "Football / Rugby" }, 
  { id: "basketball", label: "Basketball / Volley" }, { id: "running", label: "Running / Sprint" }, 
  { id: "natation", label: "Natation" }, { id: "cyclisme", label: "Cyclisme / Vélo" }, 
  { id: "randonnee", label: "Randonnée / Marche" }, { id: "padel_tennis", label: "Padel / Tennis" } 
];

const EQUIPMENTS = [
  { id: "poids_corps", label: "Poids du corps (Bodyweight)" },
  { id: "salle", label: "Salle de sport (Machines, Barres)" },
  { id: "home_gym", label: "Home Gym (Haltères, Kettlebells)" }
];

const AVATAR_LIST = [
  { id: "default", label: "Initial" },
  { id: "🧑", label: "Gars 1" }, { id: "👦🏽", label: "Gars 2" }, { id: "👨🏿‍🦲", label: "Gars 3" }, { id: "👱‍♂️", label: "Gars 4" }, { id: "🧔🏾‍♂️", label: "Gars 5" },
  { id: "👩", label: "Fille 1" }, { id: "👩🏽", label: "Fille 2" }, { id: "👩🏾‍🦱", label: "Fille 3" }, { id: "👱‍♀️", label: "Fille 4" }, { id: "👩🏿", label: "Fille 5" },
  { id: "🦊", label: "Renard" }, { id: "🐯", label: "Tigre" }, { id: "🐺", label: "Loup" }, { id: "🦍", label: "Gorille" }, 
  { id: "🐉", label: "Dragon" }, { id: "👽", label: "Alien" }, { id: "🤖", label: "Robot" }, { id: "👻", label: "Fantôme" }, { id: "🥷", label: "Ninja" }
];

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

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
  
  const { data: dashMetrics } = await supabase.rpc('get_dashboard_metrics', { p_user_id: user.id });
  const acwrScore = dashMetrics?.acwr || 1;
  const yesterdayVol = dashMetrics?.yesterday || 0;

  const d30 = new Date(); d30.setDate(d30.getDate() - 30);
  const { data: logs } = await supabase.from("workout_logs")
    .select("created_at, weight, reps, session_id")
    .eq("user_id", user.id)
    .gte("created_at", d30.toISOString());

  const { data: gamification } = await supabase.from("user_gamification").select("*").eq("user_id", user.id).maybeSingle();

  const { data: lastMeasurement } = await supabase
    .from("measurements")
    .select("created_at, weight_kg, body_fat_percentage")
    .eq("user_id", user.id)
    .not("weight_kg", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let daysSinceLastWeighIn = 0;
  let currentActualBodyFat = null;
  let currentWeight = profile.weight_kg;

  if (lastMeasurement) {
    const lastDate = new Date(lastMeasurement.created_at);
    const today = new Date();
    daysSinceLastWeighIn = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
    currentActualBodyFat = lastMeasurement.body_fat_percentage;
    currentWeight = lastMeasurement.weight_kg;
  } else {
    daysSinceLastWeighIn = 999;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const validSleepQuality = profile?.last_sleep_check === todayStr ? profile.sleep_quality : 'moyen';

  let rScore = 100;
  if (validSleepQuality === 'mauvais') rScore -= 25;
  else if (validSleepQuality === 'moyen') rScore -= 10;
  
  if (acwrScore > 1.5) rScore -= 20;
  else if (acwrScore > 1.3) rScore -= 10;
  else if (acwrScore < 0.8) rScore -= 5;
  if (yesterdayVol > 0) rScore -= 10; 
  rScore = Math.max(10, Math.min(100, rScore));

  let dailyQuiz = null;
  const disableQuiz = profile?.disable_quiz || false;

  if (!disableQuiz && gamification?.last_quiz_date !== todayStr) {
    const userLevel = gamification?.level || 1;
    const targetDiff = userLevel < 3 ? 'easy' : userLevel < 7 ? 'medium' : 'hard';
    const answeredQuizzes = gamification?.answered_quizzes || [];
    
    const { data: questions } = await supabase.from("quiz_questions").select("*").eq("difficulty", targetDiff);
      
    if (questions && questions.length > 0) {
      const unanswered = questions.filter(q => !answeredQuizzes.includes(q.id));
      if (unanswered.length > 0) {
        dailyQuiz = unanswered[Math.floor(Math.random() * unanswered.length)];
      }
    }
  }

  let todayWorkoutId: string | null = null;
  let isTodayWorkoutCompleted = false;

  const { data: program } = await supabase.from("user_programs").select("id").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(1).single();
  if (program) {
    const todayKey = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
    const { data: session } = await supabase.from("workout_sessions").select(`id, workout_exercises(id)`).eq("program_id", program.id).eq("day_name", todayKey).single();
    if (session && session.workout_exercises && session.workout_exercises.length > 0) {
      todayWorkoutId = session.id;
      
      const { data: checkLogs } = await supabase.from("workout_logs").select("id").eq("session_id", todayWorkoutId).gte("created_at", todayStr + "T00:00:00.000Z").limit(1);
      if (checkLogs && checkLogs.length > 0) isTodayWorkoutCompleted = true;
    }
  }
  return { profile, gamification, dailyQuiz, todayWorkoutId, isTodayWorkoutCompleted, logs: logs || [], daysSinceLastWeighIn, currentActualBodyFat, currentWeight, rScore };
};

export default function DashboardPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const { data, isLoading, mutate } = useSWR('dashboardData', fetchDashboardData, { revalidateOnFocus: true });
  const quizCardRef = useRef<HTMLDivElement>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [isCalModalOpen, setIsCalModalOpen] = useState(false);
  const [isImgModalOpen, setIsImgModalOpen] = useState(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
  const [isReadinessModalOpen, setIsReadinessModalOpen] = useState(false);
  const [microModal, setMicroModal] = useState({ show: false, micro: null as any });
  const [mealModal, setMealModal] = useState<{show: boolean, type: 'protein'|'carbs'|'fat', target: number} | null>(null);

  const [showSleepPrompt, setShowSleepPrompt] = useState(false);

  const [quizState, setQuizState] = useState<'playing' | 'success' | 'fail'>('playing');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showQuizShareModal, setShowQuizShareModal] = useState(false);
  const [quizMilestoneData, setQuizMilestoneData] = useState({ rank: "", answered: 0 });
  const [isSharing, setIsSharing] = useState(false);

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editBodyFat, setEditBodyFat] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editExperience, setEditExperience] = useState("");
  const [editSchedule, setEditSchedule] = useState<Record<string, string[]>>({});
  const [editEquipment, setEditEquipment] = useState<string[]>([]); // 🛡️ NOUVEAU: Équipement
  const [editDisableQuiz, setEditDisableQuiz] = useState(false);
  const [editAvatar, setEditAvatar] = useState("default");
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  
  const [recalibrateAI, setRecalibrateAI] = useState(false);

  useEffect(() => {
    if (data?.profile) {
      setEditFirstName(data.profile.first_name || "");
      setEditLastName(data.profile.last_name || "");
      setEditHeight(data.profile.height_cm?.toString() || "");
      setEditWeight(data.currentWeight?.toString() || data.profile.weight_kg?.toString() || "");
      setEditBodyFat(data.currentActualBodyFat ? data.currentActualBodyFat.toString() : "");
      setEditGoal(data.profile.current_goal);
      setEditExperience(data.profile.experience_level || "debutant");
      setEditSchedule(data.profile.weekly_schedule || { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] });
      setEditEquipment(data.profile.equipment_access ? data.profile.equipment_access.split(',').map((e: string) => e.trim()) : ['poids_corps']); // 🛡️ INIT ÉQUIPEMENT
      setEditDisableQuiz(data.profile.disable_quiz || false);
      setEditAvatar(data.profile.avatar_url || "default");

      const todayStr = new Date().toISOString().split('T')[0];
      if (data.profile.last_sleep_check !== todayStr) {
        setShowSleepPrompt(true);
      }
    }
    
    if (typeof window !== "undefined" && 'serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          reg.pushManager.getSubscription().then(sub => {
            if (sub) setIsPushEnabled(true);
          });
        }
      });
    }
  }, [data]);

  const t = {
    FR: { title: "Moniteur", sub: "Analyse systémique et prescriptions métaboliques.", param: "Paramètres", account: "Mon Compte", edit: "Ajuster mon profil", out: "Se déconnecter", del: "Effacer l'écosystème", goal: "Objectif Actuel", ideal: "Idéal", cals: "Calories", maint: "Maintien", bio: "Biométrie", bmi: "IMC", weight: "Normal", under: "Insuffisance", over: "Surpoids", obese: "Obésité", macros: "Objectifs Macros", macrosSub: "Cibles journalières en grammes", prot: "Prot", carb: "Glucides", fat: "Lipides", micros: "Micronutriments", microsSub: "Cofacteurs métaboliques recommandés", cancel: "Annuler", save: "Sauvegarder", confirm: "Confirmer", deleteMsg: "Tapez 'SUPPRIMER'", deleteWarn: "Cette action détruira définitivement vos données.", understood: "Compris", adjust: "Ajuster mon profil", changeGoal: "Changer d'objectif", updateBio: "Mettre à jour le poids", pendingWorkout: "Séance prévue aujourd'hui", completedWorkout: "Séance accomplie", restDay: "Jour de repos", goWorkout: "Démarrer", streakUnit: "Série", tonnageTitle: "Tonnage Hebdomadaire", tonnageDesc: "Vous avez soulevé l'équivalent de : ", bioMsg: "Une modification ajustera votre IMC, IMG et vos calories.", changeGoalMsg: "Modifier votre objectif ajustera instantanément vos calories cibles et la répartition de vos macros.", water: "Hydratation", streakTitle: "Votre Semaine", streakSub: "Ne brisez pas la chaîne ! Consistance > Intensité.", imgTitle: "Masse Grasse", imgSub: "Indice de masse grasse sur votre corps.", imgWhere: "Où vous situez-vous ?", calTitle: "La Salle des Machines", calSub: "Comment votre corps brûle-t-il l'énergie ?", calBmr: "Survie pure (BMR)", calBmrSub: "Énergie brûlée au repos (Cerveau, Cœur, Organes).", calMove: "Votre Mouvement", calMoveSub: "Énergie liée à vos entraînements et la digestion.", calObj: "Objectif du jour", mealTitle: "Stratégie Repas :", mealSub: "Exemples calibrés pour vos macros. Cliquez sur un protocole pour l'ouvrir.", waterTitle: "Science de l'Hydratation", waterTotal: "Besoin Total", waterPure: "Eau Pure (~70%)", water1: "🍎 Le Mythe des 100% : Vous n'avez pas besoin de boire tout ce volume en eau pure. Environ 30% de votre hydratation provient des fruits, légumes, café ou thé.", water2: "💪 Congestion & Force : Chaque gramme de glucide stocké dans vos muscles retient 3g d'eau. Une bonne hydratation garantit des muscles pleins (Pump).", water3: "🛡️ Prévention des Blessures : L'eau lubrifie vos articulations et maintient l'élasticité de vos tendons sous charge lourde.", quizTitle: "Daily Brain Gain", quizSub: "L'intelligence bâtit le muscle.", easy: "Facile", medium: "Moyen", hard: "Difficile", checkAns: "Vérifier", correct: "Exact !", wrong: "Raté...", shareInsta: "Partager en Story", reqCal: "Calibrage Requis", reqCalSub: "Dernière pesée il y a", bfLabel: "Masse Grasse (%) - Optionnel", bfPlaceholder: "Ex: 15.5", clinicBmr: "Katch-McArdle (Précision Clinique)", readinessTitle: "Readiness Score (SNC)", 
          readinessDesc: "Ce score sur 100 évalue la fatigue de votre Système Nerveux Central (SNC).\n\nIl croise 3 variables :\n• Ratio de fatigue (ACWR).\n• Tonnage de la veille.\n• Qualité du sommeil.\n\n🟢 85-100 : Récupération optimale. C'est le moment de battre des records (PR).\n🟡 60-84 : Fatigue modérée. Entraînement normal, privilégiez la technique.\n🔴 < 60 : Risque de blessure élevé. Baissez le volume de 20% ou prenez un jour de repos actif.",
          sleepPrompt: "Comment avez-vous dormi cette nuit ?", sleepExc: "Excellent", sleepAvg: "Moyen", sleepBad: "Mauvais",
          sleepLegendExc: "8h+ ininterrompu", sleepLegendAvg: "6-7h, réveils", sleepLegendBad: "< 6h, insomnie", sleepContext: "L'algorithme a besoin de votre ressenti.", recalibrate: "Recalibrer mon programme IA avec ces paramètres", equipmentTitle: "Équipement disponible" },
    EN: { title: "Monitor", sub: "Systemic analysis and metabolic prescriptions.", param: "Settings", account: "My Account", edit: "Adjust my profile", out: "Log Out", del: "Purge Ecosystem", goal: "Current Goal", ideal: "Ideal", cals: "Calories", maint: "Maint.", bio: "Biometrics", bmi: "BMI", weight: "Normal", under: "Underweight", over: "Overweight", obese: "Obese", macros: "Macro Targets", macrosSub: "Daily targets in grams", prot: "Pro", carb: "Carbs", fat: "Fats", micros: "Micronutrients", microsSub: "Recommended metabolic cofactors", cancel: "Cancel", save: "Save", confirm: "Confirm", deleteMsg: "Type 'DELETE'", deleteWarn: "This action will permanently destroy your data.", understood: "Got it", adjust: "Adjust my profile", changeGoal: "Change Goal", updateBio: "Update Weight", pendingWorkout: "Scheduled workout today", completedWorkout: "Workout completed", restDay: "Rest day", goWorkout: "Start", streakUnit: "Streak", tonnageTitle: "Weekly Tonnage", tonnageDesc: "You lifted the equivalent of: ", bioMsg: "Updating this will recalculate your BMI, estimated body fat, and daily calories.", changeGoalMsg: "Changing your goal will instantly adjust your target calories and macronutrient distribution.", water: "Hydration", streakTitle: "Your Week", streakSub: "Don't break the chain! Consistency > Intensity.", imgTitle: "Body Fat", imgSub: "Percentage of fat on your body.", imgWhere: "Where do you stand?", calTitle: "The Engine Room", calSub: "How does your body burn energy?", calBmr: "Pure Survival (BMR)", calBmrSub: "Energy burned at rest (Brain, Heart, Organs).", calMove: "Your Movement", calMoveSub: "Energy from workouts and digestion.", calObj: "Today's Target", mealTitle: "Meal Strategy:", mealSub: "Calibrated examples for your macros. Click a protocol to expand.", waterTitle: "Hydration Science", waterTotal: "Total Need", waterPure: "Pure Water (~70%)", water1: "🍎 The 100% Myth: You don't need to drink this entire volume in pure water. About 30% comes from fruits, veggies, coffee, or tea.", water2: "💪 Pump & Strength: Each gram of carb stored in your muscles holds 3g of water. Good hydration ensures full muscles.", water3: "🛡️ Injury Prevention: Water lubricates your joints and maintains tendon elasticity under heavy loads.", quizTitle: "Daily Brain Gain", quizSub: "Intelligence builds muscle.", easy: "Easy", medium: "Medium", hard: "Hard", checkAns: "Check", correct: "Correct!", wrong: "Missed...", shareInsta: "Share to Story", reqCal: "Calibration Required", reqCalSub: "Last weigh-in", bfLabel: "Body Fat (%) - Optional", bfPlaceholder: "Ex: 15.5", clinicBmr: "Katch-McArdle (Clinical Precision)", readinessTitle: "Readiness Score (CNS)", 
          readinessDesc: "This score out of 100 evaluates the fatigue of your Central Nervous System (CNS).\n\nIt crosses 3 variables:\n• Fatigue ratio (ACWR).\n• Yesterday's tonnage.\n• Sleep quality.\n\n🟢 85-100: Optimal recovery. Time to hit PRs.\n🟡 60-84: Moderate fatigue. Normal training, focus on technique.\n🔴 < 60: High injury risk. Drop volume by 20% or take an active rest day.",
          sleepPrompt: "How did you sleep last night?", sleepExc: "Excellent", sleepAvg: "Average", sleepBad: "Poor",
          sleepLegendExc: "8h+ uninterrupted", sleepLegendAvg: "6-7h, minor waking", sleepLegendBad: "< 6h, restless", sleepContext: "The algorithm needs your input.", recalibrate: "Recalibrate my AI program with these settings", equipmentTitle: "Available equipment" }
  };
  const txt = t[lang as keyof typeof t] || t.FR;
  const DAYS = lang === "FR" ? { monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi", sunday: "Dimanche" } : { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };

  const handleSleepCheckin = async (quality: 'excellent' | 'moyen' | 'mauvais') => {
    if (!data?.profile) return;
    const todayStr = new Date().toISOString().split('T')[0];
    
    await supabase.from("profiles").update({ 
      sleep_quality: quality, 
      last_sleep_check: todayStr 
    }).eq("id", data.profile.id);

    await supabase.from("daily_metrics").upsert({
      user_id: data.profile.id,
      date: todayStr,
      sleep_quality: quality,
      readiness_score: data.rScore 
    }, { onConflict: 'user_id, date' });
    
    setShowSleepPrompt(false);
    mutate(); 
  };

  const togglePushNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert(lang === 'FR' ? "Votre navigateur ne supporte pas le Push." : "Push not supported.");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        alert(lang === 'FR' ? "Le Service Worker n'est pas installé. L'application doit d'abord être installée ou 'next-pwa' configuré." : "Service Worker not installed.");
        return;
      }

      if (isPushEnabled) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
        }
        setIsPushEnabled(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert(lang === 'FR' ? "Permission refusée par le système." : "Permission denied.");
          return;
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          alert(lang === 'FR' ? "Clé VAPID manquante dans le fichier .env" : "Missing VAPID key in .env.");
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });

        const subJson = subscription.toJSON();
        
        await supabase.from('push_subscriptions').insert([{
          user_id: data!.profile.id,
          endpoint: subJson.endpoint,
          auth_key: subJson.keys?.auth,
          p256dh_key: subJson.keys?.p256dh
        }]);

        setIsPushEnabled(true);
      }
    } catch (err: any) {
      console.error('Erreur Push Toggle', err);
      alert(lang === 'FR' ? `Erreur technique : ${err.message}` : `Error: ${err.message}`);
    }
  };

  const testPushNotification = async () => {
    if (!data?.profile?.id) return;
    try {
      await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.profile.id,
          title: "🚀 Test Réussi !",
          body: "L'écosystème Vivex est bien connecté à votre appareil."
        })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProfile = async () => {
    if (!data?.profile) return;
    setActionLoading(true);
    try {
      const newWeight = parseFloat(editWeight);
      const newHeight = parseFloat(editHeight);
      const newBF = editBodyFat ? parseFloat(editBodyFat) : null;
      
      const updatedProfileData = { 
        first_name: editFirstName,
        last_name: editLastName,
        height_cm: newHeight,
        weight_kg: newWeight, 
        current_goal: editGoal, 
        experience_level: editExperience, 
        weekly_schedule: editSchedule,
        equipment_access: editEquipment.join(','), // 🛡️ ENREGISTREMENT ÉQUIPEMENT
        disable_quiz: editDisableQuiz,
        avatar_url: editAvatar
      };

      await supabase.from("profiles").update(updatedProfileData).eq("id", data.profile.id);
      
      if (newWeight !== data.currentWeight || newBF !== data.currentActualBodyFat) {
        await supabase.from("measurements").insert([{ 
          user_id: data.profile.id, 
          weight_kg: newWeight,
          body_fat_percentage: newBF
        }]);
      }

      // 🧠 L'I.A. PREND LE RELAIS SI L'OPTION EST COCHÉE
      if (recalibrateAI) {
         const { data: library } = await supabase.from("exercise_library").select("*");
         const { data: historyLogs } = await supabase.from("workout_logs").select("*").eq("user_id", data.profile.id);
         
         const completeProfileForAI = { ...data.profile, ...updatedProfileData };
         const newPlan = generateSmartWorkoutPlan(completeProfileForAI, library || [], historyLogs || [], false, []);
         
         await supabase.from("user_programs").update({ is_active: false }).eq("user_id", data.profile.id);

         const { data: newProgram } = await supabase.from("user_programs").insert([{ 
            user_id: data.profile.id, 
            name: "Programme I.A. (Recalibré)", 
            is_active: true, 
            program_type: 'ai' 
         }]).select().single();

         if (newProgram) {
            let orderIndex = 0;
            for (const day of newPlan) {
              const { data: newSession } = await supabase.from("workout_sessions").insert([{ program_id: newProgram.id, day_name: day.day, order_index: orderIndex }]).select().single();
              if (newSession) {
                const exercisesToInsert = day.exercises.map((ex: any) => ({ session_id: newSession.id, exercise_id: ex.exercise.id, sets: ex.sets, target_reps: ex.target_reps, recommended_weight: ex.recommended_weight, rest_seconds: ex.rest_seconds, order_index: ex.order_index }));
                if (exercisesToInsert.length > 0) {
                  await supabase.from("workout_exercises").insert(exercisesToInsert);
                }
              }
              orderIndex++;
            }
         }
      }
      
      await mutate();
      setIsEditModalOpen(false); setIsGoalModalOpen(false); setIsBioModalOpen(false);
      setRecalibrateAI(false); // Reset
    } catch (error) { alert("Erreur de sauvegarde."); } finally { setActionLoading(false); }
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

  const submitQuiz = async () => {
    if (selectedAnswer === null || !data?.dailyQuiz || !data?.profile) return;
    const isCorrect = selectedAnswer === data.dailyQuiz.correct_index;
    const todayStr = new Date().toISOString().split('T')[0];

    if (isCorrect) {
      setQuizState('success');
      
      const gamificationResult = await awardQuizXP(data.profile.id, data.dailyQuiz.difficulty);
      const newAnsweredArray = [...(data.gamification?.answered_quizzes || []), data.dailyQuiz.id];
      
      await supabase.from("user_gamification").update({ 
        last_quiz_date: todayStr,
        answered_quizzes: newAnsweredArray
      }).eq("user_id", data.profile.id);
      
      if (gamificationResult.isMilestone) {
        setQuizMilestoneData({ rank: gamificationResult.rankName, answered: gamificationResult.totalAnswered });
        setTimeout(() => { setShowQuizShareModal(true); mutate(); }, 1500);
      } else {
        setTimeout(() => { mutate(); }, 2500); 
      }
    } else {
      setQuizState('fail');
      setTimeout(() => { setQuizState('playing'); setSelectedAnswer(null); }, 3500); 
    }
  };

  const shareQuizMilestone = async () => {
    if (!quizCardRef.current) return;
    setIsSharing(true);
    try {
      const dataUrl = await toPng(quizCardRef.current, { cacheBust: true, quality: 1, pixelRatio: 3 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'vivex-brain-rank.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'Rang Vivex', files: [file] });
      } else {
        const link = document.createElement('a');
        link.download = 'vivex-brain-rank.png';
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Erreur de partage', err);
    } finally {
      setIsSharing(false);
    }
  };

  if (isLoading || !data?.profile) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full pb-24 animate-pulse">
        <div className="flex justify-between"><div className="h-10 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div><div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div></div>
        <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
        <div className="grid gap-4 grid-cols-3"><div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div><div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div><div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div></div>
      </div>
    );
  }

  const { profile, gamification, dailyQuiz, todayWorkoutId, isTodayWorkoutCompleted, logs, daysSinceLastWeighIn, currentActualBodyFat, currentWeight, rScore } = data;
  const age = calculateAge(profile.birth_date);
  const bmi = calculateBMI(currentWeight, profile.height_cm);
  
  const bmr = calculateBMR(currentWeight, profile.height_cm, age, profile.gender, currentActualBodyFat);
  const tdee = calculateTDEE(bmr, profile.activity_level);
  
  const estimatedImg = calculateEstimatedBodyFat(bmi, age, profile.gender);
  const displayedImg = currentActualBodyFat || estimatedImg; 
  
  const idealWeight = calculateIdealWeight(profile.height_cm, profile.gender);
  const waterTotal = calculateWaterIntake(currentWeight, profile.activity_level);
  const waterPure = Number((waterTotal * 0.7).toFixed(1)); 
  
  const displayGoal = editGoal || profile.current_goal;
  const targetCals = calculateTargetCalories(tdee, displayGoal); 
  const macros = calculateMacros(currentWeight, targetCals, displayGoal, profile.training_frequency);
  const micros = getMicronutrients(profile.gender, profile.training_frequency, currentWeight);
  
  const streak = calculateStreak(logs);
  const currentWeek = getCurrentWeekStreak(logs, lang);
  const tonnage = calculateWeeklyTonnage(logs, lang);
  const greeting = getContextualGreeting(lang, profile.first_name);

  const currentLevel = gamification?.level || 1;
  const currentXp = gamification?.current_xp || 0;
  const nextLevelXP = currentLevel * 1000;
  const xpProgress = Math.min((currentXp / nextLevelXP) * 100, 100);

  const formatGoal = (goal: string, l: string) => {
    if (l === "EN") return { perte_poids: "Fat Loss", recomposition: "Body Recomp", performance: "Performance", prise_masse: "Muscle Building" }[goal] || goal;
    return { perte_poids: "Perte de masse grasse", recomposition: "Recomposition Corporelle", performance: "Performance & Force", prise_masse: "Prise de masse musculaire" }[goal] || goal;
  };

  const getReadinessUI = () => {
    if (rScore >= 85) return { color: "text-green-500", bg: "bg-green-500", border: "border-green-500/30", text: lang === 'FR' ? "Récupération optimale, prêt pour un record." : "Optimal recovery, ready for a PR.", icon: <Battery className="w-8 h-8 text-green-500" /> };
    if (rScore >= 60) return { color: "text-teal-500", bg: "bg-teal-500", border: "border-teal-500/30", text: lang === 'FR' ? "Feu vert. Maintenez la surcharge progressive." : "Green light. Maintain progressive overload.", icon: <BatteryCharging className="w-8 h-8 text-teal-500" /> };
    return { color: "text-red-500", bg: "bg-red-500", border: "border-red-500/30", text: lang === 'FR' ? "SNC Épuisé, baissez le volume de 20% aujourd'hui." : "CNS Exhausted, drop volume by 20% today.", icon: <BatteryWarning className="w-8 h-8 text-red-500" /> };
  };
  const rUI = getReadinessUI();

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
            <button className="relative outline-none group focus:ring-2 focus:ring-teal-500 rounded-full shrink-0">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-teal-400 to-indigo-500 flex items-center justify-center text-white font-black shadow-sm group-hover:shadow-md transition-all">
                {profile.avatar_url && profile.avatar_url !== 'default' ? (
                  <span className="text-4xl leading-none">{profile.avatar_url}</span>
                ) : (
                  <span className="text-3xl leading-none">{profile.first_name ? profile.first_name.charAt(0).toUpperCase() : <User className="w-8 h-8" />}</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-zinc-900 rounded-full p-1.5 shadow-sm border border-zinc-200 dark:border-zinc-800">
                <Settings className="w-4 h-4 text-zinc-600 dark:text-zinc-400 group-hover:rotate-90 transition-transform duration-500" />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] mt-2">
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

      {showSleepPrompt && (
        <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-white dark:bg-zinc-950 shadow-2xl animate-in slide-in-from-top-8 duration-700">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"></div>
          <div className="p-6 sm:p-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-2xl"><Moon className="w-8 h-8 text-indigo-500 dark:text-indigo-400" /></div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{txt.sleepPrompt}</h3>
                <p className="text-sm font-medium text-zinc-500 mt-1">{txt.sleepContext}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button onClick={() => handleSleepCheckin('excellent')} className="group relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-300 active:scale-95 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-green-500/0 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Smile className="w-10 h-10 text-zinc-400 group-hover:text-green-500 mb-3 transition-colors duration-300 group-hover:scale-110" />
                <span className="font-black text-zinc-700 dark:text-zinc-200 group-hover:text-green-700 dark:group-hover:text-green-400 text-lg mb-1">{txt.sleepExc}</span>
                <span className="text-xs font-bold text-zinc-400 group-hover:text-green-600/70 dark:group-hover:text-green-400/70 text-center px-2">{txt.sleepLegendExc}</span>
              </button>

              <button onClick={() => handleSleepCheckin('moyen')} className="group relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-yellow-500 dark:hover:border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all duration-300 active:scale-95 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/0 to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Meh className="w-10 h-10 text-zinc-400 group-hover:text-yellow-500 mb-3 transition-colors duration-300 group-hover:scale-110" />
                <span className="font-black text-zinc-700 dark:text-zinc-200 group-hover:text-yellow-700 dark:group-hover:text-yellow-400 text-lg mb-1">{txt.sleepAvg}</span>
                <span className="text-xs font-bold text-zinc-400 group-hover:text-yellow-600/70 dark:group-hover:text-yellow-400/70 text-center px-2">{txt.sleepLegendAvg}</span>
              </button>

              <button onClick={() => handleSleepCheckin('mauvais')} className="group relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-red-500 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 active:scale-95 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-red-500/0 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Frown className="w-10 h-10 text-zinc-400 group-hover:text-red-500 mb-3 transition-colors duration-300 group-hover:scale-110" />
                <span className="font-black text-zinc-700 dark:text-zinc-200 group-hover:text-red-700 dark:group-hover:text-red-400 text-lg mb-1">{txt.sleepBad}</span>
                <span className="text-xs font-bold text-zinc-400 group-hover:text-red-600/70 dark:group-hover:text-red-400/70 text-center px-2">{txt.sleepLegendBad}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`p-6 rounded-2xl border ${rUI.border} bg-white dark:bg-zinc-950 shadow-sm flex items-center justify-between relative`}>
        <button onClick={() => setIsReadinessModalOpen(true)} className="absolute top-3 right-3 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
          <Info className="w-4 h-4" />
        </button>
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border ${rUI.border}`}>{rUI.icon}</div>
          <div>
            <h4 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center">
              Readiness Score
            </h4>
            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 pr-6">{rUI.text}</p>
          </div>
        </div>
        <div className={`text-4xl font-black ${rUI.color}`}>{rScore}</div>
      </div>

      {daysSinceLastWeighIn >= 7 && (
        <div onClick={() => router.push("/progress")} className="cursor-pointer bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 border border-purple-500/30 rounded-2xl p-4 flex items-center justify-between hover:bg-purple-500/20 transition-all shadow-md animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center space-x-4">
            <div className="bg-purple-500/20 p-3 rounded-xl shadow-inner"><Scale className="w-6 h-6 text-purple-400" /></div>
            <div>
              <h4 className="text-sm font-black text-purple-500 dark:text-purple-400 uppercase tracking-widest">{txt.reqCal}</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium mt-0.5">{txt.reqCalSub} <span className="font-bold">{daysSinceLastWeighIn} jours</span>. {lang === 'FR' ? "Mettez à jour pour ajuster l'algorithme." : "Update to adjust the algorithm."}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-purple-400 shrink-0" />
        </div>
      )}

      {renderSmartBanner()}

      <div 
        onClick={() => router.push("/profile")}
        className="cursor-pointer group relative bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md hover:border-teal-500/50 transition-all overflow-hidden"
      >
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-teal-500/5 to-transparent pointer-events-none"></div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-110 transition-transform">
              <span className="text-xl font-black text-white">{currentLevel}</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">{lang === 'FR' ? "Niveau Actuel" : "Current Level"}</h3>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{currentXp} / {nextLevelXP} XP</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-teal-500 transition-colors" />
        </div>
        <div className="mt-4 relative w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full transition-all duration-1000" style={{ width: `${xpProgress}%` }}></div>
        </div>
      </div>

      {dailyQuiz && (
        <Card className={`border-2 transition-all duration-500 overflow-hidden relative ${quizState === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : quizState === 'fail' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-indigo-500/30 bg-white dark:bg-zinc-900 shadow-[0_10px_40px_-15px_rgba(99,102,241,0.2)]'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Brain className="w-32 h-32" /></div>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center text-indigo-600 dark:text-indigo-400"><Brain className="w-5 h-5 mr-2" /> {txt.quizTitle}</CardTitle>
              <span className={`text-[10px] uppercase font-black px-2 py-1 rounded tracking-widest ${dailyQuiz.difficulty === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : dailyQuiz.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                {dailyQuiz.difficulty === 'easy' ? txt.easy : dailyQuiz.difficulty === 'medium' ? txt.medium : txt.hard}
              </span>
            </div>
            <CardDescription className="text-zinc-500">{txt.quizSub}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            {quizState === 'playing' ? (
              <>
                <p className="font-bold text-zinc-900 dark:text-zinc-100 text-lg leading-snug">{lang === 'FR' ? dailyQuiz.question_fr : dailyQuiz.question_en}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                  {(lang === 'FR' ? dailyQuiz.options_fr : dailyQuiz.options_en).map((opt: string, i: number) => (
                    <button 
                      key={i} 
                      onClick={() => setSelectedAnswer(i)}
                      className={`p-3 rounded-xl border text-left font-bold transition-colors ${selectedAnswer === i ? 'bg-indigo-500 border-indigo-600 text-white shadow-md' : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-indigo-400 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-indigo-600'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <Button onClick={submitQuiz} disabled={selectedAnswer === null} className="w-full mt-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold">{txt.checkAns}</Button>
              </>
            ) : quizState === 'success' ? (
              <div className="text-center py-6 animate-in zoom-in">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <h3 className="text-xl font-black text-green-700 dark:text-green-400 mb-1">{txt.correct}</h3>
                <p className="text-sm font-medium text-green-600 dark:text-green-500">{lang === 'FR' ? dailyQuiz.explanation_fr : dailyQuiz.explanation_en}</p>
                <p className="mt-4 font-black text-green-600 dark:text-green-400 animate-pulse">+{dailyQuiz.difficulty === 'easy' ? 30 : dailyQuiz.difficulty === 'medium' ? 60 : 100} XP</p>
              </div>
            ) : (
              <div className="text-center py-6 animate-in shake">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                <h3 className="text-xl font-black text-red-700 dark:text-red-400 mb-1">{txt.wrong}</h3>
                <p className="text-sm font-medium text-red-600 dark:text-red-500">{lang === 'FR' ? dailyQuiz.explanation_fr : dailyQuiz.explanation_en}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">~{displayedImg}<span className="text-lg font-medium text-zinc-500">%</span></div>
            <p className="text-xs text-indigo-500 font-bold mt-1">{currentActualBodyFat ? "★ " + (lang === 'FR' ? "Valeur Réelle" : "Actual Value") : (lang === 'FR' ? "Valeur Estimée" : "Estimated Value")}</p>
          </CardContent>
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
              💡 {lang === 'FR' ? "Cliquez sur un anneau pour voir vos protocoles de repas." : "Click on a ring to see your meal protocols."}
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

      <Dialog open={isCalModalOpen} onOpenChange={setIsCalModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader><DialogTitle className="text-2xl font-black text-orange-500 flex items-center"><Flame className="mr-2" /> {txt.calTitle}</DialogTitle><DialogDescription>{txt.calSub}</DialogDescription></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
              <h4 className="font-bold text-orange-700 dark:text-orange-400 flex justify-between"><span>{txt.calBmr}</span> <span>{bmr} kcal</span></h4>
              <p className="text-[10px] font-bold text-orange-600/80 dark:text-orange-400/80 mt-1 uppercase tracking-widest">{currentActualBodyFat ? txt.clinicBmr : "Mifflin-St Jeor (Estimation)"}</p>
              <p className="text-xs font-medium text-orange-600/80 dark:text-orange-400/80 mt-1">{txt.calBmrSub}</p>
            </div>
            <div className="flex justify-center"><ArrowLeftRight className="w-5 h-5 text-zinc-300 dark:text-zinc-700 rotate-90" /></div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"><h4 className="font-bold text-zinc-800 dark:text-zinc-200 flex justify-between"><span>{txt.calMove}</span> <span>+{tdee - bmr} kcal</span></h4><p className="text-xs font-medium text-zinc-500 mt-1">{txt.calMoveSub}</p></div>
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center"><span className="font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest text-sm">{txt.calObj}</span><span className="text-2xl font-black text-orange-500">{targetCals} kcal</span></div>
          </div>
          <DialogFooter><Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold" onClick={() => setIsCalModalOpen(false)}>{txt.understood}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 📘 MODALE EAU AJOUTÉE ICI */}
      <Dialog open={isWaterModalOpen} onOpenChange={setIsWaterModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-blue-500 flex items-center">
              <Droplets className="mr-2 h-6 w-6" /> {txt.waterTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <span className="font-bold text-blue-700 dark:text-blue-400">{txt.waterTotal}</span>
              <span className="text-2xl font-black text-blue-600 dark:text-blue-500">{waterTotal} L</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 rounded-xl">
              <span className="font-bold text-blue-600/80 dark:text-blue-400/80">{txt.waterPure}</span>
              <span className="text-xl font-black text-blue-500/80 dark:text-blue-400/80">{waterPure} L</span>
            </div>
            <div className="space-y-3 mt-4 text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <p>{txt.water1}</p>
              <p>{txt.water2}</p>
              <p>{txt.water3}</p>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold" onClick={() => setIsWaterModalOpen(false)}>
              {txt.understood}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isImgModalOpen} onOpenChange={setIsImgModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader><DialogTitle className="text-2xl font-black text-indigo-500 flex items-center"><Activity className="mr-2" /> {txt.imgTitle}</DialogTitle></DialogHeader>
          <div className="py-6 text-center space-y-4">
            <div className="text-6xl font-black text-zinc-900 dark:text-zinc-100">~{displayedImg}%</div>
            <p className="text-sm font-bold text-indigo-500">{currentActualBodyFat ? "★ " + (lang === 'FR' ? "Valeur Réelle (Mesurée)" : "Actual Value (Measured)") : (lang === 'FR' ? "Valeur Estimée" : "Estimated Value")}</p>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{txt.imgSub}</p>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 mt-4"><h4 className="font-bold text-indigo-700 dark:text-indigo-400 mb-2">{txt.imgWhere}</h4>{profile.gender === 'homme' ? (<ul className="text-xs text-left space-y-2 text-indigo-900 dark:text-indigo-200"><li><strong>&lt; 10% :</strong> {lang === 'FR' ? 'Athlète sec (Abdos ultra-visibles)' : 'Shredded Athlete (Visible abs)'}</li><li><strong>10 - 15% :</strong> {lang === 'FR' ? 'Fitness (Abdos visibles)' : 'Fitness (Slightly visible abs)'}</li><li><strong>15 - 20% :</strong> {lang === 'FR' ? 'Forme normale (Ventre plat)' : 'Normal Shape (Flat belly)'}</li><li><strong>&gt; 20% :</strong> {lang === 'FR' ? 'Embonpoint' : 'Overweight'}</li></ul>) : (<ul className="text-xs text-left space-y-2 text-indigo-900 dark:text-indigo-200"><li><strong>&lt; 20% :</strong> {lang === 'FR' ? 'Athlète sèche (Abdos visibles)' : 'Shredded Athlete (Visible abs)'}</li><li><strong>20 - 25% :</strong> {lang === 'FR' ? 'Fitness (Silhouette tonique)' : 'Fitness (Toned silhouette)'}</li><li><strong>25 - 30% :</strong> {lang === 'FR' ? 'Forme normale' : 'Normal Shape'}</li><li><strong>&gt; 30% :</strong> {lang === 'FR' ? 'Embonpoint' : 'Overweight'}</li></ul>)}</div>
          </div>
          <DialogFooter><Button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold" onClick={() => setIsImgModalOpen(false)}>{txt.understood}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBioModalOpen} onOpenChange={setIsBioModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader><DialogTitle className="dark:text-zinc-100">{txt.updateBio}</DialogTitle><DialogDescription className="pt-2">{txt.bioMsg}</DialogDescription></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="dark:text-zinc-300">Poids (kg)</Label>
              <Input type="number" step="0.1" value={editWeight} onChange={(e) => { setEditWeight(e.target.value); }} className="text-xl font-bold dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 h-14" />
            </div>
            <div className="space-y-2">
              <Label className="dark:text-zinc-300 text-teal-600">{txt.bfLabel}</Label>
              <Input type="number" step="0.1" placeholder={txt.bfPlaceholder} value={editBodyFat} onChange={(e) => { setEditBodyFat(e.target.value); }} className="text-xl font-bold dark:bg-zinc-900 border-teal-500/30 focus-visible:ring-teal-500 dark:text-zinc-100 h-14" />
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{lang === 'FR' ? "Active la formule de Katch-McArdle si renseigné." : "Activates Katch-McArdle formula if provided."}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsBioModalOpen(false); setEditWeight(data.currentWeight.toString()); setEditBodyFat(data.currentActualBodyFat ? data.currentActualBodyFat.toString() : ""); }} className="dark:border-zinc-700 dark:text-zinc-300 font-bold">{txt.cancel}</Button>
            <Button onClick={handleUpdateProfile} disabled={actionLoading} className="bg-teal-500 hover:bg-teal-600 text-white font-bold">{actionLoading ? "..." : txt.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="dark:text-zinc-100 flex items-center">
              <Target className="mr-2 h-5 w-5 text-indigo-500" />
              {txt.changeGoal}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {txt.changeGoalMsg}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="dark:text-zinc-300">{txt.goal}</Label>
              <Select value={editGoal} onValueChange={(val) => setEditGoal(val)}>
                <SelectTrigger className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 h-14 font-black text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800 font-bold">
                  <SelectItem value="perte_poids">{lang === 'FR' ? "Perte de masse grasse" : "Fat Loss"}</SelectItem>
                  <SelectItem value="recomposition">{lang === 'FR' ? "Recomposition Corporelle" : "Body Recomp"}</SelectItem>
                  <SelectItem value="performance">{lang === 'FR' ? "Performance & Force" : "Performance"}</SelectItem>
                  <SelectItem value="prise_masse">{lang === 'FR' ? "Prise de masse musculaire" : "Muscle Building"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 🛡️ OPTION RECALIBRAGE INTELLIGENT (I.A.) */}
            <div className="flex items-center space-x-2 mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <Checkbox id="recal-goal" checked={recalibrateAI} onCheckedChange={(c) => setRecalibrateAI(c as boolean)} className="border-indigo-500 data-[state=checked]:bg-indigo-500" />
              <Label htmlFor="recal-goal" className="text-xs font-bold text-indigo-700 dark:text-indigo-400 cursor-pointer">
                {txt.recalibrate}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsGoalModalOpen(false); setEditGoal(data.profile.current_goal); }} className="dark:border-zinc-700 dark:text-zinc-300 font-bold">{txt.cancel}</Button>
            <Button onClick={handleUpdateProfile} disabled={actionLoading} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold">{actionLoading ? "..." : txt.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader><DialogTitle className="dark:text-zinc-100 flex items-center"><User className="w-5 h-5 mr-2" /> {txt.adjust}</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-4"><h4 className="text-sm font-bold flex items-center border-b border-zinc-200 dark:border-zinc-800 pb-2 dark:text-zinc-100">Identité</h4><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="dark:text-zinc-300">Prénom</Label><Input type="text" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 font-bold" /></div><div className="space-y-2"><Label className="dark:text-zinc-300">Nom</Label><Input type="text" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 font-bold" /></div></div></div>
            <div className="space-y-4"><h4 className="text-sm font-bold flex items-center border-b border-zinc-200 dark:border-zinc-800 pb-2 dark:text-zinc-100">Avatar</h4><div className="grid grid-cols-8 gap-2">{AVATAR_LIST.map((av) => (<button key={av.id} type="button" onClick={() => setEditAvatar(av.id)} className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${editAvatar === av.id ? 'ring-2 ring-teal-500 scale-110 bg-teal-50 dark:bg-teal-900/30' : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 opacity-70 hover:opacity-100'}`} title={av.label}>{av.id === 'default' ? <User className="w-5 h-5 text-zinc-500 dark:text-zinc-400" /> : av.id}</button>))}</div></div>
            
            <div className="space-y-4"><h4 className="text-sm font-bold flex items-center border-b border-zinc-200 dark:border-zinc-800 pb-2 dark:text-zinc-100">Biométrie & Objectif</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label className="dark:text-zinc-300">Poids (kg)</Label><Input type="number" step="0.1" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 font-bold" /></div>
                <div className="space-y-2"><Label className="dark:text-zinc-300 text-teal-600">BF (%) Optionnel</Label><Input type="number" step="0.1" value={editBodyFat} onChange={(e) => setEditBodyFat(e.target.value)} className="dark:bg-zinc-900 border-teal-500/30 focus-visible:ring-teal-500 dark:text-zinc-100 font-bold" /></div>
                <div className="space-y-2"><Label className="dark:text-zinc-300">Taille (cm)</Label><Input type="number" step="1" value={editHeight} onChange={(e) => setEditHeight(e.target.value)} className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 font-bold" /></div>
                <div className="space-y-2 col-span-3 sm:col-span-1"><Label className="dark:text-zinc-300">Objectif</Label><Select value={editGoal} onValueChange={(val) => { setEditGoal(val); }}><SelectTrigger className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"><SelectValue /></SelectTrigger><SelectContent className="dark:bg-zinc-950 dark:border-zinc-800"><SelectItem value="perte_poids">Perte de gras</SelectItem><SelectItem value="recomposition">Recomposition</SelectItem><SelectItem value="performance">Performance</SelectItem><SelectItem value="prise_masse">Prise de masse</SelectItem></SelectContent></Select></div>
              </div>
            </div>

            <div className="space-y-2"><Label className="dark:text-zinc-300 flex items-center"><Medal className="w-4 h-4 mr-2 text-yellow-500" /> Niveau d'Expérience</Label><Select value={editExperience} onValueChange={(val) => { setEditExperience(val); }}><SelectTrigger className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"><SelectValue placeholder="Sélectionnez un niveau" /></SelectTrigger><SelectContent className="dark:bg-zinc-950 dark:border-zinc-800"><SelectItem value="debutant">Débutant (0 - 1 an)</SelectItem><SelectItem value="intermediaire">Intermédiaire (1 - 3 ans)</SelectItem><SelectItem value="avance">Avancé (+3 ans)</SelectItem></SelectContent></Select></div>
            
            {/* 🛡️ NOUVEAU : ÉDITION DE L'ÉQUIPEMENT ICI */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold flex items-center border-b border-zinc-200 dark:border-zinc-800 pb-2 dark:text-zinc-100">
                <Dumbbell className="h-4 w-4 mr-2"/> {txt.equipmentTitle}
              </h4>
              <div className="flex flex-col gap-2">
                {EQUIPMENTS.map(eq => (
                  <div key={eq.id} className="flex items-center space-x-2 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <Checkbox
                      id={`eq-${eq.id}`}
                      checked={editEquipment.includes(eq.id)}
                      onCheckedChange={(c) => {
                        if (typeof c === 'boolean') {
                          setEditEquipment(prev => c ? [...prev, eq.id] : prev.filter(e => e !== eq.id));
                        }
                      }}
                      className="data-[state=checked]:bg-teal-500 border-zinc-300 dark:border-zinc-700"
                    />
                    <Label htmlFor={`eq-${eq.id}`} className="text-sm font-medium cursor-pointer dark:text-zinc-300">
                      {eq.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4"><h4 className="text-sm font-bold flex items-center border-b border-zinc-200 dark:border-zinc-800 pb-2 dark:text-zinc-100"><Calendar className="h-4 w-4 mr-2"/> Sports Annexes (Fatigue)</h4><div className="space-y-3">{Object.keys(DAYS).map((dayKey) => (<div key={dayKey} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 gap-2 text-sm"><span className="font-bold w-24 text-zinc-700 dark:text-zinc-300">{DAYS[dayKey as keyof typeof DAYS]}</span><div className="flex flex-wrap gap-3">{EXTRA_SPORTS.map((sport) => {const isChecked = (editSchedule[dayKey] as string[] || []).includes(sport.id);return (<div key={sport.id} className="flex items-center space-x-1"><Checkbox id={`edit-${dayKey}-${sport.id}`} checked={isChecked} onCheckedChange={(c) => {if (typeof c === 'boolean') handleSportToggle(dayKey, sport.id, c);}} className="dark:border-zinc-700 dark:data-[state=checked]:bg-teal-500" /><Label htmlFor={`edit-${dayKey}-${sport.id}`} className="text-xs cursor-pointer dark:text-zinc-400">{sport.label}</Label></div>);})}</div></div>))}</div></div>
            
            {/* 🛡️ OPTION RECALIBRAGE INTELLIGENT (I.A.) DANS L'ÉDITION COMPLÈTE */}
            <div className="flex items-center space-x-2 mt-4 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-200 dark:border-teal-800">
              <Checkbox id="recal-full" checked={recalibrateAI} onCheckedChange={(c) => setRecalibrateAI(c as boolean)} className="border-teal-500 data-[state=checked]:bg-teal-500" />
              <Label htmlFor="recal-full" className="text-xs font-bold text-teal-700 dark:text-teal-400 cursor-pointer">
                {txt.recalibrate}
              </Label>
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800"><div className="flex items-center justify-between"><div className="space-y-0.5"><Label className="text-base font-bold dark:text-zinc-100 flex items-center"><Brain className="w-4 h-4 mr-2 text-indigo-500" /> Daily Brain Gain</Label><p className="text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Afficher les quiz sur l'accueil</p></div><button type="button" onClick={() => setEditDisableQuiz(!editDisableQuiz)} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${!editDisableQuiz ? 'bg-teal-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}><span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${!editDisableQuiz ? 'translate-x-5' : 'translate-x-0'}`} /></button></div></div>
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800"><div className="flex items-center justify-between mb-4"><div className="space-y-0.5"><Label className="text-base font-bold dark:text-zinc-100 flex items-center"><BellRing className="w-4 h-4 mr-2 text-orange-500" /> Notifications</Label><p className="text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Recevoir des rappels d'entraînement</p></div><button type="button" onClick={togglePushNotifications} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isPushEnabled ? 'bg-orange-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}><span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isPushEnabled ? 'translate-x-5' : 'translate-x-0'}`} /></button></div>{isPushEnabled && (<Button variant="outline" size="sm" onClick={testPushNotification} className="w-full text-xs font-bold border-zinc-700 text-zinc-400 hover:text-white">Envoyer une notification de test</Button>)}</div>
          </div>
          <DialogFooter className="border-t border-zinc-100 dark:border-zinc-800 pt-4"><Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 font-bold">{txt.cancel}</Button><Button onClick={handleUpdateProfile} disabled={actionLoading} className="bg-teal-500 text-white hover:bg-teal-600 font-bold">{actionLoading ? "..." : txt.save}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px] border-red-200 bg-red-50 dark:border-red-900 dark:bg-zinc-950">
          <DialogHeader><DialogTitle className="text-red-600 dark:text-red-500 flex items-center"><AlertTriangle className="mr-2 h-5 w-5"/> Purge</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4"><div className="space-y-2"><Label className="text-red-700 dark:text-red-400">{txt.deleteMsg}</Label><Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} className="border-red-300 dark:border-red-900 dark:bg-zinc-900 dark:text-zinc-100" /></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="dark:border-zinc-800 dark:text-zinc-300 font-bold">{txt.cancel}</Button><Button variant="destructive" onClick={handleDeleteProfile} disabled={(deleteConfirmText !== "SUPPRIMER" && deleteConfirmText !== "DELETE") || actionLoading} className="dark:bg-red-600 dark:hover:bg-red-700 font-bold">{txt.confirm}</Button></DialogFooter>
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

      {/* 📘 MODALE REPAS (GÉNÉRATEUR PRO) */}
      <Dialog open={mealModal?.show || false} onOpenChange={(open) => !open && setMealModal(null)}>
        <DialogContent className="sm:max-w-[450px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-zinc-900 dark:text-zinc-100 flex items-center"><Utensils className="mr-2" /> {txt.mealTitle}</DialogTitle>
            <DialogDescription>{txt.mealSub}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            {mealModal && generateMealIdeas(mealModal.type, mealModal.target, lang).map((idea: any, i: number) => (
              <div key={i} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="font-bold text-lg mb-3 flex items-center dark:text-zinc-100">
                  <span className="text-2xl mr-2">{idea.icon}</span> {idea.title}
                </h4>
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
          <DialogFooter className="sticky bottom-0 bg-white dark:bg-zinc-950 pt-2"><Button className="w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold" onClick={() => setMealModal(null)}>{txt.understood}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 📘 MODALE READINESS SCORE INFO */}
      <Dialog open={isReadinessModalOpen} onOpenChange={setIsReadinessModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-zinc-900 dark:text-zinc-100 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-teal-500" /> 
              {lang === 'FR' ? "Readiness Score (SNC)" : "Readiness Score (CNS)"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
              {lang === 'FR' 
                ? "Ce score sur 100 évalue la fatigue de votre Système Nerveux Central (SNC).\n\nIl est calculé en temps réel en croisant 3 variables :\n• Votre ratio de fatigue (ACWR).\n• Le tonnage de votre séance d'hier.\n• La qualité de votre sommeil.\n\nUtilisez-le pour savoir si vous devez pousser vos limites aujourd'hui ou lever le pied pour éviter la blessure." 
                : "This score out of 100 evaluates the fatigue of your Central Nervous System (CNS).\n\nIt is calculated in real-time by cross-referencing 3 variables:\n• Your fatigue ratio (ACWR).\n• The tonnage of yesterday's session.\n• Your sleep quality.\n\nUse it to know if you should push your limits today or ease off to prevent injury."}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsReadinessModalOpen(false)} className="w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold">
              {txt.understood}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 📘 MODALE FLAMME (STREAK) RESTAURÉE */}
      <Dialog open={isStreakModalOpen} onOpenChange={setIsStreakModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-orange-500 flex items-center">
              <Flame className="w-6 h-6 mr-2" /> {txt.streakTitle}
            </DialogTitle>
            <DialogDescription className="font-medium text-zinc-500">{txt.streakSub}</DialogDescription>
          </DialogHeader>
          <div className="py-6 flex justify-between items-center px-2">
            {currentWeek.map((day: any, i: number) => (
              <div key={i} className="flex flex-col items-center space-y-2">
                <span className={`text-[10px] font-black uppercase tracking-widest ${day.isToday ? 'text-orange-500' : 'text-zinc-400'}`}>
                  {day.dayName.substring(0, 3)}
                </span>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  day.completed 
                    ? 'bg-gradient-to-br from-orange-400 to-red-500 border-transparent text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]' 
                    : day.isFuture 
                      ? 'border-zinc-200 dark:border-zinc-800 bg-transparent opacity-40' 
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-300 dark:text-zinc-700'
                }`}>
                  {day.completed ? <Check className="w-5 h-5 stroke-[3px]" /> : <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsStreakModalOpen(false)} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest">
              {txt.understood}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
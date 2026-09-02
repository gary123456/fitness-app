"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Activity, Flame, Scale, Droplets, Settings, LogOut, Trash2, Edit3, AlertTriangle, Utensils, Pill, Calendar, Info, RefreshCw, Play, ShieldCheck, Clock, Apple } from "lucide-react";
import { calculateAge, calculateBMI, calculateBMR, calculateTDEE, calculateEstimatedBodyFat, calculateIdealWeight, calculateWaterIntake, calculateEstimatedVO2Max, calculateTargetCalories, calculateMacros, getMicronutrients } from "@/lib/fitness";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NUTRITION_DATABASE } from "@/lib/nutrition-db";
import { useLanguage } from "@/lib/useLanguage";

interface ExtraSport { id: string; label: string; }

const EXTRA_SPORTS: ExtraSport[] = [ 
  { id: "jjb", label: "JJB / MMA" }, { id: "football", label: "Football / Rugby" }, 
  { id: "basketball", label: "Basketball / Volley" }, { id: "running", label: "Running / Sprint" }, 
  { id: "natation", label: "Natation" }, { id: "cyclisme", label: "Cyclisme / Vélo" }, 
  { id: "randonnee", label: "Randonnée / Marche" }, { id: "padel_tennis", label: "Padel / Tennis" } 
];

// DICTIONNAIRE DETAILLÉ DES MICRONUTRIMENTS
const getMicroDetails = (name: string, lang: string) => {
  if (name.includes("Magnésium")) return {
     benefits: lang==="FR"?"Détend le système nerveux (SNC), améliore le sommeil profond et prévient les crampes.":"Relaxes the nervous system (CNS), improves deep sleep and prevents cramps.",
     timing: lang==="FR"?"Le soir, 30 à 60 minutes avant le coucher.":"Evening, 30-60 minutes before bed.",
     form: "Bisglycinate (Meilleure absorption, doux pour l'estomac).",
     food: lang==="FR"?"Épinards, graines de courge, chocolat noir, amandes.":"Spinach, pumpkin seeds, dark chocolate, almonds."
  };
  if (name.includes("Zinc")) return {
     benefits: lang==="FR"?"Optimise la production naturelle de testostérone et renforce le système immunitaire.":"Optimizes natural testosterone production and strengthens the immune system.",
     timing: lang==="FR"?"Le soir au coucher, ou pendant un repas (si nausées à jeun).":"At bedtime, or with a meal (if nauseous on empty stomach).",
     form: "Picolinate ou Bisglycinate.",
     food: lang==="FR"?"Huîtres, bœuf, graines de chanvre, lentilles.":"Oysters, beef, hemp seeds, lentils."
  };
  if (name.includes("D3")) return {
     benefits: lang==="FR"?"Fixe le calcium sur les os, régule l'humeur et booste les hormones.":"Fixes calcium to bones, regulates mood and boosts hormones.",
     timing: lang==="FR"?"Le matin ou le midi, au cours d'un repas contenant des graisses (liposoluble).":"Morning or noon, during a meal containing fats (fat-soluble).",
     form: "Vitamine D3 couplée à la K2 (gouttes ou capsules).",
     food: lang==="FR"?"Saumon, jaunes d'œufs, exposition au soleil.":"Salmon, egg yolks, sun exposure."
  };
  if (name.includes("Oméga")) return {
     benefits: lang==="FR"?"Puissant anti-inflammatoire articulaire, soutient le cœur et le cerveau.":"Powerful joint anti-inflammatory, supports heart and brain.",
     timing: lang==="FR"?"Pendant les repas pour une meilleure absorption.":"During meals for better absorption.",
     form: "Huile de poisson sauvage concentrée en EPA et DHA (Triglycérides).",
     food: lang==="FR"?"Saumon, sardines, maquereau, graines de chia/lin.":"Salmon, sardines, mackerel, chia/flax seeds."
  };
  if (name.includes("Sodium")) return {
     benefits: lang==="FR"?"Améliore l'hydratation cellulaire, la contraction musculaire et la congestion (Pump).":"Improves cellular hydration, muscle contraction and pump.",
     timing: lang==="FR"?"30 minutes avant l'entraînement, et pendant si forte sudation.":"30 mins before training, and during if sweating heavily.",
     form: lang==="FR"?"Sel marin non raffiné ou sel rose de l'Himalaya.":"Unrefined sea salt or pink Himalayan salt.",
     food: lang==="FR"?"Bouillons, eau minéralisée, aliments naturellement salés.":"Broths, mineralized water, naturally salty foods."
  };
  return { benefits: "", timing: "", form: "", food: "" };
};

const InfoModal = ({ title, description, btnText }: { title: string, description: string, btnText: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={(e) => { e.stopPropagation(); setOpen(true); }} className="text-zinc-400 hover:text-teal-500 transition-colors ml-2"><Info className="w-4 h-4" /></button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center text-teal-600 dark:text-teal-400"><Info className="w-5 h-5 mr-2"/> {title}</DialogTitle>
            <DialogDescription asChild><div className="text-zinc-600 dark:text-zinc-400 pt-3 leading-relaxed text-sm font-medium whitespace-pre-wrap">{description}</div></DialogDescription>
          </DialogHeader>
          <Button className="w-full mt-2 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900" onClick={() => setOpen(false)}>{btnText}</Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [todayWorkoutId, setTodayWorkoutId] = useState<string | null>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [microModal, setMicroModal] = useState({ show: false, micro: null as any });
  
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  
  const [editWeight, setEditWeight] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editSchedule, setEditSchedule] = useState<Record<string, string[]>>({});
  
  const { lang } = useLanguage();

  const t = {
    FR: { title: "Moniteur", sub: "Analyse systémique et prescriptions métaboliques.", param: "Paramètres", account: "Mon Compte", edit: "Modifier constantes & planning", out: "Se déconnecter", del: "Effacer l'écosystème", goal: "Objectif Actuel", ideal: "Idéal théorique", cals: "Calories Cibles", maint: "Maintien (TDEE)", bio: "Biométrie", bmi: "IMC", weight: "Poids Normal", under: "Insuffisance pondérale", over: "Surpoids", obese: "Obésité", macros: "Matrice des Macronutriments", macrosSub: "Ajustés pour l'objectif de", prot: "Protéines", carb: "Glucides", fat: "Lipides", equiv: "Équivalences alimentaires", water: "Hydratation cible", micros: "Micronutriments", microsSub: "Cofacteurs métaboliques recommandés", cancel: "Annuler", save: "Sauvegarder", confirm: "Confirmer", deleteMsg: "Tapez 'SUPPRIMER'", deleteWarn: "Cette action détruira définitivement vos données.", understood: "Compris", adjust: "Ajuster mon profil", changeGoal: "Changer d'objectif", changeGoalMsg: "Modifier votre objectif ajustera instantanément vos calories cibles et la répartition de vos macros.", updateBio: "Mettre à jour le poids", bioMsg: "Une modification ajustera votre IMC, IMG et vos calories.", pendingWorkout: "Séance prévue aujourd'hui", goWorkout: "Démarrer" },
    EN: { title: "Monitor", sub: "Systemic analysis and metabolic prescriptions.", param: "Settings", account: "My Account", edit: "Edit metrics & schedule", out: "Log Out", del: "Purge Ecosystem", goal: "Current Goal", ideal: "Theoretical ideal", cals: "Target Calories", maint: "Maintenance (TDEE)", bio: "Biometrics", bmi: "BMI", weight: "Normal Weight", under: "Underweight", over: "Overweight", obese: "Obese", macros: "Macronutrient Matrix", macrosSub: "Adjusted for", prot: "Proteins", carb: "Carbs", fat: "Fats", equiv: "Food equivalents", water: "Hydration target", micros: "Micronutrients", microsSub: "Recommended metabolic cofactors", cancel: "Cancel", save: "Save", confirm: "Confirm", deleteMsg: "Type 'DELETE'", deleteWarn: "This action will permanently destroy your data.", understood: "Got it", adjust: "Adjust my profile", changeGoal: "Change Goal", changeGoalMsg: "Changing your goal will instantly adjust your target calories and macro distribution.", updateBio: "Update Weight", bioMsg: "A modification will adjust your BMI, Body Fat, and calories.", pendingWorkout: "Scheduled workout today", goWorkout: "Start" }
  };
  const txt = t[lang as keyof typeof t] || t.FR;
  const DAYS = lang === "FR" ? { monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi", sunday: "Dimanche" } : { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!profileData) { router.push("/onboarding"); return; }

      setProfile(profileData);
      setEditWeight(profileData.weight_kg.toString());
      setEditGoal(profileData.current_goal);
      setEditSchedule(profileData.weekly_schedule || { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] });

      calculateAndSetMetrics(profileData, profileData.current_goal);

      // RACCOURCI WORKOUT : Vérification de la séance du jour
      const { data: program } = await supabase.from("user_programs").select("id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single();
      if (program) {
        const todayKey = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
        const { data: session } = await supabase.from("workout_sessions").select(`id, workout_exercises(id)`).eq("program_id", program.id).eq("day_name", todayKey).single();
        if (session && session.workout_exercises && session.workout_exercises.length > 0) {
          setTodayWorkoutId(session.id);
        }
      }
    } catch (error) { console.error("Erreur:", error); } finally { setLoading(false); }
  };

  const calculateAndSetMetrics = (profileData: any, activeGoal: string) => {
    const age = calculateAge(profileData.birth_date);
    const bmi = calculateBMI(profileData.weight_kg, profileData.height_cm);
    const bmr = calculateBMR(profileData.weight_kg, profileData.height_cm, age, profileData.gender);
    const tdee = calculateTDEE(bmr, profileData.activity_level);
    const img = calculateEstimatedBodyFat(bmi, age, profileData.gender);
    const idealWeight = calculateIdealWeight(profileData.height_cm, profileData.gender);
    const water = calculateWaterIntake(profileData.weight_kg, profileData.activity_level);
    const vo2max = calculateEstimatedVO2Max(age, bmi, profileData.gender, profileData.activity_level);
    const targetCals = calculateTargetCalories(tdee, activeGoal); 
    const macros = calculateMacros(profileData.weight_kg, targetCals, activeGoal, profileData.training_frequency);
    const micros = getMicronutrients(profileData.gender, profileData.training_frequency, profileData.weight_kg);

    setMetrics({ age, bmi, bmr, tdee, targetCals, macros, micros, img, idealWeight, water, vo2max });
  };

  const handleUpdateProfile = async () => {
    setActionLoading(true);
    try {
      const newWeight = parseFloat(editWeight);
      await supabase.from("profiles").update({ weight_kg: newWeight, current_goal: editGoal, weekly_schedule: editSchedule }).eq("id", profile.id);
      if (newWeight !== profile.weight_kg) await supabase.from("measurements").insert([{ user_id: profile.id, weight_kg: newWeight }]);
      
      setProfile((prev: any) => ({ ...prev, weight_kg: newWeight, current_goal: editGoal, weekly_schedule: editSchedule }));
      calculateAndSetMetrics({ ...profile, weight_kg: newWeight }, editGoal);
      
      setIsEditModalOpen(false);
      setIsGoalModalOpen(false);
      setIsBioModalOpen(false);
    } catch (error) { alert("Erreur."); } finally { setActionLoading(false); }
  };

  const handleDeleteProfile = async () => {
    if (deleteConfirmText !== "SUPPRIMER" && deleteConfirmText !== "DELETE") return;
    setActionLoading(true);
    try {
      await supabase.from("profiles").delete().eq("id", profile.id);
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) { alert("Erreur."); } finally { setActionLoading(false); }
  };

  const handleSportToggle = (day: string, sportId: string, checked: boolean) => {
    setEditSchedule((prev) => {
      const daySports = prev[day] || [];
      return { ...prev, [day]: checked ? [...daySports, sportId] : daySports.filter((s) => s !== sportId) };
    });
  };

  if (loading || !profile || !metrics) return <div className="flex min-h-[80vh] items-center justify-center"><div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>;

  let bmiColor = "text-teal-500"; let bmiLabel = txt.weight;
  if (metrics.bmi < 18.5) { bmiColor = "text-blue-500"; bmiLabel = txt.under; }
  else if (metrics.bmi >= 25 && metrics.bmi < 30) { bmiColor = "text-orange-500"; bmiLabel = txt.over; }
  else if (metrics.bmi >= 30) { bmiColor = "text-red-600 font-bold"; bmiLabel = txt.obese; }

  const formatGoal = (goal: string, l: string) => {
    if (l === "EN") return { perte_poids: "Fat Loss", recomposition: "Body Recomp", performance: "Performance", prise_masse: "Muscle Building" }[goal] || goal;
    return { perte_poids: "Perte de masse grasse", recomposition: "Recomposition Corporelle", performance: "Performance & Force", prise_masse: "Prise de masse musculaire" }[goal] || goal;
  };

  const protInfo = lang === "FR" 
    ? "Rôle : Reconstruction musculaire et satiété.\n\nTiming idéal : Étaler en 3 à 4 repas réguliers (ex: 30g à 40g par repas). Une dose après l'entraînement optimise la synthèse protéique.\n\nCompléments utiles : Whey Isolate (absorption ultra-rapide post-workout) ou Caséine (lente, idéale le soir)." 
    : "Role: Muscle repair and satiety.\n\nIdeal Timing: Spread across 3-4 regular meals (e.g., 30-40g per meal). A serving post-workout optimizes protein synthesis.\n\nUseful Supplements: Whey Isolate (ultra-fast absorption post-workout) or Casein (slow release, ideal at night).";
  const carbInfo = lang === "FR"
    ? "Rôle : Carburant principal du système nerveux et musculaire (Glycogène).\n\nTiming idéal : Placer 60% à 70% de vos glucides cibles autour de la séance (Avant pour l'énergie, Après pour recharger les réserves).\n\nCompléments utiles : Maltodextrine ou Dextrine cyclique (pendant une séance très longue ou intense)."
    : "Role: Primary fuel for nervous and muscular systems (Glycogen).\n\nIdeal Timing: Place 60-70% of your daily carbs around your workout (Before for energy, After to replenish stores).\n\nUseful Supplements: Maltodextrin or Cyclic Dextrin (during very long or intense sessions).";
  const fatInfo = lang === "FR"
    ? "Rôle : Régulation hormonale (Testostérone) et santé articulaire.\n\nTiming idéal : Éviter les graisses juste avant ou juste après l'entraînement (elles ralentissent la digestion). À privilégier sur les repas éloignés de la séance.\n\nCompléments utiles : Oméga-3 (EPA/DHA) en gélules lors des repas pour lutter contre l'inflammation."
    : "Role: Hormonal regulation (Testosterone) and joint health.\n\nIdeal Timing: Avoid fats right before or right after training (they slow digestion). Best consumed in meals away from your session.\n\nUseful Supplements: Omega-3 (EPA/DHA) capsules with meals to fight inflammation.";

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
      
      {/* RACCOURCI : SÉANCE EN ATTENTE */}
      {todayWorkoutId && (
        <div onClick={() => router.push(`/workout/${todayWorkoutId}`)} className="cursor-pointer bg-gradient-to-r from-teal-500 to-teal-700 dark:from-teal-600 dark:to-teal-900 rounded-xl p-4 shadow-lg shadow-teal-500/20 flex items-center justify-between transition-transform hover:scale-[1.01] active:scale-95">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Play className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
              <p className="text-teal-100 text-xs font-bold uppercase tracking-wider">{txt.pendingWorkout}</p>
              <h3 className="text-white font-black text-lg">{DAYS[["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()] as keyof typeof DAYS]}</h3>
            </div>
          </div>
          <Button variant="secondary" className="bg-white text-teal-700 hover:bg-zinc-50 font-bold rounded-full">{txt.goWorkout}</Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{txt.title}, {profile.first_name}</h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">{txt.sub}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="shadow-sm border-zinc-300 dark:border-zinc-700"><Settings className="w-4 h-4 mr-2" /> {txt.param}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DropdownMenuLabel>{txt.account}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsEditModalOpen(true)} className="cursor-pointer font-medium dark:text-zinc-100"><Edit3 className="w-4 h-4 mr-2" /> {txt.edit}</DropdownMenuItem>
            <DropdownMenuItem onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="cursor-pointer font-medium text-orange-600"><LogOut className="w-4 h-4 mr-2" /> {txt.out}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsDeleteModalOpen(true)} className="cursor-pointer font-medium text-red-600"><Trash2 className="w-4 h-4 mr-2" /> {txt.del}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* CARTE OBJECTIF INTERACTIVE */}
        <Card className="shadow-md border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer hover:bg-zinc-800 dark:hover:bg-white transition-colors group relative overflow-hidden" onClick={() => setIsGoalModalOpen(true)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold opacity-80">{txt.goal}</CardTitle>
            <RefreshCw className="h-5 w-5 opacity-40 group-hover:opacity-100 transition-opacity" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black leading-tight mb-1 uppercase tracking-tight">{formatGoal(profile.current_goal, lang)}</div>
            <p className="text-xs opacity-80 font-medium">{txt.ideal} : {metrics.idealWeight} kg</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-300 flex items-center">
              {txt.cals}
              <InfoModal title={lang==="FR"?"Métabolisme":"Metabolism"} description={lang==="FR"?"Le TDEE est le nombre de calories que vous brûlez. Ajusté de +/- 300 kcal selon l'objectif.":"TDEE is the calories you burn daily. Adjusted by +/- 300 kcal based on goal."} btnText={txt.understood} />
            </CardTitle>
            <Flame className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50 transition-all">{metrics.targetCals} <span className="text-lg font-medium text-zinc-500">kcal</span></div>
            <p className="text-xs text-zinc-500 mt-1 font-medium">{txt.maint} : {metrics.tdee} kcal</p>
          </CardContent>
        </Card>
        
        {/* CARTE BIOMÉTRIE INTERACTIVE */}
        <Card className="shadow-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group" onClick={() => setIsBioModalOpen(true)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-300 flex items-center">
              {txt.bio}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Scale className={`h-5 w-5 ${bmiColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{profile.weight_kg} <span className="text-lg font-medium text-zinc-500">kg</span></div>
            <p className={`text-xs mt-1 font-bold ${bmiColor}`}>{txt.bmi} : {metrics.bmi} ({bmiLabel})</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-300 flex items-center">
              IMG & VO2Max
              <InfoModal title="IMG & VO2Max" description={lang==="FR"?"IMG : Estimation masse grasse. VO2 : Endurance.":"IMG: Body fat estimation. VO2: Endurance capacity."} btnText={txt.understood} />
            </CardTitle>
            <Activity className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">~{metrics.img}<span className="text-lg font-medium text-zinc-500">%</span></div>
            <p className="text-xs text-zinc-500 mt-1 font-medium">VO2: {metrics.vo2max} ml/kg/min</p>
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
            <CardDescription>{txt.macrosSub} {formatGoal(profile.current_goal, lang).toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="flex items-center text-blue-600 dark:text-blue-400">
                  {txt.prot} ({metrics.macros.proteinPct}%)
                  <InfoModal title="Protéines" description={protInfo} btnText={txt.understood} />
                </span>
                <span className="dark:text-zinc-100 transition-all">{metrics.macros.protein}g</span>
              </div>
              <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all" style={{ width: `${metrics.macros.proteinPct}%` }} /></div>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="p" className="border-none">
                  <AccordionTrigger className="text-xs text-zinc-500 dark:text-zinc-400 py-1 hover:no-underline">{txt.equiv}</AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <ul className="space-y-2 text-xs max-h-48 overflow-y-auto pr-2">
                      {NUTRITION_DATABASE.proteins.map((f, i) => (<li key={i} className="flex flex-col bg-zinc-50 dark:bg-zinc-950 p-2 rounded border dark:border-zinc-800"><span className="font-bold text-zinc-800 dark:text-zinc-200">{lang==="FR"?f.name:(f.name==="Poulet (Blanc)"?"Chicken Breast":f.name)}</span><span className="text-blue-600 font-medium">{f.density}</span></li>))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="flex items-center text-green-600 dark:text-green-400">
                  {txt.carb} ({metrics.macros.carbPct}%)
                  <InfoModal title="Glucides" description={carbInfo} btnText={txt.understood} />
                </span>
                <span className="dark:text-zinc-100 transition-all">{metrics.macros.carbs}g</span>
              </div>
              <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-green-500 transition-all" style={{ width: `${metrics.macros.carbPct}%` }} /></div>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="c" className="border-none">
                  <AccordionTrigger className="text-xs text-zinc-500 dark:text-zinc-400 py-1 hover:no-underline">{txt.equiv}</AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <ul className="space-y-2 text-xs max-h-48 overflow-y-auto pr-2">
                      {NUTRITION_DATABASE.carbs.map((f, i) => (<li key={i} className="flex flex-col bg-zinc-50 dark:bg-zinc-950 p-2 rounded border dark:border-zinc-800"><span className="font-bold text-zinc-800 dark:text-zinc-200">{f.name}</span><span className="text-green-600 font-medium">{f.density}</span></li>))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="flex items-center text-orange-500">
                  {txt.fat} ({metrics.macros.fatPct}%)
                  <InfoModal title="Lipides" description={fatInfo} btnText={txt.understood} />
                </span>
                <span className="dark:text-zinc-100 transition-all">{metrics.macros.fat}g</span>
              </div>
              <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-orange-500 transition-all" style={{ width: `${metrics.macros.fatPct}%` }} /></div>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="f" className="border-none">
                  <AccordionTrigger className="text-xs text-zinc-500 dark:text-zinc-400 py-1 hover:no-underline">{txt.equiv}</AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <ul className="space-y-2 text-xs max-h-48 overflow-y-auto pr-2">
                      {NUTRITION_DATABASE.fats.map((f, i) => (<li key={i} className="flex flex-col bg-zinc-50 dark:bg-zinc-950 p-2 rounded border dark:border-zinc-800"><span className="font-bold text-zinc-800 dark:text-zinc-200">{f.name}</span><span className="text-orange-500 font-medium">{f.density}</span></li>))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            
            <div className="pt-2 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{txt.water}</span>
              <span className="font-bold flex items-center dark:text-zinc-100"><Droplets className="h-4 w-4 mr-1 text-blue-400"/> {metrics.water} L</span>
            </div>
          </CardContent>
        </Card>

        {/* CARTE MICRONUTRIMENTS INTERACTIVE */}
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
              {metrics.micros.map((micro: any, index: number) => (
                <div 
                  key={index} 
                  onClick={() => setMicroModal({ show: true, micro: micro })}
                  className="flex flex-col space-y-1 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-100 dark:border-zinc-800 cursor-pointer hover:border-teal-500 dark:hover:border-teal-600 transition-colors group"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{micro.name}</span>
                    <span className="text-sm font-extrabold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded">{micro.amount}</span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">{lang==="EN" ? (micro.name.includes("Zinc") ? "Testosterone & Immunity" : "Sleep & Recovery") : micro.role}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MODALE DÉTAIL MICRONUTRIMENT */}
      <Dialog open={microModal.show} onOpenChange={(open) => !open && setMicroModal({ show: false, micro: null })}>
        <DialogContent className="sm:max-w-[450px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          {microModal.micro && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-teal-600 dark:text-teal-400">{microModal.micro.name}</DialogTitle>
                <DialogDescription className="font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  {lang === 'FR' ? "Objectif :" : "Target:"} {microModal.micro.amount}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 pt-2">
                {(() => {
                  const details = getMicroDetails(microModal.micro.name, lang);
                  return (
                    <>
                      <div className="flex items-start space-x-3">
                        <ShieldCheck className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                        <div><p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{lang==='FR'?"Bénéfices physiologiques":"Physiological benefits"}</p><p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{details.benefits}</p></div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Clock className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                        <div><p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{lang==='FR'?"Timing optimal":"Optimal timing"}</p><p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{details.timing}</p></div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Pill className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                        <div><p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{lang==='FR'?"Format de complément":"Supplement form"}</p><p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{details.form}</p></div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Apple className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                        <div><p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{lang==='FR'?"Sources naturelles":"Natural sources"}</p><p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{details.food}</p></div>
                      </div>
                    </>
                  );
                })()}
              </div>
              <DialogFooter className="mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                <Button className="w-full bg-teal-500 text-white hover:bg-teal-600" onClick={() => setMicroModal({ show: false, micro: null })}>{txt.understood}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODALES D'ÉDITION (OBJECTIF, BIO, GLOBALE) */}
      <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader><DialogTitle className="dark:text-zinc-100">{txt.changeGoal}</DialogTitle><DialogDescription className="pt-2">{txt.changeGoalMsg}</DialogDescription></DialogHeader>
          <div className="py-4">
            <Select value={editGoal} onValueChange={(val) => { setEditGoal(val); calculateAndSetMetrics(profile, val); }}>
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
            <Button variant="outline" onClick={() => { setIsGoalModalOpen(false); setEditGoal(profile.current_goal); calculateAndSetMetrics(profile, profile.current_goal); }} className="dark:border-zinc-700 dark:text-zinc-300">{txt.cancel}</Button>
            <Button onClick={handleUpdateProfile} disabled={actionLoading} className="bg-teal-500 hover:bg-teal-600 text-white">{actionLoading ? "..." : txt.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBioModalOpen} onOpenChange={setIsBioModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader><DialogTitle className="dark:text-zinc-100">{txt.updateBio}</DialogTitle><DialogDescription className="pt-2">{txt.bioMsg}</DialogDescription></DialogHeader>
          <div className="py-4 space-y-2">
            <Label className="dark:text-zinc-300">Poids (kg)</Label>
            <Input type="number" step="0.1" value={editWeight} onChange={(e) => { setEditWeight(e.target.value); calculateAndSetMetrics({ ...profile, weight_kg: parseFloat(e.target.value) || profile.weight_kg }, editGoal); }} className="text-xl font-bold dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 h-14" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsBioModalOpen(false); setEditWeight(profile.weight_kg.toString()); calculateAndSetMetrics(profile, editGoal); }} className="dark:border-zinc-700 dark:text-zinc-300">{txt.cancel}</Button>
            <Button onClick={handleUpdateProfile} disabled={actionLoading} className="bg-teal-500 hover:bg-teal-600 text-white">{actionLoading ? "..." : txt.save}</Button>
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
                  <Select value={editGoal} onValueChange={(val) => { setEditGoal(val); calculateAndSetMetrics(profile, val); }}>
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
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">{txt.cancel}</Button>
            <Button onClick={handleUpdateProfile} disabled={actionLoading} className="bg-teal-500 text-white hover:bg-teal-600">{actionLoading ? "..." : txt.save}</Button>
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
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="dark:border-zinc-800 dark:text-zinc-300">{txt.cancel}</Button>
            <Button variant="destructive" onClick={handleDeleteProfile} disabled={(deleteConfirmText !== "SUPPRIMER" && deleteConfirmText !== "DELETE") || actionLoading} className="dark:bg-red-600 dark:hover:bg-red-700">{txt.confirm}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
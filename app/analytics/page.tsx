"use client";

import { useEffect, useState, useRef } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ReferenceLine } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, TrendingDown, Dumbbell, Target, Ruler, Radar as RadarIcon, CalendarDays, Database, Brain, Download, ShieldAlert, HeartPulse, Info, Battery, Utensils, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";
import { calculateAge, calculateBMI, calculateEstimatedBodyFat, calculateBMR, calculateTDEE, calculateTargetCalories } from "@/lib/fitness";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const fetchAnalyticsData = async (lang: string, timeframe: string, customStart?: string, customEnd?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const userAge = profile ? calculateAge(profile.birth_date) : 25;
  const userGender = profile?.gender || 'homme';
  const userHeight = profile?.height_cm || 175;
  const userWeightKg = profile?.weight_kg || 70;
  const sleepQuality = profile?.sleep_quality || 'moyen';

  const bmr = calculateBMR(userWeightKg, userHeight, userAge, userGender, null);
  const tdee = calculateTDEE(bmr, profile?.activity_level || 'sedentaire');
  const targetCals = calculateTargetCalories(tdee, profile?.current_goal || 'maintien');

  let startDate = new Date();
  let endDate = new Date();

  // 🛡️ CORRECTION : SÉCURISATION DU FILTRE DE DATE iOS
  if (timeframe === '7d') startDate.setDate(startDate.getDate() - 7);
  else if (timeframe === '30d') startDate.setDate(startDate.getDate() - 30);
  else if (timeframe === '3m') startDate.setMonth(startDate.getMonth() - 3);
  else if (timeframe === '6m') startDate.setMonth(startDate.getMonth() - 6);
  else if (timeframe === '9m') startDate.setMonth(startDate.getMonth() - 9);
  else if (timeframe === '1y') startDate.setFullYear(startDate.getFullYear() - 1);
  else if (timeframe === 'custom' && customStart) {
    startDate = new Date(customStart + "T00:00:00");
    if (customEnd) {
      endDate = new Date(customEnd + "T23:59:59");
    }
  } else {
    startDate.setFullYear(startDate.getFullYear() - 5); 
  }

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  const [
    { data: measurements }, 
    { data: library }, 
    { data: sleepLogs },
    { data: nutritionLogs },
    { data: dashMetrics },
    { data: rawLogs } 
  ] = await Promise.all([
    supabase.from("measurements").select("*").eq("user_id", user.id).gte("created_at", startDate.toISOString()).order("created_at", { ascending: true }),
    supabase.from("exercise_library").select("id, name, target_muscle, movement_pattern, equipment_required"),
    supabase.from('daily_metrics').select('date, readiness_score').eq('user_id', user.id).gte('date', startDateStr).lte('date', endDateStr).order('date', { ascending: true }),
    supabase.from('daily_nutrition_logs').select('date, total_kcal').eq('user_id', user.id).gte('date', startDateStr).lte('date', endDateStr).order('date', { ascending: true }),
    supabase.rpc('get_dashboard_metrics', { p_user_id: user.id }),
    supabase.from('workout_logs').select('*').eq('user_id', user.id).gte('created_at', startDate.toISOString())
  ]);

  const safeFormatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString.split('T')[0];
      return d.toLocaleDateString(lang === 'FR' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short' });
    } catch {
      return dateString.split('T')[0];
    }
  };

  const libMap: Record<string, any> = {};
  if (library) library.forEach((ex: any) => libMap[ex.id] = ex);

  const volByDate: Record<string, number> = {};
  const exData: Record<string, any[]> = {};
  const exSet = new Set<string>();
  const best1RMs: Record<string, number> = { "Squat": 0, "Bench": 0, "Deadlift": 0 };
  
  // 🛡️ NOUVELLE LOGIQUE : Comptage en SÉRIES EFFECTIVES (et non en Tonnage)
  const muscleDistribution: Record<string, number> = { Chest: 0, Back: 0, Legs: 0, Arms: 0, Shoulders: 0, Core: 0 };

  rawLogs?.forEach((log: any) => {
    const d = safeFormatDate(log.created_at);
    const exObj = libMap[log.exercise_id];
    
    let effectiveWeight = log.weight;
    
    // Tonnage Global (Poids estimé pour le BW)
    if (log.weight === 0 || !log.weight) {
      if (exObj && (exObj.movement_pattern.includes("Push") || exObj.movement_pattern.includes("Pull") || exObj.movement_pattern.includes("Squat") || exObj.movement_pattern.includes("Hinge"))) {
          effectiveWeight = userWeightKg * 0.65; 
      } else {
          effectiveWeight = userWeightKg * 0.20; 
      }
    }

    // Le tonnage global reste sur la formule classique
    const tonnage = effectiveWeight * log.reps;
    volByDate[d] = (volByDate[d] || 0) + tonnage;

    // 🛡️ NOUVEAU FILTRE CLINIQUE 1RM (Epley bridé)
    const isStrengthExercise = exObj && !exObj.equipment_required.includes('poids_corps') && !exObj.movement_pattern.includes('Core');
    
    if (isStrengthExercise && log.weight > 0 && log.reps <= 15) {
      const e1rm = log.weight * (1 + log.reps / 30);
      
      if (!exData[log.exercise_id]) exData[log.exercise_id] = [];
      exData[log.exercise_id].push({ date: d, e1RM: Number(e1rm).toFixed(1), weight: log.weight, reps: log.reps });
      exSet.add(log.exercise_id);

      const nameLower = exObj.name.toLowerCase();
      if (nameLower.includes("squat barre")) best1RMs["Squat"] = Math.max(best1RMs["Squat"], e1rm);
      else if (nameLower.includes("couché barre") || nameLower.includes("bench press")) best1RMs["Bench"] = Math.max(best1RMs["Bench"], e1rm);
      else if (nameLower.includes("terre classique") || nameLower.includes("deadlift")) best1RMs["Deadlift"] = Math.max(best1RMs["Deadlift"], e1rm);
    }

    // 🛡️ NOUVEAU RADAR : Comptage +1 par Série (Log)
    if (exObj && exObj.target_muscle) {
      const target = exObj.target_muscle.toLowerCase();
      
      if (target.includes("quadriceps") || target.includes("ischio") || target.includes("mollet") || target.includes("fessier") || target.includes("jambe") || target.includes("glute") || target.includes("leg")) muscleDistribution.Legs += 1;
      if (target.includes("pec") || target.includes("poitrine") || target.includes("chest")) muscleDistribution.Chest += 1;
      if (target.includes("dos") || target.includes("dorsal") || target.includes("rhomboïde") || target.includes("trapèze") || target.includes("lombaire") || target.includes("lats") || target.includes("row") || target.includes("back")) muscleDistribution.Back += 1;
      if (target.includes("épaule") || target.includes("epaule") || target.includes("delto") || target.includes("shoulder")) muscleDistribution.Shoulders += 1;
      if (target.includes("biceps") || target.includes("triceps") || target.includes("bras") || target.includes("arm")) muscleDistribution.Arms += 1;
      if (target.includes("abdo") || target.includes("core") || target.includes("gainage") || target.includes("transverse") || target.includes("oblique") || target.includes("sangle")) muscleDistribution.Core += 1;
    }
  });

  const availableList = Array.from(exSet).map(id => ({ id, name: libMap[id]?.name || "Exercice" })).sort((a, b) => a.name.localeCompare(b.name));
  const formattedVolume = Object.keys(volByDate).map(date => ({ date, volume: Math.round(volByDate[date]) }));

  let formattedWeight: any[] = [];
  let formattedMeasurements: any[] = [];

  if (measurements) {
    formattedWeight = measurements.map((m: any) => {
      const bmi = calculateBMI(m.weight_kg, userHeight);
      const img = calculateEstimatedBodyFat(bmi, userAge, userGender);
      return { date: safeFormatDate(m.created_at), poids: m.weight_kg, img: m.body_fat_percentage ? Number(m.body_fat_percentage) : Number(img) };
    });
    formattedMeasurements = measurements.map((m: any) => ({
      date: safeFormatDate(m.created_at), arms: m.arms_cm ? Number(m.arms_cm) : null, chest: m.chest_cm ? Number(m.chest_cm) : null, waist: m.waist_cm ? Number(m.waist_cm) : null, thighs: m.thighs_cm ? Number(m.thighs_cm) : null
    })).filter((m: any) => m.arms || m.chest || m.waist || m.thighs);
  }

  const readinessHistory = (sleepLogs || []).map((log: any) => ({ date: safeFormatDate(log.date), score: Number(log.readiness_score) || 0 })).filter((log: any) => log.score > 0);
  const formattedNutrition = (nutritionLogs || []).map((log: any) => ({ date: safeFormatDate(log.date), kcal: Number(log.total_kcal) || 0, target: targetCals }));

  const radarData = [
    { subject: lang === 'FR' ? 'Pecs' : 'Chest', A: muscleDistribution.Chest, fullMark: 100 },
    { subject: lang === 'FR' ? 'Dos' : 'Back', A: muscleDistribution.Back, fullMark: 100 },
    { subject: lang === 'FR' ? 'Épaules' : 'Shoulders', A: muscleDistribution.Shoulders, fullMark: 100 },
    { subject: lang === 'FR' ? 'Bras' : 'Arms', A: muscleDistribution.Arms, fullMark: 100 },
    { subject: lang === 'FR' ? 'Jambes' : 'Legs', A: muscleDistribution.Legs, fullMark: 100 },
    { subject: 'Core', A: muscleDistribution.Core, fullMark: 100 },
  ];

  return { 
    profile, userAge, userHeight, userGender,
    formattedWeight, formattedMeasurements, formattedNutrition, formattedVolume, 
    exercisesData: exData, max1RMs: { "Squat": Number(best1RMs["Squat"].toFixed(1)), "Bench": Number(best1RMs["Bench"].toFixed(1)), "Deadlift": Number(best1RMs["Deadlift"].toFixed(1)) }, 
    exerciseList: availableList, radarData, sleepQuality, acwrScore: dashMetrics?.acwr || 0, readinessHistory, targetCals
  };
};

export default function AnalyticsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [timeframe, setTimeframe] = useState<string>("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  
  const [infoModal, setInfoModal] = useState<{show: boolean, title: string, desc: string} | null>(null);

  const { data, error, isLoading } = useSWR(
    ['analyticsData', lang, timeframe, customStart, customEnd], 
    () => fetchAnalyticsData(lang, timeframe, customStart, customEnd)
  );
  
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  
  const [hiddenMeas, setHiddenMeas] = useState<Record<string, boolean>>({
    arms: false, chest: false, waist: false, thighs: false
  });
  const [hiddenRecomp, setHiddenRecomp] = useState<Record<string, boolean>>({
    poids: false, img: false
  });

  useEffect(() => {
    if (data?.exerciseList && data.exerciseList.length > 0 && !selectedExercise) setSelectedExercise(data.exerciseList[0].id);
  }, [data, selectedExercise]);

  useEffect(() => {
    if (error) router.push("/login");
  }, [error, router]);

  const t = {
    FR: { title: "Performances & Évolution", sub: "Visualisez votre progression biométrique et analytique.", weightTitle: "Recomposition Corporelle", weightSub: "Poids réel vs Estimation Masse Grasse", volTitle: "Tonnage Global", volSub: "Charge totale par séance", empty: "Pas assez de données pour cette période.", selectEx: "Sélectionner un exercice", progEx: "Progression Force (1RM)", bench: "Couché", squat: "Squat", deadlift: "Soulevé", measTitle: "Mensurations", measSub: "Évolution en cm", radarTitle: "Répartition Musculaire", radarSub: "Nombre de séries par groupe", weight: "Poids", img: "Masse Grasse", tf7: "7 Derniers Jours", tf30: "1 Mois", tf3m: "3 Mois", tf6m: "6 Mois", tf9m: "9 Mois", tf1y: "1 An", tfall: "Historique Complet", tfcustom: "Personnalisé", aiTitle: "Insight Métabolique", export: "Rapport PDF", startDate: "Date de début", endDate: "Date de fin", acwr: "Charge (ACWR)", acwrSub: "Ratio de fatigue (7j / 28j)", sweetSpot: "Zone Optimale", dangerZone: "Risque Blessure", underZone: "Désentraînement", readinessTrend: "Tendance SNC (Sommeil & Fatigue)", readinessTrendSub: "Évolution de votre capacité de récupération.", nutTrend: "Adhérence Calorique", nutTrendSub: "Calories consommées vs Cible TDEE", disclaimer: "CLAUSE DE NON-RESPONSABILITÉ MÉDICALE : Les données et analyses générées par cette application sont fournies à titre strictement informatif. Elles ne constituent en aucun cas un diagnostic médical. Consultez toujours un médecin avant de modifier votre régime ou programme." },
    EN: { title: "Performance & Evolution", sub: "Visualize your biometric and analytical progress.", weightTitle: "Body Recomposition", weightSub: "Actual Weight vs Est. Body Fat", volTitle: "Global Tonnage", volSub: "Total load per session", empty: "Not enough data for this period.", selectEx: "Select an exercise", progEx: "Strength Progression (1RM)", bench: "Bench", squat: "Squat", deadlift: "Deadlift", measTitle: "Measurements", measSub: "Evolution in cm", radarTitle: "Muscle Heatmap", radarSub: "Number of sets by group", weight: "Weight", img: "Body Fat", tf7: "Last 7 Days", tf30: "1 Month", tf3m: "3 Months", tf6m: "6 Months", tf9m: "9 Months", tf1y: "1 Year", tfall: "All Time", tfcustom: "Custom Range", aiTitle: "Metabolic Insight", export: "PDF Report", startDate: "Start Date", endDate: "End Date", acwr: "Workload (ACWR)", acwrSub: "Fatigue ratio (7d / 28d)", sweetSpot: "Sweet Spot", dangerZone: "Injury Risk", underZone: "Undertraining", readinessTrend: "CNS Trend (Sleep & Fatigue)", readinessTrendSub: "Evolution of your recovery capacity.", nutTrend: "Caloric Adherence", nutTrendSub: "Consumed Calories vs TDEE Target", disclaimer: "MEDICAL DISCLAIMER: The data and analysis generated by this application are provided strictly for informational purposes. They do not constitute medical diagnosis. Always consult a physician before modifying your diet or training program." }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

  const getInfoData = (type: string) => {
    switch (type) {
      case 'acwr': return { show: true, title: lang === 'FR' ? "Comprendre l'ACWR" : "Understanding ACWR", desc: lang === 'FR' ? "L'ACWR compare la fatigue immédiate (7 derniers jours) à la fatigue chronique (28 derniers jours).\n\n• < 0.8 (Désentraînement)\n• 0.8 à 1.3 (Sweet Spot)\n• > 1.5 (Zone de Danger)" : "ACWR compares acute fatigue to chronic fatigue.\n\n• < 0.8 (Undertraining)\n• 0.8 to 1.3 (Sweet Spot)\n• > 1.5 (Danger Zone)" };
      case '1rm': return { show: true, title: lang === 'FR' ? "Progression Force" : "Strength Progression", desc: lang === 'FR' ? "Le 1RM affiché est une estimation via la formule d'Epley. Les séries de plus de 15 reps ne sont pas affichées pour garantir la précision." : "1RM is estimated via Epley's formula. Sets above 15 reps are excluded for accuracy." };
      case 'tonnage': return { show: true, title: lang === 'FR' ? "Tonnage Global" : "Global Tonnage", desc: lang === 'FR' ? "Le Tonnage (Poids × Séries × Reps). La ligne en pointillé est votre moyenne." : "Tonnage is Weight × Sets × Reps. Dotted line is your average." };
      case 'radar': return { show: true, title: lang === 'FR' ? "Répartition Musculaire" : "Muscle Distribution", desc: lang === 'FR' ? "Calculé en fonction du nombre total de SÉRIES effectuées par groupe musculaire. C'est l'indicateur d'hypertrophie le plus précis." : "Calculated based on total SETS performed per muscle group. The most accurate hypertrophy indicator." };
      case 'readiness': return { show: true, title: lang === 'FR' ? "Tendance SNC" : "CNS Trend", desc: lang === 'FR' ? "L'évolution de votre Readiness Score." : "Evolution of your Readiness Score." };
      case 'nutrition': return { show: true, title: lang === 'FR' ? "Adhérence Calorique" : "Caloric Adherence", desc: lang === 'FR' ? "Calories consommées vs Cible TDEE." : "Consumed Calories vs TDEE Target." };
      default: return { show: false, title: "", desc: "" };
    }
  };

  const handleLegendClick = (e: any) => {
    const dataKey = e.dataKey as string;
    setHiddenMeas(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  };
  const renderLegendText = (value: string, entry: any) => {
    const isHidden = hiddenMeas[entry.dataKey];
    return <span style={{ color: isHidden ? '#71717a' : entry.color, textDecoration: isHidden ? 'line-through' : 'none', transition: 'all 0.3s', fontWeight: 'bold' }}>{value}</span>;
  };

  const handleRecompLegendClick = (e: any) => {
    const dataKey = e.dataKey as string;
    setHiddenRecomp(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  };
  const renderRecompLegendText = (value: string, entry: any) => {
    const isHidden = hiddenRecomp[entry.dataKey];
    return <span style={{ color: isHidden ? '#71717a' : entry.color, textDecoration: isHidden ? 'line-through' : 'none', transition: 'all 0.3s', fontWeight: 'bold' }}>{value}</span>;
  };

  const generateAIInsight = () => {
    if (!data || data.radarData.every(d => d.A === 0)) return lang === 'FR' ? "L'algorithme requiert plus de données pour générer un profil biomécanique sur cette période." : "Algorithm requires more data to generate a biomechanical profile for this period.";
    const muscles = [...data.radarData].sort((a, b) => b.A - a.A);
    const totalVolume = muscles.reduce((acc, curr) => acc + curr.A, 0); // 🛡️ C'est maintenant le nb de séries !
    const strongest = muscles[0];
    const weakest = muscles[muscles.length - 1];
    const legData = muscles.find(m => m.subject === 'Jambes' || m.subject === 'Legs');
    
    let insight = "";
    if (legData && (legData.A / totalVolume) < 0.1) {
      insight = lang === 'FR' ? `⚠️ Alerte structurelle : Vos membres inférieurs représentent moins de 10% de votre volume (Séries). Risque d'asymétrie sévère. ` : `⚠️ Structural alert: Lower body represents less than 10% of total volume. Severe asymmetry risk. `;
    } else if ((strongest.A / totalVolume) > 0.45) {
      insight = lang === 'FR' ? `⚡ Surcharge locale : [${strongest.subject}] encaisse une majorité critique du travail (>45% des séries). Attention à l'usure articulaire. ` : `⚡ Local overload: [${strongest.subject}] absorbs >45% of sets. Watch for joint wear. `;
    } else if (strongest.A < weakest.A * 2.5 && weakest.A > 0) {
      insight = lang === 'FR' ? `✅ Excellente symétrie. La répartition des séries sur cette période est biomécaniquement saine. ` : `✅ Excellent symmetry. Set distribution in this period is biomechanically sound. `;
    } else {
      insight = lang === 'FR' ? `Dominance de travail sur [${strongest.subject}], tandis que [${weakest.subject}] est en retard d'activation. ` : `Set dominance on [${strongest.subject}], [${weakest.subject}] shows activation lag. `;
    }
    if (data.sleepQuality === 'mauvais') {
      insight += lang === 'FR' ? `Votre sommeil critique bride la surcompensation.` : `Critical sleep restricts supercompensation.`;
    } else if (data.sleepQuality === 'excellent') {
      insight += lang === 'FR' ? `Sommeil optimal. Le Système Nerveux Central est prêt pour un PR.` : `Optimal sleep. CNS is primed for a PR.`;
    } else {
      insight += lang === 'FR' ? `Récupération stable. Poursuivez la surcharge progressive.` : `Recovery stable. Continue progressive overload.`;
    }
    return insight;
  };

  // 🛡️ NOUVEAU GÉNÉRATEUR PDF NATIF (Adieu le bug iOS)
  const handlePrintPDF = async () => {
    if (!reportRef.current || !data?.profile) return;
    setIsExporting(true);
    
    // Astuce : On force temporairement le mode clair pour le "flash" de la capture (Garantit un PDF parfait)
    const originalTheme = document.documentElement.className;
    document.documentElement.className = 'light';
    
    try {
      // Pause de 100ms pour laisser Tailwind appliquer le fond blanc
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      const safeFirstName = (data.profile.first_name || 'Utilisateur').replace(/[^a-zA-Z0-9]/g, '_');
      const safeLastName = (data.profile.last_name || 'Vivex').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`${safeLastName}_${safeFirstName}_Rapport.pdf`);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la génération du PDF.");
    } finally {
      document.documentElement.className = originalTheme;
      setIsExporting(false);
    }
  };

  const EmptyState = () => (
    <div className="h-[300px] flex flex-col items-center justify-center text-zinc-500 font-bold opacity-60">
      <Database className="w-10 h-10 mb-2 opacity-50" />
      <span>{txt.empty}</span>
    </div>
  );

  if (isLoading || !data) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full pb-24 animate-pulse">
        <div className="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0">
          <div className="space-y-3"><div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div><div className="h-4 w-96 bg-zinc-100 dark:bg-zinc-900 rounded"></div></div>
          <div className="h-12 w-full md:w-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
        </div>
        <div className="h-24 w-full bg-indigo-500/10 rounded-2xl border border-indigo-500/20"></div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <div className="h-24 bg-zinc-100 dark:bg-zinc-900 rounded-2xl"></div>
          <div className="h-24 bg-zinc-100 dark:bg-zinc-900 rounded-2xl"></div>
          <div className="h-24 bg-zinc-100 dark:bg-zinc-900 rounded-2xl"></div>
          <div className="h-24 bg-zinc-100 dark:bg-zinc-900 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const avgVolume = data.formattedVolume.length > 0 
    ? Math.round(data.formattedVolume.reduce((acc, curr) => acc + curr.volume, 0) / data.formattedVolume.length)
    : 0;
  
  const currentWeight = data.formattedWeight.length > 0 ? data.formattedWeight[data.formattedWeight.length - 1].poids : '-';

  let acwrColor = "text-teal-500"; let acwrLabel = txt.sweetSpot;
  if (data.acwrScore < 0.8) { acwrColor = "text-blue-500"; acwrLabel = txt.underZone; }
  else if (data.acwrScore > 1.5) { acwrColor = "text-red-500"; acwrLabel = txt.dangerZone; }
  else if (data.acwrScore === 0) { acwrColor = "text-zinc-500"; acwrLabel = "-"; }

  return (
    <>
      {/* Container Principal Ref pour HTML2CANVAS */}
      <div ref={reportRef} className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full relative pb-24 bg-zinc-50 dark:bg-zinc-950">
        
        {/* Entête d'Export visible uniquement pendant l'exportation JS */}
        {isExporting && (
          <div className="mb-8 border-b-2 border-black pb-6">
            <div className="flex justify-between items-end mb-6">
              <div className="flex items-center space-x-4">
                <img src="/Logo_GSC_NoBG.png" alt="Vivex Logo" className="h-10 w-auto grayscale" />
                <h1 className="text-2xl font-black uppercase tracking-tight text-black">Rapport Analytique Santé & Sport</h1>
              </div>
              <div className="text-right text-sm font-bold text-black">{new Date().toLocaleDateString(lang === 'FR' ? 'fr-FR' : 'en-US')}</div>
            </div>
            <div className="grid grid-cols-3 gap-6 p-4 rounded-xl border-2 border-black text-sm">
              <div><span className="uppercase text-[10px] font-black tracking-widest text-black block mb-1">Patient / Athlète</span><span className="font-black text-xl text-black">{data.profile?.first_name || '-'} {data.profile?.last_name || '-'}</span></div>
              <div><span className="uppercase text-[10px] font-black tracking-widest text-black block mb-1">Sexe & Âge</span><span className="font-bold text-lg text-black">{data.userGender.toUpperCase()} • {data.userAge} ans</span></div>
              <div><span className="uppercase text-[10px] font-black tracking-widest text-black block mb-1">Biométrie Actuelle</span><span className="font-bold text-lg text-black">{data.userHeight} cm • {currentWeight} kg</span></div>
            </div>
          </div>
        )}

        <div className={`flex flex-col xl:flex-row xl:items-center justify-between space-y-4 xl:space-y-0 ${isExporting ? 'hidden' : ''}`}>
          <div className="flex flex-col space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
              <Activity className="w-8 h-8 mr-3 text-teal-500" /> {txt.title}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">{txt.sub}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
              {timeframe === 'custom' && (
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl shadow-inner border border-zinc-200 dark:border-zinc-700 animate-in fade-in slide-in-from-right-4">
                  <div className="flex items-center px-2 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
                    <span className="text-[9px] font-black text-zinc-400 mr-2 uppercase tracking-widest hidden sm:inline">{txt.startDate}</span>
                    <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-10 bg-transparent border-none text-xs font-bold focus:ring-0 cursor-pointer dark:text-white [color-scheme:dark]" />
                  </div>
                  <span className="text-zinc-400 font-black px-2 text-xs">➔</span>
                  <div className="flex items-center px-2 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
                    <span className="text-[9px] font-black text-zinc-400 mr-2 uppercase tracking-widest hidden sm:inline">{txt.endDate}</span>
                    <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-10 bg-transparent border-none text-xs font-bold focus:ring-0 cursor-pointer dark:text-white [color-scheme:dark]" />
                  </div>
                </div>
              )}
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-full sm:w-48 bg-white dark:bg-zinc-900 dark:border-zinc-800 font-bold dark:text-zinc-100 shadow-sm h-12 rounded-xl">
                  <CalendarDays className="w-4 h-4 mr-2 text-teal-500" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800 font-bold">
                  <SelectItem value="7d">{txt.tf7}</SelectItem>
                  <SelectItem value="30d">{txt.tf30}</SelectItem>
                  <SelectItem value="3m">{txt.tf3m}</SelectItem>
                  <SelectItem value="6m">{txt.tf6m}</SelectItem>
                  <SelectItem value="9m">{txt.tf9m}</SelectItem>
                  <SelectItem value="1y">{txt.tf1y}</SelectItem>
                  <SelectItem value="all">{txt.tfall}</SelectItem>
                  <SelectItem value="custom" className="text-teal-500">{txt.tfcustom}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handlePrintPDF} disabled={isExporting} variant="outline" className="h-12 w-full sm:w-auto border-teal-500 text-teal-600 dark:text-teal-400 hover:bg-teal-500 hover:text-white font-bold transition-all shadow-sm rounded-xl">
              {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />} 
              {isExporting ? "Création..." : txt.export}
            </Button>
          </div>
        </div>

        <Card className="border-indigo-500/30 bg-gradient-to-r from-indigo-500/5 to-transparent dark:bg-zinc-900 shadow-lg shadow-indigo-500/5">
          <CardHeader className="pb-2 pt-5 flex flex-row items-center space-x-2 space-y-0">
            <div className={`bg-indigo-500/20 p-2 rounded-lg ${isExporting ? 'hidden' : ''}`}><Brain className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /></div>
            <CardTitle className={`text-sm font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest ${isExporting ? 'text-black' : ''}`}>{txt.aiTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-sm font-bold text-zinc-700 dark:text-zinc-300 leading-relaxed border-l-2 border-indigo-500 pl-4 mt-2 ${isExporting ? 'border-black text-black' : ''}`}>
              {generateAIInsight()}
            </p>
          </CardContent>
        </Card>

        {/* MÉTRIQUES CLÉS (1RMs + ACWR) */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 relative">
            <button onClick={() => setInfoModal(getInfoData('acwr'))} className={`absolute top-3 right-3 p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors ${isExporting ? 'hidden' : ''}`}>
              <Info className="w-4 h-4" />
            </button>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex justify-between items-center text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">
                <span>{txt.acwr}</span> <HeartPulse className={`ml-2 w-4 h-4 ${acwrColor} ${isExporting ? 'hidden' : ''}`} />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className={`text-xl sm:text-3xl font-black ${acwrColor} ${isExporting ? 'text-black' : ''}`}>{data.acwrScore || 0}</div>
              <p className="text-[10px] sm:text-xs font-bold text-zinc-400 mt-1 uppercase tracking-widest">{acwrLabel}</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 relative">
            <button onClick={() => setInfoModal(getInfoData('1rm'))} className={`absolute top-3 right-3 p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors ${isExporting ? 'hidden' : ''}`}><Info className="w-4 h-4" /></button>
            <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">{txt.squat} 1RM</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className={`text-xl sm:text-3xl font-black text-teal-600 dark:text-teal-400 ${isExporting ? 'text-black' : ''}`}>{data.max1RMs["Squat"] || 0} <span className="text-xs sm:text-sm text-zinc-400 font-bold">kg</span></div></CardContent>
          </Card>
          
          <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 relative">
            <button onClick={() => setInfoModal(getInfoData('1rm'))} className={`absolute top-3 right-3 p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors ${isExporting ? 'hidden' : ''}`}><Info className="w-4 h-4" /></button>
            <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">{txt.bench} 1RM</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className={`text-xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 ${isExporting ? 'text-black' : ''}`}>{data.max1RMs["Bench"] || 0} <span className="text-xs sm:text-sm text-zinc-400 font-bold">kg</span></div></CardContent>
          </Card>
          
          <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 relative">
            <button onClick={() => setInfoModal(getInfoData('1rm'))} className={`absolute top-3 right-3 p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors ${isExporting ? 'hidden' : ''}`}><Info className="w-4 h-4" /></button>
            <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">{txt.deadlift} 1RM</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className={`text-xl sm:text-3xl font-black text-orange-600 dark:text-orange-400 ${isExporting ? 'text-black' : ''}`}>{data.max1RMs["Deadlift"] || 0} <span className="text-xs sm:text-sm text-zinc-400 font-bold">kg</span></div></CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* GRAPHIQUE 1 : RECOMPOSITION */}
          <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 relative">
            <CardHeader><CardTitle className={`flex items-center text-lg font-black text-zinc-900 dark:text-zinc-100 ${isExporting ? 'text-black' : ''}`}><TrendingDown className={`h-5 w-5 text-blue-500 mr-2 ${isExporting ? 'hidden' : ''}`} /> {txt.weightTitle}</CardTitle><CardDescription className="font-medium text-zinc-500">{txt.weightSub}</CardDescription></CardHeader>
            <CardContent>
              {data.formattedWeight.length < 2 ? <EmptyState /> : (
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.formattedWeight}>
                      <defs>
                        <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#52525b" opacity={0.15} vertical={false} />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" hide={hiddenRecomp.poids} domain={['dataMin - 2', 'dataMax + 2']} stroke="#71717a" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} orientation="left" />
                      <YAxis yAxisId="right" hide={hiddenRecomp.img} domain={['auto', 'auto']} stroke="#71717a" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} orientation="right" />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid #3f3f46', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }} />
                      <Legend onClick={handleRecompLegendClick} formatter={renderRecompLegendText} wrapperStyle={{ cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                      <Area isAnimationActive={false} connectNulls={true} hide={hiddenRecomp.poids} yAxisId="left" type="monotone" name={`${txt.weight} (kg)`} dataKey="poids" stroke="#3b82f6" strokeWidth={4} fill="url(#colorWeight)" activeDot={{ r: 6 } as any} />
                      <Line isAnimationActive={false} connectNulls={true} hide={hiddenRecomp.img} yAxisId="right" type="monotone" name={`${txt.img} (%)`} dataKey="img" stroke="#10b981" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 3, fill: '#10b981' } as any} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* GRAPHIQUE 2 : RADAR */}
          <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden relative">
            <button onClick={() => setInfoModal(getInfoData('radar'))} className={`absolute top-4 right-4 z-20 p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors ${isExporting ? 'hidden' : ''}`}><Info className="w-4 h-4" /></button>
            <div className={`absolute top-0 right-0 p-6 opacity-5 pointer-events-none ${isExporting ? 'hidden' : ''}`}><RadarIcon className="w-48 h-48 text-indigo-500" /></div>
            <CardHeader className="relative z-10"><CardTitle className={`flex items-center text-lg font-black text-zinc-900 dark:text-zinc-100 ${isExporting ? 'text-black' : ''}`}><RadarIcon className={`h-5 w-5 text-indigo-500 mr-2 ${isExporting ? 'hidden' : ''}`} /> {txt.radarTitle}</CardTitle><CardDescription className="font-medium text-zinc-500">{txt.radarSub}</CardDescription></CardHeader>
            <CardContent className="relative z-10">
              {data.radarData.every(d => d.A === 0) ? <EmptyState /> : (
                <div className="h-[300px] w-full mt-4 flex justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data.radarData}>
                      <PolarGrid stroke="#52525b" opacity={0.3} />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 'bold' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.95)', border: '1px solid #6366f1', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }} itemStyle={{ color: '#818cf8' }} />
                      <Radar isAnimationActive={false} name="Séries Effectives" dataKey="A" stroke="#6366f1" strokeWidth={3} fill="#6366f1" fillOpacity={0.4} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* GRAPHIQUE 3 : NUTRITION (ADHERENCE CALORIQUE) */}
          <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 relative">
            <button onClick={() => setInfoModal(getInfoData('nutrition'))} className={`absolute top-4 right-4 z-20 p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors ${isExporting ? 'hidden' : ''}`}><Info className="w-4 h-4" /></button>
            <CardHeader><CardTitle className={`flex items-center text-lg font-black text-zinc-900 dark:text-zinc-100 ${isExporting ? 'text-black' : ''}`}><Utensils className={`h-5 w-5 text-orange-500 mr-2 ${isExporting ? 'hidden' : ''}`} /> {txt.nutTrend}</CardTitle><CardDescription className="font-medium text-zinc-500">{txt.nutTrendSub}</CardDescription></CardHeader>
            <CardContent>
              {data.formattedNutrition.length === 0 ? <EmptyState /> : (
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.formattedNutrition}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#52525b" opacity={0.15} vertical={false} />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                      <YAxis stroke="#71717a" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.95)', border: '1px solid #f97316', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }} cursor={{ fill: '#27272a', opacity: 0.5 }} />
                      <ReferenceLine y={data.targetCals} stroke="#ea580c" strokeDasharray="5 5" label={{ position: 'top', value: `Cible (${data.targetCals} kcal)`, fill: '#ea580c', fontSize: 10, fontWeight: 'bold' }} />
                      <Bar isAnimationActive={false} dataKey="kcal" name="Kcal Consommées" fill="url(#colorOrange)" radius={[6, 6, 0, 0]} />
                      <defs>
                        <linearGradient id="colorOrange" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.9}/>
                          <stop offset="95%" stopColor="#ea580c" stopOpacity={0.7}/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 relative">
            <button onClick={() => setInfoModal(getInfoData('readiness'))} className={`absolute top-4 right-4 z-20 p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors ${isExporting ? 'hidden' : ''}`}><Info className="w-4 h-4" /></button>
            <CardHeader>
              <CardTitle className={`flex items-center text-lg font-black text-zinc-900 dark:text-zinc-100 ${isExporting ? 'text-black' : ''}`}>
                <Battery className={`h-5 w-5 text-green-500 mr-2 ${isExporting ? 'hidden' : ''}`} /> {txt.readinessTrend}
              </CardTitle>
              <CardDescription className="font-medium text-zinc-500">{txt.readinessTrendSub}</CardDescription>
            </CardHeader>
            <CardContent>
              {data.readinessHistory.length === 0 ? <EmptyState /> : (
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.readinessHistory}>
                      <defs>
                        <linearGradient id="colorReadiness" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#52525b" opacity={0.15} vertical={false} />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} stroke="#71717a" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.95)', border: '1px solid #10b981', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }} />
                      <Area isAnimationActive={false} connectNulls={true} type="monotone" dataKey="score" name="SNC Score" stroke="#10b981" strokeWidth={4} fill="url(#colorReadiness)" activeDot={{ r: 6 } as any} />
                      <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideBottomLeft', value: 'Risque', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                      <ReferenceLine y={85} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Zone PR', fill: '#10b981', fontSize: 10, fontWeight: 'bold' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* GRAPHIQUE 5 : BAR CHART TONNAGE */}
          <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 relative">
            <button onClick={() => setInfoModal(getInfoData('tonnage'))} className={`absolute top-4 right-4 z-20 p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors ${isExporting ? 'hidden' : ''}`}><Info className="w-4 h-4" /></button>
            <CardHeader><CardTitle className={`flex items-center text-lg font-black text-zinc-900 dark:text-zinc-100 ${isExporting ? 'text-black' : ''}`}><Dumbbell className={`h-5 w-5 text-teal-500 mr-2 ${isExporting ? 'hidden' : ''}`} /> {txt.volTitle}</CardTitle><CardDescription className="font-medium text-zinc-500">{txt.volSub}</CardDescription></CardHeader>
            <CardContent>
              {data.formattedVolume.length === 0 ? <EmptyState /> : (
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.formattedVolume}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#52525b" opacity={0.15} vertical={false} />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                      <YAxis stroke="#71717a" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.95)', border: '1px solid #14b8a6', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }} itemStyle={{ color: '#2dd4bf' }} cursor={{ fill: '#27272a', opacity: 0.5 }} />
                      <ReferenceLine y={avgVolume} stroke="#0f766e" strokeDasharray="5 5" label={{ position: 'top', value: `Moyenne (${avgVolume})`, fill: '#0f766e', fontSize: 10, fontWeight: 'bold' }} />
                      <Bar isAnimationActive={false} dataKey="volume" name="Tonnage (kg)" fill="url(#colorTeal)" radius={[6, 6, 0, 0]} />
                      <defs>
                        <linearGradient id="colorTeal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.9}/>
                          <stop offset="95%" stopColor="#0f766e" stopOpacity={0.7}/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* GRAPHIQUE 6 : 1RM */}
          <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 relative">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
              <CardTitle className={`flex items-center text-lg font-black text-zinc-900 dark:text-zinc-100 ${isExporting ? 'text-black' : ''}`}><Target className={`h-5 w-5 text-indigo-500 mr-2 ${isExporting ? 'hidden' : ''}`} /> {txt.progEx}</CardTitle>
              <div className={`w-full sm:w-64 ${isExporting ? 'hidden' : ''}`}>
                <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                  <SelectTrigger className="bg-white dark:bg-zinc-950 font-bold dark:border-zinc-800 dark:text-zinc-100"><SelectValue placeholder={txt.selectEx} /></SelectTrigger>
                  <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800 max-h-64 font-bold">
                    {data.exerciseList.map((ex: any) => <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {isExporting && (
                <div className="font-bold text-black uppercase tracking-widest">{data.exerciseList.find(e => e.id === selectedExercise)?.name}</div>
              )}
            </CardHeader>
            <CardContent>
              {!selectedExercise || !data.exercisesData[selectedExercise] || data.exercisesData[selectedExercise].length < 1 ? (
                <EmptyState />
              ) : (
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.exercisesData[selectedExercise]}>
                      <defs>
                        <linearGradient id="color1RM" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#52525b" opacity={0.15} vertical={false} />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                      <YAxis domain={['auto', 'auto']} stroke="#71717a" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.95)', border: '1px solid #8b5cf6', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }} itemStyle={{ color: '#a78bfa' }} formatter={(value: any, name: any, props: any) => [`${value} kg (via ${props.payload.weight}kg x ${props.payload.reps})`, '1RM Estimé']} />
                      <Area isAnimationActive={false} connectNulls={true} type="monotone" dataKey="e1RM" stroke="#8b5cf6" strokeWidth={4} fill="url(#color1RM)" activeDot={{ r: 6 } as any} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* GRAPHIQUE 7 : MENSURATIONS */}
        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 mt-6">
          <CardHeader><CardTitle className={`flex items-center text-lg font-black text-zinc-900 dark:text-zinc-100 ${isExporting ? 'text-black' : ''}`}><Ruler className={`h-5 w-5 text-purple-500 mr-2 ${isExporting ? 'hidden' : ''}`} /> {txt.measTitle}</CardTitle><CardDescription className="font-medium text-zinc-500">{txt.measSub}</CardDescription></CardHeader>
          <CardContent>
            {data.formattedMeasurements.length < 2 ? <EmptyState /> : (
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.formattedMeasurements}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#52525b" opacity={0.15} vertical={false} />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                    <YAxis domain={['auto', 'auto']} stroke="#71717a" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.95)', border: '1px solid #3f3f46', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }} />
                    <Legend onClick={handleLegendClick} formatter={renderLegendText} wrapperStyle={{ cursor: 'pointer', fontSize: '11px', paddingTop: '10px' }} />
                    <Line isAnimationActive={false} connectNulls={true} hide={hiddenMeas.waist} type="monotone" dataKey="waist" name={lang==='FR'?"Taille":"Waist"} stroke="#ef4444" strokeWidth={4} dot={{ r: 4, fill: '#ef4444' } as any} />
                    <Line isAnimationActive={false} connectNulls={true} hide={hiddenMeas.arms} type="monotone" dataKey="arms" name={lang==='FR'?"Bras":"Arms"} stroke="#f59e0b" strokeWidth={4} dot={{ r: 4, fill: '#f59e0b' } as any} />
                    <Line isAnimationActive={false} connectNulls={true} hide={hiddenMeas.chest} type="monotone" dataKey="chest" name={lang==='FR'?"Poitrine":"Chest"} stroke="#10b981" strokeWidth={4} dot={{ r: 4, fill: '#10b981' } as any} />
                    <Line isAnimationActive={false} connectNulls={true} hide={hiddenMeas.thighs} type="monotone" dataKey="thighs" name={lang==='FR'?"Cuisses":"Thighs"} stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, fill: '#3b82f6' } as any} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ⚖️ AVIS LÉGAL */}
        <div className={`pt-8 border-t border-zinc-200 dark:border-zinc-800 mt-12 flex items-start space-x-3 text-zinc-400 dark:text-zinc-600 ${isExporting ? 'mt-8 text-black' : ''}`}>
          <ShieldAlert className={`w-5 h-5 shrink-0 mt-0.5 ${isExporting ? 'hidden' : ''}`} />
          <p className={`text-xs font-medium text-justify leading-relaxed ${isExporting ? 'font-bold' : ''}`}>
            {txt.disclaimer}
          </p>
        </div>

      </div>

      {/* 📘 MODALE INFO DYNAMIQUE */}
      <Dialog open={infoModal !== null} onOpenChange={(open) => !open && setInfoModal(null)}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-indigo-600 dark:text-indigo-400 flex items-center">
              <Info className="w-5 h-5 mr-2" /> {infoModal?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
              {infoModal?.desc}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setInfoModal(null)} className="w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold">
              {lang === 'FR' ? "Compris" : "Got it"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
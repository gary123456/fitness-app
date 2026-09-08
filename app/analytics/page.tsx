"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ReferenceLine } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, TrendingDown, Dumbbell, Target, Ruler, Radar as RadarIcon, CalendarDays, Sparkles, Database, Brain, Download, ShieldAlert, HeartPulse } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";
import { calculateAge, calculateBMI, calculateEstimatedBodyFat } from "@/lib/fitness";
import { Button } from "@/components/ui/button";

const fetchAnalyticsData = async (lang: string, timeframe: string, customStart?: string, customEnd?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const userAge = profile ? calculateAge(profile.birth_date) : 25;
  const userGender = profile?.gender || 'homme';
  const userHeight = profile?.height_cm || 175;
  const sleepQuality = profile?.sleep_quality || 'moyen';

  // ⏱️ 1. GESTION DU FILTRE TEMPOREL DYNAMIQUE (Pour les graphiques)
  let startDate = new Date();
  let endDate = new Date();
  let isAllTime = false;

  if (timeframe === '7d') startDate.setDate(startDate.getDate() - 7);
  else if (timeframe === '30d') startDate.setDate(startDate.getDate() - 30);
  else if (timeframe === '3m') startDate.setMonth(startDate.getMonth() - 3);
  else if (timeframe === '6m') startDate.setMonth(startDate.getMonth() - 6);
  else if (timeframe === '9m') startDate.setMonth(startDate.getMonth() - 9);
  else if (timeframe === '1y') startDate.setFullYear(startDate.getFullYear() - 1);
  else if (timeframe === 'custom' && customStart) {
    startDate = new Date(customStart);
    if (customEnd) {
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    }
  } else {
    isAllTime = true;
  }

  let queryMeas = supabase.from("measurements").select("*").eq("user_id", user.id).order("created_at", { ascending: true });
  let queryLogs = supabase.from("workout_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: true });

  if (!isAllTime) {
    queryMeas = queryMeas.gte("created_at", startDate.toISOString());
    queryLogs = queryLogs.gte("created_at", startDate.toISOString());
    if (timeframe === 'custom' && customEnd) {
      queryMeas = queryMeas.lte("created_at", endDate.toISOString());
      queryLogs = queryLogs.lte("created_at", endDate.toISOString());
    }
  }

  const [{ data: measurements }, { data: logs }, { data: library }] = await Promise.all([
    queryMeas, queryLogs, supabase.from("exercise_library").select("id, name")
  ]);

  // 🧠 2. CALCUL DE L'ACWR (Acute-to-Chronic Workload Ratio) INDÉPENDANT DU FILTRE
  const todayDate = new Date();
  const d28 = new Date(); d28.setDate(d28.getDate() - 28);
  const d7 = new Date(); d7.setDate(d7.getDate() - 7);
  
  const { data: acwrLogs } = await supabase.from('workout_logs').select('created_at, weight, reps').eq("user_id", user.id).gte('created_at', d28.toISOString());
  let vol7 = 0; let vol28 = 0;
  if (acwrLogs) {
    acwrLogs.forEach(l => {
      const v = (l.weight || 0) * (l.reps || 0);
      vol28 += v;
      if (new Date(l.created_at) >= d7) vol7 += v;
    });
  }
  const avg4Weeks = vol28 / 4;
  const acwrScore = avg4Weeks > 0 ? Number((vol7 / avg4Weeks).toFixed(2)) : 0;

  // 📊 3. TRAITEMENT DES DONNÉES DES GRAPHIQUES
  let formattedWeight: any[] = [];
  let formattedMeasurements: any[] = [];

  if (measurements) {
    formattedWeight = measurements.map(m => {
      const bmi = calculateBMI(m.weight_kg, userHeight);
      const img = calculateEstimatedBodyFat(bmi, userAge, userGender);
      return { 
        date: new Date(m.created_at).toLocaleDateString(lang === 'FR' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short' }), 
        poids: m.weight_kg, img: Number(img)
      };
    });
    
    formattedMeasurements = measurements.map(m => ({
      date: new Date(m.created_at).toLocaleDateString(lang === 'FR' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short' }),
      arms: m.arms_cm ? Number(m.arms_cm) : null, chest: m.chest_cm ? Number(m.chest_cm) : null, 
      waist: m.waist_cm ? Number(m.waist_cm) : null, thighs: m.thighs_cm ? Number(m.thighs_cm) : null
    })).filter(m => m.arms || m.chest || m.waist || m.thighs);
  }

  const volByDate: Record<string, number> = {};
  const exData: Record<string, any[]> = {};
  const exSet = new Set<string>();
  const best1RMs: Record<string, number> = { "Squat": 0, "Bench": 0, "Deadlift": 0 };
  let availableList: {id: string, name: string}[] = [];
  const muscleDistribution: Record<string, number> = { Chest: 0, Back: 0, Legs: 0, Arms: 0, Shoulders: 0, Core: 0 };

  if (logs && library) {
    const libMap: Record<string, string> = {};
    library.forEach(ex => libMap[ex.id] = ex.name);

    logs.forEach(log => {
      const dateStr = new Date(log.created_at).toLocaleDateString(lang === 'FR' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short' });
      const weight = log.weight || 0;
      const reps = log.reps || 0;
      const volume = weight * reps;
      
      volByDate[dateStr] = (volByDate[dateStr] || 0) + volume;
      const e1RM = (reps > 0 && reps <= 12) ? weight * (36 / (37 - reps)) : weight;
      const exName = libMap[log.exercise_id];

      if (exName) {
        exSet.add(log.exercise_id);
        if (!exData[log.exercise_id]) exData[log.exercise_id] = [];
        
        const existingDay = exData[log.exercise_id].find((d: any) => d.date === dateStr);
        if (!existingDay || e1RM > existingDay.e1RM) {
          if (existingDay) {
            existingDay.e1RM = Number(e1RM.toFixed(1));
            existingDay.weight = weight;
            existingDay.reps = reps;
          } else {
            exData[log.exercise_id].push({ date: dateStr, e1RM: Number(e1RM.toFixed(1)), weight, reps });
          }
        }

        const nameLower = exName.toLowerCase();
        if (nameLower.includes("squat") || nameLower.includes("leg") || nameLower.includes("presse") || nameLower.includes("fente")) {
          muscleDistribution.Legs += volume;
          if (nameLower.includes("squat barre")) best1RMs["Squat"] = Math.max(best1RMs["Squat"], e1RM);
        }
        else if (nameLower.includes("couché") || nameLower.includes("pec") || nameLower.includes("bench") || nameLower.includes("écarté")) {
          muscleDistribution.Chest += volume;
          if (nameLower.includes("couché barre") || nameLower.includes("bench press")) best1RMs["Bench"] = Math.max(best1RMs["Bench"], e1RM);
        }
        else if (nameLower.includes("traction") || nameLower.includes("row") || nameLower.includes("tirage") || nameLower.includes("dos") || nameLower.includes("terre") || nameLower.includes("deadlift")) {
          muscleDistribution.Back += volume;
          if (nameLower.includes("terre classique") || nameLower.includes("deadlift")) best1RMs["Deadlift"] = Math.max(best1RMs["Deadlift"], e1RM);
        }
        else if (nameLower.includes("curl") || nameLower.includes("triceps") || nameLower.includes("biceps") || nameLower.includes("bras")) {
          muscleDistribution.Arms += volume;
        }
        else if (nameLower.includes("militaire") || nameLower.includes("élévation") || nameLower.includes("épaule") || nameLower.includes("shoulder")) {
          muscleDistribution.Shoulders += volume;
        }
        else if (nameLower.includes("crunch") || nameLower.includes("gainage") || nameLower.includes("abs")) {
          muscleDistribution.Core += volume;
        }
      }
    });
    availableList = Array.from(exSet).map(id => ({ id, name: libMap[id] }));
    availableList.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  const radarData = [
    { subject: lang === 'FR' ? 'Pecs' : 'Chest', A: muscleDistribution.Chest, fullMark: 100 },
    { subject: lang === 'FR' ? 'Dos' : 'Back', A: muscleDistribution.Back, fullMark: 100 },
    { subject: lang === 'FR' ? 'Épaules' : 'Shoulders', A: muscleDistribution.Shoulders, fullMark: 100 },
    { subject: lang === 'FR' ? 'Bras' : 'Arms', A: muscleDistribution.Arms, fullMark: 100 },
    { subject: lang === 'FR' ? 'Jambes' : 'Legs', A: muscleDistribution.Legs, fullMark: 100 },
    { subject: 'Core', A: muscleDistribution.Core, fullMark: 100 },
  ];

  return { 
    profile, 
    userAge, userHeight, userGender,
    formattedWeight, formattedMeasurements, formattedVolume: Object.keys(volByDate).map(date => ({ date, volume: volByDate[date] })), 
    exercisesData: exData, max1RMs: { "Squat": Number(best1RMs["Squat"].toFixed(1)), "Bench": Number(best1RMs["Bench"].toFixed(1)), "Deadlift": Number(best1RMs["Deadlift"].toFixed(1)) }, 
    exerciseList: availableList, radarData, sleepQuality, acwrScore
  };
};

export default function AnalyticsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  
  const [timeframe, setTimeframe] = useState<string>("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

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

  // DICTIONNAIRE DE TRADUCTION SÉCURISÉ
  const t = {
    FR: { title: "Performances & Évolution", sub: "Visualisez votre progression biométrique et analytique.", weightTitle: "Recomposition Corporelle", weightSub: "Poids réel vs Estimation Masse Grasse", volTitle: "Tonnage Global", volSub: "Charge totale par séance", empty: "Pas assez de données pour cette période.", selectEx: "Sélectionner un exercice", progEx: "Progression Force (1RM)", bench: "Couché", squat: "Squat", deadlift: "Soulevé", measTitle: "Mensurations", measSub: "Évolution en cm", radarTitle: "Répartition Musculaire", radarSub: "Volume de travail par groupe (Tonnage)", weight: "Poids", img: "Masse Grasse", tf7: "7 Derniers Jours", tf30: "1 Mois", tf3m: "3 Mois", tf6m: "6 Mois", tf9m: "9 Mois", tf1y: "1 An", tfall: "Historique Complet", tfcustom: "Personnalisé", aiTitle: "Insight Métabolique", export: "Rapport PDF", startDate: "Date de début", endDate: "Date de fin", acwr: "Charge (ACWR)", acwrSub: "Ratio de fatigue (7j / 28j)", sweetSpot: "Zone Optimale", dangerZone: "Risque Blessure", underZone: "Désentraînement", disclaimer: "CLAUSE DE NON-RESPONSABILITÉ MÉDICALE : Les données et analyses (y compris l'estimation de la masse grasse et les recommandations métaboliques) générées par cette application sont fournies à titre strictement informatif et sportif. Elles ne constituent en aucun cas un diagnostic médical, un avis médical ou un traitement. Consultez toujours un médecin ou un professionnel de santé qualifié avant de modifier votre régime alimentaire, votre programme d'entraînement ou de prendre des décisions basées sur ces données." },
    EN: { title: "Performance & Evolution", sub: "Visualize your biometric and analytical progress.", weightTitle: "Body Recomposition", weightSub: "Actual Weight vs Est. Body Fat", volTitle: "Global Tonnage", volSub: "Total load per session", empty: "Not enough data for this period.", selectEx: "Select an exercise", progEx: "Strength Progression (1RM)", bench: "Bench", squat: "Squat", deadlift: "Deadlift", measTitle: "Measurements", measSub: "Evolution in cm", radarTitle: "Muscle Heatmap", radarSub: "Work volume by group (Tonnage)", weight: "Weight", img: "Body Fat", tf7: "Last 7 Days", tf30: "1 Month", tf3m: "3 Months", tf6m: "6 Months", tf9m: "9 Months", tf1y: "1 Year", tfall: "All Time", tfcustom: "Custom Range", aiTitle: "Metabolic Insight", export: "PDF Report", startDate: "Start Date", endDate: "End Date", acwr: "Workload (ACWR)", acwrSub: "Fatigue ratio (7d / 28d)", sweetSpot: "Sweet Spot", dangerZone: "Injury Risk", underZone: "Undertraining", disclaimer: "MEDICAL DISCLAIMER: The data and analysis (including estimated body fat and metabolic recommendations) generated by this application are provided strictly for informational and athletic purposes. They do not constitute medical diagnosis, advice, or treatment. Always consult a physician or qualified healthcare provider before modifying your diet, training program, or making decisions based on this data." }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

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
    const totalVolume = muscles.reduce((acc, curr) => acc + curr.A, 0);
    const strongest = muscles[0];
    const weakest = muscles[muscles.length - 1];
    const legData = muscles.find(m => m.subject === 'Jambes' || m.subject === 'Legs');
    
    let insight = "";
    if (legData && (legData.A / totalVolume) < 0.1) {
      insight = lang === 'FR' ? `⚠️ Alerte structurelle : Vos membres inférieurs représentent moins de 10% de votre volume. Risque d'asymétrie sévère. ` : `⚠️ Structural alert: Lower body represents less than 10% of total volume. Severe asymmetry risk. `;
    } else if ((strongest.A / totalVolume) > 0.45) {
      insight = lang === 'FR' ? `⚡ Surcharge locale : [${strongest.subject}] encaisse une majorité critique du tonnage (>45%). Attention à l'usure articulaire. ` : `⚡ Local overload: [${strongest.subject}] absorbs >45% of tonnage. Watch for joint wear. `;
    } else if (strongest.A < weakest.A * 2.5 && weakest.A > 0) {
      insight = lang === 'FR' ? `✅ Excellente symétrie. La répartition de charge sur cette période est biomécaniquement saine. ` : `✅ Excellent symmetry. Load distribution in this period is biomechanically sound. `;
    } else {
      insight = lang === 'FR' ? `Dominance de volume sur [${strongest.subject}], tandis que [${weakest.subject}] est en retard d'activation. ` : `Volume dominance on [${strongest.subject}], [${weakest.subject}] shows activation lag. `;
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

  // 🖨️ HACK PDF ABSOLU : Nom personnalisé + Masquage PWA UI
  const handlePrintPDF = () => {
    if (!data?.profile) return;
    const originalTitle = document.title;
    const dateStr = new Date().toISOString().split('T')[0];
    const safeFirstName = (data.profile.first_name || 'Utilisateur').replace(/[^a-zA-Z0-9]/g, '_');
    const safeLastName = (data.profile.last_name || 'Vivex').replace(/[^a-zA-Z0-9]/g, '_');
    
    document.title = `${safeLastName}_${safeFirstName}_Rapport_${dateStr}`;
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 1000);
  };

  const EmptyState = () => (
    <div className="h-[300px] flex flex-col items-center justify-center text-zinc-500 font-bold opacity-60">
      <Database className="w-10 h-10 mb-2 opacity-50" />
      <span>{txt.empty}</span>
    </div>
  );

  if (isLoading && !data) {
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

  if (!data) return null;

  const avgVolume = data.formattedVolume.length > 0 
    ? Math.round(data.formattedVolume.reduce((acc, curr) => acc + curr.volume, 0) / data.formattedVolume.length)
    : 0;
  
  const currentWeight = data.formattedWeight.length > 0 ? data.formattedWeight[data.formattedWeight.length - 1].poids : '-';

  // Logique UI pour l'ACWR
  let acwrColor = "text-teal-500"; let acwrLabel = txt.sweetSpot;
  if (data.acwrScore < 0.8) { acwrColor = "text-blue-500"; acwrLabel = txt.underZone; }
  else if (data.acwrScore > 1.5) { acwrColor = "text-red-500"; acwrLabel = txt.dangerZone; }
  else if (data.acwrScore === 0) { acwrColor = "text-zinc-500"; acwrLabel = "-"; }

  return (
    <>
      {/* 🖨️ CSS PRINT ABSOLU : Force le BLANC, textes NOIRS, et supprime les éléments inutiles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* Force le Reset complet des couleurs */
          * {
            background-color: transparent !important;
            color: #000 !important;
            box-shadow: none !important;
            text-shadow: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          /* Fond blanc absolu pour la page */
          body::before { content: ""; background: white !important; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: -1; }
          
          /* Masquage agressif des Navbars (header, nav, pwa elements) */
          nav, header, footer, aside, .navbar, [role="navigation"], .print-hidden { display: none !important; }
          
          /* Cartes avec bordures nettes */
          .print-break-avoid { 
            page-break-inside: avoid; 
            border: 2px solid #000 !important; 
            background: white !important;
            margin-bottom: 24px !important;
            border-radius: 8px !important;
          }
          
          /* Correction Recharts (SVG) */
          .recharts-text, .recharts-legend-item-text { fill: #000 !important; font-weight: bold !important; }
          .recharts-cartesian-grid line, .recharts-polar-grid line, .recharts-polar-angle-axis line { stroke: #444 !important; opacity: 1 !important; }
          
          /* Format du papier */
          @page { size: A4 portrait; margin: 15mm; }
        }
      `}} />

      <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full relative pb-24">
        
        {/* 🖨️ EN-TÊTE DU RAPPORT (Invisible à l'écran, Visible uniquement en PDF) */}
        <div className="hidden print:block mb-8 border-b-4 border-black pb-6">
          <div className="flex justify-between items-end mb-6">
            <h1 className="text-3xl font-black uppercase tracking-tight text-black">Rapport Analytique Santé & Sport</h1>
            <div className="text-right text-sm font-bold text-black">{new Date().toLocaleDateString(lang === 'FR' ? 'fr-FR' : 'en-US')}</div>
          </div>
          <div className="grid grid-cols-3 gap-6 p-4 rounded-xl border-2 border-black text-sm">
            <div><span className="uppercase text-[10px] font-black tracking-widest block mb-1">Patient / Athlète</span><span className="font-black text-xl">{data.profile?.first_name || '-'} {data.profile?.last_name || '-'}</span></div>
            <div><span className="uppercase text-[10px] font-black tracking-widest block mb-1">Sexe & Âge</span><span className="font-bold text-lg">{data.userGender.toUpperCase()} • {data.userAge} ans</span></div>
            <div><span className="uppercase text-[10px] font-black tracking-widest block mb-1">Biométrie Actuelle</span><span className="font-bold text-lg">{data.userHeight} cm • {currentWeight} kg</span></div>
          </div>
        </div>

        {/* EN-TÊTE ET CONTRÔLES UI (Invisible sur le PDF) */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between space-y-4 xl:space-y-0 print-hidden">
          <div className="flex flex-col space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
              <Activity className="w-8 h-8 mr-3 text-teal-500" /> {txt.title}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">{txt.sub}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
            
            {/* UI DATES PERSONNALISÉES (Pilule intégrée) */}
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

            {/* BOUTON D'EXPORT PDF */}
            <Button onClick={handlePrintPDF} variant="outline" className="h-12 w-full sm:w-auto border-teal-500 text-teal-600 dark:text-teal-400 hover:bg-teal-500 hover:text-white font-bold transition-all shadow-sm rounded-xl">
              <Download className="w-4 h-4 mr-2" /> {txt.export}
            </Button>
          </div>
        </div>

        {/* 🧠 BLOC INSIGHT IA */}
        <Card className="print-break-avoid border-indigo-500/30 bg-gradient-to-r from-indigo-500/5 to-transparent dark:bg-zinc-900 shadow-lg shadow-indigo-500/5">
          <CardHeader className="pb-2 pt-5 flex flex-row items-center space-x-2 space-y-0">
            <div className="bg-indigo-500/20 p-2 rounded-lg print-hidden"><Brain className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /></div>
            <CardTitle className="text-sm font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">{txt.aiTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 leading-relaxed border-l-2 border-indigo-500 pl-4 mt-2 print:border-black print:text-black">
              {generateAIInsight()}
            </p>
          </CardContent>
        </Card>

        {/* MÉTRIQUES CLÉS (1RMs + ACWR) */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 print-break-avoid">
          {/* NOUVEAU : ACWR */}
          <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex justify-between items-center text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">
                <span>{txt.acwr}</span> <HeartPulse className={`w-4 h-4 ${acwrColor}`} />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className={`text-xl sm:text-3xl font-black ${acwrColor}`}>{data.acwrScore || 0}</div>
              <p className="text-[10px] sm:text-xs font-bold text-zinc-400 mt-1 uppercase tracking-widest">{acwrLabel}</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"><CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">{txt.squat} 1RM</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-xl sm:text-3xl font-black text-teal-600 dark:text-teal-400">{data.max1RMs["Squat"] || 0} <span className="text-xs sm:text-sm text-zinc-400 font-bold">kg</span></div></CardContent></Card>
          <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"><CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">{txt.bench} 1RM</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">{data.max1RMs["Bench"] || 0} <span className="text-xs sm:text-sm text-zinc-400 font-bold">kg</span></div></CardContent></Card>
          <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"><CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">{txt.deadlift} 1RM</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-xl sm:text-3xl font-black text-orange-600 dark:text-orange-400">{data.max1RMs["Deadlift"] || 0} <span className="text-xs sm:text-sm text-zinc-400 font-bold">kg</span></div></CardContent></Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* GRAPHIQUE 1 : RECOMPOSITION */}
          <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 print-break-avoid">
            <CardHeader><CardTitle className="flex items-center text-lg font-black text-zinc-900 dark:text-zinc-100"><TrendingDown className="h-5 w-5 text-blue-500 mr-2 print-hidden" /> {txt.weightTitle}</CardTitle><CardDescription className="font-medium text-zinc-500">{txt.weightSub}</CardDescription></CardHeader>
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
                      {/* L'animation est désactivée (isAnimationActive={false}) pour garantir l'affichage sur le PDF */}
                      <Area isAnimationActive={false} hide={hiddenRecomp.poids} yAxisId="left" type="monotone" name={`${txt.weight} (kg)`} dataKey="poids" stroke="#3b82f6" strokeWidth={4} fill="url(#colorWeight)" activeDot={{ r: 6 } as any} />
                      <Line isAnimationActive={false} hide={hiddenRecomp.img} yAxisId="right" type="monotone" name={`${txt.img} (%)`} dataKey="img" stroke="#10b981" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 3, fill: '#10b981' } as any} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* GRAPHIQUE 2 : RADAR */}
          <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden relative print-break-avoid">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none print-hidden"><RadarIcon className="w-48 h-48 text-indigo-500" /></div>
            <CardHeader className="relative z-10"><CardTitle className="flex items-center text-lg font-black text-zinc-900 dark:text-zinc-100"><RadarIcon className="h-5 w-5 text-indigo-500 mr-2 print-hidden" /> {txt.radarTitle}</CardTitle><CardDescription className="font-medium text-zinc-500">{txt.radarSub}</CardDescription></CardHeader>
            <CardContent className="relative z-10">
              {data.radarData.every(d => d.A === 0) ? <EmptyState /> : (
                <div className="h-[300px] w-full mt-4 flex justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data.radarData}>
                      <PolarGrid stroke="#52525b" opacity={0.3} />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 'bold' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.95)', border: '1px solid #6366f1', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }} itemStyle={{ color: '#818cf8' }} />
                      <Radar isAnimationActive={false} name="Tonnage" dataKey="A" stroke="#6366f1" strokeWidth={3} fill="#6366f1" fillOpacity={0.4} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* GRAPHIQUE 3 : BAR CHART TONNAGE */}
          <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 print-break-avoid">
            <CardHeader><CardTitle className="flex items-center text-lg font-black text-zinc-900 dark:text-zinc-100"><Dumbbell className="h-5 w-5 text-teal-500 mr-2 print-hidden" /> {txt.volTitle}</CardTitle><CardDescription className="font-medium text-zinc-500">{txt.volSub}</CardDescription></CardHeader>
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

          {/* GRAPHIQUE 4 : 1RM */}
          <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 print-break-avoid">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
              <CardTitle className="flex items-center text-lg font-black text-zinc-900 dark:text-zinc-100"><Target className="h-5 w-5 text-indigo-500 mr-2 print-hidden" /> {txt.progEx}</CardTitle>
              <div className="w-full sm:w-64 print-hidden">
                <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                  <SelectTrigger className="bg-white dark:bg-zinc-950 font-bold dark:border-zinc-800 dark:text-zinc-100"><SelectValue placeholder={txt.selectEx} /></SelectTrigger>
                  <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800 max-h-64 font-bold">
                    {data.exerciseList.map((ex: any) => <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="hidden print:block font-bold text-indigo-600 uppercase tracking-widest">{data.exerciseList.find(e => e.id === selectedExercise)?.name}</div>
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
                      <Area isAnimationActive={false} type="monotone" dataKey="e1RM" stroke="#8b5cf6" strokeWidth={4} fill="url(#color1RM)" activeDot={{ r: 6 } as any} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* GRAPHIQUE 5 : MENSURATIONS */}
          <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 md:col-span-2 print-break-avoid">
            <CardHeader><CardTitle className="flex items-center text-lg font-black text-zinc-900 dark:text-zinc-100"><Ruler className="h-5 w-5 text-purple-500 mr-2 print-hidden" /> {txt.measTitle}</CardTitle><CardDescription className="font-medium text-zinc-500">{txt.measSub}</CardDescription></CardHeader>
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
                      <Line isAnimationActive={false} hide={hiddenMeas.waist} type="monotone" dataKey="waist" name={lang==='FR'?"Taille":"Waist"} stroke="#ef4444" strokeWidth={4} dot={{ r: 4, fill: '#ef4444' } as any} />
                      <Line isAnimationActive={false} hide={hiddenMeas.arms} type="monotone" dataKey="arms" name={lang==='FR'?"Bras":"Arms"} stroke="#f59e0b" strokeWidth={4} dot={{ r: 4, fill: '#f59e0b' } as any} />
                      <Line isAnimationActive={false} hide={hiddenMeas.chest} type="monotone" dataKey="chest" name={lang==='FR'?"Poitrine":"Chest"} stroke="#10b981" strokeWidth={4} dot={{ r: 4, fill: '#10b981' } as any} />
                      <Line isAnimationActive={false} hide={hiddenMeas.thighs} type="monotone" dataKey="thighs" name={lang==='FR'?"Cuisses":"Thighs"} stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, fill: '#3b82f6' } as any} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ⚖️ AVIS LÉGAL (Medical Disclaimer) - Visible en bas de page et sur le PDF */}
        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 mt-12 flex items-start space-x-3 text-zinc-400 dark:text-zinc-600 print:mt-8 print-break-avoid">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 print-hidden" />
          <p className="text-xs font-medium text-justify leading-relaxed print:text-black print:font-bold">
            {txt.disclaimer}
          </p>
        </div>

      </div>
    </>
  );
}
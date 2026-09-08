"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ReferenceLine } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, TrendingDown, Dumbbell, Target, Ruler, Radar as RadarIcon, CalendarDays, Sparkles, Database, Brain } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";
import { calculateAge, calculateBMI, calculateEstimatedBodyFat } from "@/lib/fitness";

const fetchAnalyticsData = async (lang: string, timeframe: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const userAge = profile ? calculateAge(profile.birth_date) : 25;
  const userGender = profile?.gender || 'homme';
  const userHeight = profile?.height_cm || 175;
  const sleepQuality = profile?.sleep_quality || 'moyen';

  const cutoffDate = new Date();
  if (timeframe === '7d') cutoffDate.setDate(cutoffDate.getDate() - 7);
  else if (timeframe === '30d') cutoffDate.setDate(cutoffDate.getDate() - 30);
  else cutoffDate.setFullYear(1970); 

  let queryMeas = supabase.from("measurements").select("*").eq("user_id", user.id).order("created_at", { ascending: true });
  let queryLogs = supabase.from("workout_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: true });

  if (timeframe !== 'all') {
    queryMeas = queryMeas.gte("created_at", cutoffDate.toISOString());
    queryLogs = queryLogs.gte("created_at", cutoffDate.toISOString());
  }

  const [{ data: measurements }, { data: logs }, { data: library }] = await Promise.all([
    queryMeas, queryLogs, supabase.from("exercise_library").select("id, name")
  ]);

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
    formattedWeight, formattedMeasurements, formattedVolume: Object.keys(volByDate).map(date => ({ date, volume: volByDate[date] })), 
    exercisesData: exData, max1RMs: { "Squat": Number(best1RMs["Squat"].toFixed(1)), "Bench": Number(best1RMs["Bench"].toFixed(1)), "Deadlift": Number(best1RMs["Deadlift"].toFixed(1)) }, 
    exerciseList: availableList, radarData, sleepQuality
  };
};

export default function AnalyticsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [timeframe, setTimeframe] = useState<string>("30d");

  const { data, error, isLoading } = useSWR(['analyticsData', lang, timeframe], () => fetchAnalyticsData(lang, timeframe));
  
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  
  // 🛡️ NOUVEAU : Double état de masquage dynamique (Mensurations ET Recomposition)
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
    FR: { title: "Performances & Évolution", sub: "Visualisez votre progression biométrique et analytique.", weightTitle: "Recomposition Corporelle", weightSub: "Poids réel vs Estimation Masse Grasse", volTitle: "Tonnage Global", volSub: "Charge totale par séance", empty: "Pas assez de données accumulées.", selectEx: "Sélectionner un exercice", progEx: "Progression Force (1RM)", bench: "Couché", squat: "Squat", deadlift: "Soulevé", measTitle: "Mensurations", measSub: "Évolution en cm", radarTitle: "Répartition Musculaire", radarSub: "Volume de travail par groupe (Tonnage)", weight: "Poids", img: "Masse Grasse", tf7: "7 Derniers Jours", tf30: "30 Derniers Jours", tfall: "Historique Complet", aiTitle: "Insight Métabolique" },
    EN: { title: "Performance & Evolution", sub: "Visualize your biometric and analytical progress.", weightTitle: "Body Recomposition", weightSub: "Actual Weight vs Est. Body Fat", volTitle: "Global Tonnage", volSub: "Total load per session", empty: "Not enough data accumulated.", selectEx: "Select an exercise", progEx: "Strength Progression (1RM)", bench: "Bench", squat: "Squat", deadlift: "Deadlift", measTitle: "Measurements", measSub: "Evolution in cm", radarTitle: "Muscle Heatmap", radarSub: "Work volume by group (Tonnage)", weight: "Weight", img: "Body Fat", tf7: "Last 7 Days", tf30: "Last 30 Days", tfall: "All Time", aiTitle: "Metabolic Insight" }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

  // Fonctions de click sur Légende
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
    if (!data || data.radarData.every(d => d.A === 0)) return lang === 'FR' ? "L'algorithme requiert plus de données pour générer un profil biomécanique." : "Algorithm requires more data to generate a biomechanical profile.";
    const muscles = [...data.radarData].sort((a, b) => b.A - a.A);
    const totalVolume = muscles.reduce((acc, curr) => acc + curr.A, 0);
    const strongest = muscles[0];
    const weakest = muscles[muscles.length - 1];
    const legData = muscles.find(m => m.subject === 'Jambes' || m.subject === 'Legs');
    
    let insight = "";
    if (legData && (legData.A / totalVolume) < 0.1) {
      insight = lang === 'FR' ? `⚠️ Alerte structurelle : Vos membres inférieurs (Jambes) représentent moins de 10% de votre volume global. Vous risquez une asymétrie de force sévère. ` : `⚠️ Structural alert: Lower body represents less than 10% of total volume. Severe strength asymmetry risk. `;
    } else if ((strongest.A / totalVolume) > 0.45) {
      insight = lang === 'FR' ? `⚡ Surcharge locale : [${strongest.subject}] encaisse une majorité critique de votre tonnage (>45%). Attention à l'usure articulaire. ` : `⚡ Local overload: [${strongest.subject}] absorbs a critical majority of your tonnage (>45%). Watch out for joint wear. `;
    } else if (strongest.A < weakest.A * 2.5 && weakest.A > 0) {
      insight = lang === 'FR' ? `✅ Excellente symétrie d'entraînement. La répartition de charge entre vos groupes musculaires est biomécaniquement saine. ` : `✅ Excellent training symmetry. Load distribution across muscle groups is biomechanically sound. `;
    } else {
      insight = lang === 'FR' ? `Dominance de volume détectée sur [${strongest.subject}], tandis que [${weakest.subject}] est en retard d'activation. ` : `Volume dominance detected on [${strongest.subject}], while [${weakest.subject}] shows activation lag. `;
    }
    if (data.sleepQuality === 'mauvais') {
      insight += lang === 'FR' ? `Votre sommeil critique bride la surcompensation. Baissez l'intensité (RPE) de 15% sur la prochaine séance.` : `Critical sleep restricts supercompensation. Drop RPE by 15% next session.`;
    } else if (data.sleepQuality === 'excellent') {
      insight += lang === 'FR' ? `Sommeil optimal. Le Système Nerveux Central est prêt pour une tentative de PR (Record).` : `Optimal sleep. Central Nervous System is primed for a PR attempt.`;
    } else {
      insight += lang === 'FR' ? `La récupération est stable. Poursuivez la surcharge progressive.` : `Recovery is stable. Continue progressive overload.`;
    }
    return insight;
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
        <div className="grid gap-4 grid-cols-3">
          <div className="h-24 bg-zinc-100 dark:bg-zinc-900 rounded-2xl"></div>
          <div className="h-24 bg-zinc-100 dark:bg-zinc-900 rounded-2xl"></div>
          <div className="h-24 bg-zinc-100 dark:bg-zinc-900 rounded-2xl"></div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-[400px] bg-zinc-100 dark:bg-zinc-900 rounded-3xl"></div>
          <div className="h-[400px] bg-zinc-100 dark:bg-zinc-900 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Calcul de la moyenne du tonnage pour le graphique
  const avgVolume = data.formattedVolume.length > 0 
    ? Math.round(data.formattedVolume.reduce((acc, curr) => acc + curr.volume, 0) / data.formattedVolume.length)
    : 0;

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full relative pb-24">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div className="flex flex-col space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
            <Activity className="w-8 h-8 mr-3 text-teal-500" /> {txt.title}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">{txt.sub}</p>
        </div>
        
        <div className="w-full md:w-64">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="bg-white dark:bg-zinc-900 dark:border-zinc-800 font-bold dark:text-zinc-100 shadow-sm h-12">
              <CalendarDays className="w-4 h-4 mr-2 text-teal-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800 font-bold">
              <SelectItem value="7d">{txt.tf7}</SelectItem>
              <SelectItem value="30d">{txt.tf30}</SelectItem>
              <SelectItem value="all">{txt.tfall}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-indigo-500/30 bg-gradient-to-r from-indigo-500/5 to-transparent dark:bg-zinc-900 shadow-lg shadow-indigo-500/5">
        <CardHeader className="pb-2 pt-5 flex flex-row items-center space-x-2 space-y-0">
          <div className="bg-indigo-500/20 p-2 rounded-lg"><Brain className="w-5 h-5 text-indigo-400" /></div>
          <CardTitle className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{txt.aiTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 leading-relaxed border-l-2 border-indigo-500 pl-4 mt-2">
            {generateAIInsight()}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-3">
        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"><CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">{txt.squat} 1RM</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-xl sm:text-3xl font-black text-teal-600 dark:text-teal-400">{data.max1RMs["Squat"] || 0} <span className="text-xs sm:text-sm text-zinc-400 font-bold">kg</span></div></CardContent></Card>
        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"><CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">{txt.bench} 1RM</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">{data.max1RMs["Bench"] || 0} <span className="text-xs sm:text-sm text-zinc-400 font-bold">kg</span></div></CardContent></Card>
        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"><CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">{txt.deadlift} 1RM</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-xl sm:text-3xl font-black text-orange-600 dark:text-orange-400">{data.max1RMs["Deadlift"] || 0} <span className="text-xs sm:text-sm text-zinc-400 font-bold">kg</span></div></CardContent></Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader><CardTitle className="flex items-center text-lg font-black text-zinc-900 dark:text-zinc-100"><TrendingDown className="h-5 w-5 text-blue-500 mr-2" /> {txt.weightTitle}</CardTitle><CardDescription className="font-medium text-zinc-500">{txt.weightSub}</CardDescription></CardHeader>
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
                    {/* Les axes s'auto-ajustent si l'une des deux courbes est masquée */}
                    <YAxis yAxisId="left" hide={hiddenRecomp.poids} domain={['dataMin - 2', 'dataMax + 2']} stroke="#71717a" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} orientation="left" />
                    <YAxis yAxisId="right" hide={hiddenRecomp.img} domain={['auto', 'auto']} stroke="#71717a" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} orientation="right" />
                    
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid #3f3f46', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }} />
                    <Legend onClick={handleRecompLegendClick} formatter={renderRecompLegendText} wrapperStyle={{ cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                    
                    {/* Le hide est transmis aux lignes */}
                    <Area hide={hiddenRecomp.poids} yAxisId="left" type="monotone" name={`${txt.weight} (kg)`} dataKey="poids" stroke="#3b82f6" strokeWidth={4} fill="url(#colorWeight)" activeDot={{ r: 6 } as any} />
                    <Line hide={hiddenRecomp.img} yAxisId="right" type="monotone" name={`${txt.img} (%)`} dataKey="img" stroke="#10b981" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 3, fill: '#10b981' } as any} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><RadarIcon className="w-48 h-48 text-indigo-500" /></div>
          <CardHeader className="relative z-10"><CardTitle className="flex items-center text-lg font-black text-zinc-900 dark:text-zinc-100"><RadarIcon className="h-5 w-5 text-indigo-500 mr-2" /> {txt.radarTitle}</CardTitle><CardDescription className="font-medium text-zinc-500">{txt.radarSub}</CardDescription></CardHeader>
          <CardContent className="relative z-10">
            {data.radarData.every(d => d.A === 0) ? <EmptyState /> : (
              <div className="h-[300px] w-full mt-4 flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data.radarData}>
                    <PolarGrid stroke="#52525b" opacity={0.3} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.95)', border: '1px solid #6366f1', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }} itemStyle={{ color: '#818cf8' }} />
                    <Radar name="Tonnage" dataKey="A" stroke="#6366f1" strokeWidth={3} fill="#6366f1" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader><CardTitle className="flex items-center text-lg font-black text-zinc-900 dark:text-zinc-100"><Dumbbell className="h-5 w-5 text-teal-500 mr-2" /> {txt.volTitle}</CardTitle><CardDescription className="font-medium text-zinc-500">{txt.volSub}</CardDescription></CardHeader>
          <CardContent>
            {data.formattedVolume.length === 0 ? <EmptyState /> : (
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.formattedVolume}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#52525b" opacity={0.15} vertical={false} />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.95)', border: '1px solid #14b8a6', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }} itemStyle={{ color: '#2dd4bf' }} cursor={{ fill: '#27272a', opacity: 0.5 }} />
                    
                    {/* 🛡️ NOUVEAU : LIGNE DE MOYENNE DU TONNAGE */}
                    <ReferenceLine y={avgVolume} stroke="#0f766e" strokeDasharray="5 5" label={{ position: 'top', value: `Moyenne (${avgVolume} kg)`, fill: '#0f766e', fontSize: 10, fontWeight: 'bold' }} />
                    
                    <Bar dataKey="volume" name="Tonnage (kg)" fill="url(#colorTeal)" radius={[6, 6, 0, 0]} />
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

        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
            <CardTitle className="flex items-center text-lg font-black text-zinc-900 dark:text-zinc-100"><Target className="h-5 w-5 text-indigo-500 mr-2" /> {txt.progEx}</CardTitle>
            <div className="w-full sm:w-64">
              <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                <SelectTrigger className="dark:bg-zinc-950 font-bold dark:border-zinc-800 dark:text-zinc-100"><SelectValue placeholder={txt.selectEx} /></SelectTrigger>
                <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800 max-h-64 font-bold">
                  {data.exerciseList.map((ex: any) => <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
                    <Area type="monotone" dataKey="e1RM" stroke="#8b5cf6" strokeWidth={4} fill="url(#color1RM)" activeDot={{ r: 6 } as any} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 md:col-span-2">
          <CardHeader><CardTitle className="flex items-center text-lg font-black text-zinc-900 dark:text-zinc-100"><Ruler className="h-5 w-5 text-purple-500 mr-2" /> {txt.measTitle}</CardTitle><CardDescription className="font-medium text-zinc-500">{txt.measSub}</CardDescription></CardHeader>
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
                    <Line hide={hiddenMeas.waist} type="monotone" dataKey="waist" name={lang==='FR'?"Taille":"Waist"} stroke="#ef4444" strokeWidth={4} dot={{ r: 4, fill: '#ef4444' } as any} />
                    <Line hide={hiddenMeas.arms} type="monotone" dataKey="arms" name={lang==='FR'?"Bras":"Arms"} stroke="#f59e0b" strokeWidth={4} dot={{ r: 4, fill: '#f59e0b' } as any} />
                    <Line hide={hiddenMeas.chest} type="monotone" dataKey="chest" name={lang==='FR'?"Poitrine":"Chest"} stroke="#10b981" strokeWidth={4} dot={{ r: 4, fill: '#10b981' } as any} />
                    <Line hide={hiddenMeas.thighs} type="monotone" dataKey="thighs" name={lang==='FR'?"Cuisses":"Thighs"} stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, fill: '#3b82f6' } as any} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
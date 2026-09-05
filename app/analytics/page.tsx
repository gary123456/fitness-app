"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, TrendingDown, Dumbbell, Target, Ruler } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";

const fetchAnalyticsData = async (lang: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user");

  const { data: measurements } = await supabase.from("measurements").select("*").eq("user_id", user.id).order("created_at", { ascending: true });
  let formattedWeight: any[] = [];
  let formattedMeasurements: any[] = [];

  if (measurements) {
    formattedWeight = measurements.map(m => ({ date: new Date(m.created_at).toLocaleDateString(lang === 'FR' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short' }), poids: m.weight_kg }));
    
    // MENSURATIONS DATA (Ignorer les entrées vides)
    formattedMeasurements = measurements.map(m => ({
      date: new Date(m.created_at).toLocaleDateString(lang === 'FR' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short' }),
      arms: m.arms_cm ? Number(m.arms_cm) : null, 
      chest: m.chest_cm ? Number(m.chest_cm) : null, 
      waist: m.waist_cm ? Number(m.waist_cm) : null, 
      thighs: m.thighs_cm ? Number(m.thighs_cm) : null
    })).filter(m => m.arms || m.chest || m.waist || m.thighs);
  }

  const { data: logs } = await supabase.from("workout_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: true });
  const { data: library } = await supabase.from("exercise_library").select("id, name");

  const volByDate: Record<string, number> = {};
  const exData: Record<string, any[]> = {};
  const exSet = new Set<string>();
  const best1RMs: Record<string, number> = { "Squat": 0, "Bench": 0, "Deadlift": 0 };
  let availableList: {id: string, name: string}[] = [];

  if (logs && library) {
    const libMap: Record<string, string> = {};
    library.forEach(ex => libMap[ex.id] = ex.name);

    logs.forEach(log => {
      const dateStr = new Date(log.created_at).toLocaleDateString(lang === 'FR' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short' });
      const weight = log.weight || 0;
      const reps = log.reps || 0;
      
      volByDate[dateStr] = (volByDate[dateStr] || 0) + (weight * reps);

      const e1RM = (reps > 0 && reps <= 12) ? weight * (36 / (37 - reps)) : weight;
      const exName = libMap[log.exercise_id];

      if (exName) {
        exSet.add(log.exercise_id);
        if (!exData[log.exercise_id]) exData[log.exercise_id] = [];
        
        const existingDay = exData[log.exercise_id].find(d => d.date === dateStr);
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
        if (nameLower.includes("squat barre")) best1RMs["Squat"] = Math.max(best1RMs["Squat"], e1RM);
        if (nameLower.includes("couché barre") || nameLower.includes("bench press")) best1RMs["Bench"] = Math.max(best1RMs["Bench"], e1RM);
        if (nameLower.includes("terre classique") || nameLower.includes("deadlift")) best1RMs["Deadlift"] = Math.max(best1RMs["Deadlift"], e1RM);
      }
    });

    availableList = Array.from(exSet).map(id => ({ id, name: libMap[id] }));
    availableList.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  return { formattedWeight, formattedMeasurements, formattedVolume: Object.keys(volByDate).map(date => ({ date, volume: volByDate[date] })), exercisesData: exData, max1RMs: { "Squat": Number(best1RMs["Squat"].toFixed(1)), "Bench": Number(best1RMs["Bench"].toFixed(1)), "Deadlift": Number(best1RMs["Deadlift"].toFixed(1)) }, exerciseList: availableList };
};

export default function AnalyticsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const { data, error, isLoading } = useSWR('analyticsData', () => fetchAnalyticsData(lang));
  
  const [selectedExercise, setSelectedExercise] = useState<string>("");

  // STATE POUR LA LÉGENDE INTERACTIVE DES MENSURATIONS
  const [hiddenMeas, setHiddenMeas] = useState<Record<string, boolean>>({
    arms: false, chest: false, waist: false, thighs: false
  });

  useEffect(() => {
    if (data?.exerciseList && data.exerciseList.length > 0 && !selectedExercise) setSelectedExercise(data.exerciseList[0].id);
  }, [data, selectedExercise]);

  useEffect(() => {
    if (error) {
      router.push("/login");
    }
  }, [error, router]);

  const t = {
    FR: { title: "Performances & Évolution", sub: "Visualisez votre progression biométrique et analytique.", weightTitle: "Poids Corporel", weightSub: "Évolution en kg", volTitle: "Tonnage Global", volSub: "Charge totale par séance", empty: "Pas de données.", loading: "Analyse...", selectEx: "Sélectionner un exercice", progEx: "Progression Force (1RM)", bench: "Couché", squat: "Squat", deadlift: "Soulevé", measTitle: "Mensurations", measSub: "Évolution en cm" },
    EN: { title: "Performance & Evolution", sub: "Visualize your biometric and analytical progress.", weightTitle: "Bodyweight", weightSub: "Evolution in kg", volTitle: "Global Tonnage", volSub: "Total load per session", empty: "No data yet.", loading: "Analyzing...", selectEx: "Select an exercise", progEx: "Strength Progression (1RM)", bench: "Bench", squat: "Squat", deadlift: "Deadlift", measTitle: "Measurements", measSub: "Evolution in cm" }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

  const handleLegendClick = (e: any) => {
    const dataKey = e.dataKey as string;
    setHiddenMeas(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  };

  const renderLegendText = (value: string, entry: any) => {
    const isHidden = hiddenMeas[entry.dataKey];
    return <span style={{ color: isHidden ? '#71717a' : entry.color, textDecoration: isHidden ? 'line-through' : 'none', transition: 'all 0.3s' }}>{value}</span>;
  };

  if (isLoading && !data) return <div className="flex min-h-[80vh] items-center justify-center font-bold text-teal-500 animate-pulse">{txt.loading}</div>;
  if (!data) return null;

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full relative pb-24">
      <div className="flex flex-col space-y-2"><h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center"><Activity className="w-8 h-8 mr-3 text-teal-500" /> {txt.title}</h2><p className="text-zinc-500 dark:text-zinc-400 font-medium">{txt.sub}</p></div>

      <div className="grid gap-4 grid-cols-3">
        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"><CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold text-zinc-500 uppercase">{txt.squat} 1RM</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400">{data.max1RMs["Squat"] || 0} <span className="text-xs sm:text-sm text-zinc-400">kg</span></div></CardContent></Card>
        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"><CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold text-zinc-500 uppercase">{txt.bench} 1RM</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">{data.max1RMs["Bench"] || 0} <span className="text-xs sm:text-sm text-zinc-400">kg</span></div></CardContent></Card>
        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"><CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold text-zinc-500 uppercase">{txt.deadlift} 1RM</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-xl sm:text-2xl font-black text-orange-600 dark:text-orange-400">{data.max1RMs["Deadlift"] || 0} <span className="text-xs sm:text-sm text-zinc-400">kg</span></div></CardContent></Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader><CardTitle className="flex items-center text-lg text-zinc-900 dark:text-zinc-100"><TrendingDown className="h-5 w-5 text-blue-500 mr-2" /> {txt.weightTitle}</CardTitle><CardDescription>{txt.weightSub}</CardDescription></CardHeader>
          <CardContent>
            {data.formattedWeight.length < 2 ? <div className="h-[250px] flex items-center justify-center text-zinc-400 font-medium">{txt.empty}</div> : (
              <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.formattedWeight}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#52525b" opacity={0.2} vertical={false} />
                    <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#3b82f6' }} />
                    <Line type="monotone" dataKey="poids" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2 } as any} activeDot={{ r: 6 } as any} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader><CardTitle className="flex items-center text-lg text-zinc-900 dark:text-zinc-100"><Ruler className="h-5 w-5 text-purple-500 mr-2" /> {txt.measTitle}</CardTitle><CardDescription>{txt.measSub}</CardDescription></CardHeader>
          <CardContent>
            {data.formattedMeasurements.length < 2 ? <div className="h-[250px] flex items-center justify-center text-zinc-400 font-medium">{txt.empty}</div> : (
              <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.formattedMeasurements}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#52525b" opacity={0.2} vertical={false} />
                    <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    {/* DOMAIN EN AUTO POUR QUE LES PETITES VARIATIONS SOIENT VISIBLES */}
                    <YAxis domain={['auto', 'auto']} stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    <Legend onClick={handleLegendClick} formatter={renderLegendText} wrapperStyle={{ cursor: 'pointer', fontSize: '12px', paddingTop: '10px' }} />
                    <Line hide={hiddenMeas.waist} type="monotone" dataKey="waist" name={lang==='FR'?"Taille":"Waist"} stroke="#ef4444" strokeWidth={3} dot={{ r: 3 } as any} />
                    <Line hide={hiddenMeas.arms} type="monotone" dataKey="arms" name={lang==='FR'?"Bras":"Arms"} stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 } as any} />
                    <Line hide={hiddenMeas.chest} type="monotone" dataKey="chest" name={lang==='FR'?"Poitrine":"Chest"} stroke="#10b981" strokeWidth={3} dot={{ r: 3 } as any} />
                    <Line hide={hiddenMeas.thighs} type="monotone" dataKey="thighs" name={lang==='FR'?"Cuisses":"Thighs"} stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 } as any} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader><CardTitle className="flex items-center text-lg text-zinc-900 dark:text-zinc-100"><Dumbbell className="h-5 w-5 text-teal-500 mr-2" /> {txt.volTitle}</CardTitle><CardDescription>{txt.volSub}</CardDescription></CardHeader>
          <CardContent>
            {data.formattedVolume.length === 0 ? <div className="h-[250px] flex items-center justify-center text-zinc-400 font-medium">{txt.empty}</div> : (
              <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.formattedVolume}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#52525b" opacity={0.2} vertical={false} />
                    <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#14b8a6' }} cursor={{ fill: '#27272a', opacity: 0.4 }} />
                    <Bar dataKey="volume" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
            <CardTitle className="flex items-center text-lg text-zinc-900 dark:text-zinc-100"><Target className="h-5 w-5 text-indigo-500 mr-2" /> {txt.progEx}</CardTitle>
            <div className="w-full sm:w-64">
              <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                <SelectTrigger className="dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100"><SelectValue placeholder={txt.selectEx} /></SelectTrigger>
                <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800 max-h-64">
                  {data.exerciseList.map((ex: any) => <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedExercise || !data.exercisesData[selectedExercise] || data.exercisesData[selectedExercise].length < 1 ? (
              <div className="h-[300px] flex items-center justify-center text-zinc-400 font-medium">{txt.empty}</div>
            ) : (
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.exercisesData[selectedExercise]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#52525b" opacity={0.2} vertical={false} />
                    <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis domain={['auto', 'auto']} stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#8b5cf6' }} formatter={(value: any, name: any, props: any) => [`${value} kg (via ${props.payload.weight}kg x ${props.payload.reps})`, '1RM Estimé']} />
                    <Line type="monotone" dataKey="e1RM" stroke="#8b5cf6" strokeWidth={4} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2 } as any} activeDot={{ r: 6 } as any} />
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
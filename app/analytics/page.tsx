"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, TrendingDown, Dumbbell } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [weightData, setWeightData] = useState<any[]>([]);
  const [volumeData, setVolumeData] = useState<any[]>([]);
  const { lang } = useLanguage();

  const t = {
    FR: { title: "Performances & Évolution", sub: "Visualisez votre progression biométrique et votre volume d'entraînement.", weightTitle: "Évolution du Poids Corporel", weightSub: "Mesuré en kg", volTitle: "Volume d'Entraînement", volSub: "Tonnage total soulevé par séance (Séries × Reps × Poids)", empty: "Pas encore assez de données enregistrées.", loading: "Analyse des données..." },
    EN: { title: "Performance & Evolution", sub: "Visualize your biometric progress and training volume.", weightTitle: "Bodyweight Evolution", weightSub: "Measured in kg", volTitle: "Training Volume", volSub: "Total tonnage lifted per session (Sets × Reps × Weight)", empty: "Not enough data recorded yet.", loading: "Analyzing data..." }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // 1. Récupération des mesures de poids
      const { data: measurements } = await supabase
        .from("measurements")
        .select("created_at, weight_kg")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (measurements) {
        const formattedWeight = measurements.map(m => ({
          date: new Date(m.created_at).toLocaleDateString(lang === 'FR' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short' }),
          poids: m.weight_kg
        }));
        setWeightData(formattedWeight);
      }

      // 2. Récupération des logs pour le Tonnage (Force globale)
      const { data: logs } = await supabase
        .from("workout_logs")
        .select("created_at, weight, reps")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (logs) {
        const volumeByDate = logs.reduce((acc: any, log: any) => {
          const dateStr = new Date(log.created_at).toLocaleDateString(lang === 'FR' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short' });
          const volume = (log.weight || 0) * (log.reps || 0);
          if (!acc[dateStr]) acc[dateStr] = 0;
          acc[dateStr] += volume;
          return acc;
        }, {});

        const formattedVolume = Object.keys(volumeByDate).map(date => ({
          date,
          volume: volumeByDate[date]
        }));
        setVolumeData(formattedVolume);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex min-h-[80vh] items-center justify-center font-bold text-teal-500 animate-pulse">{txt.loading}</div>;

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full relative">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
          <Activity className="w-8 h-8 mr-3 text-teal-500" /> {txt.title}
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">{txt.sub}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        
        {/* GRAPHIQUE 1 : ÉVOLUTION DU POIDS */}
        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-zinc-900 dark:text-zinc-100">
              <TrendingDown className="h-5 w-5 text-blue-500 mr-2" />
              {txt.weightTitle}
            </CardTitle>
            <CardDescription>{txt.weightSub}</CardDescription>
          </CardHeader>
          <CardContent>
            {weightData.length < 2 ? (
              <div className="h-[300px] flex items-center justify-center text-zinc-400 font-medium border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl">
                {txt.empty}
              </div>
            ) : (
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#52525b" opacity={0.2} vertical={false} />
                    <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold' }}
                      itemStyle={{ color: '#3b82f6' }}
                    />
                    <Line type="monotone" dataKey="poids" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* GRAPHIQUE 2 : VOLUME D'ENTRAÎNEMENT */}
        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-zinc-900 dark:text-zinc-100">
              <Dumbbell className="h-5 w-5 text-teal-500 mr-2" />
              {txt.volTitle}
            </CardTitle>
            <CardDescription>{txt.volSub}</CardDescription>
          </CardHeader>
          <CardContent>
            {volumeData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-zinc-400 font-medium border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl">
                {txt.empty}
              </div>
            ) : (
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#52525b" opacity={0.2} vertical={false} />
                    <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold' }}
                      itemStyle={{ color: '#14b8a6' }}
                      cursor={{ fill: '#27272a', opacity: 0.4 }}
                    />
                    <Bar dataKey="volume" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
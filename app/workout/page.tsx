"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Dumbbell, Clock, Repeat, Play, Target, ArrowLeftRight, Info, CalendarCheck, BatteryCharging, Lock, RefreshCw } from "lucide-react";
import { generateSmartWorkoutPlan } from "@/lib/workout-generator";
import { useLanguage } from "@/lib/useLanguage";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const getInstructions = (name: string, lang: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('squat') || lowerName.includes('presse') || lowerName.includes('leg press')) return lang === 'FR' ? "Gardez le buste droit et le regard fixe.\nVerrouillez le gainage.\nDescendez en contrôlant la charge.\nPoussez fort sur vos talons pour remonter." : "Keep your chest up and eyes forward.\nBrace your core.\nDescend under control.\nDrive explosively through your heels to ascend.";
  if (lowerName.includes('fente') || lowerName.includes('lunge') || lowerName.includes('bulgare')) return lang === 'FR' ? "Gardez le torse droit.\nLe genou avant doit rester dans l'axe de l'orteil.\nDescendez jusqu'à frôler le sol avec le genou arrière." : "Keep your torso upright.\nYour front knee should track over your toes.\nLower yourself until your back knee gently taps the floor.";
  if (lowerName.includes('soulevé de terre') || lowerName.includes('deadlift') || lowerName.includes('rdl')) return lang === 'FR' ? "Maintenez le dos droit.\nGardez la charge collée à vos tibias.\nPoussez le sol avec vos jambes et contractez les fessiers en haut." : "Maintain a straight back.\nKeep the weight close to your shins.\nPush the floor away with your legs and squeeze your glutes at the top.";
  if (lowerName.includes('couché') || lowerName.includes('bench') || lowerName.includes('floor press')) return lang === 'FR' ? "Rétractez vos omoplates contre le banc.\nContrôlez la descente de la charge.\nPoussez de manière explosive." : "Retract your scapula against the bench.\nControl the descent of the weight.\nPush explosively.";
  if (lowerName.includes('pompe') || lowerName.includes('push-up') || lowerName.includes('dips')) return lang === 'FR' ? "Maintenez un gainage actif.\nDescendez en contrôlant le mouvement.\nPoussez fort pour revenir en position initiale." : "Maintain an active core.\nLower yourself under control.\nPush strongly to the starting position.";
  if (lowerName.includes('militaire') || lowerName.includes('ohp') || lowerName.includes('shoulder press')) return lang === 'FR' ? "Contractez les fessiers et les abdos.\nPoussez la charge au-dessus de la tête.\nRedescendez en contrôlant." : "Squeeze your glutes and abs.\nPress the weight overhead.\nLower the weight under control.";
  if (lowerName.includes('traction') || lowerName.includes('pull-up') || lowerName.includes('pulldown')) return lang === 'FR' ? "Démarrez avec un étirement complet.\nTirez en cherchant à amener la poitrine vers la barre.\nContrôlez la descente." : "Start with a full stretch.\nPull by trying to bring your chest to the bar.\nControl the eccentric descent.";
  if (lowerName.includes('rowing') || lowerName.includes('tirage horizontal') || lowerName.includes('t-bar')) return lang === 'FR' ? "Gardez le dos droit.\nTirez la charge vers votre nombril en resserrant les omoplates." : "Keep your back straight.\nPull the weight towards your belly button while squeezing your shoulder blades.";
  if (lowerName.includes('curl')) return lang === 'FR' ? "Gardez les coudes fixés près du corps.\nContractez fort le biceps en haut du mouvement." : "Keep your elbows pinned to your sides.\nSqueeze the bicep hard at the top.";
  if (lowerName.includes('triceps') || lowerName.includes('skullcrusher') || lowerName.includes('kickback')) return lang === 'FR' ? "Gardez les coudes serrés et immobiles.\nEffectuez une extension complète." : "Keep your elbows tucked and stationary.\nPerform a full extension.";
  return lang === 'FR' ? "Maintenez une posture stable et un bon gainage.\nContrôlez la phase excentrique.\nSoyez explosif sur la phase concentrique." : "Maintain a stable posture and brace your core.\nControl the eccentric phase.\nBe explosive on the concentric phase.";
};

const SPORT_LABELS: Record<string, string> = { jjb: "JJB / MMA", football: "Football", basketball: "Basketball", running: "Running", natation: "Natation", cyclisme: "Cyclisme", randonnee: "Randonnée", padel_tennis: "Padel / Tennis" };

const fetchProgramData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) throw new Error("No profile");
  
  const { data: existingProgram } = await supabase.from("user_programs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single();

  let weeklyPlan = [];
  let isDeloadWeek = false;

  if (existingProgram) {
    const { data: sessions } = await supabase.from("workout_sessions").select(`*, workout_exercises (*, exercise_library (*))`).eq("program_id", existingProgram.id).order("order_index", { ascending: true });
    if (sessions) {
      sessions.forEach(session => { if (session.workout_exercises) session.workout_exercises.sort((a: any, b: any) => a.order_index - b.order_index); });
      weeklyPlan = sessions;
      isDeloadWeek = sessions.some(s => s.workout_exercises?.some((we:any) => we.target_reps?.includes("Léger")));
    }
  }
  return { profile, weeklyPlan, isDeloadWeek, existingProgram };
};

export default function WorkoutPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const { data, error, mutate, isLoading } = useSWR('workoutData', fetchProgramData);

  const [generating, setGenerating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showNewCycleModal, setShowNewCycleModal] = useState(false);
  
  const [swapModal, setSwapModal] = useState({ show: false, weId: "", currentEx: null as any, alternatives: [] as any[] });
  const [swapLoading, setSwapLoading] = useState(false);
  const [infoModal, setInfoModal] = useState({ show: false, exercise: null as any });

  // LOGIQUE DE DÉCALAGE DYNAMIQUE DE LA SEMAINE (Aujourd'hui = Premier)
  const currentJsDay = new Date().getDay();
  const jsToOrdered = [6, 0, 1, 2, 3, 4, 5]; // Dimanche=6, Lundi=0...
  const todayOrderedIndex = jsToOrdered[currentJsDay];
  
  const DAYS_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const todayKey = DAYS_ORDER[todayOrderedIndex];

  // Crée un tableau trié dynamiquement commençant par aujourd'hui
  const dynamicDaysOrder = [...DAYS_ORDER.slice(todayOrderedIndex), ...DAYS_ORDER.slice(0, todayOrderedIndex)];

  type TranslationDict = Record<string, string>;
  const t: Record<string, TranslationDict> = {
    FR: { title: "Mon Programme d'Entraînement", sub: "Hybride, auto-régulé et adapté à votre calendrier.", genNext: "Semaine Suivante", newCycle: "Nouveau Cycle (Changer d'exos)", rest: "Repos Total", start: "Démarrer la séance", locked: "Prévu le", sets: "séries", target: "Objectif", bw: "Poids du corps", modalTitle: "Générer la suite ?", modalSub: "Cette action mettra à jour vos charges selon vos dernières performances.", cycleTitle: "Générer un Nouveau Cycle ?", cycleSub: "L'algorithme va bannir temporairement vos exercices actuels pour vous en proposer de nouveaux et éviter la stagnation nerveuse.", cancel: "Annuler", confirm: "Confirmer", swapTitle: "Remplacer l'exercice", swapSub: "Alternatives compatibles avec votre matériel :", noAlt: "Aucune alternative disponible.", select: "Choisir", today: "Aujourd'hui", deloadBadge: "Semaine de Délestage", deloadSub: "L'algorithme a réduit le volume et l'intensité de 20% pour dissiper votre fatigue articulaire.", noProg: "Aucun programme en cours. Cliquez pour générer votre première semaine d'entraînement." },
    EN: { title: "My Training Program", sub: "Hybrid, auto-regulated and adapted to your schedule.", genNext: "Next Week", newCycle: "New Cycle (Swap Exos)", rest: "Total Rest", start: "Start Workout", locked: "Scheduled", sets: "sets", target: "Target", bw: "Bodyweight", modalTitle: "Generate next week?", modalSub: "This action will update your weights based on recent performance.", cycleTitle: "Generate New Cycle?", cycleSub: "The algorithm will temporarily ban your current exercises to propose new ones and prevent CNS stagnation.", cancel: "Cancel", confirm: "Confirm", swapTitle: "Swap Exercise", swapSub: "Alternatives matching your equipment:", noAlt: "No alternatives available.", select: "Select", today: "Today", deloadBadge: "Deload Week", deloadSub: "The algorithm reduced volume and intensity by 20% to dissipate joint fatigue.", noProg: "No active program found. Click to generate your first training week." }
  };
  const txt = t[lang as keyof typeof t] || t.FR;
  const DAYS = lang === "FR" ? { monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi", sunday: "Dimanche" } : { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };

  if (error) router.push("/login");

  const generateProgram = async (isNewCycle: boolean = false) => {
    if (!data?.profile) return;
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: library } = await supabase.from("exercise_library").select("*");
      const { data: historyLogs } = await supabase.from("workout_logs").select("*").eq("user_id", user.id);
      
      let excludedIds: string[] = [];
      let deloadFlag = false;

      if (data.existingProgram) {
        const { data: currentSessions } = await supabase.from("workout_sessions").select(`id, workout_exercises (exercise_id)`).eq("program_id", data.existingProgram.id);
        if (currentSessions && historyLogs) {
           const sessionIds = currentSessions.map(s => s.id);
           const logsForCurrentProgram = historyLogs.filter(log => sessionIds.includes(log.session_id));
           if (logsForCurrentProgram.length > 20 && !isNewCycle) deloadFlag = true;
           if (isNewCycle) {
              const oldIds = new Set<string>();
              currentSessions.forEach(s => s.workout_exercises?.forEach((we:any) => oldIds.add(we.exercise_id)));
              excludedIds = Array.from(oldIds);
           }
        }
        await supabase.from("user_programs").delete().eq("user_id", user.id);
      }

      const generatedPlan = generateSmartWorkoutPlan(data.profile, library || [], historyLogs || [], deloadFlag, excludedIds);

      const { data: newProgram } = await supabase.from("user_programs").insert([{ user_id: user.id, name: `Programme - ${data.profile.current_goal}` }]).select().single();
      
      let orderIndex = 0;
      for (const day of generatedPlan) {
        const { data: newSession } = await supabase.from("workout_sessions").insert([{ program_id: newProgram.id, day_name: day.day, order_index: orderIndex }]).select().single();
        const exercisesToInsert = day.exercises.map((ex: any) => ({ session_id: newSession.id, exercise_id: ex.exercise.id, sets: ex.sets, target_reps: ex.target_reps, recommended_weight: ex.recommended_weight, rest_seconds: ex.rest_seconds, order_index: ex.order_index }));
        if (exercisesToInsert.length > 0) await supabase.from("workout_exercises").insert(exercisesToInsert);
        orderIndex++;
      }
      
      await mutate(); 
      setShowConfirmModal(false);
      setShowNewCycleModal(false);
    } catch (error) { console.error(error); } finally { setGenerating(false); }
  };

  const openSwapModal = async (weId: string, currentEx: any) => {
    if (!data?.profile) return;
    setSwapLoading(true);
    const { data: alts } = await supabase.from('exercise_library').select('*').eq('movement_pattern', currentEx.movement_pattern).neq('id', currentEx.id);
    const userEq = data.profile.equipment_access.split(',').map((e: string) => e.trim());
    const validAlts = (alts || []).filter((ex: any) => userEq.includes(ex.equipment_required));
    setSwapModal({ show: true, weId, currentEx, alternatives: validAlts });
    setSwapLoading(false);
  };

  const confirmSwap = async (newEx: any) => {
    await supabase.from('workout_exercises').update({ exercise_id: newEx.id }).eq('id', swapModal.weId);
    await mutate();
    setSwapModal({ show: false, weId: "", currentEx: null, alternatives: [] });
  };

  if (isLoading && !data) return <div className="flex min-h-[80vh] items-center justify-center"><div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>;
  
  if (!data?.weeklyPlan || data.weeklyPlan.length === 0) return (
    <div className="flex flex-col min-h-[80vh] items-center justify-center space-y-6 px-4 text-center">
      <Dumbbell className="w-20 h-20 text-zinc-300 dark:text-zinc-700" />
      <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{txt.noProg}</h2>
      <Button onClick={() => generateProgram(false)} disabled={generating} className="bg-teal-500 hover:bg-teal-600 text-white font-bold h-12 px-8 text-lg">
        {generating ? "..." : "Générer"}
      </Button>
    </div>
  );

  const weeklySchedule = data.profile.weekly_schedule || {};

  // TRI DYNAMIQUE DE LA SEMAINE
  const sortedPlan = [...data.weeklyPlan].sort((a: any, b: any) => {
    return dynamicDaysOrder.indexOf(a.day_name) - dynamicDaysOrder.indexOf(b.day_name);
  });

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-5xl mx-auto w-full relative pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div><h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{txt.title}</h2><p className="text-zinc-500 dark:text-zinc-400 font-medium">{txt.sub}</p></div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button onClick={() => setShowNewCycleModal(true)} variant="outline" className="w-full sm:w-auto border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-bold"><RefreshCw className="w-4 h-4 mr-2" /> {txt.newCycle}</Button>
          <Button onClick={() => setShowConfirmModal(true)} className="w-full sm:w-auto bg-teal-500 text-white hover:bg-teal-600 font-bold"><Repeat className="w-4 h-4 mr-2" /> {txt.genNext}</Button>
        </div>
      </div>

      {data.isDeloadWeek && (
        <div className="bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 p-4 rounded-xl flex items-start space-x-3">
          <BatteryCharging className="w-6 h-6 text-blue-500 shrink-0" />
          <div><h4 className="font-bold text-blue-700 dark:text-blue-400">{txt.deloadBadge}</h4><p className="text-sm text-blue-600 dark:text-blue-300 font-medium">{txt.deloadSub}</p></div>
        </div>
      )}

      <div className="space-y-6">
        {sortedPlan.map((session: any) => {
          const dayKey = session.day_name;
          const sessionDayIndex = DAYS_ORDER.indexOf(dayKey);
          
          // VERROUILLAGE (Vérifie la chronologie par rapport à aujourd'hui)
          const isFuture = dynamicDaysOrder.indexOf(dayKey) > dynamicDaysOrder.indexOf(todayKey);

          const externalSports = weeklySchedule[dayKey] || [];
          const hasLifting = session.workout_exercises && session.workout_exercises.length > 0;
          const isRestDay = !hasLifting && externalSports.length === 0;
          const isToday = dayKey === todayKey;

          return (
            <Card key={session.id} className={`transition-all duration-300 relative overflow-hidden ${isToday ? 'border-teal-500 shadow-[0_10px_40px_-10px_rgba(20,184,166,0.4)] ring-2 ring-teal-500/50 bg-gradient-to-b from-white to-teal-50/20 dark:from-zinc-950 dark:to-teal-950/20 scale-[1.02] z-10' : isRestDay ? 'shadow-sm border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 opacity-80 hover:opacity-100' : 'shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'}`}>
              {isToday && <div className="absolute top-0 right-0 bg-teal-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-lg flex items-center shadow-sm"><span className="flex h-1.5 w-1.5 rounded-full bg-white mr-2 animate-pulse"></span><CalendarCheck className="w-3 h-3 mr-1" /> {txt.today}</div>}
              <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <CardTitle className={`text-lg font-bold w-28 ${isToday ? 'text-teal-700 dark:text-teal-400' : 'text-zinc-800 dark:text-zinc-100'}`}>{DAYS[dayKey as keyof typeof DAYS]}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {externalSports.map((sport: string) => (<span key={sport} className="px-2.5 py-1 text-xs font-bold rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 flex items-center"><Activity className="w-3 h-3 mr-1" /> {SPORT_LABELS[sport] || sport}</span>))}
                    {isRestDay && <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{txt.rest}</span>}
                  </div>
                </div>
                {hasLifting && (
                  isFuture ? (
                    <Button size="sm" disabled className="font-bold bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600 border-none">
                      <Lock className="w-4 h-4 mr-2" /> {txt.locked}
                    </Button>
                  ) : (
                    <Link href={`/workout/${session.id}`}>
                      <Button size="sm" className={`font-bold shadow-sm ${isToday ? 'bg-teal-500 hover:bg-teal-600 text-white shadow-teal-500/30' : 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900'}`}>
                        <Play className="w-4 h-4 mr-2" /> {txt.start}
                      </Button>
                    </Link>
                  )
                )}
              </CardHeader>
              
              {hasLifting && (
                <CardContent className="pt-4">
                  <div className={`space-y-3 ${isFuture ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                    {session.workout_exercises.map((we: any, index: number) => {
                      const ex = we.exercise_library;
                      const uniqueKey = we.id || `we-${session.id}-${index}`;
                      const thumbnailUrl = ex.gif_url ? (ex.gif_url.endsWith('.jpg') ? ex.gif_url : `${ex.gif_url}/0.jpg`) : null;

                      return (
                        <div key={uniqueKey} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-colors ${isToday ? 'border-teal-100 dark:border-teal-900/50 bg-white/50 dark:bg-zinc-950/50 hover:bg-white dark:hover:bg-zinc-900' : 'border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'}`}>
                          <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                            <div className="h-12 w-12 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-zinc-200 dark:border-zinc-700 relative p-1">
                              {thumbnailUrl ? <img src={thumbnailUrl} alt={ex.name} className="h-full w-full object-contain absolute inset-0 z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : null}
                              <Dumbbell className="h-6 w-6 text-zinc-400 absolute z-0" />
                            </div>
                            <div className="flex items-start">
                              <div><h4 className={`font-bold text-sm ${isToday ? 'text-zinc-900 dark:text-teal-50' : 'text-zinc-900 dark:text-zinc-100'}`}>{ex.name}</h4><p className="text-xs text-zinc-500 font-medium">{ex.target_muscle} • {ex.equipment_required.replace('_', ' ')}</p></div>
                              <button onClick={() => setInfoModal({ show: true, exercise: ex })} className="ml-2 mt-0.5 p-1 text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400 rounded-full hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"><Info className="w-4 h-4" /></button>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm mt-2 sm:mt-0">
                            {we.recommended_weight !== null && we.recommended_weight !== undefined && (
                              <div className="flex items-center text-teal-700 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-900/40 px-3 py-1 rounded border border-teal-200 dark:border-teal-800"><Target className="w-4 h-4 mr-1.5" /> {we.recommended_weight > 0 ? `${we.recommended_weight} kg` : txt.bw}</div>
                            )}
                            <div className="flex items-center text-zinc-700 dark:text-zinc-300 font-bold bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded"><Repeat className="w-4 h-4 mr-2 text-zinc-500" /> {we.sets} {txt.sets} × {we.target_reps}</div>
                            <div className="flex items-center text-zinc-500 font-medium"><Clock className="w-4 h-4 mr-1.5" />{we.rest_seconds}s</div>
                            <button onClick={() => openSwapModal(we.id, ex)} disabled={swapLoading} className="p-1.5 ml-2 text-zinc-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-md transition-colors"><ArrowLeftRight className="w-5 h-5" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={infoModal.show} onOpenChange={(open) => !open && setInfoModal({ show: false, exercise: null })}>
        <DialogContent className="sm:max-w-[700px] flex flex-col p-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          {infoModal.exercise && (
            <>
              <DialogHeader className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900"><DialogTitle className="text-xl font-black dark:text-zinc-50">{infoModal.exercise.name}</DialogTitle></DialogHeader>
              <div className="flex-1 p-4 md:p-6 overflow-y-auto max-h-[75vh]">
                <div className="space-y-6">
                  {infoModal.exercise.gif_url ? (
                    <div className="flex flex-col sm:flex-row items-stretch justify-center gap-4 w-full">
                      <div className="flex-1 bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col"><div className="bg-zinc-100/80 px-3 py-2 border-b border-zinc-200 text-[10px] font-black text-zinc-500 text-center uppercase tracking-widest">{lang === 'FR' ? "Position de départ" : "Starting Position"}</div><div className="p-4 flex justify-center items-center h-48 md:h-64"><img src={`${infoModal.exercise.gif_url}/0.jpg`} alt="Départ" className="max-w-full max-h-full object-contain" loading="lazy" /></div></div>
                      <div className="flex-1 bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col"><div className="bg-zinc-100/80 px-3 py-2 border-b border-zinc-200 text-[10px] font-black text-zinc-500 text-center uppercase tracking-widest">{lang === 'FR' ? "Contraction" : "Contraction"}</div><div className="p-4 flex justify-center items-center h-48 md:h-64"><img src={`${infoModal.exercise.gif_url}/1.jpg`} alt="Fin" className="max-w-full max-h-full object-contain" loading="lazy" /></div></div>
                    </div>
                  ) : (<div className="flex flex-col items-center justify-center min-h-[200px] text-zinc-400 dark:text-zinc-600 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800"><Dumbbell className="w-12 h-12 mb-3 opacity-50" /><p className="text-sm font-bold">{lang === 'FR' ? "Aucun visuel disponible." : "No visual available."}</p></div>)}
                  <div className="bg-white dark:bg-zinc-900/50 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm"><h4 className="flex items-center text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2"><Info className="w-4 h-4 mr-2 text-teal-500" />{lang === 'FR' ? "Consignes d'exécution" : "Execution Guidelines"}</h4><ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 font-medium">{getInstructions(infoModal.exercise.name, lang).split('\n').map((line: string, i: number) => (<li key={i} className="flex items-start"><span className="text-teal-500 mr-2 mt-0.5">•</span><span className="leading-relaxed">{line}</span></li>))}</ul></div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={swapModal.show} onOpenChange={(open) => !open && setSwapModal({ show: false, weId: "", currentEx: null, alternatives: [] })}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader><DialogTitle className="flex items-center dark:text-zinc-100"><ArrowLeftRight className="w-5 h-5 mr-2 text-teal-500"/> {txt.swapTitle}</DialogTitle><DialogDescription className="text-zinc-500 dark:text-zinc-400">{txt.swapSub} <span className="font-bold text-teal-600">{swapModal.currentEx?.target_muscle}</span></DialogDescription></DialogHeader>
          <div className="space-y-3 mt-4 max-h-[50vh] overflow-y-auto pr-2">
            {swapModal.alternatives.length === 0 ? <div className="text-center p-4 text-zinc-500 bg-zinc-50 dark:bg-zinc-900 rounded-lg">{txt.noAlt}</div> : (
              swapModal.alternatives.map((alt) => {
                const altThumbnailUrl = alt.gif_url ? (alt.gif_url.endsWith('.jpg') ? alt.gif_url : `${alt.gif_url}/0.jpg`) : null;
                return (
                  <div key={alt.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-teal-500 dark:hover:border-teal-500 transition-colors bg-zinc-50 dark:bg-zinc-900">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-white rounded flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-zinc-200 dark:border-zinc-700 relative p-1">
                        {altThumbnailUrl ? <img src={altThumbnailUrl} alt={alt.name} className="h-full w-full object-contain absolute inset-0 z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : null}<Dumbbell className="h-5 w-5 text-zinc-400 absolute z-0" />
                      </div>
                      <div><h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{alt.name}</h4><p className="text-xs text-zinc-500">{alt.equipment_required.replace('_', ' ')} • Impact SNC: {alt.cns_impact}/5</p></div>
                    </div>
                    <Button size="sm" onClick={() => confirmSwap(alt)} className="bg-teal-500 hover:bg-teal-600 text-white font-bold">{txt.select}</Button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader><DialogTitle className="text-teal-600 flex items-center"><Repeat className="mr-2 h-5 w-5"/> {txt.modalTitle}</DialogTitle><DialogDescription className="text-zinc-600 dark:text-zinc-400 pt-2">{txt.modalSub}</DialogDescription></DialogHeader>
          <div className="flex flex-col-reverse sm:flex-row gap-3 mt-4"><Button variant="outline" className="w-full dark:border-zinc-700 dark:text-zinc-300 font-bold" onClick={() => setShowConfirmModal(false)}>{txt.cancel}</Button><Button className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold" onClick={() => generateProgram(false)} disabled={generating}>{generating ? "..." : txt.confirm}</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewCycleModal} onOpenChange={setShowNewCycleModal}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader><DialogTitle className="text-indigo-600 dark:text-indigo-400 flex items-center"><RefreshCw className="mr-2 h-5 w-5"/> {txt.cycleTitle}</DialogTitle><DialogDescription className="text-zinc-600 dark:text-zinc-400 pt-2">{txt.cycleSub}</DialogDescription></DialogHeader>
          <div className="flex flex-col-reverse sm:flex-row gap-3 mt-4"><Button variant="outline" className="w-full dark:border-zinc-700 dark:text-zinc-300 font-bold" onClick={() => setShowNewCycleModal(false)}>{txt.cancel}</Button><Button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold" onClick={() => generateProgram(true)} disabled={generating}>{generating ? "..." : txt.confirm}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
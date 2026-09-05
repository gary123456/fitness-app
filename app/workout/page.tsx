"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Dumbbell, Clock, Repeat, Play, Target, ArrowLeftRight, Info, CalendarCheck, BatteryCharging, Lock, PenTool, FolderGit2, CheckCircle2, Trash2, RefreshCw, Zap } from "lucide-react";
import { generateSmartWorkoutPlan } from "@/lib/workout-generator";
import { useLanguage } from "@/lib/useLanguage";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const SPORT_LABELS: Record<string, string> = { jjb: "JJB / MMA", football: "Football", basketball: "Basketball", running: "Running", natation: "Natation", cyclisme: "Cyclisme", randonnee: "Randonnée", padel_tennis: "Padel / Tennis" };

const fetchProgramData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  
  const { data: allPrograms } = await supabase.from("user_programs").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  const existingProgram = allPrograms?.find((p: any) => p.is_active) || null;

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
  return { profile, weeklyPlan, isDeloadWeek, existingProgram, allPrograms: allPrograms || [] };
};

export default function WorkoutPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const { data, error, mutate, isLoading } = useSWR('workoutData', fetchProgramData);

  const [generating, setGenerating] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showNewCycleModal, setShowNewCycleModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  
  const [swapModal, setSwapModal] = useState({ show: false, weId: "", currentEx: null as any, alternatives: [] as any[] });
  const [swapLoading, setSwapLoading] = useState(false);
  const [infoModal, setInfoModal] = useState({ show: false, exercise: null as any });

  const currentJsDay = new Date().getDay();
  const jsToOrdered = [6, 0, 1, 2, 3, 4, 5]; 
  const todayOrderedIndex = jsToOrdered[currentJsDay];
  
  const DAYS_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const todayKey = DAYS_ORDER[todayOrderedIndex];
  const dynamicDaysOrder = [...DAYS_ORDER.slice(todayOrderedIndex), ...DAYS_ORDER.slice(0, todayOrderedIndex)];

  const t: Record<string, Record<string, string>> = {
    FR: { title: "Mon Programme", sub: "Hybride, auto-régulé et adapté à votre calendrier.", genNext: "Surcharge Progressive", manage: "Mes Programmes", createCustom: "Créer un programme", newCycle: "Nouveau Cycle", rest: "Repos Total", start: "Démarrer", locked: "Prévu le", sets: "séries", target: "Objectif", bw: "Poids du corps", progTitle: "Ajuster les charges ?", progSub: "L'algorithme va analyser vos performances de cette semaine et augmenter les poids cibles du programme actuel.", cycleTitle: "Générer un Nouveau Cycle ?", cycleSub: "L'algorithme va bannir temporairement vos exercices actuels pour vous en proposer de nouveaux et éviter la stagnation.", cancel: "Annuler", confirm: "Confirmer", swapTitle: "Remplacer l'exercice", swapSub: "Alternatives :", noAlt: "Aucune alternative.", select: "Choisir", today: "Aujourd'hui", deloadBadge: "Semaine de Délestage", deloadSub: "Volume réduit de 20% pour dissiper la fatigue.", noProg: "Aucun programme actif.", limitReached: "Limite atteinte.", limitSub: "Limites : 3 Perso / 2 Algo. ⚠️ Attention : Supprimer un programme efface l'historique de ses séances.", deleteErr: "Impossible de supprimer ce programme." },
    EN: { title: "My Program", sub: "Hybrid, auto-regulated and adapted to your schedule.", genNext: "Progressive Overload", manage: "My Programs", createCustom: "Create Custom", newCycle: "New Cycle", rest: "Total Rest", start: "Start", locked: "Scheduled", sets: "sets", target: "Target", bw: "Bodyweight", progTitle: "Adjust Weights?", progSub: "The algorithm will analyze your performances and increase target weights for the current plan.", cycleTitle: "Generate New Cycle?", cycleSub: "The algorithm will temporarily ban your current exercises to propose new ones.", cancel: "Cancel", confirm: "Confirm", swapTitle: "Swap Exercise", swapSub: "Alternatives:", noAlt: "No alternatives.", select: "Select", today: "Today", deloadBadge: "Deload Week", deloadSub: "Volume reduced by 20% to dissipate fatigue.", noProg: "No active program.", limitReached: "Limit reached.", limitSub: "Limits: 3 Custom / 2 Algo. ⚠️ Warning: Deleting removes session history.", deleteErr: "Cannot delete this program." }
  };
  const txt = t[lang as keyof typeof t] || t.FR;
  const DAYS = lang === "FR" ? { monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi", sunday: "Dimanche" } : { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };

  useEffect(() => {
    if (error) router.push("/login");
  }, [error, router]);

  const customProgs = data?.allPrograms?.filter((p: any) => p.program_type === 'custom') || [];
  const algoProgs = data?.allPrograms?.filter((p: any) => p.program_type === 'ai') || [];

  const handleCreateCustomClick = () => {
    if (customProgs.length >= 3) setShowManagerModal(true);
    else router.push("/workout/builder");
  };

  const handleNewCycleClick = () => {
    if (algoProgs.length >= 2) setShowManagerModal(true);
    else setShowNewCycleModal(true);
  };

  const applyProgressiveOverload = async () => {
    if (!data?.existingProgram || !data?.weeklyPlan) return;
    setGenerating(true);
    try {
      const { data: historyLogs } = await supabase.from("workout_logs").select("*").eq("user_id", data.profile.id);
      
      for (const session of data.weeklyPlan) {
        if (!session.workout_exercises) continue;
        
        for (const we of session.workout_exercises) {
          const pastLogs = historyLogs?.filter(h => h.exercise_id === we.exercise_id) || [];
          if (pastLogs.length > 0) {
            pastLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            const lastSessionId = pastLogs[0].session_id;
            const lastSessionLogs = pastLogs.filter(l => l.session_id === lastSessionId);
            lastSessionLogs.sort((a, b) => b.weight - a.weight || b.reps - a.reps); 
            const bestSet = lastSessionLogs[0];
            
            const maxTargetRep = parseInt((we.target_reps || "12").split('-')[1] || "12");
            
            if (bestSet.reps >= maxTargetRep && bestSet.weight > 0) {
              const newWeight = bestSet.weight + 2.5;
              await supabase.from("workout_exercises").update({ recommended_weight: newWeight }).eq("id", we.id);
            }
          }
        }
      }
      await mutate();
      setShowProgressModal(false);
    } catch (error) {
      console.error("Overload error:", error);
    } finally {
      setGenerating(false);
    }
  };

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
           if (logsForCurrentProgram.length > 20) deloadFlag = true;
           const oldIds = new Set<string>();
           currentSessions.forEach(s => s.workout_exercises?.forEach((we:any) => oldIds.add(we.exercise_id)));
           excludedIds = Array.from(oldIds);
        }
        await supabase.from("user_programs").update({ is_active: false }).eq("user_id", user.id);
      }

      const generatedPlan = generateSmartWorkoutPlan(data.profile, library || [], historyLogs || [], deloadFlag, excludedIds);
      const cycleName = `Programme Algo - Cycle ${algoProgs.length + 1}`;

      const { data: newProgram } = await supabase.from("user_programs").insert([{ 
        user_id: user.id, name: cycleName, is_active: true, program_type: 'ai'
      }]).select().single();
      
      let orderIndex = 0;
      for (const day of generatedPlan) {
        const { data: newSession } = await supabase.from("workout_sessions").insert([{ program_id: newProgram.id, day_name: day.day, order_index: orderIndex }]).select().single();
        const exercisesToInsert = day.exercises.map((ex: any) => ({ session_id: newSession.id, exercise_id: ex.exercise.id, sets: ex.sets, target_reps: ex.target_reps, recommended_weight: ex.recommended_weight, rest_seconds: ex.rest_seconds, order_index: ex.order_index }));
        if (exercisesToInsert.length > 0) await supabase.from("workout_exercises").insert(exercisesToInsert);
        orderIndex++;
      }
      
      await mutate(); 
      setShowNewCycleModal(false);
    } catch (error) { console.error(error); } finally { setGenerating(false); }
  };

  const activateProgram = async (programId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("user_programs").update({ is_active: false }).eq("user_id", user.id);
      await supabase.from("user_programs").update({ is_active: true }).eq("id", programId);
      await mutate();
      setShowManagerModal(false);
    } catch (error) { console.error(error); }
  };

  const deleteProgram = async (programId: string, isActive: boolean) => {
    try {
      await supabase.from("user_programs").delete().eq("id", programId);
      if (isActive) {
        const remaining = data?.allPrograms?.filter((p: any) => p.id !== programId) || [];
        if (remaining.length > 0) await activateProgram(remaining[0].id);
        else await mutate();
      } else {
        await mutate();
      }
    } catch (error) { console.error(error); alert(txt.deleteErr); }
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

  const weeklySchedule = data?.profile?.weekly_schedule || {};
  const sortedPlan = data?.weeklyPlan ? [...data.weeklyPlan].sort((a: any, b: any) => {
    return dynamicDaysOrder.indexOf(a.day_name) - dynamicDaysOrder.indexOf(b.day_name);
  }) : [];

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-5xl mx-auto w-full relative pb-24">
      
      {/* HEADER DE LA PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
            {txt.title} {data?.existingProgram?.program_type === 'custom' && <span className="ml-3 text-[10px] bg-indigo-500 text-white px-2 py-1 rounded-full uppercase tracking-widest font-black">Perso</span>}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">{txt.sub}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {data && data.allPrograms.length > 0 && (
            <Button onClick={() => setShowManagerModal(true)} variant="outline" className="w-full sm:w-auto border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <FolderGit2 className="w-4 h-4 mr-2" /> {txt.manage}
            </Button>
          )}
          {data?.existingProgram?.program_type === 'ai' && (
            <Button onClick={handleNewCycleClick} variant="outline" className="w-full sm:w-auto border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <RefreshCw className="w-4 h-4 mr-2" /> {txt.newCycle}
            </Button>
          )}
          <Button onClick={handleCreateCustomClick} variant="outline" className="w-full sm:w-auto border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-bold">
            <PenTool className="w-4 h-4 mr-2" /> {txt.createCustom}
          </Button>
          <Button onClick={() => setShowProgressModal(true)} className="w-full sm:w-auto bg-teal-500 text-white hover:bg-teal-600 font-bold">
            <Zap className="w-4 h-4 mr-2" /> {txt.genNext}
          </Button>
        </div>
      </div>

      {/* ETAT VIDE */}
      {(!data?.weeklyPlan || data.weeklyPlan.length === 0) && (
        <div className="flex flex-col items-center justify-center space-y-4 py-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <Dumbbell className="w-16 h-16 text-zinc-300 dark:text-zinc-700" />
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">{txt.noProg}</h2>
        </div>
      )}

      {/* BADGE DELOAD */}
      {data?.isDeloadWeek && (
        <div className="bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 p-4 rounded-xl flex items-start space-x-3">
          <BatteryCharging className="w-6 h-6 text-blue-500 shrink-0" />
          <div><h4 className="font-bold text-blue-700 dark:text-blue-400">{txt.deloadBadge}</h4><p className="text-sm text-blue-600 dark:text-blue-300 font-medium">{txt.deloadSub}</p></div>
        </div>
      )}

      {/* LISTE DES SEANCES */}
      <div className="space-y-6">
        {sortedPlan.map((session: any) => {
          const dayKey = session.day_name;
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
                  <div className={`space-y-3 ${isFuture ? 'opacity-60 grayscale' : ''}`}>
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
                              
                              <button onClick={() => setInfoModal({ show: true, exercise: ex })} className="ml-2 mt-0.5 p-1 text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400 rounded-full hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors cursor-pointer relative z-20 pointer-events-auto">
                                <Info className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm mt-2 sm:mt-0 relative z-10">
                            {we.recommended_weight !== null && we.recommended_weight !== undefined && (
                              <div className="flex items-center text-teal-700 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-900/40 px-3 py-1 rounded border border-teal-200 dark:border-teal-800"><Target className="w-4 h-4 mr-1.5" /> {we.recommended_weight > 0 ? `${we.recommended_weight} kg` : txt.bw}</div>
                            )}
                            <div className="flex items-center text-zinc-700 dark:text-zinc-300 font-bold bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded"><Repeat className="w-4 h-4 mr-2 text-zinc-500" /> {we.sets} {txt.sets} × {we.target_reps}</div>
                            <div className="flex items-center text-zinc-500 font-medium"><Clock className="w-4 h-4 mr-1.5" />{we.rest_seconds}s</div>
                            <button onClick={() => !isFuture && openSwapModal(we.id, ex)} disabled={swapLoading || isFuture} className={`p-1.5 ml-2 rounded-md transition-colors ${isFuture ? 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/30'}`}>
                              <ArrowLeftRight className="w-5 h-5" />
                            </button>
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

      {/* MODALE GESTIONNAIRE DE PROGRAMMES */}
      <Dialog open={showManagerModal} onOpenChange={setShowManagerModal}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center text-zinc-900 dark:text-zinc-100">
              <FolderGit2 className="w-5 h-5 mr-2 text-indigo-500"/> {txt.manage}
            </DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400">
              <span className="font-bold text-orange-500">{txt.limitSub}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4 max-h-[60vh] overflow-y-auto pr-2">
            {data?.allPrograms?.map((prog: any) => (
              <div key={prog.id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${prog.is_active ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900'}`}>
                <div>
                  <h4 className={`font-bold ${prog.is_active ? 'text-teal-700 dark:text-teal-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                    {prog.name}
                  </h4>
                  <div className="flex space-x-2 mt-1">
                    <span className={`text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded ${prog.program_type === 'custom' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                      {prog.program_type === 'custom' ? 'Perso' : 'Algo'}
                    </span>
                    {prog.is_active && (
                      <span className="text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded bg-teal-500 text-white flex items-center shadow-sm">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Actif
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  {!prog.is_active && (
                    <Button size="sm" onClick={() => activateProgram(prog.id)} variant="outline" className="font-bold border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">Charger</Button>
                  )}
                  <Button size="sm" onClick={() => deleteProgram(prog.id, prog.is_active)} variant="destructive" className="px-3 bg-red-500 hover:bg-red-600 transition-transform active:scale-90"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="mt-4">
            <Button className="w-full font-bold dark:text-white" variant="outline" onClick={() => setShowManagerModal(false)}>{txt.cancel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* INFO EXERCICE */}
      <Dialog open={infoModal.show} onOpenChange={(open) => !open && setInfoModal({ show: false, exercise: null })}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden">
          {infoModal.exercise && (
            <div className="p-6 text-center space-y-4">
              <h2 className="text-xl font-black dark:text-white">{infoModal.exercise.name}</h2>
              {infoModal.exercise.gif_url ? (
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-2 h-48 flex justify-center items-center">
                  <img src={infoModal.exercise.gif_url.endsWith('.jpg') ? infoModal.exercise.gif_url : `${infoModal.exercise.gif_url}/0.jpg`} className="max-h-full object-contain" alt="Aperçu" />
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 rounded-xl"><Dumbbell className="w-8 h-8 text-zinc-400" /></div>
              )}
              <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">{infoModal.exercise.target_muscle}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODALE DE SURCHARGE PROGRESSIVE */}
      <Dialog open={showProgressModal} onOpenChange={setShowProgressModal}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader><DialogTitle className="text-teal-600 flex items-center"><Zap className="mr-2 h-5 w-5"/> {txt.progTitle}</DialogTitle><DialogDescription className="text-zinc-600 dark:text-zinc-400 pt-2">{txt.progSub}</DialogDescription></DialogHeader>
          <div className="flex flex-col-reverse sm:flex-row gap-3 mt-4"><Button variant="outline" className="w-full dark:border-zinc-700 dark:text-zinc-300 font-bold" onClick={() => setShowProgressModal(false)}>{txt.cancel}</Button><Button className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold" onClick={applyProgressiveOverload} disabled={generating}>{generating ? "..." : txt.confirm}</Button></div>
        </DialogContent>
      </Dialog>

      {/* MODALE NOUVEAU CYCLE ALGO */}
      <Dialog open={showNewCycleModal} onOpenChange={setShowNewCycleModal}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader><DialogTitle className="text-indigo-600 dark:text-indigo-400 flex items-center"><RefreshCw className="mr-2 h-5 w-5"/> {txt.cycleTitle}</DialogTitle><DialogDescription className="text-zinc-600 dark:text-zinc-400 pt-2">{txt.cycleSub}</DialogDescription></DialogHeader>
          <div className="flex flex-col-reverse sm:flex-row gap-3 mt-4"><Button variant="outline" className="w-full dark:border-zinc-700 dark:text-zinc-300 font-bold" onClick={() => setShowNewCycleModal(false)}>{txt.cancel}</Button><Button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold" onClick={() => generateProgram(true)} disabled={generating}>{generating ? "..." : txt.confirm}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Dumbbell, Clock, Repeat, Play, Target, AlertTriangle, X, ArrowLeftRight } from "lucide-react";
import { generateSmartWorkoutPlan } from "@/lib/workout-generator";
import { useLanguage } from "@/lib/useLanguage";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SPORT_LABELS: Record<string, string> = { jjb: "JJB / MMA", football: "Football", basketball: "Basketball", running: "Running", natation: "Natation", cyclisme: "Cyclisme", randonnee: "Randonnée", padel_tennis: "Padel / Tennis" };

export default function WorkoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [weeklyPlan, setWeeklyPlan] = useState<any[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, string[]>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // SWAP STATE
  const [userProfile, setUserProfile] = useState<any>(null);
  const [swapModal, setSwapModal] = useState({ show: false, weId: "", currentEx: null as any, alternatives: [] as any[] });
  const [swapLoading, setSwapLoading] = useState(false);

  const { lang } = useLanguage();

  const t = {
    FR: { title: "Mon Programme d'Entraînement", sub: "Hybride, auto-régulé et adapté à votre calendrier.", genNext: "Générer Semaine Suivante", rest: "Repos Total", start: "Démarrer la séance", sets: "séries", target: "Objectif", bw: "Poids du corps", modalTitle: "Générer la suite ?", modalSub: "Cette action effacera la semaine en cours pour générer le cycle suivant avec la surcharge progressive.", cancel: "Annuler", confirm: "Confirmer", swapTitle: "Remplacer l'exercice", swapSub: "Alternatives ciblant le même groupe musculaire compatibles avec votre matériel :", noAlt: "Aucune alternative disponible.", select: "Choisir" },
    EN: { title: "My Training Program", sub: "Hybrid, auto-regulated and adapted to your schedule.", genNext: "Generate Next Week", rest: "Total Rest", start: "Start Workout", sets: "sets", target: "Target", bw: "Bodyweight", modalTitle: "Generate next cycle?", modalSub: "This action will erase your current week to generate the next cycle applying progressive overload.", cancel: "Cancel", confirm: "Confirm", swapTitle: "Swap Exercise", swapSub: "Alternatives targeting the same muscle group matching your equipment:", noAlt: "No alternatives available.", select: "Select" }
  };
  const txt = t[lang as keyof typeof t] || t.FR;
  const DAYS = lang === "FR" ? { monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi", sunday: "Dimanche" } : { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };

  useEffect(() => { fetchOrGenerateProgram(); }, []);

  const fetchOrGenerateProgram = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!profile) { router.push("/onboarding"); return; }
      
      setUserProfile(profile);
      setWeeklySchedule(profile.weekly_schedule || {});

      const { data: existingProgram } = await supabase.from("user_programs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single();

      if (existingProgram) {
        const { data: sessions } = await supabase.from("workout_sessions").select(`*, workout_exercises (*, exercise_library (*))`).eq("program_id", existingProgram.id).order("order_index", { ascending: true });
        if (sessions) {
          sessions.forEach(session => { if (session.workout_exercises) session.workout_exercises.sort((a: any, b: any) => a.order_index - b.order_index); });
          setWeeklyPlan(sessions);
        }
        setLoading(false);
      } else {
        setGenerating(true);
        const { data: library } = await supabase.from("exercise_library").select("*");
        const { data: historyLogs } = await supabase.from("workout_logs").select("*").eq("user_id", user.id);
        const generatedPlan = generateSmartWorkoutPlan(profile, library || [], historyLogs || []);

        const { data: newProgram } = await supabase.from("user_programs").insert([{ user_id: user.id, name: `Programme - ${profile.current_goal}` }]).select().single();
        
        const dbSessions = [];
        let orderIndex = 0;
        for (const day of generatedPlan) {
          const { data: newSession } = await supabase.from("workout_sessions").insert([{ program_id: newProgram.id, day_name: day.day, order_index: orderIndex }]).select().single();
          const exercisesToInsert = day.exercises.map((ex: any) => ({ session_id: newSession.id, exercise_id: ex.exercise.id, sets: ex.sets, target_reps: ex.target_reps, recommended_weight: ex.recommended_weight, rest_seconds: ex.rest_seconds, order_index: ex.order_index }));
          if (exercisesToInsert.length > 0) await supabase.from("workout_exercises").insert(exercisesToInsert);
          dbSessions.push({ ...newSession, workout_exercises: day.exercises.map((ex: any) => ({ ...ex, exercise_library: ex.exercise })) });
          orderIndex++;
        }
        setWeeklyPlan(dbSessions);
        setGenerating(false);
        setLoading(false);
      }
    } catch (error) { setLoading(false); setGenerating(false); }
  };

  const executeRegenerate = async () => {
    setShowConfirmModal(false); setGenerating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) { await supabase.from("user_programs").delete().eq("user_id", user.id); window.location.reload(); }
  };

  // --- LOGIQUE DU BOUTON SWAP ---
  const openSwapModal = async (weId: string, currentEx: any) => {
    setSwapLoading(true);
    const { data: alts } = await supabase.from('exercise_library').select('*').eq('movement_pattern', currentEx.movement_pattern).neq('id', currentEx.id);
    
    // Filtrage strict par le matériel possédé par l'utilisateur
    const userEq = userProfile.equipment_access.split(',').map((e: string) => e.trim());
    const validAlts = (alts || []).filter((ex: any) => userEq.includes(ex.equipment_required));
    
    setSwapModal({ show: true, weId, currentEx, alternatives: validAlts });
    setSwapLoading(false);
  };

  const confirmSwap = async (newEx: any) => {
    await supabase.from('workout_exercises').update({ exercise_id: newEx.id }).eq('id', swapModal.weId);
    
    setWeeklyPlan(prev => prev.map(session => ({
      ...session,
      workout_exercises: session.workout_exercises?.map((we: any) => we.id === swapModal.weId ? { ...we, exercise_id: newEx.id, exercise_library: newEx } : we)
    })));
    setSwapModal({ show: false, weId: "", currentEx: null, alternatives: [] });
  };

  if (loading) return <div className="flex min-h-[80vh] items-center justify-center"><div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-5xl mx-auto w-full relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{txt.title}</h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">{txt.sub}</p>
        </div>
        <Button onClick={() => setShowConfirmModal(true)} variant="outline" className="border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950">
          <Repeat className="w-4 h-4 mr-2" /> {txt.genNext}
        </Button>
      </div>

      <div className="space-y-6">
        {weeklyPlan.map((session) => {
          const dayKey = session.day_name;
          const externalSports = weeklySchedule[dayKey] || [];
          const hasLifting = session.workout_exercises && session.workout_exercises.length > 0;
          const isRestDay = !hasLifting && externalSports.length === 0;

          return (
            <Card key={session.id} className={`shadow-sm border-zinc-200 dark:border-zinc-800 ${isRestDay ? 'bg-zinc-50/50 dark:bg-zinc-900/20' : 'bg-white dark:bg-zinc-950'}`}>
              <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <CardTitle className="text-lg font-bold w-28 text-zinc-800 dark:text-zinc-100">{DAYS[dayKey as keyof typeof DAYS]}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {externalSports.map((sport: string) => (
                      <span key={sport} className="px-2.5 py-1 text-xs font-bold rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 flex items-center"><Activity className="w-3 h-3 mr-1" /> {SPORT_LABELS[sport] || sport}</span>
                    ))}
                    {isRestDay && <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{txt.rest}</span>}
                  </div>
                </div>
                {hasLifting && (
                  <Link href={`/workout/${session.id}`}>
                    <Button size="sm" className="font-bold shadow-sm bg-zinc-900 hover:bg-zinc-800 text-white"><Play className="w-4 h-4 mr-2" /> {txt.start}</Button>
                  </Link>
                )}
              </CardHeader>
              
              {hasLifting && (
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {session.workout_exercises.map((we: any) => {
                      const ex = we.exercise_library;
                      return (
                        <div key={we.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                          <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                            <div className="h-10 w-10 bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center"><Dumbbell className="h-5 w-5 text-zinc-500" /></div>
                            <div>
                              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{ex.name}</h4>
                              <p className="text-xs text-zinc-500 font-medium">{ex.target_muscle} • {ex.equipment_required.replace('_', ' ')}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm mt-2 sm:mt-0">
                            {we.recommended_weight !== null && we.recommended_weight !== undefined && (
                              <div className="flex items-center text-teal-700 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-900/40 px-3 py-1 rounded border border-teal-200 dark:border-teal-800">
                                <Target className="w-4 h-4 mr-1.5" /> {we.recommended_weight > 0 ? `${we.recommended_weight} kg` : txt.bw}
                              </div>
                            )}
                            <div className="flex items-center text-zinc-700 dark:text-zinc-300 font-bold bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded">
                              <Repeat className="w-4 h-4 mr-2 text-zinc-500" /> {we.sets} {txt.sets} × {we.target_reps}
                            </div>
                            <div className="flex items-center text-zinc-500 font-medium"><Clock className="w-4 h-4 mr-1.5" />{we.rest_seconds}s</div>
                            
                            {/* BOUTON SWAP */}
                            <button onClick={() => openSwapModal(we.id, ex)} disabled={swapLoading} className="p-1.5 ml-2 text-zinc-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-md transition-colors">
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

      {/* MODAL SWAP */}
      <Dialog open={swapModal.show} onOpenChange={(open) => !open && setSwapModal({ show: false, weId: "", currentEx: null, alternatives: [] })}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center dark:text-zinc-100"><ArrowLeftRight className="w-5 h-5 mr-2 text-teal-500"/> {txt.swapTitle}</DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400">{txt.swapSub} <span className="font-bold text-teal-600">{swapModal.currentEx?.target_muscle}</span></DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4 max-h-[50vh] overflow-y-auto pr-2">
            {swapModal.alternatives.length === 0 ? (
              <div className="text-center p-4 text-zinc-500 bg-zinc-50 dark:bg-zinc-900 rounded-lg">{txt.noAlt}</div>
            ) : (
              swapModal.alternatives.map((alt) => (
                <div key={alt.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-teal-500 dark:hover:border-teal-500 transition-colors bg-zinc-50 dark:bg-zinc-900">
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{alt.name}</h4>
                    <p className="text-xs text-zinc-500">{alt.equipment_required.replace('_', ' ')} • Impact SNC: {alt.cns_impact}/5</p>
                  </div>
                  <Button size="sm" onClick={() => confirmSwap(alt)} className="bg-teal-500 hover:bg-teal-600 text-white">{txt.select}</Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRMATION GENERATION */}
      {showConfirmModal && (
        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-red-500 flex items-center"><AlertTriangle className="mr-2 h-5 w-5"/> {txt.modalTitle}</DialogTitle>
              <DialogDescription className="text-zinc-600 dark:text-zinc-400 pt-2">{txt.modalSub}</DialogDescription>
            </DialogHeader>
            <div className="flex space-x-3 mt-4">
              <Button variant="outline" className="w-full dark:border-zinc-700 dark:text-zinc-300" onClick={() => setShowConfirmModal(false)}>{txt.cancel}</Button>
              <Button variant="destructive" className="w-full dark:bg-red-600" onClick={executeRegenerate}>{txt.confirm}</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
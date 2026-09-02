"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Dumbbell, Clock, Repeat, Play, Target, AlertTriangle, ArrowLeftRight, Info, CalendarCheck } from "lucide-react";
import { generateSmartWorkoutPlan } from "@/lib/workout-generator";
import { useLanguage } from "@/lib/useLanguage";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// DICTIONNAIRE D'INSTRUCTIONS
const getInstructions = (name: string, lang: string) => {
  const lowerName = name.toLowerCase();

  if (lowerName.includes('squat') || lowerName.includes('presse') || lowerName.includes('leg press')) {
    return lang === 'FR' 
      ? "Gardez le buste droit et le regard fixe.\nVerrouillez le gainage et placez le bassin en légère antéversion.\nDescendez en contrôlant la charge (poussez les hanches vers l'arrière).\nPoussez fort sur vos talons pour remonter." 
      : "Keep your chest up and eyes forward.\nBrace your core and maintain a slight anterior pelvic tilt.\nDescend under control by pushing your hips back.\nDrive explosively through your heels to ascend.";
  }
  if (lowerName.includes('fente') || lowerName.includes('lunge') || lowerName.includes('bulgare') || lowerName.includes('step-up')) {
    return lang === 'FR'
      ? "Gardez le torse droit et le regard droit devant.\nLe genou avant doit rester dans l'axe de l'orteil sans trop le dépasser.\nDescendez jusqu'à frôler le sol avec le genou arrière.\nPoussez sur le talon avant pour remonter."
      : "Keep your torso upright and look straight ahead.\nYour front knee should track over your toes.\nLower yourself until your back knee gently taps the floor.\nPush through your front heel to return to the start.";
  }
  if (lowerName.includes('soulevé de terre') || lowerName.includes('deadlift') || lowerName.includes('rdl') || lowerName.includes('good morning')) {
    return lang === 'FR' 
      ? "Maintenez le dos parfaitement droit et le bassin neutre.\nGardez la charge collée à vos tibias/cuisses.\nPoussez le sol avec vos jambes et contractez les fessiers en haut." 
      : "Maintain a perfectly straight back and neutral pelvis.\nKeep the weight very close to your shins/thighs.\nPush the floor away with your legs and squeeze your glutes at the top.";
  }
  if (lowerName.includes('couché') || lowerName.includes('bench') || lowerName.includes('floor press')) {
    return lang === 'FR' 
      ? "Rétractez vos omoplates (serrez le dos) contre le banc/sol.\nContrôlez la descente de la charge jusqu'à la poitrine.\nPoussez de manière explosive en gardant les pieds ancrés au sol." 
      : "Retract your scapula (squeeze your back) against the bench/floor.\nControl the descent of the weight to your chest.\nPush explosively while keeping your feet firmly planted.";
  }
  if (lowerName.includes('pompe') || lowerName.includes('push-up') || lowerName.includes('dips')) {
    return lang === 'FR'
      ? "Maintenez un gainage actif (alignement épaules-bassin-chevilles).\nDescendez en contrôlant le mouvement jusqu'à l'étirement maximal.\nPoussez fort pour revenir en position initiale sans verrouiller violemment les coudes."
      : "Maintain an active core (shoulders-hips-ankles alignment).\nLower yourself under control until a full stretch.\nPush strongly to the starting position without locking elbows violently.";
  }
  if (lowerName.includes('militaire') || lowerName.includes('ohp') || lowerName.includes('shoulder press') || lowerName.includes('arnold')) {
    return lang === 'FR'
      ? "Contractez les fessiers et les abdos pour ne pas cambrer excessivement le dos.\nPoussez la charge au-dessus de la tête dans un axe vertical.\nRedescendez en contrôlant le poids jusqu'au niveau des clavicules."
      : "Squeeze your glutes and abs to avoid excessive lower back arching.\nPress the weight overhead in a vertical line.\nLower the weight under control to clavicle level.";
  }
  if (lowerName.includes('traction') || lowerName.includes('pull-up') || lowerName.includes('chin-up') || lowerName.includes('pulldown') || lowerName.includes('tirage poitrine')) {
    return lang === 'FR' 
      ? "Démarrez le mouvement avec un étirement complet (épaules décrochées).\nTirez en cherchant à amener la poitrine vers la barre (tirez avec les coudes).\nContrôlez la phase de descente." 
      : "Start the movement with a full stretch.\nPull by trying to bring your chest to the bar (drive with your elbows).\nControl the eccentric descent.";
  }
  if (lowerName.includes('rowing') || lowerName.includes('tirage horizontal') || lowerName.includes('t-bar') || lowerName.includes('bûcheron')) {
    return lang === 'FR'
      ? "Gardez le dos droit et le buste stable.\nTirez la charge vers votre nombril en resserrant les omoplates.\nÉtirez bien le dos lors de la phase de retour."
      : "Keep your back straight and torso stable.\nPull the weight towards your belly button while squeezing your shoulder blades.\nFully stretch your back on the return phase.";
  }
  if (lowerName.includes('curl')) {
    return lang === 'FR'
      ? "Gardez les coudes fixés près du corps (aucun mouvement d'épaule).\nContractez fort le biceps en haut du mouvement.\nRedescendez lentement sans relâcher la tension en bas."
      : "Keep your elbows pinned to your sides (no shoulder movement).\nSqueeze the bicep hard at the top.\nLower slowly without losing tension at the bottom.";
  }
  if (lowerName.includes('triceps') || lowerName.includes('barre au front') || lowerName.includes('skullcrusher') || lowerName.includes('kickback')) {
    return lang === 'FR'
      ? "Gardez les coudes serrés et immobiles.\nEffectuez une extension complète pour contracter le triceps.\nContrôlez le retour pour bien étirer le muscle."
      : "Keep your elbows tucked and stationary.\nPerform a full extension to contract the triceps.\nControl the return to fully stretch the muscle.";
  }
  if (lowerName.includes('élévation') || lowerName.includes('oiseau') || lowerName.includes('face pull') || lowerName.includes('lateral raise')) {
    return lang === 'FR'
      ? "Utilisez une charge modérée, privilégiez le contrôle.\nInitiez le mouvement avec les coudes plutôt qu'avec les mains.\nMarquez un léger temps d'arrêt lors de la contraction maximale."
      : "Use a moderate weight and prioritize control.\nInitiate the movement with your elbows rather than your hands.\nPause briefly at peak contraction.";
  }
  if (lowerName.includes('mollet') || lowerName.includes('calf')) {
    return lang === 'FR'
      ? "Descendez lentement pour obtenir un étirement maximal.\nMarquez une pause de 1 à 2 secondes en bas.\nPoussez de manière explosive et contractez fort en haut."
      : "Lower slowly to get a maximum stretch.\nPause for 1-2 seconds at the bottom.\nPush explosively and squeeze hard at the top.";
  }
  if (lowerName.includes('planche') || lowerName.includes('l-sit') || lowerName.includes('sit-up') || lowerName.includes('crunch') || lowerName.includes('rollout') || lowerName.includes('abdo')) {
    return lang === 'FR'
      ? "Aspirez le nombril pour engager le transverse profond.\nMaintenez une respiration fluide et continue.\nEnroulez la colonne (ne tirez pas sur la nuque) lors des contractions."
      : "Draw your belly button in to engage the deep transverse abdominis.\nMaintain a fluid and continuous breathing pattern.\nCurl your spine (do not pull on your neck) during contractions.";
  }

  return lang === 'FR' 
    ? "Maintenez une posture stable et un bon gainage.\nContrôlez la phase excentrique (la descente de la charge).\nSoyez explosif sur la phase concentrique (la contraction)." 
    : "Maintain a stable posture and brace your core.\nControl the eccentric phase (lowering the weight).\nBe explosive on the concentric phase (the contraction).";
};

const SPORT_LABELS: Record<string, string> = { jjb: "JJB / MMA", football: "Football", basketball: "Basketball", running: "Running", natation: "Natation", cyclisme: "Cyclisme", randonnee: "Randonnée", padel_tennis: "Padel / Tennis" };

export default function WorkoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [weeklyPlan, setWeeklyPlan] = useState<any[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, string[]>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [swapModal, setSwapModal] = useState({ show: false, weId: "", currentEx: null as any, alternatives: [] as any[] });
  const [swapLoading, setSwapLoading] = useState(false);

  const [infoModal, setInfoModal] = useState({ show: false, exercise: null as any });

  const { lang } = useLanguage();

  // Helper pour trouver le jour actuel
  const todayIndex = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const todayKey = daysMap[todayIndex];

  const t = {
    FR: { title: "Mon Programme d'Entraînement", sub: "Hybride, auto-régulé et adapté à votre calendrier.", genNext: "Générer Semaine Suivante", rest: "Repos Total", start: "Démarrer la séance", sets: "séries", target: "Objectif", bw: "Poids du corps", modalTitle: "Générer la suite ?", modalSub: "Cette action effacera la semaine en cours pour générer le cycle suivant avec la surcharge progressive.", cancel: "Annuler", confirm: "Confirmer", swapTitle: "Remplacer l'exercice", swapSub: "Alternatives ciblant le même groupe musculaire compatibles avec votre matériel :", noAlt: "Aucune alternative disponible.", select: "Choisir", today: "Aujourd'hui" },
    EN: { title: "My Training Program", sub: "Hybrid, auto-regulated and adapted to your schedule.", genNext: "Generate Next Week", rest: "Total Rest", start: "Start Workout", sets: "sets", target: "Target", bw: "Bodyweight", modalTitle: "Generate next cycle?", modalSub: "This action will erase your current week to generate the next cycle applying progressive overload.", cancel: "Cancel", confirm: "Confirm", swapTitle: "Swap Exercise", swapSub: "Alternatives targeting the same muscle group matching your equipment:", noAlt: "No alternatives available.", select: "Select", today: "Today" }
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

  const openSwapModal = async (weId: string, currentEx: any) => {
    setSwapLoading(true);
    const { data: alts } = await supabase.from('exercise_library').select('*').eq('movement_pattern', currentEx.movement_pattern).neq('id', currentEx.id);
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
          
          // VERIFICATION SI C'EST LE JOUR ACTUEL
          const isToday = dayKey === todayKey;

          return (
            <Card 
              key={session.id} 
              className={`transition-all duration-300 relative overflow-hidden ${
                isToday 
                  ? 'border-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.15)] ring-1 ring-teal-500/50 bg-white dark:bg-zinc-950 transform hover:-translate-y-1' 
                  : isRestDay 
                    ? 'shadow-sm border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 opacity-80 hover:opacity-100' 
                    : 'shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
              }`}
            >
              {/* RUBAN "AUJOURD'HUI" */}
              {isToday && (
                <div className="absolute top-0 right-0 bg-teal-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-lg flex items-center shadow-sm">
                  <CalendarCheck className="w-3 h-3 mr-1" /> {txt.today}
                </div>
              )}

              <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <CardTitle className={`text-lg font-bold w-28 ${isToday ? 'text-teal-600 dark:text-teal-400' : 'text-zinc-800 dark:text-zinc-100'}`}>
                    {DAYS[dayKey as keyof typeof DAYS]}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {externalSports.map((sport: string) => (
                      <span key={sport} className="px-2.5 py-1 text-xs font-bold rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 flex items-center"><Activity className="w-3 h-3 mr-1" /> {SPORT_LABELS[sport] || sport}</span>
                    ))}
                    {isRestDay && <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{txt.rest}</span>}
                  </div>
                </div>
                {hasLifting && (
                  <Link href={`/workout/${session.id}`}>
                    <Button size="sm" className={`font-bold shadow-sm ${isToday ? 'bg-teal-500 hover:bg-teal-600 text-white animate-pulse' : 'bg-zinc-900 hover:bg-zinc-800 text-white'}`}>
                      <Play className="w-4 h-4 mr-2" /> {txt.start}
                    </Button>
                  </Link>
                )}
              </CardHeader>
              
              {hasLifting && (
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {session.workout_exercises.map((we: any, index: number) => {
                      const ex = we.exercise_library;
                      const uniqueKey = we.id || `we-${session.id}-${index}`;
                      const thumbnailUrl = ex.gif_url ? (ex.gif_url.endsWith('.jpg') ? ex.gif_url : `${ex.gif_url}/0.jpg`) : null;

                      return (
                        <div key={uniqueKey} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                          <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                            {/* VIGNETTE FOND BLANC FORCÉ POUR LISIBILITÉ DARK MODE */}
                            <div className="h-12 w-12 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-zinc-200 dark:border-zinc-700 relative p-1">
                              {thumbnailUrl ? (
                                <img 
                                  src={thumbnailUrl} 
                                  alt={ex.name} 
                                  className="h-full w-full object-contain absolute inset-0 z-10" 
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                                />
                              ) : null}
                              <Dumbbell className="h-6 w-6 text-zinc-400 absolute z-0" />
                            </div>
                            
                            <div className="flex items-start">
                              <div>
                                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{ex.name}</h4>
                                <p className="text-xs text-zinc-500 font-medium">{ex.target_muscle} • {ex.equipment_required.replace('_', ' ')}</p>
                              </div>
                              {/* BOUTON INFO */}
                              <button 
                                onClick={() => setInfoModal({ show: true, exercise: ex })}
                                className="ml-2 mt-0.5 p-1 text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400 rounded-full hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
                              >
                                <Info className="w-4 h-4" />
                              </button>
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

      {/* MODAL INFO EXERCICE */}
      <Dialog open={infoModal.show} onOpenChange={(open) => !open && setInfoModal({ show: false, exercise: null })}>
        <DialogContent className="sm:max-w-[700px] flex flex-col p-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          {infoModal.exercise && (
            <>
              <DialogHeader className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900">
                <DialogTitle className="text-xl font-black dark:text-zinc-50">
                  {infoModal.exercise.name}
                </DialogTitle>
                <DialogDescription className="text-zinc-500 dark:text-zinc-400 font-medium mt-1">
                  {lang === 'FR' ? 'Cible' : 'Target'} : {infoModal.exercise.target_muscle} • {lang === 'FR' ? 'Matériel' : 'Equipment'} : {infoModal.exercise.equipment_required.replace('_', ' ')}
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 p-4 md:p-6 overflow-y-auto max-h-[75vh]">
                <div className="space-y-6">
                  {infoModal.exercise.gif_url ? (
                    <div className="flex flex-col sm:flex-row items-stretch justify-center gap-4 w-full">
                      <div className="flex-1 bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col">
                        <div className="bg-zinc-100/80 px-3 py-2 border-b border-zinc-200 text-[10px] font-black text-zinc-500 text-center uppercase tracking-widest">
                          {lang === 'FR' ? "Position de départ" : "Starting Position"}
                        </div>
                        <div className="p-4 flex justify-center items-center h-48 md:h-64">
                          <img src={`${infoModal.exercise.gif_url}/0.jpg`} alt="Départ" className="max-w-full max-h-full object-contain" loading="lazy" />
                        </div>
                      </div>
                      <div className="flex-1 bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col">
                        <div className="bg-zinc-100/80 px-3 py-2 border-b border-zinc-200 text-[10px] font-black text-zinc-500 text-center uppercase tracking-widest">
                          {lang === 'FR' ? "Contraction" : "Contraction"}
                        </div>
                        <div className="p-4 flex justify-center items-center h-48 md:h-64">
                          <img src={`${infoModal.exercise.gif_url}/1.jpg`} alt="Fin" className="max-w-full max-h-full object-contain" loading="lazy" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center min-h-[200px] text-zinc-400 dark:text-zinc-600 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <Dumbbell className="w-12 h-12 mb-3 opacity-50" />
                      <p className="text-sm font-bold">{lang === 'FR' ? "Aucun visuel disponible." : "No visual available."}</p>
                    </div>
                  )}

                  <div className="bg-white dark:bg-zinc-900/50 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <h4 className="flex items-center text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                      <Info className="w-4 h-4 mr-2 text-teal-500" />
                      {lang === 'FR' ? "Consignes d'exécution" : "Execution Guidelines"}
                    </h4>
                    <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                      {getInstructions(infoModal.exercise.name, lang).split('\n').map((line: string, i: number) => (
                        <li key={i} className="flex items-start">
                          <span className="text-teal-500 mr-2 mt-0.5">•</span>
                          <span className="leading-relaxed">{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
              swapModal.alternatives.map((alt) => {
                const altThumbnailUrl = alt.gif_url ? (alt.gif_url.endsWith('.jpg') ? alt.gif_url : `${alt.gif_url}/0.jpg`) : null;

                return (
                  <div key={alt.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-teal-500 dark:hover:border-teal-500 transition-colors bg-zinc-50 dark:bg-zinc-900">
                    <div className="flex items-center space-x-3">
                      {/* VIGNETTE SWAP FOND BLANC */}
                      <div className="h-10 w-10 bg-white rounded flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-zinc-200 dark:border-zinc-700 relative p-1">
                        {altThumbnailUrl ? (
                          <img 
                            src={altThumbnailUrl} 
                            alt={alt.name} 
                            className="h-full w-full object-contain absolute inset-0 z-10" 
                            onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                          />
                        ) : null}
                        <Dumbbell className="h-5 w-5 text-zinc-400 absolute z-0" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{alt.name}</h4>
                        <p className="text-xs text-zinc-500">{alt.equipment_required.replace('_', ' ')} • Impact SNC: {alt.cns_impact}/5</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => confirmSwap(alt)} className="bg-teal-500 hover:bg-teal-600 text-white">{txt.select}</Button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRMATION */}
      {showConfirmModal && (
        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-red-500 flex items-center"><AlertTriangle className="mr-2 h-5 w-5"/> {txt.modalTitle}</DialogTitle>
              <DialogDescription className="text-zinc-600 dark:text-zinc-400 pt-2">{txt.modalSub}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-4">
              <Button variant="outline" className="w-full dark:border-zinc-700 dark:text-zinc-300" onClick={() => setShowConfirmModal(false)}>{txt.cancel}</Button>
              <Button variant="destructive" className="w-full dark:bg-red-600" onClick={executeRegenerate}>{txt.confirm}</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
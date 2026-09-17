"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Dumbbell, Clock, Repeat, Play, Target, ArrowLeftRight, Info, CalendarCheck, BatteryCharging, Lock, PenTool, FolderGit2, CheckCircle2, Trash2, RefreshCw, Zap, Star, Filter, Scale, Loader2, PlayCircle, AlertCircle, WifiOff, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { generateSmartWorkoutPlan } from "@/lib/workout-generator";
import { useLanguage } from "@/lib/useLanguage";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { getEvolvedExperienceLevel } from "@/lib/fitness";

const SPORT_LABELS: Record<string, string> = { jjb: "JJB / MMA", football: "Football", basketball: "Basketball", running: "Running", natation: "Natation", cyclisme: "Cyclisme", randonnee: "Randonnée", padel_tennis: "Padel / Tennis" };

const fetchProgramData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: gamification } = await supabase.from("user_gamification").select("level").eq("user_id", user.id).single();
  
  const { data: allPrograms } = await supabase.from("user_programs").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  const existingProgram = allPrograms?.find((p: any) => p.is_active) || null;

  let weeklyPlan = [];
  let isDeloadWeek = false;
  let completedSessionIds: string[] = [];
  let lastWorkoutDateStr = "";

  if (existingProgram) {
    const { data: sessions } = await supabase.from("workout_sessions").select(`*, workout_exercises (*, exercise_library (*))`).eq("program_id", existingProgram.id).order("order_index", { ascending: true });
    if (sessions) {
      sessions.forEach(session => { if (session.workout_exercises) session.workout_exercises.sort((a: any, b: any) => a.order_index - b.order_index); });
      weeklyPlan = sessions;
      isDeloadWeek = sessions.some(s => s.workout_exercises?.some((we:any) => we.target_reps?.includes("Léger") || we.target_reps?.includes("Deload")));
      
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); 
      startOfWeek.setHours(0,0,0,0);
      
      const { data: recentLogs } = await supabase.from("workout_logs").select("session_id, created_at").eq("user_id", user.id).gte("created_at", startOfWeek.toISOString());
      if (recentLogs && recentLogs.length > 0) {
        completedSessionIds = Array.from(new Set(recentLogs.map(l => l.session_id)));
        recentLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        lastWorkoutDateStr = new Date(recentLogs[0].created_at).toISOString().split('T')[0];
      }
    }
  }
  return { profile, userLevel: gamification?.level || 1, weeklyPlan, isDeloadWeek, existingProgram, allPrograms: allPrograms || [], completedSessionIds, lastWorkoutDateStr, isReadOnly: false };
};

const getYoutubeThumbnail = (youtubeId?: string) => {
  if (!youtubeId) return null;
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
};

function WorkoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justFinished = searchParams?.get('finished') === 'true'; 
  const { lang } = useLanguage();
  const { data, error, mutate, isLoading } = useSWR('workoutData', fetchProgramData);

  // 🛡️ NOUVEAU STATE : Maintien du plan local pour le Drag & Drop
  const [localWeeklyPlan, setLocalWeeklyPlan] = useState<any[]>([]);

  useEffect(() => {
    if (data?.weeklyPlan) {
      setLocalWeeklyPlan(JSON.parse(JSON.stringify(data.weeklyPlan)));
    }
  }, [data?.weeklyPlan]);

  const [generating, setGenerating] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showNewCycleModal, setShowNewCycleModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  
  const [swapModal, setSwapModal] = useState({ show: false, weId: "", currentEx: null as any, alternatives: [] as any[] });
  const [swapLoading, setSwapLoading] = useState(false);
  const [searchSwapQuery, setSearchSwapQuery] = useState("");
  const [selectedSwapMuscle, setSelectedSwapMuscle] = useState("Tous");
  const [selectedSwapStar, setSelectedSwapStar] = useState<number | null>(null);
  const [selectedSwapPattern, setSelectedSwapPattern] = useState<string | null>(null);
  const [selectedSwapEquipment, setSelectedSwapEquipment] = useState<string | null>(null);
  const [convertModal, setConvertModal] = useState({ show: false, kgValue: "", lbsValue: "" });
  
  const [infoModal, setInfoModal] = useState({ show: false, exercise: null as any });

  // 🛡️ GESTION DU DRAG & DROP DANS LE HUB
  const [draggedItem, setDraggedItem] = useState<{sessionId: string, index: number} | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{sessionId: string, index: number} | null>(null);

  const currentJsDay = new Date().getDay();
  const jsToOrdered = [6, 0, 1, 2, 3, 4, 5]; 
  const todayOrderedIndex = jsToOrdered[currentJsDay];
  
  const DAYS_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const todayKey = DAYS_ORDER[todayOrderedIndex];
  const dynamicDaysOrder = [...DAYS_ORDER.slice(todayOrderedIndex), ...DAYS_ORDER.slice(0, todayOrderedIndex)];

  const t: Record<string, Record<string, string>> = {
    FR: { title: "Mon Programme", sub: "Hybride, auto-régulé et adapté à votre calendrier.", genNext: "⚡ Surcharge Progressive", manage: "Mes Programmes", createCustom: "Créer un programme", newCycle: "Nouveau Cycle IA", rest: "Repos Total", start: "Démarrer", locked: "Prévu le", sets: "séries", target: "Objectif", bw: "Poids du corps", progTitle: "Ajuster les charges ?", progSub: "L'algorithme va analyser vos dernières performances pour générer la semaine prochaine.", cycleTitle: "Générer un Nouveau Cycle ?", cycleSub: "L'IA va créer un tout nouveau programme basé sur vos paramètres actuels.", cancel: "Annuler", confirm: "Confirmer", swapTitle: "Remplacer l'exercice", swapSub: "Alternatives :", noAlt: "Aucune alternative.", select: "Choisir", today: "Aujourd'hui", deloadBadge: "Semaine de Délestage", deloadSub: "Volume réduit pour dissiper la fatigue.", noProg: "Aucun programme actif.", deleteErr: "Erreur", search: "Rechercher...", waitOverload: "En attente d'adaptation", validation: "⏳ Validation en cours...", timeLock: "Revenez demain ! L'algorithme a besoin que la nuit passe pour calculer la Surcharge Progressive avec précision." },
    EN: { title: "My Program", sub: "Hybrid, auto-regulated and adapted to your schedule.", genNext: "⚡ Progressive Overload", manage: "My Programs", createCustom: "Create Custom", newCycle: "New AI Cycle", rest: "Total Rest", start: "Start", locked: "Scheduled", sets: "sets", target: "Target", bw: "Bodyweight", progTitle: "Adjust Weights?", progSub: "The algorithm will analyze your past performances to generate next week.", cycleTitle: "Generate New Cycle?", cycleSub: "AI will create a brand new program based on your current settings.", cancel: "Cancel", confirm: "Confirm", swapTitle: "Swap Exercise", swapSub: "Alternatives:", noAlt: "No alternatives.", select: "Select", today: "Today", deloadBadge: "Deload Week", deloadSub: "Volume reduced to dissipate fatigue.", noProg: "No active program.", deleteErr: "Error", search: "Search...", waitOverload: "Awaiting adaptation", validation: "⏳ Validating...", timeLock: "Come back tomorrow! The algorithm needs the night to pass to accurately calculate Progressive Overload." }
  };
  const txt = t[lang as keyof typeof t] || t.FR;
  const DAYS = lang === "FR" ? { monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi", sunday: "Dimanche" } : { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };

  useEffect(() => {
    if (error) router.push("/login");
  }, [error, router]);

  const customProg = data?.allPrograms?.find((p: any) => p.program_type === 'custom') || null;
  const algoProg = data?.allPrograms?.find((p: any) => p.program_type === 'ai') || null;

  // 🛡️ NOUVEAU : Fonction de tri d'exercices dans le HUB (Flèches)
  const moveExerciseInHub = async (sessionId: string, index: number, direction: 'up' | 'down') => {
    const newPlan = [...localWeeklyPlan];
    const sessionIndex = newPlan.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) return;

    const exercises = [...newPlan[sessionIndex].workout_exercises];
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === exercises.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = exercises[index];
    exercises[index] = exercises[targetIndex];
    exercises[targetIndex] = temp;

    newPlan[sessionIndex].workout_exercises = exercises;
    setLocalWeeklyPlan(newPlan);
    if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate(10);

    try {
      const updates = exercises.map((ex, i) => ({
        id: ex.id, session_id: sessionId, exercise_id: ex.exercise_id, order_index: i
      }));
      await supabase.from("workout_exercises").upsert(updates);
    } catch (err) { console.error(err); }
  };

  // 🛡️ NOUVEAU : Fonctions de Drag & Drop dans le HUB
  const handleDragStart = (e: React.DragEvent, sessionId: string, index: number) => {
    setDraggedItem({ sessionId, index });
    if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e: React.DragEvent, sessionId: string, index: number) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.sessionId !== sessionId) return; 
    setDragOverItem({ sessionId, index });

    if (draggedItem.index === index) return;

    setLocalWeeklyPlan(prev => {
      const newPlan = [...prev];
      const sessionIndex = newPlan.findIndex(s => s.id === sessionId);
      if (sessionIndex === -1) return newPlan;

      const exercises = [...newPlan[sessionIndex].workout_exercises];
      const item = exercises[draggedItem.index];
      exercises.splice(draggedItem.index, 1);
      exercises.splice(index, 0, item);

      newPlan[sessionIndex].workout_exercises = exercises;
      return newPlan;
    });
    setDraggedItem({ sessionId, index });
  };

  const handleDragEnd = async () => {
    if (!draggedItem) return;
    const sessionId = draggedItem.sessionId;
    setDraggedItem(null);
    setDragOverItem(null);

    const session = localWeeklyPlan.find(s => s.id === sessionId);
    if (!session) return;

    try {
      const updates = session.workout_exercises.map((ex: any, i: number) => ({
        id: ex.id, session_id: sessionId, exercise_id: ex.exercise_id, order_index: i
      }));
      await supabase.from("workout_exercises").upsert(updates);
    } catch (err) {}
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();


  const handleCreateCustomClick = () => {
    if (customProg) {
      router.push(`/workout/builder?edit=${customProg.id}`);
    } else {
      router.push("/workout/builder");
    }
  };

  const handleNewCycleClick = () => {
    setShowNewCycleModal(true);
  };

  const deleteProgram = async (programId: string, isActive: boolean) => {
    try {
      const { error: delError } = await supabase.from("user_programs").delete().eq("id", programId);
      if (delError) throw new Error(delError.message);

      if (isActive) {
        const remaining = data?.allPrograms?.filter((p: any) => p.id !== programId) || [];
        if (remaining.length > 0) await activateProgram(remaining[0].id);
        else await mutate();
      } else {
        await mutate();
      }
    } catch (error: any) { 
      console.error(error); 
      alert(txt.deleteErr + " : " + error.message); 
    }
  };

  const applyProgressiveOverload = async () => {
    if (!data?.existingProgram || !data?.weeklyPlan) return;
    setGenerating(true);
    try {
      const { data: historyLogs, error: histError } = await supabase.from("workout_logs").select("*").eq("user_id", data.profile.id);
      if (histError) throw new Error("Erreur lecture logs: " + histError.message);

      for (const session of data.weeklyPlan) {
        if (!session.workout_exercises) continue;
        
        for (const we of session.workout_exercises) {
          const pastLogs = historyLogs?.filter(h => h.exercise_id === we.exercise_id && h.session_id === session.id) || [];
          
          if (pastLogs.length > 0) {
            pastLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            const lastSessionId = pastLogs[0].session_id; 
            const lastSessionTime = new Date(pastLogs[0].created_at).toISOString().split('T')[0];
            
            const logsOfLastSession = pastLogs.filter(l => l.session_id === lastSessionId && new Date(l.created_at).toISOString().split('T')[0] === lastSessionTime);
            logsOfLastSession.sort((a, b) => b.weight - a.weight || b.reps - a.reps); 
            const bestSet = logsOfLastSession[0];
            
            const rpe = bestSet.rpe || 8; 
            const isRange = we.target_reps?.includes("-");
            const targetMatch = (we.target_reps || "12").match(/\d+/g);
            
            const minTargetRep = targetMatch && targetMatch.length > 1 ? parseInt(targetMatch[0]) : (targetMatch ? parseInt(targetMatch[0]) : 8);
            const maxTargetRep = targetMatch ? parseInt(targetMatch[targetMatch.length - 1]) : 12;
            
            const ceiling = bestSet.weight === 0 ? 15 : 12;
            const floor = bestSet.weight === 0 ? 5 : minTargetRep;
            
            let newWeight = bestSet.weight;
            let newTargetReps = we.target_reps;

            if (bestSet.reps >= ceiling || (isRange && bestSet.reps >= maxTargetRep) || (bestSet.weight === 0 && bestSet.reps >= 14)) {
              if (rpe === 10) {
                newWeight = bestSet.weight;
                newTargetReps = `Viser > ${bestSet.reps} (RPE 10)`;
              } else if (bestSet.weight === 0 && bestSet.reps >= 14) {
                 newWeight = 2.5;
                 newTargetReps = `8-12 (Lesté)`;
              } else if (bestSet.weight > 0) {
                const multiplier = rpe <= 6 ? 2 : 1;
                const increment = (we.exercise_library?.cns_impact >= 4 ? 2.5 : 1.25) * multiplier;
                newWeight = bestSet.weight + increment;
                newTargetReps = "8-12"; 
              } else {
                newTargetReps = `Viser > ${bestSet.reps + 2} reps`;
              }
            } 
            else if (bestSet.reps < floor || (rpe === 10 && bestSet.weight > 0)) {
              const rawDeload = bestSet.weight * 0.9;
              newWeight = Math.round(rawDeload / 1.25) * 1.25;
              newTargetReps = "8-10 (Deload)";
            } 
            else {
              newWeight = bestSet.weight;
              const nextTarget = Math.min(bestSet.reps + 1, ceiling);
              newTargetReps = `Viser > ${nextTarget} reps`;
            }

            await supabase.from("workout_exercises").update({ 
                recommended_weight: newWeight > 0 ? newWeight : null,
                target_reps: newTargetReps
            }).eq("id", we.id);
          }
        }
      }
      
      await mutate();
      setShowProgressModal(false);
      if (justFinished) router.replace('/workout');
    } catch (error: any) {
      alert("Erreur de surcharge: " + error.message);
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
      
      const evolvedExperience = getEvolvedExperienceLevel(data.userLevel, data.profile.experience_level);
      
      if (algoProg) {
        await supabase.from("user_programs").delete().eq("id", algoProg.id);
      }

      const generatedPlan = generateSmartWorkoutPlan({ ...data.profile, experience_level: evolvedExperience }, library || [], historyLogs || [], false, []);
      if (!generatedPlan || generatedPlan.length === 0) throw new Error("Impossible de générer le programme.");

      await supabase.from("user_programs").update({ is_active: false }).eq("user_id", user.id);

      const { data: newProgram } = await supabase.from("user_programs").insert([{ 
        user_id: user.id, 
        name: "Programme IA", 
        is_active: true, 
        program_type: 'ai',
        is_default: data.allPrograms.length === 0 
      }]).select().single();
      
      if (!newProgram) throw new Error("Programme non créé.");

      let orderIndex = 0;
      for (const day of generatedPlan) {
        const { data: newSession } = await supabase.from("workout_sessions").insert([{ program_id: newProgram.id, day_name: day.day, order_index: orderIndex }]).select().single();
        if (newSession) {
          const exercisesToInsert = day.exercises.map((ex: any) => ({ session_id: newSession.id, exercise_id: ex.exercise.id, sets: ex.sets, target_reps: ex.target_reps, recommended_weight: ex.recommended_weight, rest_seconds: ex.rest_seconds, order_index: ex.order_index }));
          if (exercisesToInsert.length > 0) await supabase.from("workout_exercises").insert(exercisesToInsert);
        }
        orderIndex++;
      }
      
      await mutate(); 
      setShowNewCycleModal(false);
    } catch (error: any) { 
      alert(error.message); 
    } finally { 
      setGenerating(false); 
    }
  };

  const activateProgram = async (programId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("user_programs").update({ is_active: false }).eq("user_id", user.id);
      await supabase.from("user_programs").update({ is_active: true }).eq("id", programId);
      await mutate();
      setShowManagerModal(false);
    } catch (error: any) { 
      alert("Erreur: " + error.message);
    }
  };

  const openSwapModal = async (weId: string, currentEx: any) => {
    if (!data?.profile) return;
    setSwapLoading(true);
    const { data: alts, error: altsError } = await supabase.from('exercise_library').select('*').neq('id', currentEx.id);
    if (altsError) { setSwapLoading(false); alert("Erreur chargement alternatives"); return; }
    
    setSwapModal({ show: true, weId, currentEx, alternatives: alts || [] });
    setSwapLoading(false);
  };

  const filteredSwapAlternatives = swapModal.alternatives.filter(ex => {
    const matchSearch = ex.name.toLowerCase().includes(searchSwapQuery.toLowerCase());
    const target = ex.target_muscle.toLowerCase();
    const filter = selectedSwapMuscle.toLowerCase();

    let matchMuscle = false;
    if (filter === "tous") matchMuscle = true;
    else if (filter === "jambes") matchMuscle = target.includes("quadriceps") || target.includes("ischio") || target.includes("mollet") || target.includes("fessier") || target.includes("jambe");
    else if (filter === "abdos") matchMuscle = target.includes("sangle abdominale") || target.includes("abdo") || target.includes("core");
    else if (filter === "épaules") matchMuscle = target.includes("épaule") || target.includes("epaule") || target.includes("delto");
    else if (filter === "dos") matchMuscle = target.includes("dos") || target.includes("lombaire") || target.includes("dorsal");
    else matchMuscle = target.includes(filter);

    const matchStars = selectedSwapStar === null || ex.cns_impact === selectedSwapStar;
    const patternLow = ex.movement_pattern?.toLowerCase() || "";
    let matchPattern = true;
    if (selectedSwapPattern) {
      if (selectedSwapPattern === "push") matchPattern = patternLow.includes("push");
      else if (selectedSwapPattern === "pull") matchPattern = patternLow.includes("pull");
      else if (selectedSwapPattern === "squat") matchPattern = patternLow.includes("squat") || patternLow.includes("lunge");
      else if (selectedSwapPattern === "hinge") matchPattern = patternLow.includes("hinge");
      else if (selectedSwapPattern === "core") matchPattern = patternLow.includes("core");
    }

    const eqLow = ex.equipment_required?.toLowerCase() || "";
    let matchEquipment = true;
    if (selectedSwapEquipment) {
      if (selectedSwapEquipment === "poids_corps") matchEquipment = eqLow.includes("poids_corps");
      else if (selectedSwapEquipment === "salle") matchEquipment = eqLow.includes("salle");
      else if (selectedSwapEquipment === "home_gym") matchEquipment = eqLow.includes("home_gym") || eqLow.includes("kettlebell");
    }

    return matchSearch && matchMuscle && matchStars && matchPattern && matchEquipment;
  });

  const confirmSwap = async (newEx: any) => {
    try {
      const { error } = await supabase.from('workout_exercises').update({ exercise_id: newEx.id }).eq('id', swapModal.weId);
      if (error) throw new Error(error.message);
      
      await mutate();
      setSwapModal({ show: false, weId: "", currentEx: null, alternatives: [] });
    } catch (error: any) { alert("Erreur lors du remplacement : " + error.message); }
  };

  const renderStars = (impact: number) => {
    const safeImpact = impact || 1;
    return (
      <div className="flex space-x-0.5 mt-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={`w-3 h-3 ${i < safeImpact ? (safeImpact >= 4 ? 'text-red-500 fill-red-500' : 'text-orange-500 fill-orange-500') : 'text-zinc-300 dark:text-zinc-700'}`} />
        ))}
      </div>
    );
  };

  if (isLoading && !data) return <div className="p-8 text-center text-teal-500 font-bold animate-pulse">{txt.load}</div>;
  if (error || !data?.profile) return <div className="p-8 text-center text-red-500">{txt.notFound}</div>;

  const weeklySchedule = data?.profile?.weekly_schedule || {};
  const sortedPlan = localWeeklyPlan ? [...localWeeklyPlan].sort((a: any, b: any) => {
    return dynamicDaysOrder.indexOf(a.day_name) - dynamicDaysOrder.indexOf(b.day_name);
  }) : [];

  const liftingSessionsCount = localWeeklyPlan?.filter(s => s.workout_exercises?.length > 0).length || 0;
  const allSessionsCompleted = liftingSessionsCount > 0 && (data?.completedSessionIds?.length || 0) >= liftingSessionsCount;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const isTimeLocked = allSessionsCompleted && data?.lastWorkoutDateStr === todayStr;

  const liftingSessionsList = sortedPlan.filter((s: any) => s.workout_exercises && s.workout_exercises.length > 0);
  const lastSessionNeeded = liftingSessionsList[liftingSessionsList.length - 1];
  const lastDayName = lastSessionNeeded ? DAYS[lastSessionNeeded.day_name as keyof typeof DAYS] : "";

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-5xl mx-auto w-full relative pb-24">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
            {txt.title} {data?.existingProgram?.program_type === 'custom' && <span className="ml-3 text-[10px] bg-indigo-500 text-white px-2 py-1 rounded-full uppercase tracking-widest font-black">Perso</span>}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">{txt.sub}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {data && (data.allPrograms?.length || 0) > 0 && (
            <Button onClick={() => setShowManagerModal(true)} variant="outline" className="w-full sm:w-auto border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <FolderGit2 className="w-4 h-4 mr-2" /> {txt.manage}
            </Button>
          )}

          {(!data?.existingProgram || data.existingProgram.program_type === 'ai') && (
            <Button onClick={handleNewCycleClick} variant="outline" className="w-full sm:w-auto border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <RefreshCw className="w-4 h-4 mr-2" /> {txt.newCycle}
            </Button>
          )}

          <Button onClick={handleCreateCustomClick} variant="outline" className="w-full sm:w-auto border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-bold">
            <PenTool className="w-4 h-4 mr-2" /> {customProg ? (lang === 'FR' ? "Éditer mon programme" : "Edit Custom") : txt.createCustom}
          </Button>

          {data?.existingProgram && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  disabled={!allSessionsCompleted}
                  className={`w-full sm:w-auto font-bold transition-all ${
                    allSessionsCompleted 
                      ? isTimeLocked 
                        ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' 
                        : 'bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.6)] border border-orange-400' 
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 opacity-80' 
                  }`}
                >
                  {allSessionsCompleted ? (
                    isTimeLocked ? <><Clock className="w-4 h-4 mr-2" /> {txt.validation}</> : txt.genNext
                  ) : (
                    <><span className="hidden sm:inline">⏳ {lang === 'FR' ? `Attente de la séance : ${lastDayName}` : `Pending: ${lastDayName}`}</span><span className="sm:hidden">⏳ {lastDayName}</span></>
                  )}
                </Button>
              </DropdownMenuTrigger>
              {isTimeLocked && (
                <DropdownMenuContent className="p-3 bg-zinc-900 border-zinc-800 w-64 shadow-2xl rounded-xl">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                    <p className="text-xs font-medium text-zinc-300 leading-relaxed">{txt.timeLock}</p>
                  </div>
                </DropdownMenuContent>
              )}
              {allSessionsCompleted && !isTimeLocked && (
                <DropdownMenuContent className="p-0 border-none bg-transparent w-72 shadow-2xl rounded-2xl overflow-hidden mt-2">
                  <div className="bg-white dark:bg-zinc-950 p-5 border border-zinc-200 dark:border-zinc-800">
                    <h4 className="font-black text-orange-500 flex items-center mb-2"><Zap className="w-4 h-4 mr-2" /> {txt.progTitle}</h4>
                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-4">{txt.progSub}</p>
                    <Button onClick={applyProgressiveOverload} disabled={generating} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold">{generating ? <Loader2 className="w-4 h-4 animate-spin" /> : txt.confirm}</Button>
                  </div>
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          )}
        </div>
      </div>

      {(!localWeeklyPlan || localWeeklyPlan.length === 0) && (
        <div className="flex flex-col items-center justify-center space-y-4 py-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <Dumbbell className="w-16 h-16 text-zinc-300 dark:text-zinc-700" />
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">{txt.noProg}</h2>
          {(data?.allPrograms?.length || 0) === 0 && (
            <Button onClick={() => generateProgram(true)} disabled={generating} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold mt-4">
              {generating ? "Création en cours..." : "Générer mon programme"}
            </Button>
          )}
        </div>
      )}

      {data?.isDeloadWeek && (
        <div className="bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 p-4 rounded-xl flex items-start space-x-3">
          <BatteryCharging className="w-6 h-6 text-blue-500 shrink-0" />
          <div><h4 className="font-bold text-blue-700 dark:text-blue-400">{txt.deloadBadge}</h4><p className="text-sm text-blue-600 dark:text-blue-300 font-medium">{txt.deloadSub}</p></div>
        </div>
      )}

      <div className="space-y-6">
        {sortedPlan.map((session: any) => {
          const dayKey = session.day_name;
          const isFuture = dynamicDaysOrder.indexOf(dayKey) > dynamicDaysOrder.indexOf(todayKey);
          const externalSports = weeklySchedule[dayKey] || [];
          const hasLifting = session.workout_exercises && session.workout_exercises.length > 0;
          const isRestDay = !hasLifting && externalSports.length === 0;
          const isToday = dayKey === todayKey;

          const isCompletedToday = isToday && data?.completedSessionIds?.includes(session.id);
          const isCompletedPast = !isToday && !isFuture && data?.completedSessionIds?.includes(session.id);
          const isCompleted = isCompletedToday || isCompletedPast;

          return (
            <Card key={session.id} className={`transition-all duration-300 relative overflow-hidden ${isToday ? 'border-teal-500 shadow-[0_10px_40px_-10px_rgba(20,184,166,0.4)] ring-2 ring-teal-500/50 bg-gradient-to-b from-white to-teal-50/20 dark:from-zinc-950 dark:to-teal-950/20 scale-[1.02] z-10' : isRestDay ? 'shadow-sm border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 opacity-80 hover:opacity-100' : 'shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'}`}>
              
              {isToday && !isCompleted && <div className="absolute top-0 right-0 bg-teal-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-lg flex items-center shadow-sm"><span className="flex h-1.5 w-1.5 rounded-full bg-white mr-2 animate-pulse"></span><CalendarCheck className="w-3 h-3 mr-1" /> {txt.today}</div>}
              {isCompleted && <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-lg flex items-center shadow-sm"><Zap className="w-3 h-3 mr-1" /> {txt.waitOverload}</div>}
              
              <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <CardTitle className={`text-lg font-bold w-28 ${isToday ? 'text-teal-700 dark:text-teal-400' : 'text-zinc-800 dark:text-zinc-100'}`}>{DAYS[dayKey as keyof typeof DAYS]}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {externalSports.map((sport: string) => (<span key={sport} className="px-2.5 py-1 text-xs font-bold rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 flex items-center"><Activity className="w-3 h-3 mr-1" /> {SPORT_LABELS[sport] || sport}</span>))}
                    {isRestDay && <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{txt.rest}</span>}
                  </div>
                </div>
                {hasLifting && (
                  isFuture || isCompleted ? (
                    <Link href={`/workout/${session.id}?summary=true`}>
                      <Button size="sm" className={`font-bold border-none transition-colors ${isCompleted ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 hover:bg-orange-100' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600'}`}>
                        {isCompleted ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />} 
                        {isCompleted ? "Terminée" : txt.locked}
                      </Button>
                    </Link>
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
                  <div className={`space-y-3 ${isFuture || isCompleted ? 'opacity-60 grayscale' : ''}`}>
                    {session.workout_exercises.map((we: any, index: number) => {
                      const ex = we.exercise_library;
                      const uniqueKey = we.id || `we-${session.id}-${index}`;
                      const thumbnailUrl = getYoutubeThumbnail(ex.youtube_id);

                      return (
                        <div 
                          key={uniqueKey} 
                          draggable={!isCompleted}
                          onDragStart={(e) => handleDragStart(e, session.id, index)}
                          onDragEnter={(e) => handleDragEnter(e, session.id, index)}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-colors ${isToday && !isCompleted ? 'border-teal-100 dark:border-teal-900/50 bg-white/50 dark:bg-zinc-950/50 hover:bg-white dark:hover:bg-zinc-900' : 'border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'} ${draggedItem?.sessionId === session.id && draggedItem?.index === index ? 'opacity-50 border-teal-500 scale-95' : ''} ${dragOverItem?.sessionId === session.id && dragOverItem?.index === index ? 'border-t-2 border-t-teal-500' : ''}`}
                        >
                          <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                            
                            {/* 🛡️ BOUTONS DE TRI (Haut/Bas) DANS LE HUB */}
                            {!isCompleted && !isFuture && (
                              <div className="flex flex-col items-center">
                                <button onClick={() => moveExerciseInHub(session.id, index, 'up')} disabled={index === 0} className="p-1 text-zinc-400 hover:text-teal-500 disabled:opacity-30">
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <div className="cursor-grab active:cursor-grabbing p-1 text-zinc-300 hidden sm:block">
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <button onClick={() => moveExerciseInHub(session.id, index, 'down')} disabled={index === session.workout_exercises.length - 1} className="p-1 text-zinc-400 hover:text-teal-500 disabled:opacity-30">
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                              </div>
                            )}

                            <div className="h-12 w-12 bg-black rounded-lg flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-zinc-200 dark:border-zinc-700 relative p-0">
                              {thumbnailUrl ? <img src={thumbnailUrl} alt={ex.name} className="h-full w-full object-cover absolute inset-0 z-10 opacity-70" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <Dumbbell className="h-6 w-6 text-zinc-400 absolute z-0 opacity-50" />}
                            </div>
                            <div className="flex items-start">
                              <div>
                                <h4 className={`font-bold text-sm ${isToday && !isCompleted ? 'text-zinc-900 dark:text-teal-50' : 'text-zinc-900 dark:text-zinc-100'}`}>{ex.name}</h4>
                                <div className="flex items-center space-x-2 mt-0.5">
                                  <p className="text-xs text-zinc-500 font-medium">{ex.target_muscle} • {ex.equipment_required.replace('_', ' ')}</p>
                                  <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
                                  {renderStars(ex.cns_impact)}
                                </div>
                              </div>
                              <button onClick={() => setInfoModal({ show: true, exercise: ex })} className="ml-2 mt-0.5 p-1 text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400 rounded-full hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors cursor-pointer relative z-20 pointer-events-auto">
                                <Info className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm mt-2 sm:mt-0 relative z-10">
                            {we.recommended_weight !== null && we.recommended_weight !== undefined && (
                              <div className="flex items-center text-teal-700 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-900/40 px-3 py-1 rounded border border-teal-200 dark:border-teal-800">
                                <Target className="w-4 h-4 mr-1.5" /> {we.recommended_weight > 0 ? `${we.recommended_weight} kg` : txt.bw}
                              </div>
                            )}
                            <div className="flex items-center text-zinc-700 dark:text-zinc-300 font-bold bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded"><Repeat className="w-4 h-4 mr-2 text-zinc-500" /> {we.sets} {txt.sets} × {we.target_reps}</div>
                            <div className="flex items-center text-zinc-500 font-medium"><Clock className="w-4 h-4 mr-1.5" />{we.rest_seconds}s</div>
                            <button onClick={() => !(isFuture || isCompleted) && openSwapModal(we.id, ex)} disabled={swapLoading || isFuture || isCompleted} className={`p-1.5 ml-2 rounded-md transition-colors ${isFuture || isCompleted ? 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/30'}`} title={txt.swapTitle}>
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

      <Dialog open={showManagerModal} onOpenChange={setShowManagerModal}>
        <DialogContent className="sm:max-w-sm w-[90vw] mx-auto bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center text-zinc-900 dark:text-zinc-100">
              <FolderGit2 className="w-5 h-5 mr-2 text-indigo-500"/> {txt.manage}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            
            {/* Affichage du Programme ALGO unique */}
            {algoProg ? (
              <div className={`flex flex-col p-4 rounded-xl border transition-colors ${algoProg.is_active ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900'}`}>
                <div className="flex items-center justify-between">
                  <h4 className={`font-bold ${algoProg.is_active ? 'text-teal-700 dark:text-teal-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                    {algoProg.name}
                  </h4>
                  <div className="flex space-x-2">
                    <span className="text-[9px] uppercase font-black tracking-widest px-2 py-1 rounded bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">Algo</span>
                    {algoProg.is_active && <span className="text-[9px] uppercase font-black tracking-widest px-2 py-1 rounded bg-teal-500 text-white flex items-center shadow-sm"><CheckCircle2 className="w-3 h-3 mr-1" /> Actif</span>}
                  </div>
                </div>
                {!algoProg.is_active && (
                  <Button size="sm" onClick={() => activateProgram(algoProg.id)} variant="outline" className="mt-4 font-bold w-full">Charger ce programme</Button>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-center">
                <p className="text-sm font-bold text-zinc-500">Aucun programme IA.</p>
                <Button size="sm" onClick={() => { setShowManagerModal(false); setShowNewCycleModal(true); }} className="mt-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold">Générer via IA</Button>
              </div>
            )}

            {/* Affichage du Programme CUSTOM unique */}
            {customProg ? (
              <div className={`flex flex-col p-4 rounded-xl border transition-colors ${customProg.is_active ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900'}`}>
                <div className="flex items-center justify-between">
                  <h4 className={`font-bold ${customProg.is_active ? 'text-teal-700 dark:text-teal-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                    {customProg.name}
                  </h4>
                  <div className="flex space-x-2">
                    <span className="text-[9px] uppercase font-black tracking-widest px-2 py-1 rounded bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">Perso</span>
                    {customProg.is_active && <span className="text-[9px] uppercase font-black tracking-widest px-2 py-1 rounded bg-teal-500 text-white flex items-center shadow-sm"><CheckCircle2 className="w-3 h-3 mr-1" /> Actif</span>}
                  </div>
                </div>
                <div className="flex space-x-2 mt-4">
                  {!customProg.is_active && <Button size="sm" onClick={() => activateProgram(customProg.id)} variant="outline" className="font-bold flex-1">Charger</Button>}
                  <Button size="sm" onClick={() => router.push(`/workout/builder?edit=${customProg.id}`)} variant="outline" className="flex-1"><PenTool className="w-4 h-4 mr-2" /> Éditer</Button>
                  <Button size="sm" onClick={() => deleteProgram(customProg.id, customProg.is_active)} variant="destructive" className="px-3"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-center">
                <p className="text-sm font-bold text-zinc-500">Aucun programme Personnalisé.</p>
                <Button size="sm" onClick={() => router.push("/workout/builder")} className="mt-2 bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white font-bold">Créer manuellement</Button>
              </div>
            )}
            
          </div>
          <DialogFooter className="mt-4">
            <Button className="w-full font-bold dark:text-white" variant="outline" onClick={() => setShowManagerModal(false)}>{txt.cancel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={infoModal.show} onOpenChange={(open) => !open && setInfoModal({ show: false, exercise: null })}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden w-full mt-auto sm:mt-0 mb-0 sm:mb-auto rounded-t-3xl sm:rounded-2xl border-b-0 sm:border-b">
          {infoModal.exercise && (
            <div className="p-6 text-center space-y-4">
              <h2 className="text-xl font-black dark:text-white">{infoModal.exercise.name}</h2>
              
              <div className="w-full max-w-[250px] mx-auto aspect-[9/16] bg-black flex items-center justify-center relative rounded-xl overflow-hidden shadow-lg border border-zinc-200 dark:border-zinc-800">
                {infoModal.exercise.youtube_id ? (
                  <iframe 
                    src={`https://www.youtube.com/embed/${infoModal.exercise.youtube_id}?autoplay=1&mute=0&rel=0&modestbranding=1&loop=1&playlist=${infoModal.exercise.youtube_id}`}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-600">
                    <PlayCircle className="w-12 h-12 mb-2 opacity-50" />
                    <span className="text-sm font-bold text-zinc-500">Vidéo non disponible</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center space-y-2 mt-4">
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">{infoModal.exercise.target_muscle}</p>
                <div className="flex items-center space-x-2 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] font-black uppercase text-zinc-500">Fatigue SNC</span>
                  {renderStars(infoModal.exercise.cns_impact)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showNewCycleModal} onOpenChange={setShowNewCycleModal}>
        <DialogContent className="sm:max-w-sm w-[90vw] mx-auto bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-indigo-600 dark:text-indigo-400 flex items-center"><RefreshCw className="mr-2 h-5 w-5"/> {txt.cycleTitle}</DialogTitle>
            <DialogDescription className="text-zinc-600 dark:text-zinc-400 pt-2">{txt.cycleSub}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse sm:flex-row gap-3 mt-4">
            <Button variant="outline" className="w-full dark:border-zinc-700 dark:text-zinc-300 font-bold" onClick={() => setShowNewCycleModal(false)}>{txt.cancel}</Button>
            <Button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold" onClick={() => generateProgram(true)} disabled={generating}>{generating ? "..." : txt.confirm}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function WorkoutPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950"><Loader2 className="w-12 h-12 text-teal-500 animate-spin" /></div>}>
      <WorkoutPageContent />
    </Suspense>
  );
}
"use client";

import { useEffect, useState, useRef } from "react";
import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toPng } from "html-to-image";
// 🛡️ CORRECTION DES IMPORTS MANQUANTS ICI
import { ArrowLeft, Check, Dumbbell, Timer, X, Trophy, CheckCircle2, Repeat, Info, Brain, Share2, Loader2, Wind, Sparkles, ShieldCheck, WifiOff, Star, Calculator, Target, ArrowLeftRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/useLanguage";
import { awardWorkoutXP } from "@/lib/gamification-engine";
import AudioHapticTimer from "@/components/AudioHapticTimer";

const getSessionInsights = (exercises: any[], lang: string) => {
  const patterns = exercises.map(we => we.exercise_library?.movement_pattern || "");
  const isLower = patterns.some(p => p.includes("Squat") || p.includes("Hinge") || p.includes("Lunge"));
  const isUpper = patterns.some(p => p.includes("Push") || p.includes("Pull"));

  if (isLower && isUpper) {
    return {
      warmup: [
        { text: lang === 'FR' ? "Cardio léger (3-5 min)" : "Light cardio (3-5 min)", gif: "/running.gif" },
        { text: lang === 'FR' ? "Rotations articulaires complètes" : "Full joint rotations", gif: "/rotations.gif" },
        { text: lang === 'FR' ? "15 Jumping Jacks ou 10 Burpees" : "15 Jumping Jacks", gif: "/jumping-jack.gif" },
        { text: lang === 'FR' ? "2 séries de pompes et squats à vide" : "2 sets of bodyweight squats and push-ups", gif: "/squat.gif" }
      ],
      why: lang === 'FR' ? "Le Full-Body (Corps Entier) stimule l'ensemble de votre système nerveux central. Scientifiquement, cette haute fréquence permet de relancer la synthèse protéique musculaire tous les 48h, maximisant l'anabolisme naturel et la dépense énergétique." : "Full-Body stimulates your entire central nervous system. Scientifically, this high frequency restarts muscle protein synthesis every 48h, maximizing natural anabolism and caloric expenditure."
    };
  } else if (isLower) {
    return {
      warmup: [
        { text: lang === 'FR' ? "Cardio léger (3-5 min)" : "Light cardio (3-5 min)", gif: "/running.gif" },
        { text: lang === 'FR' ? "Étirements dynamiques des hanches" : "Dynamic hip stretches", gif: "/hip-stretch.gif" },
        { text: lang === 'FR' ? "15 fentes alternées au poids du corps" : "15 bodyweight lunges", gif: "/lunge.gif" },
        { text: lang === 'FR' ? "2 séries de squats à vide (pause 2s en bas)" : "2 sets of empty squats (2s pause at bottom)", gif: "/squat.gif" }
      ],
      why: lang === 'FR' ? "Cette séance bas du corps cible les plus grands groupes musculaires (Quadriceps, Fessiers). Cela déclenche une forte libération d'hormones anaboliques (testostérone, hormone de croissance) bénéfique pour l'ensemble du corps." : "This lower body session targets the largest muscle groups. It triggers a strong release of anabolic hormones beneficial for the entire body."
    };
  } else if (isUpper) {
    return {
      warmup: [
        { text: lang === 'FR' ? "Cardio léger (3-5 min)" : "Light cardio (3-5 min)", gif: "/running.gif" },
        { text: lang === 'FR' ? "Rotations des épaules (bras tendus)" : "Shoulder rotations", gif: "/shoulder-rotations.gif" },
        { text: lang === 'FR' ? "Face pulls légers ou disloquations" : "Light face pulls or band dislocations", gif: "/face-pull.gif" },
        { text: lang === 'FR' ? "2 séries de pompes légères" : "2 sets of light push-ups", gif: "/pushup.gif" }
      ],
      why: lang === 'FR' ? "Focus sur la ceinture scapulaire. Équilibrer les mouvements de poussée (Push) et de tirage (Pull) garantit une posture saine, prévient les blessures aux épaules et sculpte le torse et le dos de manière harmonieuse." : "Focus on the shoulder girdle. Balancing push and pull movements ensures healthy posture, prevents shoulder injuries, and sculpts the torso harmoniously."
    };
  }
  
  return {
    warmup: [
      { text: lang === 'FR' ? "5 min de cardio" : "5 min cardio", gif: "/running.gif" },
      { text: lang === 'FR' ? "Rotations articulaires" : "Joint rotations", gif: "/rotations.gif" },
      { text: lang === 'FR' ? "2 séries d'échauffement sur votre 1er exercice" : "2 warm-up sets on your 1st exercise", gif: null }
    ],
    why: lang === 'FR' ? "Séance de renforcement général visant à améliorer la force fonctionnelle." : "General strengthening session aimed at improving functional strength."
  };
};

const extractMaxNumber = (str: string) => {
  if (!str) return 0;
  const matches = str.match(/\d+/g);
  return matches ? parseInt(matches[matches.length - 1]) : 0; 
};

const getRecommendedReps = (str: string) => {
  if (!str) return "";
  if (str.includes("-")) return str.split("-")[0].trim(); 
  const match = str.match(/\d+/); 
  return match ? match[0] : "";
};

const fetchActiveSession = async (id: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user");
  const { data: profile } = await supabase.from("profiles").select("first_name").eq("id", user.id).single();
  const { data: sessionData } = await supabase.from("workout_sessions").select(`*, workout_exercises (*, exercise_library (*))`).eq("id", id).single();
  
  if (!sessionData) throw new Error("Not found");
  if (sessionData.workout_exercises) sessionData.workout_exercises.sort((a: any, b: any) => a.order_index - b.order_index);

  // 🛡️ POINT 2 : GHOST MODE (Récupération des anciens logs)
  const exerciseIds = sessionData.workout_exercises.map((we: any) => we.exercise_id);
  const { data: pastLogs } = await supabase
    .from('workout_logs')
    .select('exercise_id, weight, reps, created_at')
    .eq('user_id', user.id)
    .in('exercise_id', exerciseIds)
    .order('created_at', { ascending: false });

  const ghostData: Record<string, { weight: string, reps: string }> = {};
  const initialInputs: Record<string, { weight: string, reps: string }> = {};
  
  sessionData.workout_exercises.forEach((we: any) => {
    const identifier = we.id || we.exercise_id;
    let defaultWeight = "";
    if (we.recommended_weight !== null && we.recommended_weight !== undefined && we.recommended_weight > 0) defaultWeight = we.recommended_weight.toString();
    const defaultReps = getRecommendedReps(we.target_reps);

    for (let i = 0; i < we.sets; i++) {
      initialInputs[`${identifier}_${i}`] = { weight: defaultWeight, reps: defaultReps };
    }

    // Calcul Ghost Mode
    const exLogs = pastLogs?.filter(l => l.exercise_id === we.exercise_id) || [];
    if (exLogs.length > 0) {
      const lastDate = exLogs[0].created_at.split('T')[0];
      const lastSessionLogs = exLogs.filter(l => l.created_at.startsWith(lastDate));
      lastSessionLogs.sort((a, b) => b.weight - a.weight || b.reps - a.reps);
      const bestSet = lastSessionLogs[0];
      ghostData[identifier] = { weight: bestSet.weight.toString(), reps: bestSet.reps.toString() };
    }
  });

  return { sessionData, initialInputs, ghostData, loadedCompleted: {}, profile };
};

export default function ActiveWorkoutSession() {
  const params = useParams();
  const router = useRouter();
  const { lang } = useLanguage();

  const [sessionKey] = useState(`session-${params.id}-${Date.now()}`);
  
  const { data, error, isLoading } = useSWR(sessionKey, () => fetchActiveSession(params.id as string), { 
    revalidateOnFocus: false,
    keepPreviousData: true 
  });

  const [inputs, setInputs] = useState<Record<string, { weight: string, reps: string }>>({});
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});
  const [restTimer, setRestTimer] = useState<number | null>(null);
  
  const [isWorkoutUnlocked, setIsWorkoutUnlocked] = useState(false);
  const [warmupChecks, setWarmupChecks] = useState<boolean[]>([]);
  const [sessionStartTime] = useState(Date.now());
  const [sessionStats, setSessionStats] = useState({ duration: 0, tonnage: 0, bestSet: "", xpEarned: 0, leveledUp: false, isReplay: false, isOffline: false });
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // 🛡️ POINTS 3 & 5 : NOUVEAUX STATES (Plaques et RPE)
  const [plateModal, setPlateModal] = useState({ show: false, weight: 0 });
  const [showRpeModal, setShowRpeModal] = useState(false);
  const [sessionRpe, setSessionRpe] = useState(7);

  const [showBreathingModal, setShowBreathingModal] = useState(false);
  const [breatheTime, setBreatheTime] = useState(30);

  const [showEndModal, setShowEndModal] = useState(false);
  const [errorModal, setErrorModal] = useState({ show: false, title: "", message: "" });
  const [infoModal, setInfoModal] = useState({ show: false, exercise: null as any });
  
  const stravaCardRef = useRef<HTMLDivElement>(null);

  // 🛡️ POINT 1 : WAKELOCK API (Écran toujours allumé)
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) { console.warn("Wakelock not supported or denied."); }
    };
    if (isWorkoutUnlocked) {
      requestWakeLock();
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isWorkoutUnlocked) requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock !== null) wakeLock.release();
    };
  }, [isWorkoutUnlocked]);

  useEffect(() => {
    if (data && Object.keys(inputs).length === 0) {
      setInputs(data.initialInputs);
      setCompletedSets({}); 
      const stepsCount = getSessionInsights(data.sessionData.workout_exercises, lang).warmup.length;
      setWarmupChecks(new Array(stepsCount).fill(false));
    }
  }, [data, lang, inputs]);

  useEffect(() => {
    if (restTimer === null || restTimer <= 0) return;
    const interval = setInterval(() => { setRestTimer((prev) => (prev && prev > 0 ? prev - 1 : 0)); }, 1000);
    return () => clearInterval(interval);
  }, [restTimer]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showBreathingModal && breatheTime > 0) {
      interval = setInterval(() => { setBreatheTime((prev) => prev - 1); }, 1000);
    } else if (showBreathingModal && breatheTime <= 0) {
      setShowBreathingModal(false);
      setShowEndModal(true);
    }
    return () => clearInterval(interval);
  }, [showBreathingModal, breatheTime]);

  const t: Record<string, any> = {
    FR: { activeTracker: "Tracker Actif", target: "Objectif", rec: "Conseil", dup: "Dupliquer", set: "Série", weight: "Charge (kg)", reps: "Reps", checkAll: "Tout valider", finish: "Terminer la séance", noSetTitle: "Aucune série", noSetMsg: "Validez au moins une série.", sqlErr: "Erreur SQL", load: "Chargement...", notFound: "En attente de connexion...", success: "Séance Écrasée !", successMsg: "Données sécurisées pour la surcharge progressive.", back: "Retour au programme", warmupTitle: "Checklist d'Échauffement", whyTitle: "Science & Objectif", unlockBtn: "Déverrouiller la séance", shareInsta: "Partager en Story", time: "Temps", tonnage: "Tonnage", bestSet: "Meilleure Série", breatheTitle: "Décompression SNC", breatheSub: "Faisons chuter votre cortisol pour la récupération.", skip: "Passer", inhale: "Inspirez", hold: "Bloquez", exhale: "Expirez", anabTarget: "🔥 Fenêtre anabolique : Pensez à vos protéines et buvez 500ml d'eau.", replayTitle: "XP Déjà Collectés", replaySub: "Pour cette séance aujourd'hui.", offlineTitle: "Sauvegardé Hors-Ligne", offlineSub: "Vos données seront synchronisées au retour du réseau.", ghost: "Précédent", rpeTitle: "Difficulté de la séance (RPE)", rpeSub: "Évaluez l'effort global pour ajuster l'algorithme.", rpeValidate: "Valider & Terminer", calcTitle: "Calculateur de Disques", calcSub: "Pour une barre olympique de 20 kg." },
    EN: { activeTracker: "Active Tracker", target: "Target", rec: "Rec", dup: "Duplicate", set: "Set", weight: "Weight (kg)", reps: "Reps", checkAll: "Auto-complete", finish: "Finish Workout", noSetTitle: "No sets logged", noSetMsg: "Please validate at least one set.", sqlErr: "SQL Error", load: "Loading...", notFound: "Waiting for connection...", success: "Workout Crushed!", successMsg: "Data secured for progressive overload.", back: "Back to program", warmupTitle: "Warm-up Checklist", whyTitle: "Science & Goal", unlockBtn: "Unlock workout", shareInsta: "Share to Story", time: "Time", tonnage: "Tonnage", bestSet: "Best Lift", breatheTitle: "CNS Decompression", breatheSub: "Let's drop your cortisol to start recovery.", skip: "Skip", inhale: "Inhale", hold: "Hold", exhale: "Exhale", anabTarget: "🔥 Anabolic window: Get your protein and drink 500ml of water.", replayTitle: "XP Already Claimed", replaySub: "For this session today.", offlineTitle: "Saved Offline", offlineSub: "Data will sync when connection is restored.", ghost: "Previous", rpeTitle: "Session Difficulty (RPE)", rpeSub: "Rate global effort to adjust the algorithm.", rpeValidate: "Confirm & Finish", calcTitle: "Plate Calculator", calcSub: "For a standard 20 kg olympic bar." }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

  const handleWarmupToggle = (index: number) => {
    const newChecks = [...warmupChecks];
    newChecks[index] = !newChecks[index];
    setWarmupChecks(newChecks);
  };
  const isWarmupDone = warmupChecks.length > 0 && warmupChecks.every(Boolean);

  const handleInputChange = (setKey: string, field: "weight" | "reps", value: string) => {
    setInputs((prev) => ({ ...prev, [setKey]: { ...prev[setKey], [field]: value } }));
  };

  const duplicateFirstSet = (identifier: string, totalSets: number) => {
    const firstSetKey = `${identifier}_0`;
    const firstSetData = inputs[firstSetKey];
    if (!firstSetData) return;
    setInputs(prev => {
      const next = { ...prev };
      for (let i = 1; i < totalSets; i++) {
        if (!completedSets[`${identifier}_${i}`]) next[`${identifier}_${i}`] = { ...firstSetData };
      }
      return next;
    });
  };

  const toggleSet = (setKey: string, restSeconds: number) => {
    const isCompleted = completedSets[setKey];
    if (isCompleted) {
      setCompletedSets((prev) => ({ ...prev, [setKey]: false }));
    } else {
      if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate(40);
      setCompletedSets((prev) => ({ ...prev, [setKey]: true }));
      setRestTimer(restSeconds);
    }
  };

  const checkAllSets = () => {
    if (!data?.sessionData) return;
    const newCompleted = { ...completedSets };
    data.sessionData.workout_exercises.forEach((we: any) => {
      const identifier = we.id || we.exercise_id;
      for (let i = 0; i < we.sets; i++) newCompleted[`${identifier}_${i}`] = true;
    });
    setCompletedSets(newCompleted);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60); const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // 🛡️ POINT 3 : CALCULATEUR DE DISQUES
  const calculatePlates = (totalWeight: number) => {
    const barWeight = 20;
    let remaining = (totalWeight - barWeight) / 2;
    if (remaining <= 0) return [];
    
    const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];
    const platesToUse: number[] = [];
    
    for (const plate of availablePlates) {
      while (remaining >= plate) {
        platesToUse.push(plate);
        remaining -= plate;
      }
    }
    return platesToUse;
  };

  // 🛡️ MODIFICATION POINT 5 : Ouvre la modale RPE au lieu de sauvegarder directement
  const preFinishWorkout = () => {
    const hasCompletedSets = Object.values(completedSets).some(val => val === true);
    if (!hasCompletedSets) { setErrorModal({ show: true, title: txt.noSetTitle, message: txt.noSetMsg }); return; }
    setShowRpeModal(true);
  };

  // 🛡️ OFFLINE-FIRST FINISH WORKOUT (Exécuté APRÈS le RPE)
  const executeFinishWorkout = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setShowRpeModal(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !data?.sessionData) { setIsSaving(false); return; }

    const logsToInsert = [];
    let calcTonnage = 0;
    let maxWeight = 0;
    let maxRepsForWeight = 0;
    let bestExName = "";

    for (const [setKey, isCompleted] of Object.entries(completedSets)) {
      if (isCompleted) {
        const [workoutExerciseId, setIdx] = setKey.split('_');
        const values = inputs[setKey] || {};
        const we = data.sessionData.workout_exercises.find((item: any) => item.id === workoutExerciseId || item.exercise_id === workoutExerciseId);

        const weight = parseFloat(values.weight) || 0;
        const fallbackRep = extractMaxNumber(we?.target_reps || "0");
        const reps = parseInt(values.reps) || fallbackRep;

        calcTonnage += (weight * reps);

        if (weight > maxWeight || (weight === maxWeight && reps > maxRepsForWeight)) {
          maxWeight = weight;
          maxRepsForWeight = reps;
          bestExName = we?.exercise_library?.name || "";
        }

        if (we) {
          logsToInsert.push({
            user_id: user.id, 
            session_id: data.sessionData.id, 
            exercise_id: we.exercise_id,
            set_number: parseInt(setIdx) + 1, 
            weight, 
            reps,
            rpe: sessionRpe // 🛡️ Sauvegarde du RPE dans la DB
          });
        }
      }
    }

    const durMins = Math.max(1, Math.floor((Date.now() - sessionStartTime) / 60000));
    let bestSetStr = maxWeight > 0 ? `${maxWeight}kg × ${maxRepsForWeight}` : (lang === 'FR' ? "Poids du corps" : "Bodyweight");
    if (bestExName) bestSetStr += ` (${bestExName})`;

    let isOfflineSaved = false;
    let xpEarned = 0;
    let leveledUp = false;
    let isReplay = false;

    try {
      if (!navigator.onLine) throw new Error("OFFLINE");

      const todayStr = new Date().toISOString().split('T')[0];
      const { data: existingLogs } = await supabase.from('workout_logs').select('id').eq('user_id', user.id).eq('session_id', data.sessionData.id).gte('created_at', todayStr + 'T00:00:00.000Z').limit(1);
      isReplay = Boolean(existingLogs && existingLogs.length > 0);

      const { error } = await supabase.from('workout_logs').insert(logsToInsert);
      if (error) throw error;

      const gamification = await awardWorkoutXP(user.id, calcTonnage, isReplay);
      xpEarned = gamification.xpEarned || 0;
      leveledUp = gamification.leveledUp || false;

    } catch (err: any) {
      console.warn("Réseau indisponible. Sauvegarde locale activée.", err);
      const offlineQueue = JSON.parse(localStorage.getItem('vivex_offline_queue') || '[]');
      offlineQueue.push(...logsToInsert);
      localStorage.setItem('vivex_offline_queue', JSON.stringify(offlineQueue));
      isOfflineSaved = true;
    }

    setSessionStats({ duration: durMins, tonnage: calcTonnage, bestSet: bestSetStr, xpEarned, leveledUp, isReplay, isOffline: isOfflineSaved });
    setRestTimer(null);
    setShowBreathingModal(true);
    setIsSaving(false);
  };

  const getBreathingState = () => {
    const cycle = (30 - breatheTime) % 16;
    if (cycle < 4) return { text: txt.inhale, scale: "scale-150" };
    if (cycle < 8) return { text: txt.hold, scale: "scale-150" };
    if (cycle < 12) return { text: txt.exhale, scale: "scale-100" };
    return { text: txt.hold, scale: "scale-100" };
  };
  const breatheState = getBreathingState();

  const shareToSocials = async () => {
    if (!stravaCardRef.current) return;
    setIsSharing(true);
    try {
      const dataUrl = await toPng(stravaCardRef.current, { cacheBust: true, quality: 1, pixelRatio: 3 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'vivex-workout.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'Séance Vivex', files: [file] });
      } else {
        const link = document.createElement('a');
        link.download = 'vivex-workout.png';
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Erreur de partage', err);
    } finally {
      setIsSharing(false);
    }
  };

  if (isLoading && !data) return <div className="p-8 text-center text-teal-500 font-bold animate-pulse">{txt.load}</div>;
  if (error || !data?.sessionData) return <div className="p-8 text-center text-red-500">{txt.notFound}</div>;

  const session = data.sessionData;
  const insights = getSessionInsights(session.workout_exercises, lang);

  // 🛡️ NOUVEAU RENDU ÉTOILES
  const renderStars = (impact: number) => {
    const safeImpact = impact || 1;
    return (
      <div className="flex space-x-0.5 mt-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star 
            key={i} 
            className={`w-3 h-3 ${i < safeImpact ? (safeImpact >= 4 ? 'text-red-500 fill-red-500' : 'text-orange-500 fill-orange-500') : 'text-zinc-300 dark:text-zinc-700'}`} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 min-h-screen pb-32 relative">
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-teal-500/30 dark:border-teal-500/20 px-4 py-4 flex items-center justify-between shadow-[0_10px_30px_-15px_rgba(20,184,166,0.4)] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-transparent pointer-events-none"></div>
        <button onClick={() => router.push("/workout")} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors relative z-10">
          <ArrowLeft className="w-6 h-6 dark:text-zinc-100" />
        </button>
        <h2 className="text-lg font-black uppercase tracking-widest text-teal-700 dark:text-teal-400 drop-shadow-sm relative z-10">{txt.activeTracker}</h2>
        <div className="w-10 relative z-10"></div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6 mt-6">
        
        {!isWorkoutUnlocked ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute -right-10 -top-10 opacity-5 pointer-events-none"><Brain className="w-48 h-48" /></div>
              <div className="flex items-center space-x-3 mb-6 relative z-10">
                <div className="bg-orange-100 dark:bg-orange-900/40 p-3 rounded-full"><Brain className="w-6 h-6 text-orange-500" /></div>
                <div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">{txt.warmupTitle}</h3>
                  <p className="text-sm font-medium text-zinc-500">{lang === 'FR' ? "Protégez vos articulations avant de charger." : "Protect joints before loading."}</p>
                </div>
              </div>
              
              <div className="space-y-4 relative z-10">
                {insights.warmup.map((step, idx) => (
                  <div key={idx} onClick={() => handleWarmupToggle(idx)} className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${warmupChecks[idx] ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-zinc-200 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-orange-900/50'}`}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 shrink-0 transition-colors ${warmupChecks[idx] ? 'bg-orange-500 border-orange-500' : 'border-zinc-300 dark:border-zinc-700'}`}>
                      {warmupChecks[idx] && <Check className="w-4 h-4 text-white stroke-[3px]" />}
                    </div>
                    {step.gif && (
                      <div className="h-10 w-10 bg-white rounded flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-zinc-200 dark:border-zinc-700 mr-3 p-0.5">
                        <img src={step.gif} alt="Échauffement" loading="lazy" decoding="async" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <span className={`font-bold text-sm ${warmupChecks[idx] ? 'text-orange-700 dark:text-orange-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{step.text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 relative z-10">
                <Button onClick={() => setIsWorkoutUnlocked(true)} disabled={!isWarmupDone} className="w-full h-14 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-black text-lg uppercase tracking-widest rounded-xl shadow-lg shadow-orange-500/30 transition-transform active:scale-95 disabled:opacity-50 disabled:grayscale">
                  {isWarmupDone ? txt.unlockBtn : (lang === 'FR' ? "Terminez la checklist" : "Complete checklist")}
                </Button>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm opacity-50 grayscale pointer-events-none">
              <div className="flex items-start space-x-3">
                <Brain className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div><h3 className="font-bold text-zinc-900 dark:text-zinc-100">{txt.whyTitle}</h3><p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">{insights.why}</p></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {session.workout_exercises.map((we: any, index: number) => {
              const ex = we.exercise_library;
              const identifier = we.id || we.exercise_id;
              const uniqueKey = we.id || `we-${session.id}-${index}`;
              const thumbnailUrl = ex.gif_url ? (ex.gif_url.endsWith('.jpg') ? ex.gif_url : `${ex.gif_url}/0.jpg`) : null;
              
              // 🛡️ POINT 2 : GHOST MODE (Récupération des perfs)
              const ghost = data.ghostData[identifier];

              return (
                <div key={uniqueKey} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="flex items-center space-x-3">
                      <div className="h-12 w-12 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 relative p-1 cursor-pointer hover:border-teal-500 transition-colors" onClick={() => router.push(`/workout/${session.id}/exercice/${ex.id}`)}>
                        {thumbnailUrl ? <img src={thumbnailUrl} alt={ex.name} className="h-full w-full object-contain absolute inset-0 z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <Dumbbell className="h-6 w-6 text-zinc-400 absolute z-0 opacity-50" />}
                      </div>
                      <div className="flex items-start">
                        <div className="cursor-pointer" onClick={() => router.push(`/workout/${session.id}/exercice/${ex.id}`)}>
                          <h3 className="font-bold text-zinc-900 dark:text-zinc-50 hover:text-teal-500 transition-colors">{ex.name}</h3>
                          <div className="flex items-center space-x-2">
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{txt.target} : {we.target_reps} reps</p>
                            <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
                            {renderStars(ex.cns_impact)}
                          </div>
                          {/* 🛡️ AFFICHAGE GHOST MODE */}
                          {ghost && (
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1 opacity-80">
                              👻 {txt.ghost} : {ghost.weight}kg × {ghost.reps}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => duplicateFirstSet(identifier, we.sets)} className="p-2 text-zinc-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:text-teal-400 dark:hover:bg-teal-900/30 rounded-md transition-colors" title={txt.dup}><Repeat className="w-5 h-5" /></button>
                  </div>

                  <div className="p-3 space-y-3 bg-white dark:bg-zinc-950">
                    <div className="flex flex-wrap items-center gap-3 text-sm px-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      {we.recommended_weight !== null && we.recommended_weight !== undefined && (
                        <div className="flex items-center text-teal-700 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-900/40 px-3 py-1 rounded border border-teal-200 dark:border-teal-800">
                          <Target className="w-4 h-4 mr-1.5" /> {we.recommended_weight > 0 ? `${we.recommended_weight} kg` : txt.bw}
                          
                          {/* 🛡️ POINT 3 : CALCULATEUR DE DISQUES (Si > 20kg) */}
                          {we.recommended_weight > 20 && (
                            <button onClick={(e) => { e.stopPropagation(); setPlateModal({ show: true, weight: we.recommended_weight }); }} className="ml-2 bg-teal-200/50 dark:bg-teal-800/50 p-1 rounded hover:bg-teal-300 dark:hover:bg-teal-700 transition-colors">
                              <Calculator className="w-3 h-3 text-teal-700 dark:text-teal-400" />
                            </button>
                          )}
                        </div>
                      )}
                      <button onClick={() => setInfoModal({ show: true, exercise: ex })} className="p-1 text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400 rounded-full hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors cursor-pointer">
                        <Info className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-12 gap-2 px-2 pt-1 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase text-center tracking-wider"><div className="col-span-2">{txt.set}</div><div className="col-span-4">{txt.weight}</div><div className="col-span-4">{txt.reps}</div><div className="col-span-2">OK</div></div>
                    {Array.from({ length: we.sets }).map((_, setIdx) => {
                      const setKey = `${identifier}_${setIdx}`;
                      const isCompleted = completedSets[setKey];
                      const currentValues = inputs[setKey] || { weight: "", reps: "" };

                      return (
                        <div key={setKey} className={`grid grid-cols-12 gap-2 items-center px-2 py-2 rounded-lg transition-colors border ${isCompleted ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 shadow-[inset_0_0_15px_rgba(20,184,166,0.05)]' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm'}`}>
                          <div className="col-span-2 text-center font-bold text-zinc-500 dark:text-zinc-400">{setIdx + 1}</div>
                          <div className="col-span-4"><input type="number" placeholder="0" value={currentValues.weight} onChange={(e) => handleInputChange(setKey, "weight", e.target.value)} disabled={isCompleted} className="w-full bg-transparent text-center font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:bg-white dark:focus:bg-zinc-800 rounded p-1 disabled:opacity-50" /></div>
                          <div className="col-span-4"><input type="number" placeholder="0" value={currentValues.reps} onChange={(e) => handleInputChange(setKey, "reps", e.target.value)} disabled={isCompleted} className="w-full bg-transparent text-center font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:bg-white dark:focus:bg-zinc-800 rounded p-1 disabled:opacity-50" /></div>
                          <div className="col-span-2 flex justify-center"><button onClick={() => toggleSet(setKey, we.rest_seconds)} className={`h-8 w-8 rounded-md flex items-center justify-center transition-transform active:scale-90 ${isCompleted ? 'bg-teal-500 shadow-lg shadow-teal-500/40 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-300 dark:hover:bg-zinc-700'}`}><Check className="w-4 h-4 stroke-[3px]" /></button></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="pt-4 pb-10 space-y-3">
              <button onClick={checkAllSets} className="w-full py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl flex items-center justify-center space-x-2 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors shadow-sm"><CheckCircle2 className="w-5 h-5" /><span>{txt.checkAll}</span></button>
              <button onClick={preFinishWorkout} disabled={isSaving} className="w-full py-4 bg-gradient-to-r from-teal-400 to-teal-600 hover:from-teal-500 hover:to-teal-700 text-white font-black uppercase tracking-widest rounded-xl shadow-[0_10px_25px_-5px_rgba(20,184,166,0.4)] transition-transform hover:scale-[1.02] active:scale-[0.98]">{isSaving ? "..." : txt.finish}</button>
            </div>
          </div>
        )}
      </div>

      <AudioHapticTimer restTimer={restTimer} setRestTimer={setRestTimer} formatTime={formatTime} />

      {/* 🛡️ POINT 5 : MODALE RPE (Avant de terminer la séance) */}
      <Dialog open={showRpeModal} onOpenChange={setShowRpeModal}>
        <DialogContent className="sm:max-w-[400px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-indigo-600 dark:text-indigo-400 flex items-center">
              <Brain className="mr-2 h-5 w-5" /> {txt.rpeTitle}
            </DialogTitle>
            <DialogDescription className="font-medium text-zinc-500">{txt.rpeSub}</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-8">
            <div className="text-center">
              <span className={`text-6xl font-black ${sessionRpe <= 5 ? 'text-green-500' : sessionRpe <= 8 ? 'text-orange-500' : 'text-red-500'}`}>
                {sessionRpe}
              </span>
              <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mt-2">
                {sessionRpe <= 5 ? "Facile / Récupération" : sessionRpe <= 8 ? "Stimulant / Parfait" : "Échec / Épuisant"}
              </p>
            </div>
            <input 
              type="range" min="1" max="10" value={sessionRpe} onChange={(e) => setSessionRpe(parseInt(e.target.value))}
              className="w-full h-3 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
          <DialogFooter>
            <Button onClick={executeFinishWorkout} disabled={isSaving} className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-widest">
              {isSaving ? "..." : txt.rpeValidate}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🛡️ POINT 3 : MODALE CALCULATEUR DE DISQUES */}
      <Dialog open={plateModal.show} onOpenChange={(open) => !open && setPlateModal({ show: false, weight: 0 })}>
        <DialogContent className="sm:max-w-[350px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-teal-600 dark:text-teal-400 flex items-center">
              <Calculator className="mr-2 h-5 w-5" /> {txt.calcTitle}
            </DialogTitle>
            <DialogDescription className="text-zinc-500">{txt.calcSub}</DialogDescription>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center">
            <div className="text-4xl font-black text-zinc-900 dark:text-zinc-100 mb-6">{plateModal.weight} kg</div>
            
            <div className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col items-center space-y-3">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">De chaque côté :</span>
              <div className="flex flex-wrap justify-center gap-2">
                {calculatePlates(plateModal.weight).length === 0 ? (
                  <span className="font-medium text-zinc-500">Barre à vide</span>
                ) : (
                  calculatePlates(plateModal.weight).map((p, i) => (
                    <div key={i} className="bg-teal-500 text-white font-black px-3 py-2 rounded-lg shadow-sm border border-teal-600">
                      {p}kg
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="w-full font-bold dark:border-zinc-800 dark:text-zinc-300" onClick={() => setPlateModal({ show: false, weight: 0 })}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- FIN DES NOUVELLES MODALES --- */}

      <Dialog open={infoModal.show} onOpenChange={(open) => !open && setInfoModal({ show: false, exercise: null })}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden">
          {infoModal.exercise && (
            <div className="p-6 text-center space-y-4">
              <h2 className="text-xl font-black dark:text-white">{infoModal.exercise.name}</h2>
              <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-2 h-48 flex justify-center items-center relative">
                {infoModal.exercise.gif_url ? (
                  <img src={infoModal.exercise.gif_url.endsWith('.jpg') ? infoModal.exercise.gif_url : `${infoModal.exercise.gif_url}/0.jpg`} className="max-h-full object-contain absolute inset-0 z-10 mx-auto" alt="Aperçu" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : null}
                <Dumbbell className="w-8 h-8 text-zinc-400 absolute z-0 opacity-50" />
              </div>
              <div className="flex flex-col items-center space-y-2">
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

      <Dialog open={showBreathingModal}>
        <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-none p-0 overflow-hidden outline-none [&>button]:hidden">
          <div className="p-8 flex flex-col items-center justify-center text-center relative h-[80vh] sm:h-[600px] overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-900/30 via-zinc-950 to-zinc-950 pointer-events-none"></div>
            
            <div className="relative z-10 w-full mb-12">
              <h2 className="text-3xl font-black text-teal-400 flex items-center justify-center">
                <Wind className="mr-3 w-8 h-8" /> {txt.breatheTitle}
              </h2>
              <p className="text-zinc-400 font-medium pt-3">{txt.breatheSub}</p>
            </div>

            <div className="relative flex items-center justify-center w-64 h-64 mx-auto my-auto z-10">
              <div className={`absolute w-40 h-40 bg-teal-500/20 rounded-full transition-transform ease-in-out ${breatheState.scale}`} style={{ transitionDuration: '4000ms' }}></div>
              <div className={`absolute w-48 h-48 bg-teal-500/10 rounded-full transition-transform ease-in-out ${breatheState.scale}`} style={{ transitionDuration: '4000ms', transitionDelay: '200ms' }}></div>
              
              <div className="relative z-10 w-32 h-32 bg-zinc-900 rounded-full flex flex-col items-center justify-center border-2 border-teal-500/50 shadow-[0_0_30px_rgba(20,184,166,0.3)]">
                 <span className="text-sm font-bold text-teal-400 uppercase tracking-widest mb-1">{breatheState.text}</span>
                 <span className="text-4xl font-black text-white">{breatheTime}s</span>
              </div>
            </div>

            <div className="w-full mt-auto relative z-10 pt-12">
              <Button onClick={() => { setShowBreathingModal(false); setShowEndModal(true); }} variant="ghost" className="w-full text-zinc-500 hover:text-white hover:bg-white/10 font-bold uppercase tracking-widest text-xs">
                {txt.skip} ➔
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEndModal} onOpenChange={setShowEndModal}>
        <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 p-0 overflow-hidden flex flex-col h-[90dvh] sm:h-[750px] outline-none">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center relative hide-scrollbar">
            <div className="absolute -left-[9999px]">
              <div ref={stravaCardRef} className="w-[1080px] h-[1920px] bg-zinc-950 relative flex flex-col items-center justify-between py-24 px-16 text-white overflow-hidden" style={{ fontFamily: "sans-serif" }}>
                <img src="/strava-bg.jpg" alt="Background" className="absolute inset-0 w-full h-full object-cover z-0" />
                <div className="relative z-10 text-center space-y-6 mt-16">
                  <div className="flex justify-center mb-8"><div className="bg-yellow-500/10 p-10 rounded-full shadow-[0_0_100px_rgba(234,179,8,0.3)]"><Trophy className="w-56 h-56 text-yellow-400 drop-shadow-[0_0_30px_rgba(234,179,8,0.8)]" /></div></div>
                  <h2 className="text-[100px] font-black uppercase tracking-tighter leading-none text-white drop-shadow-lg">{data?.profile?.first_name} <br/> {lang === 'FR' ? "A DÉTRUIT SA SÉANCE !" : "CRUSHED IT!"}</h2>
                </div>
                <div className="relative z-10 w-full grid grid-cols-1 gap-12 mt-12 px-12">
                  <div className="bg-zinc-950/60 backdrop-blur-xl border-2 border-yellow-500/30 rounded-[3rem] p-16 flex flex-col items-center justify-center space-y-6 shadow-[0_0_50px_rgba(234,179,8,0.1)]">
                    <span className="text-5xl font-bold text-zinc-400 uppercase tracking-widest">{txt.tonnage}</span>
                    <span className="text-[120px] font-black text-yellow-400">{sessionStats.tonnage.toLocaleString()} <span className="text-6xl text-zinc-500">kg</span></span>
                  </div>
                  <div className="bg-zinc-950/60 backdrop-blur-xl border-2 border-yellow-500/30 rounded-[3rem] p-16 flex flex-col items-center justify-center space-y-6 shadow-[0_0_50px_rgba(234,179,8,0.1)]">
                    <span className="text-5xl font-bold text-zinc-400 uppercase tracking-widest">{txt.bestSet}</span>
                    <span className="text-[80px] font-black text-white text-center leading-tight">{sessionStats.bestSet}</span>
                  </div>
                </div>
                <div className="relative z-10 flex items-center space-x-6 bg-zinc-950/80 px-16 py-8 rounded-full backdrop-blur-md mt-auto border border-zinc-800 mb-12">
                  <Dumbbell className="w-16 h-16 text-yellow-400" />
                  <span className="text-5xl font-black tracking-widest text-zinc-100">VIVEX FITNESS</span>
                </div>
              </div>
            </div>
            
            {/* 🛡️ WIDGET OFFLINE / ANTI-TRICHE */}
            {sessionStats.isOffline ? (
              <div className="w-full max-w-[280px] bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 shadow-sm flex flex-col items-center text-center animate-in slide-in-from-top-8">
                <WifiOff className="w-8 h-8 text-zinc-500 mb-2" />
                <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">{txt.offlineTitle}</h4>
                <p className="text-xs text-zinc-500 mt-1">{txt.offlineSub}</p>
              </div>
            ) : sessionStats.isReplay ? (
              <div className="w-full max-w-[280px] bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 shadow-sm flex flex-col items-center text-center animate-in slide-in-from-top-8">
                <ShieldCheck className="w-8 h-8 text-zinc-500 mb-2" />
                <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">{txt.replayTitle}</h4>
                <p className="text-xs text-zinc-500 mt-1">{txt.replaySub}</p>
              </div>
            ) : sessionStats.xpEarned > 0 ? (
              <div className="w-full max-w-[280px] bg-gradient-to-r from-teal-500 to-cyan-500 border-2 border-teal-300 rounded-xl p-4 mb-6 shadow-[0_0_30px_rgba(20,184,166,0.4)] flex flex-col items-center justify-center space-y-1 animate-in slide-in-from-top-8 duration-700">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-6 h-6 text-white animate-pulse" />
                  <span className="text-xl font-black text-white uppercase tracking-widest">+{sessionStats.xpEarned} XP</span>
                </div>
                {sessionStats.leveledUp && <span className="mt-2 bg-yellow-400 text-yellow-950 px-3 py-1 rounded-full text-xs font-black tracking-widest shadow-sm">LEVEL UP !</span>}
              </div>
            ) : null}

            <div className="w-full max-w-[280px] aspect-[9/16] bg-zinc-950 rounded-2xl border border-zinc-800 relative flex flex-col items-center justify-between p-5 shadow-2xl overflow-hidden shrink-0">
              <img src="/strava-bg.jpg" alt="Background" className="absolute inset-0 w-full h-full object-cover z-0" />
              <div className="mt-8 bg-yellow-500/10 p-3 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.3)] relative z-10"><Trophy className="w-10 h-10 text-yellow-400" /></div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none mt-4 text-center z-10 drop-shadow-md">{data?.profile?.first_name} <br/> {lang === 'FR' ? "A DÉTRUIT SA SÉANCE" : "CRUSHED IT"}</h3>
              <div className="w-full space-y-3 mt-auto mb-6 relative z-10">
                <div className="bg-zinc-950/80 backdrop-blur-sm rounded-xl p-4 text-center border border-yellow-500/20 flex flex-col shadow-lg"><span className="text-[10px] font-bold text-zinc-400 uppercase">{txt.tonnage}</span><span className="text-2xl font-black text-yellow-400">{sessionStats.tonnage.toLocaleString()}kg</span></div>
                <div className="bg-zinc-950/80 backdrop-blur-sm rounded-xl p-4 text-center border border-yellow-500/20 flex flex-col shadow-lg"><span className="text-[10px] font-bold text-zinc-400 uppercase">{txt.bestSet}</span><span className="text-sm font-black text-white truncate px-1">{sessionStats.bestSet}</span></div>
              </div>
              <div className="flex items-center space-x-2 opacity-80 relative z-10 mb-2"><Dumbbell className="w-4 h-4 text-yellow-500" /><span className="text-xs font-black tracking-widest text-zinc-300">VIVEX</span></div>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 mt-6 w-full max-w-[280px] text-center shrink-0">
              <p className="text-xs font-bold text-orange-400 leading-relaxed">{txt.anabTarget}</p>
            </div>
          </div>

          <div className="p-4 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 w-full shrink-0 space-y-3 z-50">
            <Button onClick={shareToSocials} disabled={isSharing} className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-zinc-950 font-black text-lg h-12 shadow-lg shadow-yellow-500/20 transition-transform active:scale-95">
              {isSharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Share2 className="w-5 h-5 mr-2" /> {txt.shareInsta}</>}
            </Button>
            <Button onClick={() => router.push("/workout")} variant="outline" className="w-full h-12 font-bold bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors">
              {txt.back}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
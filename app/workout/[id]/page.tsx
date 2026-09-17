"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import useSWR from "swr";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toPng } from "html-to-image";
import confetti from "canvas-confetti"; 
import { ArrowLeft, Check, Dumbbell, Timer, X, Trophy, CheckCircle2, Repeat, Info, Brain, Share2, Loader2, Wind, Sparkles, ShieldCheck, WifiOff, Star, Calculator, Target, ArrowLeftRight, Scale, Filter, Activity, ArrowUp, ArrowDown, Flame, Copy, PlayCircle, GripVertical } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/useLanguage";
import { awardWorkoutXP } from "@/lib/gamification-engine";
import AudioHapticTimer from "@/components/AudioHapticTimer";

const PLATES = [
  { weight: 25, color: "bg-red-500", h: "h-20", w: "w-4" },
  { weight: 20, color: "bg-blue-500", h: "h-20", w: "w-3" },
  { weight: 15, color: "bg-yellow-400", h: "h-16", w: "w-3" },
  { weight: 10, color: "bg-green-500", h: "h-12", w: "w-3" },
  { weight: 5, color: "bg-white text-black", h: "h-10", w: "w-2" },
  { weight: 2.5, color: "bg-zinc-800", h: "h-8", w: "w-1" },
  { weight: 1.25, color: "bg-zinc-700", h: "h-6", w: "w-1" }
];

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
      why: lang === 'FR' ? "Le Full-Body stimule l'ensemble de votre système nerveux central. Scientifiquement, cette haute fréquence permet de relancer la synthèse protéique musculaire tous les 48h, maximisant l'anabolisme." : "Full-Body stimulates your entire central nervous system. Scientifically, this high frequency restarts muscle protein synthesis every 48h, maximizing natural anabolism."
    };
  } else if (isLower) {
    return {
      warmup: [
        { text: lang === 'FR' ? "Cardio léger (3-5 min)" : "Light cardio (3-5 min)", gif: "/running.gif" },
        { text: lang === 'FR' ? "Étirements dynamiques des hanches" : "Dynamic hip stretches", gif: "/hip-stretch.gif" },
        { text: lang === 'FR' ? "15 fentes alternées au poids du corps" : "15 bodyweight lunges", gif: "/lunge.gif" },
        { text: lang === 'FR' ? "2 séries de squats à vide (pause 2s en bas)" : "2 sets of empty squats (2s pause at bottom)", gif: "/squat.gif" }
      ],
      why: lang === 'FR' ? "Cette séance bas du corps cible les plus grands groupes musculaires (Quadriceps, Fessiers). Cela déclenche une forte libération d'hormones anaboliques (testostérone) bénéfique pour le corps entier." : "This lower body session targets the largest muscle groups. It triggers a strong release of anabolic hormones beneficial for the entire body."
    };
  } else if (isUpper) {
    return {
      warmup: [
        { text: lang === 'FR' ? "Cardio léger (3-5 min)" : "Light cardio (3-5 min)", gif: "/running.gif" },
        { text: lang === 'FR' ? "Rotations des épaules (bras tendus)" : "Shoulder rotations", gif: "/shoulder-rotations.gif" },
        { text: lang === 'FR' ? "Face pulls légers ou disloquations" : "Light face pulls or band dislocations", gif: "/face-pull.gif" },
        { text: lang === 'FR' ? "2 séries de pompes légères" : "2 sets of light push-ups", gif: "/pushup.gif" }
      ],
      why: lang === 'FR' ? "Focus sur la ceinture scapulaire. Équilibrer les mouvements de poussée (Push) et de tirage (Pull) garantit une posture saine et prévient les blessures aux épaules." : "Focus on the shoulder girdle. Balancing push and pull movements ensures healthy posture and prevents shoulder injuries."
    };
  }
  return {
    warmup: [
      { text: lang === 'FR' ? "5 min de cardio" : "5 min cardio", gif: "/running.gif" },
      { text: lang === 'FR' ? "Rotations articulaires" : "Joint rotations", gif: "/rotations.gif" },
      { text: lang === 'FR' ? "2 séries d'échauffement" : "2 warm-up sets", gif: null }
    ],
    why: lang === 'FR' ? "Séance de renforcement général." : "General strengthening session."
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

const getYoutubeThumbnail = (youtubeId?: string) => {
  if (!youtubeId) return null;
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
};

const fetchActiveSession = async (id: string, searchParams: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: sessionData } = await supabase.from("workout_sessions").select(`*, workout_exercises (*, exercise_library (*))`).eq("id", id).single();
  
  if (!sessionData) throw new Error("Not found");
  if (sessionData.workout_exercises) sessionData.workout_exercises.sort((a: any, b: any) => a.order_index - b.order_index);

  const todayStr = new Date().toISOString().split('T')[0];
  const { data: logsToday } = await supabase.from("workout_logs").select("id").eq("user_id", user.id).eq("session_id", id).gte("created_at", todayStr + "T00:00:00.000Z").limit(1);
  
  const isReadOnly = (logsToday && logsToday.length > 0) || searchParams?.get('summary') === 'true';

  const exerciseIds = sessionData.workout_exercises.map((we: any) => we.exercise_id);
  const { data: pastLogs } = await supabase
    .from('workout_logs')
    .select('exercise_id, session_id, set_number, weight, reps, created_at, rpe')
    .eq('user_id', user.id)
    .in('exercise_id', exerciseIds)
    .order('created_at', { ascending: false });

  const ghostData: Record<string, { weight: string, reps: string }> = {};
  const initialInputs: Record<string, { weight: string, reps: string }> = {};
  const loggedInputs: Record<string, { weight: string, reps: string }> = {};
  
  sessionData.workout_exercises.forEach((we: any) => {
    const identifier = we.id || we.exercise_id;
    let defaultWeight = "";
    if (we.recommended_weight !== null && we.recommended_weight !== undefined && we.recommended_weight > 0) defaultWeight = we.recommended_weight.toString();
    const defaultReps = getRecommendedReps(we.target_reps);

    for (let i = 0; i < we.sets; i++) {
      initialInputs[`${identifier}_${i}`] = { weight: defaultWeight, reps: defaultReps };
    }

    const exLogs = pastLogs?.filter(l => l.exercise_id === we.exercise_id) || [];
    
    if (isReadOnly) {
      const logsOfThisSessionToday = exLogs.filter(l => l.session_id === id && l.created_at.startsWith(todayStr));
      logsOfThisSessionToday.sort((a,b) => a.set_number - b.set_number);
      for (let i = 0; i < we.sets; i++) {
        const logForSet = logsOfThisSessionToday.find(l => l.set_number === i + 1);
        if (logForSet) {
          loggedInputs[`${identifier}_${i}`] = { weight: logForSet.weight.toString(), reps: logForSet.reps.toString() };
        } else {
          loggedInputs[`${identifier}_${i}`] = { weight: "0", reps: "0" };
        }
      }
    }

    const ghostLogs = exLogs.filter(l => l.session_id !== id && l.created_at.split('T')[0] !== todayStr);
    if (ghostLogs.length > 0) {
      const lastDate = ghostLogs[0].created_at.split('T')[0];
      const lastSessionLogs = ghostLogs.filter(l => l.created_at.startsWith(lastDate));
      lastSessionLogs.sort((a, b) => b.weight - a.weight || b.reps - a.reps);
      const bestSet = lastSessionLogs[0];
      ghostData[identifier] = { weight: bestSet.weight.toString(), reps: bestSet.reps.toString() };
    }
  });

  return { sessionData, initialInputs, loggedInputs, ghostData, profile, isReadOnly };
};

function ActiveWorkoutSessionContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();

  const [sessionKey] = useState(`session-${params.id}-${Date.now()}`);
  const storageKey = `vivex_tracker_${params.id}`;
  
  const { data, error, mutate, isLoading } = useSWR(sessionKey, () => fetchActiveSession(params.id as string, searchParams), { 
    revalidateOnFocus: false,
    keepPreviousData: true 
  });

  const [localExercises, setLocalExercises] = useState<any[]>([]);
  const [inputs, setInputs] = useState<Record<string, { weight: string, reps: string }>>({});
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});
  
  const [targetTime, setTargetTime] = useState<number | null>(null);
  
  const [isWorkoutUnlocked, setIsWorkoutUnlocked] = useState(false);
  const [warmupChecks, setWarmupChecks] = useState<boolean[]>([]);
  const [sessionStartTime] = useState(Date.now());
  const [sessionStats, setSessionStats] = useState({ duration: 0, tonnage: 0, bestSet: "", xpEarned: 0, leveledUp: false, isReplay: false, isOffline: false });
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [plateModal, setPlateModal] = useState({ show: false, targetWeight: "", barWeight: "20" });
  const [showRpeModal, setShowRpeModal] = useState(false);
  const [sessionRpe, setSessionRpe] = useState(7);
  
  const [convertModal, setConvertModal] = useState({ show: false, kgValue: "", lbsValue: "" });
  const [showBreathingModal, setShowBreathingModal] = useState(false);
  const [breatheTime, setBreatheTime] = useState(30);
  const [showEndModal, setShowEndModal] = useState(false);
  const [infoModal, setInfoModal] = useState({ show: false, exercise: null as any });
  const [errorModal, setErrorModal] = useState({ show: false, title: "", message: "" });
  const [videoModal, setVideoModal] = useState<{show: boolean, youtubeId: string | null}>({show: false, youtubeId: null});
  const [swapModal, setSwapModal] = useState({ show: false, weId: "", currentEx: null as any, alternatives: [] as any[] });
  
  const [swapLoading, setSwapLoading] = useState(false);
  const [searchSwapQuery, setSearchSwapQuery] = useState("");
  const [selectedSwapMuscle, setSelectedSwapMuscle] = useState("Tous");
  const [selectedSwapStar, setSelectedSwapStar] = useState<number | null>(null);
  const [selectedSwapPattern, setSelectedSwapPattern] = useState<string | null>(null);
  const [selectedSwapEquipment, setSelectedSwapEquipment] = useState<string | null>(null);
  const [showWarmupFor, setShowWarmupFor] = useState<string | null>(null);
  
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  
  const stravaCardRef = useRef<HTMLDivElement>(null);

  const calculatePlates = () => {
    const target = parseFloat(plateModal.targetWeight);
    const bar = parseFloat(plateModal.barWeight);
    if (!target || !bar || target <= bar) return [];

    let weightPerSide = (target - bar) / 2;
    const platesNeeded: {weight: number, count: number, visual: any}[] = [];

    for (const plate of PLATES) {
      if (weightPerSide >= plate.weight) {
        const count = Math.floor(weightPerSide / plate.weight);
        platesNeeded.push({ weight: plate.weight, count, visual: plate });
        weightPerSide -= (plate.weight * count);
        weightPerSide = Math.round(weightPerSide * 100) / 100;
      }
    }
    return platesNeeded;
  };
  const requiredPlates = calculatePlates();

  useEffect(() => {
    const savedRpe = localStorage.getItem("vivex_last_rpe");
    if (savedRpe) {
      setSessionRpe(parseInt(savedRpe));
    }
  }, []);

  useEffect(() => {
    if (data?.sessionData?.workout_exercises) {
      setLocalExercises(data.sessionData.workout_exercises);
    }
  }, [data]);

  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) wakeLock = await (navigator as any).wakeLock.request('screen');
      } catch (err) {}
    };
    if (isWorkoutUnlocked && !data?.isReadOnly) requestWakeLock();
    const handleVisibilityChange = () => { if (document.visibilityState === 'visible' && isWorkoutUnlocked && !data?.isReadOnly) requestWakeLock(); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock !== null) wakeLock.release();
    };
  }, [isWorkoutUnlocked, data?.isReadOnly]);

  useEffect(() => {
    if (data && Object.keys(inputs).length === 0) {
      if (data.isReadOnly && data.loggedInputs && Object.keys(data.loggedInputs).length > 0) {
        setInputs(data.loggedInputs);
        const allCompleted: Record<string, boolean> = {};
        Object.keys(data.loggedInputs).forEach(k => allCompleted[k] = true);
        setCompletedSets(allCompleted);
        setIsWorkoutUnlocked(true); 
        return;
      }
      const savedState = localStorage.getItem(storageKey);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          setInputs(parsed.inputs || data.initialInputs);
          setCompletedSets(parsed.completedSets || {});
          setIsWorkoutUnlocked(parsed.isWorkoutUnlocked || false);
        } catch (e) {
          setInputs(data.initialInputs);
          setCompletedSets({});
        }
      } else {
        setInputs(data.initialInputs);
        setCompletedSets({}); 
      }
      const stepsCount = getSessionInsights(data.sessionData.workout_exercises, lang).warmup.length;
      setWarmupChecks(new Array(stepsCount).fill(false));
    }
  }, [data, lang, inputs, storageKey]);

  useEffect(() => {
    if (Object.keys(inputs).length > 0 && !data?.isReadOnly) {
      localStorage.setItem(storageKey, JSON.stringify({ inputs, completedSets, isWorkoutUnlocked }));
    }
  }, [inputs, completedSets, isWorkoutUnlocked, storageKey, data?.isReadOnly]);

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

  const t = {
    FR: { bw: "Poids du corps", activeTracker: "Tracker Actif", target: "Objectif", dup: "Dupliquer", set: "Série", weight: "Charge (kg)", reps: "Reps", checkAll: "Tout valider", finish: "Terminer la séance", noSetTitle: "Aucune série", noSetMsg: "Validez au moins une série.", load: "Chargement...", notFound: "En attente...", back: "Retour au programme", warmupTitle: "Checklist d'Échauffement", whyTitle: "Science & Objectif", unlockBtn: "Déverrouiller la séance", shareInsta: "Partager", tonnage: "Tonnage", bestSet: "Meilleure Série", breatheTitle: "Décompression SNC", breatheSub: "Faisons chuter votre cortisol pour la récupération.", skip: "Passer", inhale: "Inspirez", hold: "Bloquez", exhale: "Expirez", anabTarget: "🔥 Fenêtre anabolique : Protéines + Hydratation.", replayTitle: "XP Déjà Collectés", replaySub: "Pour cette séance aujourd'hui.", offlineTitle: "Sauvegardé Hors-Ligne", offlineSub: "Vos données seront synchronisées.", ghost: "Précédent", rpeTitle: "Difficulté (RPE)", rpeSub: "Évaluez l'effort global.", rpeValidate: "Valider & Terminer", calcTitle: "Calculateur", calcSub: "Configurez la charge.", swapTitle: "Remplacer l'exercice", swapSub: "Alternatives :", noAlt: "Aucune alternative.", select: "Choisir", search: "Rechercher...", warmupSetTitle: "Séries d'Échauffement", generateWarmup: "Générer la Chauffe", warmupSet: "Chauffe", eachSide: "Par côté :", noPlates: "Entrez un poids cible > barre." },
    EN: { bw: "Bodyweight", activeTracker: "Active Tracker", target: "Target", dup: "Duplicate", set: "Set", weight: "Weight (kg)", reps: "Reps", checkAll: "Auto-complete", finish: "Finish Workout", noSetTitle: "No sets logged", noSetMsg: "Please validate at least one set.", load: "Loading...", notFound: "Waiting...", back: "Back to program", warmupTitle: "Warm-up Checklist", whyTitle: "Science & Goal", unlockBtn: "Unlock workout", shareInsta: "Share", tonnage: "Tonnage", bestSet: "Best Lift", breatheTitle: "CNS Decompression", breatheSub: "Let's drop your cortisol.", skip: "Skip", inhale: "Inhale", hold: "Hold", exhale: "Exhale", anabTarget: "🔥 Anabolic window: Protein + Hydration.", replayTitle: "XP Already Claimed", replaySub: "For this session today.", offlineTitle: "Saved Offline", offlineSub: "Data will sync when restored.", ghost: "Previous", rpeTitle: "Difficulty (RPE)", rpeSub: "Rate global effort.", rpeValidate: "Confirm & Finish", calcTitle: "Plate Calculator", calcSub: "Configure weight.", swapTitle: "Swap Exercise", swapSub: "Alternatives:", noAlt: "No alternatives.", select: "Select", search: "Search...", warmupSetTitle: "Warm-up Sets", generateWarmup: "Generate Warm-up", warmupSet: "Warm", eachSide: "Per side:", noPlates: "Enter target weight > bar." }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

  const handleWarmupToggle = (index: number) => {
    const newChecks = [...warmupChecks];
    newChecks[index] = !newChecks[index];
    setWarmupChecks(newChecks);
  };
  const isWarmupDone = warmupChecks.length > 0 && warmupChecks.every(Boolean);

  const handleInputChange = (setKey: string, field: "weight" | "reps", value: string) => {
    if (data?.isReadOnly) return;
    setInputs((prev) => ({ ...prev, [setKey]: { ...prev[setKey], [field]: value } }));
  };

  const applyGhostWeights = (identifier: string) => {
    if (data?.isReadOnly) return;
    const ghost = data?.ghostData[identifier];
    if (!ghost) return;
    setInputs(prev => {
      const next = { ...prev };
      const we = data?.sessionData.workout_exercises.find((w:any) => w.id === identifier || w.exercise_id === identifier);
      if (we) {
        for (let i = 0; i < we.sets; i++) {
          if (!completedSets[`${identifier}_${i}`]) next[`${identifier}_${i}`] = { weight: ghost.weight, reps: ghost.reps };
        }
      }
      return next;
    });
  };

  const duplicateFirstSet = (identifier: string, totalSets: number) => {
    if (data?.isReadOnly) return;
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

  const toggleSet = (setKey: string, restSeconds: number, weId: string, currentSetIdx: number, totalSets: number) => {
    if (data?.isReadOnly) return;
    const isCompleted = completedSets[setKey];
    if (isCompleted) {
      setCompletedSets((prev) => ({ ...prev, [setKey]: false }));
    } else {
      if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate(40);
      setCompletedSets((prev) => ({ ...prev, [setKey]: true }));
      
      setTargetTime(Date.now() + restSeconds * 1000);
      
      setTimeout(() => {
        let nextElementId = null;
        if (currentSetIdx + 1 < totalSets) {
          nextElementId = `set-row-${weId}_${currentSetIdx + 1}`;
        } else {
          const currentIndex = localExercises.findIndex(we => we.id === weId || we.exercise_id === weId);
          if (currentIndex !== -1 && currentIndex + 1 < localExercises.length) {
            const nextWe = localExercises[currentIndex + 1];
            nextElementId = `exercise-block-${nextWe.id || nextWe.exercise_id}`;
          }
        }
        if (nextElementId) {
          const el = document.getElementById(nextElementId);
          if (el) {
            const y = el.getBoundingClientRect().top + window.pageYOffset - 120;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }
      }, 300);
    }
  };

  const checkAllSets = () => {
    if (data?.isReadOnly) return;
    const newCompleted = { ...completedSets };
    data?.sessionData.workout_exercises.forEach((we: any) => {
      const identifier = we.id || we.exercise_id;
      for (let i = 0; i < we.sets; i++) newCompleted[`${identifier}_${i}`] = true;
    });
    setCompletedSets(newCompleted);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60); const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // 🛡️ CORRECTION : Tri d'exercices dans le Tracker (Flèches & Drag)
  const moveExercise = async (index: number, direction: 'up' | 'down') => {
    if (data?.isReadOnly) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === localExercises.length - 1) return;

    const newArray = [...localExercises];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Échange Optimistic UI (Aide aussi hors ligne)
    const temp = newArray[index];
    newArray[index] = newArray[targetIndex];
    newArray[targetIndex] = temp;
    
    setLocalExercises(newArray);
    if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate(10);

    try {
      if (!data?.sessionData?.id) return; // Sécurité TypeScript
      const updates = newArray.map((ex, i) => ({
        id: ex.id, session_id: data.sessionData.id, exercise_id: ex.exercise_id, order_index: i
      }));
      await supabase.from("workout_exercises").upsert(updates);
    } catch (err) {
      console.error("Erreur sauvegarde réorganisation:", err);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
    e.dataTransfer.effectAllowed = "move";
  };
  
  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIdx(index);
    if (draggedIdx === null || draggedIdx === index) return;
    
    setLocalExercises(prev => {
      const newArray = [...prev];
      const item = newArray[draggedIdx];
      newArray.splice(draggedIdx, 1);
      newArray.splice(index, 0, item);
      return newArray;
    });
    setDraggedIdx(index);
  };
  
  const handleDragEnd = async () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
    if (!data?.sessionData || data?.isReadOnly) return; 
    try {
      if (!data?.sessionData?.id) return; // Sécurité TypeScript
      const updates = localExercises.map((ex, i) => ({
        id: ex.id, session_id: data.sessionData.id, exercise_id: ex.exercise_id, order_index: i
      }));
      await supabase.from("workout_exercises").upsert(updates);
    } catch (err) {
      console.error("Erreur sauvegarde réorganisation:", err);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const renderWarmupSets = (we: any, index: number) => {
    if (showWarmupFor !== we.id) return null;
    const identifier = we.id || we.exercise_id;
    const ghost = data?.ghostData?.[identifier];
    const target = we.recommended_weight > 0 ? we.recommended_weight : (ghost ? parseFloat(ghost.weight) : 0);
    if (target <= 20) return <div className="px-2 pb-2 text-xs text-zinc-500 italic">Pas de chauffe requise pour ce poids.</div>;

    const set2Weight = Math.round((target * 0.5) / 2.5) * 2.5;
    const set3Weight = Math.round((target * 0.75) / 2.5) * 2.5;

    const warmups = [ { weight: 20, reps: 10 }, { weight: set2Weight, reps: 5 }, { weight: set3Weight, reps: 3 } ];

    return (
      <div className="bg-orange-50 dark:bg-orange-900/10 border-b border-orange-100 dark:border-orange-900/30 p-2 space-y-2 animate-in slide-in-from-top-4">
        <div className="text-xs font-black text-orange-600 dark:text-orange-500 uppercase tracking-widest px-2 mb-2 flex items-center">
          <Flame className="w-3 h-3 mr-1" /> {txt.warmupSetTitle}
        </div>
        {warmups.map((wSet, i) => (
          <div key={`warmup-${i}`} className="grid grid-cols-12 gap-2 items-center px-2 py-1.5 rounded-lg bg-white/50 dark:bg-zinc-900/50 opacity-80">
            <div className="col-span-2 text-center font-bold text-orange-500 text-xs">{txt.warmupSet}</div>
            <div className="col-span-4 text-center font-black text-zinc-700 dark:text-zinc-300">{wSet.weight} kg</div>
            <div className="col-span-4 text-center font-black text-zinc-700 dark:text-zinc-300">{wSet.reps}</div>
            <div className="col-span-2 flex justify-center"><CheckCircle2 className="w-5 h-5 text-orange-300 dark:text-orange-800" /></div>
          </div>
        ))}
      </div>
    );
  };

  const preFinishWorkout = () => {
    if (data?.isReadOnly) return;
    const hasCompletedSets = Object.values(completedSets).some(val => val === true);
    if (!hasCompletedSets) { setErrorModal({ show: true, title: txt.noSetTitle, message: txt.noSetMsg }); return; }
    setShowRpeModal(true);
  };

  const executeFinishWorkout = async () => {
    if (isSaving || data?.isReadOnly) return;
    setIsSaving(true);
    setShowRpeModal(false);

    localStorage.setItem("vivex_last_rpe", sessionRpe.toString());

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !data?.sessionData) { setIsSaving(false); return; }

    const logsToInsert = [];
    let calcTonnage = 0;
    let maxWeight = 0;
    let maxRepsForWeight = 0;
    let bestExName = "";
    let hitPR = false; 

    for (const [setKey, isCompleted] of Object.entries(completedSets)) {
      if (isCompleted) {
        const [workoutExerciseId, setIdx] = setKey.split('_');
        const values = inputs[setKey] || {};
        const we = data.sessionData.workout_exercises.find((item: any) => item.id === workoutExerciseId || item.exercise_id === workoutExerciseId);

        const weight = parseFloat(values.weight) || 0;
        const fallbackRep = extractMaxNumber(we?.target_reps || "0");
        const reps = parseInt(values.reps) || fallbackRep;

        const identifier = we?.id || we?.exercise_id;
        const ghost = data.ghostData[identifier];
        if (ghost && weight > parseFloat(ghost.weight)) {
          hitPR = true;
        }

        calcTonnage += (weight * reps);

        if (weight > maxWeight || (weight === maxWeight && reps > maxRepsForWeight)) {
          maxWeight = weight;
          maxRepsForWeight = reps;
          bestExName = we?.exercise_library?.name || "";
        }

        if (we) {
          logsToInsert.push({
            user_id: user.id, session_id: data.sessionData.id, exercise_id: we.exercise_id,
            set_number: parseInt(setIdx) + 1, weight, reps, rpe: sessionRpe 
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
      console.warn("Réseau indisponible.");
      const offlineQueue = JSON.parse(localStorage.getItem('vivex_offline_queue') || '[]');
      offlineQueue.push(...logsToInsert);
      localStorage.setItem('vivex_offline_queue', JSON.stringify(offlineQueue));
      isOfflineSaved = true;
    }

    if (hitPR && !isReplay && !isOfflineSaved) {
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          zIndex: 99999,
          colors: ['#f59e0b', '#10b981', '#6366f1']
        });
      }, 500);
    }

    localStorage.removeItem(storageKey);
    setSessionStats({ duration: durMins, tonnage: calcTonnage, bestSet: bestSetStr, xpEarned, leveledUp, isReplay, isOffline: isOfflineSaved });
    setTargetTime(null);
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
    } catch (err) {} 
    finally { setIsSharing(false); }
  };

  const openSwapModal = async (weId: string, currentEx: any) => {
    if (!data?.profile || data?.isReadOnly) return;
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
      
      const newArray = [...localExercises];
      const index = newArray.findIndex(we => we.id === swapModal.weId);
      if (index !== -1) {
        newArray[index] = { ...newArray[index], exercise_id: newEx.id, exercise_library: newEx };
        setLocalExercises(newArray);
      }
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
  if (error || !data?.sessionData) return <div className="p-8 text-center text-red-500">{txt.notFound}</div>;

  const session = data.sessionData;
  const insights = getSessionInsights(localExercises, lang);
  const dataSaverEnabled = data.profile?.data_saver_enabled || false; 

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
        
        {!isWorkoutUnlocked && !data.isReadOnly ? (
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
                    {step.gif && !dataSaverEnabled && (
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
            
            {data.isReadOnly && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm mb-4">
                <ShieldCheck className="w-5 h-5 mr-2" />
                <span className="font-black uppercase tracking-widest text-sm">Mode Résumé — Séance Verrouillée</span>
              </div>
            )}

            {localExercises.map((we: any, index: number) => {
              const ex = we.exercise_library;
              const identifier = we.id || we.exercise_id;
              const uniqueKey = we.id || `we-${session.id}-${index}`;
              const thumbnailUrl = getYoutubeThumbnail(ex.youtube_id);
              const ghost = data.ghostData[identifier];

              return (
                <div 
                  id={`exercise-block-${identifier}`} 
                  key={uniqueKey} 
                  draggable={!data.isReadOnly}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  className={`bg-white dark:bg-zinc-900 border rounded-xl overflow-hidden shadow-sm transition-all ${draggedIdx === index ? 'opacity-50 border-teal-500 scale-95' : 'border-zinc-200 dark:border-zinc-800 opacity-100'} ${dragOverIdx === index ? 'border-t-2 border-t-teal-500' : ''}`}
                >
                  <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="flex items-center space-x-3 flex-1">
                      
                      {/* 🛡️ BOUTONS DE TRI (Haut/Bas) POUR MOBILE + DRAG POUR DESKTOP */}
                      {!data.isReadOnly && (
                        <div className="flex flex-col items-center mr-2">
                          <button onClick={() => moveExercise(index, 'up')} disabled={index === 0} className="p-1 text-zinc-400 hover:text-teal-500 disabled:opacity-30">
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <div className="cursor-grab active:cursor-grabbing p-1 text-zinc-300 hidden sm:block">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <button onClick={() => moveExercise(index, 'down')} disabled={index === localExercises.length - 1} className="p-1 text-zinc-400 hover:text-teal-500 disabled:opacity-30">
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {dataSaverEnabled ? (
                         <div className="h-14 w-14 bg-zinc-200 dark:bg-zinc-800 rounded-lg flex flex-col items-center justify-center border border-zinc-300 dark:border-zinc-700 relative p-0 shrink-0">
                           <WifiOff className="w-5 h-5 text-zinc-500 opacity-50" />
                         </div>
                      ) : (
                        <button 
                          onClick={() => ex.youtube_id ? setVideoModal({show: true, youtubeId: ex.youtube_id}) : null} 
                          className="h-14 w-14 bg-black rounded-lg flex flex-col items-center justify-center overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 relative p-0 cursor-pointer hover:border-red-500 hover:shadow-[0_0_10px_rgba(239,68,68,0.2)] transition-all group"
                        >
                          {thumbnailUrl ? (
                            <>
                              <img src={thumbnailUrl} alt={ex.name} className="h-full w-full object-cover absolute inset-0 z-0 opacity-60 group-hover:opacity-40 transition-opacity" />
                              <PlayCircle className="w-6 h-6 text-white relative z-10 drop-shadow-lg group-hover:scale-110 transition-transform" />
                            </>
                          ) : (
                            <Dumbbell className="h-6 w-6 text-zinc-400 opacity-50" />
                          )}
                        </button>
                      )}

                      <div className="flex items-start flex-1">
                        <div className="cursor-pointer flex-1" onClick={() => router.push(`/workout/${session.id}/exercise/${ex.id}`)}>
                          <h3 className="font-bold text-zinc-900 dark:text-zinc-50 hover:text-teal-500 transition-colors leading-tight line-clamp-2 pr-2">{ex.name}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{txt.target} : {we.target_reps} reps</p>
                            <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
                            {renderStars(ex.cns_impact)}
                          </div>
                          {ghost && (
                            <div className="flex items-center space-x-2 mt-1">
                              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest opacity-80">
                                👻 {txt.ghost} : {ghost.weight}kg × {ghost.reps}
                              </p>
                              {!data.isReadOnly && (
                                <button onClick={(e) => { e.stopPropagation(); applyGhostWeights(identifier); }} className="text-indigo-400 hover:text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded transition-colors flex items-center" title="Copier pour toutes les séries">
                                  <Copy className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 space-y-3 bg-white dark:bg-zinc-950">
                    <div className="flex flex-wrap items-center gap-3 text-sm px-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      {we.recommended_weight !== null && we.recommended_weight !== undefined && (
                        <div className="flex items-center text-teal-700 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-900/40 px-3 py-1 rounded border border-teal-200 dark:border-teal-800">
                          <Target className="w-4 h-4 mr-1.5" /> {we.recommended_weight > 0 ? `${we.recommended_weight} kg` : txt.bw}
                          
                          <button onClick={(e) => { 
                            e.stopPropagation(); 
                            setPlateModal({ show: true, targetWeight: we.recommended_weight > 0 ? we.recommended_weight.toString() : "", barWeight: "20" }); 
                          }} className="ml-2 bg-teal-200/50 dark:bg-teal-800/50 p-1 rounded hover:bg-teal-300 dark:hover:bg-teal-700 transition-colors">
                            <Calculator className="w-3 h-3 text-teal-700 dark:text-teal-400" />
                          </button>
                        </div>
                      )}
                      
                      <button onClick={(e) => { 
                        e.stopPropagation(); 
                        const initKg = we.recommended_weight > 0 ? we.recommended_weight.toString() : "";
                        setConvertModal({ show: true, kgValue: initKg, lbsValue: initKg ? (parseFloat(initKg) * 2.20462).toFixed(1) : "" }); 
                      }} className="p-1 text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400 rounded-full hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors cursor-pointer" title="Convertisseur">
                        <Scale className="w-4 h-4" />
                      </button>

                      <button onClick={() => setInfoModal({ show: true, exercise: ex })} className="p-1 text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400 rounded-full hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors cursor-pointer">
                        <Info className="w-4 h-4" />
                      </button>

                      {(index === 0 || we.recommended_weight > 20) && !data.isReadOnly && (
                        <button onClick={() => setShowWarmupFor(showWarmupFor === we.id ? null : we.id)} className={`flex items-center px-2 py-1 text-xs font-bold rounded-md transition-colors ${showWarmupFor === we.id ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/60'}`}>
                          <Flame className="w-3 h-3 mr-1" /> {txt.generateWarmup}
                        </button>
                      )}

                      <div className="flex items-center space-x-1 ml-auto">
                        <button onClick={() => openSwapModal(we.id, ex)} disabled={swapLoading || data.isReadOnly} className="p-1.5 rounded-md text-zinc-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors disabled:opacity-30" title={txt.swapTitle}>
                          <ArrowLeftRight className="w-4 h-4" />
                        </button>
                        <button onClick={() => duplicateFirstSet(identifier, we.sets)} disabled={data.isReadOnly} className="p-1.5 rounded-md text-zinc-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:text-teal-400 dark:hover:bg-teal-900/30 transition-colors disabled:opacity-30" title={txt.dup}>
                          <Repeat className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {!data.isReadOnly && renderWarmupSets(we, index)}

                    <div className="grid grid-cols-12 gap-2 px-2 pt-1 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase text-center tracking-wider"><div className="col-span-2">{txt.set}</div><div className="col-span-4">{txt.weight}</div><div className="col-span-4">{txt.reps}</div><div className="col-span-2">OK</div></div>
                    {Array.from({ length: we.sets }).map((_, setIdx) => {
                      const setKey = `${identifier}_${setIdx}`;
                      const isCompleted = data.isReadOnly || completedSets[setKey];
                      const currentValues = inputs[setKey] || { weight: "", reps: "" };
                      
                      const isPR = ghost && parseFloat(currentValues.weight) > parseFloat(ghost.weight) && isCompleted && !data.isReadOnly;
                      const inputClass = `w-full bg-transparent text-center font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:bg-white dark:focus:bg-zinc-800 rounded p-1 disabled:opacity-50 transition-all ${isPR ? 'ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' : ''}`;

                      return (
                        <div id={`set-row-${setKey}`} key={setKey} className={`grid grid-cols-12 gap-2 items-center px-2 py-2 rounded-lg transition-colors border ${isCompleted ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 shadow-[inset_0_0_15px_rgba(20,184,166,0.05)]' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm'}`}>
                          <div className="col-span-2 text-center font-bold text-zinc-500 dark:text-zinc-400 relative">
                            {setIdx + 1}
                            {isPR && <Sparkles className="w-3 h-3 text-yellow-500 absolute -top-1 -right-1" />}
                          </div>
                          <div className="col-span-4"><input type="number" placeholder="0" value={currentValues.weight} onChange={(e) => handleInputChange(setKey, "weight", e.target.value)} disabled={isCompleted || data.isReadOnly} className={inputClass} /></div>
                          <div className="col-span-4"><input type="number" placeholder="0" value={currentValues.reps} onChange={(e) => handleInputChange(setKey, "reps", e.target.value)} disabled={isCompleted || data.isReadOnly} className={inputClass} /></div>
                          <div className="col-span-2 flex justify-center"><button onClick={() => toggleSet(setKey, we.rest_seconds, identifier, setIdx, we.sets)} disabled={data.isReadOnly} className={`h-8 w-8 rounded-md flex items-center justify-center transition-transform active:scale-90 disabled:opacity-80 ${isCompleted ? 'bg-teal-500 shadow-lg shadow-teal-500/40 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-300 dark:hover:bg-zinc-700'}`}><Check className="w-4 h-4 stroke-[3px]" /></button></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {data.isReadOnly ? (
              <div className="pt-4 pb-10 space-y-4">
                <div className="w-full py-4 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 font-black uppercase tracking-widest rounded-xl text-center flex flex-col items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-inner">
                  <ShieldCheck className="w-6 h-6 mb-2 text-indigo-500" />
                  Séance Verrouillée
                  <span className="text-xs font-bold lowercase opacity-70 mt-1">XP déjà collectés aujourd'hui</span>
                </div>
                <Button onClick={() => router.push("/dashboard")} className="w-full py-6 bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-widest rounded-xl shadow-lg transition-transform active:scale-95">Retour au Dashboard</Button>
              </div>
            ) : (
              <div className="pt-4 pb-10 space-y-3">
                <button onClick={checkAllSets} className="w-full py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl flex items-center justify-center space-x-2 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors shadow-sm"><CheckCircle2 className="w-5 h-5" /><span>{txt.checkAll}</span></button>
                <button onClick={preFinishWorkout} disabled={isSaving} className="w-full py-4 bg-gradient-to-r from-teal-400 to-teal-600 hover:from-teal-500 hover:to-teal-700 text-white font-black uppercase tracking-widest rounded-xl shadow-[0_10px_25px_-5px_rgba(20,184,166,0.4)] transition-transform hover:scale-[1.02] active:scale-[0.98]">{isSaving ? "..." : txt.finish}</button>
              </div>
            )}
            
          </div>
        )}
      </div>

      <AudioHapticTimer targetTime={targetTime} setTargetTime={setTargetTime} formatTime={formatTime} />

      <Dialog open={videoModal.show} onOpenChange={(open) => !open && setVideoModal({show: false, youtubeId: null})}>
        <DialogContent className="sm:max-w-[380px] bg-transparent border-none p-0 overflow-hidden w-full flex items-center justify-center shadow-none">
          <div className="w-full max-w-[360px] mx-auto aspect-[9/16] bg-black flex items-center justify-center relative rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-zinc-800">
            {videoModal.youtubeId && (
              <iframe 
                src={`https://www.youtube.com/embed/${videoModal.youtubeId}?autoplay=1&mute=0&rel=0&modestbranding=1&loop=1&playlist=${videoModal.youtubeId}`}
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={swapModal.show} onOpenChange={(open) => !open && setSwapModal({ show: false, weId: "", currentEx: null, alternatives: [] })}>
        <DialogContent className="sm:max-w-[600px] w-full bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 mt-auto sm:mt-0 mb-0 sm:mb-auto rounded-t-3xl sm:rounded-2xl border-b-0 sm:border-b p-0 overflow-hidden h-[85dvh] sm:h-[90dvh] flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <DialogTitle className="flex items-center text-indigo-600 dark:text-indigo-400">
              <ArrowLeftRight className="mr-2 h-5 w-5"/> {txt.swapTitle}
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 space-y-3 shrink-0">
            <div className="flex items-center space-x-2">
              <Input placeholder={txt.search} value={searchSwapQuery} onChange={(e) => setSearchSwapQuery(e.target.value)} className="bg-white dark:bg-zinc-950 font-medium flex-1" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className={`shrink-0 px-3 ${selectedSwapStar !== null ? 'border-orange-500 text-orange-600' : ''}`}><Filter className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">SNC</span></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSelectedSwapStar(null)}>Toutes</DropdownMenuItem>
                  {[5, 4, 3, 2, 1].map(s => <DropdownMenuItem key={s} onClick={() => setSelectedSwapStar(s)}>{s} Étoiles</DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className={`shrink-0 px-3 ${selectedSwapPattern !== null ? 'border-teal-500 text-teal-600' : ''}`}><Activity className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Mouv.</span></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSelectedSwapPattern(null)}>Tous</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedSwapPattern("push")}>Push</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedSwapPattern("pull")}>Pull</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedSwapPattern("squat")}>Squat</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedSwapPattern("hinge")}>Hinge</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedSwapPattern("core")}>Core</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className={`shrink-0 px-3 ${selectedSwapEquipment !== null ? 'border-purple-500 text-purple-600' : ''}`}><Dumbbell className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Matériel</span></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSelectedSwapEquipment(null)}>Tous</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedSwapEquipment("poids_corps")}>Poids de corps</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedSwapEquipment("salle")}>Machine/Salle</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedSwapEquipment("home_gym")}>Haltères/Léger</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
              {["Tous", "Pectoraux", "Dos", "Jambes", "Épaules", "Biceps", "Triceps", "Abdos"].map(muscle => (
                <button key={muscle} onClick={() => setSelectedSwapMuscle(muscle)} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold border ${selectedSwapMuscle === muscle ? 'bg-indigo-500 text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                  {muscle}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-zinc-50 dark:bg-zinc-950">
            {filteredSwapAlternatives.length === 0 ? (
              <p className="text-sm font-bold text-zinc-500 text-center mt-10">{txt.noAlt}</p>
            ) : (
              filteredSwapAlternatives.map((alt) => (
                <div key={alt.id} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-500 transition-colors">
                  <div className="flex-1 min-w-0 pr-4">
                    <h5 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm truncate">{alt.name}</h5>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{alt.target_muscle}</p>
                      <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
                      <div className="flex space-x-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-2 h-2 ${i < alt.cns_impact ? (alt.cns_impact >= 4 ? 'text-red-500 fill-red-500' : 'text-orange-500 fill-orange-500') : 'text-zinc-300 dark:text-zinc-700'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => confirmSwap(alt)} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold shrink-0">
                    {txt.select}
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRpeModal} onOpenChange={setShowRpeModal}>
        <DialogContent className="sm:max-w-[400px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 w-full mt-auto sm:mt-0 mb-0 sm:mb-auto rounded-t-3xl sm:rounded-2xl border-b-0 sm:border-b">
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
            <Button onClick={executeFinishWorkout} disabled={isSaving} className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-widest rounded-xl">
              {isSaving ? "..." : txt.rpeValidate}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🛡️ MODALE DE CALCULATRICE DE DISQUE INTÉGRÉE (Toujours accessible via l'icône target) */}
      <Dialog open={plateModal.show} onOpenChange={(open) => !open && setPlateModal({ show: false, targetWeight: "", barWeight: "20" })}>
        <DialogContent className="sm:max-w-[350px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 w-full mt-auto sm:mt-0 mb-0 sm:mb-auto rounded-t-3xl sm:rounded-2xl border-b-0 sm:border-b">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-teal-600 dark:text-teal-400 flex items-center">
              <Calculator className="mr-2 h-5 w-5" /> {txt.calcTitle}
            </DialogTitle>
            <DialogDescription className="text-zinc-500">{txt.calcSub}</DialogDescription>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center">
            
            <div className="flex w-full space-x-2 mb-6">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] uppercase font-bold text-zinc-400">Objectif (kg)</Label>
                <Input type="number" value={plateModal.targetWeight} onChange={(e) => setPlateModal(prev => ({ ...prev, targetWeight: e.target.value }))} className="font-black text-center h-10 border-teal-200" />
              </div>
              <div className="w-20 space-y-1">
                <Label className="text-[10px] uppercase font-bold text-zinc-400">Barre</Label>
                <Input type="number" value={plateModal.barWeight} onChange={(e) => setPlateModal(prev => ({ ...prev, barWeight: e.target.value }))} className="font-black text-center h-10" />
              </div>
            </div>

            <div className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col items-center space-y-3">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{txt.eachSide}</span>
              <div className="flex flex-wrap justify-center gap-2">
                {requiredPlates.length === 0 ? (
                  <span className="font-medium text-zinc-500 text-sm">Barre à vide ou <br/>Poids invalide</span>
                ) : (
                  requiredPlates.map((p, i) => (
                    <div key={i} className="flex items-center justify-center bg-teal-500 text-white font-black px-2 py-1.5 rounded-lg shadow-sm border border-teal-600 text-sm">
                      {p.weight} <span className="ml-1 opacity-70 text-[10px]">×{p.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={convertModal.show} onOpenChange={(open) => !open && setConvertModal({ show: false, kgValue: "", lbsValue: "" })}>
        <DialogContent className="sm:max-w-[320px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 w-full mt-auto sm:mt-0 mb-0 sm:mb-auto rounded-t-3xl sm:rounded-2xl border-b-0 sm:border-b">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-teal-600 dark:text-teal-400 flex items-center">
              <Scale className="mr-2 h-5 w-5" /> Conversion
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-bold text-zinc-500">KILOGRAMMES</Label>
                <Input type="number" value={convertModal.kgValue} onChange={(e) => { const kg = e.target.value; setConvertModal({ show: true, kgValue: kg, lbsValue: kg ? (parseFloat(kg) * 2.20462).toFixed(1) : "" }); }} className="font-black text-xl text-center h-14 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" placeholder="0" />
              </div>
              <ArrowLeftRight className="w-6 h-6 text-zinc-300 dark:text-zinc-700 mt-4 shrink-0" />
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-bold text-teal-600 dark:text-teal-500">POUNDS (LBS)</Label>
                <Input type="number" value={convertModal.lbsValue} onChange={(e) => { const lbs = e.target.value; setConvertModal({ show: true, lbsValue: lbs, kgValue: lbs ? (parseFloat(lbs) / 2.20462).toFixed(1) : "" }); }} className="font-black text-xl text-center text-teal-600 dark:text-teal-500 h-14 bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800" placeholder="0" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={infoModal.show} onOpenChange={(open) => !open && setInfoModal({ show: false, exercise: null })}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden w-full mt-auto sm:mt-0 mb-0 sm:mb-auto rounded-t-3xl sm:rounded-2xl border-b-0 sm:border-b">
          {infoModal.exercise && (
            <div className="p-6 text-center space-y-4">
              <h2 className="text-xl font-black dark:text-white">{infoModal.exercise.name}</h2>
              
              {dataSaverEnabled ? (
                <div className="w-full max-w-[200px] mx-auto aspect-[9/16] bg-zinc-100 dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col justify-center items-center">
                  <WifiOff className="w-10 h-10 text-zinc-400 mb-2" />
                  <span className="text-xs font-bold text-zinc-500">Mode Éco</span>
                </div>
              ) : (
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
              )}

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
        <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 p-0 overflow-hidden flex flex-col h-[90dvh] sm:h-[750px] outline-none w-full mt-auto sm:mt-0 mb-0 sm:mb-auto rounded-t-3xl sm:rounded-2xl border-b-0 sm:border-b">
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

export default function WorkoutPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950"><Loader2 className="w-12 h-12 text-teal-500 animate-spin" /></div>}>
      <ActiveWorkoutSessionContent />
    </Suspense>
  );
}
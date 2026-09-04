"use client";

import { useEffect, useState, useRef } from "react";
import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toPng } from "html-to-image";
import { ArrowLeft, Check, Dumbbell, Timer, X, Trophy, AlertCircle, CheckCircle2, Repeat, Info, Flame, Brain, Share2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/useLanguage";

const getSessionInsights = (exercises: any[], lang: string) => {
  const patterns = exercises.map(we => we.exercise_library?.movement_pattern || "");
  const isLower = patterns.some(p => p.includes("Squat") || p.includes("Hinge") || p.includes("Lunge"));
  const isUpper = patterns.some(p => p.includes("Push") || p.includes("Pull"));

  if (isLower && isUpper) {
    return {
      warmup: [
        { text: lang === 'FR' ? "Cardio léger (3-5 min)" : "Light cardio (3-5 min)", gif: "/running.gif" },
        { text: lang === 'FR' ? "Rotations articulaires complètes (épaules, hanches, poignets)" : "Full joint rotations", gif: null },
        { text: lang === 'FR' ? "15 Jumping Jacks ou 10 Burpees" : "15 Jumping Jacks", gif: "/jumping-jack.gif" },
        { text: lang === 'FR' ? "2 séries de pompes et squats à vide" : "2 sets of bodyweight squats and push-ups", gif: "/squat.gif" }
      ],
      why: lang === 'FR' ? "Le Full-Body (Corps Entier) stimule l'ensemble de votre système nerveux central. Scientifiquement, cette haute fréquence permet de relancer la synthèse protéique musculaire tous les 48h, maximisant l'anabolisme naturel et la dépense énergétique." : "Full-Body stimulates your entire central nervous system. Scientifically, this high frequency restarts muscle protein synthesis every 48h, maximizing natural anabolism and caloric expenditure."
    };
  } else if (isLower) {
    return {
      warmup: [
        { text: lang === 'FR' ? "Cardio léger (3-5 min)" : "Light cardio (3-5 min)", gif: "/running.gif" },
        { text: lang === 'FR' ? "Étirements dynamiques des hanches (position 90/90)" : "Dynamic hip stretches (90/90)", gif: null },
        { text: lang === 'FR' ? "15 fentes alternées au poids du corps" : "15 bodyweight lunges", gif: null },
        { text: lang === 'FR' ? "2 séries de squats à vide avec 2s de pause en bas" : "2 sets of empty squats with 2s pause at bottom", gif: "/squat.gif" }
      ],
      why: lang === 'FR' ? "Cette séance bas du corps cible les plus grands groupes musculaires (Quadriceps, Fessiers). Cela déclenche une forte libération d'hormones anaboliques (testostérone, hormone de croissance) bénéfique pour l'ensemble du corps." : "This lower body session targets the largest muscle groups. It triggers a strong release of anabolic hormones beneficial for the entire body."
    };
  } else if (isUpper) {
    return {
      warmup: [
        { text: lang === 'FR' ? "Cardio léger (3-5 min)" : "Light cardio (3-5 min)", gif: "/running.gif" },
        { text: lang === 'FR' ? "Rotations des épaules (bras tendus)" : "Shoulder rotations", gif: null },
        { text: lang === 'FR' ? "Face pulls légers ou disloquations avec élastique" : "Light face pulls or band dislocations", gif: null },
        { text: lang === 'FR' ? "2 séries de pompes légères" : "2 sets of light push-ups", gif: null }
      ],
      why: lang === 'FR' ? "Focus sur la ceinture scapulaire. Équilibrer les mouvements de poussée (Push) et de tirage (Pull) garantit une posture saine, prévient les blessures aux épaules et sculpte le torse et le dos de manière harmonieuse." : "Focus on the shoulder girdle. Balancing push and pull movements ensures healthy posture, prevents shoulder injuries, and sculpts the torso harmoniously."
    };
  }
  
  return {
    warmup: [
      { text: lang === 'FR' ? "5 min de cardio" : "5 min cardio", gif: "/running.gif" },
      { text: lang === 'FR' ? "Rotations articulaires" : "Joint rotations", gif: null },
      { text: lang === 'FR' ? "2 séries d'échauffement sur votre premier exercice" : "2 warm-up sets on your first exercise", gif: null }
    ],
    why: lang === 'FR' ? "Séance de renforcement général visant à améliorer la force fonctionnelle." : "General strengthening session aimed at improving functional strength."
  };
};

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

const extractNumber = (str: string) => {
  const match = str.match(/\d+/);
  return match ? match[0] : "";
};

const fetchActiveSession = async (id: string) => {
  const { data: sessionData } = await supabase.from("workout_sessions").select(`*, workout_exercises (*, exercise_library (*))`).eq("id", id).single();
  if (!sessionData) throw new Error("Not found");
  if (sessionData.workout_exercises) sessionData.workout_exercises.sort((a: any, b: any) => a.order_index - b.order_index);

  const initialInputs: Record<string, { weight: string, reps: string }> = {};
  sessionData.workout_exercises.forEach((we: any) => {
    const identifier = we.id || we.exercise_id;
    const defaultReps = extractNumber(we.target_reps);
    const defaultWeight = we.recommended_weight && we.recommended_weight > 0 ? we.recommended_weight.toString() : "";
    for (let i = 0; i < we.sets; i++) initialInputs[`${identifier}_${i}`] = { weight: defaultWeight, reps: defaultReps };
  });

  const { data: logs } = await supabase.from("workout_logs").select("*").eq("session_id", id);
  const loadedCompleted: Record<string, boolean> = {};
  if (logs && logs.length > 0) {
    logs.forEach((log) => {
      const we = sessionData.workout_exercises.find((w: any) => w.exercise_id === log.exercise_id);
      if (we) {
        const setKey = `${we.id || we.exercise_id}_${log.set_number - 1}`;
        initialInputs[setKey] = { weight: log.weight.toString(), reps: log.reps.toString() };
        loadedCompleted[setKey] = true;
      }
    });
  }
  return { sessionData, initialInputs, loadedCompleted };
};

export default function ActiveWorkoutSession() {
  const params = useParams();
  const router = useRouter();
  const { lang } = useLanguage();

  const { data, error, isLoading } = useSWR(`session-${params.id}`, () => fetchActiveSession(params.id as string), { revalidateOnFocus: false });

  const [inputs, setInputs] = useState<Record<string, { weight: string, reps: string }>>({});
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});
  const [restTimer, setRestTimer] = useState<number | null>(null);
  
  // UX GAMIFICATION & CHECKLIST
  const [isWorkoutUnlocked, setIsWorkoutUnlocked] = useState(false);
  const [warmupChecks, setWarmupChecks] = useState<boolean[]>([]);
  const [sessionStartTime] = useState(Date.now());
  const [sessionStats, setSessionStats] = useState({ duration: 0, tonnage: 0, bestSet: "" });
  const [isSharing, setIsSharing] = useState(false);
  
  const [showEndModal, setShowEndModal] = useState(false);
  const [errorModal, setErrorModal] = useState({ show: false, title: "", message: "" });
  const [infoModal, setInfoModal] = useState({ show: false, exercise: null as any });
  
  const stravaCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data && warmupChecks.length === 0) {
      setInputs(data.initialInputs);
      setCompletedSets(data.loadedCompleted);
      const stepsCount = getSessionInsights(data.sessionData.workout_exercises, lang).warmup.length;
      setWarmupChecks(new Array(stepsCount).fill(false));
      
      if (Object.keys(data.loadedCompleted).length > 0) setIsWorkoutUnlocked(true);
    }
  }, [data, lang, warmupChecks.length]);

  useEffect(() => {
    if (restTimer === null || restTimer <= 0) return;
    const interval = setInterval(() => { setRestTimer((prev) => (prev && prev > 0 ? prev - 1 : 0)); }, 1000);
    return () => clearInterval(interval);
  }, [restTimer]);

  type TranslationDict = Record<string, string>;
  const t: Record<string, TranslationDict> = {
    FR: { activeTracker: "Tracker Actif", target: "Objectif", rec: "Conseil", dup: "Dupliquer la 1ère série", set: "Série", weight: "Charge (kg)", reps: "Reps", checkAll: "Tout valider automatiquement", finish: "Terminer la séance", noSetTitle: "Aucune série", noSetMsg: "Validez au moins une série.", sqlErr: "Erreur SQL", load: "Chargement...", notFound: "Introuvable.", success: "Séance Écrasée !", successMsg: "Données sécurisées pour la surcharge progressive.", back: "Retour au programme", warmupTitle: "Checklist d'Échauffement", whyTitle: "Science & Objectif", unlockBtn: "Déverrouiller la séance", shareInsta: "Partager en Story", time: "Temps", tonnage: "Tonnage", bestSet: "Meilleure Série", helpBtn: "Comment utiliser ?", helpTitle: "Instructions", help1: "1. Pré-remplissage des poids recommandés.", help2: "2. Ajustez le premier set et dupliquez.", help3: "3. Validez pour lancer le timer.", helpGo: "C'est parti !" },
    EN: { activeTracker: "Active Tracker", target: "Target", rec: "Rec", dup: "Duplicate 1st set", set: "Set", weight: "Weight (kg)", reps: "Reps", checkAll: "Auto-complete all sets", finish: "Finish Workout", noSetTitle: "No sets logged", noSetMsg: "Please validate at least one set.", sqlErr: "SQL Error", load: "Loading...", notFound: "Not found.", success: "Workout Crushed!", successMsg: "Data secured for progressive overload.", back: "Back to program", warmupTitle: "Warm-up Checklist", whyTitle: "Science & Goal", unlockBtn: "Unlock workout", shareInsta: "Share to Story", time: "Time", tonnage: "Tonnage", bestSet: "Best Lift", helpBtn: "How to use?", helpTitle: "Instructions", help1: "1. Pre-filled recommended weights.", help2: "2. Adjust first set and duplicate.", help3: "3. Validate to start timer.", helpGo: "Let's go!" }
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

  const finishWorkout = async () => {
    const hasCompletedSets = Object.values(completedSets).some(val => val === true);
    if (!hasCompletedSets) { setErrorModal({ show: true, title: txt.noSetTitle, message: txt.noSetMsg }); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !data?.sessionData) return;

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
        const reps = parseInt(values.reps) || parseInt(extractNumber(we?.target_reps || "0"));

        calcTonnage += (weight * reps);

        if (weight > maxWeight || (weight === maxWeight && reps > maxRepsForWeight)) {
          maxWeight = weight;
          maxRepsForWeight = reps;
          bestExName = we?.exercise_library?.name || "";
        }

        if (we) {
          logsToInsert.push({
            user_id: user.id, session_id: data.sessionData.id, exercise_id: we.exercise_id,
            set_number: parseInt(setIdx) + 1, weight, reps
          });
        }
      }
    }

    const { error } = await supabase.from('workout_logs').insert(logsToInsert);
    if (error) { setErrorModal({ show: true, title: txt.sqlErr, message: error.message }); return; }

    const durMins = Math.max(1, Math.floor((Date.now() - sessionStartTime) / 60000));
    
    let bestSetStr = maxWeight > 0 ? `${maxWeight}kg × ${maxRepsForWeight}` : (lang === 'FR' ? "Poids du corps" : "Bodyweight");
    if (bestExName) bestSetStr += ` (${bestExName})`;

    setSessionStats({ duration: durMins, tonnage: calcTonnage, bestSet: bestSetStr });
    
    setShowEndModal(true);
    setRestTimer(null);
  };

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

  return (
    <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 min-h-screen pb-32 relative">
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-teal-500/30 dark:border-teal-500/20 px-4 py-4 flex items-center justify-between shadow-[0_10px_30px_-15px_rgba(20,184,166,0.4)] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-transparent pointer-events-none"></div>
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors relative z-10">
          <ArrowLeft className="w-6 h-6 dark:text-zinc-100" />
        </button>
        <h2 className="text-lg font-black uppercase tracking-widest text-teal-700 dark:text-teal-400 drop-shadow-sm relative z-10">{txt.activeTracker}</h2>
        <div className="w-10 relative z-10"></div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6 mt-6">
        
        {/* CHECKLIST ÉCHAUFFEMENT OBLIGATOIRE (AVEC GIFS) */}
        {!isWorkoutUnlocked ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute -right-10 -top-10 opacity-5 pointer-events-none"><Flame className="w-48 h-48" /></div>
              <div className="flex items-center space-x-3 mb-6 relative z-10">
                <div className="bg-orange-100 dark:bg-orange-900/40 p-3 rounded-full"><Flame className="w-6 h-6 text-orange-500" /></div>
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
                        <img src={step.gif} alt="Échauffement" className="w-full h-full object-contain" />
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
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 shadow-sm flex items-start space-x-3">
              <Brain className="w-6 h-6 text-indigo-500 shrink-0 mt-0.5" />
              <div><h3 className="font-bold text-indigo-700 dark:text-indigo-400 mb-1">{txt.whyTitle}</h3><p className="text-sm text-indigo-600 dark:text-indigo-300 font-medium leading-relaxed">{insights.why}</p></div>
            </div>

            {session.workout_exercises.map((we: any, index: number) => {
              const ex = we.exercise_library;
              const identifier = we.id || we.exercise_id;
              const uniqueKey = we.id || `we-${session.id}-${index}`;
              const thumbnailUrl = ex.gif_url ? (ex.gif_url.endsWith('.jpg') ? ex.gif_url : `${ex.gif_url}/0.jpg`) : null;

              return (
                <div key={uniqueKey} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="flex items-center space-x-3">
                      <div className="h-12 w-12 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 relative p-1">
                        {thumbnailUrl ? <img src={thumbnailUrl} alt={ex.name} className="h-full w-full object-contain absolute inset-0 z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : null}<Dumbbell className="h-6 w-6 text-zinc-400 absolute z-0" />
                      </div>
                      <div className="flex items-start">
                        <div>
                          <h3 className="font-bold text-zinc-900 dark:text-zinc-50">{ex.name}</h3>
                          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{txt.target} : {we.target_reps} reps {we.recommended_weight ? `| ${txt.rec}: ${we.recommended_weight}kg` : ""}</p>
                        </div>
                        <button onClick={() => setInfoModal({ show: true, exercise: ex })} className="ml-2 mt-0.5 p-1 text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400 rounded-full hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"><Info className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <button onClick={() => duplicateFirstSet(identifier, we.sets)} className="p-2 text-zinc-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:text-teal-400 dark:hover:bg-teal-900/30 rounded-md transition-colors" title={txt.dup}><Repeat className="w-5 h-5" /></button>
                  </div>

                  <div className="p-3 space-y-3 bg-white dark:bg-zinc-950">
                    <div className="grid grid-cols-12 gap-2 px-2 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase text-center tracking-wider"><div className="col-span-2">{txt.set}</div><div className="col-span-4">{txt.weight}</div><div className="col-span-4">{txt.reps}</div><div className="col-span-2">OK</div></div>
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
              <button onClick={finishWorkout} className="w-full py-4 bg-gradient-to-r from-teal-400 to-teal-600 hover:from-teal-500 hover:to-teal-700 text-white font-black uppercase tracking-widest rounded-xl shadow-[0_10px_25px_-5px_rgba(20,184,166,0.4)] transition-transform hover:scale-[1.02] active:scale-[0.98]">{txt.finish}</button>
            </div>
          </div>
        )}
      </div>

      {restTimer !== null && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 px-6 py-3 rounded-full flex items-center space-x-4 shadow-[0_10px_40px_rgba(0,0,0,0.3)] transition-all ${restTimer > 0 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'} z-50`}>
          <Timer className="w-5 h-5 animate-pulse text-teal-400 dark:text-teal-600" /><span className="font-mono text-xl font-black w-16 text-center">{formatTime(restTimer)}</span><button onClick={() => setRestTimer(0)} className="text-zinc-400 hover:text-white dark:hover:text-zinc-900"><X className="w-5 h-5" /></button>
        </div>
      )}

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

      {/* POPUP DE FIN DE SÉANCE : VIRALITÉ STRAVA */}
      <Dialog open={showEndModal} onOpenChange={setShowEndModal}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden">
          <div className="bg-zinc-900 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-500/20 via-zinc-900 to-zinc-950 pointer-events-none"></div>
            
            <div className="relative z-10 w-full mb-6 flex flex-col items-center">
              
              {/* LA CARTE INVISIBLE (Générée en HD pour Insta/WhatsApp) */}
              <div className="absolute -left-[9999px]">
                <div ref={stravaCardRef} className="w-[1080px] h-[1920px] bg-zinc-950 relative flex flex-col items-center justify-between py-24 px-16 text-white overflow-hidden" style={{ fontFamily: "sans-serif" }}>
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-500/30 via-zinc-900 to-zinc-950"></div>
                  
                  <div className="relative z-10 text-center space-y-6">
                    <h2 className="text-[120px] font-black uppercase tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-br from-teal-400 to-teal-600">{txt.success}</h2>
                    <p className="text-5xl font-bold text-zinc-400 tracking-widest">{new Date().toLocaleDateString()}</p>
                  </div>
                  
                  <div className="relative z-10 w-full grid grid-cols-2 gap-12">
                    <div className="bg-zinc-900/80 backdrop-blur-xl border-4 border-zinc-800 rounded-[3rem] p-12 flex flex-col items-center justify-center space-y-4">
                      <span className="text-4xl font-bold text-zinc-500 uppercase tracking-widest">{txt.time}</span>
                      <span className="text-[80px] font-black text-white">{sessionStats.duration} <span className="text-5xl text-zinc-400">min</span></span>
                    </div>
                    <div className="bg-zinc-900/80 backdrop-blur-xl border-4 border-zinc-800 rounded-[3rem] p-12 flex flex-col items-center justify-center space-y-4">
                      <span className="text-4xl font-bold text-zinc-500 uppercase tracking-widest">{txt.tonnage}</span>
                      <span className="text-[80px] font-black text-teal-400">{sessionStats.tonnage.toLocaleString()} <span className="text-5xl text-zinc-400">kg</span></span>
                    </div>
                  </div>

                  <div className="relative z-10 w-full bg-zinc-900/80 backdrop-blur-xl border-4 border-zinc-800 rounded-[3rem] p-12 flex flex-col items-center justify-center space-y-4">
                    <span className="text-4xl font-bold text-zinc-500 uppercase tracking-widest">{txt.bestSet}</span>
                    <span className="text-[65px] font-black text-white text-center leading-tight">{sessionStats.bestSet}</span>
                  </div>

                  <div className="relative z-10 flex items-center space-x-6 bg-white/10 px-16 py-8 rounded-full backdrop-blur-md">
                    <Trophy className="w-20 h-20 text-teal-500" />
                    <span className="text-6xl font-black tracking-widest">VIVEX FITNESS</span>
                  </div>
                </div>
              </div>
              
              {/* APERÇU MINIATURE DANS LA MODALE POUR L'UTILISATEUR */}
              <div className="w-full max-w-[250px] aspect-[9/16] bg-zinc-950 rounded-2xl border-4 border-zinc-800 relative flex flex-col items-center justify-between p-4 shadow-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-500/20 via-transparent to-transparent"></div>
                <h3 className="text-2xl font-black text-teal-500 uppercase tracking-tighter leading-none mt-4 text-center">{txt.success}</h3>
                
                <div className="w-full space-y-2 mt-auto mb-6 relative z-10">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-zinc-900/80 rounded-xl p-2 text-center border border-zinc-800 flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">{txt.time}</span>
                      <span className="text-lg font-black text-white">{sessionStats.duration}m</span>
                    </div>
                    <div className="bg-zinc-900/80 rounded-xl p-2 text-center border border-zinc-800 flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">{txt.tonnage}</span>
                      <span className="text-lg font-black text-teal-400">{sessionStats.tonnage.toLocaleString()}kg</span>
                    </div>
                  </div>
                  <div className="bg-zinc-900/80 rounded-xl p-2 text-center border border-zinc-800 flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">{txt.bestSet}</span>
                    <span className="text-xs font-black text-white truncate px-1">{sessionStats.bestSet}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 opacity-80 relative z-10 mb-2">
                  <Trophy className="w-4 h-4 text-teal-500" />
                  <span className="text-xs font-black tracking-widest text-white">VIVEX</span>
                </div>
              </div>
            </div>

            <div className="w-full space-y-3 relative z-10">
              <Button onClick={shareToSocials} disabled={isSharing} className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-black text-lg h-14 shadow-lg shadow-purple-500/30 transition-transform active:scale-95">
                {isSharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Share2 className="w-5 h-5 mr-2" /> {txt.shareInsta}</>}
              </Button>
              <Button onClick={() => router.push("/dashboard")} variant="outline" className="w-full h-12 font-bold bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                {txt.back}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
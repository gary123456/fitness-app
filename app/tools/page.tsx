"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dumbbell, Scale, Calculator, ArrowRightLeft, Target, Wrench, Timer, Play, Pause, RotateCcw, Volume2, VolumeX, Plus, Minus, Activity, Droplets, FlaskConical, X, Apple, Nut, MoonStar, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/useLanguage";

const PLATES = [
  { weight: 25, color: "bg-red-500", h: "h-24", w: "w-6" },
  { weight: 20, color: "bg-blue-500", h: "h-24", w: "w-5" },
  { weight: 15, color: "bg-yellow-400", h: "h-20", w: "w-4" },
  { weight: 10, color: "bg-green-500", h: "h-16", w: "w-4" },
  { weight: 5, color: "bg-white text-black", h: "h-12", w: "w-3" },
  { weight: 2.5, color: "bg-zinc-800", h: "h-10", w: "w-2" },
  { weight: 1.25, color: "bg-zinc-700", h: "h-8", w: "w-2" }
];

const NUT_DATABASE = {
  amandes: { nameFR: "Amandes", nameEN: "Almonds", kcalPer100: 579, gramsPerHandful: 30, gFats: 49, gProt: 21 },
  cajou: { nameFR: "Noix de Cajou", nameEN: "Cashews", kcalPer100: 553, gramsPerHandful: 35, gFats: 43, gProt: 18 },
  noix: { nameFR: "Noix (Cerneaux)", nameEN: "Walnuts", kcalPer100: 654, gramsPerHandful: 25, gFats: 65, gProt: 15 },
  pecan: { nameFR: "Noix de Pécan", nameEN: "Pecans", kcalPer100: 691, gramsPerHandful: 30, gFats: 72, gProt: 9 },
  macadamia: { nameFR: "Noix de Macadamia", nameEN: "Macadamia", kcalPer100: 718, gramsPerHandful: 35, gFats: 76, gProt: 8 },
  pistaches: { nameFR: "Pistaches", nameEN: "Pistachios", kcalPer100: 562, gramsPerHandful: 30, gFats: 45, gProt: 20 },
  cacahuetes: { nameFR: "Cacahuètes", nameEN: "Peanuts", kcalPer100: 567, gramsPerHandful: 35, gFats: 49, gProt: 25 },
  bresil: { nameFR: "Noix du Brésil", nameEN: "Brazil Nuts", kcalPer100: 656, gramsPerHandful: 30, gFats: 66, gProt: 14 },
  noisettes: { nameFR: "Noisettes", nameEN: "Hazelnuts", kcalPer100: 628, gramsPerHandful: 30, gFats: 60, gProt: 15 }
};

let globalAudioCtx: AudioContext | null = null;
const getAudioCtx = () => {
  if (typeof window === "undefined") return null;
  if (!globalAudioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctx) globalAudioCtx = new Ctx();
  }
  return globalAudioCtx;
};
const unlockAudioForIOS = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.01);
};
const playTone = (frequency: number, duration: number, type: OscillatorType = "sine") => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gain.gain.setValueAtTime(1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
};

export default function ToolsPage() {
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<"plates" | "predict" | "convert" | "timer" | "elite" | "nuts">("plates");
  
  const [targetWeight, setTargetWeight] = useState<string>("");
  const [barWeight, setBarWeight] = useState<string>("20");
  
  const [convKg, setConvKg] = useState<string>("");
  const [convLb, setConvLb] = useState<string>("");
  const [convOz, setConvOz] = useState<string>("");
  const [convGramsOz, setConvGramsOz] = useState<string>("");
  const [convCup, setConvCup] = useState<string>("");
  const [convGramsCup, setConvGramsCup] = useState<string>("");
  
  const [liftWeight, setLiftWeight] = useState<string>("");
  const [liftReps, setLiftReps] = useState<string>("");

  const [weightBefore, setWeightBefore] = useState<string>("");
  const [weightAfter, setWeightAfter] = useState<string>("");
  const [fluidDrank, setFluidDrank] = useState<string>("");
  const [workoutDur, setWorkoutDur] = useState<string>("");

  const [selectedNut, setSelectedNut] = useState<string>("amandes");
  const [nutHandfuls, setNutHandfuls] = useState<string>("1");

  const [timerMode, setTimerMode] = useState<"classic" | "hiit">("hiit");
  const [classicTime, setClassicTime] = useState<number>(60);
  const [customMin, setCustomMin] = useState<string>("1");
  const [customSec, setCustomSec] = useState<string>("0");
  const [classicIsRunning, setClassicIsRunning] = useState(false);
  
  const [oledMode, setOledMode] = useState(false);

  const classicRef = useRef<NodeJS.Timeout | null>(null);

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [hiitConfig, setHiitConfig] = useState({ prepare: 10, work: 20, rest: 10, cycles: 8, sets: 1, restBetweenSets: 60, coolDown: 0 });
  const [hiitState, setHiitState] = useState({ isRunning: false, phase: "PREPARE" as "PREPARE" | "WORK" | "REST" | "SET_REST" | "COOL_DOWN" | "DONE", timeLeft: hiitConfig.prepare, currentCycle: 1, currentSet: 1 });
  const hiitRef = useRef<NodeJS.Timeout | null>(null);

  const [dotsGender, setDotsGender] = useState<"homme" | "femme">("homme");
  const [dotsBw, setDotsBw] = useState<string>("");
  const [dotsTotal, setDotsTotal] = useState<string>("");

  // 🛡️ NOUVEAU : État pour la Modale d'Information Pédagogique
  const [infoModal, setInfoModal] = useState<{show: boolean, title: string, desc: string} | null>(null);

  const t = {
    FR: { title: "Boîte à Outils", sub: "L'arsenal de la Silicon Valley pour votre entraînement.", plateCalc: "Disques", converter: "Convertir", predictor: "1RM", timer: "Chrono", elite: "Labo Pro", nuts: "Oléagineux", targetWeight: "Poids Cible (kg)", barWeight: "Poids de la Barre (kg)", eachSide: "Par côté :", totalSide: "Total par côté :", noPlates: "Entrez un poids cible supérieur à la barre.", kgToLb: "Kg vers Lbs", lbToKg: "Lbs vers Kg", weightLifted: "Poids soulevé (kg)", repsDone: "Reps réalisées", est1RM: "1RM Estimé", formula: "Basé sur la formule d'Epley", start: "Démarrer", pause: "Pause", reset: "Réinit", classic: "Classique", prepare: "Préparation", work: "Travail", rest: "Repos", cycles: "Cycles", sets: "Séries", restBetween: "Repos (Séries)", coolDown: "Retour au calme", done: "Terminé !", soundOn: "Son On", soundOff: "Son Off", sweatTitle: "Taux de Sudation", sweatSub: "Protocole hydrique.", wBefore: "Poids avant (kg)", wAfter: "Poids après (kg)", fluid: "Liquide bu (ml)", dur: "Durée (min)", sweatRate: "Perte de sueur", sweatRec: "Buvez cette quantité par heure d'effort.", nutTitle: "Calculateur d'Oléagineux", nutSub: "Convertit les 'poignées' en grammes et calories réelles.", handfuls: "Nombre de poignées :", nutConv: "Nutrition (Solides & Liquides)" },
    EN: { title: "Toolbox", sub: "The Silicon Valley arsenal for your training.", plateCalc: "Plates", converter: "Convert", predictor: "1RM", timer: "Timer", elite: "Pro Lab", nuts: "Nuts", targetWeight: "Target Weight (kg)", barWeight: "Bar Weight (kg)", eachSide: "Per side:", totalSide: "Total per side:", noPlates: "Enter a target weight greater than the bar.", kgToLb: "Kg to Lbs", lbToKg: "Lbs to Kg", weightLifted: "Weight lifted (kg)", repsDone: "Reps performed", est1RM: "Estimated 1RM", formula: "Based on Epley's formula", start: "Start", pause: "Pause", reset: "Reset", classic: "Classic", prepare: "Prepare", work: "Work", rest: "Rest", cycles: "Cycles", sets: "Sets", restBetween: "Rest (Sets)", coolDown: "Cool Down", done: "Workout Done!", soundOn: "Sound On", soundOff: "Sound Off", sweatTitle: "Sweat Rate", sweatSub: "Hydration protocol.", wBefore: "Weight before (kg)", wAfter: "Weight after (kg)", fluid: "Fluid drank (ml)", dur: "Duration (min)", sweatRate: "Sweat Loss", sweatRec: "Drink this amount per hour.", nutTitle: "Nuts Estimator", nutSub: "Converts 'handfuls' into real grams and calories.", handfuls: "Number of handfuls:", nutConv: "Nutrition (Solids & Liquids)" }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

  const calculatePlates = () => {
    const target = parseFloat(targetWeight);
    const bar = parseFloat(barWeight);
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

  const calculateDots = () => {
    const bw = parseFloat(dotsBw);
    const total = parseFloat(dotsTotal);
    if (!bw || !total || bw <= 0) return 0;

    let coeff = 0;
    if (dotsGender === "homme") {
      const a = -307.75076; const b = 24.0900756; const c = -0.1918759221; const d = 0.0007391293; const e = -0.000001093;
      const denom = a + b * bw + c * Math.pow(bw, 2) + d * Math.pow(bw, 3) + e * Math.pow(bw, 4);
      coeff = 500 / denom;
    } else {
      const a = -57.96288; const b = 13.6175032; const c = -0.1126655495; const d = 0.0005158568; const e = -0.00000107;
      const denom = a + b * bw + c * Math.pow(bw, 2) + d * Math.pow(bw, 3) + e * Math.pow(bw, 4);
      coeff = 500 / denom;
    }
    return Math.round(total * coeff * 100) / 100;
  };

  const handleKgChange = (val: string) => { setConvKg(val); setConvLb(val ? (parseFloat(val) * 2.20462).toFixed(2) : ""); };
  const handleLbChange = (val: string) => { setConvLb(val); setConvKg(val ? (parseFloat(val) / 2.20462).toFixed(2) : ""); };
  const handleOzChange = (val: string) => { setConvOz(val); setConvGramsOz(val ? (parseFloat(val) * 28.3495).toFixed(0) : ""); };
  const handleGramsOzChange = (val: string) => { setConvGramsOz(val); setConvOz(val ? (parseFloat(val) / 28.3495).toFixed(2) : ""); };
  const handleCupChange = (val: string) => { setConvCup(val); setConvGramsCup(val ? (parseFloat(val) * 240).toFixed(0) : ""); };
  const handleGramsCupChange = (val: string) => { setConvGramsCup(val); setConvCup(val ? (parseFloat(val) / 240).toFixed(2) : ""); };

  const get1RM = () => {
    const w = parseFloat(liftWeight);
    const r = parseInt(liftReps);
    if (!w || !r || r < 1) return 0;
    if (r === 1) return w;
    return Math.round(w * (1 + r / 30));
  };

  const getSweatRate = () => {
    const w1 = parseFloat(weightBefore);
    const w2 = parseFloat(weightAfter);
    const f = parseFloat(fluidDrank) || 0;
    const d = parseFloat(workoutDur);
    if (!w1 || !w2 || !d || w1 <= w2) return 0;
    
    const weightLossGrams = (w1 - w2) * 1000;
    const totalSweat = weightLossGrams + f;
    const hours = d / 60;
    return Math.round(totalSweat / hours);
  };

  const currentNut = NUT_DATABASE[selectedNut as keyof typeof NUT_DATABASE];
  const calculateNutMacros = () => {
    const qty = parseFloat(nutHandfuls) || 0;
    const totalGrams = qty * currentNut.gramsPerHandful;
    const ratio = totalGrams / 100;
    return {
      grams: totalGrams,
      kcal: Math.round(currentNut.kcalPer100 * ratio),
      fats: Math.round(currentNut.gFats * ratio),
      prot: Math.round(currentNut.gProt * ratio)
    };
  };
  const nutStats = calculateNutMacros();

  useEffect(() => {
    if (classicIsRunning && classicTime > 0) {
      classicRef.current = setInterval(() => setClassicTime(prev => prev - 1), 1000);
    } else if (classicTime === 0 && classicIsRunning) {
      setClassicIsRunning(false);
      if (audioEnabled) playTone(1500, 1.5, "square");
      if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate([500, 200, 500]); 
    }
    return () => clearInterval(classicRef.current as NodeJS.Timeout);
  }, [classicIsRunning, classicTime, audioEnabled]);

  const toggleClassicTimer = () => {
    if (!classicIsRunning && audioEnabled) unlockAudioForIOS();
    setClassicIsRunning(!classicIsRunning);
  };

  const setCustomClassicTime = () => {
    const m = parseInt(customMin) || 0;
    const s = parseInt(customSec) || 0;
    setClassicTime(m * 60 + s);
  };

  const updateHiitConfig = (key: keyof typeof hiitConfig, val: number) => {
    if (val < 0) return;
    setHiitConfig(prev => ({ ...prev, [key]: val }));
    if (!hiitState.isRunning) {
      if (key === "prepare") setHiitState(prev => ({ ...prev, timeLeft: val }));
    }
  };

  useEffect(() => {
    if (hiitState.isRunning) {
      hiitRef.current = setInterval(() => {
        setHiitState(prev => {
          let newTime = prev.timeLeft - 1;
          let newPhase = prev.phase;
          let newCycle = prev.currentCycle;
          let newSet = prev.currentSet;
          let newIsRunning = prev.isRunning;

          if (newTime > 0 && newTime <= 3 && audioEnabled) {
            playTone(800, 0.1);
            if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate(100);
          }

          if (newTime === 0) {
            if (audioEnabled) {
              if (prev.phase === "WORK" && prev.currentCycle === hiitConfig.cycles && prev.currentSet === hiitConfig.sets && hiitConfig.coolDown === 0) {
                playTone(1500, 1.5, "square"); 
              } else {
                playTone(1200, 0.5, "square"); 
              }
            }
            if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate([200, 100, 200]);

            if (prev.phase === "PREPARE") { newPhase = "WORK"; newTime = hiitConfig.work; }
            else if (prev.phase === "WORK") {
              if (prev.currentCycle < hiitConfig.cycles) {
                newPhase = "REST"; newTime = hiitConfig.rest;
              } else if (prev.currentSet < hiitConfig.sets) {
                newPhase = "SET_REST"; newTime = hiitConfig.restBetweenSets; newCycle = 1;
              } else if (hiitConfig.coolDown > 0) {
                newPhase = "COOL_DOWN"; newTime = hiitConfig.coolDown;
              } else {
                newPhase = "DONE"; newTime = 0; newIsRunning = false;
              }
            }
            else if (prev.phase === "REST") {
              newPhase = "WORK"; newTime = hiitConfig.work; newCycle++;
            }
            else if (prev.phase === "SET_REST") {
              newPhase = "WORK"; newTime = hiitConfig.work; newSet++;
            }
            else if (prev.phase === "COOL_DOWN") {
              newPhase = "DONE"; newTime = 0; newIsRunning = false;
            }
          }
          return { isRunning: newIsRunning, phase: newPhase, timeLeft: newTime, currentCycle: newCycle, currentSet: newSet };
        });
      }, 1000);
    }
    return () => clearInterval(hiitRef.current as NodeJS.Timeout);
  }, [hiitState.isRunning, hiitConfig, audioEnabled]);

  const toggleHiit = () => {
    if (!hiitState.isRunning && audioEnabled) unlockAudioForIOS();
    if (hiitState.phase === "DONE") {
      setHiitState({ isRunning: true, phase: "PREPARE", timeLeft: hiitConfig.prepare, currentCycle: 1, currentSet: 1 });
    } else {
      setHiitState(prev => ({ ...prev, isRunning: !prev.isRunning }));
    }
  };

  const resetHiit = () => setHiitState({ isRunning: false, phase: "PREPARE", timeLeft: hiitConfig.prepare, currentCycle: 1, currentSet: 1 });

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getPhaseColor = () => {
    if (oledMode) return "bg-black text-white border-zinc-900"; 
    switch (hiitState.phase) {
      case "WORK": return "bg-green-500 text-white shadow-green-500/50 border-green-400";
      case "REST": case "SET_REST": return "bg-red-500 text-white shadow-red-500/50 border-red-400";
      case "PREPARE": case "COOL_DOWN": return "bg-blue-500 text-white shadow-blue-500/50 border-blue-400";
      case "DONE": return "bg-amber-500 text-white shadow-amber-500/50 border-amber-400";
      default: return "bg-zinc-900 text-white border-zinc-800";
    }
  };

  const render1RMPercentages = () => {
    const rm = get1RM();
    if (rm <= 0) return null;
    const pcts = [50, 60, 70, 80, 90, 95];
    return (
      <div className="pt-6 mt-4 border-t border-zinc-100 dark:border-zinc-800 animate-in fade-in">
        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3">{lang === 'FR' ? 'Matrice de travail (Barre Olympique)' : 'Working Matrix (Olympic Bar)'}</h4>
        <div className="grid grid-cols-3 gap-2">
          {pcts.map(pct => {
            const weight = Math.round((rm * (pct / 100)) / 2.5) * 2.5; 
            return (
              <div key={pct} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg p-2 flex flex-col items-center justify-center shadow-sm">
                <span className="text-[10px] font-bold text-zinc-400">{pct}%</span>
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{weight} kg</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 🛡️ NOUVEAU : Données pédagogiques pour le Labo Pro
  const getModalContent = () => {
    if (infoModal?.title === "Score DOTS") {
      return lang === 'FR' 
        ? "Le Score DOTS est la formule mathématique officielle utilisée en Powerlifting depuis 2020. Elle permet de comparer la force de deux athlètes de poids différents, hommes ou femmes.\n\nExemple : Un athlète de 70kg qui soulève 400kg au total (Squat + Bench + Deadlift) est considéré comme 'plus fort' qu'un athlète de 120kg qui soulève 450kg. Le DOTS lisse cet écart.\n\n• < 300 : Débutant\n• 300 - 400 : Intermédiaire / Bon\n• 400 - 500 : Athlète d'Élite\n• > 500 : Niveau Mondial"
        : "The DOTS Score is the official mathematical formula used in Powerlifting since 2020. It compares the relative strength of athletes across different body weights and genders.\n\nExample: A 70kg athlete lifting a 400kg total (Squat + Bench + Deadlift) is considered 'stronger' than a 120kg athlete lifting 450kg. DOTS normalizes this gap.\n\n• < 300: Beginner\n• 300 - 400: Intermediate / Good\n• 400 - 500: Elite Athlete\n• > 500: World Class";
    }
    if (infoModal?.title === "Taux de Sudation") {
      return lang === 'FR'
        ? "Le Taux de Sudation (Sweat Rate) est une métrique clinique utilisée par les athlètes professionnels (Marathoniens, NFL, MMA) pour éviter la déshydratation mortelle pour les performances.\n\n1. Pesez-vous nu avant l'entraînement.\n2. Notez la quantité d'eau que vous buvez pendant la séance (en ml).\n3. Pesez-vous nu après l'entraînement (et après avoir uriné si besoin).\n4. Entrez la durée exacte.\n\nLe résultat vous indiquera exactement combien de millilitres d'eau votre corps perd par heure. Vous devrez boire cette quantité précise lors de vos prochaines séances d'intensité similaire pour ne jamais baisser en performance."
        : "The Sweat Rate is a clinical metric used by pro athletes (Marathoners, NFL, MMA) to avoid performance-killing dehydration.\n\n1. Weigh yourself naked before training.\n2. Note the fluid you drink during the session (in ml).\n3. Weigh yourself naked after training (and after urinating if needed).\n4. Enter exact duration.\n\nThe result tells you exactly how many milliliters of water your body loses per hour. You should drink this precise amount during your next sessions of similar intensity to never drop in performance.";
    }
    return "";
  };

  return (
    <div className={`flex-1 space-y-6 pt-6 max-w-5xl mx-auto w-full pb-24 transition-colors duration-500 ${oledMode && activeTab === 'timer' ? 'bg-black p-0 h-screen w-screen fixed inset-0 z-[9999]' : 'p-4 md:p-8'}`}>
      
      {!oledMode && (
        <div className="flex flex-col space-y-2 mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
            <Wrench className="w-8 h-8 mr-3 text-teal-500" /> {txt.title}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">{txt.sub}</p>
        </div>
      )}

      {!oledMode && (
        <div className="grid grid-cols-6 gap-2 mb-8 bg-zinc-200/50 dark:bg-zinc-900 p-1.5 rounded-2xl overflow-x-auto scrollbar-hide">
          <button onClick={() => setActiveTab("plates")} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all font-bold min-w-[60px] ${activeTab === 'plates' ? 'bg-white dark:bg-zinc-950 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
            <Target className="w-4 h-4 mb-1" /><span className="text-[8px] uppercase tracking-wider">{txt.plateCalc}</span>
          </button>
          <button onClick={() => setActiveTab("predict")} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all font-bold min-w-[60px] ${activeTab === 'predict' ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
            <Calculator className="w-4 h-4 mb-1" /><span className="text-[8px] uppercase tracking-wider">{txt.predictor}</span>
          </button>
          <button onClick={() => setActiveTab("convert")} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all font-bold min-w-[60px] ${activeTab === 'convert' ? 'bg-white dark:bg-zinc-950 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
            <ArrowRightLeft className="w-4 h-4 mb-1" /><span className="text-[8px] uppercase tracking-wider">{txt.converter}</span>
          </button>
          <button onClick={() => setActiveTab("nuts")} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all font-bold min-w-[60px] ${activeTab === 'nuts' ? 'bg-white dark:bg-zinc-950 text-yellow-600 dark:text-yellow-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
            <Nut className="w-4 h-4 mb-1" /><span className="text-[8px] uppercase tracking-wider">{txt.nuts}</span>
          </button>
          <button onClick={() => setActiveTab("timer")} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all font-bold min-w-[60px] ${activeTab === 'timer' ? 'bg-white dark:bg-zinc-950 text-red-600 dark:text-red-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
            <Timer className="w-4 h-4 mb-1" /><span className="text-[8px] uppercase tracking-wider">{txt.timer}</span>
          </button>
          <button onClick={() => setActiveTab("elite")} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all font-bold min-w-[60px] ${activeTab === 'elite' ? 'bg-white dark:bg-zinc-950 text-fuchsia-600 dark:text-fuchsia-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
            <FlaskConical className="w-4 h-4 mb-1" /><span className="text-[8px] uppercase tracking-wider">{txt.elite}</span>
          </button>
        </div>
      )}

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
        
        {activeTab === "plates" && (
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-teal-600 dark:text-teal-400"><Dumbbell className="w-5 h-5 mr-2" /> {txt.plateCalc}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.targetWeight}</Label>
                  <Input type="number" placeholder="Ex: 100" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} className="font-black text-2xl h-14 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.barWeight}</Label>
                  <Input type="number" value={barWeight} onChange={(e) => setBarWeight(e.target.value)} className="font-black text-2xl h-14 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500" />
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                <h4 className="font-black text-sm uppercase tracking-widest text-zinc-400 mb-4">{txt.eachSide}</h4>
                {requiredPlates.length > 0 ? (
                  <div className="space-y-8">
                    <div className="flex items-center justify-center p-8 bg-zinc-100 dark:bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                      <div className="w-32 h-6 bg-zinc-400 dark:bg-zinc-700 rounded-l-md border-r-2 border-zinc-500 dark:border-zinc-900 shadow-inner"></div>
                      <div className="w-8 h-10 bg-zinc-500 dark:bg-zinc-600 border-r-2 border-zinc-800"></div>
                      <div className="flex items-center">
                        {requiredPlates.flatMap((p, i) => 
                          Array.from({ length: p.count }).map((_, j) => (
                            <div key={`${i}-${j}`} className={`${p.visual.color} ${p.visual.h} ${p.visual.w} rounded-sm border border-black/20 mx-[1px] shadow-md flex items-center justify-center`}>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="w-24 h-6 bg-zinc-400 dark:bg-zinc-700 rounded-r-sm shadow-inner"></div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {requiredPlates.map((p, i) => (
                        <div key={i} className="flex items-center justify-center bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-full px-4 py-2 shadow-sm">
                          <span className="font-black text-teal-700 dark:text-teal-400 text-lg">{p.weight} kg</span>
                          <span className="ml-2 bg-teal-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">×{p.count}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-right font-bold text-zinc-500">{txt.totalSide} <span className="text-teal-600 dark:text-teal-400 font-black">{(parseFloat(targetWeight) - parseFloat(barWeight)) / 2} kg</span></div>
                  </div>
                ) : (
                  <div className="py-8 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 font-medium">
                    {txt.noPlates}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ONGLET 1RM PREDICTOR avec Matrice des Pourcentages */}
        {activeTab === "predict" && (
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-indigo-600 dark:text-indigo-400"><Calculator className="w-5 h-5 mr-2" /> {txt.predictor}</CardTitle>
              <CardDescription>{txt.formula}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.weightLifted}</Label>
                  <Input type="number" placeholder="Ex: 80" value={liftWeight} onChange={(e) => setLiftWeight(e.target.value)} className="font-black text-2xl h-14 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.repsDone}</Label>
                  <Input type="number" placeholder="Ex: 5" value={liftReps} onChange={(e) => setLiftReps(e.target.value)} className="font-black text-2xl h-14 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" />
                </div>
              </div>
              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl">
                <span className="font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">{txt.est1RM}</span>
                <span className="text-5xl font-black text-indigo-500">{get1RM()} <span className="text-xl text-zinc-500">kg</span></span>
              </div>
              {/* 🛡️ PHASE 4 QOL : Matrice des 1RM */}
              {render1RMPercentages()}
            </CardContent>
          </Card>
        )}

        {/* ONGLET CONVERTISSEUR COMPLET */}
        {activeTab === "convert" && (
          <div className="space-y-4">
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">
              <CardHeader><CardTitle className="flex items-center text-orange-600 dark:text-orange-400"><Scale className="w-5 h-5 mr-2" /> Poids (Sport)</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex-1 space-y-2">
                    <Label className="font-bold text-zinc-600 dark:text-zinc-400">Kilogrammes (kg)</Label>
                    <Input type="number" value={convKg} onChange={(e) => handleKgChange(e.target.value)} className="font-black text-2xl h-14 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-center" />
                  </div>
                  <div className="pt-6"><ArrowRightLeft className="w-6 h-6 text-zinc-400" /></div>
                  <div className="flex-1 space-y-2">
                    <Label className="font-bold text-zinc-600 dark:text-zinc-400">Pounds (lbs)</Label>
                    <Input type="number" value={convLb} onChange={(e) => handleLbChange(e.target.value)} className="font-black text-2xl h-14 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-center text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">
              <CardHeader><CardTitle className="flex items-center text-green-600 dark:text-green-400"><Apple className="w-5 h-5 mr-2" /> {txt.nutConv}</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex-1 space-y-2"><Label className="font-bold text-zinc-600 dark:text-zinc-400">Ounces (Oz)</Label><Input type="number" value={convOz} onChange={(e) => handleOzChange(e.target.value)} className="font-black text-xl h-12 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-center" /></div>
                  <div className="pt-6"><ArrowRightLeft className="w-4 h-4 text-zinc-400" /></div>
                  <div className="flex-1 space-y-2"><Label className="font-bold text-zinc-600 dark:text-zinc-400">Grammes (g)</Label><Input type="number" value={convGramsOz} onChange={(e) => handleGramsOzChange(e.target.value)} className="font-black text-xl h-12 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-center text-green-500" /></div>
                </div>
                <div className="flex items-center justify-between space-x-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex-1 space-y-2"><Label className="font-bold text-zinc-600 dark:text-zinc-400">Tasses (Cups)</Label><Input type="number" value={convCup} onChange={(e) => handleCupChange(e.target.value)} className="font-black text-xl h-12 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-center" /></div>
                  <div className="pt-6"><ArrowRightLeft className="w-4 h-4 text-zinc-400" /></div>
                  <div className="flex-1 space-y-2"><Label className="font-bold text-zinc-600 dark:text-zinc-400">Mililitres (ml)</Label><Input type="number" value={convGramsCup} onChange={(e) => handleGramsCupChange(e.target.value)} className="font-black text-xl h-12 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-center text-green-500" /></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ONGLET OLÉAGINEUX */}
        {activeTab === "nuts" && (
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-yellow-600 dark:text-yellow-500"><Nut className="w-5 h-5 mr-2" /> {txt.nutTitle}</CardTitle>
              <CardDescription>{txt.nutSub}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="font-bold text-zinc-600 dark:text-zinc-400">Sélectionnez la noix :</Label>
                <Select value={selectedNut} onValueChange={setSelectedNut}>
                  <SelectTrigger className="h-14 font-black bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="font-bold">
                    {Object.entries(NUT_DATABASE).map(([key, data]) => (
                      <SelectItem key={key} value={key}>{lang === 'FR' ? data.nameFR : data.nameEN}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.handfuls}</Label>
                <div className="flex items-center space-x-4">
                  <Input type="number" step="0.5" min="0" placeholder="Ex: 1" value={nutHandfuls} onChange={(e) => setNutHandfuls(e.target.value)} className="font-black text-3xl h-16 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-yellow-600 dark:text-yellow-500 w-32 text-center" />
                  <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Poignées <br/>(Handfuls)</span>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                <div className="bg-yellow-50 dark:bg-yellow-900/10 p-6 rounded-2xl border border-yellow-200 dark:border-yellow-900/30">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-yellow-200 dark:border-yellow-800/30">
                    <span className="font-black text-yellow-700 dark:text-yellow-500 uppercase tracking-widest">Poids Réel</span>
                    <span className="text-4xl font-black text-yellow-600">{nutStats.grams} <span className="text-xl">g</span></span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <span className="block text-xl font-black text-orange-500">{nutStats.kcal}</span>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Kcal</span>
                    </div>
                    <div className="border-x border-yellow-200 dark:border-yellow-800/30">
                      <span className="block text-xl font-black text-yellow-500">{nutStats.fats}g</span>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Lipides</span>
                    </div>
                    <div>
                      <span className="block text-xl font-black text-blue-500">{nutStats.prot}g</span>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Protéines</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ONGLET TIMER & OLED */}
        {activeTab === "timer" && (
          <div className={`space-y-4 h-full flex flex-col ${oledMode ? 'justify-center items-center' : ''}`}>
            {!oledMode && (
              <div className="flex justify-center mb-4">
                <div className="bg-zinc-200/50 dark:bg-zinc-900 p-1 rounded-xl flex space-x-1">
                  <button onClick={() => setTimerMode("hiit")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timerMode === 'hiit' ? 'bg-white dark:bg-zinc-950 text-red-500 shadow-sm' : 'text-zinc-500'}`}>HIIT / Tabata</button>
                  <button onClick={() => setTimerMode("classic")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timerMode === 'classic' ? 'bg-white dark:bg-zinc-950 text-blue-500 shadow-sm' : 'text-zinc-500'}`}>{txt.classic}</button>
                </div>
              </div>
            )}

            {timerMode === "classic" && (
              <Card className={`transition-all duration-500 ${oledMode ? 'border-none bg-transparent shadow-none w-full' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg'}`}>
                {!oledMode && (
                  <CardHeader className="text-center pb-2 relative">
                    <button onClick={() => setOledMode(true)} className="absolute top-4 left-4 p-2 text-zinc-400 hover:text-white bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors" title="Mode OLED (Éco Batterie)">
                      <MoonStar className="w-5 h-5" />
                    </button>
                    <button onClick={() => setAudioEnabled(!audioEnabled)} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-indigo-500 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors">
                      {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </button>
                    <CardTitle className="text-blue-500 font-black tracking-widest uppercase">Timer Classique</CardTitle>
                  </CardHeader>
                )}
                <CardContent className={`flex flex-col items-center justify-center ${oledMode ? 'py-0 h-full' : 'py-8'}`}>
                  
                  {oledMode && (
                    <div className="absolute top-10 flex justify-between w-full px-10">
                       <button onClick={() => setOledMode(false)} className="p-3 text-zinc-600 hover:text-white transition-colors border border-zinc-800 rounded-full"><X className="w-6 h-6" /></button>
                       <button onClick={() => setAudioEnabled(!audioEnabled)} className="p-3 text-zinc-600 hover:text-white transition-colors border border-zinc-800 rounded-full">
                        {audioEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                       </button>
                    </div>
                  )}

                  <div className={`font-black tabular-nums transition-colors duration-500 ${oledMode ? 'text-[150px] sm:text-[200px] text-red-600 tracking-tighter' : 'text-7xl sm:text-8xl'} ${classicIsRunning && !oledMode ? 'text-blue-500' : (!oledMode ? 'text-zinc-900 dark:text-zinc-100' : '')}`}>
                    {formatTime(classicTime)}
                  </div>
                  
                  {!classicIsRunning && !oledMode && (
                    <div className="flex items-center space-x-2 mt-6">
                      <Input type="number" value={customMin} onChange={(e) => setCustomMin(e.target.value)} className="w-16 h-10 text-center font-bold" placeholder="Min" />
                      <span className="font-bold">:</span>
                      <Input type="number" value={customSec} onChange={(e) => setCustomSec(e.target.value)} className="w-16 h-10 text-center font-bold" placeholder="Sec" />
                      <Button onClick={setCustomClassicTime} variant="secondary" className="font-bold ml-2">Set</Button>
                    </div>
                  )}

                  <div className={`flex items-center space-x-4 w-full max-w-xs ${oledMode ? 'mt-16' : 'mt-8'}`}>
                    <Button onClick={toggleClassicTimer} className={`flex-1 h-20 text-xl font-black ${oledMode ? 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800' : (classicIsRunning ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/40')}`}>
                      {classicIsRunning ? <><Pause className="w-8 h-8 mr-2"/> {txt.pause}</> : <><Play className="w-8 h-8 mr-2"/> {txt.start}</>}
                    </Button>
                    <Button onClick={() => { setClassicIsRunning(false); setClassicTime(60); }} variant="outline" className={`h-20 px-6 ${oledMode ? 'bg-zinc-900 text-zinc-600 border-zinc-800 hover:bg-zinc-800' : 'border-zinc-300 dark:border-zinc-700 text-zinc-500'}`}>
                      <RotateCcw className="w-8 h-8" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {timerMode === "hiit" && (
              hiitState.isRunning || hiitState.phase === "DONE" || oledMode ? (
                <Card className={`transition-all duration-500 overflow-hidden w-full ${oledMode ? 'border-none bg-black shadow-none h-full flex flex-col justify-center' : `border-2 shadow-2xl ${getPhaseColor()}`}`}>
                  <CardContent className="flex flex-col items-center justify-center py-20 relative">
                    {!oledMode && (
                       <button onClick={resetHiit} className="absolute top-4 left-4 p-2 bg-black/20 text-white rounded-full hover:bg-black/40 transition-colors z-20"><X className="w-6 h-6" /></button>
                    )}
                    
                    <button onClick={() => setOledMode(!oledMode)} className={`absolute ${oledMode ? 'top-10 left-10 text-zinc-600 hover:text-white border border-zinc-800' : 'top-4 left-16 bg-black/20 text-white hover:bg-black/40'} p-3 rounded-full transition-colors z-20`} title="Mode OLED">
                      {oledMode ? <X className="w-6 h-6" /> : <MoonStar className="w-6 h-6" />}
                    </button>

                    <button onClick={() => setAudioEnabled(!audioEnabled)} className={`absolute ${oledMode ? 'top-10 right-10 text-zinc-600 hover:text-white border border-zinc-800' : 'top-4 right-4 bg-black/20 text-white hover:bg-black/40'} p-3 rounded-full transition-colors z-20`}>
                      {audioEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                    </button>

                    <h2 className={`font-black uppercase tracking-widest mb-2 opacity-90 drop-shadow-md ${oledMode ? 'text-zinc-600 text-3xl' : 'text-2xl sm:text-4xl'}`}>
                      {txt[hiitState.phase.toLowerCase() as keyof typeof txt] || hiitState.phase}
                    </h2>
                    <div className={`font-black tabular-nums leading-none mb-8 ${oledMode ? 'text-[150px] sm:text-[200px] tracking-tighter text-red-600' : 'text-[120px] sm:text-[160px] drop-shadow-xl'}`}>
                      {hiitState.phase === "DONE" ? "✅" : formatTime(hiitState.timeLeft)}
                    </div>
                    {hiitState.phase !== "PREPARE" && hiitState.phase !== "DONE" && hiitState.phase !== "COOL_DOWN" && (
                      <div className={`flex space-x-8 text-xl font-bold px-6 py-3 rounded-2xl ${oledMode ? 'bg-zinc-900 border border-zinc-800 text-zinc-500' : 'bg-black/20 backdrop-blur-sm'}`}>
                        <div className="text-center"><span className="block text-xs uppercase opacity-70 mb-1">{txt.cycles}</span>{hiitState.currentCycle} / {hiitConfig.cycles}</div>
                        <div className={`w-px ${oledMode ? 'bg-zinc-800' : 'bg-white/20'}`}></div>
                        <div className="text-center"><span className="block text-xs uppercase opacity-70 mb-1">{txt.sets}</span>{hiitState.currentSet} / {hiitConfig.sets}</div>
                      </div>
                    )}
                    <Button onClick={toggleHiit} className={`mt-12 h-20 px-12 text-2xl font-black shadow-xl ${oledMode ? 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}>
                      {hiitState.phase === "DONE" ? <RotateCcw className="w-8 h-8 mr-2" /> : (hiitState.isRunning ? <Pause className="w-8 h-8 mr-2" /> : <Play className="w-8 h-8 mr-2" />)}
                      {hiitState.phase === "DONE" ? txt.reset : (hiitState.isRunning ? txt.pause : "Reprendre")}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <CardTitle className="text-red-500 font-black tracking-widest uppercase flex items-center">
                      <Activity className="w-5 h-5 mr-2" /> HIIT Pro
                    </CardTitle>
                    <div className="flex space-x-2">
                      <button onClick={() => setOledMode(true)} className="p-2 text-zinc-400 hover:text-white bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors" title="Mode OLED (Éco Batterie)">
                        <MoonStar className="w-4 h-4" />
                      </button>
                      <button onClick={() => setAudioEnabled(!audioEnabled)} className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${audioEnabled ? 'bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-900/30 dark:border-teal-800 dark:text-teal-400' : 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400'}`}>
                        {audioEnabled ? <Volume2 className="w-3 h-3 mr-1.5" /> : <VolumeX className="w-3 h-3 mr-1.5" />}
                        {audioEnabled ? txt.soundOn : txt.soundOff}
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {[
                        { key: "prepare", label: txt.prepare, color: "text-blue-500" },
                        { key: "work", label: txt.work, color: "text-green-500" },
                        { key: "rest", label: txt.rest, color: "text-red-500" },
                        { key: "cycles", label: txt.cycles, color: "text-indigo-500" },
                        { key: "sets", label: txt.sets, color: "text-purple-500" },
                        { key: "restBetweenSets", label: txt.restBetween, color: "text-orange-500" },
                        { key: "coolDown", label: txt.coolDown, color: "text-blue-400" }
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                          <Label className={`font-bold uppercase tracking-widest text-xs sm:text-sm ${item.color}`}>{item.label}</Label>
                          <div className="flex items-center space-x-4">
                            <button onClick={() => updateHiitConfig(item.key as any, hiitConfig[item.key as keyof typeof hiitConfig] - 1)} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 transition-all"><Minus className="w-5 h-5" /></button>
                            <span className="w-12 text-center font-black text-xl text-zinc-900 dark:text-zinc-100">{hiitConfig[item.key as keyof typeof hiitConfig]}</span>
                            <button onClick={() => updateHiitConfig(item.key as any, hiitConfig[item.key as keyof typeof hiitConfig] + 1)} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 transition-all"><Plus className="w-5 h-5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
                      <Button onClick={toggleHiit} className="w-full h-16 bg-red-500 hover:bg-red-600 text-white font-black text-xl shadow-lg shadow-red-500/30 uppercase tracking-widest transition-transform active:scale-95">
                        <Play className="w-6 h-6 mr-2" /> {txt.start}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        )}

        {/* ONGLET LABO PRO : Ajout du calculateur DOTS */}
        {activeTab === "elite" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg border-t-4 border-t-indigo-500 relative">
              {/* 🛡️ BOUTON INFO PÉDAGOGIQUE POUR LE SCORE DOTS */}
              <button onClick={() => setInfoModal({ show: true, title: "Score DOTS", desc: "" })} className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-indigo-500 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors z-10">
                <Info className="w-4 h-4" />
              </button>
              
              <CardHeader>
                <CardTitle className="flex items-center text-indigo-600 dark:text-indigo-400 pr-8"><Target className="w-5 h-5 mr-2" /> Score DOTS (Powerlifting)</CardTitle>
                <CardDescription>Le standard mondial pour comparer la force relative.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
                  <button onClick={() => setDotsGender("homme")} className={`flex-1 py-2 font-bold text-sm rounded-lg transition-colors ${dotsGender === "homme" ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm" : "text-zinc-500"}`}>Homme</button>
                  <button onClick={() => setDotsGender("femme")} className={`flex-1 py-2 font-bold text-sm rounded-lg transition-colors ${dotsGender === "femme" ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm" : "text-zinc-500"}`}>Femme</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-zinc-600 dark:text-zinc-400">Poids de corps (kg)</Label>
                    <Input type="number" step="0.1" placeholder="Ex: 75" value={dotsBw} onChange={(e) => setDotsBw(e.target.value)} className="font-black text-xl h-12 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-zinc-600 dark:text-zinc-400">Total SBD (kg)</Label>
                    <Input type="number" step="1" placeholder="Ex: 450" value={dotsTotal} onChange={(e) => setDotsTotal(e.target.value)} className="font-black text-xl h-12 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-indigo-500" />
                  </div>
                </div>
                <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex flex-col items-center justify-center bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl text-center">
                  <span className="font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-2">Score de Force Relative</span>
                  <div className="text-6xl font-black text-indigo-500">{calculateDots() || 0}</div>
                  <p className="text-xs font-bold text-zinc-500 mt-4">Un score {'>'} 400 est considéré comme exceptionnel.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg border-t-4 border-t-fuchsia-500 relative">
              {/* 🛡️ BOUTON INFO PÉDAGOGIQUE POUR LE TAUX DE SUDATION */}
              <button onClick={() => setInfoModal({ show: true, title: "Taux de Sudation", desc: "" })} className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-fuchsia-500 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors z-10">
                <Info className="w-4 h-4" />
              </button>
              
              <CardHeader>
                <CardTitle className="flex items-center text-fuchsia-600 dark:text-fuchsia-400 pr-8"><Droplets className="w-5 h-5 mr-2" /> {txt.sweatTitle}</CardTitle>
                <CardDescription>{txt.sweatSub}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.wBefore}</Label>
                    <Input type="number" step="0.1" placeholder="Ex: 80.5" value={weightBefore} onChange={(e) => setWeightBefore(e.target.value)} className="font-black text-xl h-12 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.wAfter}</Label>
                    <Input type="number" step="0.1" placeholder="Ex: 79.2" value={weightAfter} onChange={(e) => setWeightAfter(e.target.value)} className="font-black text-xl h-12 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.fluid}</Label>
                    <Input type="number" placeholder="Ex: 500" value={fluidDrank} onChange={(e) => setFluidDrank(e.target.value)} className="font-black text-xl h-12 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.dur}</Label>
                    <Input type="number" placeholder="Ex: 90" value={workoutDur} onChange={(e) => setWorkoutDur(e.target.value)} className="font-black text-xl h-12 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-orange-500" />
                  </div>
                </div>
                
                <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex flex-col items-center justify-center bg-fuchsia-50 dark:bg-fuchsia-900/10 p-6 rounded-2xl text-center">
                  <span className="font-black text-fuchsia-700 dark:text-fuchsia-400 uppercase tracking-widest mb-2">{txt.sweatRate}</span>
                  <div className="text-6xl font-black text-fuchsia-500">{getSweatRate()} <span className="text-xl text-zinc-500">ml/h</span></div>
                  <p className="text-xs font-bold text-zinc-500 mt-4">{txt.sweatRec}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>

      {/* 🛡️ MODALE D'INFORMATION GLOBALE PÉDAGOGIQUE */}
      <Dialog open={infoModal !== null} onOpenChange={(open) => !open && setInfoModal(null)}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-indigo-600 dark:text-indigo-400 flex items-center">
              <Info className="w-5 h-5 mr-2" /> {infoModal?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
              {getModalContent()}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setInfoModal(null)} className="w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold">
              {lang === 'FR' ? "Compris" : "Got it"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
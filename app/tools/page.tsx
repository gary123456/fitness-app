"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dumbbell, Scale, Calculator, ArrowRightLeft, Target, Wrench, Timer, Play, Pause, RotateCcw, Volume2, VolumeX, Plus, Minus, Activity, Droplets, FlaskConical, X, Apple } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";

// --- CONSTANTES ---
const PLATES = [
  { weight: 25, color: "bg-red-500", h: "h-24", w: "w-6" },
  { weight: 20, color: "bg-blue-500", h: "h-24", w: "w-5" },
  { weight: 15, color: "bg-yellow-400", h: "h-20", w: "w-4" },
  { weight: 10, color: "bg-green-500", h: "h-16", w: "w-4" },
  { weight: 5, color: "bg-white text-black", h: "h-12", w: "w-3" },
  { weight: 2.5, color: "bg-zinc-800", h: "h-10", w: "w-2" },
  { weight: 1.25, color: "bg-zinc-700", h: "h-8", w: "w-2" }
];

// --- MOTEUR AUDIO ANTI-SILENCE (HACK iOS/SAFARI) ---
let globalAudioCtx: AudioContext | null = null;

const getAudioCtx = () => {
  if (typeof window === "undefined") return null;
  if (!globalAudioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctx) globalAudioCtx = new Ctx();
  }
  return globalAudioCtx;
};

// Fonction vitale pour iOS : Jouer un son silencieux sur une interaction utilisateur pour débloquer l'API
const unlockAudioForIOS = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0; // Silencieux
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
  const [activeTab, setActiveTab] = useState<"plates" | "predict" | "convert" | "timer" | "elite">("plates");
  
  // States - Plate Calculator
  const [targetWeight, setTargetWeight] = useState<string>("");
  const [barWeight, setBarWeight] = useState<string>("20");
  
  // States - Converter
  const [convKg, setConvKg] = useState<string>("");
  const [convLb, setConvLb] = useState<string>("");
  const [convOz, setConvOz] = useState<string>("");
  const [convGramsOz, setConvGramsOz] = useState<string>("");
  const [convCup, setConvCup] = useState<string>("");
  const [convGramsCup, setConvGramsCup] = useState<string>("");

  // States - 1RM Predictor
  const [liftWeight, setLiftWeight] = useState<string>("");
  const [liftReps, setLiftReps] = useState<string>("");

  // States - Elite Metrics (Sweat Rate)
  const [weightBefore, setWeightBefore] = useState<string>("");
  const [weightAfter, setWeightAfter] = useState<string>("");
  const [fluidDrank, setFluidDrank] = useState<string>("");
  const [workoutDur, setWorkoutDur] = useState<string>("");

  // States - Timer Classique
  const [timerMode, setTimerMode] = useState<"classic" | "hiit">("hiit");
  const [classicTime, setClassicTime] = useState<number>(60);
  const [customMin, setCustomMin] = useState<string>("1");
  const [customSec, setCustomSec] = useState<string>("0");
  const [classicIsRunning, setClassicIsRunning] = useState(false);
  const classicRef = useRef<NodeJS.Timeout | null>(null);

  // States - HIIT Pro Timer
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [hiitConfig, setHiitConfig] = useState({
    prepare: 10, work: 20, rest: 10, cycles: 8, sets: 1, restBetweenSets: 60, coolDown: 0
  });
  const [hiitState, setHiitState] = useState({
    isRunning: false,
    phase: "PREPARE" as "PREPARE" | "WORK" | "REST" | "SET_REST" | "COOL_DOWN" | "DONE",
    timeLeft: hiitConfig.prepare,
    currentCycle: 1,
    currentSet: 1
  });
  const hiitRef = useRef<NodeJS.Timeout | null>(null);

  const t = {
    FR: { title: "Boîte à Outils", sub: "L'arsenal de la Silicon Valley pour votre entraînement.", plateCalc: "Disques", converter: "Convertir", predictor: "1RM", timer: "Chrono", elite: "Labo Pro", targetWeight: "Poids Cible (kg)", barWeight: "Poids de la Barre (kg)", eachSide: "Par côté :", totalSide: "Total par côté :", noPlates: "Entrez un poids cible supérieur à la barre.", kgToLb: "Kg vers Lbs", lbToKg: "Lbs vers Kg", weightLifted: "Poids soulevé (kg)", repsDone: "Reps réalisées", est1RM: "1RM Estimé", formula: "Basé sur la formule d'Epley", nutConv: "Nutrition (Solides & Liquides)", start: "Démarrer", pause: "Pause", reset: "Réinitialiser", classic: "Classique", prepare: "Préparation", work: "Travail", rest: "Repos", cycles: "Cycles", sets: "Séries", restBetween: "Repos (Séries)", coolDown: "Retour au calme", done: "Terminé !", soundOn: "Son Activé", soundOff: "Son Désactivé", sweatTitle: "Taux de Sudation (Hydratation)", sweatSub: "Protocole de pesée pour définir vos besoins hydriques intra-effort.", wBefore: "Poids avant (kg)", wAfter: "Poids après (kg)", fluid: "Liquide bu (ml)", dur: "Durée (min)", sweatRate: "Perte de sueur", sweatRec: "Buvez cette quantité par heure d'effort." },
    EN: { title: "Toolbox", sub: "The Silicon Valley arsenal for your training.", plateCalc: "Plates", converter: "Convert", predictor: "1RM", timer: "Timer", elite: "Pro Lab", targetWeight: "Target Weight (kg)", barWeight: "Bar Weight (kg)", eachSide: "Per side:", totalSide: "Total per side:", noPlates: "Enter a target weight greater than the bar.", kgToLb: "Kg to Lbs", lbToKg: "Lbs to Kg", weightLifted: "Weight lifted (kg)", repsDone: "Reps performed", est1RM: "Estimated 1RM", formula: "Based on Epley's formula", nutConv: "Nutrition (Solids & Liquids)", start: "Start", pause: "Pause", reset: "Reset", classic: "Classic", prepare: "Prepare", work: "Work", rest: "Rest", cycles: "Cycles", sets: "Sets", restBetween: "Rest (Sets)", coolDown: "Cool Down", done: "Workout Done!", soundOn: "Sound On", soundOff: "Sound Off", sweatTitle: "Sweat Rate (Hydration)", sweatSub: "Weigh-in protocol to define your intra-workout fluid needs.", wBefore: "Weight before (kg)", wAfter: "Weight after (kg)", fluid: "Fluid drank (ml)", dur: "Duration (min)", sweatRate: "Sweat Loss", sweatRec: "Drink this amount per hour of exercise." }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

  // Calcul Logique Plate Calculator
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

  // Convertisseurs Sport
  const handleKgChange = (val: string) => { setConvKg(val); setConvLb(val ? (parseFloat(val) * 2.20462).toFixed(2) : ""); };
  const handleLbChange = (val: string) => { setConvLb(val); setConvKg(val ? (parseFloat(val) / 2.20462).toFixed(2) : ""); };

  // Convertisseurs Nutrition
  const handleOzChange = (val: string) => { setConvOz(val); setConvGramsOz(val ? (parseFloat(val) * 28.3495).toFixed(0) : ""); };
  const handleGramsOzChange = (val: string) => { setConvGramsOz(val); setConvOz(val ? (parseFloat(val) / 28.3495).toFixed(2) : ""); };
  const handleCupChange = (val: string) => { setConvCup(val); setConvGramsCup(val ? (parseFloat(val) * 240).toFixed(0) : ""); };
  const handleGramsCupChange = (val: string) => { setConvGramsCup(val); setConvCup(val ? (parseFloat(val) / 240).toFixed(2) : ""); };

  // 1RM
  const get1RM = () => {
    const w = parseFloat(liftWeight);
    const r = parseInt(liftReps);
    if (!w || !r || r < 1) return 0;
    if (r === 1) return w;
    return Math.round(w * (1 + r / 30));
  };

  // Sweat Rate
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

  // Timer Classique
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

  // HIIT Pro Timer
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

          // Bips de fin de chrono (3, 2, 1)
          if (newTime > 0 && newTime <= 3 && audioEnabled) {
            playTone(800, 0.1);
            if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate(100);
          }

          // Changement de phase
          if (newTime === 0) {
            if (audioEnabled) {
              if (prev.phase === "WORK" && prev.currentCycle === hiitConfig.cycles && prev.currentSet === hiitConfig.sets && hiitConfig.coolDown === 0) {
                playTone(1500, 1.5, "square"); // Sifflet final
              } else {
                playTone(1200, 0.5, "square"); // Sifflet changement de phase
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
    // 🛡️ Le Hack IOS Vital est déclenché ici
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
    switch (hiitState.phase) {
      case "WORK": return "bg-green-500 text-white shadow-green-500/50 border-green-400";
      case "REST": case "SET_REST": return "bg-red-500 text-white shadow-red-500/50 border-red-400";
      case "PREPARE": case "COOL_DOWN": return "bg-blue-500 text-white shadow-blue-500/50 border-blue-400";
      case "DONE": return "bg-amber-500 text-white shadow-amber-500/50 border-amber-400";
      default: return "bg-zinc-900 text-white border-zinc-800";
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-5xl mx-auto w-full pb-24">
      <div className="flex flex-col space-y-2 mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
          <Wrench className="w-8 h-8 mr-3 text-teal-500" /> {txt.title}
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">{txt.sub}</p>
      </div>

      {/* UI DES ONGLETS ENTIÈREMENT REVUE POUR 5 ÉLÉMENTS */}
      <div className="grid grid-cols-5 gap-2 mb-8 bg-zinc-200/50 dark:bg-zinc-900 p-1.5 rounded-2xl overflow-x-auto scrollbar-hide">
        <button onClick={() => setActiveTab("plates")} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all font-bold min-w-[70px] ${activeTab === 'plates' ? 'bg-white dark:bg-zinc-950 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
          <Target className="w-5 h-5 mb-1" /><span className="text-[9px] uppercase tracking-wider">{txt.plateCalc}</span>
        </button>
        <button onClick={() => setActiveTab("predict")} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all font-bold min-w-[70px] ${activeTab === 'predict' ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
          <Calculator className="w-5 h-5 mb-1" /><span className="text-[9px] uppercase tracking-wider">{txt.predictor}</span>
        </button>
        <button onClick={() => setActiveTab("convert")} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all font-bold min-w-[70px] ${activeTab === 'convert' ? 'bg-white dark:bg-zinc-950 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
          <ArrowRightLeft className="w-5 h-5 mb-1" /><span className="text-[9px] uppercase tracking-wider">{txt.converter}</span>
        </button>
        <button onClick={() => setActiveTab("timer")} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all font-bold min-w-[70px] ${activeTab === 'timer' ? 'bg-white dark:bg-zinc-950 text-red-600 dark:text-red-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
          <Timer className="w-5 h-5 mb-1" /><span className="text-[9px] uppercase tracking-wider">{txt.timer}</span>
        </button>
        {/* NOUVEL ONGLET ELITE */}
        <button onClick={() => setActiveTab("elite")} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all font-bold min-w-[70px] ${activeTab === 'elite' ? 'bg-white dark:bg-zinc-950 text-fuchsia-600 dark:text-fuchsia-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
          <FlaskConical className="w-5 h-5 mb-1" /><span className="text-[9px] uppercase tracking-wider">{txt.elite}</span>
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* ONGLET 1 : PLATE CALCULATOR */}
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
                    {/* DESSIN DE LA BARRE (SILICON VALLEY UI) */}
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

        {/* ONGLET 2 : 1RM PREDICTOR */}
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
            </CardContent>
          </Card>
        )}

        {/* ONGLET 3 : CONVERTISSEURS */}
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

        {/* ONGLET 4 : CHRONOMÈTRE PRO & HIIT */}
        {activeTab === "timer" && (
          <div className="space-y-4">
            
            <div className="flex justify-center mb-4">
              <div className="bg-zinc-200/50 dark:bg-zinc-900 p-1 rounded-xl flex space-x-1">
                <button onClick={() => setTimerMode("hiit")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timerMode === 'hiit' ? 'bg-white dark:bg-zinc-950 text-red-500 shadow-sm' : 'text-zinc-500'}`}>HIIT / Tabata</button>
                <button onClick={() => setTimerMode("classic")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timerMode === 'classic' ? 'bg-white dark:bg-zinc-950 text-blue-500 shadow-sm' : 'text-zinc-500'}`}>{txt.classic}</button>
              </div>
            </div>

            {timerMode === "classic" && (
              <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">
                <CardHeader className="text-center pb-2 relative">
                  <button onClick={() => setAudioEnabled(!audioEnabled)} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-indigo-500 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors">
                    {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                  <CardTitle className="text-blue-500 font-black tracking-widest uppercase">Timer Classique</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <div className={`text-7xl sm:text-8xl font-black tabular-nums transition-colors duration-500 ${classicIsRunning ? 'text-blue-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
                    {formatTime(classicTime)}
                  </div>
                  
                  {!classicIsRunning && (
                    <div className="flex items-center space-x-2 mt-6">
                      <Input type="number" value={customMin} onChange={(e) => setCustomMin(e.target.value)} className="w-16 h-10 text-center font-bold" placeholder="Min" />
                      <span className="font-bold">:</span>
                      <Input type="number" value={customSec} onChange={(e) => setCustomSec(e.target.value)} className="w-16 h-10 text-center font-bold" placeholder="Sec" />
                      <Button onClick={setCustomClassicTime} variant="secondary" className="font-bold ml-2">Set</Button>
                    </div>
                  )}

                  <div className="flex items-center space-x-4 mt-8 w-full max-w-xs">
                    <Button onClick={toggleClassicTimer} className={`flex-1 h-16 text-xl font-black text-white ${classicIsRunning ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/40'}`}>
                      {classicIsRunning ? <><Pause className="w-6 h-6 mr-2"/> {txt.pause}</> : <><Play className="w-6 h-6 mr-2"/> {txt.start}</>}
                    </Button>
                    <Button onClick={() => { setClassicIsRunning(false); setClassicTime(60); }} variant="outline" className="h-16 px-6 border-zinc-300 dark:border-zinc-700 text-zinc-500">
                      <RotateCcw className="w-6 h-6" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {timerMode === "hiit" && (
              hiitState.isRunning || hiitState.phase === "DONE" ? (
                /* ÉCRAN D'EXÉCUTION DU HIIT (Plein Écran dans la Card) */
                <Card className={`border-2 shadow-2xl transition-colors duration-500 overflow-hidden ${getPhaseColor()}`}>
                  <CardContent className="flex flex-col items-center justify-center py-20 relative">
                    
                    <button onClick={resetHiit} className="absolute top-4 left-4 p-2 bg-black/20 text-white rounded-full hover:bg-black/40 transition-colors z-20">
                      <X className="w-6 h-6" />
                    </button>
                    <button onClick={() => setAudioEnabled(!audioEnabled)} className="absolute top-4 right-4 p-2 bg-black/20 text-white rounded-full hover:bg-black/40 transition-colors z-20">
                      {audioEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                    </button>

                    <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-widest mb-2 opacity-90 drop-shadow-md">
                      {txt[hiitState.phase.toLowerCase() as keyof typeof txt] || hiitState.phase}
                    </h2>
                    
                    <div className="text-[120px] sm:text-[160px] font-black tabular-nums leading-none drop-shadow-xl mb-8">
                      {hiitState.phase === "DONE" ? "✅" : formatTime(hiitState.timeLeft)}
                    </div>
                    
                    {hiitState.phase !== "PREPARE" && hiitState.phase !== "DONE" && hiitState.phase !== "COOL_DOWN" && (
                      <div className="flex space-x-8 text-xl font-bold bg-black/20 px-6 py-3 rounded-2xl backdrop-blur-sm">
                        <div className="text-center"><span className="block text-xs uppercase opacity-70 mb-1">{txt.cycles}</span>{hiitState.currentCycle} / {hiitConfig.cycles}</div>
                        <div className="w-px bg-white/20"></div>
                        <div className="text-center"><span className="block text-xs uppercase opacity-70 mb-1">{txt.sets}</span>{hiitState.currentSet} / {hiitConfig.sets}</div>
                      </div>
                    )}
                    
                    <Button onClick={toggleHiit} className="mt-12 bg-white text-black hover:bg-zinc-200 h-16 px-12 text-xl font-black shadow-xl">
                      {hiitState.phase === "DONE" ? <RotateCcw className="w-6 h-6 mr-2" /> : (hiitState.isRunning ? <Pause className="w-6 h-6 mr-2" /> : <Play className="w-6 h-6 mr-2" />)}
                      {hiitState.phase === "DONE" ? txt.reset : (hiitState.isRunning ? txt.pause : "Reprendre")}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                /* ÉCRAN DE CONFIGURATION DU HIIT */
                <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <CardTitle className="text-red-500 font-black tracking-widest uppercase flex items-center">
                      <Activity className="w-5 h-5 mr-2" /> HIIT Pro
                    </CardTitle>
                    <button onClick={() => setAudioEnabled(!audioEnabled)} className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${audioEnabled ? 'bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-900/30 dark:border-teal-800 dark:text-teal-400' : 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400'}`}>
                      {audioEnabled ? <Volume2 className="w-3 h-3 mr-1.5" /> : <VolumeX className="w-3 h-3 mr-1.5" />}
                      {audioEnabled ? txt.soundOn : txt.soundOff}
                    </button>
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

        {/* NOUVEL ONGLET 5 : ELITE METRICS (SWEAT RATE) */}
        {activeTab === "elite" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg border-t-4 border-t-fuchsia-500">
              <CardHeader>
                <CardTitle className="flex items-center text-fuchsia-600 dark:text-fuchsia-400"><Droplets className="w-5 h-5 mr-2" /> {txt.sweatTitle}</CardTitle>
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
    </div>
  );
}
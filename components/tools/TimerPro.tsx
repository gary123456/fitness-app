"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Volume2, VolumeX, MoonStar, X, Plus, Minus, Activity, Info } from "lucide-react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";

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

interface TimerProProps {
  lang: string;
  onShowInfo: (title: string, desc: string) => void;
  oledMode: boolean;
  setOledMode: (val: boolean) => void;
}

export default function TimerPro({ lang, onShowInfo, oledMode, setOledMode }: TimerProProps) {
  const [timerMode, setTimerMode] = useLocalStorage<"classic" | "hiit">("vivex-timer-mode", "hiit");
  const [classicTime, setClassicTime] = useState<number>(60);
  const [customMin, setCustomMin] = useState<string>("1");
  const [customSec, setCustomSec] = useState<string>("0");
  const [classicIsRunning, setClassicIsRunning] = useState(false);
  const classicRef = useRef<NodeJS.Timeout | null>(null);

  const [audioEnabled, setAudioEnabled] = useLocalStorage("vivex-timer-audio", true);
  
  const [hiitConfig, setHiitConfig] = useLocalStorage("vivex-hiit-config", { prepare: 10, work: 20, rest: 10, cycles: 8, sets: 1, restBetweenSets: 60, coolDown: 0 });
  const [hiitState, setHiitState] = useState({ isRunning: false, phase: "PREPARE" as "PREPARE" | "WORK" | "REST" | "SET_REST" | "COOL_DOWN" | "DONE", timeLeft: hiitConfig.prepare, currentCycle: 1, currentSet: 1 });
  const hiitRef = useRef<NodeJS.Timeout | null>(null);

  const txt = {
    FR: { classic: "Classique", start: "Démarrer", pause: "Pause", reset: "Réinit", prepare: "Préparation", work: "Travail", rest: "Repos", cycles: "Cycles", sets: "Séries", restBetween: "Repos (Séries)", coolDown: "Retour au calme", done: "Terminé !", soundOn: "Son On", soundOff: "Son Off" },
    EN: { classic: "Classic", start: "Start", pause: "Pause", reset: "Reset", prepare: "Prepare", work: "Work", rest: "Rest", cycles: "Cycles", sets: "Sets", restBetween: "Rest (Sets)", coolDown: "Cool Down", done: "Workout Done!", soundOn: "Sound On", soundOff: "Sound Off" }
  }[lang] || { classic: "Classique", start: "Démarrer", pause: "Pause", reset: "Réinit", prepare: "Préparation", work: "Travail", rest: "Repos", cycles: "Cycles", sets: "Séries", restBetween: "Repos (Séries)", coolDown: "Retour au calme", done: "Terminé !", soundOn: "Son On", soundOff: "Son Off" };

  // --- LOGIQUE CLASSIQUE ---
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
    if (audioEnabled) unlockAudioForIOS();
    const m = parseInt(customMin) || 0;
    const s = parseInt(customSec) || 0;
    setClassicTime(m * 60 + s);
  };

  // --- LOGIQUE HIIT ---
  const updateHiitConfig = (key: keyof typeof hiitConfig, val: number) => {
    if (val < 0) return;
    if (audioEnabled) unlockAudioForIOS();
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
              if (prev.currentCycle < hiitConfig.cycles) { newPhase = "REST"; newTime = hiitConfig.rest; } 
              else if (prev.currentSet < hiitConfig.sets) { newPhase = "SET_REST"; newTime = hiitConfig.restBetweenSets; newCycle = 1; } 
              else if (hiitConfig.coolDown > 0) { newPhase = "COOL_DOWN"; newTime = hiitConfig.coolDown; } 
              else { newPhase = "DONE"; newTime = 0; newIsRunning = false; }
            }
            else if (prev.phase === "REST") { newPhase = "WORK"; newTime = hiitConfig.work; newCycle++; }
            else if (prev.phase === "SET_REST") { newPhase = "WORK"; newTime = hiitConfig.work; newSet++; }
            else if (prev.phase === "COOL_DOWN") { newPhase = "DONE"; newTime = 0; newIsRunning = false; }
          }
          return { isRunning: newIsRunning, phase: newPhase, timeLeft: newTime, currentCycle: newCycle, currentSet: newSet };
        });
      }, 1000);
    }
    return () => clearInterval(hiitRef.current as NodeJS.Timeout);
  }, [hiitState.isRunning, hiitConfig, audioEnabled]);

  const toggleHiit = () => {
    if (!hiitState.isRunning && audioEnabled) unlockAudioForIOS();
    if (hiitState.phase === "DONE") { setHiitState({ isRunning: true, phase: "PREPARE", timeLeft: hiitConfig.prepare, currentCycle: 1, currentSet: 1 }); } 
    else { setHiitState(prev => ({ ...prev, isRunning: !prev.isRunning })); }
  };

  const resetHiit = () => setHiitState({ isRunning: false, phase: "PREPARE", timeLeft: hiitConfig.prepare, currentCycle: 1, currentSet: 1 });

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60); const s = seconds % 60;
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

  return (
    <div className={`space-y-4 h-full flex flex-col animate-in fade-in zoom-in-95 ${oledMode ? 'justify-center items-center' : ''}`}>
      {!oledMode && (
        <div className="flex justify-center mb-4">
          <div className="bg-zinc-200/50 dark:bg-zinc-900 p-1 rounded-xl flex space-x-1">
            <button onClick={() => { setTimerMode("hiit"); unlockAudioForIOS(); }} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timerMode === 'hiit' ? 'bg-white dark:bg-zinc-950 text-red-500 shadow-sm' : 'text-zinc-500'}`}>HIIT / Tabata</button>
            <button onClick={() => { setTimerMode("classic"); unlockAudioForIOS(); }} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timerMode === 'classic' ? 'bg-white dark:bg-zinc-950 text-blue-500 shadow-sm' : 'text-zinc-500'}`}>{txt.classic}</button>
          </div>
        </div>
      )}

      {timerMode === "classic" && (
        <Card className={`transition-all duration-500 ${oledMode ? 'border-none bg-transparent shadow-none w-full' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg relative'}`}>
          {!oledMode && (
            <CardHeader className="text-center pb-2 relative">
              <button onClick={() => setOledMode(true)} className="absolute top-4 left-4 p-2 text-zinc-400 hover:text-white bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500" title="Mode OLED (Éco Batterie)">
                <MoonStar className="w-5 h-5" />
              </button>
              <button onClick={() => setAudioEnabled(!audioEnabled)} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-blue-500 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500">
                {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <CardTitle className="text-slate-500 font-black tracking-widest uppercase">Timer Classique</CardTitle>
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

            <div className={`font-black tabular-nums transition-colors duration-500 tracking-tighter ${oledMode ? 'text-[150px] sm:text-[200px] text-red-600' : 'text-7xl sm:text-8xl'} ${classicIsRunning && !oledMode ? 'text-slate-600 dark:text-slate-300' : (!oledMode ? 'text-zinc-900 dark:text-zinc-100' : '')}`}>
              {formatTime(classicTime)}
            </div>
            
            {!classicIsRunning && !oledMode && (
              <div className="flex items-center space-x-2 mt-6">
                <Input type="number" value={customMin} onChange={(e) => setCustomMin(e.target.value)} className="w-16 h-10 text-center font-bold" placeholder="Min" />
                <span className="font-bold">:</span>
                <Input type="number" value={customSec} onChange={(e) => setCustomSec(e.target.value)} className="w-16 h-10 text-center font-bold" placeholder="Sec" />
                <Button onClick={setCustomClassicTime} variant="secondary" className="font-bold ml-2 focus:ring-2 focus:ring-slate-500">Set</Button>
              </div>
            )}

            <div className={`flex items-center space-x-4 w-full max-w-xs ${oledMode ? 'mt-16' : 'mt-8'}`}>
              <Button onClick={toggleClassicTimer} className={`flex-1 h-20 text-xl font-black ${oledMode ? 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800' : (classicIsRunning ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-slate-600 text-white hover:bg-slate-700 shadow-lg shadow-slate-500/40')}`}>
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
        (hiitState.isRunning || hiitState.phase === "DONE" || oledMode) ? (
          <Card className={`transition-all duration-500 overflow-hidden w-full ${oledMode ? 'border-none bg-black shadow-none h-full flex flex-col justify-center' : `border-2 shadow-2xl ${getPhaseColor()}`}`}>
            <CardContent className="flex flex-col items-center justify-center py-20 relative">
              {!oledMode && (
                 <button onClick={resetHiit} className="absolute top-4 left-4 p-2 bg-black/20 text-white rounded-full hover:bg-black/40 transition-colors z-20 focus:outline-none focus:ring-2 focus:ring-white"><X className="w-6 h-6" /></button>
              )}
              
              <button onClick={() => setOledMode(!oledMode)} className={`absolute ${oledMode ? 'top-10 left-10 text-zinc-600 hover:text-white border border-zinc-800' : 'top-4 left-16 bg-black/20 text-white hover:bg-black/40'} p-3 rounded-full transition-colors z-20 focus:outline-none focus:ring-2 focus:ring-white`} title="Mode OLED">
                {oledMode ? <X className="w-6 h-6" /> : <MoonStar className="w-6 h-6" />}
              </button>

              <button onClick={() => setAudioEnabled(!audioEnabled)} className={`absolute ${oledMode ? 'top-10 right-10 text-zinc-600 hover:text-white border border-zinc-800' : 'top-4 right-4 bg-black/20 text-white hover:bg-black/40'} p-3 rounded-full transition-colors z-20 focus:outline-none focus:ring-2 focus:ring-white`}>
                {audioEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </button>

              <h2 className={`font-black uppercase tracking-widest mb-2 opacity-90 drop-shadow-md ${oledMode ? 'text-zinc-600 text-3xl' : 'text-2xl sm:text-4xl'}`}>
                {txt[hiitState.phase.toLowerCase() as keyof typeof txt] || hiitState.phase}
              </h2>
              <div className={`font-black tabular-nums leading-none mb-8 tracking-tighter ${oledMode ? 'text-[150px] sm:text-[200px] text-red-600' : 'text-[120px] sm:text-[160px] drop-shadow-xl'}`}>
                {hiitState.phase === "DONE" ? "✅" : formatTime(hiitState.timeLeft)}
              </div>
              {hiitState.phase !== "PREPARE" && hiitState.phase !== "DONE" && hiitState.phase !== "COOL_DOWN" && (
                <div className={`flex space-x-8 text-xl font-bold px-6 py-3 rounded-2xl ${oledMode ? 'bg-zinc-900 border border-zinc-800 text-zinc-500' : 'bg-black/20 backdrop-blur-sm'}`}>
                  <div className="text-center"><span className="block text-xs uppercase opacity-70 mb-1">{txt.cycles}</span>{hiitState.currentCycle} / {hiitConfig.cycles}</div>
                  <div className={`w-px ${oledMode ? 'bg-zinc-800' : 'bg-white/20'}`}></div>
                  <div className="text-center"><span className="block text-xs uppercase opacity-70 mb-1">{txt.sets}</span>{hiitState.currentSet} / {hiitConfig.sets}</div>
                </div>
              )}
              <Button onClick={toggleHiit} className={`mt-12 h-20 px-12 text-2xl font-black shadow-xl focus:ring-4 focus:ring-white/50 ${oledMode ? 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}>
                {hiitState.phase === "DONE" ? <RotateCcw className="w-8 h-8 mr-2" /> : (hiitState.isRunning ? <Pause className="w-8 h-8 mr-2" /> : <Play className="w-8 h-8 mr-2" />)}
                {hiitState.phase === "DONE" ? txt.reset : (hiitState.isRunning ? txt.pause : "Reprendre")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg relative">
            <button onClick={() => onShowInfo("Chronomètre Pro", "")} className="absolute top-4 left-14 p-1.5 text-zinc-400 hover:text-red-500 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors z-10 focus:outline-none focus:ring-2 focus:ring-red-500">
              <Info className="w-4 h-4" />
            </button>
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-red-500 font-black tracking-widest uppercase flex items-center">
                <Activity className="w-5 h-5 mr-2" /> HIIT Pro
              </CardTitle>
              <div className="flex space-x-2">
                <button onClick={() => setOledMode(true)} className="p-2 text-zinc-400 hover:text-white bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors" title="Mode OLED (Éco Batterie)">
                  <MoonStar className="w-4 h-4" />
                </button>
                <button onClick={() => setAudioEnabled(!audioEnabled)} className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 ${audioEnabled ? 'bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-900/30 dark:border-teal-800 dark:text-teal-400' : 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400'}`}>
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
                      <button onClick={() => updateHiitConfig(item.key as any, hiitConfig[item.key as keyof typeof hiitConfig] - 1)} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 transition-all focus:outline-none focus:ring-2 focus:ring-red-500"><Minus className="w-5 h-5" /></button>
                      <span className="w-12 text-center font-black text-xl text-zinc-900 dark:text-zinc-100">{hiitConfig[item.key as keyof typeof hiitConfig]}</span>
                      <button onClick={() => updateHiitConfig(item.key as any, hiitConfig[item.key as keyof typeof hiitConfig] + 1)} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 transition-all focus:outline-none focus:ring-2 focus:ring-red-500"><Plus className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
                <Button onClick={toggleHiit} className="w-full h-16 bg-red-500 hover:bg-red-600 text-white font-black text-xl shadow-lg shadow-red-500/30 uppercase tracking-widest transition-transform active:scale-95 focus:ring-4 focus:ring-red-500/50">
                  <Play className="w-6 h-6 mr-2" /> {txt.start}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
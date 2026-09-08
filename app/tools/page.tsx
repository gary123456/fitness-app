"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button"; // 🛡️ L'IMPORT MANQUANT ÉTAIT ICI
import { Dumbbell, Scale, Calculator, ArrowRightLeft, Target, Wrench, Timer, Play, Pause, RotateCcw } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export default function ToolsPage() {
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<"plates" | "predict" | "convert" | "timer">("plates");
  
  // States - Plate Calculator
  const [targetWeight, setTargetWeight] = useState<string>("");
  const [barWeight, setBarWeight] = useState<string>("20");
  
  // States - Converter Weight
  const [convKg, setConvKg] = useState<string>("");
  const [convLb, setConvLb] = useState<string>("");

  // States - Converter Nutrition
  const [convOz, setConvOz] = useState<string>("");
  const [convGramsOz, setConvGramsOz] = useState<string>("");
  const [convCup, setConvCup] = useState<string>("");
  const [convGramsCup, setConvGramsCup] = useState<string>("");

  // States - 1RM Predictor
  const [liftWeight, setLiftWeight] = useState<string>("");
  const [liftReps, setLiftReps] = useState<string>("");

  // States - Timer Pro
  const [timerTime, setTimerTime] = useState<number>(60);
  const [timerIsRunning, setTimerIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const t = {
    FR: { title: "Boîte à Outils", sub: "L'arsenal de la Silicon Valley pour votre entraînement.", plateCalc: "Calculateur Disques", converter: "Convertisseurs", predictor: "Prédicteur 1RM", timer: "Chrono Pro", targetWeight: "Poids Cible (kg)", barWeight: "Poids de la Barre (kg)", eachSide: "Par côté :", totalSide: "Total par côté :", noPlates: "Entrez un poids cible supérieur à la barre.", kgToLb: "Kg vers Lbs", lbToKg: "Lbs vers Kg", weightLifted: "Poids soulevé (kg)", repsDone: "Reps réalisées", est1RM: "1RM Estimé", formula: "Basé sur la formule d'Epley", nutConv: "Nutrition (Solides & Liquides)", start: "Démarrer", pause: "Pause", reset: "Réinitialiser" },
    EN: { title: "Toolbox", sub: "The Silicon Valley arsenal for your training.", plateCalc: "Plate Calculator", converter: "Converters", predictor: "1RM Predictor", timer: "Pro Timer", targetWeight: "Target Weight (kg)", barWeight: "Bar Weight (kg)", eachSide: "Per side:", totalSide: "Total per side:", noPlates: "Enter a target weight greater than the bar.", kgToLb: "Kg to Lbs", lbToKg: "Lbs to Kg", weightLifted: "Weight lifted (kg)", repsDone: "Reps performed", est1RM: "Estimated 1RM", formula: "Based on Epley's formula", nutConv: "Nutrition (Solids & Liquids)", start: "Start", pause: "Pause", reset: "Reset" }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

  // Calcul Logique Plate Calculator
  const calculatePlates = () => {
    const target = parseFloat(targetWeight);
    const bar = parseFloat(barWeight);
    if (!target || !bar || target <= bar) return [];

    let weightPerSide = (target - bar) / 2;
    const platesNeeded: {weight: number, count: number}[] = [];

    for (const plate of PLATES) {
      if (weightPerSide >= plate) {
        const count = Math.floor(weightPerSide / plate);
        platesNeeded.push({ weight: plate, count });
        weightPerSide -= (plate * count);
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

  // Timer Pro
  useEffect(() => {
    if (timerIsRunning && timerTime > 0) {
      timerRef.current = setInterval(() => setTimerTime(prev => prev - 1), 1000);
    } else if (timerTime === 0) {
      setTimerIsRunning(false);
      if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]); 
    }
    return () => clearInterval(timerRef.current as NodeJS.Timeout);
  }, [timerIsRunning, timerTime]);

  const toggleTimer = () => setTimerIsRunning(!timerIsRunning);
  const resetTimer = () => { setTimerIsRunning(false); setTimerTime(60); };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-5xl mx-auto w-full pb-24">
      <div className="flex flex-col space-y-2 mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
          <Wrench className="w-8 h-8 mr-3 text-teal-500" /> {txt.title}
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">{txt.sub}</p>
      </div>

      {/* CUSTOM TAB SYSTEM */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8 bg-zinc-200/50 dark:bg-zinc-900 p-1.5 rounded-2xl">
        <button onClick={() => setActiveTab("plates")} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all font-bold ${activeTab === 'plates' ? 'bg-white dark:bg-zinc-950 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
          <Target className="w-5 h-5 mb-1" /><span className="text-[10px] uppercase tracking-wider">{txt.plateCalc}</span>
        </button>
        <button onClick={() => setActiveTab("predict")} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all font-bold ${activeTab === 'predict' ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
          <Calculator className="w-5 h-5 mb-1" /><span className="text-[10px] uppercase tracking-wider">{txt.predictor}</span>
        </button>
        <button onClick={() => setActiveTab("convert")} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all font-bold ${activeTab === 'convert' ? 'bg-white dark:bg-zinc-950 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
          <ArrowRightLeft className="w-5 h-5 mb-1" /><span className="text-[10px] uppercase tracking-wider">{txt.converter}</span>
        </button>
        <button onClick={() => setActiveTab("timer")} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all font-bold ${activeTab === 'timer' ? 'bg-white dark:bg-zinc-950 text-red-600 dark:text-red-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
          <Timer className="w-5 h-5 mb-1" /><span className="text-[10px] uppercase tracking-wider">{txt.timer}</span>
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* TONGLET : PLATE CALCULATOR */}
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
                  <div className="space-y-4">
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

        {/* ONGLET : 1RM PREDICTOR */}
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

        {/* ONGLET : CONVERTISSEURS */}
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
              <CardHeader><CardTitle className="flex items-center text-green-600 dark:text-green-400"><Scale className="w-5 h-5 mr-2" /> {txt.nutConv}</CardTitle></CardHeader>
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

        {/* ONGLET : CHRONOMÈTRE PRO */}
        {activeTab === "timer" && (
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-red-500 font-black tracking-widest uppercase">Timer Pro</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className={`text-8xl font-black tabular-nums transition-colors duration-500 ${timerIsRunning ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
                {formatTime(timerTime)}
              </div>
              <div className="flex items-center space-x-4 mt-12 w-full max-w-xs">
                <Button onClick={toggleTimer} className={`flex-1 h-16 text-xl font-black text-white ${timerIsRunning ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-red-500 hover:bg-red-600 shadow-[0_0_30px_rgba(239,68,68,0.4)]'}`}>
                  {timerIsRunning ? <><Pause className="w-6 h-6 mr-2"/> {txt.pause}</> : <><Play className="w-6 h-6 mr-2"/> {txt.start}</>}
                </Button>
                <Button onClick={resetTimer} variant="outline" className="h-16 px-6 border-zinc-300 dark:border-zinc-700 text-zinc-500">
                  <RotateCcw className="w-6 h-6" />
                </Button>
              </div>
              <div className="flex gap-4 mt-8">
                <Button variant="ghost" onClick={() => { setTimerTime(30); setTimerIsRunning(false); }} className="font-bold text-zinc-500">+30s</Button>
                <Button variant="ghost" onClick={() => { setTimerTime(60); setTimerIsRunning(false); }} className="font-bold text-zinc-500">+60s</Button>
                <Button variant="ghost" onClick={() => { setTimerTime(120); setTimerIsRunning(false); }} className="font-bold text-zinc-500">+2min</Button>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
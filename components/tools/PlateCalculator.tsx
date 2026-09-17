"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Info, ArrowRightLeft, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATES } from "@/lib/data/toolsDB";

interface PlateCalculatorProps {
  lang: string;
  onShowInfo: (title: string, desc: string) => void;
}

export default function PlateCalculator({ lang, onShowInfo }: PlateCalculatorProps) {
  const [mode, setMode] = useState<"targetToPlates" | "platesToTarget">("targetToPlates");
  const [targetWeight, setTargetWeight] = useState<string>("");
  const [barWeight, setBarWeight] = useState<string>("20");
  
  // État pour le calcul inversé (nombre de chaque disque par côté)
  const [loadedPlates, setLoadedPlates] = useState<Record<number, number>>({
    25: 0, 20: 0, 15: 0, 10: 0, 5: 0, 2.5: 0, 1.25: 0
  });

  const txt = {
    FR: { title: "Calculateur de Disques", target: "Poids Cible (kg)", bar: "Barre (kg)", eachSide: "À charger par côté :", total: "Total par côté :", noPlates: "Entrez un poids cible supérieur à la barre.", mode1: "Poids cible ➔ Disques", mode2: "Disques ➔ Poids total", loadedTotal: "Poids Total Estimé :" },
    EN: { title: "Plate Calculator", target: "Target Weight (kg)", bar: "Bar (kg)", eachSide: "Load per side:", total: "Total per side:", noPlates: "Enter a target weight greater than the bar.", mode1: "Target ➔ Plates", mode2: "Plates ➔ Total Weight", loadedTotal: "Estimated Total Weight:" }
  }[lang] || { title: "Calculateur de Disques", target: "Poids Cible (kg)", bar: "Barre (kg)", eachSide: "À charger par côté :", total: "Total par côté :", noPlates: "Entrez un poids cible supérieur à la barre.", mode1: "Poids cible ➔ Disques", mode2: "Disques ➔ Poids total", loadedTotal: "Poids Total Estimé :" };

  // Logique : Mode 1 (Target -> Plates)
  const calculatePlates = () => {
    const target = parseFloat(targetWeight);
    const bar = parseFloat(barWeight);
    if (!target || !bar || target <= bar) return [];
    
    let weightPerSide = (target - bar) / 2;
    const platesNeeded = [];
    
    for (const plate of PLATES) {
      if (weightPerSide >= plate.weight) {
        const count = Math.floor(weightPerSide / plate.weight);
        platesNeeded.push({ ...plate, count });
        weightPerSide -= (plate.weight * count);
        weightPerSide = Math.round(weightPerSide * 100) / 100;
      }
    }
    return platesNeeded;
  };

  // Logique : Mode 2 (Plates -> Target)
  const calculateTotalWeight = () => {
    let platesWeight = 0;
    Object.entries(loadedPlates).forEach(([weight, count]) => {
      platesWeight += parseFloat(weight) * count;
    });
    return parseFloat(barWeight || "0") + (platesWeight * 2);
  };

  const requiredPlates = calculatePlates();

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg animate-in fade-in zoom-in-95 relative">
      <button 
        onClick={() => onShowInfo("Calculateur de Disques", lang === 'FR' ? "Décompose un poids cible en disques, ou calcule le poids total en fonction des disques chargés." : "Breaks down a target weight into plates, or calculates total weight based on loaded plates.")} 
        className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-teal-500 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors z-10"
      >
        <Info className="w-4 h-4" />
      </button>

      <CardHeader>
        <CardTitle className="flex items-center text-teal-600 dark:text-teal-400">
          <Target className="w-5 h-5 mr-2" /> {txt.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Toggle Mode */}
        <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
          <button onClick={() => setMode("targetToPlates")} className={`flex-1 py-2 font-bold text-xs rounded-lg transition-colors ${mode === "targetToPlates" ? "bg-white dark:bg-zinc-900 text-teal-600 shadow-sm" : "text-zinc-500"}`}>{txt.mode1}</button>
          <button onClick={() => setMode("platesToTarget")} className={`flex-1 py-2 font-bold text-xs rounded-lg transition-colors ${mode === "platesToTarget" ? "bg-white dark:bg-zinc-900 text-teal-600 shadow-sm" : "text-zinc-500"}`}>{txt.mode2}</button>
        </div>

        {/* Mode 1 : Poids Cible -> Disques */}
        {mode === "targetToPlates" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.target}</Label>
                <Input type="number" placeholder="Ex: 100" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} className="font-black text-2xl h-14 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.bar}</Label>
                <Input type="number" value={barWeight} onChange={(e) => setBarWeight(e.target.value)} className="font-black text-2xl h-14 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500" />
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
              <h4 className="font-black text-sm uppercase tracking-widest text-zinc-400 mb-4">{txt.eachSide}</h4>
              {requiredPlates.length > 0 ? (
                <div className="space-y-8">
                  {/* Visualisation de la barre */}
                  <div className="flex items-center justify-center p-8 bg-zinc-100 dark:bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                    <div className="w-32 h-6 bg-zinc-400 dark:bg-zinc-700 rounded-l-md border-r-2 border-zinc-500 dark:border-zinc-900 shadow-inner"></div>
                    <div className="w-8 h-10 bg-zinc-500 dark:bg-zinc-600 border-r-2 border-zinc-800"></div>
                    <div className="flex items-center">
                      {requiredPlates.flatMap((p, i) => 
                        Array.from({ length: p.count }).map((_, j) => (
                          <div key={`${i}-${j}`} className={`${p.color} ${p.h} ${p.w} rounded-sm border border-black/20 mx-[1px] shadow-md flex items-center justify-center`}></div>
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
                </div>
              ) : (
                <div className="py-8 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 font-medium">
                  {txt.noPlates}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mode 2 : Disques -> Poids Total (Nouveau) */}
        {mode === "platesToTarget" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2 mb-6">
              <Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.bar}</Label>
              <Input type="number" value={barWeight} onChange={(e) => setBarWeight(e.target.value)} className="font-black text-xl h-12 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 w-1/2" />
            </div>
            
            <h4 className="font-black text-sm uppercase tracking-widest text-zinc-400 mb-4">{txt.eachSide}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PLATES.map((plate) => (
                <div key={plate.weight} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center">
                    <div className={`w-3 h-8 rounded-sm mr-3 ${plate.color} border border-black/20 shadow-sm`}></div>
                    <span className="font-black text-lg text-zinc-900 dark:text-zinc-100">{plate.weight} kg</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button onClick={() => setLoadedPlates(prev => ({...prev, [plate.weight]: Math.max(0, prev[plate.weight] - 1)}))} className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"><Minus className="w-4 h-4" /></button>
                    <span className="w-4 text-center font-black text-lg">{loadedPlates[plate.weight]}</span>
                    <button onClick={() => setLoadedPlates(prev => ({...prev, [plate.weight]: prev[plate.weight] + 1}))} className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-teal-50 dark:bg-teal-900/10 p-6 rounded-2xl">
              <span className="font-black text-teal-700 dark:text-teal-400 uppercase tracking-widest">{txt.loadedTotal}</span>
              <span className="text-5xl font-black text-teal-500 tracking-tighter">{calculateTotalWeight()} <span className="text-xl text-zinc-500 tracking-normal">kg</span></span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
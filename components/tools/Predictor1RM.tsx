"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Info } from "lucide-react";
import { ONE_RM_ZONES } from "@/lib/data/toolsDB";

interface Predictor1RMProps {
  lang: string;
  onShowInfo: (title: string, desc: string) => void;
  onZoneClick: (zone: any, weight: number) => void;
}

export default function Predictor1RM({ lang, onShowInfo, onZoneClick }: Predictor1RMProps) {
  const [liftWeight, setLiftWeight] = useState<string>("");
  const [liftReps, setLiftReps] = useState<string>("");
  const [flipped1RM, setFlipped1RM] = useState<number | null>(null);

  const txt = {
    FR: { title: "1RM Estimé", predictor: "1RM & Zones", formula: "Basé sur la formule d'Epley", weightLifted: "Poids soulevé (kg)", repsDone: "Reps réalisées", est1RM: "1RM Estimé", matrix: "Matrice de travail (Barre Olympique)" },
    EN: { title: "Estimated 1RM", predictor: "1RM & Zones", formula: "Based on Epley's formula", weightLifted: "Weight lifted (kg)", repsDone: "Reps performed", est1RM: "Estimated 1RM", matrix: "Working Matrix (Olympic Bar)" }
  }[lang] || { title: "1RM Estimé", predictor: "1RM & Zones", formula: "Basé sur la formule d'Epley", weightLifted: "Poids soulevé (kg)", repsDone: "Reps réalisées", est1RM: "1RM Estimé", matrix: "Matrice de travail (Barre Olympique)" };

  const get1RM = () => {
    const w = parseFloat(liftWeight);
    const r = parseInt(liftReps);
    if (!w || !r || r < 1) return 0;
    if (r === 1) return w;
    return Math.round(w * (1 + r / 30));
  };

  const rm = get1RM();

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg relative animate-in fade-in zoom-in-95">
      <CardHeader>
        <button 
          onClick={() => onShowInfo("1RM & Zones", "")} 
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-indigo-500 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors z-10"
        >
          <Info className="w-4 h-4" />
        </button>
        <CardTitle className="flex items-center text-indigo-600 dark:text-indigo-400">
          <Calculator className="w-5 h-5 mr-2" /> {txt.predictor}
        </CardTitle>
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
          <span className="text-5xl font-black text-indigo-500 tracking-tighter">{rm} <span className="text-xl text-zinc-500 tracking-normal">kg</span></span>
        </div>

        {rm > 0 && (
          <div className="pt-6 mt-4 border-t border-zinc-100 dark:border-zinc-800 animate-in fade-in">
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center justify-between">
              <span>{txt.matrix}</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ONE_RM_ZONES.map(zone => {
                const weight = Math.round((rm * (zone.pct / 100)) / 2.5) * 2.5; 
                let bgColor = "bg-zinc-50 dark:bg-zinc-900";
                let textColor = "text-indigo-600 dark:text-indigo-400";
                let hoverBorder = "hover:border-indigo-500";
                
                if (zone.pct >= 85) { bgColor = "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50"; textColor = "text-red-600 dark:text-red-400"; hoverBorder="hover:border-red-500"; }
                else if (zone.pct >= 70) { bgColor = "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/50"; textColor = "text-green-600 dark:text-green-400"; hoverBorder="hover:border-green-500"; }
                else if (zone.pct >= 50) { bgColor = "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50"; textColor = "text-blue-600 dark:text-blue-400"; hoverBorder="hover:border-blue-500"; }
                
                const isFlipped = flipped1RM === zone.pct;

                return (
                  <button 
                    key={zone.pct} 
                    onClick={() => {
                      setFlipped1RM(isFlipped ? null : zone.pct);
                      // Ouvre la modale complète après un léger délai pour voir le flip
                      setTimeout(() => onZoneClick(zone, weight), 300);
                    }}
                    className={`group ${bgColor} border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 flex flex-col items-center justify-center shadow-sm transition-all cursor-pointer ${hoverBorder} hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950 w-full`}
                    aria-label={`Zone ${zone.pct}%, ${weight} kg`}
                  >
                    <div className="flex items-center space-x-1 mb-1">
                      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{zone.pct}%</span>
                    </div>
                    <span className={`text-lg font-black ${textColor}`}>{weight} kg</span>
                    <span className="text-[9px] font-black uppercase text-zinc-400 mt-1 tracking-widest">{zone.reps} Reps</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
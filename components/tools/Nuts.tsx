"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Nut, Info } from "lucide-react";
import { NUT_DATABASE } from "@/lib/data/nutritionDB";

export default function Nuts({ lang, onShowInfo }: { lang: string, onShowInfo: (t: string, d: string) => void }) {
  const [selectedNut, setSelectedNut] = useState<string>("amandes");
  const [nutHandfuls, setNutHandfuls] = useState<string>("1");

  const currentNut = (NUT_DATABASE as any)[selectedNut];
  const calculateNutMacros = () => {
    const qty = parseFloat(nutHandfuls) || 0;
    const totalGrams = qty * currentNut.gramsPerHandful;
    const ratio = totalGrams / 100;
    return { grams: totalGrams, kcal: Math.round(currentNut.kcalPer100 * ratio), fats: Math.round(currentNut.gFats * ratio), prot: Math.round(currentNut.gProt * ratio) };
  };
  const nutStats = calculateNutMacros();

  const infoText = lang === 'FR' ? "Peser ses noix tous les jours est une corvée. Cet outil utilise des moyennes statistiques cliniques.\n\nUne 'poignée' standard correspond à la quantité que l'on peut tenir dans une main fermée (environ 30g selon la densité de la noix). L'algorithme calcule instantanément les Kcal et la répartition exacte des Lipides/Protéines pour vous faire gagner du temps." : "Weighing nuts daily is a chore. This tool uses clinical statistical averages.";

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg animate-in fade-in zoom-in-95 relative">
      <button onClick={() => onShowInfo("Calculateur d'Oléagineux", infoText)} className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-amber-500 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors z-10 focus:outline-none focus:ring-2 focus:ring-amber-500">
        <Info className="w-4 h-4" />
      </button>
      <CardHeader>
        <CardTitle className="flex items-center text-amber-600 dark:text-amber-500"><Nut className="w-5 h-5 mr-2" /> Calculateur d'Oléagineux</CardTitle>
        <CardDescription>Convertit les 'poignées' en grammes et calories réelles.</CardDescription>
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
          <Label className="font-bold text-zinc-600 dark:text-zinc-400">Nombre de poignées :</Label>
          <div className="flex items-center space-x-4">
            <Input type="number" step="0.5" min="0" placeholder="Ex: 1" value={nutHandfuls} onChange={(e) => setNutHandfuls(e.target.value)} className="font-black text-3xl h-16 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-amber-600 dark:text-amber-500 w-32 text-center" />
            <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Poignées <br/>(Handfuls)</span>
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
          <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-2xl border border-amber-200 dark:border-amber-900/30">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-amber-200 dark:border-amber-800/30">
              <span className="font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest">Poids Réel</span>
              <span className="text-4xl font-black text-amber-600">{nutStats.grams} <span className="text-xl">g</span></span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <span className="block text-xl font-black text-orange-500">{nutStats.kcal}</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Kcal</span>
              </div>
              <div className="border-x border-amber-200 dark:border-amber-800/30">
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
  );
}
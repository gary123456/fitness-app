"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scale, ArrowRightLeft, Info, Apple } from "lucide-react";

export default function Convert({ lang, onShowInfo }: { lang: string, onShowInfo: (t: string, d: string) => void }) {
  const [convKg, setConvKg] = useState<string>("");
  const [convLb, setConvLb] = useState<string>("");
  const [convOz, setConvOz] = useState<string>("");
  const [convGramsOz, setConvGramsOz] = useState<string>("");
  const [convCup, setConvCup] = useState<string>("");
  const [convGramsCup, setConvGramsCup] = useState<string>("");

  const handleKgChange = (val: string) => { setConvKg(val); setConvLb(val ? (parseFloat(val) * 2.20462).toFixed(2) : ""); };
  const handleLbChange = (val: string) => { setConvLb(val); setConvKg(val ? (parseFloat(val) / 2.20462).toFixed(2) : ""); };
  const handleOzChange = (val: string) => { setConvOz(val); setConvGramsOz(val ? (parseFloat(val) * 28.3495).toFixed(0) : ""); };
  const handleGramsOzChange = (val: string) => { setConvGramsOz(val); setConvOz(val ? (parseFloat(val) / 28.3495).toFixed(2) : ""); };
  const handleCupChange = (val: string) => { setConvCup(val); setConvGramsCup(val ? (parseFloat(val) * 240).toFixed(0) : ""); };
  const handleGramsCupChange = (val: string) => { setConvGramsCup(val); setConvCup(val ? (parseFloat(val) / 240).toFixed(2) : ""); };

  const infoText = lang === 'FR' ? "L'outil indispensable pour suivre des recettes ou des programmes sportifs internationaux.\n\n• 1 Kilogramme = 2.20462 Pounds (Lbs)\n• 1 Cup (Tasse US) = 240 ml (ou environ 250g pour des liquides denses)\n• 1 Ounce (Oz) = 28.35 grammes." : "The essential tool for following international recipes or workout programs.\n\n• 1 Kilogram = 2.20462 Pounds (Lbs)\n• 1 US Cup = 240 ml (or approx 250g for dense liquids)\n• 1 Ounce (Oz) = 28.35 grams.";

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95">
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg relative">
        <button onClick={() => onShowInfo("Convertisseur Unités", infoText)} className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-emerald-500 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors z-10 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <Info className="w-4 h-4" />
        </button>
        <CardHeader><CardTitle className="flex items-center text-emerald-600 dark:text-emerald-400"><Scale className="w-5 h-5 mr-2" /> Poids (Sport)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-2">
              <Label className="font-bold text-zinc-600 dark:text-zinc-400">Kilogrammes (kg)</Label>
              <Input type="number" value={convKg} onChange={(e) => handleKgChange(e.target.value)} className="font-black text-2xl h-14 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-center" />
            </div>
            <div className="pt-6"><ArrowRightLeft className="w-6 h-6 text-zinc-400" /></div>
            <div className="flex-1 space-y-2">
              <Label className="font-bold text-zinc-600 dark:text-zinc-400">Pounds (lbs)</Label>
              <Input type="number" value={convLb} onChange={(e) => handleLbChange(e.target.value)} className="font-black text-2xl h-14 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-center text-emerald-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">
        <CardHeader><CardTitle className="flex items-center text-green-600 dark:text-green-400"><Apple className="w-5 h-5 mr-2" /> Nutrition</CardTitle></CardHeader>
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
  );
}
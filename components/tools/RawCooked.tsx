"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Beef, ArrowRightLeft, Info } from "lucide-react";

export default function RawCooked({ lang, onShowInfo }: { lang: string, onShowInfo: (t: string, d: string) => void }) {
  const [foodType, setFoodType] = useState<"meat" | "rice" | "lentils">("meat");
  const [foodWeight, setFoodWeight] = useState<string>("");
  const [isRawInput, setIsRawInput] = useState<boolean>(true);

  const getRawCookedResult = () => {
    const w = parseFloat(foodWeight);
    if (!w) return 0;
    if (foodType === "meat") return isRawInput ? Math.round(w * 0.75) : Math.round(w * 1.33);
    if (foodType === "rice") return isRawInput ? Math.round(w * 3) : Math.round(w / 3);
    if (foodType === "lentils") return isRawInput ? Math.round(w * 2.5) : Math.round(w / 2.5);
    return w;
  };

  const infoText = lang === 'FR' ? "L'erreur n°1 en nutrition est de peser ses aliments cuits en utilisant les macros de l'aliment cru.\n\n• Viande et Poisson perdent de l'eau à la cuisson (jusqu'à 30% de leur poids). 100g de poulet cru pèseront ~75g cuit.\n• Riz et Pâtes absorbent l'eau (x3). 100g cru donneront ~300g cuit.\n• Lentilles gonflent énormément (x2.5).\n\nUtilisez cet outil pour toujours traquer vos repas avec une précision clinique." : "The #1 nutrition mistake is weighing cooked food but tracking raw macros.";

  return (
    <Card className="border-orange-500/30 bg-white dark:bg-zinc-900 shadow-lg relative animate-in fade-in zoom-in-95">
      <button onClick={() => onShowInfo("Ratio Cru / Cuit", infoText)} className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-orange-500 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors z-10 focus:outline-none focus:ring-2 focus:ring-orange-500">
        <Info className="w-4 h-4" />
      </button>
      <CardHeader>
        <CardTitle className="flex items-center text-orange-600 dark:text-orange-400"><Beef className="w-5 h-5 mr-2" /> Ratio Cru / Cuit</CardTitle>
        <CardDescription>Ne faussez plus vos macros à cause de l'eau.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
          <button onClick={() => setFoodType("meat")} className={`flex-1 py-2 font-bold text-xs rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 ${foodType === "meat" ? "bg-white dark:bg-zinc-900 text-orange-600 shadow-sm" : "text-zinc-500"}`}>Viande/Poisson</button>
          <button onClick={() => setFoodType("rice")} className={`flex-1 py-2 font-bold text-xs rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 ${foodType === "rice" ? "bg-white dark:bg-zinc-900 text-orange-600 shadow-sm" : "text-zinc-500"}`}>Riz/Pâtes</button>
          <button onClick={() => setFoodType("lentils")} className={`flex-1 py-2 font-bold text-xs rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 ${foodType === "lentils" ? "bg-white dark:bg-zinc-900 text-orange-600 shadow-sm" : "text-zinc-500"}`}>Légumineuses</button>
        </div>

        <div className="flex items-center justify-between space-x-4">
          <div className={`flex-1 space-y-2 p-4 rounded-xl border-2 transition-colors cursor-pointer ${isRawInput ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' : 'border-zinc-200 dark:border-zinc-800'}`} onClick={() => setIsRawInput(true)}>
            <Label className={`font-black uppercase tracking-widest text-xs cursor-pointer ${isRawInput ? 'text-orange-600' : 'text-zinc-400'}`}>Poids Cru</Label>
            <Input type="number" value={isRawInput ? foodWeight : getRawCookedResult() || ""} onChange={(e) => { setIsRawInput(true); setFoodWeight(e.target.value); }} className={`font-black text-2xl h-14 text-center cursor-pointer ${isRawInput ? 'bg-white dark:bg-zinc-950' : 'bg-transparent border-none focus-visible:ring-0'}`} disabled={!isRawInput} />
          </div>
          
          <ArrowRightLeft className="w-8 h-8 text-zinc-300 dark:text-zinc-700 shrink-0" />
          
          <div className={`flex-1 space-y-2 p-4 rounded-xl border-2 transition-colors cursor-pointer ${!isRawInput ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' : 'border-zinc-200 dark:border-zinc-800'}`} onClick={() => setIsRawInput(false)}>
            <Label className={`font-black uppercase tracking-widest text-xs cursor-pointer ${!isRawInput ? 'text-orange-600' : 'text-zinc-400'}`}>Poids Cuit</Label>
            <Input type="number" value={!isRawInput ? foodWeight : getRawCookedResult() || ""} onChange={(e) => { setIsRawInput(false); setFoodWeight(e.target.value); }} className={`font-black text-2xl h-14 text-center cursor-pointer ${!isRawInput ? 'bg-white dark:bg-zinc-950' : 'bg-transparent border-none focus-visible:ring-0'}`} disabled={isRawInput} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
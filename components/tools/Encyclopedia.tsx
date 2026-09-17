"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Droplet, Thermometer, Plus, Wheat, Sparkles, Activity, ShieldCheck, Dna, Brain, Flame, ArrowRightLeft, Zap, Info, Leaf } from "lucide-react";
import { FATS_DB, SUGARS_DB, SUPERFOODS_DB } from "@/lib/data/nutritionDB";

interface EncyclopediaProps {
  type: "fats" | "sugars" | "superfoods";
  lang: string;
  onShowInfo: (title: string, desc: string) => void;
  onDetailClick: (type: "fat" | "sugar" | "superfood", data: any) => void;
}

// 🛡️ Composant SVG Ultra-léger pour le Donut Chart des lipides
const MacroDonutChart = ({ sat, mono, poly }: { sat: number, mono: number, poly: number }) => {
  const radius = 15.9155; // Rayon magique pour que la circonférence = 100
  return (
    <svg viewBox="0 0 40 40" className="w-12 h-12 -rotate-90">
      <circle cx="20" cy="20" r={radius} fill="transparent" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="4" />
      <circle cx="20" cy="20" r={radius} fill="transparent" stroke="#ef4444" strokeWidth="4" strokeDasharray={`${sat} ${100 - sat}`} strokeDashoffset="0" />
      <circle cx="20" cy="20" r={radius} fill="transparent" stroke="#14b8a6" strokeWidth="4" strokeDasharray={`${mono} ${100 - mono}`} strokeDashoffset={`-${sat}`} />
      <circle cx="20" cy="20" r={radius} fill="transparent" stroke="#3b82f6" strokeWidth="4" strokeDasharray={`${poly} ${100 - poly}`} strokeDashoffset={`-${sat + mono}`} />
    </svg>
  );
};

export default function Encyclopedia({ type, lang, onShowInfo, onDetailClick }: EncyclopediaProps) {
  
  if (type === "fats") {
    return (
      <Card className="border-yellow-500/30 bg-white dark:bg-zinc-900 shadow-lg relative animate-in fade-in zoom-in-95">
        <CardHeader>
          <button 
            onClick={() => onShowInfo("Comparateur Lipides", "")} 
            className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-yellow-500 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors z-10 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <Info className="w-4 h-4" />
          </button>
          <CardTitle className="flex items-center text-yellow-600 dark:text-yellow-400">
            <Droplet className="w-5 h-5 mr-2" /> Encyclopédie Lipides
          </CardTitle>
          <CardDescription>Cliquez sur une huile pour lire son analyse clinique détaillée.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {["Assaisonnement (Cru)", "Polyvalent", "Cuisson Forte"].map((cat) => (
            <div key={cat} className="space-y-4 mb-8">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 pb-2">{cat}</h3>
              {FATS_DB.filter(f => f.cat === cat).map((fat) => {
                let o3Color = "bg-zinc-100 text-zinc-500 dark:bg-zinc-800";
                if (fat.omega3 === "Élevé" || fat.omega3 === "Très Élevé" || fat.omega3 === "Massif") o3Color = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
                else if (fat.omega3 === "Faible") o3Color = "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
                else if (fat.omega3 === "Aucun" || fat.omega3 === "Zéro (Full Oméga-6)") o3Color = "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400";

                return (
                  <button 
                    key={fat.id} 
                    onClick={() => onDetailClick("fat", fat)}
                    className="w-full text-left bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col space-y-4 hover:border-yellow-500 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group relative focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    aria-label={`Détails pour ${fat.name}`}
                  >
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                      <Plus className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 w-full pr-8">
                      <div>
                        <h4 className="font-black text-zinc-900 dark:text-zinc-100 text-base group-hover:text-yellow-600 transition-colors">{fat.name}</h4>
                        <p className="text-xs font-bold text-zinc-500 mt-1 flex items-center">
                          <Thermometer className="w-3 h-3 mr-1 text-red-500" /> Point fumée : <span className="text-zinc-800 dark:text-zinc-300 ml-1">{fat.smoke}°C</span>
                        </p>
                      </div>
                      <div className={`self-start sm:self-auto px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-black/5 dark:border-white/5 shadow-sm flex items-center shrink-0 ${o3Color}`}>
                        🐟 Oméga-3 : {fat.omega3}
                      </div>
                    </div>
                    
                    {/* 🛡️ Remplacement de la barre par le Donut Chart */}
                    <div className="flex items-center space-x-4 w-full bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                      <MacroDonutChart sat={fat.sat} mono={fat.mono} poly={fat.poly} />
                      <div className="flex flex-col w-full">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                          <span className="text-red-500">Sat ({fat.sat}%)</span>
                          <span className="text-teal-500">Mono ({fat.mono}%)</span>
                          <span className="text-blue-500">Poly ({fat.poly}%)</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (type === "sugars") {
    return (
      <Card className="border-pink-500/30 bg-white dark:bg-zinc-900 shadow-lg relative animate-in fade-in zoom-in-95">
        <CardHeader>
          <button onClick={() => onShowInfo("Comparateur Glucides & IG", "")} className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-pink-500 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors z-10 focus:outline-none focus:ring-2 focus:ring-pink-500"><Info className="w-4 h-4" /></button>
          <CardTitle className="flex items-center text-pink-600 dark:text-pink-400"><Wheat className="w-5 h-5 mr-2" /> Encyclopédie Glucides & IG</CardTitle>
          <CardDescription>Cliquez sur un sucre pour lire son analyse clinique détaillée.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {["Naturels & Complets", "Raffinés & Sirops", "Sportifs (Intra-Workout)", "Édulcorants"].map((cat) => (
            <div key={cat} className="space-y-4 mb-8">
              {SUGARS_DB.filter(s => s.cat === cat).length > 0 && <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 pb-2">{cat}</h3>}
              {SUGARS_DB.filter(s => s.cat === cat).map((sugar) => {
                let giColor = "bg-green-500";
                if (sugar.gi > 50) giColor = "bg-yellow-500";
                if (sugar.gi > 60) giColor = "bg-red-500";

                return (
                  <button 
                    key={sugar.id} 
                    onClick={() => onDetailClick("sugar", sugar)}
                    className="w-full text-left bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col space-y-4 hover:border-pink-500 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group relative focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"><Plus className="w-5 h-5 text-pink-500" /></div>
                    <div className="flex justify-between items-center w-full">
                      <h4 className="font-black text-zinc-900 dark:text-zinc-100 text-base pr-4 group-hover:text-pink-600 transition-colors">{sugar.name}</h4>
                      <div className="flex flex-col items-end shrink-0 pr-6 sm:pr-8">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Index Glycémique</span>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="font-black text-lg text-zinc-800 dark:text-zinc-200">{sugar.gi}</span>
                          <div className={`w-3 h-3 rounded-full ${giColor} shadow-sm`}></div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (type === "superfoods") {
    return (
      <Card className="border-emerald-500/30 bg-white dark:bg-zinc-900 shadow-lg relative animate-in fade-in zoom-in-95">
        <CardHeader>
          <button onClick={() => onShowInfo("Encyclopédie Super-Aliments", "")} className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-emerald-500 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors z-10 focus:outline-none focus:ring-2 focus:ring-emerald-500"><Info className="w-4 h-4" /></button>
          <CardTitle className="flex items-center text-emerald-600 dark:text-emerald-400"><Leaf className="w-5 h-5 mr-2" /> Encyclopédie Super-Aliments</CardTitle>
          <CardDescription>Des concentrés biologiques pour hacker votre récupération.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {["Algues & Poudres", "Graines & Noix", "Racines & Épices", "Baies & Fruits"].map((cat) => (
            <div key={cat} className="space-y-4 mb-8">
              {SUPERFOODS_DB.filter(s => s.cat === cat).length > 0 && <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 pb-2">{cat}</h3>}
              {SUPERFOODS_DB.filter(s => s.cat === cat).map((superfood) => {
                let IconComponent = Sparkles;
                if (superfood.icon === "Activity") IconComponent = Activity;
                if (superfood.icon === "Droplet") IconComponent = Droplet;
                if (superfood.icon === "Zap") IconComponent = Zap;
                if (superfood.icon === "ShieldCheck") IconComponent = ShieldCheck;
                if (superfood.icon === "Dna") IconComponent = Dna;
                if (superfood.icon === "Brain") IconComponent = Brain;
                if (superfood.icon === "Flame") IconComponent = Flame;

                return (
                  <button 
                    key={superfood.id} 
                    onClick={() => onDetailClick("superfood", superfood)}
                    className="w-full text-left bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col space-y-4 hover:border-emerald-500 hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer group relative focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"><Plus className="w-5 h-5 text-emerald-500" /></div>
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center pr-4">
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                          <IconComponent className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h4 className="font-black text-zinc-900 dark:text-zinc-100 text-base group-hover:text-emerald-600 transition-colors pr-6">{superfood.name}</h4>
                      </div>
                      <div className="shrink-0 hidden sm:block">
                        <span className="flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                          Voir détails <Plus className="w-3 h-3 ml-1" />
                        </span>
                      </div>
                    </div>
                    <div className="sm:hidden block">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 inline-block">{superfood.highlight}</span>
                    </div>
                    <div className="flex flex-col space-y-1 mt-2">
                      <span className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest">Actifs Principaux</span>
                      <span className="text-xs font-bold text-indigo-500">{superfood.nutrients}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return null;
}
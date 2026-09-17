"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// 🛡️ CORRECTION FINALE : TOUTES LES ICÔNES SONT IMPORTÉES ICI (y compris Wrench, Apple, Leaf, Sparkles, etc.)
import { 
  Target, Calculator, Dna, ShieldCheck, Wind, HeartPulse, Droplets, Droplet, 
  Wheat, Leaf, Beef, Nut, ArrowRightLeft, Timer, ChevronRight, FlaskConical, 
  ArrowLeft, Info, Apple, Wrench, Star, Thermometer, Activity, Sparkles, Utensils 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/useLanguage";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";

// --- Imports des Composants Outils (Vague 1 & 3) ---
import PlateCalculator from "@/components/tools/PlateCalculator";
import Predictor1RM from "@/components/tools/Predictor1RM";
import TimerPro from "@/components/tools/TimerPro";
import Encyclopedia from "@/components/tools/Encyclopedia";
import Convert from "@/components/tools/Convert";
import Nuts from "@/components/tools/Nuts";
import RawCooked from "@/components/tools/RawCooked";

// --- CONFIGURATION DU DASHBOARD (Favoris et Rendu) ---
const TOOLS_CONFIG = [
  { id: "predict", title: "1RM & Zones", subtitle: "Calculez votre répétition maximale et vos zones d'hypertrophie.", icon: <Calculator className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />, colorClass: "text-indigo-600 dark:text-indigo-400", bgColorClass: "bg-indigo-50 dark:bg-indigo-900/30", infoTitle: "1RM & Zones", category: "Force & Puissance" },
  { id: "plates", title: "Calculateur de Disques", subtitle: "Dites-lui le poids, il vous dit quoi mettre sur la barre.", icon: <Target className="w-6 h-6 text-teal-600 dark:text-teal-400" />, colorClass: "text-teal-600 dark:text-teal-400", bgColorClass: "bg-teal-50 dark:bg-teal-900/30", infoTitle: "Calculateur de Disques", category: "Force & Puissance" },
  { id: "ffmi", title: "Indice FFMI", subtitle: "Calculez votre limite génétique musculaire naturelle.", icon: <Dna className="w-6 h-6 text-fuchsia-600 dark:text-fuchsia-400" />, colorClass: "text-fuchsia-600 dark:text-fuchsia-400", bgColorClass: "bg-fuchsia-50 dark:bg-fuchsia-900/30", infoTitle: "Indice FFMI (Masse Maigre)", category: "Force & Puissance" },
  { id: "elite", title: "Score DOTS", subtitle: "Comparez votre force absolue avec les standards de Powerlifting.", icon: <ShieldCheck className="w-6 h-6 text-red-600 dark:text-red-400" />, colorClass: "text-red-600 dark:text-red-400", bgColorClass: "bg-red-50 dark:bg-red-900/30", infoTitle: "Score DOTS", category: "Force & Puissance" },
  { id: "vo2", title: "Test VO2 Max", subtitle: "Évaluez votre capacité aérobie via le test de Cooper.", icon: <Wind className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />, colorClass: "text-cyan-600 dark:text-cyan-400", bgColorClass: "bg-cyan-50 dark:bg-cyan-900/30", infoTitle: "Test VO2 Max (Cooper)", category: "Cardio & Santé" },
  { id: "harvard", title: "Test de Harvard", subtitle: "Testez la vitesse de récupération de votre rythme cardiaque.", icon: <HeartPulse className="w-6 h-6 text-rose-600 dark:text-rose-400" />, colorClass: "text-rose-600 dark:text-rose-400", bgColorClass: "bg-rose-50 dark:bg-rose-900/30", infoTitle: "Test de Harvard (Récupération)", category: "Cardio & Santé" },
  { id: "sweat", title: "Taux de Sudation", subtitle: "Protocole clinique pour optimiser votre hydratation.", icon: <Droplets className="w-6 h-6 text-blue-600 dark:text-blue-400" />, colorClass: "text-blue-600 dark:text-blue-400", bgColorClass: "bg-blue-50 dark:bg-blue-900/30", infoTitle: "Taux de Sudation", category: "Cardio & Santé" },
  { id: "fats", title: "Encyclopédie Lipides", subtitle: "Sat., Insat., Oméga-3 et point de fumée des huiles.", icon: <Droplet className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />, colorClass: "text-yellow-600 dark:text-yellow-400", bgColorClass: "bg-yellow-50 dark:bg-yellow-900/30", infoTitle: "Comparateur Lipides", category: "Nutrition Clinique" },
  { id: "sugars", title: "Encyclopédie Glucides", subtitle: "Index glycémique et nutriments des sucres et sirops.", icon: <Wheat className="w-6 h-6 text-pink-600 dark:text-pink-400" />, colorClass: "text-pink-600 dark:text-pink-400", bgColorClass: "bg-pink-50 dark:bg-pink-900/30", infoTitle: "Comparateur Glucides & IG", category: "Nutrition Clinique" },
  { id: "superfoods", title: "Super-Aliments", subtitle: "Les secrets biologiques pour booster votre récupération.", icon: <Leaf className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />, colorClass: "text-emerald-600 dark:text-emerald-400", bgColorClass: "bg-emerald-50 dark:bg-emerald-900/30", infoTitle: "Encyclopédie Super-Aliments", category: "Nutrition Clinique" },
  { id: "rawcooked", title: "Ratio Cru / Cuit", subtitle: "La correction essentielle pour ne plus fausser vos macros.", icon: <Beef className="w-6 h-6 text-orange-600 dark:text-orange-400" />, colorClass: "text-orange-600 dark:text-orange-400", bgColorClass: "bg-orange-50 dark:bg-orange-900/30", infoTitle: "Ratio Cru / Cuit", category: "Nutrition Clinique" },
  { id: "nuts", title: "Calculateur Oléagineux", subtitle: "Fini de peser : 1 poignée d'amandes = macros exactes.", icon: <Nut className="w-6 h-6 text-amber-600 dark:text-amber-400" />, colorClass: "text-amber-600 dark:text-amber-400", bgColorClass: "bg-amber-50 dark:bg-amber-900/30", infoTitle: "Calculateur d'Oléagineux", category: "Nutrition Clinique" },
  { id: "convert", title: "Convertisseur Unités", subtitle: "Kilos en Pounds, Cups en Grammes, Oz en ml.", icon: <ArrowRightLeft className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />, colorClass: "text-emerald-600 dark:text-emerald-400", bgColorClass: "bg-emerald-50 dark:bg-emerald-900/30", infoTitle: "Convertisseur Unités", category: "Utilitaires Sportifs" },
  { id: "timer", title: "Chronomètre Pro", subtitle: "Minuteur classique et HIIT (Mode OLED intégré).", icon: <Timer className="w-6 h-6 text-slate-600 dark:text-slate-400" />, colorClass: "text-slate-600 dark:text-slate-400", bgColorClass: "bg-slate-50 dark:bg-slate-900/30", infoTitle: "Chronomètre Pro", category: "Utilitaires Sportifs" }
];

export default function ToolsPage() {
  const { lang } = useLanguage();
  
  // --- ÉTATS GLOBAUX ---
  const [activeTool, setActiveTool] = useState<string>("hub");
  const [oledMode, setOledMode] = useState(false);
  const [isImperial, setIsImperial] = useLocalStorage("vivex-imperial-mode", false);
  const [favorites, setFavorites] = useLocalStorage<string[]>("vivex-tools-favs", []);
  
  // --- MODALES ---
  const [infoModal, setInfoModal] = useState<{show: boolean, title: string, desc: string} | null>(null);
  const [detailModal, setDetailModal] = useState<{show: boolean, type: "fat"|"sugar"|"zone"|"superfood", data: any} | null>(null);

  // --- ÉTATS POUR LES OUTILS NON ENCORE EXTRAITS (VAGUE 2) ---
  const [dotsGender, setDotsGender] = useState<"homme" | "femme">("homme");
  const [dotsBw, setDotsBw] = useState<string>("");
  const [dotsTotal, setDotsTotal] = useState<string>("");

  const [ffmiWeight, setFfmiWeight] = useState<string>("");
  const [ffmiHeight, setFfmiHeight] = useState<string>("");
  const [ffmiBf, setFfmiBf] = useState<string>("");

  const [vo2Dist, setVo2Dist] = useState<string>("");

  const [harvardDur, setHarvardDur] = useState<string>("300");
  const [harvardP1, setHarvardP1] = useState<string>("");
  const [harvardP2, setHarvardP2] = useState<string>("");
  const [harvardP3, setHarvardP3] = useState<string>("");

  const [weightBefore, setWeightBefore] = useState<string>("");
  const [weightAfter, setWeightAfter] = useState<string>("");
  const [fluidDrank, setFluidDrank] = useState<string>("");
  const [workoutDur, setWorkoutDur] = useState<string>("");

  const t = {
    FR: { 
      title: "Dictionnaire Métabolique", sub: "L'arsenal technologique pour athlètes exigeants.", 
      back: "Retour", understood: "Compris", close: "Fermer", 
      sweatTitle: "Taux de Sudation", sweatSub: "Protocole hydrique de récupération.", 
      wBefore: "Poids avant (kg)", wAfter: "Poids après (kg)", fluid: "Liquide bu (ml)", dur: "Durée (min)", 
      sweatRate: "Perte de sueur", sweatRec: "Buvez cette quantité par heure d'effort." 
    },
    EN: { 
      title: "Metabolic Dictionary", sub: "The technological arsenal for demanding athletes.", 
      back: "Back", understood: "Got it", close: "Close", 
      sweatTitle: "Sweat Rate", sweatSub: "Hydration recovery protocol.", 
      wBefore: "Weight before (kg)", wAfter: "Weight after (kg)", fluid: "Fluid drank (ml)", dur: "Duration (min)", 
      sweatRate: "Sweat Loss", sweatRec: "Drink this amount per hour." 
    }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

  // --- FONCTIONS CLINIQUES (VAGUE 2) ---
  const calculateDots = () => {
    const bw = parseFloat(dotsBw); const total = parseFloat(dotsTotal);
    if (!bw || !total || bw <= 0) return 0;
    let coeff = dotsGender === "homme" 
      ? 500 / (-307.75076 + 24.0900756 * bw - 0.1918759221 * Math.pow(bw, 2) + 0.0007391293 * Math.pow(bw, 3) - 0.000001093 * Math.pow(bw, 4)) 
      : 500 / (-57.96288 + 13.6175032 * bw - 0.1126655495 * Math.pow(bw, 2) + 0.0005158568 * Math.pow(bw, 3) - 0.00000107 * Math.pow(bw, 4));
    return Math.round(total * coeff * 100) / 100;
  };

  const calculateFFMI = () => {
    const w = parseFloat(ffmiWeight); const h = parseFloat(ffmiHeight) / 100; const bf = parseFloat(ffmiBf);
    if (!w || !h || !bf || h <= 0) return { ffmi: 0, normalized: 0 };
    const leanWeight = w * (1 - (bf / 100));
    const ffmi = leanWeight / (h * h);
    return { ffmi: Math.round(ffmi * 10) / 10, normalized: Math.round((ffmi + 6.1 * (1.8 - h)) * 10) / 10 };
  };

  const getVo2Max = () => {
    const dist = parseFloat(vo2Dist);
    if (!dist || dist <= 500) return 0;
    return Math.round(((dist - 504.9) / 44.73) * 10) / 10;
  };

  const getHarvardScore = () => {
    const dur = parseFloat(harvardDur); const p1 = parseFloat(harvardP1); const p2 = parseFloat(harvardP2); const p3 = parseFloat(harvardP3);
    if (!dur || !p1 || !p2 || !p3) return 0;
    return Math.round((dur * 100) / (2 * (p1 + p2 + p3)));
  };

  const getSweatRate = () => {
    const w1 = parseFloat(weightBefore); const w2 = parseFloat(weightAfter); const f = parseFloat(fluidDrank) || 0; const d = parseFloat(workoutDur);
    if (!w1 || !w2 || !d || w1 <= w2) return 0;
    return Math.round((((w1 - w2) * 1000) + f) / (d / 60));
  };

  // --- GESTIONNAIRES DE LOGIQUE ---
  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      if (prev.includes(id)) return prev.filter(fav => fav !== id);
      if (prev.length >= 3) return [...prev.slice(1), id]; 
      return [...prev, id];
    });
  };

  const handleShowInfo = (title: string, desc: string) => {
    let content = desc;
    if (!content) {
      if (title.includes("1RM")) content = lang === 'FR' ? "Le 1RM (Répétition Maximale) est le poids maximum absolu que vous pouvez soulever sur une seule répétition parfaite.\n\n🔥 ZONES DE TRAVAIL :\n• 85% à 100% (Rouge) : Force pure. Taxe le SNC.\n• 65% à 85% (Vert) : Hypertrophie (Sweet Spot).\n• 50% à 65% (Bleu) : Endurance / Afflux sanguin." : "The 1RM (One Rep Max) is the absolute maximum weight you can lift for a single perfect repetition.";
      else if (title.includes("Disques")) content = lang === 'FR' ? "Cet outil décompose n'importe quel poids cible en disques olympiques standards. Utilisez le bouton 'Inverser' pour calculer le poids total des disques chargés." : "Breaks down any target weight into standard Olympic plates.";
      else if (title.includes("DOTS")) content = lang === 'FR' ? "Le Score DOTS est la formule mathématique officielle utilisée en Powerlifting depuis 2020. Elle permet de comparer la force relative entre différents gabarits." : "The DOTS Score is the official mathematical formula used in Powerlifting to compare relative strength.";
      else if (title.includes("FFMI")) content = lang === 'FR' ? "Le FFMI (Indice de Masse Maigre) est l'étalon d'or en bodybuilding pour déterminer la limite génétique naturelle d'un athlète (généralement autour de 25)." : "The FFMI (Fat-Free Mass Index) is the gold standard in bodybuilding to determine a natural athlete's genetic limit.";
      else if (title.includes("Sudation")) content = lang === 'FR' ? "Protocole clinique : pesez-vous nu avant et après l'effort, notez l'eau bue et la durée. Le résultat vous donne votre perte en eau exacte par heure pour optimiser l'hydratation intra-workout." : "Clinical protocol to determine exactly how many milliliters of water your body loses per hour.";
      else if (title.includes("VO2 Max")) content = lang === 'FR' ? "Le test de Cooper est un test standardisé. Protocole : Courez la plus grande distance possible en exactement 12 minutes." : "The Cooper test is a standardized test to evaluate cardiovascular fitness (VO2 Max).";
      else if (title.includes("Harvard")) content = lang === 'FR' ? "Test de récupération cardio. Montez/descendez d'une marche (45cm) à 30 pas/min pendant 5 minutes. Asseyez-vous et prenez votre pouls à 1, 2 et 3 minutes de repos." : "The Harvard Step Test measures your heart's ability to recover after exercise.";
      else if (title.includes("Ratio Cru")) content = lang === 'FR' ? "L'erreur n°1 en nutrition est de peser ses aliments cuits en utilisant les macros de l'aliment cru. La viande perd de l'eau, le riz en absorbe. Cet outil corrige cela." : "The #1 nutrition mistake is weighing cooked food but tracking raw macros.";
      else if (title.includes("Lipides")) content = lang === 'FR' ? "Toutes les graisses ne se valent pas. Les Saturées sont stables à la chaleur. Les Insaturées sont riches en Oméga-3. Attention au point de fumée qui rend l'huile toxique !" : "Not all fats are created equal. Pay attention to the smoke point to avoid toxicity.";
      else if (title.includes("Glucides")) content = lang === 'FR' ? "L'Index Glycémique (IG) mesure la vitesse à laquelle un glucide fait monter l'insuline. Privilégiez les IG bas pour une énergie stable, sauf en Intra-workout." : "The Glycemic Index (GI) measures how quickly a carb raises your blood sugar.";
      else if (title.includes("Super-Aliments")) content = lang === 'FR' ? "Des concentrés biologiques (Spiruline, Cacao cru, Curcuma) pour hacker votre récupération, réduire l'inflammation et booster le Système Nerveux Central." : "Biological concentrates to hack your recovery and boost the CNS.";
      else if (title.includes("Oléagineux")) content = lang === 'FR' ? "Peser ses noix est une corvée. Une 'poignée' standard correspond à la quantité dans une main fermée (~30g). L'outil vous donne les macros directes." : "Weighing nuts is a chore. This tool uses clinical statistical averages for a standard handful.";
      else if (title.includes("Unités")) content = lang === 'FR' ? "Convertisseur d'unités impériales (Lbs, Oz, Cups) en système métrique (Kg, g, ml)." : "Converter for imperial units to metric.";
      else if (title.includes("Chronomètre")) content = lang === 'FR' ? "Un double chronomètre pensé pour la performance. Mode Classique ou HIIT. Utilisez le mode OLED (Lune) pour éteindre l'écran et sauver la batterie." : "A dual timer built for performance. Use OLED mode to save battery.";
      else content = "Informations détaillées en cours de rédaction.";
    }
    setInfoModal({ show: true, title, desc: content });
  };

  const handleDetailClick = (type: "fat" | "sugar" | "zone" | "superfood", data: any) => {
    setDetailModal({ show: true, type, data });
  };

  // --- COMPOSANT BENTO CARD (Avec Favoris) ---
  const renderBentoCard = (tool: any) => {
    const isFav = favorites.includes(tool.id);
    
    return (
      <div key={tool.id} className="relative group w-full h-full">
        {/* 🛡️ Bouton Favoris (Étoile) */}
        <div className="absolute top-3 left-3 z-10 transition-transform">
          <button 
            onClick={(e) => toggleFavorite(e, tool.id)} 
            className="p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title="Ajouter aux Favoris (Max 3)"
            aria-label="Toggle Favori"
          >
            <Star className={`w-4 h-4 transition-colors ${isFav ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-300 dark:text-zinc-700 hover:text-yellow-400'}`} />
          </button>
        </div>

        {/* 🛡️ Bouton Info (i) */}
        <div className="absolute top-3 right-3 z-10 hover:scale-110 transition-transform">
          <button 
            onClick={(e) => { e.stopPropagation(); handleShowInfo(tool.infoTitle, ""); }} 
            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800/80 rounded-full transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
            aria-label="Information"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        
        {/* 🛡️ Bouton Carte Principal */}
        <button 
          onClick={() => setActiveTool(tool.id)} 
          className={`w-full h-full text-left overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-2 ring-opacity-50 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 ${tool.colorClass.replace('text', 'ring')} focus:outline-none focus:ring-4`}
        >
          <div className="p-6 pt-10 flex flex-col items-center sm:items-start text-center sm:text-left h-full relative">
            <div className={`p-3 rounded-2xl mb-4 transition-transform group-hover:scale-110 ${tool.bgColorClass}`}>
              {tool.icon}
            </div>
            <h3 className={`font-black text-lg mb-1 ${tool.colorClass}`}>{tool.title}</h3>
            <p className="text-xs font-medium text-zinc-500 leading-relaxed">{tool.subtitle}</p>
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
              <ChevronRight className={`w-5 h-5 ${tool.colorClass}`} />
            </div>
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className={`flex-1 min-h-screen transition-colors duration-500 pb-24 ${oledMode && activeTool === 'timer' ? 'bg-black' : 'bg-zinc-50 dark:bg-zinc-950'}`}>
      
      {/* 🛡️ HEADER DYNAMIQUE & TOGGLE LBS/KG */}
      {!oledMode && (
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 px-4 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center">
            {activeTool !== "hub" ? (
              <>
                <button onClick={() => setActiveTool("hub")} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors mr-3 focus:outline-none focus:ring-2 focus:ring-zinc-500" aria-label={txt.back}>
                  <ArrowLeft className="w-5 h-5 dark:text-zinc-100" />
                </button>
                <h2 className="text-lg font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-100 hidden sm:block">{txt.title}</h2>
              </>
            ) : (
              <>
                <FlaskConical className="w-6 h-6 mr-3 text-teal-500" />
                <div>
                  <h2 className="text-xl font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">{txt.title}</h2>
                  <p className="text-[10px] font-bold text-zinc-500 hidden sm:block">{txt.sub}</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-full">
            <button 
              onClick={() => setIsImperial(false)} 
              className={`px-3 py-1 text-xs font-black rounded-full transition-all ${!isImperial ? 'bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              KG
            </button>
            <button 
              onClick={() => setIsImperial(true)} 
              className={`px-3 py-1 text-xs font-black rounded-full transition-all ${isImperial ? 'bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              LBS
            </button>
          </div>
        </div>
      )}

      <div className={`p-4 md:p-8 max-w-6xl mx-auto w-full ${oledMode ? 'p-0 h-screen w-screen fixed inset-0 z-[9999]' : 'animate-in fade-in slide-in-from-bottom-4 duration-500'}`}>
        
        {/* 🛡️ LE HUB BENTO GRID PREMIUM */}
        {activeTool === "hub" && (
          <div className="space-y-10">
            
            {/* 🛡️ NOUVEAU : SECTION FAVORIS */}
            {favorites.length > 0 && (
              <div className="bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-200/50 dark:border-yellow-900/30 p-4 md:p-6 rounded-3xl">
                <h3 className="text-sm font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-widest mb-4 flex items-center">
                  <Star className="w-4 h-4 mr-2 fill-yellow-500" /> Accès Rapide
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {TOOLS_CONFIG.filter(t => favorites.includes(t.id)).map(renderBentoCard)}
                </div>
              </div>
            )}

            {/* BOUCLE DYNAMIQUE SUR LES CATÉGORIES */}
            {[
              { cat: "Force & Puissance", icon: Target },
              { cat: "Cardio & Santé", icon: HeartPulse },
              { cat: "Nutrition Clinique", icon: Apple },
              { cat: "Utilitaires Sportifs", icon: Wrench },
            ].map((category) => (
              <div key={category.cat}>
                <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center">
                  <category.icon className="w-4 h-4 mr-2" /> {category.cat}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {TOOLS_CONFIG.filter(t => t.category === category.cat).map(renderBentoCard)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- COMPOSANTS EXTERNALISÉS (VAGUE 1 & 3) --- */}
        {activeTool === "plates" && <PlateCalculator lang={lang} onShowInfo={handleShowInfo} />}
        {activeTool === "predict" && <Predictor1RM lang={lang} onShowInfo={handleShowInfo} onZoneClick={handleDetailClick} />}
        {activeTool === "timer" && <TimerPro lang={lang} onShowInfo={handleShowInfo} oledMode={oledMode} setOledMode={setOledMode} />}
        {activeTool === "convert" && <Convert lang={lang} onShowInfo={handleShowInfo} />}
        {activeTool === "nuts" && <Nuts lang={lang} onShowInfo={handleShowInfo} />}
        {activeTool === "rawcooked" && <RawCooked lang={lang} onShowInfo={handleShowInfo} />}
        
        {/* Encyclopédies */}
        {activeTool === "fats" && <Encyclopedia type="fats" lang={lang} onShowInfo={handleShowInfo} onDetailClick={handleDetailClick} />}
        {activeTool === "sugars" && <Encyclopedia type="sugars" lang={lang} onShowInfo={handleShowInfo} onDetailClick={handleDetailClick} />}
        {activeTool === "superfoods" && <Encyclopedia type="superfoods" lang={lang} onShowInfo={handleShowInfo} onDetailClick={handleDetailClick} />}

        {/* --- COMPOSANTS INLINES NON ENCORE EXTRAITS (VAGUE 2) --- */}
        {activeTool === "ffmi" && (
          <Card className="border-fuchsia-500/30 bg-white dark:bg-zinc-900 shadow-lg relative animate-in fade-in zoom-in-95">
            <CardHeader>
              <CardTitle className="flex items-center text-fuchsia-600 dark:text-fuchsia-400"><Dna className="w-5 h-5 mr-2" /> Indice FFMI</CardTitle>
              <CardDescription>Déterminez votre limite génétique musculaire naturelle.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-zinc-600 dark:text-zinc-400">Poids (kg)</Label>
                  <Input type="number" step="0.1" placeholder="Ex: 85" value={ffmiWeight} onChange={(e) => setFfmiWeight(e.target.value)} className="font-black text-xl h-12 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-zinc-600 dark:text-zinc-400">Taille (cm)</Label>
                  <Input type="number" step="1" placeholder="Ex: 180" value={ffmiHeight} onChange={(e) => setFfmiHeight(e.target.value)} className="font-black text-xl h-12 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-zinc-600 dark:text-zinc-400">BodyFat (%)</Label>
                  <Input type="number" step="0.1" placeholder="Ex: 15" value={ffmiBf} onChange={(e) => setFfmiBf(e.target.value)} className="font-black text-xl h-12 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-fuchsia-500" />
                </div>
              </div>
              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex flex-col items-center justify-center bg-fuchsia-50 dark:bg-fuchsia-900/10 p-6 rounded-2xl text-center">
                <span className="font-black text-fuchsia-700 dark:text-fuchsia-400 uppercase tracking-widest mb-2">Votre FFMI (Ajusté)</span>
                <div className="text-6xl font-black text-fuchsia-500">{calculateFFMI().normalized || 0}</div>
                {calculateFFMI().normalized > 0 && (
                  <p className={`text-sm font-black uppercase tracking-widest mt-4 px-4 py-1 rounded-full ${calculateFFMI().normalized > 25 ? 'bg-red-500 text-white' : calculateFFMI().normalized >= 23 ? 'bg-indigo-500 text-white' : calculateFFMI().normalized >= 21 ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
                    {calculateFFMI().normalized > 25 ? 'Suspect (Hors Limite)' : calculateFFMI().normalized >= 23 ? 'Excellent (Élite Naturel)' : calculateFFMI().normalized >= 21 ? 'Très Bon' : 'Moyen'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTool === "elite" && (
          <Card className="border-red-500/30 bg-white dark:bg-zinc-900 shadow-lg relative animate-in fade-in zoom-in-95">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600 dark:text-red-400"><Target className="w-5 h-5 mr-2" /> Score DOTS (Powerlifting)</CardTitle>
              <CardDescription>Le standard mondial pour comparer la force relative.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
                <button onClick={() => setDotsGender("homme")} className={`flex-1 py-2 font-bold text-sm rounded-lg transition-colors ${dotsGender === "homme" ? "bg-white dark:bg-zinc-900 text-red-600 shadow-sm" : "text-zinc-500"}`}>Homme</button>
                <button onClick={() => setDotsGender("femme")} className={`flex-1 py-2 font-bold text-sm rounded-lg transition-colors ${dotsGender === "femme" ? "bg-white dark:bg-zinc-900 text-red-600 shadow-sm" : "text-zinc-500"}`}>Femme</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-zinc-600 dark:text-zinc-400">Poids de corps (kg)</Label>
                  <Input type="number" step="0.1" placeholder="Ex: 75" value={dotsBw} onChange={(e) => setDotsBw(e.target.value)} className="font-black text-xl h-12 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-zinc-600 dark:text-zinc-400">Total SBD (kg)</Label>
                  <Input type="number" step="1" placeholder="Ex: 450" value={dotsTotal} onChange={(e) => setDotsTotal(e.target.value)} className="font-black text-xl h-12 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-red-500" />
                </div>
              </div>
              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/10 p-6 rounded-2xl text-center">
                <span className="font-black text-red-700 dark:text-red-400 uppercase tracking-widest mb-2">Score de Force Relative</span>
                <div className="text-6xl font-black text-red-500">{calculateDots() || 0}</div>
                <p className="text-xs font-bold text-zinc-500 mt-4">Un score {'>'} 400 est considéré comme exceptionnel.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTool === "vo2" && (
          <Card className="border-cyan-500/30 bg-white dark:bg-zinc-900 shadow-lg relative animate-in fade-in zoom-in-95">
            <CardHeader>
              <CardTitle className="flex items-center text-cyan-600 dark:text-cyan-400"><Wind className="w-5 h-5 mr-2" /> Test VO2 Max (Cooper)</CardTitle>
              <CardDescription>Courez le plus loin possible en 12 minutes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="font-bold text-zinc-600 dark:text-zinc-400">Distance parcourue (en Mètres)</Label>
                <Input type="number" placeholder="Ex: 2400" value={vo2Dist} onChange={(e) => setVo2Dist(e.target.value)} className="font-black text-2xl h-14 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" />
              </div>
              
              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex flex-col items-center justify-center bg-cyan-50 dark:bg-cyan-900/10 p-6 rounded-2xl text-center">
                <span className="font-black text-cyan-700 dark:text-cyan-400 uppercase tracking-widest mb-2">Votre VO2 Max</span>
                <div className="text-6xl font-black text-cyan-500">{getVo2Max()} <span className="text-xl text-zinc-500">ml/kg/min</span></div>
                {getVo2Max() > 0 && (
                  <p className={`text-sm font-black uppercase tracking-widest mt-4 px-4 py-1 rounded-full ${getVo2Max() >= 55 ? 'bg-indigo-500 text-white' : getVo2Max() >= 45 ? 'bg-green-500 text-white' : getVo2Max() >= 35 ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'}`}>
                    {getVo2Max() >= 55 ? 'Athlète / Excellent' : getVo2Max() >= 45 ? 'Bonne condition' : getVo2Max() >= 35 ? 'Moyen' : 'Condition Faible'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTool === "harvard" && (
          <Card className="border-rose-500/30 bg-white dark:bg-zinc-900 shadow-lg relative animate-in fade-in zoom-in-95">
            <CardHeader>
              <CardTitle className="flex items-center text-rose-600 dark:text-rose-400"><HeartPulse className="w-5 h-5 mr-2" /> Test de Harvard (Step)</CardTitle>
              <CardDescription>Évaluez la récupération de votre cœur après 5 min d'effort.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="font-bold text-zinc-600 dark:text-zinc-400">Durée réelle de l'effort (Secondes)</Label>
                <Input type="number" placeholder="Max: 300" max="300" value={harvardDur} onChange={(e) => setHarvardDur(e.target.value)} className="font-black text-2xl h-14 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-zinc-600 dark:text-zinc-400 text-[10px] uppercase">Pouls (1 min)</Label>
                  <Input type="number" placeholder="P1" value={harvardP1} onChange={(e) => setHarvardP1(e.target.value)} className="font-black text-lg h-12 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-center" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-zinc-600 dark:text-zinc-400 text-[10px] uppercase">Pouls (2 min)</Label>
                  <Input type="number" placeholder="P2" value={harvardP2} onChange={(e) => setHarvardP2(e.target.value)} className="font-black text-lg h-12 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-center" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-zinc-600 dark:text-zinc-400 text-[10px] uppercase">Pouls (3 min)</Label>
                  <Input type="number" placeholder="P3" value={harvardP3} onChange={(e) => setHarvardP3(e.target.value)} className="font-black text-lg h-12 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-center" />
                </div>
              </div>
              
              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex flex-col items-center justify-center bg-rose-50 dark:bg-rose-900/10 p-6 rounded-2xl text-center">
                <span className="font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest mb-2">Indice de Forme</span>
                <div className="text-6xl font-black text-rose-500">{getHarvardScore()}</div>
                {getHarvardScore() > 0 && (
                  <p className={`text-sm font-black uppercase tracking-widest mt-4 px-4 py-1 rounded-full ${getHarvardScore() >= 80 ? 'bg-indigo-500 text-white' : getHarvardScore() >= 65 ? 'bg-green-500 text-white' : getHarvardScore() >= 55 ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'}`}>
                    {getHarvardScore() >= 90 ? 'Élite' : getHarvardScore() >= 80 ? 'Très Bon' : getHarvardScore() >= 65 ? 'Bon' : getHarvardScore() >= 55 ? 'Moyen' : 'Faible'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTool === "sweat" && (
          <Card className="border-fuchsia-500/30 bg-white dark:bg-zinc-900 shadow-lg relative animate-in fade-in zoom-in-95">
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
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
              {infoModal?.desc}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setInfoModal(null)} className="w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold focus:ring-4 focus:ring-indigo-500/50">
              {txt.understood}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🛡️ MODALE DÉTAILLÉE (Celle qui affiche les données des Lipides, Sucres, Zones, Superaliments) */}
      <Dialog open={detailModal !== null} onOpenChange={(open) => !open && setDetailModal(null)}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-2xl">
          
          {detailModal?.type === "fat" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-yellow-600 dark:text-yellow-500 flex items-center">
                  <Droplet className="w-5 h-5 mr-2" /> {detailModal.data.name}
                </DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="flex items-center space-x-2 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                  <Thermometer className="w-5 h-5 text-red-500" />
                  <div>
                    <span className="block text-[10px] font-black uppercase text-red-600 dark:text-red-400">Point de fumée</span>
                    <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{detailModal.data.smoke}°C</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Analyse Clinique</span>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    {detailModal.data.desc}
                  </p>
                </div>
                <div className="space-y-1 pt-2">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Alternative Saine</span>
                  <p className="text-sm font-bold text-indigo-500 flex items-center">
                    <ArrowRightLeft className="w-4 h-4 mr-2" /> {detailModal.data.alternatives}
                  </p>
                </div>
              </div>
            </>
          )}

          {detailModal?.type === "sugar" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-pink-600 dark:text-pink-500 flex items-center">
                  <Wheat className="w-5 h-5 mr-2" /> {detailModal.data.name}
                </DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-zinc-400">Index Glycémique</span>
                    <span className={`text-xl font-black ${detailModal.data.gi > 60 ? 'text-red-500' : detailModal.data.gi > 40 ? 'text-yellow-500' : 'text-green-500'}`}>
                      {detailModal.data.gi}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-black uppercase text-zinc-400">Calories (100g)</span>
                    <span className="text-xl font-black text-zinc-900 dark:text-zinc-100">{detailModal.data.kcal}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Analyse Clinique</span>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    {detailModal.data.note}
                  </p>
                </div>
                <div className="space-y-1 pt-2">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Micro-Nutriments</span>
                  <p className="text-sm font-bold text-indigo-500 flex items-center">
                    <Activity className="w-4 h-4 mr-2" /> {detailModal.data.nutrients}
                  </p>
                </div>
              </div>
            </>
          )}

          {detailModal?.type === "zone" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-indigo-600 dark:text-indigo-400 flex items-center">
                  <Target className="w-5 h-5 mr-2" /> {detailModal.data.title}
                </DialogTitle>
              </DialogHeader>
              <div className="py-6 space-y-6 text-center flex flex-col items-center">
                <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-full w-32 h-32 flex flex-col items-center justify-center shadow-inner">
                  <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">{detailModal.data.pct}%</span>
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Du 1RM</span>
                </div>
                <div className="space-y-2">
                  <h4 className="font-black text-lg text-indigo-500">{detailModal.data.weight} kg</h4>
                  <p className="text-sm font-black uppercase tracking-widest text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-4 py-1.5 rounded-full inline-block">
                    Objectif : {detailModal.data.reps} Répétitions
                  </p>
                </div>
                <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 text-left">
                  {detailModal.data.desc}
                </div>
              </div>
            </>
          )}

          {detailModal?.type === "superfood" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-emerald-600 dark:text-emerald-400 flex items-center">
                  <Leaf className="w-5 h-5 mr-2" /> {detailModal.data.name}
                </DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  <div>
                    <span className="block text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Super-Pouvoir Biomécanique</span>
                    <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{detailModal.data.highlight}</span>
                  </div>
                </div>
                <div className="space-y-1 pt-2">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Micro-Nutriments Actifs</span>
                  <p className="text-sm font-bold text-indigo-500 flex items-center">
                    <Activity className="w-4 h-4 mr-2" /> {detailModal.data.nutrients}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Analyse Clinique</span>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    {detailModal.data.desc}
                  </p>
                </div>
                <div className="space-y-1 pt-2">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Mode d'Emploi</span>
                  <p className="text-sm font-bold text-orange-500 flex items-center">
                    <Utensils className="w-4 h-4 mr-2" /> {detailModal.data.usage}
                  </p>
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button onClick={() => setDetailModal(null)} className="w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold focus:ring-4 focus:ring-zinc-500/50">
              {txt.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
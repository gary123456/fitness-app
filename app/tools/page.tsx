"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// 🛡️ CORRECTION FINALE : "Brain" est maintenant bien importé !
import { Dumbbell, Scale, Calculator, ArrowRightLeft, Target, Wrench, Timer, Play, Pause, RotateCcw, Volume2, VolumeX, Plus, Minus, Activity, Droplets, FlaskConical, X, Apple, Nut, MoonStar, Info, ArrowLeft, HeartPulse, Wind, Flame, ShieldCheck, Beef, Thermometer, Droplet, Wheat, Dna, Leaf, Sparkles, ChevronRight, Zap, Utensils, Brain } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/useLanguage";

const PLATES = [
  { weight: 25, color: "bg-red-500", h: "h-24", w: "w-6" },
  { weight: 20, color: "bg-blue-500", h: "h-24", w: "w-5" },
  { weight: 15, color: "bg-yellow-400", h: "h-20", w: "w-4" },
  { weight: 10, color: "bg-green-500", h: "h-16", w: "w-4" },
  { weight: 5, color: "bg-white text-black", h: "h-12", w: "w-3" },
  { weight: 2.5, color: "bg-zinc-800", h: "h-10", w: "w-2" },
  { weight: 1.25, color: "bg-zinc-700", h: "h-8", w: "w-2" }
];

const NUT_DATABASE = {
  amandes: { nameFR: "Amandes", nameEN: "Almonds", kcalPer100: 579, gramsPerHandful: 30, gFats: 49, gProt: 21 },
  cajou: { nameFR: "Noix de Cajou", nameEN: "Cashews", kcalPer100: 553, gramsPerHandful: 35, gFats: 43, gProt: 18 },
  noix: { nameFR: "Noix (Cerneaux)", nameEN: "Walnuts", kcalPer100: 654, gramsPerHandful: 25, gFats: 65, gProt: 15 },
  pecan: { nameFR: "Noix de Pécan", nameEN: "Pecans", kcalPer100: 691, gramsPerHandful: 30, gFats: 72, gProt: 9 },
  macadamia: { nameFR: "Noix de Macadamia", nameEN: "Macadamia", kcalPer100: 718, gramsPerHandful: 35, gFats: 76, gProt: 8 },
  pistaches: { nameFR: "Pistaches", nameEN: "Pistachios", kcalPer100: 562, gramsPerHandful: 30, gFats: 45, gProt: 20 },
  cacahuetes: { nameFR: "Cacahuètes", nameEN: "Peanuts", kcalPer100: 567, gramsPerHandful: 35, gFats: 49, gProt: 25 },
  bresil: { nameFR: "Noix du Brésil", nameEN: "Brazil Nuts", kcalPer100: 656, gramsPerHandful: 30, gFats: 66, gProt: 14 },
  noisettes: { nameFR: "Noisettes", nameEN: "Hazelnuts", kcalPer100: 628, gramsPerHandful: 30, gFats: 60, gProt: 15 }
};

const FATS_DB = [
  { id: "olive", name: "Huile d'Olive (Extra Vierge)", smoke: 190, sat: 14, mono: 73, poly: 11, omega3: "Faible", vitamins: "Vit. E, K, Polyphénols", usage: "Cuisson douce, Assaisonnement", cat: "Polyvalent", desc: "La référence de la diète méditerranéenne. Riche en Oméga-9 (acide oléique), excellente pour la santé cardiovasculaire.", alternatives: "Huile d'Avocat pour haute température." },
  { id: "colza", name: "Huile de Colza", smoke: 204, sat: 7, mono: 63, poly: 28, omega3: "Élevé", vitamins: "Bon ratio O3/O6", usage: "Cuisson modérée, Assaisonnement", cat: "Polyvalent", desc: "L'une des huiles de cuisson les plus saines grâce à son excellent équilibre naturel entre Oméga-3 et Oméga-6.", alternatives: "Mélange type Isio 4." },
  { id: "avocado", name: "Huile d'Avocat", smoke: 270, sat: 12, mono: 71, poly: 13, omega3: "Faible", vitamins: "Vit. E, Lutéine", usage: "Cuisson très haute temp.", cat: "Cuisson Forte", desc: "Souvent confondue comme source d'Oméga-3, elle est en réalité riche en Oméga-9. Son énorme point de fumée (270°C) en fait la meilleure huile pour saisir les viandes sainement.", alternatives: "Ghee, Huile de Coco." },
  { id: "ghee", name: "Ghee (Beurre Clarifié)", smoke: 250, sat: 60, mono: 25, poly: 5, omega3: "Trace", vitamins: "Vit. A, D, E, K", usage: "Cuisson haute température", cat: "Cuisson Forte", desc: "Beurre purifié de son eau, lactose et caséine. Très stable à la chaleur et digeste pour les intolérants au lactose.", alternatives: "Huile d'Avocat, Huile de Coco." },
  { id: "coconut", name: "Huile de Coco", smoke: 177, sat: 82, mono: 6, poly: 2, omega3: "Aucun", vitamins: "Acide Laurique (TCM)", usage: "Pâtisserie, Cuisson douce", cat: "Cuisson Forte", desc: "Riche en Triglycérides à Chaîne Moyenne (TCM), elle est utilisée rapidement comme énergie par le corps. Idéale en cuisson douce ou pâtisserie.", alternatives: "Beurre." },
  { id: "palm", name: "Huile de Palme (Non-raffinée)", smoke: 232, sat: 50, mono: 39, poly: 11, omega3: "Aucun", vitamins: "Vit. E, Bêta-carotène", usage: "Friture, Industriel", cat: "Cuisson Forte", desc: "Extrêmement riche en graisses saturées. Très stable à la chaleur, mais son profil lipidique n'est pas optimal pour une consommation quotidienne élevée.", alternatives: "Huile de Coco, Ghee." },
  { id: "butter", name: "Beurre Doux", smoke: 150, sat: 51, mono: 21, poly: 3, omega3: "Trace", vitamins: "Vit. A, D, Butyrate", usage: "Cuisson très douce, Cru", cat: "Polyvalent", desc: "Excellent cru pour ses vitamines et son goût, mais brûle vite (150°C). Le noircissement du beurre dégage des substances toxiques.", alternatives: "Ghee pour la cuisson." },
  { id: "tournesol", name: "Huile de Tournesol", smoke: 232, sat: 11, mono: 20, poly: 69, omega3: "Zéro (Full Oméga-6)", vitamins: "Vit. E", usage: "Friture, Industriel", cat: "Cuisson Forte", desc: "Extrêmement riche en Oméga-6. Dans nos alimentations modernes, l'excès d'Oméga-6 favorise l'inflammation systémique. À limiter sévèrement.", alternatives: "Huile d'Olive (cuisson douce), Huile d'Avocat (friture)." },
  { id: "flaxseed", name: "Huile de Lin", smoke: 107, sat: 9, mono: 18, poly: 73, omega3: "Massif", vitamins: "Reine des Oméga-3 (ALA)", usage: "Cru STRICTEMENT", cat: "Assaisonnement (Cru)", desc: "La source végétale la plus dense en Oméga-3. Doit être conservée au frigo et ne JAMAIS être chauffée sous peine de s'oxyder et devenir toxique.", alternatives: "Huile de Noix, Huile de Chanvre." },
  { id: "hemp", name: "Huile de Chanvre", smoke: 165, sat: 10, mono: 13, poly: 77, omega3: "Très Élevé", vitamins: "Ratio O3/O6 parfait (1:3)", usage: "Cru STRICTEMENT", cat: "Assaisonnement (Cru)", desc: "Possède le ratio naturel parfait pour le corps humain entre Oméga-3 et Oméga-6. Un super-aliment anti-inflammatoire par excellence.", alternatives: "Huile de Lin." },
  { id: "walnut", name: "Huile de Noix", smoke: 160, sat: 9, mono: 23, poly: 63, omega3: "Élevé", vitamins: "Oméga-3, Mélatonine", usage: "Cru STRICTEMENT", cat: "Assaisonnement (Cru)", desc: "Goût prononcé, excellente en salade. Très riche en acides gras essentiels favorisant la santé cérébrale et la récupération nerveuse.", alternatives: "Huile de Chanvre, Huile d'Olive." },
  { id: "sesame", name: "Huile de Sésame (Grillé)", smoke: 177, sat: 14, mono: 40, poly: 42, omega3: "Faible", vitamins: "Antioxydants, Vit. K", usage: "Fin de cuisson (Wok), Assaisonnement", cat: "Assaisonnement (Cru)", desc: "Apporte une saveur asiatique intense. S'utilise en filet à la toute fin de la cuisson pour ne pas détruire ses nutriments.", alternatives: "Huile d'Olive." },
];

const SUGARS_DB = [
  { id: "yacon", name: "Sirop de Yacon", gi: 1, kcal: 197, nutrients: "Fructo-oligosaccharides", note: "Le Saint Graal. IG quasi nul, agit comme un prébiotique (nourrit la flore intestinale) sans piquer l'insuline.", cat: "Naturels & Complets" },
  { id: "coconut", name: "Sucre de Coco", gi: 35, kcal: 380, nutrients: "Inuline (Fibres), Fer, Zinc", note: "Faible IG grâce à ses fibres d'inuline. Ne raffine pas, conserve ses minéraux. Excellent substitut pour la pâtisserie saine.", cat: "Naturels & Complets" },
  { id: "maple", name: "Sirop d'Érable", gi: 54, kcal: 260, nutrients: "Manganèse, Zinc, Antioxydants", note: "Riche en minéraux, il est moins calorique que le miel et possède un indice glycémique modéré. (Prendre du Grade A pur).", cat: "Naturels & Complets" },
  { id: "honey", name: "Miel (Cru/Non pasteurisé)", gi: 55, kcal: 304, nutrients: "Antioxydants, Enzymes", note: "Excellentes propriétés antibactériennes. Privilégiez le miel d'acacia qui possède le fructose naturel donnant l'IG le plus bas (autour de 35).", cat: "Naturels & Complets" },
  { id: "rapadura", name: "Rapadura (Canne Complet)", gi: 55, kcal: 380, nutrients: "Mélasse, Fer, Potassium", note: "Pur jus de canne déshydraté non raffiné. Il conserve 100% de la mélasse et des minéraux, lui donnant son goût réglisse.", cat: "Naturels & Complets" },
  { id: "brown", name: "Cassonade / Sucre Roux", gi: 65, kcal: 380, nutrients: "Traces infimes de mélasse", note: "Souvent, ce n'est que du sucre blanc raffiné recoloré avec un peu de mélasse. Son impact glycémique est quasiment identique au sucre blanc.", cat: "Raffinés & Sirops" },
  { id: "white", name: "Sucre Blanc Raffiné", gi: 70, kcal: 400, nutrients: "Zéro (Calories vides)", note: "Totalement dépourvu de nutriments. Provoque un pic d'insuline brutal suivi d'un crash d'énergie. Hautement inflammatoire pour l'organisme.", cat: "Raffinés & Sirops" },
  { id: "agave", name: "Sirop d'Agave", gi: 15, kcal: 310, nutrients: "Fructose très élevé (80%)", note: "Attention ! Son IG est bas, mais il est composé à 80% de fructose pur. En excès, il fatigue directement le foie (risque de stéatose hépatique).", cat: "Raffinés & Sirops" },
  { id: "dextrose", name: "Dextrose / Maltodextrine", gi: 100, kcal: 380, nutrients: "Énergie immédiate", note: "Uniquement pour les sportifs (Intra-workout). Passe dans le sang instantanément pour nourrir le muscle en plein effort. À proscrire formellement au repos.", cat: "Sportifs (Intra-Workout)" },
  { id: "stevia", name: "Stévia / Érythritol", gi: 0, kcal: 0, nutrients: "Aucun", note: "Édulcorants naturels : zéro calorie, aucun impact sur la glycémie ou l'insuline. Parfait pour les diabétiques, diètes Keto ou Sèche extrême.", cat: "Édulcorants" },
];

const SUPERFOODS_DB = [
  { id: "spirulina", name: "Spiruline", highlight: "Densité Nutritionnelle Max", nutrients: "Protéines (60%), Fer, Phycocyanine", desc: "Une cyanobactérie considérée comme l'aliment le plus complet de la planète. Elle améliore considérablement l'endurance, l'oxygénation du sang et booste le système immunitaire.", usage: "1 à 2 cuillères à café par jour (en poudre dans un jus ou en gélules).", cat: "Algues & Poudres", icon: "Activity" },
  { id: "chia", name: "Graines de Chia", highlight: "Super-Hydratation & Transit", nutrients: "Oméga-3 (ALA), Fibres solubles", desc: "Elles absorbent jusqu'à 12 fois leur poids en eau. Elles créent un gel dans l'estomac qui hydrate le corps de l'intérieur et ralentit l'absorption des glucides (baisse l'IG du repas complet).", usage: "Pudding, saupoudrées sur des yaourts ou dans l'eau de votre shaker.", cat: "Graines & Noix", icon: "Droplet" },
  { id: "cacao", name: "Cacao Cru (Non Torréfié)", highlight: "Récupération Nerveuse", nutrients: "Magnésium pur, Polyphénols, Théobromine", desc: "Le cacao non chauffé est l'une des meilleures sources naturelles de magnésium (idéal pour relâcher le Système Nerveux Central après l'effort). La théobromine donne une énergie douce sans la nervosité du café.", usage: "Dans un shaker post-workout ou un porridge.", cat: "Graines & Noix", icon: "Zap" },
  { id: "turmeric", name: "Curcuma (Curcumine)", highlight: "Anti-inflammatoire Puissant", nutrients: "Curcumine", desc: "Le plus puissant anti-inflammatoire naturel connu. Indispensable pour accélérer la récupération articulaire et tendineuse. DOIT être couplé à du poivre noir (pipérine) et un corps gras pour être assimilé.", usage: "Dans les plats chauds (avec huile) ou en 'Golden Milk'.", cat: "Racines & Épices", icon: "ShieldCheck" },
  { id: "maca", name: "Maca Péruvienne", highlight: "Adaptogène & Hormones", nutrients: "Vitamines B, C, E, Zinc", desc: "Plante adaptogène poussant dans des conditions extrêmes, elle aide le corps humain à gérer le stress physique. Très réputée pour équilibrer le système hormonal et booster naturellement la libido.", usage: "1 cuillère à café le matin (poudre). Goût caramélisé.", cat: "Racines & Épices", icon: "Dna" },
  { id: "goji", name: "Baies de Goji", highlight: "Antioxydant & Immunité", nutrients: "Vitamine C, Polysaccharides", desc: "Extrêmement denses en antioxydants, elles stimulent la production de globules blancs et luttent contre le stress oxydatif causé par les entraînements à très haute intensité.", usage: "1 petite poignée en collation ou dans un bowl.", cat: "Baies & Fruits", icon: "Sparkles" },
  { id: "blueberries", name: "Myrtilles Sauvages", highlight: "Neuro-Protecteur", nutrients: "Anthocyanes (Antioxydants)", desc: "Protègent le cerveau, améliorent la cognition et soutiennent le réseau sanguin capillaire. Les versions sauvages (souvent vendues surgelées) sont 2x plus concentrées en nutriments que les cultivées.", usage: "1 poignée dans un smoothie pré ou post-workout.", cat: "Baies & Fruits", icon: "Brain" },
  { id: "matcha", name: "Thé Vert Matcha", highlight: "Énergie Lisse & Focus", nutrients: "L-Théanine, EGCG", desc: "La L-Théanine contenue dans le Matcha annule les effets 'crash' et 'palpitations' de la caféine, offrant un 'focus mental' laser et calme pendant 4 à 6 heures. Brûleur de graisse naturel (EGCG).", usage: "En boisson pré-workout ou le matin.", cat: "Algues & Poudres", icon: "Flame" }
];

const ONE_RM_ZONES = [
  { pct: 95, title: "Force Pure / Max", desc: "1-2 Répétitions. Cible le recrutement nerveux pur. Forte fatigue du Système Nerveux Central.", reps: "1-2" },
  { pct: 90, title: "Force Lourde", desc: "3-4 Répétitions. Travail lourd, développement de la force brute.", reps: "3-4" },
  { pct: 80, title: "Hypertrophie / Force", desc: "5-8 Répétitions. La zone dorée pour l'athlète hybride. Tension mécanique maximale.", reps: "5-8" },
  { pct: 70, title: "Hypertrophie / Volume", desc: "9-12 Répétitions. Focus sur la prise de masse musculaire, stress métabolique.", reps: "9-12" },
  { pct: 60, title: "Hypertrophie Légère", desc: "13-15 Répétitions. Apprentissage moteur, congestion, brûlure locale.", reps: "13-15" },
  { pct: 50, title: "Endurance / Chauffe", desc: "15+ Répétitions. Afflux sanguin, récupération active, aucun impact nerveux.", reps: "15+" }
];

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

export default function ToolsPage() {
  const { lang } = useLanguage();
  
  const [activeTool, setActiveTool] = useState<"hub" | "plates" | "predict" | "convert" | "timer" | "elite" | "nuts" | "vo2" | "harvard" | "rawcooked" | "sweat" | "fats" | "sugars" | "ffmi" | "superfoods">("hub");
  
  const [targetWeight, setTargetWeight] = useState<string>("");
  const [barWeight, setBarWeight] = useState<string>("20");
  
  const [convKg, setConvKg] = useState<string>("");
  const [convLb, setConvLb] = useState<string>("");
  const [convOz, setConvOz] = useState<string>("");
  const [convGramsOz, setConvGramsOz] = useState<string>("");
  const [convCup, setConvCup] = useState<string>("");
  const [convGramsCup, setConvGramsCup] = useState<string>("");
  
  const [liftWeight, setLiftWeight] = useState<string>("");
  const [liftReps, setLiftReps] = useState<string>("");
  const [flipped1RM, setFlipped1RM] = useState<number | null>(null);

  const [weightBefore, setWeightBefore] = useState<string>("");
  const [weightAfter, setWeightAfter] = useState<string>("");
  const [fluidDrank, setFluidDrank] = useState<string>("");
  const [workoutDur, setWorkoutDur] = useState<string>("");

  const [selectedNut, setSelectedNut] = useState<string>("amandes");
  const [nutHandfuls, setNutHandfuls] = useState<string>("1");

  const [vo2Dist, setVo2Dist] = useState<string>("");
  const [harvardDur, setHarvardDur] = useState<string>("300");
  const [harvardP1, setHarvardP1] = useState<string>("");
  const [harvardP2, setHarvardP2] = useState<string>("");
  const [harvardP3, setHarvardP3] = useState<string>("");

  const [ffmiWeight, setFfmiWeight] = useState<string>("");
  const [ffmiHeight, setFfmiHeight] = useState<string>("");
  const [ffmiBf, setFfmiBf] = useState<string>("");
  
  const [foodType, setFoodType] = useState<"meat" | "rice" | "lentils">("meat");
  const [foodWeight, setFoodWeight] = useState<string>("");
  const [isRawInput, setIsRawInput] = useState<boolean>(true);

  const [timerMode, setTimerMode] = useState<"classic" | "hiit">("hiit");
  const [classicTime, setClassicTime] = useState<number>(60);
  const [customMin, setCustomMin] = useState<string>("1");
  const [customSec, setCustomSec] = useState<string>("0");
  const [classicIsRunning, setClassicIsRunning] = useState(false);
  
  const [oledMode, setOledMode] = useState(false);

  const classicRef = useRef<NodeJS.Timeout | null>(null);

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [hiitConfig, setHiitConfig] = useState({ prepare: 10, work: 20, rest: 10, cycles: 8, sets: 1, restBetweenSets: 60, coolDown: 0 });
  const [hiitState, setHiitState] = useState({ isRunning: false, phase: "PREPARE" as "PREPARE" | "WORK" | "REST" | "SET_REST" | "COOL_DOWN" | "DONE", timeLeft: hiitConfig.prepare, currentCycle: 1, currentSet: 1 });
  const hiitRef = useRef<NodeJS.Timeout | null>(null);

  const [dotsGender, setDotsGender] = useState<"homme" | "femme">("homme");
  const [dotsBw, setDotsBw] = useState<string>("");
  const [dotsTotal, setDotsTotal] = useState<string>("");

  const [infoModal, setInfoModal] = useState<{show: boolean, title: string, desc: string} | null>(null);
  const [detailModal, setDetailModal] = useState<{show: boolean, type: "fat"|"sugar"|"zone"|"superfood", data: any} | null>(null);

  const t = {
    FR: { title: "Dictionnaire Métabolique", sub: "L'arsenal technologique pour athlètes exigeants.", plateCalc: "Disques", converter: "Convertir", predictor: "1RM & Zones", timer: "Chrono & HIIT", elite: "Score DOTS", nuts: "Oléagineux", vo2: "Test VO2 Max", harvard: "Test de Harvard", rawcooked: "Cru vs Cuit", targetWeight: "Poids Cible (kg)", barWeight: "Poids de la Barre (kg)", eachSide: "Par côté :", totalSide: "Total par côté :", noPlates: "Entrez un poids cible supérieur à la barre.", kgToLb: "Kg vers Lbs", lbToKg: "Lbs vers Kg", weightLifted: "Poids soulevé (kg)", repsDone: "Reps réalisées", est1RM: "1RM Estimé", formula: "Basé sur la formule d'Epley", start: "Démarrer", pause: "Pause", reset: "Réinit", classic: "Classique", prepare: "Préparation", work: "Travail", rest: "Repos", cycles: "Cycles", sets: "Séries", restBetween: "Repos (Séries)", coolDown: "Retour au calme", done: "Terminé !", soundOn: "Son On", soundOff: "Son Off", sweatTitle: "Taux de Sudation", sweatSub: "Protocole hydrique de récupération.", wBefore: "Poids avant (kg)", wAfter: "Poids après (kg)", fluid: "Liquide bu (ml)", dur: "Durée (min)", sweatRate: "Perte de sueur", sweatRec: "Buvez cette quantité par heure d'effort.", nutTitle: "Calculateur d'Oléagineux", nutSub: "Convertit les 'poignées' en grammes et calories réelles.", handfuls: "Nombre de poignées :", nutConv: "Nutrition (Solides & Liquides)" },
    EN: { title: "Metabolic Dictionary", sub: "The technological arsenal for demanding athletes.", plateCalc: "Plates", converter: "Convert", predictor: "1RM & Zones", timer: "Timer & HIIT", elite: "DOTS Score", nuts: "Nuts", vo2: "VO2 Max Test", harvard: "Harvard Step Test", rawcooked: "Raw vs Cooked", targetWeight: "Target Weight (kg)", barWeight: "Bar Weight (kg)", eachSide: "Per side:", totalSide: "Total per side:", noPlates: "Enter a target weight greater than the bar.", kgToLb: "Kg to Lbs", lbToKg: "Lbs to Kg", weightLifted: "Weight lifted (kg)", repsDone: "Reps performed", est1RM: "Estimated 1RM", formula: "Based on Epley's formula", start: "Start", pause: "Pause", reset: "Reset", classic: "Classic", prepare: "Prepare", work: "Work", rest: "Rest", cycles: "Cycles", sets: "Sets", restBetween: "Rest (Sets)", coolDown: "Cool Down", done: "Workout Done!", soundOn: "Sound On", soundOff: "Sound Off", sweatTitle: "Sweat Rate", sweatSub: "Hydration recovery protocol.", wBefore: "Weight before (kg)", wAfter: "Weight after (kg)", fluid: "Fluid drank (ml)", dur: "Duration (min)", sweatRate: "Sweat Loss", sweatRec: "Drink this amount per hour.", nutTitle: "Nuts Estimator", nutSub: "Converts 'handfuls' into real grams and calories.", handfuls: "Number of handfuls:", nutConv: "Nutrition (Solids & Liquids)" }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

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

  const calculateDots = () => {
    const bw = parseFloat(dotsBw);
    const total = parseFloat(dotsTotal);
    if (!bw || !total || bw <= 0) return 0;
    let coeff = 0;
    if (dotsGender === "homme") {
      const a = -307.75076; const b = 24.0900756; const c = -0.1918759221; const d = 0.0007391293; const e = -0.000001093;
      const denom = a + b * bw + c * Math.pow(bw, 2) + d * Math.pow(bw, 3) + e * Math.pow(bw, 4);
      coeff = 500 / denom;
    } else {
      const a = -57.96288; const b = 13.6175032; const c = -0.1126655495; const d = 0.0005158568; const e = -0.00000107;
      const denom = a + b * bw + c * Math.pow(bw, 2) + d * Math.pow(bw, 3) + e * Math.pow(bw, 4);
      coeff = 500 / denom;
    }
    return Math.round(total * coeff * 100) / 100;
  };

  const calculateFFMI = () => {
    const w = parseFloat(ffmiWeight);
    const h = parseFloat(ffmiHeight) / 100; 
    const bf = parseFloat(ffmiBf);
    if (!w || !h || !bf || h <= 0) return { ffmi: 0, normalized: 0 };
    
    const leanWeight = w * (1 - (bf / 100));
    const ffmi = leanWeight / (h * h);
    const normalized = ffmi + 6.1 * (1.8 - h);
    return { ffmi: Math.round(ffmi * 10) / 10, normalized: Math.round(normalized * 10) / 10 };
  };

  const handleKgChange = (val: string) => { setConvKg(val); setConvLb(val ? (parseFloat(val) * 2.20462).toFixed(2) : ""); };
  const handleLbChange = (val: string) => { setConvLb(val); setConvKg(val ? (parseFloat(val) / 2.20462).toFixed(2) : ""); };
  const handleOzChange = (val: string) => { setConvOz(val); setConvGramsOz(val ? (parseFloat(val) * 28.3495).toFixed(0) : ""); };
  const handleGramsOzChange = (val: string) => { setConvGramsOz(val); setConvOz(val ? (parseFloat(val) / 28.3495).toFixed(2) : ""); };
  const handleCupChange = (val: string) => { setConvCup(val); setConvGramsCup(val ? (parseFloat(val) * 240).toFixed(0) : ""); };
  const handleGramsCupChange = (val: string) => { setConvGramsCup(val); setConvCup(val ? (parseFloat(val) / 240).toFixed(2) : ""); };

  const get1RM = () => {
    const w = parseFloat(liftWeight);
    const r = parseInt(liftReps);
    if (!w || !r || r < 1) return 0;
    if (r === 1) return w;
    return Math.round(w * (1 + r / 30));
  };

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

  const getVo2Max = () => {
    const dist = parseFloat(vo2Dist);
    if (!dist || dist <= 500) return 0;
    return Math.round(((dist - 504.9) / 44.73) * 10) / 10;
  };

  const getHarvardScore = () => {
    const dur = parseFloat(harvardDur);
    const p1 = parseFloat(harvardP1);
    const p2 = parseFloat(harvardP2);
    const p3 = parseFloat(harvardP3);
    if (!dur || !p1 || !p2 || !p3) return 0;
    return Math.round((dur * 100) / (2 * (p1 + p2 + p3)));
  };

  const getRawCookedResult = () => {
    const w = parseFloat(foodWeight);
    if (!w) return 0;
    if (foodType === "meat") return isRawInput ? Math.round(w * 0.75) : Math.round(w * 1.33);
    if (foodType === "rice") return isRawInput ? Math.round(w * 3) : Math.round(w / 3);
    if (foodType === "lentils") return isRawInput ? Math.round(w * 2.5) : Math.round(w / 2.5);
    return w;
  };

  const currentNut = NUT_DATABASE[selectedNut as keyof typeof NUT_DATABASE];
  const calculateNutMacros = () => {
    const qty = parseFloat(nutHandfuls) || 0;
    const totalGrams = qty * currentNut.gramsPerHandful;
    const ratio = totalGrams / 100;
    return { grams: totalGrams, kcal: Math.round(currentNut.kcalPer100 * ratio), fats: Math.round(currentNut.gFats * ratio), prot: Math.round(currentNut.gProt * ratio) };
  };
  const nutStats = calculateNutMacros();

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

  const render1RMPercentages = () => {
    const rm = get1RM();
    if (rm <= 0) return null;
    
    const getZoneInfo = (p: number) => {
      if (p >= 85) return { title: "Force Pure", desc: "1-5 Reps. Cible le SNC." };
      if (p >= 70) return { title: "Hypertrophie", desc: "6-12 Reps. Volume & Masse." };
      return { title: "Endurance", desc: "15+ Reps. Afflux Sanguin." };
    };

    return (
      <div className="pt-6 mt-4 border-t border-zinc-100 dark:border-zinc-800 animate-in fade-in">
        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center justify-between">
          <span>{lang === 'FR' ? 'Matrice de travail (Barre Olympique)' : 'Working Matrix (Olympic Bar)'}</span>
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
            
            const zoneInfo = getZoneInfo(zone.pct);
            const isFlipped = flipped1RM === zone.pct;

            return (
              <div 
                key={zone.pct} 
                onClick={() => setFlipped1RM(isFlipped ? null : zone.pct)}
                className={`relative group ${bgColor} border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm transition-all h-16 cursor-pointer ${hoverBorder} active:scale-95`}
              >
                {/* Face A : Chiffres purs */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center transition-transform duration-300 ${isFlipped ? '-translate-y-full' : 'group-hover:-translate-y-full'}`}>
                  <span className="text-[10px] font-bold text-zinc-400">{zone.pct}%</span>
                  <span className={`text-sm font-black ${textColor}`}>{weight} kg</span>
                </div>
                {/* Face B : Explications cliniques */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center p-1 text-center transition-transform duration-300 ${isFlipped ? 'translate-y-0' : 'translate-y-full group-hover:translate-y-0'} ${hoverBorder.replace('hover:border-', 'bg-')} text-white`}>
                  <span className="text-[9px] font-black uppercase tracking-widest">{zoneInfo.title}</span>
                  <span className="text-[8px] font-medium leading-tight mt-0.5 opacity-90 hidden sm:block">{zoneInfo.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getModalContent = () => {
    if (infoModal?.title === "1RM & Zones") {
      return lang === 'FR'
        ? "Le 1RM (Répétition Maximale) est le poids maximum absolu que vous pouvez soulever sur une seule répétition parfaite.\n\n🔥 ZONES DE TRAVAIL :\n\n• 85% à 100% (Rouge) : Force pure. Séries de 1 à 5 reps. Taxe énormément le Système Nerveux Central (SNC).\n• 65% à 85% (Vert) : Hypertrophie (Sweet Spot). Séries de 6 à 12 reps. L'équilibre parfait pour créer de la masse musculaire via la tension mécanique.\n• 50% à 65% (Bleu) : Endurance / Échauffement. Séries longues (>15 reps). Excellent pour le flux sanguin et l'apprentissage moteur."
        : "The 1RM (One Rep Max) is the absolute maximum weight you can lift for a single perfect repetition.\n\n🔥 WORKING ZONES:\n\n• 85% to 100% (Red): Pure Strength. 1 to 5 reps. Highly taxes the Central Nervous System (CNS).\n• 65% to 85% (Green): Hypertrophy (Sweet Spot). 6 to 12 reps. The perfect balance to build muscle mass via mechanical tension.\n• 50% to 65% (Blue): Endurance / Warm-up. High reps (>15). Excellent for blood flow and motor learning.";
    }
    if (infoModal?.title === "Calculateur de Disques") {
      return lang === 'FR'
        ? "Cet outil décompose n'importe quel poids cible en disques olympiques standards (25kg, 20kg, 15kg, 10kg, 5kg, 2.5kg, 1.25kg).\n\nEntrez simplement le poids total souhaité et le poids de votre barre à vide (généralement 20kg pour une barre olympique standard), et l'algorithme vous dira exactement quoi charger de chaque côté."
        : "This tool breaks down any target weight into standard Olympic plates (25kg, 20kg, 15kg, 10kg, 5kg, 2.5kg, 1.25kg).\n\nSimply enter the desired total weight and the empty bar weight (usually 20kg for a standard Olympic bar), and the algorithm tells you exactly what to load on each side.";
    }
    if (infoModal?.title === "Score DOTS") {
      return lang === 'FR' 
        ? "Le Score DOTS est la formule mathématique officielle utilisée en Powerlifting depuis 2020. Elle permet de comparer la force de deux athlètes de poids différents, hommes ou femmes.\n\nExemple : Un athlète de 70kg qui soulève 400kg au total (Squat + Bench + Deadlift) est considéré comme 'plus fort' qu'un athlète de 120kg qui soulève 450kg. Le DOTS lisse cet écart.\n\n• < 300 : Débutant\n• 300 - 400 : Intermédiaire / Bon\n• 400 - 500 : Athlète d'Élite\n• > 500 : Niveau Mondial"
        : "The DOTS Score is the official mathematical formula used in Powerlifting since 2020. It compares the relative strength of athletes across different body weights and genders.\n\nExample: A 70kg athlete lifting a 400kg total (Squat + Bench + Deadlift) is considered 'stronger' than a 120kg athlete lifting 450kg. DOTS normalizes this gap.\n\n• < 300: Beginner\n• 300 - 400: Intermediate / Good\n• 400 - 500: Elite Athlete\n• > 500: World Class";
    }
    if (infoModal?.title === "Indice FFMI (Masse Maigre)") {
      return lang === 'FR'
        ? "Le FFMI (Fat-Free Mass Index) est l'Indice de Masse Maigre. C'est l'étalon d'or en bodybuilding pour déterminer la limite génétique naturelle d'un athlète.\n\nIl calcule votre masse musculaire pure en soustrayant votre pourcentage de graisse corporelle (BF%).\n\n• 18 - 20 : Moyenne saine\n• 21 - 22 : Très Bon (Athlétique)\n• 23 - 25 : Excellent (Proche limite génétique naturelle)\n• > 25 : Dépasse la limite physiologique humaine standard."
        : "The FFMI (Fat-Free Mass Index) is the gold standard in bodybuilding to determine a natural athlete's genetic limit.\n\nIt calculates your pure muscle mass by subtracting your body fat percentage.\n\n• 18 - 20: Healthy average\n• 21 - 22: Very Good (Athletic)\n• 23 - 25: Excellent (Near natural limit)\n• > 25: Exceeds standard human physiological limits.";
    }
    if (infoModal?.title === "Taux de Sudation") {
      return lang === 'FR'
        ? "Le Taux de Sudation (Sweat Rate) est une métrique clinique utilisée par les athlètes professionnels (Marathoniens, NFL, MMA) pour éviter la déshydratation mortelle pour les performances.\n\n1. Pesez-vous nu avant l'entraînement.\n2. Notez la quantité d'eau que vous buvez pendant la séance (en ml).\n3. Pesez-vous nu après l'entraînement (et après avoir uriné si besoin).\n4. Entrez la durée exacte.\n\nLe résultat vous indique exactement combien de millilitres d'eau votre corps perd par heure. Buvez cette quantité précise lors de vos prochaines séances d'intensité similaire."
        : "The Sweat Rate is a clinical metric used by pro athletes (Marathoners, NFL, MMA) to avoid performance-killing dehydration.\n\n1. Weigh yourself naked before training.\n2. Note the fluid you drink during the session (in ml).\n3. Weigh yourself naked after training.\n4. Enter exact duration.\n\nThe result tells you exactly how many milliliters of water your body loses per hour. Drink this precise amount during your next sessions of similar intensity.";
    }
    if (infoModal?.title === "Test VO2 Max (Cooper)") {
      return lang === 'FR'
        ? "Le test de Cooper est un test standardisé pour évaluer la forme cardiovasculaire (le VO2 Max). \n\nProtocole : Courez la plus grande distance possible en exactement 12 minutes, sur terrain plat ou tapis de course.\n\nÉvaluation du VO2 Max :\n• < 35 : Faible\n• 35 - 45 : Moyen\n• 45 - 55 : Bon\n• > 55 : Excellent (Athlète)"
        : "The Cooper test is a standardized test to evaluate cardiovascular fitness (VO2 Max).\n\nProtocol: Run as far as possible in exactly 12 minutes on a flat surface or treadmill.\n\nVO2 Max Evaluation:\n• < 35: Poor\n• 35 - 45: Average\n• 45 - 55: Good\n• > 55: Excellent (Athlete)";
    }
    if (infoModal?.title === "Test de Harvard (Récupération)") {
      return lang === 'FR'
        ? "Le test de Harvard mesure la capacité de votre cœur à récupérer après un effort. \n\nProtocole :\n1. Montez et descendez d'une marche (environ 45cm) au rythme de 30 pas/minute pendant 5 minutes maximum (300 secondes).\n2. Asseyez-vous immédiatement après.\n3. Prenez votre pouls pendant 30 sec à : 1 min de repos, puis à 2 min, et à 3 min.\n\nIndice de Forme :\n• < 55 : Faible\n• 55 - 64 : Moyen\n• 65 - 79 : Bon\n• > 80 : Excellent"
        : "The Harvard Step Test measures your heart's ability to recover after exercise.\n\nProtocol:\n1. Step up and down on a bench (approx 45cm) at 30 steps/minute for up to 5 minutes (300 seconds).\n2. Sit down immediately after.\n3. Take your pulse for 30s at: 1 min rest, 2 min rest, and 3 min rest.\n\nFitness Index:\n• < 55: Poor\n• 55 - 64: Average\n• 65 - 79: Good\n• > 80: Excellent";
    }
    if (infoModal?.title === "Ratio Cru / Cuit") {
      return lang === 'FR'
        ? "L'erreur n°1 en nutrition est de peser ses aliments cuits en utilisant les macros de l'aliment cru.\n\n• Viande et Poisson perdent de l'eau à la cuisson (jusqu'à 30% de leur poids). 100g de poulet cru pèseront ~75g cuit.\n• Riz et Pâtes absorbent l'eau (x3). 100g cru donneront ~300g cuit.\n• Lentilles gonflent énormément (x2.5).\n\nUtilisez cet outil pour toujours traquer vos repas avec une précision clinique."
        : "The #1 nutrition mistake is weighing cooked food but tracking raw macros.\n\n• Meat & Fish lose water during cooking (up to 30%). 100g raw chicken becomes ~75g cooked.\n• Rice & Pasta absorb water (x3). 100g raw becomes ~300g cooked.\n• Lentils expand heavily (x2.5).\n\nUse this tool to always track your meals with clinical precision.";
    }
    if (infoModal?.title === "Comparateur Lipides") {
      return lang === 'FR'
        ? "Toutes les graisses ne se valent pas. \n\n• Graisses Saturées (Rouge) : Solides à température ambiante. Stables à la chaleur (Cuisson Forte), mais à consommer avec modération.\n• Graisses Insaturées (Vert/Bleu) : Essentielles pour le cœur et le cerveau. C'est ici que se trouvent les Oméga-3 et Oméga-6.\n• Point de fumée : Température à laquelle l'huile brûle et devient cancérigène. Ne faites jamais frire avec des huiles de Lin, de Noix ou de Chanvre (Réservées strictement aux salades car elles s'oxydent à la chaleur) !"
        : "Not all fats are created equal.\n\n• Saturated Fats (Red): Solid at room temp. Heat stable, but consume in moderation.\n• Unsaturated (Green/Blue): Essential for heart and brain (Omega-3 & 6).\n• Smoke Point: Temperature at which oil burns and becomes carcinogenic. Never fry with Flaxseed, Hemp or Walnut oil (Salads only)!";
    }
    if (infoModal?.title === "Comparateur Glucides & IG") {
      return lang === 'FR'
        ? "L'Index Glycémique (IG) mesure la vitesse à laquelle un glucide fait monter le taux de sucre dans le sang (pic d'insuline).\n\n• IG Élevé (>70) : Stockage rapide sous forme de graisse si l'énergie n'est pas brûlée immédiatement. Épuise le pancréas.\n• IG Bas (<55) : Énergie diffuse et prolongée sans crash.\nCertains sucres comme le Sirop de Yacon (IG 1) ou le Miel contiennent des micronutriments (Antioxydants, Minéraux) contrairement au sucre blanc ou à la cassonade qui n'apportent que des calories vides."
        : "The Glycemic Index (GI) measures how quickly a carb raises your blood sugar (insulin spike).\n\n• High GI (>70): Fast fat storage if unused. Exhausts the pancreas.\n• Low GI (<55): Smooth and prolonged energy without crash.\nSugars like Yacon Syrup (GI 1) or Honey contain micronutrients (Antioxidants, Minerals) unlike white sugar which provides empty calories.";
    }
    if (infoModal?.title === "Calculateur d'Oléagineux") {
      return lang === 'FR'
        ? "Peser ses noix tous les jours est une corvée. Cet outil utilise des moyennes statistiques cliniques.\n\nUne 'poignée' standard correspond à la quantité que l'on peut tenir dans une main fermée (environ 30g selon la densité de la noix). L'algorithme calcule instantanément les Kcal et la répartition exacte des Lipides/Protéines pour vous faire gagner du temps."
        : "Weighing nuts daily is a chore. This tool uses clinical statistical averages.\n\nA standard 'handful' is what you can hold in a closed hand (approx 30g depending on nut density). The algorithm instantly calculates Kcal and exact Fat/Protein splits to save you time.";
    }
    if (infoModal?.title === "Convertisseur Unités") {
      return lang === 'FR'
        ? "L'outil indispensable pour suivre des recettes ou des programmes sportifs internationaux.\n\n• 1 Kilogramme = 2.20462 Pounds (Lbs)\n• 1 Cup (Tasse US) = 240 ml (ou environ 250g pour des liquides denses)\n• 1 Ounce (Oz) = 28.35 grammes."
        : "The essential tool for following international recipes or workout programs.\n\n• 1 Kilogram = 2.20462 Pounds (Lbs)\n• 1 US Cup = 240 ml (or approx 250g for dense liquids)\n• 1 Ounce (Oz) = 28.35 grams.";
    }
    if (infoModal?.title === "Chronomètre Pro") {
      return lang === 'FR'
        ? "Un double chronomètre pensé pour la performance.\n\n• Mode Classique : Pour vos temps de repos entre les séries de force.\n• Mode HIIT / Tabata : Configurez vos phases de travail, de repos, et vos cycles. Le chronomètre vous guidera par des signaux sonores et haptiques (vibrations).\n\n💡 Le bouton 'Lune' active le mode OLED : l'écran devient noir pur, économisant massivement la batterie de votre téléphone pendant les longues séances."
        : "A dual timer built for performance.\n\n• Classic Mode: For your rest periods between strength sets.\n• HIIT / Tabata Mode: Configure work, rest, and cycles. The timer guides you with audio and haptic feedback (vibrations).\n\n💡 The 'Moon' button activates OLED mode: the screen turns pitch black, massively saving your phone's battery during long sessions.";
    }
    if (infoModal?.title === "Encyclopédie Super-Aliments") {
      return lang === 'FR'
        ? "Les super-aliments ne sont pas de simples modes, ce sont des concentrés biologiques d'antioxydants, vitamines et minéraux.\n\nUtilisés stratégiquement, ils permettent de :\n• Accélérer la récupération nerveuse (ex: Cacao cru, riche en Magnésium).\n• Lutter contre l'inflammation systémique des entraînements intenses (ex: Curcuma).\n• Augmenter l'oxygénation cellulaire (ex: Spiruline).\n\nCliquez sur chaque carte pour découvrir comment les intégrer efficacement dans votre routine."
        : "Superfoods are not just trends; they are biological concentrates of antioxidants, vitamins, and minerals.\n\nUsed strategically, they can:\n• Accelerate neural recovery (e.g., Raw Cacao, rich in Magnesium).\n• Fight systemic inflammation from intense training (e.g., Turmeric).\n• Increase cellular oxygenation (e.g., Spirulina).\n\nClick on each card to discover how to effectively integrate them into your routine.";
    }
    return "";
  };

  const renderBentoCard = (id: typeof activeTool, title: string, subtitle: string, icon: any, colorClass: string, bgColorClass: string, infoKey: string) => (
    <Card 
      onClick={() => setActiveTool(id)} 
      className={`cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-2 ring-opacity-50 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 group ${colorClass.replace('text', 'ring')} relative`}
    >
      <div className="absolute top-3 right-3 z-10 hover:scale-110 transition-transform">
        <button 
          onClick={(e) => { e.stopPropagation(); setInfoModal({ show: true, title: infoKey, desc: "" }); }} 
          className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800/80 rounded-full transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 shadow-sm"
          title="Infos Cliniques"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      <CardContent className="p-6 flex flex-col items-start h-full relative">
        <div className={`p-3 rounded-2xl mb-4 ${bgColorClass}`}>
          {icon}
        </div>
        <h3 className={`font-black text-lg mb-1 pr-6 ${colorClass}`}>{title}</h3>
        <p className="text-xs font-medium text-zinc-500 leading-relaxed">{subtitle}</p>
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <Plus className={`w-5 h-5 ${colorClass}`} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={`flex-1 min-h-screen transition-colors duration-500 pb-24 ${oledMode && activeTool === 'timer' ? 'bg-black' : 'bg-zinc-50 dark:bg-zinc-950'}`}>
      
      {!oledMode && (
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 px-4 py-4 flex items-center shadow-sm">
          {activeTool !== "hub" ? (
            <>
              <button onClick={() => setActiveTool("hub")} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors mr-3">
                <ArrowLeft className="w-5 h-5 dark:text-zinc-100" />
              </button>
              <h2 className="text-lg font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-100">{txt.title}</h2>
            </>
          ) : (
            <div className="flex items-center">
              <FlaskConical className="w-6 h-6 mr-3 text-teal-500" />
              <div>
                <h2 className="text-xl font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">{txt.title}</h2>
                <p className="text-[10px] font-bold text-zinc-500">{txt.sub}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`p-4 md:p-8 max-w-6xl mx-auto w-full ${oledMode ? 'p-0 h-screen w-screen fixed inset-0 z-[9999]' : 'animate-in fade-in slide-in-from-bottom-4 duration-500'}`}>
        
        {/* 🛡️ LE HUB BENTO GRID PREMIUM */}
        {activeTool === "hub" && (
          <div className="space-y-10">
            <div>
              <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center"><Target className="w-4 h-4 mr-2" /> Force & Puissance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {renderBentoCard("predict", "1RM & Zones", "Calculez votre répétition maximale et vos zones d'hypertrophie.", <Calculator className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />, "text-indigo-600 dark:text-indigo-400", "bg-indigo-50 dark:bg-indigo-900/30", "1RM & Zones")}
                {renderBentoCard("plates", "Calculateur de Disques", "Dites-lui le poids, il vous dit quoi mettre sur la barre.", <Target className="w-6 h-6 text-teal-600 dark:text-teal-400" />, "text-teal-600 dark:text-teal-400", "bg-teal-50 dark:bg-teal-900/30", "Calculateur de Disques")}
                {renderBentoCard("ffmi", "Indice FFMI", "Calculez votre limite génétique musculaire naturelle.", <Dna className="w-6 h-6 text-fuchsia-600 dark:text-fuchsia-400" />, "text-fuchsia-600 dark:text-fuchsia-400", "bg-fuchsia-50 dark:bg-fuchsia-900/30", "Indice FFMI (Masse Maigre)")}
                {renderBentoCard("elite", "Score DOTS", "Comparez votre force absolue avec les standards de Powerlifting.", <ShieldCheck className="w-6 h-6 text-red-600 dark:text-red-400" />, "text-red-600 dark:text-red-400", "bg-red-50 dark:bg-red-900/30", "Score DOTS")}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center"><HeartPulse className="w-4 h-4 mr-2" /> Cardio & Santé</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {renderBentoCard("vo2", "Test VO2 Max", "Évaluez votre capacité aérobie via le test de Cooper.", <Wind className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />, "text-cyan-600 dark:text-cyan-400", "bg-cyan-50 dark:bg-cyan-900/30", "Test VO2 Max (Cooper)")}
                {renderBentoCard("harvard", "Test de Harvard", "Testez la vitesse de récupération de votre rythme cardiaque.", <HeartPulse className="w-6 h-6 text-rose-600 dark:text-rose-400" />, "text-rose-600 dark:text-rose-400", "bg-rose-50 dark:bg-rose-900/30", "Test de Harvard (Récupération)")}
                {renderBentoCard("sweat", "Taux de Sudation", "Protocole clinique pour optimiser votre hydratation.", <Droplets className="w-6 h-6 text-blue-600 dark:text-blue-400" />, "text-blue-600 dark:text-blue-400", "bg-blue-50 dark:bg-blue-900/30", "Taux de Sudation")}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center"><Apple className="w-4 h-4 mr-2" /> Nutrition Clinique</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {renderBentoCard("fats", "Encyclopédie Lipides", "Sat., Insat., Oméga-3 et point de fumée des huiles.", <Droplet className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />, "text-yellow-600 dark:text-yellow-400", "bg-yellow-50 dark:bg-yellow-900/30", "Comparateur Lipides")}
                {renderBentoCard("sugars", "Encyclopédie Glucides", "Index glycémique et nutriments des sucres et sirops.", <Wheat className="w-6 h-6 text-pink-600 dark:text-pink-400" />, "text-pink-600 dark:text-pink-400", "bg-pink-50 dark:bg-pink-900/30", "Comparateur Glucides & IG")}
                {renderBentoCard("superfoods", "Super-Aliments", "Les secrets biologiques pour booster votre récupération.", <Leaf className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />, "text-emerald-600 dark:text-emerald-400", "bg-emerald-50 dark:bg-emerald-900/30", "Encyclopédie Super-Aliments")}
                {renderBentoCard("rawcooked", "Ratio Cru / Cuit", "La correction essentielle pour ne plus fausser vos macros.", <Beef className="w-6 h-6 text-orange-600 dark:text-orange-400" />, "text-orange-600 dark:text-orange-400", "bg-orange-50 dark:bg-orange-900/30", "Ratio Cru / Cuit")}
                {renderBentoCard("nuts", "Calculateur Oléagineux", "Fini de peser : 1 poignée d'amandes = macros exactes.", <Nut className="w-6 h-6 text-amber-600 dark:text-amber-400" />, "text-amber-600 dark:text-amber-400", "bg-amber-50 dark:bg-amber-900/30", "Calculateur d'Oléagineux")}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center"><Wrench className="w-4 h-4 mr-2" /> Utilitaires Sportifs</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderBentoCard("convert", "Convertisseur Unités", "Kilos en Pounds, Cups en Grammes, Oz en ml.", <ArrowRightLeft className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />, "text-emerald-600 dark:text-emerald-400", "bg-emerald-50 dark:bg-emerald-900/30", "Convertisseur Unités")}
                {renderBentoCard("timer", "Chronomètre Pro", "Minuteur classique et HIIT (Mode OLED intégré).", <Timer className="w-6 h-6 text-slate-600 dark:text-slate-400" />, "text-slate-600 dark:text-slate-400", "bg-slate-50 dark:bg-slate-900/30", "Chronomètre Pro")}
              </div>
            </div>
          </div>
        )}

        {/* --- DÉTAIL DES OUTILS --- */}

        {/* 🛡️ 1RM PREDICTOR & ZONES */}
        {activeTool === "predict" && (
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg relative animate-in fade-in zoom-in-95">
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
              {render1RMPercentages()}
            </CardContent>
          </Card>
        )}

        {/* 🛡️ ENCYCLOPÉDIE DES SUPER ALIMENTS */}
        {activeTool === "superfoods" && (
          <Card className="border-emerald-500/30 bg-white dark:bg-zinc-900 shadow-lg relative animate-in fade-in zoom-in-95">
            <CardHeader>
              <CardTitle className="flex items-center text-emerald-600 dark:text-emerald-400"><Leaf className="w-5 h-5 mr-2" /> Encyclopédie Super-Aliments</CardTitle>
              <CardDescription>Des concentrés biologiques pour hacker votre récupération.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {["Algues & Poudres", "Graines & Noix", "Racines & Épices", "Baies & Fruits"].map((cat) => (
                <div key={cat} className="space-y-4 mb-8">
                  {SUPERFOODS_DB.filter(s => s.cat === cat).length > 0 && (
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 pb-2">{cat}</h3>
                  )}
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
                      <div 
                        key={superfood.id} 
                        onClick={() => setDetailModal({ show: true, type: "superfood", data: superfood })}
                        className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col space-y-4 hover:border-emerald-500 hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer group relative"
                      >
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                          <Plus className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center pr-4">
                            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                              <IconComponent className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h4 className="font-black text-zinc-900 dark:text-zinc-100 text-base group-hover:text-emerald-600 transition-colors pr-6">{superfood.name}</h4>
                          </div>
                          <div className="shrink-0 hidden sm:block">
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                              {superfood.highlight}
                            </span>
                          </div>
                        </div>

                        {/* Affichage Mobile du badge */}
                        <div className="sm:hidden block">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 inline-block">
                            {superfood.highlight}
                          </span>
                        </div>

                        <div className="flex flex-col space-y-1 mt-2">
                          <span className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest">Actifs Principaux</span>
                          <span className="text-xs font-bold text-indigo-500">{superfood.nutrients}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 🛡️ ENCYCLOPÉDIE DES LIPIDES (Modales Détails) */}
        {activeTool === "fats" && (
          <Card className="border-yellow-500/30 bg-white dark:bg-zinc-900 shadow-lg relative animate-in fade-in zoom-in-95">
            <CardHeader>
              <CardTitle className="flex items-center text-yellow-600 dark:text-yellow-400"><Droplet className="w-5 h-5 mr-2" /> Encyclopédie Lipides</CardTitle>
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
                      <div 
                        key={fat.id} 
                        onClick={() => setDetailModal({ show: true, type: "fat", data: fat })}
                        className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col space-y-4 hover:border-yellow-500 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group relative"
                      >
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                          <Plus className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                          <div className="flex items-center space-x-3">
                            <div>
                              <h4 className="font-black text-zinc-900 dark:text-zinc-100 text-base group-hover:text-yellow-600 transition-colors pr-6">{fat.name}</h4>
                              <p className="text-xs font-bold text-zinc-500 mt-1 flex items-center">
                                <Thermometer className="w-3 h-3 mr-1 text-red-500" /> Point de fumée : <span className="text-zinc-800 dark:text-zinc-300 ml-1">{fat.smoke}°C</span>
                              </p>
                            </div>
                          </div>
                          <div className={`self-start sm:self-auto px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-black/5 dark:border-white/5 shadow-sm flex items-center ${o3Color}`}>
                            🐟 Oméga-3 : {fat.omega3}
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                            <span>Saturés ({fat.sat}%)</span>
                            <span>Mono ({fat.mono}%)</span>
                            <span>Poly ({fat.poly}%)</span>
                          </div>
                          <div className="w-full h-3 flex rounded-full overflow-hidden shadow-inner">
                            <div className="bg-red-400 h-full" style={{ width: `${fat.sat}%` }}></div>
                            <div className="bg-teal-400 h-full" style={{ width: `${fat.mono}%` }}></div>
                            <div className="bg-blue-400 h-full" style={{ width: `${fat.poly}%` }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 🛡️ ENCYCLOPÉDIE DES GLUCIDES & IG */}
        {activeTool === "sugars" && (
          <Card className="border-pink-500/30 bg-white dark:bg-zinc-900 shadow-lg relative animate-in fade-in zoom-in-95">
            <CardHeader>
              <CardTitle className="flex items-center text-pink-600 dark:text-pink-400"><Wheat className="w-5 h-5 mr-2" /> Encyclopédie Glucides & IG</CardTitle>
              <CardDescription>Cliquez sur un sucre pour lire son analyse clinique détaillée.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {["Naturels & Complets", "Raffinés & Sirops", "Sportifs (Intra-Workout)", "Édulcorants"].map((cat) => (
                <div key={cat} className="space-y-4 mb-8">
                  {SUGARS_DB.filter(s => s.cat === cat).length > 0 && (
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 pb-2">{cat}</h3>
                  )}
                  {SUGARS_DB.filter(s => s.cat === cat).map((sugar) => {
                    let giColor = "bg-green-500";
                    if (sugar.gi > 50) giColor = "bg-yellow-500";
                    if (sugar.gi > 60) giColor = "bg-red-500";

                    return (
                      <div 
                        key={sugar.id} 
                        onClick={() => setDetailModal({ show: true, type: "sugar", data: sugar })}
                        className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col space-y-4 hover:border-pink-500 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group relative"
                      >
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                          <Plus className="w-5 h-5 text-pink-500" />
                        </div>
                        <div className="flex justify-between items-center">
                          <h4 className="font-black text-zinc-900 dark:text-zinc-100 text-base pr-4 group-hover:text-pink-600 transition-colors">{sugar.name}</h4>
                          <div className="flex flex-col items-end shrink-0 pr-6 sm:pr-8">
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Index Glycémique</span>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span className="font-black text-lg text-zinc-800 dark:text-zinc-200">{sugar.gi}</span>
                              <div className={`w-3 h-3 rounded-full ${giColor} shadow-sm`}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* --- AUTRES OUTILS SANS CHANGEMENT (Plates, FFMI, VO2, Harvard, Convert, Nuts, RawCooked, Timer) --- */}
        {activeTool === "plates" && (
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg animate-in fade-in zoom-in-95 relative">
            <CardHeader>
              <CardTitle className="flex items-center text-teal-600 dark:text-teal-400"><Target className="w-5 h-5 mr-2" /> {txt.plateCalc}</CardTitle>
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

        {activeTool === "ffmi" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <Card className="border-fuchsia-500/30 bg-white dark:bg-zinc-900 shadow-lg relative">
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
          </div>
        )}

        {activeTool === "elite" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <Card className="border-red-500/30 bg-white dark:bg-zinc-900 shadow-lg relative">
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
          </div>
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
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <Card className="border-fuchsia-500/30 bg-white dark:bg-zinc-900 shadow-lg relative">
              <CardHeader>
                <CardTitle className="flex items-center text-fuchsia-600 dark:text-fuchsia-400 pr-8"><Droplets className="w-5 h-5 mr-2" /> {txt.sweatTitle}</CardTitle>
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

        {activeTool === "rawcooked" && (
          <Card className="border-orange-500/30 bg-white dark:bg-zinc-900 shadow-lg relative animate-in fade-in zoom-in-95">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-600 dark:text-orange-400"><Beef className="w-5 h-5 mr-2" /> Ratio Cru / Cuit</CardTitle>
              <CardDescription>Ne faussez plus vos macros à cause de l'eau.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
                <button onClick={() => setFoodType("meat")} className={`flex-1 py-2 font-bold text-xs rounded-lg transition-colors ${foodType === "meat" ? "bg-white dark:bg-zinc-900 text-orange-600 shadow-sm" : "text-zinc-500"}`}>Viande/Poisson</button>
                <button onClick={() => setFoodType("rice")} className={`flex-1 py-2 font-bold text-xs rounded-lg transition-colors ${foodType === "rice" ? "bg-white dark:bg-zinc-900 text-orange-600 shadow-sm" : "text-zinc-500"}`}>Riz/Pâtes</button>
                <button onClick={() => setFoodType("lentils")} className={`flex-1 py-2 font-bold text-xs rounded-lg transition-colors ${foodType === "lentils" ? "bg-white dark:bg-zinc-900 text-orange-600 shadow-sm" : "text-zinc-500"}`}>Légumineuses</button>
              </div>

              <div className="flex items-center justify-between space-x-4">
                <div className={`flex-1 space-y-2 p-4 rounded-xl border-2 transition-colors ${isRawInput ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' : 'border-zinc-200 dark:border-zinc-800'}`} onClick={() => setIsRawInput(true)}>
                  <Label className={`font-black uppercase tracking-widest text-xs ${isRawInput ? 'text-orange-600' : 'text-zinc-400'}`}>Poids Cru</Label>
                  <Input type="number" value={isRawInput ? foodWeight : getRawCookedResult() || ""} onChange={(e) => { setIsRawInput(true); setFoodWeight(e.target.value); }} className={`font-black text-2xl h-14 text-center ${isRawInput ? 'bg-white dark:bg-zinc-950' : 'bg-transparent border-none'}`} disabled={!isRawInput} />
                </div>
                
                <ArrowRightLeft className="w-8 h-8 text-zinc-300 dark:text-zinc-700 shrink-0" />
                
                <div className={`flex-1 space-y-2 p-4 rounded-xl border-2 transition-colors ${!isRawInput ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' : 'border-zinc-200 dark:border-zinc-800'}`} onClick={() => setIsRawInput(false)}>
                  <Label className={`font-black uppercase tracking-widest text-xs ${!isRawInput ? 'text-orange-600' : 'text-zinc-400'}`}>Poids Cuit</Label>
                  <Input type="number" value={!isRawInput ? foodWeight : getRawCookedResult() || ""} onChange={(e) => { setIsRawInput(false); setFoodWeight(e.target.value); }} className={`font-black text-2xl h-14 text-center ${!isRawInput ? 'bg-white dark:bg-zinc-950' : 'bg-transparent border-none'}`} disabled={isRawInput} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTool === "convert" && (
          <div className="space-y-4 animate-in fade-in zoom-in-95">
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg relative">
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

        {activeTool === "nuts" && (
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg animate-in fade-in zoom-in-95 relative">
            <CardHeader>
              <CardTitle className="flex items-center text-amber-600 dark:text-amber-500"><Nut className="w-5 h-5 mr-2" /> {txt.nutTitle}</CardTitle>
              <CardDescription>{txt.nutSub}</CardDescription>
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
                <Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.handfuls}</Label>
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
        )}

        {activeTool === "timer" && (
          <div className={`space-y-4 h-full flex flex-col animate-in fade-in zoom-in-95 ${oledMode ? 'justify-center items-center' : ''}`}>
            {!oledMode && (
              <div className="flex justify-center mb-4">
                <div className="bg-zinc-200/50 dark:bg-zinc-900 p-1 rounded-xl flex space-x-1">
                  <button onClick={() => setTimerMode("hiit")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timerMode === 'hiit' ? 'bg-white dark:bg-zinc-950 text-red-500 shadow-sm' : 'text-zinc-500'}`}>HIIT / Tabata</button>
                  <button onClick={() => setTimerMode("classic")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timerMode === 'classic' ? 'bg-white dark:bg-zinc-950 text-blue-500 shadow-sm' : 'text-zinc-500'}`}>{txt.classic}</button>
                </div>
              </div>
            )}

            {timerMode === "classic" && (
              <Card className={`transition-all duration-500 ${oledMode ? 'border-none bg-transparent shadow-none w-full' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg relative'}`}>
                {!oledMode && (
                  <CardHeader className="text-center pb-2 relative">
                    <button onClick={() => setOledMode(true)} className="absolute top-4 left-4 p-2 text-zinc-400 hover:text-white bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors" title="Mode OLED (Éco Batterie)">
                      <MoonStar className="w-5 h-5" />
                    </button>
                    <button onClick={() => setAudioEnabled(!audioEnabled)} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-blue-500 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors">
                      {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </button>
                    <CardTitle className="text-blue-500 font-black tracking-widest uppercase">Timer Classique</CardTitle>
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

                  <div className={`font-black tabular-nums transition-colors duration-500 ${oledMode ? 'text-[150px] sm:text-[200px] text-red-600 tracking-tighter' : 'text-7xl sm:text-8xl'} ${classicIsRunning && !oledMode ? 'text-blue-500' : (!oledMode ? 'text-zinc-900 dark:text-zinc-100' : '')}`}>
                    {formatTime(classicTime)}
                  </div>
                  
                  {!classicIsRunning && !oledMode && (
                    <div className="flex items-center space-x-2 mt-6">
                      <Input type="number" value={customMin} onChange={(e) => setCustomMin(e.target.value)} className="w-16 h-10 text-center font-bold" placeholder="Min" />
                      <span className="font-bold">:</span>
                      <Input type="number" value={customSec} onChange={(e) => setCustomSec(e.target.value)} className="w-16 h-10 text-center font-bold" placeholder="Sec" />
                      <Button onClick={setCustomClassicTime} variant="secondary" className="font-bold ml-2">Set</Button>
                    </div>
                  )}

                  <div className={`flex items-center space-x-4 w-full max-w-xs ${oledMode ? 'mt-16' : 'mt-8'}`}>
                    <Button onClick={toggleClassicTimer} className={`flex-1 h-20 text-xl font-black ${oledMode ? 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800' : (classicIsRunning ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/40')}`}>
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
              hiitState.isRunning || hiitState.phase === "DONE" || oledMode ? (
                <Card className={`transition-all duration-500 overflow-hidden w-full ${oledMode ? 'border-none bg-black shadow-none h-full flex flex-col justify-center' : `border-2 shadow-2xl ${getPhaseColor()}`}`}>
                  <CardContent className="flex flex-col items-center justify-center py-20 relative">
                    {!oledMode && (
                       <button onClick={resetHiit} className="absolute top-4 left-4 p-2 bg-black/20 text-white rounded-full hover:bg-black/40 transition-colors z-20"><X className="w-6 h-6" /></button>
                    )}
                    
                    <button onClick={() => setOledMode(!oledMode)} className={`absolute ${oledMode ? 'top-10 left-10 text-zinc-600 hover:text-white border border-zinc-800' : 'top-4 left-16 bg-black/20 text-white hover:bg-black/40'} p-3 rounded-full transition-colors z-20`} title="Mode OLED">
                      {oledMode ? <X className="w-6 h-6" /> : <MoonStar className="w-6 h-6" />}
                    </button>

                    <button onClick={() => setAudioEnabled(!audioEnabled)} className={`absolute ${oledMode ? 'top-10 right-10 text-zinc-600 hover:text-white border border-zinc-800' : 'top-4 right-4 bg-black/20 text-white hover:bg-black/40'} p-3 rounded-full transition-colors z-20`}>
                      {audioEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                    </button>

                    <h2 className={`font-black uppercase tracking-widest mb-2 opacity-90 drop-shadow-md ${oledMode ? 'text-zinc-600 text-3xl' : 'text-2xl sm:text-4xl'}`}>
                      {txt[hiitState.phase.toLowerCase() as keyof typeof txt] || hiitState.phase}
                    </h2>
                    <div className={`font-black tabular-nums leading-none mb-8 ${oledMode ? 'text-[150px] sm:text-[200px] tracking-tighter text-red-600' : 'text-[120px] sm:text-[160px] drop-shadow-xl'}`}>
                      {hiitState.phase === "DONE" ? "✅" : formatTime(hiitState.timeLeft)}
                    </div>
                    {hiitState.phase !== "PREPARE" && hiitState.phase !== "DONE" && hiitState.phase !== "COOL_DOWN" && (
                      <div className={`flex space-x-8 text-xl font-bold px-6 py-3 rounded-2xl ${oledMode ? 'bg-zinc-900 border border-zinc-800 text-zinc-500' : 'bg-black/20 backdrop-blur-sm'}`}>
                        <div className="text-center"><span className="block text-xs uppercase opacity-70 mb-1">{txt.cycles}</span>{hiitState.currentCycle} / {hiitConfig.cycles}</div>
                        <div className={`w-px ${oledMode ? 'bg-zinc-800' : 'bg-white/20'}`}></div>
                        <div className="text-center"><span className="block text-xs uppercase opacity-70 mb-1">{txt.sets}</span>{hiitState.currentSet} / {hiitConfig.sets}</div>
                      </div>
                    )}
                    <Button onClick={toggleHiit} className={`mt-12 h-20 px-12 text-2xl font-black shadow-xl ${oledMode ? 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}>
                      {hiitState.phase === "DONE" ? <RotateCcw className="w-8 h-8 mr-2" /> : (hiitState.isRunning ? <Pause className="w-8 h-8 mr-2" /> : <Play className="w-8 h-8 mr-2" />)}
                      {hiitState.phase === "DONE" ? txt.reset : (hiitState.isRunning ? txt.pause : "Reprendre")}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg relative">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <CardTitle className="text-red-500 font-black tracking-widest uppercase flex items-center">
                      <Activity className="w-5 h-5 mr-2" /> HIIT Pro
                    </CardTitle>
                    <div className="flex space-x-2">
                      <button onClick={() => setOledMode(true)} className="p-2 text-zinc-400 hover:text-white bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors" title="Mode OLED (Éco Batterie)">
                        <MoonStar className="w-4 h-4" />
                      </button>
                      <button onClick={() => setAudioEnabled(!audioEnabled)} className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${audioEnabled ? 'bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-900/30 dark:border-teal-800 dark:text-teal-400' : 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400'}`}>
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
              {getModalContent()}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setInfoModal(null)} className="w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold">
              {lang === 'FR' ? "Compris" : "Got it"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🛡️ MODALE DÉTAILLÉE POUR LIPIDES, SUCRES, 1RM ZONES ET SUPER ALIMENTS */}
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

          {/* 🛡️ MODALE POUR SUPER ALIMENTS */}
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
            <Button onClick={() => setDetailModal(null)} className="w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
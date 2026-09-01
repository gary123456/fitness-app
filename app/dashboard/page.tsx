"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Activity, Flame, Scale, Target, Droplets, Settings, LogOut, Trash2, Edit3, AlertTriangle, Utensils, Pill, Calendar, Info } from "lucide-react";
import { calculateAge, calculateBMI, calculateBMR, calculateTDEE, calculateEstimatedBodyFat, calculateIdealWeight, calculateWaterIntake, calculateEstimatedVO2Max, calculateTargetCalories, calculateMacros, getMicronutrients } from "@/lib/fitness";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NUTRITION_DATABASE } from "@/lib/nutrition-db";
import { useLanguage } from "@/lib/useLanguage";

interface ExtraSport { id: string; label: string; }

const EXTRA_SPORTS: ExtraSport[] = [ 
  { id: "jjb", label: "JJB / MMA" }, { id: "football", label: "Football / Rugby" }, 
  { id: "basketball", label: "Basketball / Volley" }, { id: "running", label: "Running / Sprint" }, 
  { id: "natation", label: "Natation" }, { id: "cyclisme", label: "Cyclisme / Vélo" }, 
  { id: "randonnee", label: "Randonnée / Marche" }, { id: "padel_tennis", label: "Padel / Tennis" } 
];

const InfoModal = ({ title, description, btnText }: { title: string, description: string, btnText: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-zinc-400 hover:text-teal-500 transition-colors ml-2"><Info className="w-4 h-4" /></button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center text-teal-600 dark:text-teal-400"><Info className="w-5 h-5 mr-2"/> {title}</DialogTitle>
            <DialogDescription asChild><div className="text-zinc-600 dark:text-zinc-400 pt-3 leading-relaxed text-sm font-medium">{description}</div></DialogDescription>
          </DialogHeader>
          <Button className="w-full mt-2 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900" onClick={() => setOpen(false)}>{btnText}</Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [editWeight, setEditWeight] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editSchedule, setEditSchedule] = useState<Record<string, string[]>>({});
  
  const { lang } = useLanguage();

  const t = {
    FR: { title: "Moniteur", sub: "Analyse systémique et prescriptions métaboliques.", param: "Paramètres", account: "Mon Compte", edit: "Modifier constantes & planning", out: "Se déconnecter", del: "Effacer l'écosystème", goal: "Objectif Actuel", ideal: "Idéal théorique", cals: "Calories Cibles", maint: "Maintien (TDEE)", bio: "Biométrie", bmi: "IMC", weight: "Poids Normal", under: "Insuffisance pondérale", over: "Surpoids", obese: "Obésité", macros: "Matrice des Macronutriments", macrosSub: "Ajustés pour l'objectif de", prot: "Protéines", carb: "Glucides", fat: "Lipides", equiv: "Équivalences alimentaires", water: "Hydratation cible", micros: "Micronutriments", microsSub: "Cofacteurs métaboliques recommandés", cancel: "Annuler", save: "Sauvegarder", confirm: "Confirmer", deleteMsg: "Tapez 'SUPPRIMER'", deleteWarn: "Cette action détruira définitivement vos données.", understood: "Compris", adjust: "Ajuster mon profil" },
    EN: { title: "Monitor", sub: "Systemic analysis and metabolic prescriptions.", param: "Settings", account: "My Account", edit: "Edit metrics & schedule", out: "Log Out", del: "Purge Ecosystem", goal: "Current Goal", ideal: "Theoretical ideal", cals: "Target Calories", maint: "Maintenance (TDEE)", bio: "Biometrics", bmi: "BMI", weight: "Normal Weight", under: "Underweight", over: "Overweight", obese: "Obese", macros: "Macronutrient Matrix", macrosSub: "Adjusted for", prot: "Proteins", carb: "Carbs", fat: "Fats", equiv: "Food equivalents", water: "Hydration target", micros: "Micronutrients", microsSub: "Recommended metabolic cofactors", cancel: "Cancel", save: "Save", confirm: "Confirm", deleteMsg: "Type 'DELETE'", deleteWarn: "This action will permanently destroy your data.", understood: "Got it", adjust: "Adjust my profile" }
  };
  const txt = t[lang as keyof typeof t] || t.FR;
  const DAYS = lang === "FR" ? { monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi", sunday: "Dimanche" } : { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!profileData) { router.push("/onboarding"); return; }

      setProfile(profileData);
      setEditWeight(profileData.weight_kg.toString());
      setEditGoal(profileData.current_goal);
      setEditSchedule(profileData.weekly_schedule || { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] });

      const age = calculateAge(profileData.birth_date);
      const bmi = calculateBMI(profileData.weight_kg, profileData.height_cm);
      const bmr = calculateBMR(profileData.weight_kg, profileData.height_cm, age, profileData.gender);
      const tdee = calculateTDEE(bmr, profileData.activity_level);
      const img = calculateEstimatedBodyFat(bmi, age, profileData.gender);
      const idealWeight = calculateIdealWeight(profileData.height_cm, profileData.gender);
      const water = calculateWaterIntake(profileData.weight_kg, profileData.activity_level);
      const vo2max = calculateEstimatedVO2Max(age, bmi, profileData.gender, profileData.activity_level);
      const targetCals = calculateTargetCalories(tdee, profileData.current_goal);
      const macros = calculateMacros(profileData.weight_kg, targetCals, profileData.current_goal, profileData.training_frequency);
      const micros = getMicronutrients(profileData.gender, profileData.training_frequency, profileData.weight_kg);

      setMetrics({ age, bmi, bmr, tdee, targetCals, macros, micros, img, idealWeight, water, vo2max });
    } catch (error) { console.error("Erreur:", error); } finally { setLoading(false); }
  };

  const handleUpdateProfile = async () => {
    setActionLoading(true);
    try {
      const newWeight = parseFloat(editWeight);
      await supabase.from("profiles").update({ weight_kg: newWeight, current_goal: editGoal, weekly_schedule: editSchedule }).eq("id", profile.id);
      if (newWeight !== profile.weight_kg) await supabase.from("measurements").insert([{ user_id: profile.id, weight_kg: newWeight }]);
      setIsEditModalOpen(false);
      await fetchDashboardData(); 
    } catch (error) { alert("Erreur."); } finally { setActionLoading(false); }
  };

  const handleDeleteProfile = async () => {
    if (deleteConfirmText !== "SUPPRIMER" && deleteConfirmText !== "DELETE") return;
    setActionLoading(true);
    try {
      await supabase.from("profiles").delete().eq("id", profile.id);
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) { alert("Erreur."); } finally { setActionLoading(false); }
  };

  const handleSportToggle = (day: string, sportId: string, checked: boolean) => {
    setEditSchedule((prev) => {
      const daySports = prev[day] || [];
      return {
        ...prev,
        [day]: checked ? [...daySports, sportId] : daySports.filter((s) => s !== sportId),
      };
    });
  };

  if (loading || !profile || !metrics) return <div className="flex min-h-[80vh] items-center justify-center"><div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>;

  let bmiColor = "text-teal-500"; let bmiLabel = txt.weight;
  if (metrics.bmi < 18.5) { bmiColor = "text-blue-500"; bmiLabel = txt.under; }
  else if (metrics.bmi >= 25 && metrics.bmi < 30) { bmiColor = "text-orange-500"; bmiLabel = txt.over; }
  else if (metrics.bmi >= 30) { bmiColor = "text-red-600 font-bold"; bmiLabel = txt.obese; }

  const formatGoal = (goal: string, l: string) => {
    if (l === "EN") return { perte_poids: "Fat Loss", recomposition: "Body Recomp", performance: "Performance", prise_masse: "Muscle Building" }[goal] || goal;
    return { perte_poids: "Perte de masse grasse", recomposition: "Recomposition Corporelle", performance: "Performance & Force", prise_masse: "Prise de masse musculaire" }[goal] || goal;
  };

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{txt.title}, {profile.first_name}</h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">{txt.sub}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="shadow-sm border-zinc-300 dark:border-zinc-700"><Settings className="w-4 h-4 mr-2" /> {txt.param}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DropdownMenuLabel>{txt.account}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsEditModalOpen(true)} className="cursor-pointer font-medium dark:text-zinc-100"><Edit3 className="w-4 h-4 mr-2" /> {txt.edit}</DropdownMenuItem>
            <DropdownMenuItem onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="cursor-pointer font-medium text-orange-600"><LogOut className="w-4 h-4 mr-2" /> {txt.out}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsDeleteModalOpen(true)} className="cursor-pointer font-medium text-red-600"><Trash2 className="w-4 h-4 mr-2" /> {txt.del}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-md border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold opacity-80">{txt.goal}</CardTitle>
            <Target className="h-5 w-5 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black leading-tight mb-1 uppercase tracking-tight">{formatGoal(profile.current_goal, lang)}</div>
            <p className="text-xs opacity-80 font-medium">{txt.ideal} : {metrics.idealWeight} kg</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-300 flex items-center">
              {txt.cals}
              <InfoModal title={lang==="FR"?"Métabolisme":"Metabolism"} description={lang==="FR"?"Le TDEE est le nombre de calories que vous brûlez. Ajusté de +/- 300 kcal selon l'objectif.":"TDEE is the calories you burn daily. Adjusted by +/- 300 kcal based on goal."} btnText={txt.understood} />
            </CardTitle>
            <Flame className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{metrics.targetCals} <span className="text-lg font-medium text-zinc-500">kcal</span></div>
            <p className="text-xs text-zinc-500 mt-1 font-medium">{txt.maint} : {metrics.tdee} kcal</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-300 flex items-center">
              {txt.bio}
              <InfoModal title={txt.bmi} description={lang==="FR"?"Évalue la corpulence par rapport à la taille. Le muscle pesant lourd, fiez-vous au miroir.":"Evaluates body mass relative to height. Muscle is heavy, so trust the mirror."} btnText={txt.understood} />
            </CardTitle>
            <Scale className={`h-5 w-5 ${bmiColor}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{profile.weight_kg} <span className="text-lg font-medium text-zinc-500">kg</span></div>
            <p className={`text-xs mt-1 font-bold ${bmiColor}`}>{txt.bmi} : {metrics.bmi} ({bmiLabel})</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-300 flex items-center">
              IMG & VO2Max
              <InfoModal title="IMG & VO2Max" description={lang==="FR"?"IMG : Estimation masse grasse. VO2 : Endurance.":"IMG: Body fat estimation. VO2: Endurance capacity."} btnText={txt.understood} />
            </CardTitle>
            <Activity className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">~{metrics.img}<span className="text-lg font-medium text-zinc-500">%</span></div>
            <p className="text-xs text-zinc-500 mt-1 font-medium">VO2: {metrics.vo2max} ml/kg/min</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-zinc-900 dark:text-zinc-100">
              <Utensils className="h-5 w-5 text-zinc-700 dark:text-zinc-300 mr-2" />
              <span>{txt.macros}</span>
              <InfoModal title={txt.macros} description={lang==="FR"?"Protéines: Muscle. Glucides: Énergie. Lipides: Hormones.":"Proteins: Muscle. Carbs: Energy. Fats: Hormones."} btnText={txt.understood} />
            </CardTitle>
            <CardDescription>{txt.macrosSub} {formatGoal(profile.current_goal, lang).toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold"><span className="text-blue-600 dark:text-blue-400">{txt.prot} ({metrics.macros.proteinPct}%)</span><span className="dark:text-zinc-100">{metrics.macros.protein}g</span></div>
              <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all" style={{ width: `${metrics.macros.proteinPct}%` }} /></div>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="p" className="border-none">
                  <AccordionTrigger className="text-xs text-zinc-500 dark:text-zinc-400 py-1 hover:no-underline">{txt.equiv}</AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <ul className="space-y-2 text-xs max-h-48 overflow-y-auto pr-2">
                      {NUTRITION_DATABASE.proteins.map((f, i) => (<li key={i} className="flex flex-col bg-zinc-50 dark:bg-zinc-950 p-2 rounded border dark:border-zinc-800"><span className="font-bold text-zinc-800 dark:text-zinc-200">{lang==="FR"?f.name:(f.name==="Poulet (Blanc)"?"Chicken Breast":f.name)}</span><span className="text-blue-600 font-medium">{f.density}</span></li>))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold"><span className="text-green-600 dark:text-green-400">{txt.carb} ({metrics.macros.carbPct}%)</span><span className="dark:text-zinc-100">{metrics.macros.carbs}g</span></div>
              <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-green-500 transition-all" style={{ width: `${metrics.macros.carbPct}%` }} /></div>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="c" className="border-none">
                  <AccordionTrigger className="text-xs text-zinc-500 dark:text-zinc-400 py-1 hover:no-underline">{txt.equiv}</AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <ul className="space-y-2 text-xs max-h-48 overflow-y-auto pr-2">
                      {NUTRITION_DATABASE.carbs.map((f, i) => (<li key={i} className="flex flex-col bg-zinc-50 dark:bg-zinc-950 p-2 rounded border dark:border-zinc-800"><span className="font-bold text-zinc-800 dark:text-zinc-200">{f.name}</span><span className="text-green-600 font-medium">{f.density}</span></li>))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold"><span className="text-orange-500">{txt.fat} ({metrics.macros.fatPct}%)</span><span className="dark:text-zinc-100">{metrics.macros.fat}g</span></div>
              <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-orange-500 transition-all" style={{ width: `${metrics.macros.fatPct}%` }} /></div>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="f" className="border-none">
                  <AccordionTrigger className="text-xs text-zinc-500 dark:text-zinc-400 py-1 hover:no-underline">{txt.equiv}</AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <ul className="space-y-2 text-xs max-h-48 overflow-y-auto pr-2">
                      {NUTRITION_DATABASE.fats.map((f, i) => (<li key={i} className="flex flex-col bg-zinc-50 dark:bg-zinc-950 p-2 rounded border dark:border-zinc-800"><span className="font-bold text-zinc-800 dark:text-zinc-200">{f.name}</span><span className="text-orange-500 font-medium">{f.density}</span></li>))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            
            <div className="pt-2 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{txt.water}</span>
              <span className="font-bold flex items-center dark:text-zinc-100"><Droplets className="h-4 w-4 mr-1 text-blue-400"/> {metrics.water} L</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-xl text-zinc-900 dark:text-zinc-100">
              <Pill className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
              <span>{txt.micros}</span>
              <InfoModal title={txt.micros} description={lang==="FR"?"Vitamines et minéraux vitaux. Clé d'un bon sommeil et de la testostérone.":"Vital vitamins and minerals. Key for sleep and testosterone."} btnText={txt.understood} />
            </CardTitle>
            <CardDescription>{txt.microsSub}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.micros.map((micro: any, index: number) => (
                <div key={index} className="flex flex-col space-y-1 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{micro.name}</span>
                    <span className="text-sm font-extrabold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded">{micro.amount}</span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">{lang==="EN" ? (micro.name.includes("Zinc") ? "Testosterone & Immunity" : "Sleep & Recovery") : micro.role}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader><DialogTitle className="dark:text-zinc-100">{txt.adjust}</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-zinc-300">Poids (kg)</Label>
                  <Input type="number" step="0.1" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100" />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-zinc-300">Objectif Principal</Label>
                  <Select value={editGoal} onValueChange={setEditGoal}>
                    <SelectTrigger className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"><SelectValue /></SelectTrigger>
                    <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                      <SelectItem value="perte_poids">Perte de masse grasse</SelectItem>
                      <SelectItem value="recomposition">Recomposition corporelle</SelectItem>
                      <SelectItem value="performance">Performance martiale</SelectItem>
                      <SelectItem value="prise_masse">Prise de masse musculaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-bold flex items-center border-b border-zinc-200 dark:border-zinc-800 pb-2 dark:text-zinc-100"><Calendar className="h-4 w-4 mr-2"/> Sports</h4>
              <div className="space-y-3">
                {Object.keys(DAYS).map((dayKey) => (
                  <div key={dayKey} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 gap-2 text-sm">
                    <span className="font-bold w-24 text-zinc-700 dark:text-zinc-300">{DAYS[dayKey as keyof typeof DAYS]}</span>
                    <div className="flex flex-wrap gap-3">
                      {EXTRA_SPORTS.map((sport) => {
                        const isChecked = (editSchedule[dayKey] as string[] || []).includes(sport.id);
                        return (
                          <div key={sport.id} className="flex items-center space-x-1">
                            <Checkbox id={`edit-${dayKey}-${sport.id}`} checked={isChecked} onCheckedChange={(c) => {
                              if (typeof c === 'boolean') handleSportToggle(dayKey, sport.id, c);
                            }} className="dark:border-zinc-700 dark:data-[state=checked]:bg-teal-500" />
                            <Label htmlFor={`edit-${dayKey}-${sport.id}`} className="text-xs cursor-pointer dark:text-zinc-400">{sport.label}</Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">{txt.cancel}</Button>
            <Button onClick={handleUpdateProfile} disabled={actionLoading} className="bg-teal-500 text-white hover:bg-teal-600">{actionLoading ? "..." : txt.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px] border-red-200 bg-red-50 dark:border-red-900 dark:bg-zinc-950">
          <DialogHeader><DialogTitle className="text-red-600 dark:text-red-500 flex items-center"><AlertTriangle className="mr-2 h-5 w-5"/> Purge</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-red-700 dark:text-red-400">{txt.deleteMsg}</Label>
              <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} className="border-red-300 dark:border-red-900 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="dark:border-zinc-800 dark:text-zinc-300">{txt.cancel}</Button>
            <Button variant="destructive" onClick={handleDeleteProfile} disabled={(deleteConfirmText !== "SUPPRIMER" && deleteConfirmText !== "DELETE") || actionLoading} className="dark:bg-red-600 dark:hover:bg-red-700">{txt.confirm}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
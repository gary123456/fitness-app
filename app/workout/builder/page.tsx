"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Search, Plus, Dumbbell, Save, Trash2, Info, CalendarCheck, Loader2, Star, Filter, ChevronUp, ChevronDown, Activity, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/useLanguage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

interface Exercise {
  id: string;
  name: string;
  target_muscle: string;
  equipment_required: string;
  cns_impact: number;
  movement_pattern: string;
  gif_url?: string;
}

interface PlannedExercise {
  exercise: Exercise;
  sets: number;
  target_reps: string;
  rest_seconds: number;
}

const DAYS_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const MUSCLE_GROUPS = ["Tous", "Pectoraux", "Dos", "Jambes", "Épaules", "Biceps", "Triceps", "Abdos"];

export default function CustomBuilderPage() {
  const router = useRouter();
  const { lang } = useLanguage();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadingEx, setLoadingEx] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("Tous");
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null);
  const [selectedPatternFilter, setSelectedPatternFilter] = useState<string | null>(null);
  const [selectedEquipmentFilter, setSelectedEquipmentFilter] = useState<string | null>(null); // NOUVEAU FILTRE EQUIPEMENT
  
  const [programName, setProgramName] = useState("");
  const [activeDay, setActiveDay] = useState("monday");
  const [plan, setPlan] = useState<Record<string, PlannedExercise[]>>({
    monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
  });

  const [infoModal, setInfoModal] = useState({ show: false, exercise: null as any });
  const [guideModal, setGuideModal] = useState(false);

  const t = {
    FR: { 
      title: "Constructeur de Programme", sub: "Créez votre routine sur-mesure", catalog: "Bibliothèque", search: "Rechercher...", myPlan: "Ma Semaine", save: "Sauvegarder", empty: "Aucun exercice pour ce jour.", reps: "Reps", sets: "Séries", rest: "Repos (s)", progName: "Nom du programme", progPlaceholder: "Ex: Routine Hybride", error: "Erreur lors de la sauvegarde.",
      pattern: "Mouvement", allPatterns: "Tous les mouvements", push: "Poussée (Push)", pull: "Tirage (Pull)", squat: "Genou (Squat)", hinge: "Hanche (Hinge)", core: "Gainage (Core)",
      equipment: "Matériel", allEquipment: "Tout le matériel", bodyweight: "Poids de Corps", gym: "Salle (Machines)", homeGym: "Haltères / Léger",
      guideTitle: "Structure Scientifique", guideSub: "Comment construire une séance optimale.",
      g1: "1. Exercice Principal (4 ou 5 Étoiles)", g1d: "Placé au début quand le SNC est frais pour générer la tension mécanique maximale (ex: Squat, Tractions). Max 1 à 2 par séance.",
      g2: "2. Les Accessoires (3 ou 4 Étoiles)", g2d: "Ciblent les mêmes muscles avec plus de stabilité pour réduire le coût nerveux (ex: Presse à cuisses, Rowing).",
      g3: "3. Isolation & Métabolique (1 ou 2 Étoiles)", g3d: "Fin de séance. Épuise le muscle sans taxer le SNC (Machines, haltères légers).",
      g4: "L'Équilibre Full-Body", g4d: "Une séance athlétique complète doit croiser ces patrons de mouvements : Poussée (Push), Tirage (Pull), Dominante Genou (Squat), Dominante Hanche (Hinge) et Gainage (Core)."
    },
    EN: { 
      title: "Program Builder", sub: "Create your custom routine", catalog: "Library", search: "Search...", myPlan: "My Week", save: "Save", empty: "No exercises for this day.", reps: "Reps", sets: "Sets", rest: "Rest (s)", progName: "Program Name", progPlaceholder: "E.g. Hybrid Routine", error: "Error during save.",
      pattern: "Movement", allPatterns: "All movements", push: "Push", pull: "Pull", squat: "Squat (Knee)", hinge: "Hinge (Hip)", core: "Core",
      equipment: "Equipment", allEquipment: "All equipment", bodyweight: "Bodyweight", gym: "Gym (Machines)", homeGym: "Dumbbells / Light",
      guideTitle: "Scientific Structure", guideSub: "How to build an optimal session.",
      g1: "1. Main Lift (4-5 Stars)", g1d: "First exercise when CNS is fresh. Maximum mechanical tension (e.g. Squats, Pull-ups). Max 1-2 per session.",
      g2: "2. Accessories (3-4 Stars)", g2d: "Target the same muscles with more stability to reduce neural cost (e.g. Leg Press, Rows).",
      g3: "3. Isolation & Metabolic (1-2 Stars)", g3d: "End of session. Exhaust the muscle without taxing the CNS (Machines, light dumbbells).",
      g4: "Full-Body Balance", g4d: "A complete athletic session should cross these patterns: Push, Pull, Squat (Knee), Hinge (Hip), and Core."
    }
  };
  const txt = t[lang as keyof typeof t] || t.FR;
  const DAYS_LABELS = lang === "FR" 
    ? { monday: "Lun", tuesday: "Mar", wednesday: "Mer", thursday: "Jeu", friday: "Ven", saturday: "Sam", sunday: "Dim" }
    : { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };

  useEffect(() => {
    const fetchLib = async () => {
      const { data, error } = await supabase.from("exercise_library").select("*").order("name");
      if (data && !error) setExercises(data);
      setLoadingEx(false);
    };
    fetchLib();
  }, []);

  const filteredExercises = exercises.filter(ex => {
    const matchSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    let matchMuscle = false;
    const target = ex.target_muscle.toLowerCase();
    const filter = selectedMuscle.toLowerCase();

    // Filtre Muscle
    if (filter === "tous") matchMuscle = true;
    else if (filter === "jambes") matchMuscle = target.includes("quadriceps") || target.includes("ischio") || target.includes("mollet") || target.includes("fessier") || target.includes("jambe");
    else if (filter === "abdos") matchMuscle = target.includes("sangle abdominale") || target.includes("abdo") || target.includes("core");
    else if (filter === "épaules") matchMuscle = target.includes("épaule") || target.includes("epaule") || target.includes("delto");
    else if (filter === "dos") matchMuscle = target.includes("dos") || target.includes("lombaire") || target.includes("dorsal");
    else matchMuscle = target.includes(filter);

    // Filtre Étoiles (SNC)
    const matchStars = selectedStarFilter === null || ex.cns_impact === selectedStarFilter;

    // Filtre Patrons de Mouvements
    const patternLow = ex.movement_pattern?.toLowerCase() || "";
    let matchPattern = true;
    if (selectedPatternFilter) {
      if (selectedPatternFilter === "push") matchPattern = patternLow.includes("push");
      else if (selectedPatternFilter === "pull") matchPattern = patternLow.includes("pull");
      else if (selectedPatternFilter === "squat") matchPattern = patternLow.includes("squat") || patternLow.includes("lunge");
      else if (selectedPatternFilter === "hinge") matchPattern = patternLow.includes("hinge");
      else if (selectedPatternFilter === "core") matchPattern = patternLow.includes("core");
    }

    // NOUVEAU Filtre Équipement
    const eqLow = ex.equipment_required?.toLowerCase() || "";
    let matchEquipment = true;
    if (selectedEquipmentFilter) {
      if (selectedEquipmentFilter === "poids_corps") matchEquipment = eqLow.includes("poids_corps");
      else if (selectedEquipmentFilter === "salle") matchEquipment = eqLow.includes("salle");
      else if (selectedEquipmentFilter === "home_gym") matchEquipment = eqLow.includes("home_gym") || eqLow.includes("kettlebell");
    }

    return matchSearch && matchMuscle && matchStars && matchPattern && matchEquipment;
  });

  const getPatternLabel = () => {
    if (selectedPatternFilter === "push") return txt.push;
    if (selectedPatternFilter === "pull") return txt.pull;
    if (selectedPatternFilter === "squat") return txt.squat;
    if (selectedPatternFilter === "hinge") return txt.hinge;
    if (selectedPatternFilter === "core") return txt.core;
    return txt.pattern;
  };

  const getEquipmentLabel = () => {
    if (selectedEquipmentFilter === "poids_corps") return txt.bodyweight;
    if (selectedEquipmentFilter === "salle") return txt.gym;
    if (selectedEquipmentFilter === "home_gym") return txt.homeGym;
    return txt.equipment;
  };

  const getImageUrl = (ex: any, frame: 0 | 1) => {
    if (ex.gif_url && ex.gif_url.includes('github')) return `${ex.gif_url}/${frame}.jpg`;
    return `https://aojcwjsgcffkmrupzjdi.supabase.co/storage/v1/object/public/exercise-assets/${ex.id}/${frame}.webp`;
  };

  const addExercise = (ex: Exercise) => {
    setPlan(prev => ({
      ...prev,
      [activeDay]: [
        ...prev[activeDay],
        { exercise: ex, sets: 3, target_reps: "8-12", rest_seconds: ex.cns_impact >= 4 ? 120 : 90 }
      ]
    }));
  };

  const removeExercise = (day: string, index: number) => {
    setPlan(prev => {
      const newDay = [...prev[day]];
      newDay.splice(index, 1);
      return { ...prev, [day]: newDay };
    });
  };

  const updateExerciseConfig = (day: string, index: number, field: keyof PlannedExercise, value: any) => {
    setPlan(prev => {
      const newDay = [...prev[day]];
      newDay[index] = { ...newDay[index], [field]: value };
      return { ...prev, [day]: newDay };
    });
  };

  const totalExercisesPlanned = Object.values(plan).reduce((acc, curr) => acc + curr.length, 0);

  const saveProgram = async () => {
    if (totalExercisesPlanned === 0) return;
    setIsSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      const { data: existingCustoms } = await supabase.from("user_programs").select("id").eq("user_id", user.id).eq("program_type", "custom");
      if (existingCustoms && existingCustoms.length >= 3) {
        alert(lang === 'FR' ? "Limite atteinte (3 programmes perso max). Supprimez-en un dans l'onglet Programme." : "Limit reached (3 custom max). Delete one in the Workout tab.");
        setIsSaving(false);
        return;
      }

      await supabase.from("user_programs").update({ is_active: false }).eq("user_id", user.id);

      const finalName = programName.trim() !== "" ? programName.trim() : (lang === 'FR' ? "Programme Personnalisé" : "Custom Program");

      const { data: newProgram, error: progErr } = await supabase.from("user_programs").insert([{
        user_id: user.id,
        name: finalName,
        is_active: true,
        program_type: "custom"
      }]).select().single();

      if (progErr || !newProgram) throw progErr;

      let orderIndex = 0;
      for (const day of DAYS_ORDER) {
        const dailyExercises = plan[day];
        if (dailyExercises.length > 0) {
          const { data: newSession } = await supabase.from("workout_sessions").insert([{
            program_id: newProgram.id,
            day_name: day,
            order_index: orderIndex
          }]).select().single();

          if (newSession) {
            const inserts = dailyExercises.map((plannedEx, idx) => ({
              session_id: newSession.id,
              exercise_id: plannedEx.exercise.id,
              sets: plannedEx.sets,
              target_reps: plannedEx.target_reps,
              rest_seconds: plannedEx.rest_seconds,
              order_index: idx
            }));
            await supabase.from("workout_exercises").insert(inserts);
          }
          orderIndex++;
        }
      }

      router.push("/workout");
    } catch (error) {
      console.error(error);
      alert(txt.error);
      setIsSaving(false);
    }
  };

  const renderStars = (impact: number) => {
    const safeImpact = impact || 1;
    return (
      <div className="flex space-x-0.5 mt-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star 
            key={i} 
            className={`w-3 h-3 ${i < safeImpact ? (safeImpact >= 4 ? 'text-red-500 fill-red-500' : 'text-orange-500 fill-orange-500') : 'text-zinc-300 dark:text-zinc-700'}`} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-32 relative">
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
            <ArrowLeft className="w-5 h-5 dark:text-zinc-100" />
          </button>
          <div>
            <h2 className="text-lg font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{txt.title}</h2>
            <p className="text-xs text-zinc-500 font-medium">{txt.sub}</p>
          </div>
        </div>
        <Button onClick={saveProgram} disabled={isSaving || totalExercisesPlanned === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/20">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          <span className="hidden sm:inline">{txt.save}</span>
        </Button>
      </div>

      <div className="fixed bottom-6 right-4 sm:right-8 z-50 flex flex-col gap-3">
        <button 
          onClick={() => document.getElementById('library-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="w-12 h-12 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.15)] hover:scale-110 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-500 transition-all opacity-80 hover:opacity-100 focus:outline-none"
          title={lang === 'FR' ? "Haut (Bibliothèque)" : "Top (Library)"}
        >
          <ChevronUp className="w-6 h-6" />
        </button>
        <button 
          onClick={() => document.getElementById('plan-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="w-12 h-12 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.15)] hover:scale-110 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-500 transition-all opacity-80 hover:opacity-100 focus:outline-none"
          title={lang === 'FR' ? "Bas (Ma Semaine)" : "Bottom (My Week)"}
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full p-4 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:h-[calc(100vh-80px)]">
        
        <div id="library-section" className="flex flex-col space-y-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 lg:p-6 shadow-sm lg:overflow-hidden scroll-mt-24">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 flex items-center">
              <Search className="w-5 h-5 mr-2 text-indigo-500" /> {txt.catalog}
            </h3>
            <button onClick={() => setGuideModal(true)} className="flex items-center text-xs font-bold text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-900/30 px-3 py-1.5 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors">
              <BookOpen className="w-4 h-4 sm:mr-1.5" /> <span className="hidden sm:inline">Guide</span>
            </button>
          </div>
          
          <div className="space-y-3 shrink-0">
            <div className="flex items-center space-x-2">
              <Input 
                placeholder={txt.search} 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-indigo-500 font-medium flex-1"
              />
            </div>
            
            {/* LIGNE DES DROPDOWNS FILTRES CROISÉS */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className={`shrink-0 flex items-center px-3 border transition-colors outline-none ${selectedStarFilter !== null ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/50' : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                    <Filter className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline font-bold">{selectedStarFilter !== null ? `${selectedStarFilter} Étoiles` : "SNC"}</span>
                    {selectedStarFilter !== null && (
                      <span className="ml-1 sm:hidden w-5 h-5 flex items-center justify-center bg-orange-500 text-white rounded-full text-[10px] font-black">
                        {selectedStarFilter}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-zinc-200 dark:border-zinc-800 rounded-2xl p-2 w-48 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
                  <DropdownMenuItem onClick={() => setSelectedStarFilter(null)} className="font-bold cursor-pointer rounded-xl p-3 focus:bg-zinc-100 dark:focus:bg-zinc-900 outline-none">
                    Toutes les intensités
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800/50" />
                  {[5, 4, 3, 2, 1].map(star => (
                    <DropdownMenuItem key={star} onClick={() => setSelectedStarFilter(star)} className="font-bold cursor-pointer flex items-center rounded-xl p-3 focus:bg-orange-50 dark:focus:bg-orange-500/10 focus:text-orange-600 dark:focus:text-orange-400 outline-none">
                      <Star className={`w-4 h-4 mr-2 ${star >= 4 ? 'text-red-500 fill-red-500' : 'text-orange-500 fill-orange-500'}`} />
                      {star} {star > 1 ? 'Étoiles' : 'Étoile'}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className={`shrink-0 flex items-center px-3 border transition-colors outline-none ${selectedPatternFilter !== null ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/50' : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                    <Activity className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline font-bold">{getPatternLabel()}</span>
                    {selectedPatternFilter !== null && (
                      <span className="ml-1 sm:hidden w-2 h-2 rounded-full bg-teal-500"></span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-zinc-200 dark:border-zinc-800 rounded-2xl p-2 w-56 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
                  <DropdownMenuItem onClick={() => setSelectedPatternFilter(null)} className="font-bold cursor-pointer rounded-xl p-3 focus:bg-zinc-100 dark:focus:bg-zinc-900 outline-none">
                    {txt.allPatterns}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800/50" />
                  <DropdownMenuItem onClick={() => setSelectedPatternFilter("push")} className="font-bold cursor-pointer rounded-xl p-3 focus:bg-teal-50 dark:focus:bg-teal-500/10 outline-none">{txt.push}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedPatternFilter("pull")} className="font-bold cursor-pointer rounded-xl p-3 focus:bg-teal-50 dark:focus:bg-teal-500/10 outline-none">{txt.pull}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedPatternFilter("squat")} className="font-bold cursor-pointer rounded-xl p-3 focus:bg-teal-50 dark:focus:bg-teal-500/10 outline-none">{txt.squat}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedPatternFilter("hinge")} className="font-bold cursor-pointer rounded-xl p-3 focus:bg-teal-50 dark:focus:bg-teal-500/10 outline-none">{txt.hinge}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedPatternFilter("core")} className="font-bold cursor-pointer rounded-xl p-3 focus:bg-teal-50 dark:focus:bg-teal-500/10 outline-none">{txt.core}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* NOUVEAU DROPDOWN ÉQUIPEMENT */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className={`shrink-0 flex items-center px-3 border transition-colors outline-none ${selectedEquipmentFilter !== null ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/50' : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                    <Dumbbell className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline font-bold">{getEquipmentLabel()}</span>
                    {selectedEquipmentFilter !== null && (
                      <span className="ml-1 sm:hidden w-2 h-2 rounded-full bg-purple-500"></span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-zinc-200 dark:border-zinc-800 rounded-2xl p-2 w-56 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
                  <DropdownMenuItem onClick={() => setSelectedEquipmentFilter(null)} className="font-bold cursor-pointer rounded-xl p-3 focus:bg-zinc-100 dark:focus:bg-zinc-900 outline-none">
                    {txt.allEquipment}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800/50" />
                  <DropdownMenuItem onClick={() => setSelectedEquipmentFilter("poids_corps")} className="font-bold cursor-pointer rounded-xl p-3 focus:bg-purple-50 dark:focus:bg-purple-500/10 outline-none">{txt.bodyweight}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedEquipmentFilter("salle")} className="font-bold cursor-pointer rounded-xl p-3 focus:bg-purple-50 dark:focus:bg-purple-500/10 outline-none">{txt.gym}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedEquipmentFilter("home_gym")} className="font-bold cursor-pointer rounded-xl p-3 focus:bg-purple-50 dark:focus:bg-purple-500/10 outline-none">{txt.homeGym}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

            </div>

            <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
              {MUSCLE_GROUPS.map(muscle => (
                <button 
                  key={muscle} 
                  onClick={() => setSelectedMuscle(muscle)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    selectedMuscle === muscle 
                    ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm' 
                    : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  {muscle}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
            {loadingEx ? (
              <div className="flex justify-center items-center h-32"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
            ) : filteredExercises.length > 0 ? (
              filteredExercises.map(ex => {
                const thumbnailUrl = getImageUrl(ex, 0);
                return (
                  <div key={ex.id} className="flex items-center justify-between p-2 lg:p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors group">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-700 relative">
                        <img src={thumbnailUrl} alt={ex.name} className="h-full w-full object-contain absolute z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        <Dumbbell className="h-5 w-5 text-zinc-400 opacity-50 absolute z-0" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">{ex.name}</h4>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">{ex.target_muscle}</p>
                          <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
                          {renderStars(ex.cns_impact)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button onClick={() => setInfoModal({ show: true, exercise: ex })} className="p-2 text-zinc-400 hover:text-indigo-500 transition-colors"><Info className="w-4 h-4" /></button>
                      <button onClick={() => addExercise(ex)} className="p-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600 rounded-lg transition-colors">
                        <Plus className="w-4 h-4 stroke-[3px]" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-zinc-500 text-sm font-bold">Aucun exercice trouvé.</div>
            )}
          </div>
        </div>

        <div id="plan-section" className="flex flex-col space-y-4 bg-zinc-900 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 lg:p-6 shadow-2xl lg:overflow-hidden relative scroll-mt-24">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none rounded-2xl"></div>
          
          <div className="relative z-10 flex flex-col space-y-3 mb-2">
            <h3 className="text-xl font-black text-white flex items-center">
              <CalendarCheck className="w-5 h-5 mr-2 text-indigo-400" /> {txt.myPlan}
            </h3>
            
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">{txt.progName}</Label>
              <Input 
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder={txt.progPlaceholder}
                className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 font-bold"
              />
            </div>
          </div>

          <div className="flex space-x-2 overflow-x-auto pb-2 shrink-0 relative z-10 scrollbar-hide">
            {DAYS_ORDER.map(day => {
              const dayCount = plan[day].length;
              const isActive = activeDay === day;
              return (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`relative flex flex-col items-center justify-center min-w-[50px] px-3 py-2 rounded-xl border transition-all ${
                    isActive 
                    ? 'bg-indigo-500 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' 
                    : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-widest">{DAYS_LABELS[day as keyof typeof DAYS_LABELS]}</span>
                  {dayCount > 0 && (
                    <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${isActive ? 'bg-white text-indigo-600' : 'bg-indigo-500 text-white'}`}>
                      {dayCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 relative z-10 scrollbar-hide">
            {plan[activeDay].length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4 opacity-50 py-12">
                <Dumbbell className="w-12 h-12" />
                <p className="text-sm font-bold">{txt.empty}</p>
              </div>
            ) : (
              plan[activeDay].map((item, idx) => (
                <div key={idx} className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-3 shadow-sm group hover:border-indigo-500/50 transition-colors">
                  
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                    <h4 className="font-bold text-zinc-100 text-sm line-clamp-1">{item.exercise.name}</h4>
                    <button onClick={() => removeExercise(activeDay, idx)} className="text-zinc-600 hover:text-red-500 transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-zinc-500 font-bold">{txt.sets}</Label>
                      <Input 
                        type="number" 
                        value={item.sets} 
                        onChange={(e) => updateExerciseConfig(activeDay, idx, 'sets', parseInt(e.target.value) || 0)}
                        className="h-8 bg-zinc-900 border-zinc-800 text-white text-center font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-zinc-500 font-bold">{txt.reps}</Label>
                      <Input 
                        type="text" 
                        value={item.target_reps} 
                        onChange={(e) => updateExerciseConfig(activeDay, idx, 'target_reps', e.target.value)}
                        className="h-8 bg-zinc-900 border-zinc-800 text-white text-center font-bold text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-zinc-500 font-bold">{txt.rest}</Label>
                      <Input 
                        type="number" 
                        value={item.rest_seconds} 
                        onChange={(e) => updateExerciseConfig(activeDay, idx, 'rest_seconds', parseInt(e.target.value) || 0)}
                        className="h-8 bg-zinc-900 border-zinc-800 text-white text-center font-bold"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Dialog open={infoModal.show} onOpenChange={(open) => !open && setInfoModal({ show: false, exercise: null })}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden">
          {infoModal.exercise && (
            <div className="p-6 text-center space-y-4">
              <h2 className="text-xl font-black dark:text-white">{infoModal.exercise.name}</h2>
              <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-2 h-48 flex justify-center items-center relative">
                <img src={getImageUrl(infoModal.exercise, 0)} className="max-h-full object-contain absolute inset-0 z-10 mx-auto" alt="Aperçu" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <Dumbbell className="w-8 h-8 text-zinc-400 absolute z-0 opacity-50" />
              </div>
              <div className="flex flex-col items-center space-y-2">
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">{infoModal.exercise.target_muscle}</p>
                <div className="flex items-center space-x-2 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] font-black uppercase text-zinc-500">Fatigue SNC</span>
                  {renderStars(infoModal.exercise.cns_impact)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 🛡️ MODALE DU GUIDE SCIENTIFIQUE */}
      <Dialog open={guideModal} onOpenChange={setGuideModal}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-teal-600 flex items-center">
              <BookOpen className="w-6 h-6 mr-2" /> {txt.guideTitle}
            </DialogTitle>
            <DialogDescription className="text-zinc-600 dark:text-zinc-400 font-medium">
              {txt.guideSub}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 py-4 max-h-[60vh] overflow-y-auto pr-2">
            
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 p-4 rounded-xl">
              <h4 className="font-black text-red-700 dark:text-red-400 mb-1 flex items-center">
                {txt.g1}
              </h4>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{txt.g1d}</p>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900 p-4 rounded-xl">
              <h4 className="font-black text-orange-700 dark:text-orange-400 mb-1 flex items-center">
                {txt.g2}
              </h4>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{txt.g2d}</p>
            </div>

            <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl">
              <h4 className="font-black text-zinc-700 dark:text-zinc-300 mb-1 flex items-center">
                {txt.g3}
              </h4>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{txt.g3d}</p>
            </div>

            <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900 p-4 rounded-xl">
              <h4 className="font-black text-teal-700 dark:text-teal-400 mb-1 flex items-center">
                <Activity className="w-4 h-4 mr-2" /> {txt.g4}
              </h4>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{txt.g4d}</p>
            </div>

          </div>
          <DialogFooter>
            <Button className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold" onClick={() => setGuideModal(false)}>
              J'ai compris
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
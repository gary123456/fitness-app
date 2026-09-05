"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Search, Plus, Dumbbell, Save, Trash2, Info, CalendarCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/useLanguage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Exercise {
  id: string;
  name: string;
  target_muscle: string;
  equipment_required: string;
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
  
  const [programName, setProgramName] = useState("");
  const [activeDay, setActiveDay] = useState("monday");
  const [plan, setPlan] = useState<Record<string, PlannedExercise[]>>({
    monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
  });

  const [infoModal, setInfoModal] = useState({ show: false, exercise: null as any });

  const t = {
    FR: { title: "Constructeur de Programme", sub: "Créez votre routine sur-mesure", catalog: "Bibliothèque", search: "Rechercher...", myPlan: "Ma Semaine", save: "Sauvegarder", empty: "Aucun exercice pour ce jour.", reps: "Reps", sets: "Séries", rest: "Repos (s)", progName: "Nom du programme", progPlaceholder: "Ex: Routine Hybride", error: "Erreur lors de la sauvegarde." },
    EN: { title: "Program Builder", sub: "Create your custom routine", catalog: "Library", search: "Search...", myPlan: "My Week", save: "Save", empty: "No exercises for this day.", reps: "Reps", sets: "Sets", rest: "Rest (s)", progName: "Program Name", progPlaceholder: "E.g. Hybrid Routine", error: "Error during save." }
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

    if (filter === "tous") matchMuscle = true;
    else if (filter === "jambes") matchMuscle = target.includes("quadriceps") || target.includes("ischio") || target.includes("mollet") || target.includes("fessier") || target.includes("jambe");
    else if (filter === "abdos") matchMuscle = target.includes("sangle abdominale") || target.includes("abdo") || target.includes("core");
    else if (filter === "épaules") matchMuscle = target.includes("épaule") || target.includes("epaule") || target.includes("delto");
    else if (filter === "dos") matchMuscle = target.includes("dos") || target.includes("lombaire");
    else matchMuscle = target.includes(filter);

    return matchSearch && matchMuscle;
  });

  const addExercise = (ex: Exercise) => {
    setPlan(prev => ({
      ...prev,
      [activeDay]: [
        ...prev[activeDay],
        { exercise: ex, sets: 3, target_reps: "8-12", rest_seconds: 90 }
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

      // LIMITE : 3 Programmes PERSO
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

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-32">
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

      <div className="flex-1 max-w-7xl mx-auto w-full p-4 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:h-[calc(100vh-80px)]">
        
        <div className="flex flex-col space-y-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 lg:p-6 shadow-sm lg:overflow-hidden">
          <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 flex items-center mb-2">
            <Search className="w-5 h-5 mr-2 text-indigo-500" /> {txt.catalog}
          </h3>
          
          <div className="space-y-3 shrink-0">
            <Input 
              placeholder={txt.search} 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-indigo-500 font-medium"
            />
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
                const thumbnailUrl = ex.gif_url ? (ex.gif_url.endsWith('.jpg') ? ex.gif_url : `${ex.gif_url}/0.jpg`) : null;
                return (
                  <div key={ex.id} className="flex items-center justify-between p-2 lg:p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors group">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-700 relative">
                        {thumbnailUrl ? <img src={thumbnailUrl} alt={ex.name} className="h-full w-full object-contain" /> : <Dumbbell className="h-5 w-5 text-zinc-400" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">{ex.name}</h4>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{ex.target_muscle}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
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

        <div className="flex flex-col space-y-4 bg-zinc-900 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 lg:p-6 shadow-2xl lg:overflow-hidden relative">
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
                    <h4 className="font-bold text-zinc-100 text-sm">{item.exercise.name}</h4>
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
              {infoModal.exercise.gif_url ? (
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-2 h-48 flex justify-center items-center">
                  <img src={infoModal.exercise.gif_url.endsWith('.jpg') ? infoModal.exercise.gif_url : `${infoModal.exercise.gif_url}/0.jpg`} className="max-h-full object-contain" alt="Aperçu" />
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 rounded-xl"><Dumbbell className="w-8 h-8 text-zinc-400" /></div>
              )}
              <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">{infoModal.exercise.target_muscle}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
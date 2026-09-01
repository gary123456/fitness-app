"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Check, Dumbbell, Timer, X, Trophy, AlertCircle, CheckCircle2, Repeat, Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/useLanguage";

const HelpModal = ({ txt }: { txt: any }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center space-x-2 text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400 px-4 py-2 rounded-full font-bold text-sm transition-colors shadow-sm">
        <Info className="w-5 h-5" /> <span>{txt.helpBtn}</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[450px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center text-teal-600 dark:text-teal-400"><Info className="w-5 h-5 mr-2"/> {txt.helpTitle}</DialogTitle>
            <DialogDescription asChild>
              <div className="text-zinc-600 dark:text-zinc-400 pt-3 space-y-3 leading-relaxed text-sm font-medium">
                <span className="block">{txt.help1}</span>
                <span className="block">{txt.help2}</span>
                <span className="block">{txt.help3}</span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <Button className="w-full mt-2 bg-teal-500 text-white hover:bg-teal-600" onClick={() => setOpen(false)}>{txt.helpGo}</Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function ActiveWorkoutSession() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [inputs, setInputs] = useState<Record<string, { weight: string, reps: string }>>({});
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});
  const [restTimer, setRestTimer] = useState<number | null>(null);
  
  const [showEndModal, setShowEndModal] = useState(false);
  const [errorModal, setErrorModal] = useState({ show: false, title: "", message: "" });

  const { lang } = useLanguage();

  const t = {
    FR: { activeTracker: "Tracker Actif", rule: "💡 Règle de l'auto-régulation : Choisissez une charge qui vous permet d'atteindre l'objectif en gardant 2 répétitions en réserve.", target: "Objectif", rec: "Conseil", dup: "Dupliquer la 1ère série", set: "Série", weight: "Charge (kg)", reps: "Reps", checkAll: "Tout valider automatiquement", finish: "Terminer la séance", noSetTitle: "Aucune série", noSetMsg: "Validez au moins une série.", sqlErr: "Erreur SQL", load: "Chargement...", notFound: "Introuvable.", success: "Séance Validée !", successMsg: "Données sécurisées pour la surcharge progressive.", back: "Retour au programme", helpBtn: "Comment utiliser le tracker ?", helpTitle: "Instructions", help1: "1. Les cases sont pré-remplies avec les poids recommandés.", help2: "2. Ajustez la charge de votre première série, puis cliquez sur l'icône de duplication pour copier vos chiffres partout.", help3: "3. Validez chaque série pour lancer le chronomètre de récupération.", helpGo: "C'est parti !" },
    EN: { activeTracker: "Active Tracker", rule: "💡 Auto-regulation rule: Choose a weight that allows you to hit the target reps leaving 2 reps in reserve.", target: "Target", rec: "Rec", dup: "Duplicate 1st set", set: "Set", weight: "Weight (kg)", reps: "Reps", checkAll: "Auto-complete all sets", finish: "Finish Workout", noSetTitle: "No sets logged", noSetMsg: "Please validate at least one set.", sqlErr: "SQL Error", load: "Loading...", notFound: "Not found.", success: "Workout Completed!", successMsg: "Data secured for progressive overload.", back: "Back to program", helpBtn: "How to use the tracker?", helpTitle: "Instructions", help1: "1. Fields are pre-filled with recommended weights.", help2: "2. Adjust the weight for your first set, then click the duplicate icon to copy your numbers to all sets.", help3: "3. Validate each set to start the rest timer.", helpGo: "Let's go!" }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

  useEffect(() => { fetchSession(); }, [params.id]);

  useEffect(() => {
    if (restTimer === null || restTimer <= 0) return;
    const interval = setInterval(() => { setRestTimer((prev) => (prev && prev > 0 ? prev - 1 : 0)); }, 1000);
    return () => clearInterval(interval);
  }, [restTimer]);

  const extractNumber = (str: string) => {
    const match = str.match(/\d+/);
    return match ? match[0] : "";
  };

  const fetchSession = async () => {
    const { data: sessionData } = await supabase.from("workout_sessions").select(`*, workout_exercises (*, exercise_library (*))`).eq("id", params.id).single();

    if (sessionData) {
      if (sessionData.workout_exercises) sessionData.workout_exercises.sort((a: any, b: any) => a.order_index - b.order_index);
      setSession(sessionData);

      const initialInputs: Record<string, { weight: string, reps: string }> = {};
      sessionData.workout_exercises.forEach((we: any) => {
        const identifier = we.id || we.exercise_id;
        const defaultReps = extractNumber(we.target_reps);
        const defaultWeight = we.recommended_weight && we.recommended_weight > 0 ? we.recommended_weight.toString() : "";
        
        for (let i = 0; i < we.sets; i++) {
          initialInputs[`${identifier}_${i}`] = { weight: defaultWeight, reps: defaultReps };
        }
      });

      const { data: logs } = await supabase.from("workout_logs").select("*").eq("session_id", params.id);
      
      if (logs && logs.length > 0) {
        const loadedCompleted: Record<string, boolean> = {};
        logs.forEach((log) => {
          const we = sessionData.workout_exercises.find((w: any) => w.exercise_id === log.exercise_id);
          if (we) {
            const setKey = `${we.id || we.exercise_id}_${log.set_number - 1}`;
            initialInputs[setKey] = { weight: log.weight.toString(), reps: log.reps.toString() };
            loadedCompleted[setKey] = true;
          }
        });
        setCompletedSets(loadedCompleted);
      }
      setInputs(initialInputs);
    }
    setLoading(false);
  };

  const handleInputChange = (setKey: string, field: "weight" | "reps", value: string) => {
    setInputs((prev) => ({ ...prev, [setKey]: { ...prev[setKey], [field]: value } }));
  };

  const duplicateFirstSet = (identifier: string, totalSets: number) => {
    const firstSetKey = `${identifier}_0`;
    const firstSetData = inputs[firstSetKey];
    if (!firstSetData) return;

    setInputs(prev => {
      const next = { ...prev };
      for (let i = 1; i < totalSets; i++) {
        if (!completedSets[`${identifier}_${i}`]) {
          next[`${identifier}_${i}`] = { ...firstSetData };
        }
      }
      return next;
    });
  };

  const toggleSet = (setKey: string, restSeconds: number) => {
    const isCompleted = completedSets[setKey];
    if (isCompleted) {
      setCompletedSets((prev) => ({ ...prev, [setKey]: false }));
    } else {
      setCompletedSets((prev) => ({ ...prev, [setKey]: true }));
      setRestTimer(restSeconds);
    }
  };

  const checkAllSets = () => {
    if (!session) return;
    const newCompleted = { ...completedSets };
    session.workout_exercises.forEach((we: any) => {
      const identifier = we.id || we.exercise_id;
      for (let i = 0; i < we.sets; i++) {
        newCompleted[`${identifier}_${i}`] = true;
      }
    });
    setCompletedSets(newCompleted);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60); const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const finishWorkout = async () => {
    const hasCompletedSets = Object.values(completedSets).some(val => val === true);
    if (!hasCompletedSets) { setErrorModal({ show: true, title: txt.noSetTitle, message: txt.noSetMsg }); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const logsToInsert = [];
    for (const [setKey, isCompleted] of Object.entries(completedSets)) {
      if (isCompleted) {
        const [workoutExerciseId, setIdx] = setKey.split('_');
        const values = inputs[setKey] || {};
        const we = session.workout_exercises.find((item: any) => item.id === workoutExerciseId || item.exercise_id === workoutExerciseId);

        if (we) {
          logsToInsert.push({
            user_id: user.id, session_id: session.id, exercise_id: we.exercise_id,
            set_number: parseInt(setIdx) + 1,
            weight: parseFloat(values.weight) || 0,
            reps: parseInt(values.reps) || parseInt(extractNumber(we.target_reps))
          });
        }
      }
    }

    const { error } = await supabase.from('workout_logs').insert(logsToInsert);
    if (error) { setErrorModal({ show: true, title: txt.sqlErr, message: error.message }); return; }

    setShowEndModal(true);
    setRestTimer(null);
  };

  if (loading) return <div className="p-8 text-center text-teal-500 font-bold animate-pulse">{txt.load}</div>;
  if (!session) return <div className="p-8 text-center text-red-500">{txt.notFound}</div>;

  return (
    <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 min-h-screen pb-32 relative">
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 py-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
          <ArrowLeft className="w-6 h-6 dark:text-zinc-100" />
        </button>
        <h2 className="text-lg font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-50">{txt.activeTracker}</h2>
        <div className="w-10"></div>
      </div>

      <div className="max-w-2xl mx-auto p-4 flex justify-center">
        <HelpModal txt={txt} />
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6">
        {session.workout_exercises.map((we: any) => {
          const ex = we.exercise_library;
          const identifier = we.id || we.exercise_id;
          return (
            <div key={we.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-md">
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900">
                <div className="flex items-center space-x-3">
                  {/* --- MODIFICATION ICI : GIF ou Icône --- */}
                  <div className="h-12 w-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden shrink-0 shadow-inner border border-zinc-200 dark:border-zinc-700">
                    {ex.gif_url ? (
                      <img src={ex.gif_url} alt={ex.name} className="h-full w-full object-cover" />
                    ) : (
                      <Dumbbell className="h-6 w-6 text-zinc-400" />
                    )}
                  </div>
                  {/* --------------------------------------- */}
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-50">{ex.name}</h3>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {txt.target} : {we.target_reps} reps {we.recommended_weight ? `| ${txt.rec}: ${we.recommended_weight}kg` : ""}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => duplicateFirstSet(identifier, we.sets)}
                  className="p-2 text-zinc-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:text-teal-400 dark:hover:bg-teal-900/30 rounded-md transition-colors"
                  title={txt.dup}
                >
                  <Repeat className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 space-y-3 bg-white dark:bg-zinc-950">
                <div className="grid grid-cols-12 gap-2 px-2 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase text-center tracking-wider">
                  <div className="col-span-2">{txt.set}</div>
                  <div className="col-span-4">{txt.weight}</div>
                  <div className="col-span-4">{txt.reps}</div>
                  <div className="col-span-2">OK</div>
                </div>

                {Array.from({ length: we.sets }).map((_, setIdx) => {
                  const setKey = `${identifier}_${setIdx}`;
                  const isCompleted = completedSets[setKey];
                  const currentValues = inputs[setKey] || { weight: "", reps: "" };

                  return (
                    <div key={setKey} className={`grid grid-cols-12 gap-2 items-center px-2 py-2 rounded-lg transition-colors border ${isCompleted ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm'}`}>
                      <div className="col-span-2 text-center font-bold text-zinc-500 dark:text-zinc-400">{setIdx + 1}</div>
                      <div className="col-span-4">
                        <input type="number" placeholder="0" value={currentValues.weight} onChange={(e) => handleInputChange(setKey, "weight", e.target.value)} disabled={isCompleted} className="w-full bg-transparent text-center font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:bg-white dark:focus:bg-zinc-800 rounded p-1 disabled:opacity-50" />
                      </div>
                      <div className="col-span-4">
                        <input type="number" placeholder="0" value={currentValues.reps} onChange={(e) => handleInputChange(setKey, "reps", e.target.value)} disabled={isCompleted} className="w-full bg-transparent text-center font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:bg-white dark:focus:bg-zinc-800 rounded p-1 disabled:opacity-50" />
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <button onClick={() => toggleSet(setKey, we.rest_seconds)} className={`h-8 w-8 rounded-md flex items-center justify-center transition-transform active:scale-90 ${isCompleted ? 'bg-teal-500 shadow-lg shadow-teal-500/40 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-300 dark:hover:bg-zinc-700'}`}>
                          <Check className="w-4 h-4 stroke-[3px]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="pt-4 pb-10 space-y-3">
          <button onClick={checkAllSets} className="w-full py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl flex items-center justify-center space-x-2 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
            <CheckCircle2 className="w-5 h-5" />
            <span>{txt.checkAll}</span>
          </button>

          <button onClick={finishWorkout} className="w-full py-4 bg-teal-500 hover:bg-teal-600 text-white font-black uppercase tracking-widest rounded-xl shadow-xl shadow-teal-500/20 transition-transform active:scale-[0.98]">
            {txt.finish}
          </button>
        </div>
      </div>

      {restTimer !== null && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 px-6 py-3 rounded-full flex items-center space-x-4 shadow-2xl transition-all ${restTimer > 0 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
          <Timer className="w-5 h-5 animate-pulse text-teal-400 dark:text-teal-600" />
          <span className="font-mono text-xl font-black w-16 text-center">{formatTime(restTimer)}</span>
          <button onClick={() => setRestTimer(0)} className="text-zinc-400 hover:text-white dark:hover:text-zinc-900"><X className="w-5 h-5" /></button>
        </div>
      )}

      {errorModal.show && (
        <Dialog open={errorModal.show} onOpenChange={(open) => !open && setErrorModal({show: false, title:"", message:""})}>
          <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-red-500 flex items-center"><AlertCircle className="w-5 h-5 mr-2"/> {errorModal.title}</DialogTitle>
              <DialogDescription asChild><div className="text-zinc-600 dark:text-zinc-400">{errorModal.message}</div></DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}

      {showEndModal && (
        <Dialog open={showEndModal} onOpenChange={setShowEndModal}>
          <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <div className="text-center py-6">
              <div className="mx-auto w-16 h-16 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center mb-4">
                <Trophy className="w-8 h-8 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mb-2">{txt.success}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6">{txt.successMsg}</p>
              <Button onClick={() => router.push("/workout")} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold">{txt.back}</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
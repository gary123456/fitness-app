"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Dumbbell } from "lucide-react";

export default function InterceptedExerciseModal() {
  const router = useRouter();
  const params = useParams();
  const [exercise, setExercise] = useState<any>(null);

  useEffect(() => {
    const fetchEx = async () => {
      const { data } = await supabase.from('exercise_library').select('*').eq('id', params.exerciseId).single();
      setExercise(data);
    };
    if (params.exerciseId) fetchEx();
  }, [params.exerciseId]);

  return (
    <Dialog defaultOpen onOpenChange={(open) => { if (!open) router.back(); }}>
      <DialogContent className="sm:max-w-[700px] flex flex-col p-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900">
          <DialogTitle className="text-xl font-black dark:text-zinc-50">
            {exercise ? exercise.name : "Chargement..."}
          </DialogTitle>
          <DialogDescription className="text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            {exercise ? `Cible : ${exercise.target_muscle} • Matériel : ${exercise.equipment_required.replace('_', ' ')}` : ""}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 p-4 md:p-6 overflow-y-auto max-h-[75vh]">
          {!exercise ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
          ) : exercise.gif_url ? (
            <div className="flex flex-col sm:flex-row items-stretch justify-center gap-4 w-full">
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col">
                <div className="bg-zinc-100/80 px-3 py-2 border-b border-zinc-200 text-[10px] font-black text-zinc-500 text-center uppercase tracking-widest">
                  Position de départ
                </div>
                <div className="p-4 flex justify-center items-center h-48 md:h-64">
                  <img src={`${exercise.gif_url}/0.jpg`} alt="Départ" className="max-w-full max-h-full object-contain mix-blend-multiply" loading="lazy" />
                </div>
              </div>
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col">
                <div className="bg-zinc-100/80 px-3 py-2 border-b border-zinc-200 text-[10px] font-black text-zinc-500 text-center uppercase tracking-widest">
                  Contraction
                </div>
                <div className="p-4 flex justify-center items-center h-48 md:h-64">
                  <img src={`${exercise.gif_url}/1.jpg`} alt="Fin" className="max-w-full max-h-full object-contain mix-blend-multiply" loading="lazy" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-zinc-400 dark:text-zinc-600">
              <Dumbbell className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-sm font-bold">Aucun visuel disponible.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
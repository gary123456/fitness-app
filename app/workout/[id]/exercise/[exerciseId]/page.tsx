"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, Dumbbell } from "lucide-react";

export default function ExerciseFullPage() {
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
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex items-center px-4 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 mr-3 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <ArrowLeft className="w-5 h-5 dark:text-zinc-50" />
        </button>
        <div>
          <h1 className="text-xl font-black dark:text-zinc-50">{exercise ? exercise.name : "Chargement..."}</h1>
          {exercise && <p className="text-xs font-medium text-zinc-500">{exercise.target_muscle}</p>}
        </div>
      </div>
      
      <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
        {!exercise ? (
          <div className="flex justify-center items-center h-[50vh]">
            <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
          </div>
        ) : exercise.gif_url ? (
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 bg-white rounded-2xl shadow-md border border-zinc-200 overflow-hidden flex flex-col">
              <div className="bg-zinc-100/80 px-4 py-3 border-b border-zinc-200 text-xs font-black text-zinc-500 text-center uppercase tracking-widest">Position de départ</div>
              <div className="p-6 flex justify-center items-center flex-1 min-h-[300px]">
                <img src={`${exercise.gif_url}/0.jpg`} alt="Départ" className="max-w-full object-contain mix-blend-multiply" loading="lazy" />
              </div>
            </div>
            <div className="flex-1 bg-white rounded-2xl shadow-md border border-zinc-200 overflow-hidden flex flex-col">
              <div className="bg-zinc-100/80 px-4 py-3 border-b border-zinc-200 text-xs font-black text-zinc-500 text-center uppercase tracking-widest">Position de fin</div>
              <div className="p-6 flex justify-center items-center flex-1 min-h-[300px]">
                <img src={`${exercise.gif_url}/1.jpg`} alt="Fin" className="max-w-full object-contain mix-blend-multiply" loading="lazy" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-400 dark:text-zinc-600">
            <Dumbbell className="w-20 h-20 mb-4 opacity-50" />
            <p className="text-base font-bold">Aucun visuel disponible.</p>
          </div>
        )}
      </div>
    </div>
  );
}
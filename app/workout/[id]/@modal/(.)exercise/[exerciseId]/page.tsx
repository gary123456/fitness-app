"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Dumbbell, Info } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";

const getInstructions = (name: string, lang: string) => {
  const lowerName = name.toLowerCase();

  // SQUAT & PRESSE
  if (lowerName.includes('squat') || lowerName.includes('presse') || lowerName.includes('leg press')) {
    return lang === 'FR' 
      ? "Gardez le buste droit et le regard fixe.\nVerrouillez le gainage et placez le bassin en légère antéversion.\nDescendez en contrôlant la charge (poussez les hanches vers l'arrière).\nPoussez fort sur vos talons pour remonter." 
      : "Keep your chest up and eyes forward.\nBrace your core and maintain a slight anterior pelvic tilt.\nDescend under control by pushing your hips back.\nDrive explosively through your heels to ascend.";
  }
  // FENTES / BULGARES
  if (lowerName.includes('fente') || lowerName.includes('lunge') || lowerName.includes('bulgare') || lowerName.includes('step-up')) {
    return lang === 'FR'
      ? "Gardez le torse droit et le regard droit devant.\nLe genou avant doit rester dans l'axe de l'orteil sans trop le dépasser.\nDescendez jusqu'à frôler le sol avec le genou arrière.\nPoussez sur le talon avant pour remonter."
      : "Keep your torso upright and look straight ahead.\nYour front knee should track over your toes.\nLower yourself until your back knee gently taps the floor.\nPush through your front heel to return to the start.";
  }
  // SOULEVÉ DE TERRE / RDL / HINGE
  if (lowerName.includes('soulevé de terre') || lowerName.includes('deadlift') || lowerName.includes('rdl') || lowerName.includes('good morning')) {
    return lang === 'FR' 
      ? "Maintenez le dos parfaitement droit et le bassin neutre.\nGardez la charge collée à vos tibias/cuisses.\nPoussez le sol avec vos jambes et contractez les fessiers en haut." 
      : "Maintain a perfectly straight back and neutral pelvis.\nKeep the weight very close to your shins/thighs.\nPush the floor away with your legs and squeeze your glutes at the top.";
  }
  // PRESSES HORIZONTALES (Couché, Floor press)
  if (lowerName.includes('couché') || lowerName.includes('bench') || lowerName.includes('floor press')) {
    return lang === 'FR' 
      ? "Rétractez vos omoplates (serrez le dos) contre le banc/sol.\nContrôlez la descente de la charge jusqu'à la poitrine.\nPoussez de manière explosive en gardant les pieds ancrés au sol." 
      : "Retract your scapula (squeeze your back) against the bench/floor.\nControl the descent of the weight to your chest.\nPush explosively while keeping your feet firmly planted.";
  }
  // POMPES / DIPS
  if (lowerName.includes('pompe') || lowerName.includes('push-up') || lowerName.includes('dips')) {
    return lang === 'FR'
      ? "Maintenez un gainage actif (alignement épaules-bassin-chevilles).\nDescendez en contrôlant le mouvement jusqu'à l'étirement maximal.\nPoussez fort pour revenir en position initiale sans verrouiller violemment les coudes."
      : "Maintain an active core (shoulders-hips-ankles alignment).\nLower yourself under control until a full stretch.\nPush strongly to the starting position without locking elbows violently.";
  }
  // PRESSES VERTICALES (Militaire, OHP, Arnold)
  if (lowerName.includes('militaire') || lowerName.includes('ohp') || lowerName.includes('shoulder press') || lowerName.includes('arnold')) {
    return lang === 'FR'
      ? "Contractez les fessiers et les abdos pour ne pas cambrer excessivement le dos.\nPoussez la charge au-dessus de la tête dans un axe vertical.\nRedescendez en contrôlant le poids jusqu'au niveau des clavicules."
      : "Squeeze your glutes and abs to avoid excessive lower back arching.\nPress the weight overhead in a vertical line.\nLower the weight under control to clavicle level.";
  }
  // TIRAGES VERTICAUX (Tractions, Pulldown)
  if (lowerName.includes('traction') || lowerName.includes('pull-up') || lowerName.includes('chin-up') || lowerName.includes('pulldown') || lowerName.includes('tirage poitrine')) {
    return lang === 'FR' 
      ? "Démarrez le mouvement avec un étirement complet (épaules décrochées).\nTirez en cherchant à amener la poitrine vers la barre (tirez avec les coudes).\nContrôlez la phase de descente." 
      : "Start the movement with a full stretch.\nPull by trying to bring your chest to the bar (drive with your elbows).\nControl the eccentric descent.";
  }
  // TIRAGES HORIZONTAUX (Rowing, T-Bar)
  if (lowerName.includes('rowing') || lowerName.includes('tirage horizontal') || lowerName.includes('t-bar') || lowerName.includes('bûcheron')) {
    return lang === 'FR'
      ? "Gardez le dos droit et le buste stable.\nTirez la charge vers votre nombril en resserrant les omoplates.\nÉtirez bien le dos lors de la phase de retour."
      : "Keep your back straight and torso stable.\nPull the weight towards your belly button while squeezing your shoulder blades.\nFully stretch your back on the return phase.";
  }
  // BICEPS (Curl)
  if (lowerName.includes('curl')) {
    return lang === 'FR'
      ? "Gardez les coudes fixés près du corps (aucun mouvement d'épaule).\nContractez fort le biceps en haut du mouvement.\nRedescendez lentement sans relâcher la tension en bas."
      : "Keep your elbows pinned to your sides (no shoulder movement).\nSqueeze the bicep hard at the top.\nLower slowly without losing tension at the bottom.";
  }
  // TRICEPS (Extension, Barre au front, Kickback)
  if (lowerName.includes('triceps') || lowerName.includes('barre au front') || lowerName.includes('skullcrusher') || lowerName.includes('kickback')) {
    return lang === 'FR'
      ? "Gardez les coudes serrés et immobiles.\nEffectuez une extension complète pour contracter le triceps.\nContrôlez le retour pour bien étirer le muscle."
      : "Keep your elbows tucked and stationary.\nPerform a full extension to contract the triceps.\nControl the return to fully stretch the muscle.";
  }
  // EPAULES ISOLATION (Elévations, Oiseau, Face Pull)
  if (lowerName.includes('élévation') || lowerName.includes('oiseau') || lowerName.includes('face pull') || lowerName.includes('lateral raise')) {
    return lang === 'FR'
      ? "Utilisez une charge modérée, privilégiez le contrôle.\nInitiez le mouvement avec les coudes plutôt qu'avec les mains.\nMarquez un léger temps d'arrêt lors de la contraction maximale."
      : "Use a moderate weight and prioritize control.\nInitiate the movement with your elbows rather than your hands.\nPause briefly at peak contraction.";
  }
  // MOLLETS (Calves)
  if (lowerName.includes('mollet') || lowerName.includes('calf')) {
    return lang === 'FR'
      ? "Descendez lentement pour obtenir un étirement maximal.\nMarquez une pause de 1 à 2 secondes en bas.\nPoussez de manière explosive et contractez fort en haut."
      : "Lower slowly to get a maximum stretch.\nPause for 1-2 seconds at the bottom.\nPush explosively and squeeze hard at the top.";
  }
  // ABDOS / CORE / GAINAGE
  if (lowerName.includes('planche') || lowerName.includes('l-sit') || lowerName.includes('sit-up') || lowerName.includes('crunch') || lowerName.includes('rollout') || lowerName.includes('abdo')) {
    return lang === 'FR'
      ? "Aspirez le nombril pour engager le transverse profond.\nMaintenez une respiration fluide et continue.\nEnroulez la colonne (ne tirez pas sur la nuque) lors des contractions."
      : "Draw your belly button in to engage the deep transverse abdominis.\nMaintain a fluid and continuous breathing pattern.\nCurl your spine (do not pull on your neck) during contractions.";
  }

  // Fallback générique
  return lang === 'FR' 
    ? "Maintenez une posture stable et un bon gainage.\nContrôlez la phase excentrique (la descente de la charge).\nSoyez explosif sur la phase concentrique (la contraction)." 
    : "Maintain a stable posture and brace your core.\nControl the eccentric phase (lowering the weight).\nBe explosive on the concentric phase (the contraction).";
};

export default function InterceptedExerciseModal() {
  const router = useRouter();
  const params = useParams();
  const { lang } = useLanguage();
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
            {exercise ? exercise.name : (lang === 'FR' ? "Chargement..." : "Loading...")}
          </DialogTitle>
          <DialogDescription className="text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            {exercise ? `${lang === 'FR' ? 'Cible' : 'Target'} : ${exercise.target_muscle} • ${lang === 'FR' ? 'Matériel' : 'Equipment'} : ${exercise.equipment_required.replace('_', ' ')}` : ""}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 p-4 md:p-6 overflow-y-auto max-h-[75vh]">
          {!exercise ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* IMAGES */}
              {exercise.gif_url ? (
                <div className="flex flex-col sm:flex-row items-stretch justify-center gap-4 w-full">
                  <div className="flex-1 bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col">
                    <div className="bg-zinc-100/80 px-3 py-2 border-b border-zinc-200 text-[10px] font-black text-zinc-500 text-center uppercase tracking-widest">
                      {lang === 'FR' ? "Position de départ" : "Starting Position"}
                    </div>
                    <div className="p-4 flex justify-center items-center h-48 md:h-64">
                      <img src={`${exercise.gif_url}/0.jpg`} alt="Départ" className="max-w-full max-h-full object-contain mix-blend-multiply" loading="lazy" />
                    </div>
                  </div>
                  <div className="flex-1 bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col">
                    <div className="bg-zinc-100/80 px-3 py-2 border-b border-zinc-200 text-[10px] font-black text-zinc-500 text-center uppercase tracking-widest">
                      {lang === 'FR' ? "Contraction" : "Contraction"}
                    </div>
                    <div className="p-4 flex justify-center items-center h-48 md:h-64">
                      <img src={`${exercise.gif_url}/1.jpg`} alt="Fin" className="max-w-full max-h-full object-contain mix-blend-multiply" loading="lazy" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[200px] text-zinc-400 dark:text-zinc-600 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <Dumbbell className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm font-bold">{lang === 'FR' ? "Aucun visuel disponible." : "No visual available."}</p>
                </div>
              )}

              {/* INSTRUCTIONS */}
              <div className="bg-white dark:bg-zinc-900/50 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h4 className="flex items-center text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <Info className="w-4 h-4 mr-2 text-teal-500" />
                  {lang === 'FR' ? "Consignes d'exécution" : "Execution Guidelines"}
                </h4>
                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                  {getInstructions(exercise.name, lang).split('\n').map((line, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-teal-500 mr-2 mt-0.5">•</span>
                      <span className="leading-relaxed">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
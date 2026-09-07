"use client";

import { useEffect, useRef } from "react";
import { Timer, X } from "lucide-react";

interface AudioHapticTimerProps {
  restTimer: number | null;
  setRestTimer: (val: number | null) => void;
  formatTime: (seconds: number) => string;
}

export default function AudioHapticTimer({ restTimer, setRestTimer, formatTime }: AudioHapticTimerProps) {
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialisation du contexte audio au premier clic (contournement des sécurités navigateurs)
  useEffect(() => {
    const initAudio = () => {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
    };
    window.addEventListener('click', initAudio, { once: true });
    return () => window.removeEventListener('click', initAudio);
  }, []);

  const playCompletionFeedback = () => {
    // 1. Retour Haptique (Vibration : 200ms ON, 100ms OFF, 200ms ON)
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    // 2. Retour Audio (Bip système)
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      const ctx = audioCtxRef.current;
      
      // Relance le contexte s'il a été suspendu par le navigateur
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Note A5 (Aigu et clair)
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime); // Volume doux
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5); // Fondu (Fade out)

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  };

  // Déclencheur du feedback quand le timer atteint exactement 0
  useEffect(() => {
    if (restTimer === 0) {
      playCompletionFeedback();
    }
  }, [restTimer]);

  if (restTimer === null) return null;

  return (
    <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 px-6 py-3 rounded-full flex items-center space-x-4 shadow-[0_10px_40px_rgba(0,0,0,0.3)] transition-all ${restTimer > 0 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'} z-50`}>
      <Timer className="w-5 h-5 animate-pulse text-teal-400 dark:text-teal-600" />
      <span className="font-mono text-xl font-black w-16 text-center">{formatTime(restTimer)}</span>
      <button onClick={() => setRestTimer(0)} className="text-zinc-400 hover:text-white dark:hover:text-zinc-900 transition-colors">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
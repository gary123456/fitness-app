"use client";

import { useEffect, useRef, useState } from "react";
import { Timer, X } from "lucide-react";

interface AudioHapticTimerProps {
  restTimer: number | null;
  setRestTimer: (val: number | null) => void;
  formatTime: (seconds: number) => string;
}

export default function AudioHapticTimer({ restTimer, setRestTimer, formatTime }: AudioHapticTimerProps) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // 🛡️ DÉVERROUILLAGE AUDIO (Hack pour contourner la sécurité iOS/Chrome)
  useEffect(() => {
    const unlockAudio = () => {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
          // Jouer un son silencieux immédiatement pour débloquer le contexte
          const osc = audioCtxRef.current.createOscillator();
          const gain = audioCtxRef.current.createGain();
          gain.gain.value = 0; // Silencieux
          osc.connect(gain);
          gain.connect(audioCtxRef.current.destination);
          osc.start(0);
          osc.stop(0.001);
          setIsUnlocked(true);
        }
      }
    };

    // On écoute n'importe quelle interaction sur l'écran pour débloquer l'audio
    window.addEventListener('touchstart', unlockAudio, { once: true });
    window.addEventListener('click', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };
  }, []);

  const playCompletionFeedback = () => {
    // 1. Retour Haptique (Vibration Android)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([200, 100, 200]); } catch (e) {}
    }

    // 2. Retour Audio (Bip Clair)
    if (audioCtxRef.current && isUnlocked) {
      try {
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") ctx.resume();

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Fréquence agréable (Note La / 880Hz)
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime); 
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      } catch (err) {
        console.error("Audio playback failed", err);
      }
    }
  };

  useEffect(() => {
    // On déclenche le bip EXACTEMENT quand le timer atteint 0
    if (restTimer === 0) {
      playCompletionFeedback();
    }
  }, [restTimer]);

  if (restTimer === null) return null;

  return (
    <div className={`fixed bottom-24 sm:bottom-10 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 px-6 py-3 rounded-full flex items-center space-x-4 shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-300 ease-out z-[9999] ${restTimer > 0 ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95 pointer-events-none'}`}>
      <Timer className="w-5 h-5 animate-pulse text-teal-400 dark:text-teal-600" />
      <span className="font-mono text-xl font-black w-16 text-center">{formatTime(restTimer)}</span>
      <button onClick={() => setRestTimer(0)} className="text-zinc-400 hover:text-white dark:hover:text-zinc-900 transition-colors p-1">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
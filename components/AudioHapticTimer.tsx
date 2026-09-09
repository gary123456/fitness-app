"use client";

import { useEffect, useRef, useState } from "react";
import { Timer, X, Minus, Plus } from "lucide-react";

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

    window.addEventListener('touchstart', unlockAudio, { once: true });
    window.addEventListener('click', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };
  }, []);

  const playCompletionFeedback = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([200, 100, 200]); } catch (e) {}
    }
    if (audioCtxRef.current && isUnlocked) {
      try {
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") ctx.resume();

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

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
    if (restTimer === 0) {
      playCompletionFeedback();
    }
  }, [restTimer]);

  if (restTimer === null) return null;

  return (
    <div className={`fixed bottom-24 sm:bottom-10 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 px-4 py-3 rounded-full flex items-center shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-300 ease-out z-[9999] ${restTimer > 0 ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95 pointer-events-none'}`}>
      <Timer className="w-5 h-5 animate-pulse text-teal-400 dark:text-teal-600 mr-2 shrink-0" />
      
      {/* 🛡️ POINT 4 : AJUSTEMENT DYNAMIQUE DU TIMER */}
      <div className="flex items-center bg-zinc-800 dark:bg-zinc-200 rounded-full px-1">
        <button onClick={() => setRestTimer(Math.max(1, restTimer - 15))} className="p-2 text-zinc-400 hover:text-white dark:hover:text-zinc-900 transition-colors">
          <Minus className="w-4 h-4" />
        </button>
        <span className="font-mono text-xl font-black w-16 text-center">{formatTime(restTimer)}</span>
        <button onClick={() => setRestTimer(restTimer + 30)} className="p-2 text-zinc-400 hover:text-white dark:hover:text-zinc-900 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <button onClick={() => setRestTimer(0)} className="text-zinc-400 hover:text-white dark:hover:text-zinc-900 transition-colors p-2 ml-2">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
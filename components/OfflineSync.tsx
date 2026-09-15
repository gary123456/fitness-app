"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function OfflineSync() {
  useEffect(() => {
    // 🛡️ PARTIE 1 : VOTRE LOGIQUE D'UPLOAD (Envoi des logs en attente)
    const uploadPendingLogs = async () => {
      if (typeof window === "undefined" || !navigator.onLine) return;
      
      const queueStr = localStorage.getItem("vivex_offline_queue");
      if (!queueStr) return;

      try {
        const queue = JSON.parse(queueStr);
        if (queue && queue.length > 0) {
          console.log("🔄 Background Sync : Envoi des logs hors-ligne...");
          const { error } = await supabase.from("workout_logs").insert(queue);
          
          if (!error) {
            console.log("✅ Background Sync : Données sécurisées avec succès !");
            localStorage.removeItem("vivex_offline_queue");
          } else {
            console.error("❌ Background Sync Erreur:", error.message);
          }
        }
      } catch (err) {
        console.error("Background Sync Erreur de lecture:", err);
      }
    };

    // 🛡️ PARTIE 2 : NOTRE LOGIQUE DE DOWNLOAD (Aspiration pour le mode avion)
    const downloadOfflineData = async () => {
      if (typeof window === "undefined" || !navigator.onLine) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Mise en cache du profil
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (profile) localStorage.setItem("vivex_offline_profile", JSON.stringify(profile));

        // Mise en cache du programme actif
        const { data: activeProgram } = await supabase.from("user_programs").select("*").eq("user_id", user.id).eq("is_active", true).single();
        
        if (activeProgram) {
          localStorage.setItem("vivex_offline_active_program", JSON.stringify(activeProgram));

          const { data: sessions } = await supabase
            .from("workout_sessions")
            .select(`*, workout_exercises (*, exercise_library (*))`)
            .eq("program_id", activeProgram.id)
            .order("order_index", { ascending: true });

          if (sessions) {
            localStorage.setItem("vivex_offline_weekly_plan", JSON.stringify(sessions));
          }
        }
      } catch (error) {
        console.warn("Aspiration hors-ligne silencieuse échouée :", error);
      }
    };

    // Exécution initiale
    uploadPendingLogs();
    downloadOfflineData();

    // Écouteurs d'événements
    window.addEventListener("online", uploadPendingLogs);
    
    // Aspiration silencieuse toutes les 5 minutes
    const interval = setInterval(downloadOfflineData, 5 * 60 * 1000);

    return () => {
      window.removeEventListener("online", uploadPendingLogs);
      clearInterval(interval);
    };
  }, []);

  return null; 
}
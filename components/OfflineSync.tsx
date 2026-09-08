"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function OfflineSync() {
  useEffect(() => {
    const syncData = async () => {
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

    window.addEventListener("online", syncData);
    syncData(); // Tentative au lancement

    return () => window.removeEventListener("online", syncData);
  }, []);

  return null; 
}
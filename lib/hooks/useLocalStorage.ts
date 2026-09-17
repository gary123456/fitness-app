import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Gère proprement le rendu côté serveur (SSR) de Next.js
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Erreur de lecture du localStorage pour la clé "${key}":`, error);
      return initialValue;
    }
  });

  // Met à jour le localStorage à chaque changement de la valeur
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      } catch (error) {
        console.warn(`Erreur d'écriture dans le localStorage pour la clé "${key}":`, error);
      }
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}
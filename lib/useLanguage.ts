import { useState, useEffect } from "react";

export function useLanguage() {
  const [lang, setLangState] = useState("FR");

  useEffect(() => {
    // Récupère la langue sauvegardée au chargement
    const saved = localStorage.getItem("vivex_lang") || "FR";
    setLangState(saved);

    // Écoute les changements de langue venant d'autres pages/composants
    const handleLangChange = () => {
      setLangState(localStorage.getItem("vivex_lang") || "FR");
    };

    window.addEventListener("languageChanged", handleLangChange);
    return () => window.removeEventListener("languageChanged", handleLangChange);
  }, []);

  const setLang = (newLang: string) => {
    localStorage.setItem("vivex_lang", newLang);
    window.dispatchEvent(new Event("languageChanged")); // Prévient tout le site instantanément
  };

  return { lang, setLang };
}
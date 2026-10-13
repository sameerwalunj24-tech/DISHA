import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import mr from "./mr.json";
import hi from "./hi.json";
import en from "./en.json";

export type Language = "mr" | "hi" | "en";

export const LANGUAGE_NAMES: Record<Language, { label: string; nativeName: string }> = {
  mr: { label: "Marathi", nativeName: "मराठी" },
  hi: { label: "Hindi", nativeName: "हिंदी" },
  en: { label: "English", nativeName: "English" }
};

const translations: Record<Language, typeof mr> = {
  mr,
  hi: hi as typeof mr,
  en: en as typeof mr
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof mr;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("disha_language");
    if (saved === "mr" || saved === "hi" || saved === "en") return saved;
    return "mr"; // Default to Marathi for Maharashtra pilot
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("disha_language", lang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
};

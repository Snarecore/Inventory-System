import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import bnTranslation from "../locales/bn.json";
import enTranslation from "../locales/en.json";

export const LANGUAGE_STORAGE_KEY = "i18nextLng";
export const LEGACY_APPEARANCE_STORAGE_KEY = "cash-boi-appearance-language";

export type SupportedLanguage = "bn" | "en";

// Detect initial language: check localStorage or default to 'bn'
const getInitialLanguage = (): SupportedLanguage => {
  if (typeof window === "undefined") return "bn";
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) || localStorage.getItem(LEGACY_APPEARANCE_STORAGE_KEY);
    if (saved === "en" || saved === "bn") return saved;
  } catch {
    // fallback
  }
  return "bn"; // Default to Bengali as requested
};

const initialLang = getInitialLanguage();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      bn: {
        translation: bnTranslation,
      },
      en: {
        translation: enTranslation,
      },
    },
    lng: initialLang,
    fallbackLng: "bn",
    debug: false,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

export const changeLanguage = (lang: SupportedLanguage) => {
  i18n.changeLanguage(lang);
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    localStorage.setItem(LEGACY_APPEARANCE_STORAGE_KEY, lang);
  } catch (err) {
    console.error("Failed to persist language in localStorage", err);
  }
};

export const getCurrentLanguage = (): SupportedLanguage => {
  return (i18n.language === "en" ? "en" : "bn") as SupportedLanguage;
};

export const t = (key: string, options?: Record<string, any>): string => {
  if (!key) return "";
  return String(i18n.t(key, options));
};

export default i18n;

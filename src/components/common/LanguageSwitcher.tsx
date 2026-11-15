import React from "react";
import { useTranslation } from "react-i18next";
import { FaGlobe } from "react-icons/fa";
import { changeLanguage, SupportedLanguage } from "@/i18n";

export interface LanguageSwitcherProps {
  className?: string;
  variant?: "button" | "pill" | "select";
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = "",
  variant = "pill",
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language?.startsWith("en") ? "en" : "bn") as SupportedLanguage;

  const toggleLanguage = () => {
    const nextLang: SupportedLanguage = currentLang === "bn" ? "en" : "bn";
    changeLanguage(nextLang);
  };

  if (variant === "select") {
    return (
      <div className={`relative inline-flex items-center ${className}`}>
        <FaGlobe className="absolute left-2.5 text-[var(--ui-text-muted)] text-xs pointer-events-none" />
        <select
          value={currentLang}
          onChange={(e) => changeLanguage(e.target.value as SupportedLanguage)}
          className="h-8 pl-8 pr-3 text-xs font-semibold rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] transition-colors shadow-2xs"
          title="Change language / ভাষা পরিবর্তন"
        >
          <option value="bn">বাংলা (BN)</option>
          <option value="en">English (EN)</option>
        </select>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      title={currentLang === "bn" ? "Switch to English" : "বাংলায় পরিবর্তন করুন"}
      aria-label="Switch Language"
      className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-gray-200 dark:border-[var(--ui-border)] bg-gray-100 dark:bg-[var(--ui-surface-muted)] hover:bg-gray-200 dark:hover:bg-[var(--ui-surface-sunken)] text-gray-700 dark:text-[var(--ui-text)] text-xs font-semibold cursor-pointer shadow-2xs select-none transition-all hover:scale-105 active:scale-95 ${className}`}
    >
      <FaGlobe className="text-[var(--primary-color)] text-xs shrink-0" />
      <span>{currentLang === "bn" ? "বাং" : "EN"}</span>
    </button>
  );
};

export default LanguageSwitcher;

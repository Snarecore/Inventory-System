import React from "react";
import { useTranslation } from "react-i18next";
import { changeLanguage, SupportedLanguage } from "@/i18n";

/**
 * High-definition Bangladesh Flag SVG
 */
export const BdFlag: React.FC<{ className?: string }> = ({ className = "w-4.5 h-3.5" }) => (
  <svg
    viewBox="0 0 60 42"
    className={`shrink-0 rounded-[3px] shadow-2xs overflow-hidden border border-black/10 dark:border-white/15 ${className}`}
    aria-hidden="true"
  >
    <rect width="60" height="42" fill="#006a4e" />
    <circle cx="27" cy="21" r="13" fill="#f42a41" />
  </svg>
);

/**
 * High-definition United Kingdom Flag SVG
 */
export const GbFlag: React.FC<{ className?: string }> = ({ className = "w-4.5 h-3.5" }) => (
  <svg
    viewBox="0 0 60 42"
    className={`shrink-0 rounded-[3px] shadow-2xs overflow-hidden border border-black/10 dark:border-white/15 ${className}`}
    aria-hidden="true"
  >
    <clipPath id="uk-flag-clip">
      <rect width="60" height="42" rx="3" />
    </clipPath>
    <g clipPath="url(#uk-flag-clip)">
      <path fill="#012169" d="M0 0h60v42H0z" />
      <path stroke="#ffffff" strokeWidth="7" d="M0 0l60 42M60 0L0 42" />
      <path stroke="#C8102E" strokeWidth="4" d="M0 0l60 42M60 0L0 42" />
      <path stroke="#ffffff" strokeWidth="12" d="M30 0v42M0 21h60" />
      <path stroke="#C8102E" strokeWidth="7" d="M30 0v42M0 21h60" />
    </g>
  </svg>
);

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
        <span className="absolute left-2.5 pointer-events-none flex items-center">
          {currentLang === "bn" ? <BdFlag className="w-4.5 h-3.5" /> : <GbFlag className="w-4.5 h-3.5" />}
        </span>
        <select
          value={currentLang}
          onChange={(e) => changeLanguage(e.target.value as SupportedLanguage)}
          className="h-8 pl-8 pr-3 text-xs font-semibold rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] shadow-2xs"
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
      title={currentLang === "bn" ? "Switch to English (EN)" : "বাংলায় পরিবর্তন করুন (বাং)"}
      aria-label="Switch Language"
      className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-gray-200 dark:border-[var(--ui-border)] bg-gray-100 dark:bg-[var(--ui-surface-muted)] hover:bg-gray-200 dark:hover:bg-[var(--ui-surface-sunken)] text-gray-700 dark:text-[var(--ui-text)] text-xs font-semibold cursor-pointer shadow-2xs select-none transition-colors ${className}`}
    >
      {currentLang === "bn" ? (
        <BdFlag className="w-4.5 h-3.5" />
      ) : (
        <GbFlag className="w-4.5 h-3.5" />
      )}
      <span>{currentLang === "bn" ? "বাং" : "EN"}</span>
    </button>
  );
};

export default LanguageSwitcher;

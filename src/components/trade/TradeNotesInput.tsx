import React, { useState, useRef, useEffect } from "react";
import { FiChevronDown } from "react-icons/fi";
import { useTranslation } from "react-i18next";

export interface TradeNotesInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  mode?: "sale" | "purchase" | "general";
  presets?: string[];
  className?: string;
  rows?: number;
}

const DEFAULT_SALE_PRESETS = [
  "Goods delivered in good condition",
  "Cash received on delivery",
  "Full payment cleared",
  "Standard order completed",
  "Warranty card issued",
];

const DEFAULT_PURCHASE_PRESETS = [
  "Goods received in good condition",
  "Challan verified with physical stock",
  "Standard order delivered",
  "Packaging and seal verified",
  "Full payment cleared",
];

/**
 * Reusable Trade Notes/Remarks Input with Quick-Add Presets Dropdown
 */
export const TradeNotesInput: React.FC<TradeNotesInputProps> = ({
  value,
  onChange,
  label = "Notes / Remarks",
  placeholder = "Type notes or click '+ Presets' to add...",
  mode = "general",
  presets,
  className = "",
  rows = 3,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activePresets =
    presets ||
    (mode === "sale"
      ? DEFAULT_SALE_PRESETS
      : mode === "purchase"
      ? DEFAULT_PURCHASE_PRESETS
      : [...DEFAULT_SALE_PRESETS.slice(0, 3)]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectPreset = (preset: string) => {
    if (!value.trim()) {
      onChange(preset);
    } else if (value.includes(preset)) {
      // already exists, keep as is
    } else {
      onChange(`${value}, ${preset}`);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative flex flex-col ${className}`} ref={containerRef}>
      <div className="h-5 flex items-center justify-between gap-1 mb-1">
        <span className="text-[11px] font-semibold text-[var(--ui-text)] truncate">
          {t(label)}
        </span>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-[11px] font-semibold text-[var(--ui-text)] bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] px-1.5 py-0.5 rounded-[var(--ui-radius-sm)] border border-[var(--ui-border-strong)] transition-all flex items-center gap-1 cursor-pointer shadow-[var(--ui-shadow-control)] h-5"
        >
          <span>{t("+ Presets")}</span>
          <FiChevronDown
            size={11}
            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <div className="relative h-[84px]">
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t(placeholder)}
          className="ui-control ui-control-multiline ui-control-sm h-[84px] resize-none font-medium leading-relaxed w-full"
        />

        {isOpen && (
          <div className="absolute right-0 bottom-full mb-1.5 w-full bg-[var(--ui-surface)] rounded-[var(--ui-radius-lg)] shadow-[var(--ui-shadow-popover)] border border-[var(--ui-border)] z-40 overflow-hidden divide-y divide-[var(--ui-border)]">
            <div className="px-3 py-1.5 bg-[var(--ui-surface-muted)] flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--ui-text)]">
                {t("Choose a preset:")}
              </span>
              <span className="text-[10px] text-[var(--ui-text-subtle)]">{t("Click to add")}</span>
            </div>

            <div className="flex flex-col py-1 divide-y divide-[var(--ui-border)] max-h-48 overflow-y-auto">
              {activePresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(t(preset))}
                  className="px-3 py-2 text-[11px] text-left text-[var(--ui-text)] hover:bg-[var(--primary-color-light)] hover:text-[var(--primary-color)] font-medium transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <span className="truncate">{t(preset)}</span>
                  <span className="text-[10px] text-[var(--ui-text-subtle)] group-hover:text-[var(--primary-color)] font-semibold shrink-0 ml-2">
                    {t("+ Add")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeNotesInput;

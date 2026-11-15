import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FaColumns } from "react-icons/fa";

export interface ColumnItem {
  key: string;
  label: string;
  defaultVisible?: boolean;
}

interface ColumnVisibilityDropdownProps {
  columns: ColumnItem[];
  visibleColumns: Record<string, boolean>;
  onToggle: (key: string) => void;
  onReset: () => void;
  className?: string;
}

export const ColumnVisibilityDropdown: React.FC<ColumnVisibilityDropdownProps> = ({
  columns,
  visibleColumns,
  onToggle,
  onReset,
  className = "",
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const visibleCount = columns.filter((col) => visibleColumns[col.key] !== false).length;

  return (
    <div className={`relative shrink-0 z-50 flex-1 sm:flex-none ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-2.5 h-8 text-[11px] sm:text-xs font-medium text-[var(--ui-text)] bg-[var(--ui-surface-muted)]/80 hover:bg-[var(--ui-surface-sunken)] border border-[var(--ui-border)] rounded-lg transition-colors cursor-pointer"
        title={t("Customize visible columns")}
      >
        <FaColumns className="text-[var(--ui-text)] text-xs shrink-0" />
        <span className="truncate">{t("Columns")}</span>
        <span className="text-[10px] text-[var(--ui-text-muted)] font-semibold bg-[var(--ui-border)]/80 px-1.5 py-0.2 rounded-full">
          {visibleCount}/{columns.length}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-[var(--ui-surface)] rounded-lg shadow-2xl border border-[var(--ui-border)] py-1.5 z-[99999] animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--ui-border)] mb-1">
            <span className="text-xs font-semibold text-[var(--ui-text)]">
              {t("Columns")} ({visibleCount}/{columns.length})
            </span>
            <button
              type="button"
              onClick={onReset}
              className="text-[11px] text-[var(--color-primary)] font-semibold cursor-pointer"
            >
              {t("Reset")}
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-[var(--ui-border)]">
            {columns.map((col) => {
              const isChecked = visibleColumns[col.key] !== false;
              return (
                <label
                  key={col.key}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--primary-color-light)]/60 cursor-pointer text-xs select-none transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggle(col.key)}
                    className="rounded border-[var(--ui-border-strong)] text-[var(--color-primary)] focus:ring-0 accent-[var(--color-primary)] w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className={`truncate text-xs ${isChecked ? "text-[var(--ui-text)] font-medium" : "text-[var(--ui-text-subtle)] font-normal"}`}>
                    {t(col.label)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnVisibilityDropdown;
import React, { useState, useRef, useEffect, useMemo } from "react";
import { FiChevronDown, FiCheck } from "react-icons/fi";
import { useTranslation } from "react-i18next";

export interface FilterOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TableFilterSelectProps {
  value: string;
  onChange?: ((value: string) => void) | ((e: { target: { value: string } }) => void);
  options?: FilterOption[];
  children?: React.ReactNode;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  align?: "left" | "right";
  ariaLabel?: string;
  isFiltered?: boolean;
}

/**
 * Modern, beautifully styled dropdown filter component for table toolbars.
 * Replaces ugly browser-native <select> tags with a sleek, rounded, accessible menu
 * matching Search and DateRangePicker heights (h-8 = 32px).
 */
export const TableFilterSelect: React.FC<TableFilterSelectProps> = ({
  value,
  onChange,
  options: propOptions,
  children,
  placeholder,
  className = "",
  buttonClassName = "",
  menuClassName = "",
  disabled = false,
  align = "left",
  ariaLabel,
  isFiltered: customIsFiltered,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [menuAlign, setMenuAlign] = useState<"left" | "right">(align);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  // Parse options from either `options` prop or `<option>` children
  const parsedOptions = useMemo<FilterOption[]>(() => {
    if (propOptions && propOptions.length > 0) {
      return propOptions;
    }

    if (!children) return [];

    const extracted: FilterOption[] = [];
    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return;
      const childProps = child.props as any;
      if (child.type === "option" || childProps.value !== undefined) {
        const optVal = String(childProps.value ?? "");
        let optLabel = childProps.children;
        if (typeof optLabel === "string") {
          optLabel = optLabel;
        } else if (Array.isArray(optLabel)) {
          optLabel = optLabel.join(" ");
        } else {
          optLabel = optVal;
        }
        extracted.push({
          value: optVal,
          label: String(optLabel),
        });
      }
    });

    return extracted;
  }, [propOptions, children]);

  // Find currently active option
  const selectedOption = useMemo(() => {
    return parsedOptions.find((opt) => opt.value === value);
  }, [parsedOptions, value]);

  const currentLabel = selectedOption
    ? selectedOption.label
    : (placeholder || (parsedOptions[0] ? parsedOptions[0].label : "Select"));

  // Check if a non-empty/non-default filter is currently applied
  const isFiltered =
    customIsFiltered !== undefined
      ? customIsFiltered
      : Boolean(value && value !== "" && value !== "all" && value !== "ALL");

  // Keep highlightedIndex in sync when opened
  useEffect(() => {
    if (isOpen) {
      const idx = parsedOptions.findIndex((opt) => opt.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen, parsedOptions, value]);

  // Outside click listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) return;

    if (!isOpen && containerRef.current && typeof window !== "undefined") {
      const rect = containerRef.current.getBoundingClientRect();
      const popupWidth = 180;
      if (align === "left" && window.innerWidth - rect.left < popupWidth && rect.right >= popupWidth) {
        setMenuAlign("right");
      } else if (align === "right" && rect.right < popupWidth && window.innerWidth - rect.left >= popupWidth) {
        setMenuAlign("left");
      } else {
        setMenuAlign(align);
      }
    }

    setIsOpen((prev) => !prev);
  };

  const handleSelect = (optValue: string) => {
    if (disabled) return;
    setIsOpen(false);

    if (!onChange) return;
    const fn = onChange as any;
    try {
      const fnStr = fn.toString();
      if (fnStr.includes(".target") || fnStr.includes("target.value") || fnStr.includes("e.target")) {
        fn({ target: { value: optValue }, currentTarget: { value: optValue } });
      } else {
        fn(optValue);
      }
    } catch {
      fn(optValue);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        handleToggle();
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < parsedOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : parsedOptions.length - 1
        );
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < parsedOptions.length) {
          handleSelect(parsedOptions[highlightedIndex].value);
        }
        break;
      case "Tab":
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`relative inline-block ${isOpen ? "z-50" : "z-20"} ${className}`.trim()}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || currentLabel}
        className={`w-full h-8 px-2.5 flex items-center justify-between text-xs font-medium rounded-lg border transition-all cursor-pointer select-none outline-none ${
          disabled
            ? "opacity-50 cursor-not-allowed bg-[var(--ui-surface-sunken)] border-[var(--ui-border)] text-[var(--ui-text-subtle)]"
            : isOpen
            ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)] bg-[var(--ui-surface)] text-[var(--ui-text)] shadow-sm"
            : isFiltered
            ? "border-[var(--color-primary)] bg-[var(--primary-color-light)]/40 text-[var(--color-primary)] font-semibold shadow-xs"
            : "border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] hover:border-[var(--ui-border-strong)]"
        } ${buttonClassName}`.trim()}
      >
        <div className="flex items-center gap-1.5 truncate flex-1 text-left mr-1">
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <span className="truncate">{t(currentLabel)}</span>
        </div>
        <FiChevronDown
          size={12}
          className={`shrink-0 text-[var(--ui-text-muted)] transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[var(--color-primary)]" : ""
          }`}
        />
      </button>

      {/* Styled Popup Menu */}
      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className={`absolute top-full mt-1 min-w-full w-max max-w-[260px] bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg shadow-xl shadow-black/10 dark:shadow-black/50 p-1 z-[99999] animate-in fade-in zoom-in-95 duration-100 ${
            menuAlign === "right" ? "right-0" : "left-0"
          } ${menuClassName}`.trim()}
        >
          <div className="max-h-60 overflow-y-auto dropdownScrollbar py-0.5 space-y-0.5">
            {parsedOptions.map((opt, index) => {
              const isSelected = opt.value === value;
              const isHighlighted = highlightedIndex === index;
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[var(--primary-color-light)] text-[var(--color-primary)] font-semibold"
                      : isHighlighted
                      ? "bg-[var(--primary-color-light)]/60 text-[var(--color-primary)]"
                      : "text-[var(--ui-text)] hover:bg-[var(--primary-color-light)]/60 hover:text-[var(--color-primary)]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate mr-2">
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <span className="truncate">{t(opt.label)}</span>
                  </div>
                  {isSelected && (
                    <FiCheck
                      size={12}
                      className="text-[var(--color-primary)] shrink-0"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TableFilterSelect;

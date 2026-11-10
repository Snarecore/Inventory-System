import React, { useState, useRef, useEffect } from "react";
import { FiChevronDown } from "react-icons/fi";
import { FaSearch } from "react-icons/fa";

export interface ReportPartyOption {
  id: string;
  name: string;
  phone: string;
}

interface ReportPartyFilterDropdownProps {
  parties: ReportPartyOption[];
  selectedParty: string;
  onSelect: (partyName: string) => void;
  allLabel: string;
  searchPlaceholder: string;
  emptyLabel?: string;
}

/**
 * Reusable searchable Customer / Supplier dropdown filter for Trade Report toolbars
 */
export const ReportPartyFilterDropdown: React.FC<ReportPartyFilterDropdownProps> = ({
  parties,
  selectedParty,
  onSelect,
  allLabel,
  searchPlaceholder,
  emptyLabel = "No match found",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (parties.length === 0) return null;

  const trimmedQuery = searchQuery.toLowerCase().trim();
  const filteredOptions = trimmedQuery
    ? parties.filter(
        (p) =>
          p.name.toLowerCase().includes(trimmedQuery) ||
          p.phone.toLowerCase().includes(trimmedQuery)
      )
    : parties;

  const currentLabel = selectedParty === "all" ? allLabel : selectedParty;

  return (
    <div
      className="relative w-[calc(50%-4px)] sm:w-36 shrink-0 z-50"
      ref={containerRef}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full h-8 px-2 flex items-center justify-between text-xs border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
      >
        <span className="truncate flex-1 text-left">{currentLabel}</span>
        <FiChevronDown
          className="text-[var(--ui-text-muted)] shrink-0 ml-1 text-xs"
          size={13}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-64 max-w-[calc(100vw-2rem)] bg-[var(--ui-surface)] rounded-lg shadow-2xl border border-[var(--ui-border)] p-2 z-[99999]">
          <div className="relative mb-2">
            <FaSearch className="absolute left-2.5 top-2.5 text-[var(--ui-text-subtle)] text-xs" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-[var(--color-primary)] rounded-md focus:outline-none focus:border-[var(--color-primary)] text-[var(--ui-text)]"
              autoFocus
            />
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-[var(--ui-border)]">
            <div
              onClick={() => {
                onSelect("all");
                setIsOpen(false);
                setSearchQuery("");
              }}
              className={`p-2 hover:bg-[var(--primary-color-light)] cursor-pointer rounded-md transition-colors text-xs font-medium ${
                selectedParty === "all"
                  ? "bg-[var(--primary-color-light)] text-[var(--color-primary)] font-semibold"
                  : "text-[var(--ui-text)]"
              }`}
            >
              {allLabel}
            </div>

            {filteredOptions.length > 0 ? (
              filteredOptions.map((p) => {
                const isSelected =
                  selectedParty.toLowerCase() === p.name.toLowerCase();
                return (
                  <div
                    key={p.id + p.name}
                    onClick={() => {
                      onSelect(p.name);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className={`p-2 hover:bg-[var(--primary-color-light)] cursor-pointer rounded-md transition-colors text-xs flex justify-between items-center ${
                      isSelected
                        ? "bg-[var(--primary-color-light)] text-[var(--color-primary)] font-semibold"
                        : "text-[var(--ui-text)]"
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {p.phone && (
                      <span className="text-[10px] text-[var(--ui-text-muted)] shrink-0 ml-1">
                        ({p.phone})
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-[var(--ui-text-subtle)] text-xs">
                {emptyLabel}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportPartyFilterDropdown;

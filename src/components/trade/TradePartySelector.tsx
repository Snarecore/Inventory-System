import React, { useState, useRef, useEffect, useMemo } from "react";
import { FaSearch, FaUserPlus, FaWalking } from "react-icons/fa";
import { FiChevronDown } from "react-icons/fi";
import TextInput from "@/components/form/TextInput";
import type { PartyItem } from "@/types";
import { formatMoney } from "@/utils/formatters";
import { useDebounce } from "@/hooks/useDebounce";

export const WALK_IN_CUSTOMER: PartyItem = {
  id: 0,
  name: "Walk-in Customer",
  phone: "",
  address: "",
  type: "CUSTOMER",
};

export interface TradePartySelectorProps {
  partyType?: "customer" | "supplier";
  label?: string;
  required?: boolean;
  selectedParty: PartyItem | null;
  partyList: PartyItem[];
  onSelectParty: (party: PartyItem) => void;
  onOpenNewPartyModal?: () => void;
  allowWalkIn?: boolean;
  walkInName?: string;
  walkInPhone?: string;
  onChangeWalkInName?: (val: string) => void;
  onChangeWalkInPhone?: (val: string) => void;
  previousDue?: number | null;
  isLoadingDue?: boolean;
}

export const TradePartySelector: React.FC<TradePartySelectorProps> = ({
  partyType = "customer",
  label,
  required = true,
  selectedParty,
  partyList,
  onSelectParty,
  onOpenNewPartyModal,
  allowWalkIn = false,
  walkInName = "",
  walkInPhone = "",
  onChangeWalkInName,
  onChangeWalkInPhone,
  previousDue,
  isLoadingDue = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 200);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayLabel = label || (partyType === "customer" ? "Customer" : "Supplier");
  const isWalkIn = Boolean(
    allowWalkIn &&
      selectedParty &&
      (selectedParty.id === 0 || selectedParty.name === "Walk-in Customer")
  );

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered List - encapsulated locally so typing in search does NOT re-render parent form!
  const filteredParties = useMemo(() => {
    if (!debouncedSearch.trim()) return partyList.slice(0, 15);
    const q = debouncedSearch.toLowerCase().trim();
    return partyList
      .filter((p) => {
        const name = (p.name || "").toLowerCase();
        const phone = (p.phone || "").toLowerCase();
        const address = (p.address || "").toLowerCase();
        return name.includes(q) || phone.includes(q) || address.includes(q);
      })
      .slice(0, 25);
  }, [partyList, debouncedSearch]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center justify-between mb-1">
        <label className="ui-label block">
          {displayLabel} {required && <span className="text-[var(--ui-danger)]">*</span>}
        </label>
        <div className="flex items-center gap-1.5">
          {allowWalkIn && (
            <button
              type="button"
              onClick={() => {
                onSelectParty(WALK_IN_CUSTOMER);
                setIsDropdownOpen(false);
              }}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[var(--ui-radius-sm)] border transition-colors flex items-center gap-1 cursor-pointer ${
                isWalkIn
                  ? "bg-[var(--ui-success)] text-white border-[var(--ui-success)]"
                  : "text-[var(--ui-success-dark)] bg-[var(--ui-success-light)] hover:bg-[var(--ui-success-border)] border-[var(--ui-success-border)]"
              }`}
              title="Quick 1-click counter / walk-in customer"
            >
              <FaWalking size={10} />
              <span>Walk-in</span>
            </button>
          )}
          {onOpenNewPartyModal && (
            <button
              type="button"
              onClick={onOpenNewPartyModal}
              className="text-[11px] font-bold text-[var(--primary-color)] flex items-center gap-1 cursor-pointer"
            >
              <FaUserPlus size={10} /> + New
            </button>
          )}
        </div>
      </div>

      <div
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        className={`flex items-center justify-between h-[var(--ui-control-h-sm)] px-2.5 py-1.5 border rounded-[var(--ui-radius)] bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] cursor-pointer text-[length:var(--ui-font-size-sm)] transition-colors ${
          isWalkIn ? "border-[var(--ui-success-border)] bg-[var(--ui-success-light)]/30" : "border-[var(--ui-border-strong)]"
        }`}
      >
        {selectedParty ? (
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            {isWalkIn ? (
              <span className="font-bold text-[var(--ui-success-dark)] flex items-center gap-1 truncate">
                <FaWalking size={12} className="text-[var(--ui-success-dark)] shrink-0" />
                Walk-in Customer {walkInName ? `(${walkInName})` : "(Counter Sale)"}
              </span>
            ) : (
              <>
                <span className="font-bold text-[var(--ui-text)] truncate">
                  {selectedParty.name}
                </span>
                {selectedParty.phone && (
                  <span className="text-[11px] text-[var(--ui-text)] shrink-0">
                    ({selectedParty.phone})
                  </span>
                )}
                {selectedParty.address && (
                  <span className="text-[11px] text-[var(--ui-text)] truncate">
                    - {selectedParty.address}
                  </span>
                )}
              </>
            )}
          </div>
        ) : (
          <span className="text-[var(--ui-text-subtle)]">
            Select or search {displayLabel.toLowerCase()}...
          </span>
        )}
        <FiChevronDown className="text-[var(--ui-text-muted)] text-xs ml-1 shrink-0" size={14} />
      </div>

      {/* Customer Previous Due Banner (Loaded from Backend /customer-invoices-due) */}
      {!isWalkIn && selectedParty && previousDue !== undefined && previousDue !== null && (
        <div className="mt-1 flex items-center justify-between px-2.5 py-1 bg-[var(--ui-warning-light)]/80 border border-[var(--ui-warning-border)]/90 rounded-[var(--ui-radius-sm)] text-[11px]">
          <span className="text-[var(--ui-warning-dark)] font-medium">Previous Due:</span>
          <span className={`font-bold ${previousDue > 0 ? "text-[var(--ui-danger)]" : "text-[var(--ui-success)]"}`}>
            {isLoadingDue ? "Loading..." : formatMoney(previousDue)}
          </span>
        </div>
      )}

      {/* Optional Walk-in Inputs */}
      {isWalkIn && (
        <div className="mt-1 grid grid-cols-2 gap-1.5 p-1 bg-[var(--ui-success-light)]/70 border border-[var(--ui-success-border)] rounded-[var(--ui-radius)]">
          <TextInput
            placeholder="Name (Optional)"
            value={walkInName}
            onChange={(val) => onChangeWalkInName?.(val)}
            wrapperClass="ui-control-xs focus-within:!border-[var(--ui-success)] focus-within:!shadow-[0_0_0_3px_color-mix(in_srgb,var(--ui-success)_18%,transparent)]"
            inputClass="font-medium text-[var(--ui-text)]"
          />
          <TextInput
            placeholder="Phone (Optional)"
            value={walkInPhone}
            onChange={(val) => onChangeWalkInPhone?.(val)}
            wrapperClass="ui-control-xs focus-within:!border-[var(--ui-success)] focus-within:!shadow-[0_0_0_3px_color-mix(in_srgb,var(--ui-success)_18%,transparent)]"
            inputClass="font-medium text-[var(--ui-text)]"
          />
        </div>
      )}

      {/* Dropdown Panel */}
      {isDropdownOpen && (
        <div className="absolute left-0 right-0 sm:right-auto sm:w-96 max-w-[calc(100vw-32px)] mt-1 bg-[var(--ui-surface)] rounded-[var(--ui-radius)] shadow-[var(--ui-shadow-popover)] border border-[var(--ui-border)] p-2 z-30">
          <div className="mb-2">
            <TextInput
              icon={<FaSearch className="text-[var(--ui-text-subtle)] text-xs" />}
              placeholder={`Search ${displayLabel.toLowerCase()} name, phone, address...`}
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              autoFocus
              wrapperClass="ui-control-xs"
            />
          </div>

          {/* Quick Walk-in Option inside dropdown for Customer */}
          {allowWalkIn && (
            <div
              onClick={() => {
                onSelectParty(WALK_IN_CUSTOMER);
                setIsDropdownOpen(false);
              }}
              className="px-2 py-1 mb-1 bg-[var(--ui-success-light)] hover:bg-[var(--ui-success-border)]/80 border border-[var(--ui-success-border)] rounded-[var(--ui-radius-sm)] cursor-pointer transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-[var(--ui-success)] text-white flex items-center justify-center shrink-0 text-[10px]">
                  <FaWalking size={10} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-[var(--ui-success-dark)] text-[11px] leading-tight">
                    Walk-in Customer
                  </span>
                  <span className="text-[10px] text-[var(--ui-success-dark)] leading-tight">
                    Quick counter sale / সাধারণ ক্রেতা
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[var(--ui-success-dark)] bg-[var(--ui-surface)] px-1.5 py-0.5 rounded-[var(--ui-radius-sm)] border border-[var(--ui-success-border)] shadow-[var(--ui-shadow-control)]">
                Select
              </span>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto divide-y divide-[var(--ui-border)]">
            {filteredParties.length > 0 ? (
              filteredParties.map((p) => {
                const partyKey = p.id ?? p.name;
                const balance = p.openingBalance ?? p.balance ?? 0;
                return (
                  <div
                    key={partyKey}
                    onClick={() => {
                      onSelectParty(p);
                      setIsDropdownOpen(false);
                    }}
                    className="p-2 hover:bg-[var(--primary-color-light)] cursor-pointer rounded-[var(--ui-radius-sm)] transition-colors text-xs flex justify-between items-center"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-[var(--ui-text)]">{p.name}</span>
                        {p.phone && (
                          <span className="text-[11px] text-[var(--ui-text)]">({p.phone})</span>
                        )}
                      </div>
                      {p.address && (
                        <span className="text-[10px] text-[var(--ui-text)] truncate mt-0.5">
                          {p.address}
                        </span>
                      )}
                    </div>
                    {balance !== undefined && balance !== null && balance !== "" && (
                      <span className="text-[10px] text-[var(--ui-danger)] bg-[var(--ui-danger-light)] px-1.5 py-0.5 rounded-[var(--ui-radius-sm)] shrink-0 ml-1">
                        Bal: ৳{balance}
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-[var(--ui-text-subtle)] text-xs">
                No {displayLabel.toLowerCase()} found
              </div>
            )}
          </div>

          {/* Add New Party Action Button */}
          {onOpenNewPartyModal && searchQuery.trim() && (
            <div
              onClick={() => {
                onOpenNewPartyModal();
                setIsDropdownOpen(false);
              }}
              className="mt-2 p-2 bg-[var(--primary-color-light)] hover:bg-[var(--primary-color-muted)] border border-[var(--primary-color-muted)] rounded-[var(--ui-radius-sm)] cursor-pointer text-xs flex items-center justify-between text-[var(--primary-color)] font-bold transition-colors"
            >
              <span className="flex items-center gap-1.5 truncate">
                <FaUserPlus size={11} /> Add "{searchQuery}" as New {displayLabel}
              </span>
              <span className="text-[10px] bg-[var(--ui-surface)] px-1.5 py-0.5 rounded-[var(--ui-radius-sm)] border border-[var(--primary-color-muted)] shrink-0">
                + Add
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TradePartySelector;

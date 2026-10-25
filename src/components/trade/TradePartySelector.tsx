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
        <label className="text-[11px] font-bold text-black tracking-wider block">
          {displayLabel} {required && <span className="text-rose-500">*</span>}
        </label>
        <div className="flex items-center gap-1.5">
          {allowWalkIn && (
            <button
              type="button"
              onClick={() => {
                onSelectParty(WALK_IN_CUSTOMER);
                setIsDropdownOpen(false);
              }}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                isWalkIn
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
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
              className="text-[11px] font-bold text-[var(--color-primary)] flex items-center gap-1 cursor-pointer"
            >
              <FaUserPlus size={10} /> + New
            </button>
          )}
        </div>
      </div>

      <div
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        className={`flex items-center justify-between h-9 px-2.5 py-1.5 border rounded-lg bg-gray-50/50 hover:bg-white cursor-pointer text-xs transition-colors ${
          isWalkIn ? "border-emerald-400 bg-emerald-50/30" : "border-gray-300"
        }`}
      >
        {selectedParty ? (
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            {isWalkIn ? (
              <span className="font-bold text-emerald-800 flex items-center gap-1 truncate">
                <FaWalking size={12} className="text-emerald-700 shrink-0" />
                Walk-in Customer {walkInName ? `(${walkInName})` : "(Counter Sale)"}
              </span>
            ) : (
              <>
                <span className="font-bold text-black truncate">
                  {selectedParty.name}
                </span>
                {selectedParty.phone && (
                  <span className="text-[11px] text-gray-700 shrink-0">
                    ({selectedParty.phone})
                  </span>
                )}
                {selectedParty.address && (
                  <span className="text-[11px] text-black truncate">
                    - {selectedParty.address}
                  </span>
                )}
              </>
            )}
          </div>
        ) : (
          <span className="text-gray-400">
            Select or search {displayLabel.toLowerCase()}...
          </span>
        )}
        <FiChevronDown className="text-gray-500 text-xs ml-1 shrink-0" size={14} />
      </div>

      {/* Customer Previous Due Banner (Loaded from Backend /customer-invoices-due) */}
      {!isWalkIn && selectedParty && previousDue !== undefined && previousDue !== null && (
        <div className="mt-1 flex items-center justify-between px-2.5 py-1 bg-amber-50/80 border border-amber-200/90 rounded-md text-[11px]">
          <span className="text-amber-900 font-medium">Previous Due:</span>
          <span className={`font-bold ${previousDue > 0 ? "text-rose-600" : "text-emerald-600"}`}>
            {isLoadingDue ? "Loading..." : formatMoney(previousDue)}
          </span>
        </div>
      )}

      {/* Optional Walk-in Inputs */}
      {isWalkIn && (
        <div className="mt-1.5 grid grid-cols-2 gap-1.5 p-1.5 bg-emerald-50/70 border border-emerald-200 rounded-lg">
          <TextInput
            placeholder="Name (Optional)"
            value={walkInName}
            onChange={(val) => onChangeWalkInName?.(val)}
            wrapperClass="!h-7 !px-2 bg-white !border-gray-300 focus-within:!border-emerald-500 focus-within:!ring-emerald-500"
            inputClass="font-medium text-black"
          />
          <TextInput
            placeholder="Phone (Optional)"
            value={walkInPhone}
            onChange={(val) => onChangeWalkInPhone?.(val)}
            wrapperClass="!h-7 !px-2 bg-white !border-gray-300 focus-within:!border-emerald-500 focus-within:!ring-emerald-500"
            inputClass="font-medium text-black"
          />
        </div>
      )}

      {/* Dropdown Panel */}
      {isDropdownOpen && (
        <div className="absolute left-0 right-0 sm:right-auto sm:w-96 max-w-[calc(100vw-32px)] mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-30">
          <div className="mb-2">
            <TextInput
              icon={<FaSearch className="text-gray-400 text-xs" />}
              placeholder={`Search ${displayLabel.toLowerCase()} name, phone, address...`}
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              autoFocus
              wrapperClass="!h-8 !px-2 bg-white !border-gray-200"
            />
          </div>

          {/* Quick Walk-in Option inside dropdown for Customer */}
          {allowWalkIn && (
            <div
              onClick={() => {
                onSelectParty(WALK_IN_CUSTOMER);
                setIsDropdownOpen(false);
              }}
              className="px-2 py-1 mb-1 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-md cursor-pointer transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-[10px]">
                  <FaWalking size={10} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-emerald-900 text-[11px] leading-tight">
                    Walk-in Customer
                  </span>
                  <span className="text-[9.5px] text-emerald-700 leading-tight">
                    Quick counter sale / সাধারণ ক্রেতা
                  </span>
                </div>
              </div>
              <span className="text-[9.5px] font-bold text-emerald-800 bg-white px-1.5 py-0.5 rounded border border-emerald-300 shadow-2xs">
                Select
              </span>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
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
                    className="p-2 hover:bg-sky-50 cursor-pointer rounded-md transition-colors text-xs flex justify-between items-center"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-black">{p.name}</span>
                        {p.phone && (
                          <span className="text-[11px] text-black">({p.phone})</span>
                        )}
                      </div>
                      {p.address && (
                        <span className="text-[10px] text-black truncate mt-0.5">
                          {p.address}
                        </span>
                      )}
                    </div>
                    {balance !== undefined && balance !== null && balance !== "" && (
                      <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded shrink-0 ml-1">
                        Bal: ৳{balance}
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-gray-400 text-xs">
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
              className="mt-2 p-2 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-md cursor-pointer text-xs flex items-center justify-between text-[var(--color-primary)] font-bold transition-colors"
            >
              <span className="flex items-center gap-1.5 truncate">
                <FaUserPlus size={11} /> Add "{searchQuery}" as New {displayLabel}
              </span>
              <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-sky-300 shrink-0">
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

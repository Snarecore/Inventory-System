import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  FaFileInvoiceDollar,
  FaSearch,
  FaTimes,
  FaSpinner,
  FaMoneyBillWave,
  FaCreditCard,
  FaMobileAlt,
} from "react-icons/fa";
import { RiArrowDropDownLine } from "react-icons/ri";
import { formatMoney } from "@/utils/formatters";
import type { InvoiceDueItem, CollectionAllocation } from "@/types/collection.types";
import { useDebounce } from "@/hooks/useDebounce";

export interface TenderBreakdown {
  cash: number;
  bank: number;
  mfs: number;
  bankName?: string;
  mfsName?: string;
}

interface DueInvoiceAllocationTableProps {
  invoices: InvoiceDueItem[];
  isLoading: boolean;
  selectedInvoiceNos: Set<string>;
  onToggleInvoice: (invoiceNo: string) => void;
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
  allocations: CollectionAllocation[];
  isManualMode: boolean;
  onToggleManualMode: () => void;
  tenderBreakdown?: TenderBreakdown;
}

export const DueInvoiceAllocationTable: React.FC<DueInvoiceAllocationTableProps> = ({
  invoices,
  isLoading,
  selectedInvoiceNos,
  onToggleInvoice,
  onToggleSelectAll,
  isAllSelected,
  allocations,
  isManualMode,
  onToggleManualMode,
  tenderBreakdown,
}) => {
  const [filterQuery, setFilterQuery] = useState<string>("");
  const debouncedFilterQuery = useDebounce(filterQuery, 200);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState<boolean>(false);
  const [dropdownCoords, setDropdownCoords] = useState<{
    top: number;
    left: number;
    arrowLeft: number;
    isPlacementTop: boolean;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const payingThRef = useRef<HTMLTableCellElement>(null);
  const breakdownRef = useRef<HTMLDivElement>(null);

  const updateDropdownPosition = () => {
    const targetEl = buttonRef.current || payingThRef.current;
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const dropdownWidth = 250;
    const estimatedHeight = 118;

    // Find the modal dialog element
    const modalEl = targetEl.closest('.bg-white.rounded-xl') || document.querySelector('.bg-white.rounded-xl');
    const modalRect = modalEl?.getBoundingClientRect();

    const buttonCenter = rect.left + rect.width / 2;
    let left = buttonCenter - dropdownWidth / 2;

    // Horizontally clamp to stay strictly within modal boundary
    if (modalRect) {
      left = Math.max(modalRect.left + 8, Math.min(left, modalRect.right - dropdownWidth - 8));
    } else {
      const maxLeft = typeof window !== "undefined" ? window.innerWidth - dropdownWidth - 10 : 0;
      left = Math.max(10, Math.min(left, maxLeft));
    }

    let top = rect.bottom + 4;
    let isPlacementTop = false;

    if (modalRect) {
      const spaceBelow = modalRect.bottom - rect.bottom;
      const spaceAbove = rect.top - modalRect.top;

      // If space below inside the modal is insufficient, and space above has room, flip to open upwards
      if (spaceBelow < estimatedHeight + 8 && spaceAbove >= estimatedHeight) {
        top = rect.top - estimatedHeight - 4;
        isPlacementTop = true;
      } else {
        // Opening downwards: strictly clamp so it CANNOT exceed modal bottom
        if (top + estimatedHeight > modalRect.bottom - 8) {
          top = modalRect.bottom - estimatedHeight - 8;
        }
      }
      // Guarantee it never exceeds modal top
      if (top < modalRect.top + 8) {
        top = modalRect.top + 8;
      }
    }

    setDropdownCoords({
      top,
      left,
      arrowLeft: Math.max(12, Math.min(dropdownWidth - 16, buttonCenter - left)),
      isPlacementTop,
    });
  };

  const handleToggleBreakdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isBreakdownOpen) {
      setIsBreakdownOpen(false);
    } else {
      updateDropdownPosition();
      setIsBreakdownOpen(true);
    }
  };

  useEffect(() => {
    if (!isBreakdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        breakdownRef.current &&
        !breakdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsBreakdownOpen(false);
      }
    };
    const handleScroll = (e: Event) => {
      if (breakdownRef.current && breakdownRef.current.contains(e.target as Node)) {
        return;
      }
      setIsBreakdownOpen(false);
    };
    const handleResize = () => {
      setIsBreakdownOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isBreakdownOpen]);

  const allocationMap = useMemo(() => {
    const map = new Map<string, CollectionAllocation>();
    allocations.forEach((a) => map.set(a.invoiceNo, a));
    return map;
  }, [allocations]);

  const filteredInvoices = useMemo(() => {
    if (!debouncedFilterQuery.trim()) return invoices;
    const q = debouncedFilterQuery.toLowerCase().trim();
    return invoices.filter((inv) => {
      const invNo = String(inv.invoiceNo || "").toLowerCase();
      return invNo.includes(q);
    });
  }, [invoices, debouncedFilterQuery]);

  if (isLoading) {
    return (
      <div className="p-4 text-center text-xs text-gray-500 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center gap-2">
        <FaSpinner className="animate-spin text-[var(--color-primary)]" size={13} />
        <span>Loading pending invoices...</span>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-gray-500 border border-gray-200 rounded-lg bg-gray-50">
        <FaFileInvoiceDollar size={20} className="mx-auto text-gray-300 mb-1" />
        <p className="font-semibold text-black">No individual invoices due</p>
        <p className="text-[11px] text-gray-400">
          Collection will be credited directly against the customer ledger balance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Allocation Header */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-black">
            Pending Invoices ({invoices.length})
          </span>
        </div>
      </div>

      {/* Bill Search if many invoices */}
      {invoices.length > 3 && (
        <div className="relative">
          <FaSearch className="absolute left-2.5 top-2.5 text-gray-400 text-xs" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter invoice no..."
            className="w-full pl-7 pr-6 py-1 bg-white border border-gray-200 rounded-md text-xs text-black focus:outline-none focus:border-[var(--color-primary)]"
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery("")}
              className="absolute right-2 top-1.5 text-gray-400 hover:text-black cursor-pointer"
            >
              <FaTimes size={10} />
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-200 rounded-lg max-h-52 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gray-100 text-black font-semibold sticky top-0 z-10 border-b border-gray-200 whitespace-nowrap">
            <tr>
              {isManualMode && (
                <th className="py-1 px-2 text-center w-8 shrink-0 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onToggleSelectAll}
                    className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                    title="Select All"
                  />
                </th>
              )}
              <th className="py-1 px-2.5 whitespace-nowrap">Invoice No</th>
              <th className="py-1 px-2.5 whitespace-nowrap">Date</th>
              <th className="py-1 px-2.5 text-right whitespace-nowrap">Due (৳)</th>
              <th ref={payingThRef} className="py-1 px-2.5 text-right whitespace-nowrap">
                <div className="inline-flex items-center justify-end gap-1 select-none">
                  <span>Paying (৳)</span>
                  <button
                    ref={buttonRef}
                    type="button"
                    onClick={handleToggleBreakdown}
                    className={`p-0.5 rounded transition-colors cursor-pointer inline-flex items-center justify-center ${
                      isBreakdownOpen
                        ? "bg-black text-white"
                        : "hover:bg-gray-200 text-gray-700 hover:text-black"
                    }`}
                    title="Click to view payment breakdown (Cash, Bank, MFS)"
                  >
                    <RiArrowDropDownLine
                      className={`text-lg leading-none transition-transform duration-150 ${
                        isBreakdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>
              </th>
              <th className="py-1 px-2.5 text-right whitespace-nowrap">Discount (৳)</th>
              <th className="py-1 px-2.5 text-right whitespace-nowrap">Remaining (৳)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 whitespace-nowrap">
            {filteredInvoices.map((inv) => {
              const isSelected = selectedInvoiceNos.has(inv.invoiceNo);
              const alloc = allocationMap.get(inv.invoiceNo);
              const paidAmount = alloc
                ? Number(alloc.allocatedPaid ?? alloc.paidAmount ?? 0)
                : 0;
              const discountAmount = alloc
                ? Number(alloc.allocatedDiscount ?? alloc.discountAmount ?? 0)
                : 0;
              const dueAmount = Number(inv.dueAmount || 0);
              const remainingDue = alloc
                ? Number(alloc.remainingDue ?? alloc.dueAmount ?? Math.max(0, dueAmount - paidAmount - discountAmount))
                : dueAmount;

              return (
                <tr
                  key={inv.invoiceNo}
                  className={`hover:bg-gray-50/80 transition-colors ${
                    paidAmount > 0 || discountAmount > 0
                      ? "bg-gray-50/70"
                      : isSelected && isManualMode
                      ? "bg-gray-50/40"
                      : ""
                  }`}
                >
                  {isManualMode && (
                    <td className="py-1 px-2 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleInvoice(inv.invoiceNo)}
                        className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="py-1 px-2.5 text-black font-medium whitespace-nowrap">
                    {inv.invoiceNo}
                  </td>
                  <td className="py-1 px-2.5 text-black whitespace-nowrap">
                    {inv.salesDate || inv.date
                      ? String(inv.salesDate || inv.date).replace("T", " ").split(" ")[0]
                      : "-"}
                  </td>
                  <td className="py-1 px-2.5 text-right text-black font-semibold whitespace-nowrap">
                    {formatMoney(dueAmount)}
                  </td>
                  <td className="py-1 px-2.5 text-right font-bold text-black whitespace-nowrap">
                    {paidAmount > 0 ? formatMoney(paidAmount) : "-"}
                  </td>
                  <td className="py-1 px-2.5 text-right font-bold text-black whitespace-nowrap">
                    {discountAmount > 0 ? formatMoney(discountAmount) : "-"}
                  </td>
                  <td className="py-1 px-2.5 text-right text-black font-semibold whitespace-nowrap">
                    {formatMoney(remainingDue)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating Payment Breakdown Dropdown Popover (Rendered via Portal to prevent clipping) */}
      {isBreakdownOpen && dropdownCoords && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={breakdownRef}
            style={{
              position: "fixed",
              top: `${dropdownCoords.top}px`,
              left: `${dropdownCoords.left}px`,
              width: "250px",
            }}
            className="z-[99999] p-2 bg-white rounded-lg shadow-2xl border border-gray-200 text-left normal-case font-normal text-xs animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pointer arrow (flips dynamically) */}
            <div
              className={`absolute w-2.5 h-2.5 bg-white rotate-45 ${
                dropdownCoords.isPlacementTop
                  ? "-bottom-1.5 border-b border-r border-gray-200"
                  : "-top-1.5 border-t border-l border-gray-200"
              }`}
              style={{ left: `${dropdownCoords.arrowLeft - 5}px` }}
            />

            <div className="relative z-10">
              <div className="text-[10px] font-bold text-black uppercase tracking-wider pb-1 mb-1 border-b border-gray-200 flex items-center justify-between">
                <span>Payment Breakdown</span>
              </div>

              <div className="space-y-1 text-xs">
                {/* Cash Leg */}
                <div className="flex items-center justify-between py-1 px-1.5 rounded bg-gray-50 border border-gray-200/80 text-black">
                  <div className="flex items-center gap-1.5 font-semibold text-[11px] min-w-0">
                    <FaMoneyBillWave size={11} className="text-black shrink-0" />
                    <span className="text-black">Cash:</span>
                  </div>
                  <span className="font-bold text-black font-mono text-[11px] shrink-0 ml-1">
                    ৳ {formatMoney(tenderBreakdown?.cash || 0)}
                  </span>
                </div>

                {/* Bank Leg (All in 1 line) */}
                <div className="flex items-center justify-between py-1 px-1.5 rounded bg-gray-50 border border-gray-200/80 text-black">
                  <div className="flex items-center gap-1.5 font-semibold text-[11px] min-w-0 flex-1 pr-1">
                    <FaCreditCard size={11} className="text-black shrink-0" />
                    <span
                      className="text-black truncate"
                      title={tenderBreakdown?.bankName ? `Bank (${tenderBreakdown.bankName})` : "Bank"}
                    >
                      Bank{tenderBreakdown?.bankName ? ` (${tenderBreakdown.bankName})` : ""}:
                    </span>
                  </div>
                  <span className="font-bold text-black font-mono text-[11px] shrink-0 ml-1">
                    ৳ {formatMoney(tenderBreakdown?.bank || 0)}
                  </span>
                </div>

                {/* MFS Leg (All in 1 line) */}
                <div className="flex items-center justify-between py-1 px-1.5 rounded bg-gray-50 border border-gray-200/80 text-black">
                  <div className="flex items-center gap-1.5 font-semibold text-[11px] min-w-0 flex-1 pr-1">
                    <FaMobileAlt size={11} className="text-black shrink-0" />
                    <span
                      className="text-black truncate"
                      title={tenderBreakdown?.mfsName ? `MFS (${tenderBreakdown.mfsName})` : "MFS"}
                    >
                      MFS{tenderBreakdown?.mfsName ? ` (${tenderBreakdown.mfsName})` : ""}:
                    </span>
                  </div>
                  <span className="font-bold text-black font-mono text-[11px] shrink-0 ml-1">
                    ৳ {formatMoney(tenderBreakdown?.mfs || 0)}
                  </span>
                </div>
              </div>

              {/* Total Paid Row */}
              <div className="mt-1.5 pt-1 border-t border-gray-200 flex items-center justify-between font-bold text-xs">
                <span className="text-black text-[11px] font-bold">Total Paid:</span>
                <span className="text-black font-mono text-[11px] font-extrabold">
                  ৳ {formatMoney(
                    (tenderBreakdown?.cash || 0) +
                    (tenderBreakdown?.bank || 0) +
                    (tenderBreakdown?.mfs || 0)
                  )}
                </span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default DueInvoiceAllocationTable;

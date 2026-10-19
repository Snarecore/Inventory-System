import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  FaFileInvoiceDollar,
  FaSpinner,
  FaMoneyBillWave,
  FaCreditCard,
  FaMobileAlt,
} from "react-icons/fa";
import { RiArrowDropDownLine } from "react-icons/ri";
import { formatMoney } from "@/utils/formatters";
import type { PurchaseInvoiceDueItem, PaymentAllocation } from "@/types/payment.types";

export interface TenderBreakdown {
  cash: number;
  bank: number;
  mfs: number;
  bankName?: string;
  mfsName?: string;
}

interface DuePurchaseInvoiceAllocationTableProps {
  invoices: PurchaseInvoiceDueItem[];
  isLoading: boolean;
  selectedInvoiceNos: Set<string>;
  onToggleInvoice: (invoiceNo: string) => void;
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
  allocations: PaymentAllocation[];
  isManualMode: boolean;
  onToggleManualMode: () => void;
  tenderBreakdown?: TenderBreakdown;
}

export const DuePurchaseInvoiceAllocationTable: React.FC<DuePurchaseInvoiceAllocationTableProps> = ({
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

    const modalEl = targetEl.closest('.bg-white.rounded-xl') || document.querySelector('.bg-white.rounded-xl');
    const modalRect = modalEl?.getBoundingClientRect();

    const buttonCenter = rect.left + rect.width / 2;
    let left = buttonCenter - dropdownWidth / 2;

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

      if (spaceBelow < estimatedHeight + 8 && spaceAbove >= estimatedHeight) {
        top = rect.top - estimatedHeight - 4;
        isPlacementTop = true;
      } else {
        if (top + estimatedHeight > modalRect.bottom - 8) {
          top = modalRect.bottom - estimatedHeight - 8;
        }
      }
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
    const map = new Map<string, PaymentAllocation>();
    allocations.forEach((a) => map.set(a.invoiceNo, a));
    return map;
  }, [allocations]);

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
          Payment will be debited directly against the supplier ledger balance.
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

      {/* Table */}
      <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto overflow-x-hidden">
        <table className="w-full text-left text-xs border-collapse table-fixed">
          <colgroup>
            {isManualMode && <col className="w-7" />}
            <col className="w-[30%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
          </colgroup>
          <thead className="bg-gray-100 text-black font-semibold sticky top-0 z-10 border-b border-gray-200 whitespace-nowrap">
            <tr>
              {isManualMode && (
                <th className="py-1 px-1.5 text-center w-7 shrink-0 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onToggleSelectAll}
                    className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                    title="Select All"
                  />
                </th>
              )}
              <th className="py-1.5 px-2 whitespace-nowrap">Invoice No</th>
              <th className="py-1.5 px-2 whitespace-nowrap">Date</th>
              <th className="py-1.5 px-2 text-right whitespace-nowrap">Due (৳)</th>
              <th ref={payingThRef} className="py-1.5 px-2 text-right whitespace-nowrap">
                <div className="inline-flex items-center justify-end gap-0.5 select-none">
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
              <th className="py-1.5 px-2 text-right whitespace-nowrap">Discount (৳)</th>
              <th className="py-1.5 px-2 text-right whitespace-nowrap">Remaining (৳)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 whitespace-nowrap">
            {invoices.map((inv) => {
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
                    <td className="py-1 px-1.5 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleInvoice(inv.invoiceNo)}
                        className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="py-1 px-2 text-black font-medium">
                    <span className="truncate block" title={inv.invoiceNo}>
                      {inv.invoiceNo}
                    </span>
                  </td>
                  <td className="py-1 px-2 text-black whitespace-nowrap">
                    {inv.purchaseDate || inv.date
                      ? String(inv.purchaseDate || inv.date).replace("T", " ").split(" ")[0]
                      : "-"}
                  </td>
                  <td className="py-1 px-2 text-right text-black font-semibold whitespace-nowrap">
                    {formatMoney(dueAmount)}
                  </td>
                  <td className="py-1 px-2 text-right font-bold text-black whitespace-nowrap">
                    {paidAmount > 0 ? formatMoney(paidAmount) : "-"}
                  </td>
                  <td className="py-1 px-2 text-right font-bold text-black whitespace-nowrap">
                    {discountAmount > 0 ? formatMoney(discountAmount) : "-"}
                  </td>
                  <td className="py-1 px-2 text-right text-black font-semibold whitespace-nowrap">
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
              style={{ left: `${dropdownCoords.arrowLeft}px` }}
              className={`absolute -translate-x-1/2 w-2 h-2 bg-white border-gray-200 transform rotate-45 pointer-events-none ${
                dropdownCoords.isPlacementTop
                  ? "-bottom-1 border-b border-r"
                  : "-top-1 border-t border-l"
              }`}
            />

            <div className="flex items-center justify-between pb-1 mb-1 border-b border-gray-100 font-semibold text-gray-800">
              <span>Payment Breakdown</span>
              <button
                type="button"
                onClick={() => setIsBreakdownOpen(false)}
                className="text-gray-400 hover:text-black cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              {/* Cash Leg */}
              <div className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-gray-50">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <FaMoneyBillWave className="text-emerald-600" size={11} />
                  Cash:
                </span>
                <span className="font-semibold text-black">
                  ৳ {formatMoney(tenderBreakdown?.cash || 0)}
                </span>
              </div>

              {/* Bank Leg */}
              <div className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-gray-50">
                <span className="flex items-center gap-1.5 text-gray-600 truncate max-w-[140px]" title={tenderBreakdown?.bankName}>
                  <FaCreditCard className="text-sky-600 shrink-0" size={11} />
                  <span className="truncate">Bank:</span>
                </span>
                <span className="font-semibold text-black">
                  ৳ {formatMoney(tenderBreakdown?.bank || 0)}
                </span>
              </div>

              {/* MFS Leg */}
              <div className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-gray-50">
                <span className="flex items-center gap-1.5 text-gray-600 truncate max-w-[140px]" title={tenderBreakdown?.mfsName}>
                  <FaMobileAlt className="text-purple-600 shrink-0" size={11} />
                  <span className="truncate">MFS:</span>
                </span>
                <span className="font-semibold text-black">
                  ৳ {formatMoney(tenderBreakdown?.mfs || 0)}
                </span>
              </div>

              {/* Total Paid Row */}
              <div className="pt-1 mt-1 border-t border-gray-100 flex items-center justify-between font-bold text-black">
                <span>Total Paying:</span>
                <span>
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

export default DuePurchaseInvoiceAllocationTable;

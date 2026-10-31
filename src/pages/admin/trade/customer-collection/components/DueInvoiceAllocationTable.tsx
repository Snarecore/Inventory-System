import React, { useState, useMemo } from "react";
import {
  FaFileInvoiceDollar,
  FaSearch,
  FaTimes,
  FaSpinner,
} from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import TextInput from "@/components/form/TextInput";
import type { InvoiceDueItem, CollectionAllocation } from "@/types/collection.types";
import { useDebounce } from "@/hooks/useDebounce";
import { TenderBreakdownPortal } from "@/components/settlement/TenderBreakdownPortal";
import type { TenderBreakdown } from "@/hooks/useMultiTenderSettlement";

export type { TenderBreakdown };

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
  tenderBreakdown,
}) => {
  const [filterQuery, setFilterQuery] = useState<string>("");
  const debouncedFilterQuery = useDebounce(filterQuery, 200);


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
      <div className="p-4 text-center text-xs text-[var(--ui-text-muted)] border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)] flex items-center justify-center gap-2">
        <FaSpinner className="animate-spin text-[var(--color-primary)]" size={13} />
        <span>Loading pending invoices...</span>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-[var(--ui-text-muted)] border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)]">
        <FaFileInvoiceDollar size={20} className="mx-auto text-[var(--ui-text-subtle)] mb-1" />
        <p className="font-semibold text-[var(--ui-text)]">No individual invoices due</p>
        <p className="text-[11px] text-[var(--ui-text-subtle)]">
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
          <span className="font-semibold text-[var(--ui-text)]">
            Pending Invoices ({invoices.length})
          </span>
        </div>
      </div>

      {/* Bill Search if many invoices */}
      {invoices.length > 3 && (
        <div className="relative">
          <TextInput
            icon={<FaSearch className="text-[var(--ui-text-subtle)] text-xs" />}
            value={filterQuery}
            onChange={(val) => setFilterQuery(val)}
            placeholder="Filter invoice no..."
            wrapperClass="!h-7 bg-[var(--ui-surface)] !border-[var(--ui-border)]"
            inputClass="text-xs text-[var(--ui-text)]"
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery("")}
              className="absolute right-2 top-1.5 text-[var(--ui-text-subtle)] hover:text-[var(--ui-text)] cursor-pointer"
            >
              <FaTimes size={10} />
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="border border-[var(--ui-border)] rounded-lg max-h-52 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[var(--table-header-bg,var(--primary-color))] text-[var(--table-header-text,var(--ui-on-accent,#ffffff))] font-semibold sticky top-0 z-10 border-b border-[var(--ui-border)] whitespace-nowrap">
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
              <th className="py-1 px-2.5 text-right whitespace-nowrap">
                <div className="inline-flex items-center justify-end gap-1 select-none">
                  <span>Paying (৳)</span>
                  <TenderBreakdownPortal
                    tenderBreakdown={tenderBreakdown}
                    title="Payment Breakdown"
                    totalLabel="Total Paid:"
                  />
                </div>
              </th>
              <th className="py-1 px-2.5 text-right whitespace-nowrap">Discount (৳)</th>
              <th className="py-1 px-2.5 text-right whitespace-nowrap">Remaining (৳)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ui-border)] whitespace-nowrap">
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
                  className={`hover:bg-[var(--ui-surface-muted)]/80 transition-colors ${
                    paidAmount > 0 || discountAmount > 0
                      ? "bg-[var(--ui-surface-muted)]/70"
                      : isSelected && isManualMode
                      ? "bg-[var(--ui-surface-muted)]/40"
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
                  <td className="py-1 px-2.5 text-[var(--ui-text)] font-medium whitespace-nowrap">
                    {inv.invoiceNo}
                  </td>
                  <td className="py-1 px-2.5 text-[var(--ui-text)] whitespace-nowrap">
                    {inv.salesDate || inv.date
                      ? String(inv.salesDate || inv.date).replace("T", " ").split(" ")[0]
                      : "-"}
                  </td>
                  <td className="py-1 px-2.5 text-right text-[var(--ui-text)] font-semibold whitespace-nowrap">
                    {formatMoney(dueAmount)}
                  </td>
                  <td className="py-1 px-2.5 text-right font-bold text-[var(--ui-text)] whitespace-nowrap">
                    {paidAmount > 0 ? formatMoney(paidAmount) : "-"}
                  </td>
                  <td className="py-1 px-2.5 text-right font-bold text-[var(--ui-text)] whitespace-nowrap">
                    {discountAmount > 0 ? formatMoney(discountAmount) : "-"}
                  </td>
                  <td className="py-1 px-2.5 text-right text-[var(--ui-text)] font-semibold whitespace-nowrap">
                    {formatMoney(remainingDue)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default DueInvoiceAllocationTable;

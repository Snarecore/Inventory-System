import React, { useState, useMemo } from "react";
import {
  FaFileInvoiceDollar,
  FaSearch,
  FaTimes,
  FaSpinner,
} from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import TextInput from "@/components/form/TextInput";
import { useDebounce } from "@/hooks/useDebounce";
import { TenderBreakdownPortal } from "@/components/settlement/TenderBreakdownPortal";
import type { TenderBreakdown } from "@/hooks/useMultiTenderSettlement";

export interface GenericDueInvoice {
  invoiceNo: string;
  invoiceDate?: string;
  orderNo?: string;
  challanNo?: string;
  grandTotal?: number;
  paidAmount?: number;
  dueAmount?: number;
  [key: string]: any;
}

export interface GenericAllocation {
  invoiceNo: string;
  allocatedAmount: number;
  settledDue: number;
  remainingDue: number;
  status: "FULL" | "PARTIAL" | "UNPAID";
}

export interface TradeDueInvoiceAllocationTableProps {
  invoices: GenericDueInvoice[];
  partyType?: "customer" | "supplier";
  isLoading: boolean;
  selectedInvoiceNos: Set<string>;
  onToggleInvoice: (invoiceNo: string) => void;
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
  allocations: GenericAllocation[];
  isManualMode: boolean;
  onToggleManualMode: () => void;
  tenderBreakdown?: TenderBreakdown;
}

export const TradeDueInvoiceAllocationTable: React.FC<TradeDueInvoiceAllocationTableProps> = ({
  invoices,
  partyType = "customer",
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

  const isCustomer = partyType === "customer";
  const partyTerm = isCustomer ? "customer" : "supplier";

  const allocationMap = useMemo(() => {
    const map = new Map<string, GenericAllocation>();
    allocations.forEach((a) => map.set(a.invoiceNo, a));
    return map;
  }, [allocations]);

  const filteredInvoices = useMemo(() => {
    if (!debouncedFilterQuery.trim()) return invoices;
    const q = debouncedFilterQuery.toLowerCase().trim();
    return invoices.filter((inv) => {
      const invNo = String(inv.invoiceNo || "").toLowerCase();
      const ref = String(inv.orderNo || inv.challanNo || "").toLowerCase();
      return invNo.includes(q) || ref.includes(q);
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
          Settlement will be credited/debited directly against the {partyTerm} ledger balance.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--ui-text)] flex items-center gap-1.5">
            <FaFileInvoiceDollar className="text-[var(--color-primary)]" />
            Unpaid Invoices ({selectedInvoiceNos.size}/{invoices.length} selected)
          </span>
          {isManualMode && (
            <span className="text-[10px] bg-[var(--color-primary-light)] text-[var(--color-primary)] px-1.5 py-0.5 rounded font-semibold">
              Manual Selection
            </span>
          )}
        </div>

        {invoices.length > 5 && (
          <div className="relative w-full sm:w-48">
            <TextInput
              placeholder="Search invoice..."
              value={filterQuery}
              onChange={setFilterQuery}
              inputClass="!py-1 !text-xs !pr-7"
              icon={<FaSearch className="text-[var(--ui-text-subtle)]" size={10} />}
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery("")}
                className="absolute right-2 top-2 text-[var(--ui-text-subtle)] hover:text-[var(--ui-text)]"
              >
                <FaTimes size={10} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto border border-[var(--ui-border)] rounded-lg max-h-64 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-[var(--ui-surface-muted)] z-10 text-[var(--ui-text-muted)] text-[11px] border-b border-[var(--ui-border)]">
            <tr>
              <th className="py-1.5 px-2 w-8 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  className="rounded border-[var(--ui-border-strong)] text-[var(--color-primary)] focus:ring-0 cursor-pointer"
                  title="Select / Unselect All"
                />
              </th>
              <th className="py-1.5 px-2">Invoice #</th>
              <th className="py-1.5 px-2 text-right">Total</th>
              <th className="py-1.5 px-2 text-right">Current Due</th>
              <th className="py-1.5 px-2 text-right">Allocated</th>
              <th className="py-1.5 px-2 text-right">Remaining</th>
              <th className="py-1.5 px-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ui-border)] bg-[var(--ui-surface)]">
            {filteredInvoices.map((inv) => {
              const isSelected = selectedInvoiceNos.has(inv.invoiceNo);
              const alloc = allocationMap.get(inv.invoiceNo);
              const allocatedAmt = alloc?.allocatedAmount || 0;
              const remainingDue = alloc ? alloc.remainingDue : Number(inv.dueAmount || 0);

              return (
                <tr
                  key={inv.invoiceNo}
                  onClick={() => onToggleInvoice(inv.invoiceNo)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? "bg-[var(--color-primary-light)]/20" : "hover:bg-[var(--ui-surface-muted)]"
                  }`}
                >
                  <td className="py-1.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleInvoice(inv.invoiceNo)}
                      className="rounded border-[var(--ui-border-strong)] text-[var(--color-primary)] focus:ring-0 cursor-pointer"
                    />
                  </td>
                  <td className="py-1.5 px-2 font-medium text-[var(--ui-text)] whitespace-nowrap">
                    <span>#{inv.invoiceNo}</span>
                    {inv.invoiceDate && (
                      <span className="text-[10px] text-[var(--ui-text-subtle)] block">
                        {String(inv.invoiceDate).substring(0, 10)}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-[var(--ui-text-muted)]">
                    ৳{formatMoney(Number(inv.grandTotal || 0))}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums font-semibold text-[var(--ui-danger)]">
                    ৳{formatMoney(Number(inv.dueAmount || 0))}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums font-bold text-[var(--color-primary)]">
                    {allocatedAmt > 0 ? `৳${formatMoney(allocatedAmt)}` : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums font-medium text-[var(--ui-text)]">
                    ৳{formatMoney(remainingDue)}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    {alloc && alloc.status === "FULL" ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-[var(--ui-success-light)] text-[var(--ui-success-dark)]">
                        PAID
                      </span>
                    ) : alloc && alloc.status === "PARTIAL" ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-[var(--ui-warning-light)] text-[var(--ui-warning-dark)]">
                        PARTIAL
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[var(--ui-surface-sunken)] text-[var(--ui-text-subtle)]">
                        UNPAID
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tenderBreakdown && tenderBreakdown.totalPaid > 0 && (
        <TenderBreakdownPortal breakdown={tenderBreakdown} />
      )}
    </div>
  );
};

export default TradeDueInvoiceAllocationTable;

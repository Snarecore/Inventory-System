import React, { useState, useMemo } from "react";
import {
  FaFileInvoiceDollar,
  FaSearch,
  FaTimes,
  FaSpinner,
} from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
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
  onToggleManualMode,
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

    </div>
  );
};

export default DueInvoiceAllocationTable;

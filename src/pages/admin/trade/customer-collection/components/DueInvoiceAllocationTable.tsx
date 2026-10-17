import React, { useState, useMemo } from "react";
import {
  FaFileInvoiceDollar,
  FaSearch,
  FaTimes,
  FaSpinner,
} from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import type { InvoiceDueItem, CollectionAllocation } from "@/types/collection.types";

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
}) => {
  const [filterQuery, setFilterQuery] = useState<string>("" );

  const allocationMap = useMemo(() => {
    const map = new Map<string, CollectionAllocation>();
    allocations.forEach((a) => map.set(a.invoiceNo, a));
    return map;
  }, [allocations]);

  const filteredInvoices = useMemo(() => {
    if (!filterQuery.trim()) return invoices;
    const q = filterQuery.toLowerCase().trim();
    return invoices.filter((inv) => {
      const invNo = String(inv.invoiceNo || "").toLowerCase();
      return invNo.includes(q);
    });
  }, [invoices, filterQuery]);

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
        <p className="font-semibold text-gray-700">No individual invoices due</p>
        <p className="text-[11px] text-gray-400">
          Collection will be credited directly against the customer ledger balance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {/* Allocation Header */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700">
            Pending Invoices ({invoices.length})
          </span>
          <span className="text-[11px] text-gray-500">
            {isManualMode
              ? `(Manual: ${selectedInvoiceNos.size} selected)`
              : "(Auto FIFO)"}
          </span>
        </div>

        {invoices.length > 1 && (
          <button
            type="button"
            onClick={onToggleManualMode}
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
          >
            {isManualMode ? "Switch to Auto FIFO" : "Switch to Manual Mode"}
          </button>
        )}
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
      <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gray-100 text-black font-semibold sticky top-0 z-10 border-b border-gray-200">
            <tr>
              {isManualMode && (
                <th className="py-2 px-2 text-center w-8">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onToggleSelectAll}
                    className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                    title="Select All"
                  />
                </th>
              )}
              <th className="py-2 px-2.5">Invoice No</th>
              <th className="py-2 px-2.5">Date</th>
              <th className="py-2 px-2.5 text-right">Due (৳)</th>
              <th className="py-2 px-2.5 text-right">Paying (৳)</th>
              <th className="py-2 px-2.5 text-right">Remaining (৳)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredInvoices.map((inv) => {
              const isSelected = selectedInvoiceNos.has(inv.invoiceNo);
              const alloc = allocationMap.get(inv.invoiceNo);
              const allocatedAmount = alloc ? alloc.paidAmount : 0;
              const dueAmount = Number(inv.dueAmount || 0);
              const remainingDue = alloc ? alloc.dueAmount : dueAmount;

              return (
                <tr
                  key={inv.invoiceNo}
                  className={`hover:bg-sky-50/30 transition-colors ${
                    allocatedAmount > 0
                      ? "bg-emerald-50/30"
                      : isSelected && isManualMode
                      ? "bg-blue-50/20"
                      : ""
                  }`}
                >
                  {isManualMode && (
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleInvoice(inv.invoiceNo)}
                        className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="py-2 px-2.5 font-mono text-black">
                    {inv.invoiceNo}
                  </td>
                  <td className="py-2 px-2.5 text-gray-600">
                    {inv.salesDate || inv.date || "-"}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono text-black">
                    {formatMoney(dueAmount)}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono font-semibold text-emerald-700">
                    {allocatedAmount > 0 ? formatMoney(allocatedAmount) : "-"}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono text-gray-600">
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

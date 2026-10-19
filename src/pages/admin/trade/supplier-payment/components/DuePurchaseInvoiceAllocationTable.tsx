import React, { useMemo } from "react";
import { FaFileInvoiceDollar, FaSpinner } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import type { PurchaseInvoiceDueItem, PaymentAllocation } from "@/types/payment.types";
import { TenderBreakdownPortal } from "@/components/settlement/TenderBreakdownPortal";
import type { TenderBreakdown } from "@/hooks/useMultiTenderSettlement";

export type { TenderBreakdown };

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
              <th className="py-1.5 px-2 text-right whitespace-nowrap">
                <div className="inline-flex items-center justify-end gap-0.5 select-none">
                  <span>Paying (৳)</span>
                  <TenderBreakdownPortal
                    tenderBreakdown={tenderBreakdown}
                    title="Payment Breakdown"
                    totalLabel="Total Paying:"
                  />
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
    </div>
  );
};

export default DuePurchaseInvoiceAllocationTable;

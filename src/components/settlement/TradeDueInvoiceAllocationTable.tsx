import React, { useState } from "react";
import {
  FaFileInvoiceDollar,
  FaSearch,
  FaTimes,
  FaSpinner,
  FaCheck,
  FaCalendarAlt,
} from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";

export interface TradeDueInvoiceItem {
  id?: string | number;
  invoiceNo: string;
  orderNo?: string;
  purchaseNo?: string;
  challanNo?: string;
  salesDate?: string;
  purchaseDate?: string;
  saleDate?: string;
  date?: string;
  grandTotal?: number;
  totalAmount?: number;
  paidAmount?: number;
  dueAmount: number;
  status?: string;
  [key: string]: any;
}

export type GenericDueInvoice = TradeDueInvoiceItem;

export interface TradeAllocationItem {
  invoiceNo: string;
  allocatedAmount: number;
  dueAmount?: number;
  remainingDue?: number;
  originalDue?: number;
  [key: string]: any;
}

export interface TradeDueInvoiceAllocationTableProps {
  invoices: TradeDueInvoiceItem[];
  isLoading: boolean;
  selectedInvoiceNos: Set<string>;
  onToggleInvoice: (invoiceNo: string) => void;
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
  allocations: TradeAllocationItem[];
  partyType?: "customer" | "supplier";
}

export const TradeDueInvoiceAllocationTable: React.FC<TradeDueInvoiceAllocationTableProps> = ({
  invoices,
  isLoading,
  selectedInvoiceNos,
  onToggleInvoice,
  onToggleSelectAll,
  isAllSelected,
  allocations,
  partyType = "customer",
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");

  const isCustomer = partyType === "customer";
  const partyTerm = isCustomer ? "Customer" : "Supplier";
  const actionTerm = isCustomer ? "Collection" : "Payment";
  const dateColHeader = isCustomer ? "Sale Date" : "Purchase Date";
  const billColHeader = isCustomer ? "Invoice No" : "Bill No";
  const allocColHeader = isCustomer ? "Collected" : "Current Pay";

  // Quick lookup map for allocations
  const allocationMap = new Map<string, TradeAllocationItem>();
  for (const a of allocations) {
    allocationMap.set(a.invoiceNo, a);
  }

  // Filter invoices by search query & date filter
  const filteredInvoices = invoices.filter((inv) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const invNo = String(inv.invoiceNo || "").toLowerCase();
      const refNo = String(inv.orderNo || inv.purchaseNo || inv.challanNo || "").toLowerCase();
      if (!invNo.includes(q) && !refNo.includes(q)) return false;
    }

    if (dateFilter) {
      const rawDate = inv.salesDate || inv.purchaseDate || inv.saleDate || inv.date;
      if (!rawDate) return false;
      const isoDate = String(rawDate).slice(0, 10);
      if (isoDate !== dateFilter) return false;
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="p-5 text-center text-xs text-[var(--ui-text-muted)] border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)] flex items-center justify-center gap-2">
        <FaSpinner className="animate-spin text-[var(--primary-color)]" size={14} />
        <span>Loading pending {isCustomer ? "invoices" : "purchase bills"}...</span>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-[var(--ui-text-muted)] border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)]">
        <FaFileInvoiceDollar size={22} className="mx-auto text-[var(--ui-text-muted)] mb-1" />
        <p className="font-semibold text-[var(--ui-text)]">
          No individual {isCustomer ? "invoices" : "purchase bills"} due
        </p>
        <p className="text-[11px] text-[var(--ui-text-muted)] mt-0.5">
          {actionTerm} will be {isCustomer ? "credited" : "debited"} directly against the {partyTerm.toLowerCase()} ledger balance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {/* Table Toolbar: Bill Selection Title, Search, Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--ui-text)] flex items-center gap-1.5">
            <FaFileInvoiceDollar className="text-[var(--primary-color)]" />
            Due {isCustomer ? "Bills" : "Purchase Bills"} ({invoices.length} {invoices.length === 1 ? "Bill" : "Bills"})
          </span>
          {selectedInvoiceNos.size > 0 && (
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-200 dark:border-emerald-800">
              {selectedInvoiceNos.size} selected
            </span>
          )}
        </div>

        {/* Filter Controls (Bill Search + Date Filter) */}
        <div className="flex items-center gap-1.5">
          {/* Date Filter Input */}
          <div className="relative">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="py-1 px-2 pr-6 text-[11px] bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-md focus:border-[var(--primary-color)] focus:ring-1 focus:ring-[var(--primary-color)] outline-none text-[var(--ui-text)] cursor-pointer"
              title={`Filter by ${dateColHeader.toLowerCase()}`}
            />
            {dateFilter ? (
              <button
                type="button"
                onClick={() => setDateFilter("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)] hover:text-red-500 transition-colors cursor-pointer"
                title="Clear date filter"
              >
                <FaTimes size={10} />
              </button>
            ) : (
              <FaCalendarAlt
                size={10}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)] pointer-events-none"
              />
            )}
          </div>

          {/* Search Query Input */}
          <div className="relative w-36 sm:w-44">
            <FaSearch
              size={10}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)] pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bill no..."
              className="w-full pl-7 pr-6 py-1 text-[11px] bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-md focus:border-[var(--primary-color)] focus:ring-1 focus:ring-[var(--primary-color)] outline-none text-[var(--ui-text)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)] hover:text-red-500 transition-colors cursor-pointer"
                title="Clear search"
              >
                <FaTimes size={10} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Allocation Table Container */}
      <div className="border border-[var(--ui-border)] rounded-lg overflow-hidden bg-[var(--ui-surface)]">
        <div className="max-h-56 overflow-y-auto">
          <table className="ui-table w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[var(--ui-surface-muted)] z-10 text-[var(--ui-text-muted)] text-[11px] border-b border-[var(--ui-border)] font-semibold">
              <tr>
                <th className="py-2 px-2.5 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onToggleSelectAll}
                    className="rounded border-[var(--ui-border-strong)] text-[var(--primary-color)] focus:ring-0 cursor-pointer"
                    title="Select / Unselect All Bills"
                  />
                </th>
                <th className="py-2 px-2.5 whitespace-nowrap">{dateColHeader}</th>
                <th className="py-2 px-2.5 whitespace-nowrap">{billColHeader}</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap">Total Bill</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap">Paid</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap">Due</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap text-[var(--primary-color)] font-bold">
                  {allocColHeader}
                </th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap">New Due</th>
                <th className="py-2 px-2.5 text-center whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ui-border)] text-[11px]">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-[var(--ui-text-muted)] italic">
                    No bills match the search/date criteria
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const invNo = inv.invoiceNo;
                  const isChecked = selectedInvoiceNos.has(invNo);
                  const alloc = allocationMap.get(invNo);
                  const currentPay = alloc ? Number(alloc.allocatedAmount || 0) : 0;
                  const itemDue = Number(inv.dueAmount || 0);
                  const newDue = alloc ? Number(alloc.dueAmount ?? alloc.remainingDue ?? Math.max(0, itemDue - currentPay)) : itemDue;
                  const rawDate = inv.salesDate || inv.purchaseDate || inv.saleDate || inv.date || "-";
                  const displayDate = String(rawDate).slice(0, 10);
                  const refNo = inv.orderNo || inv.purchaseNo || inv.challanNo;

                  // Status determination
                  const isFullyPaid = currentPay > 0 && newDue <= 0.01;
                  const isPartiallyPaid = currentPay > 0 && newDue > 0.01;

                  // Progress percentage
                  const allocPct = itemDue > 0 ? Math.min(100, Math.round((currentPay / itemDue) * 100)) : 0;

                  return (
                    <tr
                      key={invNo}
                      onClick={() => onToggleInvoice(invNo)}
                      className={`hover:bg-[var(--ui-surface-muted)]/60 cursor-pointer transition-colors ${
                        isChecked ? "bg-[var(--primary-color)]/5" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-1.5 px-2.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleInvoice(invNo)}
                          className="rounded border-[var(--ui-border-strong)] text-[var(--primary-color)] focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Date */}
                      <td className="py-1.5 px-2.5 text-[var(--ui-text-muted)] whitespace-nowrap">
                        {displayDate}
                      </td>

                      {/* Bill / Invoice Number */}
                      <td className="py-1.5 px-2.5 font-semibold text-[var(--ui-text)] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{invNo}</span>
                          {refNo && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--ui-surface-muted)] text-[var(--ui-text-muted)] font-mono border border-[var(--ui-border)]">
                              {refNo}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-1.5 px-2.5 text-right text-[var(--ui-text-muted)] whitespace-nowrap">
                        ৳{formatMoney(Number(inv.grandTotal || inv.totalAmount || 0))}
                      </td>

                      {/* Paid */}
                      <td className="py-1.5 px-2.5 text-right text-[var(--ui-text-muted)] whitespace-nowrap">
                        ৳{formatMoney(Number(inv.paidAmount || 0))}
                      </td>

                      {/* Due */}
                      <td className="py-1.5 px-2.5 text-right font-semibold text-[var(--ui-text)] whitespace-nowrap">
                        ৳{formatMoney(itemDue)}
                      </td>

                      {/* Current Allocation & mini progress */}
                      <td className="py-1.5 px-2.5 text-right font-bold text-[var(--primary-color)] whitespace-nowrap">
                        <div className="flex flex-col items-end">
                          <span>৳{formatMoney(currentPay)}</span>
                          {currentPay > 0 && (
                            <div className="w-12 h-1 bg-[var(--ui-surface-muted)] rounded-full overflow-hidden mt-0.5">
                              <div
                                className={`h-full ${
                                  isFullyPaid ? "bg-emerald-500" : "bg-[var(--primary-color)]"
                                }`}
                                style={{ width: `${allocPct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* New Due */}
                      <td className="py-1.5 px-2.5 text-right font-medium text-[var(--ui-text)] whitespace-nowrap">
                        ৳{formatMoney(newDue)}
                      </td>

                      {/* Status */}
                      <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                        {isFullyPaid ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                            <FaCheck size={7} />
                            Paid
                          </span>
                        ) : isPartiallyPaid ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800">
                            Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700">
                            Unpaid
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Summary Footer */}
        <div className="bg-[var(--ui-surface-muted)] px-3 py-1.5 border-t border-[var(--ui-border)] flex flex-wrap items-center justify-between text-[11px] gap-2">
          <div className="text-[var(--ui-text-muted)]">
            Showing <strong className="text-[var(--ui-text)]">{filteredInvoices.length}</strong> of{" "}
            {invoices.length} due bills
          </div>
          <div className="flex items-center gap-3">
            <span>
              Total Due:{" "}
              <strong className="text-[var(--ui-text)]">
                ৳{formatMoney(invoices.reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0))}
              </strong>
            </span>
            {selectedInvoiceNos.size > 0 && (
              <span>
                Selected:{" "}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  ৳{formatMoney(
                    invoices
                      .filter((inv) => selectedInvoiceNos.has(inv.invoiceNo))
                      .reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0)
                  )}
                </strong>
              </span>
            )}
            <span>
              Allocated:{" "}
              <strong className="text-[var(--primary-color)]">
                ৳{formatMoney(allocations.reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0))}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeDueInvoiceAllocationTable;

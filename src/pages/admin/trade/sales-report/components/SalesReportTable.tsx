import React, { useState } from "react";
import moment from "moment";
import { FiEye, FiPrinter, FiDownload } from "react-icons/fi";
import { FaPhone, FaCalendarAlt, FaFileExcel, FaSearch, FaShoppingBag } from "react-icons/fa";
import Search from "@/components/table-components/Search";
import EmptyState from "@/components/empty-state/EmptyState";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import Pagination from "@/components/pagination";
import { formatMoney } from "@/utils/formatters";
import { exportSalesToExcel } from "@/utils/excel-export";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type { SaleItem } from "@/types";

interface SalesReportTableProps {
  transactions: SaleItem[];
  isLoading?: boolean;
  onView: (item: SaleItem) => void;
  onPrint: (item: SaleItem) => void;
}

export const SalesReportTable: React.FC<SalesReportTableProps> = ({
  transactions,
  isLoading,
  onView,
  onPrint,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const handleExport = () => {
    if (!transactions || transactions.length === 0) {
      showErrorToast("No transactions to export");
      return;
    }
    try {
      exportSalesToExcel(transactions, {
        fileName: `Sales_Transaction_Report_${moment().format("YYYY-MM-DD")}.xlsx`,
        sheetName: "Sales Transactions",
      });
      showSuccessToast("Sales transaction report exported successfully");
    } catch (e: any) {
      showErrorToast(e?.message || "Export failed");
    }
  };

  // Filtered
  const filtered = transactions.filter((t: any) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const inv = String(t.invoiceNo || t.invoice_no || "").toLowerCase();
      const name = String(t.customerName || t.customer_name || "").toLowerCase();
      const phone = String(t.customerPhone || t.customer_phone || "").toLowerCase();
      if (!inv.includes(q) && !name.includes(q) && !phone.includes(q)) return false;
    }
    if (paymentFilter !== "all") {
      const p = String(t.paymentType || t.payment_type || "CASH").toUpperCase();
      if (p !== paymentFilter) return false;
    }
    if (statusFilter !== "all") {
      const s = String(t.status || "").toUpperCase();
      const gt = Number(t.grandTotal ?? t.grand_total ?? t.totalAmount ?? 0);
      const paid = Number(t.paidAmount ?? t.paid_amount ?? 0);
      const due = Number(t.dueAmount ?? t.due_amount ?? Math.max(0, gt - paid));

      if (statusFilter === "PAID" && (due > 0 || paid === 0)) return false;
      if (statusFilter === "PARTIAL" && (due === 0 || paid === 0)) return false;
      if (statusFilter === "PENDING" && (paid > 0 && due === 0)) return false;
    }
    return true;
  });

  const totalCount = filtered.length;
  const pageCount = Math.ceil(totalCount / pageSize) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Compute column totals for visible filtered transactions
  const totals = filtered.reduce(
    (acc, item: any) => {
      const gt = Number(item.grandTotal ?? item.grand_total ?? item.totalAmount ?? 0);
      const paid = Number(item.paidAmount ?? item.paid_amount ?? 0);
      const due = Number(item.dueAmount ?? item.due_amount ?? Math.max(0, gt - paid));
      const sub = Number(item.totalAmount ?? item.total_amount ?? gt);
      const disc = Number(item.discount ?? 0);
      const vat = Number(item.vat ?? 0);
      const del = Number(item.delivery_charge ?? item.deliveryCharge ?? 0);

      acc.subtotal += sub;
      acc.discount += disc;
      acc.vatDel += vat + del;
      acc.grandTotal += gt;
      acc.paid += paid;
      acc.due += due;
      return acc;
    },
    { subtotal: 0, discount: 0, vatDel: 0, grandTotal: 0, paid: 0, due: 0 }
  );

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
      {/* Top Filter Bar */}
      <div className="p-3 border-b border-gray-200 flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
        <div className="w-full md:w-64">
          <Search
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search invoice, customer, phone..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Payment filter */}
          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs font-semibold px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Payments</option>
            <option value="CASH">Cash</option>
            <option value="BANK">Bank / Card</option>
            <option value="MFS">MFS (bKash/Nagad)</option>
            <option value="CREDIT">Credit / Due</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs font-semibold px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="PAID">Fully Paid</option>
            <option value="PARTIAL">Partially Paid</option>
            <option value="PENDING">Pending / Due</option>
          </select>

          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <FaFileExcel className="text-emerald-600" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto w-full relative z-10">
        {isLoading ? (
          <TableSkeleton columnCount={11} rowCount={8} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title="No Transactions Found"
            description="There are no sales transactions matching the selected filters."
          />
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#41BEF3] text-black text-xs font-semibold">
                <th className="py-2.5 px-3 text-center w-10">SL</th>
                <th className="py-2.5 px-3">Invoice / Date</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3 text-center">Items</th>
                <th className="py-2.5 px-3 text-right">Subtotal</th>
                <th className="py-2.5 px-3 text-right">Discount</th>
                <th className="py-2.5 px-3 text-right">VAT/Del</th>
                <th className="py-2.5 px-3 text-right">Grand Total</th>
                <th className="py-2.5 px-3 text-right">Paid (৳)</th>
                <th className="py-2.5 px-3 text-right">Due (৳)</th>
                <th className="py-2.5 px-3 text-center">Payment</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {paginated.map((item: any, idx: number) => {
                const grandTotal = Number(
                  item.grandTotal ?? item.grand_total ?? item.totalAmount ?? 0
                );
                const paid = Number(item.paidAmount ?? item.paid_amount ?? 0);
                const due = Number(
                  item.dueAmount ?? item.due_amount ?? Math.max(0, grandTotal - paid)
                );
                const sub = Number(
                  item.totalAmount ?? item.total_amount ?? grandTotal
                );
                const disc = Number(item.discount ?? 0);
                const vat = Number(item.vat ?? 0);
                const del = Number(
                  item.delivery_charge ?? item.deliveryCharge ?? 0
                );
                const pType = (
                  item.paymentType ||
                  item.payment_type ||
                  "CASH"
                ).toUpperCase();

                const details =
                  item.salesDetails ||
                  item.saleDetails ||
                  item.details ||
                  item.items ||
                  item.productsList ||
                  [];
                const itemsCount = Array.isArray(details) ? details.length : 0;

                const isFullyPaid = due <= 0 && grandTotal > 0;
                const isPartial = due > 0 && paid > 0;

                return (
                  <tr
                    key={item.id || item.invoiceNo || idx}
                    className="hover:bg-sky-50/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center text-gray-700 font-semibold text-xs">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-black">
                        {item.invoiceNo || item.invoice_no || `INV-${item.id}`}
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <FaCalendarAlt size={9} />
                        {item.salesDate || item.saleDate || item.date
                          ? moment(
                              item.salesDate || item.saleDate || item.date
                            ).format("DD MMM YYYY")
                          : "-"}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-black">
                        {item.customerName ||
                          item.customer_name ||
                          "Walk-in Customer"}
                      </div>
                      {(item.customerPhone || item.customer_phone) && (
                        <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <FaPhone size={8} />
                          {item.customerPhone || item.customer_phone}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-semibold">
                        <FaShoppingBag size={8} className="text-gray-500" />
                        {itemsCount > 0 ? `${itemsCount} items` : "1 item"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-700 font-medium">
                      ৳ {formatMoney(sub)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-600 font-medium">
                      {disc > 0 ? `-৳ ${formatMoney(disc)}` : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-600 font-medium">
                      {vat + del > 0 ? `+৳ ${formatMoney(vat + del)}` : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-black whitespace-nowrap">
                      ৳ {formatMoney(grandTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                      ৳ {formatMoney(paid)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                      {due > 0 ? (
                        <span className="text-rose-600 font-bold">
                          ৳ {formatMoney(due)}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-medium">৳ 0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                          pType === "CASH"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : pType === "MFS" || pType === "BKASH" || pType === "NAGAD"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : pType === "BANK" || pType === "CARD"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {pType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          isFullyPaid
                            ? "bg-emerald-100 text-emerald-800"
                            : isPartial
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {isFullyPaid ? "Paid" : isPartial ? "Partial" : "Due"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onView(item)}
                          className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-md transition-colors cursor-pointer"
                          title="View Invoice"
                        >
                          <FiEye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onPrint(item)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                          title="Print Receipt"
                        >
                          <FiPrinter size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Summary Totals Row */}
            <tfoot className="bg-gray-50/90 font-bold text-black border-t-2 border-gray-200">
              <tr>
                <td colSpan={4} className="py-2.5 px-3 text-right text-[11px]">
                  Filtered Totals ({filtered.length} Invoices):
                </td>
                <td className="py-2.5 px-3 text-right text-gray-700">
                  ৳ {formatMoney(totals.subtotal)}
                </td>
                <td className="py-2.5 px-3 text-right text-rose-600">
                  {totals.discount > 0 ? `-৳ ${formatMoney(totals.discount)}` : "-"}
                </td>
                <td className="py-2.5 px-3 text-right text-gray-600">
                  {totals.vatDel > 0 ? `+৳ ${formatMoney(totals.vatDel)}` : "-"}
                </td>
                <td className="py-2.5 px-3 text-right text-black font-black">
                  ৳ {formatMoney(totals.grandTotal)}
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-700 font-black">
                  ৳ {formatMoney(totals.paid)}
                </td>
                <td className="py-2.5 px-3 text-right text-rose-700 font-black">
                  ৳ {formatMoney(totals.due)}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {!isLoading && paginated.length > 0 && (
        <div className="p-2.5 sm:p-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white text-gray-700 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>entries per page (Total {totalCount} records)</span>
          </div>

          <Pagination
            pageCount={pageCount}
            currentPageNumber={currentPage}
            handlePagination={(data) => setCurrentPage(data.selected + 1)}
          />
        </div>
      )}
    </div>
  );
};

export default SalesReportTable;

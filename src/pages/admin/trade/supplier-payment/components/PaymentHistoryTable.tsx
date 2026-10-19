import React, { useState, useMemo } from "react";
import { FiChevronDown, FiPrinter, FiChevronRight } from "react-icons/fi";
import { FaFileExcel } from "react-icons/fa";
import moment from "moment";
import * as XLSX from "xlsx";
import Search from "@/components/table-components/Search";
import DateRangePicker from "@/components/date-range-picker/DateRangePicker";
import Pagination from "@/components/pagination";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import EmptyState from "@/components/empty-state/EmptyState";
import ColumnVisibilityDropdown, { type ColumnItem } from "@/components/table-components/ColumnVisibilityDropdown";
import { usePaymentReportQuery } from "@/hooks/usePaymentReport";
import { useDebounce } from "@/hooks/useDebounce";
import { formatMoney } from "@/utils/formatters";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type { PaymentReceiptData, PaymentReportItem } from "@/types/payment.types";

const cleanDateOnly = (dateStr?: string | null): string => {
  if (!dateStr) return "-";
  return String(dateStr).replace("T", " ").split(" ")[0].trim() || "-";
};

interface PaymentHistoryTableProps {
  onPrintReceipt: (receipt: PaymentReceiptData) => void;
}

export const PaymentHistoryTable: React.FC<PaymentHistoryTableProps> = ({
  onPrintReceipt,
}) => {
  // Date range filters (default to current month)
  const [startDate, setStartDate] = useState<string>(
    moment().startOf("month").format("YYYY-MM-DD")
  );
  const [endDate, setEndDate] = useState<string>(
    moment().format("YYYY-MM-DD")
  );
  const [dateFilterPreset, setDateFilterPreset] = useState<string>("this_month");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>("all");

  // Accordion state
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string | number>>(
    () => new Set()
  );

  // Pagination states matching Cash-Boi standards
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [dataLimit, setDataLimit] = useState<number>(10);

  // Column Visibility Configuration
  const availableColumns: ColumnItem[] = [
    { key: "expand", label: "Expand" },
    { key: "sl", label: "SL" },
    { key: "date", label: "Date" },
    { key: "voucherNo", label: "Voucher No" },
    { key: "supplier", label: "Supplier" },
    { key: "phone", label: "Phone" },
    { key: "method", label: "Method" },
    { key: "paid", label: "Paid (৳)" },
    { key: "bills", label: "Bills" },
    { key: "remark", label: "Remark" },
    { key: "receipt", label: "Receipt" },
  ];

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("payment_history_columns");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const isColVisible = (key: string) => visibleColumns[key] !== false;

  const handleToggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const currentlyVisible = prev[key] !== false;
      const willBeVisible = !currentlyVisible;
      const countAfter = availableColumns.filter((c) =>
        c.key === key ? willBeVisible : prev[c.key] !== false
      ).length;
      if (countAfter === 0) return prev;

      const next = { ...prev, [key]: willBeVisible };
      try {
        localStorage.setItem("payment_history_columns", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleResetColumns = () => {
    const resetState: Record<string, boolean> = {};
    availableColumns.forEach((c) => {
      resetState[c.key] = true;
    });
    setVisibleColumns(resetState);
    try {
      localStorage.removeItem("payment_history_columns");
    } catch {}
  };

  const activeVisibleColumnCount = availableColumns.filter((c) => isColVisible(c.key)).length;

  // Query payments
  const { data: rawReportList = [], isLoading } = usePaymentReportQuery({
    startDate,
    endDate,
  });

  // Client-side filtering by Search & Payment Mode
  const processedList = useMemo(() => {
    let list = [...rawReportList];

    if (paymentModeFilter !== "all") {
      list = list.filter((r) =>
        String(r.paymentMode || "").toLowerCase().includes(paymentModeFilter.toLowerCase())
      );
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter((r) => {
        const sup = (r.supplierName || r.customerName || "").toLowerCase();
        const phone = (r.supplierPhone || r.customerPhone || "").toLowerCase();
        const vNo = (r.paymentNo || r.voucherNo || "").toLowerCase();
        const rem = (r.remark || "").toLowerCase();
        return (
          sup.includes(q) ||
          phone.includes(q) ||
          vNo.includes(q) ||
          rem.includes(q)
        );
      });
    }

    // Sort descending by date / addedDate
    list.sort((a, b) => {
      const dateA = a.paymentDate || a.collectionDate || a.addedDate || "";
      const dateB = b.paymentDate || b.collectionDate || b.addedDate || "";
      return dateB.localeCompare(dateA);
    });

    return list;
  }, [rawReportList, paymentModeFilter, debouncedSearch]);

  const totalCount = processedList.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / dataLimit));
  const startIndex = (currentPageNumber - 1) * dataLimit;
  const paginatedList = processedList.slice(startIndex, startIndex + dataLimit);

  const handlePagination = (paginationData: { selected: number }) => {
    setCurrentPageNumber(paginationData.selected + 1);
  };

  const toggleRow = (id: string | number) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Export to Excel
  const handleExport = () => {
    if (processedList.length === 0) {
      showErrorToast("No payment history to export");
      return;
    }

    try {
      const rows = processedList.map((item, idx) => ({
        SL: idx + 1,
        Date: cleanDateOnly(item.paymentDate || item.collectionDate),
        "Voucher No": item.paymentNo || item.voucherNo || "-",
        "Supplier Name": item.supplierName || item.customerName || "Supplier",
        Phone: item.supplierPhone || item.customerPhone || "-",
        "Payment Mode": item.paymentMode || "Cash",
        "Paid Amount (৳)": Number(item.totalAmount || 0),
        "Discount (৳)": Number(item.totalDiscount || 0),
        Bills: (item.details || item.paymentDetails || []).map((d) => d.invoiceNo).join(", ") || "-",
        Remark: item.remark || "-",
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Payment History");
      const today = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `Payment_History_${today}.xlsx`);
      showSuccessToast(`Successfully exported ${rows.length} records to Excel!`);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to export Excel file");
    }
  };

  const handlePrintHistoricalReceipt = (item: PaymentReportItem) => {
    const details = item.details || item.paymentDetails || [];
    const receiptData: PaymentReceiptData = {
      receiptNo: item.paymentNo || item.voucherNo || `PAY-${item.id}`,
      paymentDate: cleanDateOnly(item.paymentDate || item.collectionDate),
      supplierName: item.supplierName || item.customerName || "Supplier",
      supplierPhone: item.supplierPhone || item.customerPhone || "",
      supplierId: item.supplierId || item.customerId || "",
      totalAmount: Number(item.totalAmount || 0),
      totalDiscount: Number(item.totalDiscount || 0),
      paymentMode: item.paymentMode || "Cash",
      remark: item.remark || "",
      allocations: details.map((d) => ({
        invoiceNo: d.invoiceNo,
        paidAmount: Number(d.paidAmount || 0),
        discountAmount: 0,
        dueAmount: Number(d.dueAmount || 0),
      })),
    };

    onPrintReceipt(receiptData);
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 flex flex-col relative z-20 overflow-visible">
      {/* Search and Filters Bar - Matching Cash-Boi layout */}
      <div className="p-2 sm:p-2.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 relative z-40 overflow-visible">
        {/* Left Section: Date Range Picker, Search Box, Payment Method */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="w-full sm:w-auto">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              filterPreset={dateFilterPreset}
              onFilterPresetChange={setDateFilterPreset}
              size="sm"
            />
          </div>

          <div className="w-full sm:w-52 shrink-0">
            <Search
              searchQuery={searchQuery}
              onSearchChange={(val) => {
                setSearchQuery(val);
                setCurrentPageNumber(1);
              }}
              setSearchQuery={(val) => {
                setSearchQuery(val);
                setCurrentPageNumber(1);
              }}
              placeholder="Search voucher, supplier..."
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={paymentModeFilter}
              onChange={(e) => {
                setPaymentModeFilter(e.target.value);
                setCurrentPageNumber(1);
              }}
              className="h-8 pl-2.5 pr-7 text-xs bg-white border border-gray-200 rounded-lg text-black focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] appearance-none cursor-pointer font-medium"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank / Card</option>
              <option value="mfs">MFS</option>
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-xs"
              size={13}
            />
          </div>
        </div>

        {/* Right Section: Column Visibility & Export */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          <ColumnVisibilityDropdown
            columns={availableColumns}
            visibleColumns={visibleColumns}
            onToggle={handleToggleColumn}
            onReset={handleResetColumns}
          />

          <button
            type="button"
            onClick={handleExport}
            title="Download Excel Report"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 h-8 text-[11px] sm:text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <FaFileExcel className="text-emerald-600 shrink-0" size={12} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="overflow-x-auto w-full relative z-10">
        {isLoading ? (
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={8} />
        ) : processedList.length === 0 ? (
          <EmptyState
            title="No Payment History Found"
            description="There are no supplier payment vouchers matching your selected search or date range."
          />
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#41BEF3] text-black text-xs font-semibold">
                {isColVisible("expand") && <th className="py-2.5 px-3 text-center w-8"></th>}
                {isColVisible("sl") && <th className="py-2.5 px-3 text-center w-10">SL</th>}
                {isColVisible("date") && <th className="py-2.5 px-3">Date</th>}
                {isColVisible("voucherNo") && <th className="py-2.5 px-3">Voucher No</th>}
                {isColVisible("supplier") && <th className="py-2.5 px-3">Supplier</th>}
                {isColVisible("phone") && <th className="py-2.5 px-3">Phone</th>}
                {isColVisible("method") && <th className="py-2.5 px-3 text-center">Method</th>}
                {isColVisible("paid") && <th className="py-2.5 px-3 text-right">Paid (৳)</th>}
                {isColVisible("bills") && <th className="py-2.5 px-3 text-center">Bills</th>}
                {isColVisible("remark") && <th className="py-2.5 px-3">Remark</th>}
                {isColVisible("receipt") && <th className="py-2.5 px-3 text-center w-16">Receipt</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedList.map((row, idx) => {
                const serialNumber = (currentPageNumber - 1) * dataLimit + idx + 1;
                const rowId = row.id ?? row.paymentNo ?? idx;
                const isExpanded = expandedRowIds.has(rowId);
                const isBank = String(row.paymentMode).toUpperCase() === "BANK";
                const isMfs = String(row.paymentMode).toUpperCase() === "MFS";
                const details = row.details || row.paymentDetails || [];
                const detailsCount = details.length;

                return (
                  <React.Fragment key={`row-${rowId}`}>
                    <tr className="hover:bg-sky-50/40 transition-colors group">
                      {/* Accordion Expand Toggle */}
                      {isColVisible("expand") && (
                        <td className="py-2.5 px-2 text-center">
                          {detailsCount > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleRow(rowId)}
                              className="p-1 text-gray-500 hover:text-black transition-colors cursor-pointer"
                              title={isExpanded ? "Collapse" : "View bills"}
                            >
                              <FiChevronRight
                                size={13}
                                className={`transition-transform duration-200 ${
                                  isExpanded ? "rotate-90" : ""
                                }`}
                              />
                            </button>
                          )}
                        </td>
                      )}

                      {/* SL */}
                      {isColVisible("sl") && (
                        <td className="py-2.5 px-3 text-center text-black text-xs font-normal">
                          {serialNumber}
                        </td>
                      )}

                      {/* Date */}
                      {isColVisible("date") && (
                        <td className="py-2.5 px-3 text-black text-xs font-normal whitespace-nowrap">
                          {cleanDateOnly(row.paymentDate || row.collectionDate)}
                        </td>
                      )}

                      {/* Voucher No */}
                      {isColVisible("voucherNo") && (
                        <td className="py-2.5 px-3 text-black text-xs font-semibold whitespace-nowrap">
                          {row.paymentNo || row.voucherNo || `PAY-${idx + 1}`}
                        </td>
                      )}

                      {/* Supplier */}
                      {isColVisible("supplier") && (
                        <td className="py-2.5 px-3 text-black text-xs font-semibold whitespace-nowrap">
                          {row.supplierName || row.customerName || "Supplier"}
                        </td>
                      )}

                      {/* Phone */}
                      {isColVisible("phone") && (
                        <td className="py-2.5 px-3 text-black text-xs font-normal whitespace-nowrap">
                          {row.supplierPhone || row.customerPhone || "-"}
                        </td>
                      )}

                      {/* Method */}
                      {isColVisible("method") && (
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold border rounded-md whitespace-nowrap ${
                              isBank
                                ? "bg-sky-100 text-sky-900 border-sky-300"
                                : isMfs
                                ? "bg-purple-100 text-purple-800 border-purple-300"
                                : "bg-emerald-100 text-emerald-800 border-emerald-300"
                            }`}
                          >
                            {row.paymentMode || "Cash"}
                          </span>
                        </td>
                      )}

                      {/* Paid Amount */}
                      {isColVisible("paid") && (
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <span className="text-emerald-700 font-semibold text-xs block whitespace-nowrap">
                            ৳ {formatMoney(row.totalAmount)}
                          </span>
                          {Number(row.totalDiscount || 0) > 0 && (
                            <span className="text-[10px] text-amber-700 font-medium block whitespace-nowrap">
                              - ৳ {formatMoney(row.totalDiscount || 0)} Disc
                            </span>
                          )}
                        </td>
                      )}

                      {/* Bills Count */}
                      {isColVisible("bills") && (
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-black rounded text-[11px] font-normal whitespace-nowrap">
                            {detailsCount}
                          </span>
                        </td>
                      )}

                      {/* Remark */}
                      {isColVisible("remark") && (
                        <td className="py-2.5 px-3 text-gray-600 text-xs truncate max-w-[180px] whitespace-nowrap">
                          {row.remark || <span className="text-gray-400">-</span>}
                        </td>
                      )}

                      {/* Action / Receipt */}
                      {isColVisible("receipt") && (
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handlePrintHistoricalReceipt(row)}
                            className="inline-flex items-center justify-center p-1.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                            title="Print Payment Voucher"
                          >
                            <FiPrinter size={13} />
                          </button>
                        </td>
                      )}
                    </tr>

                    {/* Accordion Detail Sub-Row */}
                    {isExpanded && detailsCount > 0 && (
                      <tr className="bg-sky-50/20">
                        <td colSpan={activeVisibleColumnCount} className="py-2 px-4 sm:px-8">
                          <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-xs">
                            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-gray-100">
                              <span className="text-xs font-semibold text-black">
                                Settled Purchase Invoices Allocation Breakdown:
                              </span>
                              <span className="text-[11px] text-gray-500">
                                Total {detailsCount} {detailsCount === 1 ? "invoice" : "invoices"}
                              </span>
                            </div>

                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-gray-50 text-gray-700 text-[11px] font-semibold border-b border-gray-200">
                                  <th className="py-1.5 px-2">Invoice No</th>
                                  <th className="py-1.5 px-2 text-right">Settled Amount (৳)</th>
                                  <th className="py-1.5 px-2 text-right">Remaining Due (৳)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {details.map((bill: any, bIdx: number) => (
                                  <tr key={`bill-${bIdx}`} className="hover:bg-gray-50/50">
                                    <td className="py-1.5 px-2 text-black font-semibold">
                                      {bill.invoiceNo || "-"}
                                    </td>
                                    <td className="py-1.5 px-2 text-right text-emerald-700 font-semibold">
                                      ৳ {formatMoney(bill.paidAmount)}
                                    </td>
                                    <td className="py-1.5 px-2 text-right text-gray-600">
                                      ৳ {formatMoney(bill.dueAmount)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {!isLoading && processedList.length > 0 && (
        <div className="p-2.5 sm:p-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Show</span>
            <select
              value={dataLimit}
              onChange={(e) => {
                setDataLimit(Number(e.target.value));
                setCurrentPageNumber(1);
              }}
              className="border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white text-gray-700 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries per page (Total {totalCount} records)</span>
          </div>

          <Pagination
            pageCount={pageCount}
            currentPageNumber={currentPageNumber}
            handlePagination={handlePagination}
          />
        </div>
      )}
    </div>
  );
};

export default PaymentHistoryTable;

import React, { useState, useRef, useEffect } from "react";
import { FiEye, FiPrinter, FiChevronDown } from "react-icons/fi";
import { BsFilterRight } from "react-icons/bs";
import moment from "moment";
import Search from "@/components/table-components/Search";
import DateRangePicker from "@/components/date-range-picker/DateRangePicker";
import EmptyState from "@/components/empty-state/EmptyState";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import Pagination from "@/components/pagination";
import type { SalesReturnItem } from "@/types";
import { FaFileExcel, FaUndoAlt } from "react-icons/fa";
import { exportSalesReturnToExcel } from "@/utils/excel-export";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import { formatMoney } from "@/utils/formatters";
import { RETURN_REASONS, getReturnReasonLabel } from "../constants/returnReasons";

interface SalesReturnTableProps {
  returns: SalesReturnItem[];
  exportableReturns?: SalesReturnItem[];
  totalCount: number;
  isLoading?: boolean;
  pageCount: number;
  currentPageNumber: number;
  setCurrentPageNumber: React.Dispatch<React.SetStateAction<number>>;
  dataLimit: number;
  setDataLimit: React.Dispatch<React.SetStateAction<number>>;
  handlePagination: (paginationData: { selected: number }) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  paymentMethodFilter: string;
  setPaymentMethodFilter: (method: string) => void;
  reasonFilter: string;
  setReasonFilter: (reason: string) => void;
  dateFilter?: string;
  setDateFilter?: (filter: string) => void;
  customStartDate?: string;
  setCustomStartDate?: (date: string) => void;
  customEndDate?: string;
  setCustomEndDate?: (date: string) => void;
  sortBy?: string;
  setSortBy?: (sort: string) => void;
  onView: (item: SalesReturnItem) => void;
  onPrint: (item: SalesReturnItem) => void;
}

export const SalesReturnTable: React.FC<SalesReturnTableProps> = ({
  returns,
  exportableReturns,
  totalCount,
  isLoading,
  pageCount,
  currentPageNumber,
  setCurrentPageNumber,
  dataLimit,
  setDataLimit,
  handlePagination,
  searchQuery,
  setSearchQuery,
  paymentMethodFilter,
  setPaymentMethodFilter,
  reasonFilter,
  setReasonFilter,
  dateFilter = "all",
  setDateFilter,
  customStartDate = "",
  setCustomStartDate,
  customEndDate = "",
  setCustomEndDate,
  sortBy = "latest",
  setSortBy,
  onView,
  onPrint,
}) => {
  const [isSortOpen, setIsSortOpen] = useState<boolean>(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const handleExport = () => {
    const dataToExport = exportableReturns && exportableReturns.length > 0 ? exportableReturns : returns;
    if (!dataToExport || dataToExport.length === 0) {
      showErrorToast("No sales return records available to export");
      return;
    }
    try {
      exportSalesReturnToExcel(dataToExport);
      showSuccessToast(`Successfully exported ${dataToExport.length} sales return records to Excel!`);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to export Excel file");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 flex flex-col gap-3 p-2.5 sm:p-3">
      {/* Top Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2">
        <div className="flex-1 min-w-[220px] max-w-md">
          <Search
            value={searchQuery}
            onChange={(e: any) => {
              setSearchQuery(e.target.value);
              setCurrentPageNumber(1);
            }}
            placeholder="Search by Order No, Return No, Invoice, Customer..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Payment / Refund Method Filter */}
          <select
            value={paymentMethodFilter}
            onChange={(e) => {
              setPaymentMethodFilter(e.target.value);
              setCurrentPageNumber(1);
            }}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:border-[#009fe3]"
          >
            <option value="all">All Payment Methods</option>
            <option value="CASH">Cash</option>
            <option value="CREDIT">Credit / Due Adjust</option>
            <option value="MFS">MFS (bKash/Nagad)</option>
            <option value="BANK">Bank</option>
          </select>

          {/* Return Reason Filter */}
          <select
            value={reasonFilter}
            onChange={(e) => {
              setReasonFilter(e.target.value);
              setCurrentPageNumber(1);
            }}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:border-[#009fe3]"
          >
            <option value="all">All Return Causes</option>
            {RETURN_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          {/* Date Range Picker */}
          {setDateFilter && setCustomStartDate && setCustomEndDate && (
            <DateRangePicker
              dateFilter={dateFilter}
              setDateFilter={(val) => {
                setDateFilter(val);
                setCurrentPageNumber(1);
              }}
              customStartDate={customStartDate}
              setCustomStartDate={setCustomStartDate}
              customEndDate={customEndDate}
              setCustomEndDate={setCustomEndDate}
            />
          )}

          {/* Sort Dropdown */}
          {setSortBy && (
            <div className="relative" ref={sortRef}>
              <button
                type="button"
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 bg-white"
              >
                <BsFilterRight className="text-gray-500 text-sm" />
                <span className="capitalize">
                  {sortBy === "latest"
                    ? "Latest"
                    : sortBy === "oldest"
                    ? "Oldest"
                    : sortBy === "amount_high"
                    ? "Amount (High-Low)"
                    : "Amount (Low-High)"}
                </span>
                <FiChevronDown className="text-gray-400 text-xs" />
              </button>

              {isSortOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-30 text-xs">
                  {[
                    { key: "latest", label: "Latest Returns" },
                    { key: "oldest", label: "Oldest Returns" },
                    { key: "amount_high", label: "Amount: High to Low" },
                    { key: "amount_low", label: "Amount: Low to High" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setSortBy(opt.key);
                        setIsSortOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-gray-50 transition-colors ${
                        sortBy === opt.key ? "font-bold text-[#009fe3]" : "text-gray-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Excel Export */}
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
            title="Export to Excel"
          >
            <FaFileExcel className="text-emerald-600 text-sm" />
            <span className="hidden sm:inline">Excel</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        {isLoading ? (
          <TableSkeleton rows={dataLimit} cols={8} />
        ) : returns.length === 0 ? (
          <EmptyState
            title="No sales return records found"
            description="No return entries match your filter or search criteria."
          />
        ) : (
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase text-[11px] tracking-wider">
                <th className="py-2.5 px-3 text-center w-12">SL</th>
                <th className="py-2.5 px-3">Return No</th>
                <th className="py-2.5 px-3">Orig. Invoice</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Return Date</th>
                <th className="py-2.5 px-3">Primary Cause</th>
                <th className="py-2.5 px-3">Payment Type</th>
                <th className="py-2.5 px-3 text-right">Refund Amount</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {returns.map((item, index) => {
                const sl = (currentPageNumber - 1) * dataLimit + index + 1;
                const refund = Number(item.refundAmount ?? item.grandTotal ?? item.totalAmount ?? 0);
                const firstReason = item.returnDetails?.[0]?.returnReason;
                const pType = String(item.paymentType || "CASH").toUpperCase();

                return (
                  <tr key={item.id || index} className="hover:bg-blue-50/20 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono text-gray-500">
                      {sl}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-bold text-[#009fe3] font-mono">
                        {item.returnNo || `RET-${item.id}`}
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="font-mono font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                        {item.salesInvoiceNo || item.invoiceNo || "-"}
                      </span>
                      {item.orderNo && (
                        <div className="text-[10px] text-[#009fe3] font-mono mt-0.5">
                          Order: {item.orderNo}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-gray-800">
                        {item.customerName || "Walk-in Customer"}
                      </div>
                      {item.customerPhone && (
                        <div className="text-[10px] text-gray-500 font-mono">
                          {item.customerPhone}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-gray-600 font-mono">
                      {moment(item.returnDate || item.createdAt).format("DD-MM-YYYY")}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="text-gray-700">
                        {getReturnReasonLabel(firstReason)}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pType === "CASH"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : pType === "CREDIT"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {pType}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="font-bold text-gray-900 font-mono text-sm">
                        ৳ {formatMoney(refund)}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.status || "Completed"}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onView(item)}
                          className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-md transition-colors cursor-pointer"
                          title="View Return Slip"
                        >
                          <FiEye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onPrint(item)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                          title="Print Return Slip"
                        >
                          <FiPrinter size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Show</span>
          <select
            value={dataLimit}
            onChange={(e) => {
              setDataLimit(Number(e.target.value));
              setCurrentPageNumber(1);
            }}
            className="border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>entries per page (Total {totalCount} returns)</span>
        </div>

        {pageCount > 1 && (
          <Pagination
            pageCount={pageCount}
            currentPageNumber={currentPageNumber}
            handlePagination={handlePagination}
          />
        )}
      </div>
    </div>
  );
};

export default SalesReturnTable;

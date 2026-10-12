import React, { useState, useRef, useEffect, useMemo } from "react";
import { FiEye, FiPrinter, FiChevronDown, FiCopy, FiCheck, FiX, FiRotateCcw } from "react-icons/fi";
import { BsFilterRight } from "react-icons/bs";
import {
  FaFileExcel,
  FaFileInvoice,
  FaUndoAlt,
  FaPhone,
  FaCalendarAlt,
  FaSearch,
  FaUser,
  FaBoxOpen,
} from "react-icons/fa";
import moment from "moment";
import Search from "@/components/table-components/Search";
import DateRangePicker from "@/components/date-range-picker/DateRangePicker";
import EmptyState from "@/components/empty-state/EmptyState";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import Pagination from "@/components/pagination";
import type { SalesReturnItem, PartyItem } from "@/types";
import { exportSalesReturnToExcel } from "@/utils/excel-export";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import { formatMoney } from "@/utils/formatters";

interface SalesReturnTableProps {
  returns: SalesReturnItem[];
  exportableReturns?: SalesReturnItem[];
  totalCount: number;
  rawCount?: number;
  isLoading?: boolean;
  pageCount: number;
  currentPageNumber: number;
  setCurrentPageNumber: React.Dispatch<React.SetStateAction<number>>;
  dataLimit: number;
  setDataLimit: React.Dispatch<React.SetStateAction<number>>;
  handlePagination: (paginationData: { selected: number }) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  customerFilter?: string;
  setCustomerFilter?: (customerId: string) => void;
  customersList?: PartyItem[];
  paymentMethodFilter: string;
  setPaymentMethodFilter: (method: string) => void;
  dateFilter?: string;
  setDateFilter?: (filter: string) => void;
  customStartDate?: string;
  setCustomStartDate?: (date: string) => void;
  customEndDate?: string;
  setCustomEndDate?: (date: string) => void;
  sortBy?: string;
  setSortBy?: (sort: string) => void;
  onResetFilters?: () => void;
  onView: (item: SalesReturnItem) => void;
  onPrint: (item: SalesReturnItem) => void;
}

export const SalesReturnTable: React.FC<SalesReturnTableProps> = ({
  returns,
  exportableReturns,
  totalCount,
  rawCount = 0,
  isLoading,
  pageCount,
  currentPageNumber,
  setCurrentPageNumber,
  dataLimit,
  setDataLimit,
  handlePagination,
  searchQuery,
  setSearchQuery,
  customerFilter = "all",
  setCustomerFilter,
  customersList = [],
  paymentMethodFilter,
  setPaymentMethodFilter,
  dateFilter = "all",
  setDateFilter,
  customStartDate = "",
  setCustomStartDate,
  customEndDate = "",
  setCustomEndDate,
  sortBy = "latest",
  setSortBy,
  onResetFilters,
  onView,
  onPrint,
}) => {
  const [isSortOpen, setIsSortOpen] = useState<boolean>(false);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());

  const sortRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);

  // Toggle expanded row
  const toggleExpandRow = (id: string | number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Copy return no to clipboard
  const handleCopyReturnNo = (text: string, id: string | number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showSuccessToast(`Copied Return No: ${text}`);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Excel Export
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

  // Click outside handling for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
      if (customerRef.current && !customerRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered customers for searchable dropdown
  const filteredCustomerOptions = useMemo(() => {
    if (!customerSearchQuery.trim()) return customersList;
    const q = customerSearchQuery.toLowerCase().trim();
    return customersList.filter((c) => {
      const name = (c.name || c.partyName || "").toLowerCase();
      const phone = (c.phone || c.partyPhone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [customersList, customerSearchQuery]);

  const selectedCustomerObj = useMemo(() => {
    if (!customerFilter || customerFilter === "all") return null;
    return customersList.find(
      (c) =>
        String(c.id ?? c.partyId ?? "").toLowerCase() === customerFilter.toLowerCase() ||
        String(c.name || c.partyName || "").toLowerCase() === customerFilter.toLowerCase()
    );
  }, [customersList, customerFilter]);

  const currentCustomerLabel = selectedCustomerObj
    ? (selectedCustomerObj.name || selectedCustomerObj.partyName || "Customer")
    : "All Customers";

  const isAnyFilterActive =
    searchQuery.trim() !== "" ||
    (customerFilter && customerFilter !== "all") ||
    paymentMethodFilter !== "all" ||
    dateFilter !== "all" ||
    sortBy !== "latest";

  const sortOptions = [
    { value: "latest", label: "Latest Returns" },
    { value: "oldest", label: "Oldest Returns" },
    { value: "amount_high", label: "Amount: High to Low" },
    { value: "amount_low", label: "Amount: Low to High" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 flex flex-col relative z-20 overflow-visible">
      {/* 1. Quick Preset Pills & Active Filter Bar */}
      <div className="px-3 pt-2.5 pb-2 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-gray-50/70 via-white to-gray-50/70">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1">
            Filter:
          </span>

          {/* Quick tab: All */}
          <button
            type="button"
            onClick={() => {
              setPaymentMethodFilter("all");
              if (setDateFilter) setDateFilter("all");
              if (setCustomerFilter) setCustomerFilter("all");
              setCurrentPageNumber(1);
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              paymentMethodFilter === "all" && dateFilter === "all" && (!customerFilter || customerFilter === "all")
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All Returns ({rawCount > 0 ? rawCount : totalCount})
          </button>

          {/* Quick tab: Cash Refund */}
          <button
            type="button"
            onClick={() => {
              setPaymentMethodFilter("CASH");
              setCurrentPageNumber(1);
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              paymentMethodFilter === "CASH"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
            }`}
          >
            Cash Refunds
          </button>

          {/* Quick tab: Credit Adjust */}
          <button
            type="button"
            onClick={() => {
              setPaymentMethodFilter("CREDIT");
              setCurrentPageNumber(1);
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              paymentMethodFilter === "CREDIT"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
            }`}
          >
            Credit Adjusted
          </button>

          {/* Quick tab: Today */}
          {setDateFilter && (
            <button
              type="button"
              onClick={() => {
                setDateFilter("today");
                setCurrentPageNumber(1);
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                dateFilter === "today"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
              }`}
            >
              Today
            </button>
          )}

          {/* Quick tab: This Month */}
          {setDateFilter && (
            <button
              type="button"
              onClick={() => {
                setDateFilter("thisMonth");
                setCurrentPageNumber(1);
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                dateFilter === "thisMonth"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
              }`}
            >
              This Month
            </button>
          )}
        </div>

        {/* Total records indicator & Reset Filters */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">
            Showing <strong className="text-gray-900">{totalCount}</strong> results
          </span>

          {isAnyFilterActive && onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              title="Reset all active filters"
            >
              <FiRotateCcw size={11} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Filters Toolbar */}
      <div className="p-2 sm:p-2.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 relative z-40 overflow-visible">
        {/* Left Section: Search & Dropdown Filters in uniform height */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Search Box */}
          <div className="w-full sm:w-56 md:w-64 lg:w-72 shrink-0">
            <Search
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              setSearchQuery={setSearchQuery}
              placeholder="Search by Order ID, Customer..."
            />
          </div>

          {/* Date Range Picker (wrapped in fixed shrink-0 container) */}
          {setDateFilter && setCustomStartDate && setCustomEndDate && (
            <div className="w-[calc(50%-4px)] sm:w-40 lg:w-44 shrink-0 z-50">
              <DateRangePicker
                startDate={customStartDate}
                endDate={customEndDate}
                selectedPreset={dateFilter}
                onPresetChange={(preset) => {
                  setDateFilter(preset);
                  setCurrentPageNumber(1);
                }}
                onChange={({ startDate, endDate, label }) => {
                  setCustomStartDate(startDate);
                  setCustomEndDate(endDate);
                  setDateFilter(label || "custom");
                  setCurrentPageNumber(1);
                }}
                size="sm"
              />
            </div>
          )}

          {/* Searchable Customer Filter Dropdown */}
          {setCustomerFilter && customersList.length > 0 && (
            <div className="relative w-[calc(50%-4px)] sm:w-36 lg:w-40 shrink-0 z-50" ref={customerRef}>
              <button
                type="button"
                onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                className="w-full h-[32px] px-2.5 flex items-center justify-between text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 text-black font-medium focus:outline-none cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <FaUser className="text-gray-400 text-[10px] shrink-0" />
                  <span className="truncate">{currentCustomerLabel}</span>
                </div>
                <FiChevronDown className="text-gray-400 shrink-0 ml-1 text-xs" size={13} />
              </button>

              {isCustomerDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-2xl border border-gray-200 p-2 z-[99999]">
                  <div className="relative mb-2">
                    <FaSearch className="absolute left-2.5 top-2.5 text-gray-400 text-xs" />
                    <input
                      type="text"
                      placeholder="Search customer name, phone..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-sky-500 text-black"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                    <div
                      onClick={() => {
                        setCustomerFilter("all");
                        setIsCustomerDropdownOpen(false);
                        setCustomerSearchQuery("");
                        setCurrentPageNumber(1);
                      }}
                      className={`p-2 hover:bg-sky-50 cursor-pointer rounded-md transition-colors text-xs font-medium ${
                        !customerFilter || customerFilter === "all"
                          ? "bg-sky-50 text-sky-600 font-semibold"
                          : "text-black"
                      }`}
                    >
                      All Customers
                    </div>

                    {filteredCustomerOptions.length > 0 ? (
                      filteredCustomerOptions.map((c) => {
                        const cVal = String(c.id ?? c.partyId ?? c.name ?? "");
                        const isSelected = customerFilter === cVal;
                        const cName = c.name || c.partyName || "Customer";
                        const cPhone = c.phone || c.partyPhone || "";

                        return (
                          <div
                            key={c.id ?? c.partyId ?? c.name}
                            onClick={() => {
                              setCustomerFilter(cVal);
                              setIsCustomerDropdownOpen(false);
                              setCustomerSearchQuery("");
                              setCurrentPageNumber(1);
                            }}
                            className={`p-2 hover:bg-sky-50 cursor-pointer rounded-md transition-colors text-xs flex justify-between items-center ${
                              isSelected ? "bg-sky-50 text-sky-600 font-semibold" : "text-black"
                            }`}
                          >
                            <span className="truncate">{cName}</span>
                            {cPhone && (
                              <span className="text-[10px] text-gray-400 shrink-0 ml-1">
                                ({cPhone})
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-gray-400 text-xs">No customer found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Method Filter */}
          <div className="relative w-[calc(50%-4px)] sm:w-36 shrink-0">
            <select
              value={paymentMethodFilter}
              onChange={(e) => {
                setPaymentMethodFilter(e.target.value);
                setCurrentPageNumber(1);
              }}
              className="w-full h-[32px] pl-2.5 pr-6 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 text-black font-medium focus:outline-none cursor-pointer appearance-none transition-colors"
            >
              <option value="all">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="CREDIT">Credit / Due Adjust</option>
              <option value="MFS">MFS (bKash/Nagad)</option>
              <option value="BANK">Bank</option>
            </select>
            <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs" size={13} />
          </div>
        </div>

        {/* Right Actions: Sort Menu & Excel Export Button */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          {/* Sort Dropdown */}
          {setSortBy && (
            <div className="relative shrink-0 z-50 flex-1 sm:flex-none" ref={sortRef}>
              <button
                type="button"
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 h-[32px] text-xs font-medium text-black bg-white hover:bg-gray-50 border border-gray-300 rounded-md transition-colors cursor-pointer"
              >
                <BsFilterRight className="text-gray-600 text-sm shrink-0" />
                <span className="truncate">
                  {sortOptions.find((s) => s.value === sortBy)?.label || "Sort"}
                </span>
                <FiChevronDown className="text-gray-400 text-xs shrink-0" />
              </button>

              {isSortOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-2xl border border-gray-100 py-1 z-[99999]">
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSortBy(opt.value);
                        setIsSortOpen(false);
                        setCurrentPageNumber(1);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                        sortBy === opt.value
                          ? "bg-sky-50 text-sky-600 font-semibold"
                          : "text-black hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Excel Export Button */}
          <button
            type="button"
            onClick={handleExport}
            title="Download Sales Return Excel Report"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 h-[32px] text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <FaFileExcel className="text-emerald-600 shrink-0" size={13} />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* 3. Main Table Content */}
      <div className="overflow-x-auto w-full relative z-10">
        {isLoading ? (
          <TableSkeleton />
        ) : returns.length === 0 ? (
          <EmptyState
            title="No Sales Returns Found"
            description="There are no sales return records matching your selected search or filters."
            buttonText={isAnyFilterActive && onResetFilters ? "Reset Filters" : undefined}
            onButtonClick={onResetFilters}
          />
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#41BEF3] text-black text-xs font-semibold">
                <th className="py-2.5 px-3 text-center w-12">SL</th>
                <th className="py-2.5 px-3">Order ID</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Return Date</th>
                <th className="py-2.5 px-3 text-center">Items</th>
                <th className="py-2.5 px-3">Note / Reason</th>
                <th className="py-2.5 px-3 text-center">Payment Type</th>
                <th className="py-2.5 px-3 text-right">Refund Amount</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {returns.map((item, index) => {
                const rowKey = item.id || item.returnNo || index;
                const isExpanded = expandedRows.has(rowKey);
                const sl = (currentPageNumber - 1) * dataLimit + index + 1;
                const refund = Number(item.refundAmount ?? item.grandTotal ?? item.totalAmount ?? 0);
                const pType = String(item.paymentType || "CASH").toUpperCase();

                // Payment badges
                let paymentBadgeClass = "bg-blue-50 text-blue-700 border-blue-200";
                let paymentDotClass = "bg-blue-500";
                if (pType === "CASH") {
                  paymentBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  paymentDotClass = "bg-emerald-500";
                } else if (pType === "CREDIT" || pType === "DUE") {
                  paymentBadgeClass = "bg-amber-50 text-amber-800 border-amber-200";
                  paymentDotClass = "bg-amber-500";
                } else if (pType.includes("MULTI") || pType === "MFS") {
                  paymentBadgeClass = "bg-purple-50 text-purple-700 border-purple-200";
                  paymentDotClass = "bg-purple-500";
                }

                // Return items count
                const details = Array.isArray(item.returnDetails) ? item.returnDetails : [];
                const itemsCount = details.length > 0 ? details.length : Number(item.itemsCount || 1);

                return (
                  <React.Fragment key={rowKey}>
                    <tr className={`transition-colors group ${isExpanded ? "bg-sky-50/50" : "hover:bg-sky-50/30"}`}>
                      {/* SL */}
                      <td className="py-2.5 px-3 text-center font-mono text-gray-500 text-xs">
                        {sl}
                      </td>

                      {/* Order ID only */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 group/ord">
                          <span
                            onClick={() => onView(item)}
                            title="Click to view voucher"
                            className="font-mono font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-md border border-sky-200 text-xs tracking-tight cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                          >
                            <FaFileInvoice className="text-sky-500 text-[11px]" />
                            <span>{item.orderNo ? `Order #${item.orderNo}` : (item.returnNo || `RET-${item.id}`)}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyReturnNo(item.orderNo ? String(item.orderNo) : String(item.returnNo || item.id), rowKey)}
                            title="Copy Order ID"
                            className="p-1 text-gray-400 hover:text-sky-600 transition-colors opacity-0 group-hover/ord:opacity-100 cursor-pointer"
                          >
                            {copiedId === rowKey ? (
                              <FiCheck className="text-emerald-600 text-xs" />
                            ) : (
                              <FiCopy size={12} />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Customer with avatar initial & phone */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-500 to-cyan-400 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-xs">
                            {(item.customerName || "C").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">
                              {item.customerName || "Walk-in Customer"}
                            </div>
                            {item.customerPhone ? (
                              <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                                <FaPhone className="text-[8px] text-gray-400" />
                                {item.customerPhone}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Return Date */}
                      <td className="py-2.5 px-3 text-gray-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-[11px]">
                          <FaCalendarAlt className="text-gray-400 text-[10px]" />
                          <span>{moment(item.returnDate || item.createdAt).format("DD MMM, YYYY")}</span>
                        </div>
                      </td>

                      {/* Items Count with Expand Toggle */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleExpandRow(rowKey)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                            isExpanded
                              ? "bg-sky-600 text-white shadow-xs"
                              : "bg-gray-100 hover:bg-sky-100 text-gray-700 hover:text-sky-800"
                          }`}
                          title="Click to view returned products breakdown"
                        >
                          <span>{itemsCount} {itemsCount === 1 ? "item" : "items"}</span>
                          <FiChevronDown
                            size={12}
                            className={`transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </td>

                      {/* Note / Remarks */}
                      <td className="py-2.5 px-3 max-w-[170px] truncate" title={item.note || item.remarks || ""}>
                        {item.note || item.remarks ? (
                          <span className="text-gray-700 text-xs bg-gray-50 px-2 py-0.5 rounded border border-gray-200 truncate inline-block max-w-full">
                            {item.note || item.remarks}
                          </span>
                        ) : (
                          <span className="text-gray-300 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Payment Type */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${paymentBadgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${paymentDotClass}`}></span>
                          {pType}
                        </span>
                      </td>

                      {/* Refund Amount */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="font-extrabold text-gray-900 font-mono text-sm whitespace-nowrap">
                          ৳ {formatMoney(refund)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {item.status || "Completed"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onView(item)}
                            className="p-1.5 text-sky-600 hover:bg-sky-100 hover:text-sky-800 rounded-md transition-colors cursor-pointer border border-transparent hover:border-sky-200"
                            title="View Return Slip"
                          >
                            <FiEye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onPrint(item)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800 rounded-md transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
                            title="Print Return Slip"
                          >
                            <FiPrinter size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Accordion Drawer for Items Breakdown */}
                    {isExpanded && (
                      <tr className="bg-sky-50/40 border-y border-sky-100">
                        <td colSpan={10} className="p-3 sm:p-4">
                          <div className="bg-white rounded-lg border border-sky-200 shadow-xs p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-gray-100">
                              <div className="flex items-center gap-2">
                                <FaBoxOpen className="text-sky-600 text-sm" />
                                <span className="font-bold text-gray-900 text-xs">
                                  Returned Items Breakdown ({details.length} products)
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-500">Total Refund:</span>
                                <span className="font-bold text-emerald-600 font-mono text-sm">
                                  ৳ {formatMoney(refund)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onView(item)}
                                  className="ml-2 text-xs text-sky-600 hover:underline font-semibold cursor-pointer"
                                >
                                  View Full Slip →
                                </button>
                              </div>
                            </div>

                            {details.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 text-[11px]">
                                      <th className="py-1.5 px-2 text-center w-8">#</th>
                                      <th className="py-1.5 px-2">Product Name</th>
                                      <th className="py-1.5 px-2">Product Code</th>
                                      <th className="py-1.5 px-2 text-center">Unit Price</th>
                                      <th className="py-1.5 px-2 text-center">Return Qty</th>
                                      <th className="py-1.5 px-2 text-right">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {details.map((prod: any, pIdx: number) => {
                                      const pQty = Number(prod.quantity ?? prod.returnQuantity ?? 1);
                                      const pPrice = Number(prod.sellPrice ?? 0);
                                      const pTotal = Number(prod.total ?? pQty * pPrice);

                                      return (
                                        <tr key={pIdx} className="hover:bg-gray-50/50">
                                          <td className="py-1.5 px-2 text-center text-gray-400 font-mono">
                                            {pIdx + 1}
                                          </td>
                                          <td className="py-1.5 px-2 font-medium text-gray-900">
                                            {prod.productName || "Product"}
                                          </td>
                                          <td className="py-1.5 px-2 font-mono text-gray-500 text-[11px]">
                                            {prod.productCode || "-"}
                                          </td>
                                          <td className="py-1.5 px-2 text-center font-mono">
                                            ৳ {formatMoney(pPrice)}
                                          </td>
                                          <td className="py-1.5 px-2 text-center font-bold text-sky-700">
                                            {pQty} {prod.unit || "pcs"}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-bold text-gray-900 font-mono">
                                            ৳ {formatMoney(pTotal)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-gray-500 text-xs italic py-2 text-center">
                                Direct voucher refund without individual item breakdown records.
                              </div>
                            )}

                            {/* Remarks info if available */}
                            {item.note && (
                              <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-600 flex items-center gap-1.5">
                                <strong className="text-gray-800">Remarks:</strong> {item.note}
                              </div>
                            )}
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

      {/* 4. Pagination Footer */}
      <div className="p-2 sm:p-2.5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/40">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>Show</span>
          <select
            value={dataLimit}
            onChange={(e) => {
              setDataLimit(Number(e.target.value));
              setCurrentPageNumber(1);
            }}
            className="border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none text-xs font-semibold"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>entries per page (Total {totalCount} records)</span>
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

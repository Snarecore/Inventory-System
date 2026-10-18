import React, { useState, useRef, useEffect, useMemo } from "react";
import { FiEye, FiPrinter, FiChevronDown, FiCopy, FiCheck, FiRotateCcw } from "react-icons/fi";
import {
  FaFileExcel,
  FaSearch,
  FaBoxOpen,
} from "react-icons/fa";
import moment from "moment";
import Search from "@/components/table-components/Search";
import DateRangePicker from "@/components/date-range-picker/DateRangePicker";
import EmptyState from "@/components/empty-state/EmptyState";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import Pagination from "@/components/pagination";
import ColumnVisibilityDropdown, { type ColumnItem } from "@/components/table-components/ColumnVisibilityDropdown";
import type { PurchaseReturnItem, PartyItem } from "@/types";
import { exportPurchaseReturnToExcel } from "@/utils/excel-export";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import { formatMoney } from "@/utils/formatters";
import { getPurchaseReturnReasonLabel } from "../constants/returnReasons";

interface PurchaseReturnTableProps {
  returns: PurchaseReturnItem[];
  exportableReturns?: PurchaseReturnItem[];
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
  supplierFilter?: string;
  setSupplierFilter?: (supplierId: string) => void;
  suppliersList?: PartyItem[];
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
  onView: (item: PurchaseReturnItem) => void;
  onPrint: (item: PurchaseReturnItem) => void;
}

export const PurchaseReturnTable: React.FC<PurchaseReturnTableProps> = ({
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
  supplierFilter = "all",
  setSupplierFilter,
  suppliersList = [],
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
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState<boolean>(false);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());

  const supplierRef = useRef<HTMLDivElement>(null);

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

  // Copy order id to clipboard
  const handleCopyOrderId = (text: string, id: string | number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showSuccessToast(`Copied Order ID: ${text}`);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Excel Export
  const handleExport = () => {
    const dataToExport = exportableReturns && exportableReturns.length > 0 ? exportableReturns : returns;
    if (!dataToExport || dataToExport.length === 0) {
      showErrorToast("No purchase return records available to export");
      return;
    }
    try {
      exportPurchaseReturnToExcel(dataToExport);
      showSuccessToast(`Successfully exported ${dataToExport.length} purchase return records to Excel!`);
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : "Failed to export Excel file");
    }
  };

  // Click outside handling for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (supplierRef.current && !supplierRef.current.contains(event.target as Node)) {
        setIsSupplierDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered suppliers for searchable dropdown
  const filteredSupplierOptions = useMemo(() => {
    if (!supplierSearchQuery.trim()) return suppliersList;
    const q = supplierSearchQuery.toLowerCase().trim();
    return suppliersList.filter((s) => {
      const name = (s.name || s.partyName || "").toLowerCase();
      const phone = (s.phone || s.partyPhone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [suppliersList, supplierSearchQuery]);

  const selectedSupplierObj = (!supplierFilter || supplierFilter === "all")
    ? null
    : suppliersList.find(
        (s) =>
          String(s.id ?? "").toLowerCase() === supplierFilter.toLowerCase() ||
          String(s.name || "").toLowerCase() === supplierFilter.toLowerCase()
      ) || null;

  const currentSupplierLabel = selectedSupplierObj
    ? (selectedSupplierObj.name || "Supplier")
    : "All Suppliers";

  const isAnyFilterActive =
    searchQuery.trim() !== "" ||
    (supplierFilter && supplierFilter !== "all") ||
    paymentMethodFilter !== "all" ||
    dateFilter !== "all" ||
    sortBy !== "latest";

  const SortHeader = ({
    label,
    activeKey,
  }: {
    label: string;
    activeKey: "supplier" | "amount";
  }) => {
    const isAsc =
      sortBy === (activeKey === "supplier" ? "supplier_a_to_z" : "amount_low_to_high") ||
      (activeKey === "amount" && sortBy === "amount_low");
    const isDesc =
      sortBy === (activeKey === "supplier" ? "supplier_z_to_a" : "amount_high_to_low") ||
      (activeKey === "amount" && sortBy === "amount_high");

    const handleClick = () => {
      if (!setSortBy) return;
      if (activeKey === "supplier") {
        setSortBy(isAsc ? "supplier_z_to_a" : isDesc ? "latest" : "supplier_a_to_z");
      } else {
        setSortBy(isAsc ? "amount_high_to_low" : isDesc ? "latest" : "amount_low_to_high");
      }
      setCurrentPageNumber(1);
    };

    return (
      <span
        onClick={setSortBy ? handleClick : undefined}
        className={`inline-flex items-center gap-1 select-none text-black ${
          setSortBy ? "cursor-pointer" : ""
        }`}
      >
        <span>{label}</span>
        <FiChevronDown
          size={11}
          className={`text-black transition-transform duration-200 ${
            isAsc ? "rotate-180" : ""
          }`}
        />
      </span>
    );
  };

  // Column Visibility Configuration
  const availableColumns: ColumnItem[] = [
    { key: "sl", label: "SL" },
    { key: "orderId", label: "Order ID" },
    { key: "supplier", label: "Supplier" },
    { key: "returnDate", label: "Return Date" },
    { key: "items", label: "Items" },
    { key: "remarks", label: "Remarks" },
    { key: "paymentType", label: "Payment Type" },
    { key: "refundAmount", label: "Refund Amount" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Actions" },
  ];

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("purchase_return_table_columns");
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
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
        localStorage.setItem("purchase_return_table_columns", JSON.stringify(next));
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
      localStorage.removeItem("purchase_return_table_columns");
    } catch {}
  };

  const activeVisibleColumnCount = availableColumns.filter((c) => isColVisible(c.key)).length;

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 flex flex-col relative z-20 overflow-visible">
      {/* Filters Toolbar */}
      <div className="p-2 sm:p-2.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 relative z-40 overflow-visible">
        {/* Left Section: Search & Dropdown Filters in uniform height */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Search Box */}
          <div className="w-full sm:w-44 md:w-48 lg:w-52 shrink-0">
            <Search
              searchQuery={searchQuery}
              onSearchChange={(val) => {
                setSearchQuery(val);
                setCurrentPageNumber(1);
              }}
              setSearchQuery={setSearchQuery}
              placeholder="Search order, supplier..."
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

          {/* Searchable Supplier Filter Dropdown */}
          {setSupplierFilter && suppliersList.length > 0 && (
            <div className="relative w-[calc(50%-4px)] sm:w-36 shrink-0 z-50" ref={supplierRef}>
              <button
                type="button"
                onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
                className="w-full h-8 px-2 flex items-center justify-between text-xs border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white text-black font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                <span className="truncate flex-1 text-left">{currentSupplierLabel}</span>
                <FiChevronDown className="text-gray-500 shrink-0 ml-1 text-xs" size={13} />
              </button>

              {isSupplierDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-2xl border border-gray-200 p-2 z-[99999]">
                  <div className="relative mb-2">
                    <FaSearch className="absolute left-2.5 top-2.5 text-gray-400 text-xs" />
                    <input
                      type="text"
                      placeholder="Search supplier name, phone..."
                      value={supplierSearchQuery}
                      onChange={(e) => setSupplierSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 text-xs border border-[var(--color-primary)] rounded-md focus:outline-none focus:border-[var(--color-primary)] text-black"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                    <div
                      onClick={() => {
                        setSupplierFilter("all");
                        setIsSupplierDropdownOpen(false);
                        setSupplierSearchQuery("");
                        setCurrentPageNumber(1);
                      }}
                      className={`p-2 hover:bg-sky-50 cursor-pointer rounded-md transition-colors text-xs font-medium ${
                        !supplierFilter || supplierFilter === "all"
                          ? "bg-sky-50 text-[var(--color-primary)] font-semibold"
                          : "text-black"
                      }`}
                    >
                      All Suppliers
                    </div>

                    {filteredSupplierOptions.length > 0 ? (
                      filteredSupplierOptions.map((s) => {
                        const sVal = String(s.id ?? s.name ?? "");
                        const isSelected = supplierFilter === sVal;
                        const sName = s.name || "Supplier";
                        const sPhone = s.phone || "";

                        return (
                          <div
                            key={sVal}
                            onClick={() => {
                              setSupplierFilter(sVal);
                              setIsSupplierDropdownOpen(false);
                              setSupplierSearchQuery("");
                              setCurrentPageNumber(1);
                            }}
                            className={`p-2 hover:bg-sky-50 cursor-pointer rounded-md transition-colors text-xs flex justify-between items-center ${
                              isSelected ? "bg-sky-50 text-[var(--color-primary)] font-semibold" : "text-black"
                            }`}
                          >
                            <span className="truncate">{sName}</span>
                            {sPhone && (
                              <span className="text-[10px] text-gray-500 shrink-0 ml-1">
                                ({sPhone})
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-gray-400 text-xs">No supplier found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Method Filter */}
          <div className="relative w-[calc(50%-4px)] sm:w-28 shrink-0">
            <select
              value={paymentMethodFilter}
              onChange={(e) => {
                setPaymentMethodFilter(e.target.value);
                setCurrentPageNumber(1);
              }}
              className="w-full h-8 pl-2.5 pr-6 text-xs border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white text-black font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer appearance-none"
            >
              <option value="all">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="CREDIT">Credit / Due Adjust</option>
              <option value="MFS">MFS (bKash/Nagad)</option>
              <option value="BANK">Bank</option>
            </select>
            <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-black pointer-events-none text-xs" size={13} />
          </div>
        </div>

        {/* Right Actions: Reset & Excel Export Button */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          {/* Reset Filters button when active */}
          {isAnyFilterActive && onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              title="Reset all active filters"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 h-8 text-[11px] sm:text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <FiRotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}

          {/* Column Visibility Menu */}
          <ColumnVisibilityDropdown
            columns={availableColumns}
            visibleColumns={visibleColumns}
            onToggle={handleToggleColumn}
            onReset={handleResetColumns}
          />

          {/* Excel Export Button */}
          <button
            type="button"
            onClick={handleExport}
            title="Download Purchase Return Excel Report"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 h-8 text-[11px] sm:text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <FaFileExcel className="text-emerald-600 shrink-0" size={12} />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* 3. Main Table Content */}
      <div className="overflow-x-auto w-full relative z-10">
        {isLoading ? (
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={8} />
        ) : returns.length === 0 ? (
          <EmptyState
            title="No Purchase Returns Found"
            description="There are no purchase return records matching your selected search or filters."
            buttonText={isAnyFilterActive && onResetFilters ? "Reset Filters" : undefined}
            onButtonClick={onResetFilters}
          />
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#41BEF3] text-black text-xs font-semibold">
                {isColVisible("sl") && <th className="py-2.5 px-3 text-center w-10">SL</th>}
                {isColVisible("orderId") && <th className="py-2.5 px-3 whitespace-nowrap">Order ID</th>}
                {isColVisible("supplier") && (
                  <th className="py-2.5 px-3 min-w-[120px]">
                    <SortHeader label="Supplier" activeKey="supplier" />
                  </th>
                )}
                {isColVisible("returnDate") && <th className="py-2.5 px-3 whitespace-nowrap">Return Date</th>}
                {isColVisible("items") && <th className="py-2.5 px-3 text-center w-24 whitespace-nowrap">Items</th>}
                {isColVisible("remarks") && <th className="py-2.5 px-3 text-center w-44 min-w-[150px] max-w-[180px]">Remarks</th>}
                {isColVisible("paymentType") && <th className="py-2.5 px-3 text-center w-28 whitespace-nowrap">Payment Type</th>}
                {isColVisible("refundAmount") && (
                  <th className="py-2.5 px-3 text-right w-32 whitespace-nowrap">
                    <div className="flex justify-end">
                      <SortHeader label="Refund Amount" activeKey="amount" />
                    </div>
                  </th>
                )}
                {isColVisible("status") && <th className="py-2.5 px-3 text-center w-28 whitespace-nowrap">Status</th>}
                {isColVisible("actions") && <th className="py-2.5 px-3 text-center w-24 whitespace-nowrap">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {returns.map((item, index) => {
                const rowKey = item.id || item.returnNo || index;
                const isExpanded = expandedRows.has(rowKey);
                const sl = (currentPageNumber - 1) * dataLimit + index + 1;
                const refund = Number(item.refundAmount ?? item.grandTotal ?? 0);
                const pType = String(item.paymentType || "CASH").toUpperCase();

                // Payment badges
                const paymentBg = "bg-sky-100 text-sky-900 border-sky-300 font-semibold";

                // Return items count
                const details = Array.isArray(item.returnDetails) ? item.returnDetails : [];
                const itemsCount = details.length > 0 ? details.length : Number(item.itemsCount || 1);

                // Status badge styling
                const statusStr = String(item.status || "Completed").trim();
                const statusUpper = statusStr.toUpperCase();
                let statusBg = "bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold";
                if (statusUpper.includes("PENDING")) {
                  statusBg = "bg-amber-100 text-amber-800 border-amber-300 font-semibold";
                } else if (statusUpper.includes("CANCEL") || statusUpper.includes("REJECT")) {
                  statusBg = "bg-rose-100 text-rose-800 border-rose-300 font-semibold";
                } else if (statusUpper.includes("PARTIAL")) {
                  statusBg = "bg-sky-100 text-sky-800 border-sky-300 font-semibold";
                }

                return (
                  <React.Fragment key={rowKey}>
                    <tr className={`transition-colors group ${isExpanded ? "bg-sky-50/50" : "hover:bg-sky-50/40"}`}>
                      {/* SL */}
                      {/* SL */}
                      {isColVisible("sl") && (
                        <td className="py-2.5 px-3 text-center text-black text-xs font-normal">
                          {sl}
                        </td>
                      )}

                      {/* Order ID */}
                      {isColVisible("orderId") && (
                        <td className="py-2.5 px-3 text-black text-xs font-normal whitespace-nowrap">
                          <div className="flex items-center gap-1.5 group/ord">
                            <span
                              onClick={() => onView(item)}
                              title="Click to view voucher"
                              className="cursor-pointer hover:text-sky-600 transition-colors"
                            >
                              {item.orderNo ? `${item.orderNo}` : (item.returnNo || `PR-${item.id}`)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyOrderId(item.orderNo ? String(item.orderNo) : String(item.returnNo || item.id), rowKey)}
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
                      )}

                      {/* Supplier */}
                      {isColVisible("supplier") && (
                        <td className="py-2.5 px-3 text-black text-xs font-normal min-w-[120px]">
                          <div className="truncate text-black font-normal max-w-[150px]">
                            {item.supplierName || "Supplier"}
                          </div>
                        </td>
                      )}

                      {/* Return Date */}
                      {isColVisible("returnDate") && (
                        <td className="py-2.5 px-3 text-black text-xs font-normal whitespace-nowrap">
                          <span className="flex items-center gap-1 text-[11px] text-black font-normal">
                            {moment(item.returnDate || item.createdAt).format("DD MMM, YYYY")}
                          </span>
                        </td>
                      )}

                      {/* Items */}
                      {isColVisible("items") && (
                        <td className="py-2.5 px-3 text-center w-24">
                          <button
                            type="button"
                            onClick={() => toggleExpandRow(rowKey)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 hover:bg-sky-100 text-black rounded text-[11px] font-normal transition-colors cursor-pointer"
                            title="Click to view returned products"
                          >
                            <span>{itemsCount} {itemsCount === 1 ? "item" : "items"}</span>
                            <FiChevronDown
                              size={11}
                              className={`text-gray-500 transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        </td>
                      )}

                      {/* Remarks */}
                      {isColVisible("remarks") && (
                        <td className="py-2.5 px-3 text-center text-black text-xs font-normal w-44 min-w-[150px] max-w-[180px]">
                          {item.note || item.remarks ? (
                            <div
                              className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200/80 border border-gray-200 text-black text-xs font-normal max-w-[160px] transition-colors cursor-pointer"
                              title={item.note || item.remarks}
                              onClick={() => onView(item)}
                            >
                              <span className="truncate">{item.note || item.remarks}</span>
                            </div>
                          ) : (
                            <span className="text-black font-normal">N/A</span>
                          )}
                        </td>
                      )}

                      {/* Payment Type */}
                      {isColVisible("paymentType") && (
                        <td className="py-2.5 px-3 text-center w-28 whitespace-nowrap">
                          <span
                            className={`inline-block px-1.5 py-0.5 text-[10px] border rounded-md ${paymentBg}`}
                          >
                            {pType}
                          </span>
                        </td>
                      )}

                      {/* Refund Amount */}
                      {isColVisible("refundAmount") && (
                        <td className="py-2.5 px-3 text-right text-black text-xs font-normal w-32 whitespace-nowrap">
                          ৳ {formatMoney(refund)}
                        </td>
                      )}

                      {/* Status */}
                      {isColVisible("status") && (
                        <td className="py-2.5 px-3 text-center w-28 whitespace-nowrap">
                          <span
                            className={`inline-block px-1.5 py-0.5 text-[10px] border rounded-md ${statusBg}`}
                          >
                            {statusStr}
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      {isColVisible("actions") && (
                        <td className="py-2 px-3 text-center w-24 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onView(item)}
                              className="p-1 rounded text-sky-600 hover:bg-sky-100 transition-colors cursor-pointer"
                              title="View Return Slip"
                            >
                              <FiEye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onPrint(item)}
                              className="p-1 rounded text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                              title="Print Return Slip"
                            >
                              <FiPrinter size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Expandable Accordion Drawer for Items Breakdown */}
                    {isExpanded && (
                      <tr className="bg-sky-50/40 border-y border-sky-100">
                        <td colSpan={activeVisibleColumnCount} className="p-2.5 sm:p-3">
                          <div className="bg-white rounded-lg border border-sky-200 shadow-xs p-2.5 sm:p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-gray-100">
                              <div className="flex items-center gap-2">
                                <FaBoxOpen className="text-sky-600 text-sm" />
                                <span className="font-semibold text-black text-xs">
                                  Returned Items Breakdown ({details.length} products)
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-black">Total Refund:</span>
                                <span className="font-semibold text-black text-xs">
                                  ৳ {formatMoney(refund)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onView(item)}
                                  className="ml-2 text-xs text-sky-600 font-medium cursor-pointer"
                                >
                                  View Full Slip
                                </button>
                              </div>
                            </div>

                            {details.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-gray-50 text-black font-semibold border-b border-gray-200 text-[11px]">
                                      <th className="py-1.5 px-2 text-center w-8">SL</th>
                                      <th className="py-1.5 px-2">Product Name</th>
                                      <th className="py-1.5 px-2">Product Code</th>
                                      <th className="py-1.5 px-2 text-center">Unit Price</th>
                                      <th className="py-1.5 px-2 text-center">Return Qty</th>
                                      <th className="py-1.5 px-2 text-center">Return Reason</th>
                                      <th className="py-1.5 px-2 text-right">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {details.map((prod, pIdx) => {
                                      const pQty = Number(prod.quantity ?? prod.returnQuantity ?? 1);
                                      const pPrice = Number(prod.buyPrice ?? 0);
                                      const pTotal = Number(prod.total ?? pQty * pPrice);
                                      const pReason = prod.returnReason || prod.return_reason || prod.reason;

                                      return (
                                        <tr key={pIdx} className="hover:bg-gray-50/50">
                                          <td className="py-1.5 px-2 text-center text-black font-medium">
                                            {pIdx + 1}
                                          </td>
                                          <td className="py-1.5 px-2 font-medium text-black">
                                            {prod.productName || "Product"}
                                          </td>
                                          <td className="py-1.5 px-2  text-black text-[11px]">
                                            {prod.productCode || "N/A"}
                                          </td>
                                          <td className="py-1.5 px-2 text-center text-black font-medium">
                                            ৳ {formatMoney(pPrice)}
                                          </td>
                                          <td className="py-1.5 px-2 text-center font-bold text-sky-700">
                                            {pQty} {prod.unit || "pcs"}
                                          </td>
                                          <td className="py-1.5 px-2 text-center">
                                            {pReason ? (
                                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                                {getPurchaseReturnReasonLabel(pReason)}
                                              </span>
                                            ) : (
                                              <span className="text-black font-normal">N/A</span>
                                            )}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-bold text-black ">
                                            ৳ {formatMoney(pTotal)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-black text-xs italic py-2 text-center">
                                Direct voucher refund without individual item breakdown records.
                              </div>
                            )}

                            {/* Remarks info if available */}
                            {(item.note || item.remarks) && (
                              <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] text-black font-normal flex items-center gap-1.5">
                                <strong className="text-black">Remarks:</strong> {item.note || item.remarks}
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
      {!isLoading && returns.length > 0 && (
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
            <span>entries per page (Total {totalCount} purchase returns)</span>
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

export default PurchaseReturnTable;

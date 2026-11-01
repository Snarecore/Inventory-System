import React, { useState, useRef, useEffect, useMemo } from "react";
import { FiEye, FiPrinter, FiChevronDown, FiCopy, FiCheck, FiRotateCcw } from "react-icons/fi";
import { FaFileExcel, FaSearch, FaBoxOpen } from "react-icons/fa";
import moment from "moment";
import Search from "@/components/table-components/Search";
import DateRangePicker from "@/components/date-range-picker/DateRangePicker";
import EmptyState from "@/components/empty-state/EmptyState";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import Pagination from "@/components/pagination";
import {
  TableContainer,
  TableToolbar,
  TableScroll,
  Table,
  TableHead,
  TableTh,
  TableBody,
  TableRow,
  TableCell,
  TablePaginationFooter,
  TableActionButtons,
} from "@/components/common";
import ColumnVisibilityDropdown, { type ColumnItem } from "@/components/table-components/ColumnVisibilityDropdown";
import type { PartyItem } from "@/types";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import { formatMoney } from "@/utils/formatters";
import { getReturnReasonLabel, getPurchaseReturnReasonLabel } from "@/pages/admin/trade/constants/returnReasons";

export interface TradeReturnTableProps<T = any> {
  partyType?: "customer" | "supplier";
  partyLabel?: string;
  storageKey?: string;
  returns: T[];
  exportableReturns?: T[];
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
  partyFilter?: string;
  setPartyFilter?: (partyId: string) => void;
  partiesList?: PartyItem[];
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
  onView: (item: T) => void;
  onPrint: (item: T) => void;
  onExportExcel?: (items: T[]) => void;
  getReasonLabel?: (code?: string | null) => string;
}

export function TradeReturnTable<T extends Record<string, any>>({
  partyType = "customer",
  partyLabel,
  storageKey,
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
  partyFilter = "all",
  setPartyFilter,
  partiesList = [],
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
  onExportExcel,
  getReasonLabel: customGetReasonLabel,
}: TradeReturnTableProps<T>) {
  const isCustomer = partyType === "customer";
  const defaultPartyLabel = isCustomer ? "Customer" : "Supplier";
  const actualPartyLabel = partyLabel || defaultPartyLabel;
  const localStorageKey = storageKey || (isCustomer ? "sales_return_table_columns" : "purchase_return_table_columns");
  const defaultReasonLabelFn = isCustomer ? getReturnReasonLabel : getPurchaseReturnReasonLabel;
  const reasonLabelFn = customGetReasonLabel || defaultReasonLabelFn;

  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState<boolean>(false);
  const [partySearchQuery, setPartySearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | number | null>(null);

  const partyRef = useRef<HTMLDivElement>(null);

  // Toggle expanded row (accordion mode: only one row expanded at a time)
  const toggleExpandRow = (id: string | number) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  // Copy order ID to clipboard
  const handleCopyOrderId = (text?: string, id?: string | number) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (id !== undefined) setCopiedId(id);
    showSuccessToast(`Copied Order ID: ${text}`);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Excel Export
  const handleExport = () => {
    const dataToExport = exportableReturns && exportableReturns.length > 0 ? exportableReturns : returns;
    if (!dataToExport || dataToExport.length === 0) {
      showErrorToast(`No ${actualPartyLabel.toLowerCase()} return records available to export`);
      return;
    }
    if (onExportExcel) {
      onExportExcel(dataToExport);
    }
  };

  // Click outside handling for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (partyRef.current && !partyRef.current.contains(event.target as Node)) {
        setIsPartyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered parties for searchable dropdown
  const filteredPartyOptions = useMemo(() => {
    if (!partySearchQuery.trim()) return partiesList;
    const q = partySearchQuery.toLowerCase().trim();
    return partiesList.filter((p) => {
      const name = (p.name || p.partyName || "").toLowerCase();
      const phone = (p.phone || p.partyPhone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [partiesList, partySearchQuery]);

  const selectedPartyObj = (!partyFilter || partyFilter === "all")
    ? null
    : partiesList.find(
        (p) =>
          String(p.id ?? p.partyId ?? "").toLowerCase() === partyFilter.toLowerCase() ||
          String(p.name || p.partyName || "").toLowerCase() === partyFilter.toLowerCase()
      ) || null;

  const currentPartyDisplayLabel = selectedPartyObj
    ? (selectedPartyObj.name || selectedPartyObj.partyName || actualPartyLabel)
    : `All ${actualPartyLabel}s`;

  const isAnyFilterActive =
    searchQuery.trim() !== "" ||
    (partyFilter && partyFilter !== "all") ||
    paymentMethodFilter !== "all" ||
    dateFilter !== "all" ||
    sortBy !== "latest";

  const renderSortHeader = (label: string, activeKey: "party" | "amount") => {
    const isAsc =
      sortBy === (activeKey === "party" ? `${partyType}_a_to_z` : "amount_low_to_high") ||
      (activeKey === "amount" && sortBy === "amount_low");
    const isDesc =
      sortBy === (activeKey === "party" ? `${partyType}_z_to_a` : "amount_high_to_low") ||
      (activeKey === "amount" && sortBy === "amount_high");

    const handleClick = () => {
      if (!setSortBy) return;
      if (activeKey === "party") {
        setSortBy(isAsc ? `${partyType}_z_to_a` : isDesc ? "latest" : `${partyType}_a_to_z`);
      } else {
        setSortBy(isAsc ? "amount_high_to_low" : isDesc ? "latest" : "amount_low_to_high");
      }
      setCurrentPageNumber(1);
    };

    return (
      <span
        onClick={setSortBy ? handleClick : undefined}
        className={`inline-flex items-center gap-1 select-none text-current ${
          setSortBy ? "cursor-pointer" : ""
        }`}
      >
        <span>{label}</span>
        <FiChevronDown
          size={11}
          className={`text-current transition-transform duration-200 ${
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
    { key: partyType, label: actualPartyLabel },
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
      const saved = localStorage.getItem(localStorageKey);
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
        localStorage.setItem(localStorageKey, JSON.stringify(next));
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
      localStorage.removeItem(localStorageKey);
    } catch {}
  };

  const activeVisibleColumnCount = availableColumns.filter((c) => isColVisible(c.key)).length;

  return (
    <TableContainer>
      {/* Filters Toolbar */}
      <TableToolbar>
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
              placeholder={`Search order, ${actualPartyLabel.toLowerCase()}...`}
            />
          </div>

          {/* Date Range Picker */}
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

          {/* Searchable Party Filter Dropdown */}
          {setPartyFilter && partiesList.length > 0 && (
            <div className="relative w-[calc(50%-4px)] sm:w-36 shrink-0 z-50" ref={partyRef}>
              <button
                type="button"
                onClick={() => setIsPartyDropdownOpen(!isPartyDropdownOpen)}
                className="w-full h-8 px-2 flex items-center justify-between text-xs border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                <span className="truncate flex-1 text-left">{currentPartyDisplayLabel}</span>
                <FiChevronDown className="text-[var(--ui-text-muted)] shrink-0 ml-1 text-xs" size={13} />
              </button>

              {isPartyDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-64 max-w-[calc(100vw-2rem)] bg-[var(--ui-surface)] rounded-lg shadow-2xl border border-[var(--ui-border)] p-2 z-[99999]">
                  <div className="relative mb-2">
                    <FaSearch className="absolute left-2.5 top-2.5 text-[var(--ui-text-subtle)] text-xs" />
                    <input
                      type="text"
                      placeholder={`Search ${actualPartyLabel.toLowerCase()} name, phone...`}
                      value={partySearchQuery}
                      onChange={(e) => setPartySearchQuery(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 text-xs border border-[var(--color-primary)] rounded-md focus:outline-none focus:border-[var(--color-primary)] text-[var(--ui-text)]"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-[var(--ui-border)]">
                    <div
                      onClick={() => {
                        setPartyFilter("all");
                        setIsPartyDropdownOpen(false);
                        setPartySearchQuery("");
                        setCurrentPageNumber(1);
                      }}
                      className={`p-2 hover:bg-[var(--primary-color-light)] cursor-pointer rounded-md transition-colors text-xs font-medium ${
                        !partyFilter || partyFilter === "all"
                          ? "bg-[var(--primary-color-light)] text-[var(--color-primary)] font-semibold"
                          : "text-[var(--ui-text)]"
                      }`}
                    >
                      All {actualPartyLabel}s
                    </div>

                    {filteredPartyOptions.length > 0 ? (
                      filteredPartyOptions.map((p) => {
                        const pVal = String(p.id ?? p.partyId ?? p.name ?? "");
                        const isSelected = partyFilter === pVal;
                        const pName = p.name || p.partyName || actualPartyLabel;
                        const pPhone = p.phone || p.partyPhone || "";

                        return (
                          <div
                            key={p.id ?? p.partyId ?? p.name}
                            onClick={() => {
                              setPartyFilter(pVal);
                              setIsPartyDropdownOpen(false);
                              setPartySearchQuery("");
                              setCurrentPageNumber(1);
                            }}
                            className={`p-2 hover:bg-[var(--primary-color-light)] cursor-pointer rounded-md transition-colors text-xs flex justify-between items-center ${
                              isSelected ? "bg-[var(--primary-color-light)] text-[var(--color-primary)] font-semibold" : "text-[var(--ui-text)]"
                            }`}
                          >
                            <span className="truncate">{pName}</span>
                            {pPhone && (
                              <span className="text-[10px] text-[var(--ui-text-muted)] shrink-0 ml-1">
                                ({pPhone})
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-[var(--ui-text-subtle)] text-xs">No {actualPartyLabel.toLowerCase()} found</div>
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
              className="w-full h-8 pl-2.5 pr-6 text-xs border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer appearance-none"
            >
              <option value="all">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="CREDIT">Credit / Due Adjust</option>
            </select>
            <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text)] pointer-events-none text-xs" size={13} />
          </div>
        </div>

        {/* Right Actions: Reset & Excel Export Button */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--ui-border)]">
          {isAnyFilterActive && onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              title="Reset all active filters"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 h-8 text-[11px] sm:text-xs font-semibold text-[var(--ui-danger)] bg-[var(--ui-danger-light)] hover:bg-[var(--ui-danger-border)] border border-[var(--ui-danger-border)] rounded-lg transition-colors cursor-pointer shrink-0"
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
          {onExportExcel && (
            <button
              type="button"
              onClick={handleExport}
              title={`Download ${actualPartyLabel} Return Excel Report`}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 h-8 text-[11px] sm:text-xs font-semibold text-[var(--ui-success-dark)] bg-[var(--ui-success-light)] hover:bg-[var(--ui-success-border)] border border-[var(--ui-success-border)] rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <FaFileExcel className="text-[var(--ui-success)] shrink-0" size={12} />
              <span>Excel</span>
            </button>
          )}
        </div>
      </TableToolbar>

      {/* Main Table Content */}
      <TableScroll>
        {isLoading ? (
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={8} />
        ) : returns.length === 0 ? (
          <EmptyState
            title={`No ${actualPartyLabel} Returns Found`}
            description={`There are no ${actualPartyLabel.toLowerCase()} return records matching your selected search or filters.`}
            buttonText={isAnyFilterActive && onResetFilters ? "Reset Filters" : undefined}
            onButtonClick={onResetFilters}
          />
        ) : (
          <Table>
            <TableHead>
              {isColVisible("sl") && <TableTh align="center" width={40}>SL</TableTh>}
              {isColVisible("orderId") && <TableTh className="whitespace-nowrap">Order ID</TableTh>}
              {isColVisible(partyType) && (
                <TableTh className="min-w-[120px]">
                  {renderSortHeader(actualPartyLabel, "party")}
                </TableTh>
              )}
              {isColVisible("returnDate") && <TableTh className="whitespace-nowrap">Return Date</TableTh>}
              {isColVisible("items") && <TableTh align="center" className="w-28 min-w-[96px] whitespace-nowrap">Items</TableTh>}
              {isColVisible("remarks") && <TableTh align="center" className="w-44 min-w-[150px] max-w-[180px]">Remarks</TableTh>}
              {isColVisible("paymentType") && <TableTh align="center" className="w-28 whitespace-nowrap">Payment Type</TableTh>}
              {isColVisible("refundAmount") && (
                <TableTh align="right" className="w-32 whitespace-nowrap">
                  <div className="flex justify-end">
                    {renderSortHeader("Refund Amount", "amount")}
                  </div>
                </TableTh>
              )}
              {isColVisible("status") && <TableTh align="center" className="w-28 whitespace-nowrap">Status</TableTh>}
              {isColVisible("actions") && <TableTh align="center" className="w-24 whitespace-nowrap">Actions</TableTh>}
            </TableHead>
            <TableBody>
              {returns.map((item, index) => {
                const isExpanded = expandedRowId === item.id;
                const sl = (currentPageNumber - 1) * dataLimit + index + 1;
                const refund = Number(item.refundAmount ?? item.grandTotal ?? item.totalAmount ?? 0);
                const pType = String(item.paymentType || "CASH").toUpperCase();

                // Payment badges
                const paymentBg = "bg-[var(--primary-color-muted)] text-[var(--primary-color-dark)] border-[var(--primary-color-muted)] font-semibold";

                // Return items count
                const details = Array.isArray(item.returnDetails)
                  ? item.returnDetails
                  : Array.isArray(item.purchaseReturnDetails)
                  ? item.purchaseReturnDetails
                  : Array.isArray(item.salesReturnDetails)
                  ? item.salesReturnDetails
                  : [];
                const itemsCount = details.length > 0 ? details.length : Number(item.itemsCount || 1);

                // Status badge styling
                const statusStr = String(item.status || "Completed").trim();
                const statusUpper = statusStr.toUpperCase();
                let statusBg = "bg-[var(--ui-success-border)] text-[var(--ui-success-dark)] border-[var(--ui-success-border)] font-semibold";
                if (statusUpper.includes("PENDING")) {
                  statusBg = "bg-[var(--ui-warning-border)] text-[var(--ui-warning-dark)] border-[var(--ui-warning-border)] font-semibold";
                } else if (statusUpper.includes("CANCEL") || statusUpper.includes("REJECT")) {
                  statusBg = "bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)] border-[var(--ui-danger-border)] font-semibold";
                } else if (statusUpper.includes("PARTIAL")) {
                  statusBg = "bg-[var(--primary-color-muted)] text-[var(--primary-color-dark)] border-[var(--primary-color-muted)] font-semibold";
                }

                const partyName = isCustomer
                  ? (item.customerName || "Walk-in Customer")
                  : (item.supplierName || "Direct Supplier");

                return (
                  <React.Fragment key={item.id}>
                    <tr className={`transition-colors group ${isExpanded ? "bg-sky-50/50" : "hover:bg-sky-50/40"}`}>
                      {/* SL */}
                      {isColVisible("sl") && (
                        <td className="py-2.5 px-3 text-center text-[var(--ui-text)] text-xs font-normal">
                          {sl}
                        </td>
                      )}

                      {/* Order ID */}
                      {isColVisible("orderId") && (
                        <td className="py-2.5 px-3 text-[var(--ui-text)] text-xs font-normal whitespace-nowrap">
                          <div className="flex items-center gap-1.5 group/ord">
                            <span
                              onClick={() => onView(item)}
                              title="Click to view voucher"
                              className="cursor-pointer hover:text-[var(--primary-color)] transition-colors"
                            >
                              {item.orderNo}
                            </span>
                            {item.orderNo && (
                              <button
                                type="button"
                                onClick={() => handleCopyOrderId(item.orderNo, item.id)}
                                title="Copy Order ID"
                                className="p-1 text-[var(--ui-text-subtle)] hover:text-[var(--primary-color)] transition-colors opacity-0 group-hover/ord:opacity-100 cursor-pointer"
                              >
                                {copiedId === item.id ? (
                                  <FiCheck className="text-[var(--ui-success)] text-xs" />
                                ) : (
                                  <FiCopy size={12} />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Party (Customer / Supplier) */}
                      {isColVisible(partyType) && (
                        <td className="py-2.5 px-3 text-[var(--ui-text)] text-xs font-normal min-w-[120px]">
                          <div className="truncate text-[var(--ui-text)] font-normal max-w-[150px]">
                            {partyName}
                          </div>
                        </td>
                      )}

                      {/* Return Date */}
                      {isColVisible("returnDate") && (
                        <td className="py-2.5 px-3 text-[var(--ui-text)] text-xs font-normal whitespace-nowrap">
                          <span className="flex items-center gap-1 text-[11px] text-[var(--ui-text)] font-normal">
                            {moment(item.returnDate || item.createdAt).format("DD MMM, YYYY")}
                          </span>
                        </td>
                      )}

                      {/* Items */}
                      {isColVisible("items") && (
                        <td className="py-2.5 px-3 text-center w-28 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleExpandRow(item.id)}
                            className="inline-flex items-center justify-center gap-1.5 px-2 py-0.5 bg-gray-100 hover:bg-sky-100 text-black rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap select-none"
                            title="Click to view returned products"
                          >
                            <span className="whitespace-nowrap">{itemsCount} {itemsCount === 1 ? "item" : "items"}</span>
                            <FiChevronDown
                              size={11}
                              className={`shrink-0 text-gray-500 transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        </td>
                      )}

                      {/* Remarks */}
                      {isColVisible("remarks") && (
                        <td className="py-2.5 px-3 text-center text-[var(--ui-text)] text-xs font-normal w-44 min-w-[150px] max-w-[180px]">
                          {item.note || item.remarks ? (
                            <div
                              className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)]/80 border border-[var(--ui-border)] text-[var(--ui-text)] text-xs font-normal max-w-[160px] transition-colors cursor-pointer"
                              title={item.note || item.remarks}
                              onClick={() => onView(item)}
                            >
                              <span className="truncate">{item.note || item.remarks}</span>
                            </div>
                          ) : (
                            <span className="text-[var(--ui-text)] font-normal">N/A</span>
                          )}
                        </td>
                      )}

                      {/* Payment Type */}
                      {isColVisible("paymentType") && (
                        <td className="py-2.5 px-3 text-center w-28 whitespace-nowrap">
                          <span className={`inline-block px-1.5 py-0.5 text-[10px] border rounded-md ${paymentBg}`}>
                            {pType}
                          </span>
                        </td>
                      )}

                      {/* Refund Amount */}
                      {isColVisible("refundAmount") && (
                        <td className="py-2.5 px-3 text-right text-[var(--ui-text)] text-xs font-normal w-32 whitespace-nowrap">
                          ৳ {formatMoney(refund)}
                        </td>
                      )}

                      {/* Status */}
                      {isColVisible("status") && (
                        <td className="py-2.5 px-3 text-center w-28 whitespace-nowrap">
                          <span className={`inline-block px-1.5 py-0.5 text-[10px] border rounded-md ${statusBg}`}>
                            {statusStr}
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      {isColVisible("actions") && (
                        <td className="py-2 px-3 text-center w-24 whitespace-nowrap">
                          <TableActionButtons
                            onView={() => onView(item)}
                            onPrint={() => onPrint(item)}
                            viewTitle="View Return Slip"
                            printTitle="Print Return Slip"
                          />
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
                                    {details.map((prod: any, pIdx: number) => {
                                      const pQty = Number(prod.quantity ?? prod.returnQuantity ?? 1);
                                      const pPrice = Number(prod.buyPrice ?? prod.sellPrice ?? prod.price ?? prod.unitPrice ?? 0);
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
                                          <td className="py-1.5 px-2 text-black text-[11px]">
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
                                                {reasonLabelFn(pReason)}
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
            </TableBody>
          </Table>
        )}
      </TableScroll>

      {/* Pagination Footer */}
      {!isLoading && (
        <TablePaginationFooter
          totalCount={totalCount}
          pageCount={pageCount}
          currentPageNumber={currentPageNumber}
          dataLimit={dataLimit}
          setDataLimit={setDataLimit}
          setCurrentPageNumber={setCurrentPageNumber}
          handlePagination={handlePagination}
          entityLabel={`${actualPartyLabel.toLowerCase()} returns`}
        />
      )}
    </TableContainer>
  );
}

export default TradeReturnTable;

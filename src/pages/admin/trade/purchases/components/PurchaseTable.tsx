import React, { useState, useRef, useEffect, useMemo } from "react";
import { FiEye, FiEdit, FiPrinter, FiChevronDown } from "react-icons/fi";
import moment from "moment";
import Search from "@/components/table-components/Search";
import DateRangePicker from "@/components/date-range-picker/DateRangePicker";
import EmptyState from "@/components/empty-state/EmptyState";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import Pagination from "@/components/pagination";
import ColumnVisibilityDropdown, { type ColumnItem } from "@/components/table-components/ColumnVisibilityDropdown";
import type { PurchaseItem, PartyItem } from "@/types";
import { FaPhone, FaCalendarAlt, FaSearch, FaFileExcel } from "react-icons/fa";
import { exportPurchasesToExcel } from "@/utils/excel-export";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import { formatMoney } from "@/utils/formatters";

interface PurchaseTableProps {
  purchases: PurchaseItem[];
  exportablePurchases?: PurchaseItem[];
  totalCount: number;
  isLoading?: boolean;
  isFetching?: boolean;
  pageCount: number;
  currentPageNumber: number;
  setCurrentPageNumber: React.Dispatch<React.SetStateAction<number>>;
  dataLimit: number;
  setDataLimit: React.Dispatch<React.SetStateAction<number>>;
  handlePagination: (paginationData: { selected: number }) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  paymentMethodFilter: string;
  setPaymentMethodFilter: (method: string) => void;
  supplierFilter: string;
  setSupplierFilter: (supplierId: string) => void;
  suppliersList?: PartyItem[];
  dateFilter?: string;
  setDateFilter?: (filter: string) => void;
  customStartDate?: string;
  setCustomStartDate?: (date: string) => void;
  customEndDate?: string;
  setCustomEndDate?: (date: string) => void;
  sortBy?: string;
  setSortBy?: (sort: string) => void;
  onEdit: (purchase: PurchaseItem) => void;
  onView: (purchase: PurchaseItem) => void;
  onPrint: (purchase: PurchaseItem) => void;
  onExport?: () => void;
}

const AVAILABLE_COLUMNS: ColumnItem[] = [
  { key: "sl", label: "SL" },
  { key: "supplier", label: "Supplier" },
  { key: "phone", label: "Phone" },
  { key: "date", label: "Date" },
  { key: "items", label: "Items" },
  { key: "total", label: "Total (৳)" },
  { key: "paid", label: "Paid (৳)" },
  { key: "due", label: "Due (৳)" },
  { key: "method", label: "Method" },
  { key: "status", label: "Payment Status" },
  { key: "actions", label: "Actions" },
];

export const PurchaseTable: React.FC<PurchaseTableProps> = ({
  purchases,
  exportablePurchases,
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
  statusFilter,
  setStatusFilter,
  paymentMethodFilter,
  setPaymentMethodFilter,
  supplierFilter,
  setSupplierFilter,
  suppliersList = [],
  dateFilter = "all",
  setDateFilter,
  customStartDate = "",
  setCustomStartDate,
  customEndDate = "",
  setCustomEndDate,
  sortBy = "latest",
  setSortBy,
  onEdit,
  onView,
  onPrint,
  onExport,
}) => {
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState<boolean>(false);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState<string>("");

  const supplierRef = useRef<HTMLDivElement>(null);

  const handleExport = () => {
    if (onExport) {
      onExport();
      return;
    }
    const dataToExport = exportablePurchases && exportablePurchases.length > 0 ? exportablePurchases : purchases;
    if (!dataToExport || dataToExport.length === 0) {
      showErrorToast("No purchase records available to export");
      return;
    }
    try {
      exportPurchasesToExcel(dataToExport);
      showSuccessToast(`Successfully exported ${dataToExport.length} purchases to Excel!`);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to export Excel file");
    }
  };

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
      const name = (s.name || "").toLowerCase();
      const phone = (s.phone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [suppliersList, supplierSearchQuery]);

  const selectedSupplierObj = supplierFilter
    ? suppliersList.find((s) => String(s.id ?? s.name ?? "") === String(supplierFilter)) || null
    : null;

  const currentSupplierLabel = selectedSupplierObj
    ? (selectedSupplierObj.name || "Supplier")
    : "All Suppliers";

  const statusOptions = [
    { value: "", label: "All Payment Status" },
    { value: "PAID", label: "Paid" },
    { value: "PARTIAL", label: "Partial" },
    { value: "DUE", label: "Due / Credit" },
  ];

  const methodOptions = [
    { value: "", label: "All Methods" },
    { value: "CASH", label: "Cash" },
    { value: "BANK", label: "Bank" },
    { value: "MFS", label: "MFS (bKash/Nagad)" },
    { value: "CREDIT", label: "Credit" },
  ];

  // Lightweight sort header component with small black chevron
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
  const availableColumns = AVAILABLE_COLUMNS;

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("purchase_table_columns");
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
        localStorage.setItem("purchase_table_columns", JSON.stringify(next));
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
      localStorage.removeItem("purchase_table_columns");
    } catch {}
  };

  const activeVisibleColumnCount = availableColumns.filter((c) => isColVisible(c.key)).length;

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 flex flex-col relative z-20 overflow-visible">
      {/* Search and Filters Bar - Fully Responsive Layout */}
      <div className="p-2 sm:p-2.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 relative z-40 overflow-visible">
        {/* Left Section: Compact Search Box + Filters Group */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Compact Search Box */}
          <div className="w-full sm:w-44 md:w-48 lg:w-52 shrink-0">
            <Search
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              setSearchQuery={setSearchQuery}
              placeholder="Search purchases..."
            />
          </div>

          {/* Date Filter Dropdown with Quick Filters + Start/End Date Inputs */}
          <div className="w-[calc(50%-4px)] sm:w-40 lg:w-44 shrink-0 z-50">
            <DateRangePicker
              startDate={customStartDate}
              endDate={customEndDate}
              selectedPreset={dateFilter}
              onPresetChange={(preset) => {
                if (setDateFilter) setDateFilter(preset);
                setCurrentPageNumber(1);
              }}
              onChange={({ startDate, endDate, label }) => {
                if (setCustomStartDate) setCustomStartDate(startDate);
                if (setCustomEndDate) setCustomEndDate(endDate);
                if (setDateFilter) setDateFilter(label || "custom");
                setCurrentPageNumber(1);
              }}
              size="sm"
            />
          </div>

          {/* Searchable Supplier Filter */}
          {suppliersList.length > 0 && (
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
                        setSupplierFilter("");
                        setIsSupplierDropdownOpen(false);
                        setSupplierSearchQuery("");
                        setCurrentPageNumber(1);
                      }}
                      className={`p-2 hover:bg-sky-50 cursor-pointer rounded-md transition-colors text-xs font-medium ${
                        !supplierFilter ? "bg-sky-50 text-[var(--color-primary)] font-semibold" : "text-black"
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
                            key={s.id ?? s.name}
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

          {/* Status Filter */}
          <div className="relative w-[calc(50%-4px)] sm:w-28 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPageNumber(1);
              }}
              className="w-full h-8 pl-2.5 pr-6 text-xs border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white text-black font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer appearance-none"
            >
              <option value="">All Status</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="DUE">Due / Credit</option>
            </select>
            <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-xs" size={13} />
          </div>

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
              <option value="">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
              <option value="MFS">MFS (bKash/Nagad)</option>
              <option value="CREDIT">Credit</option>
            </select>
            <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-xs" size={13} />
          </div>
        </div>

        {/* Right Actions: Column Visibility, Export */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          {/* Column Visibility Menu */}
          <ColumnVisibilityDropdown
            columns={availableColumns}
            visibleColumns={visibleColumns}
            onToggle={handleToggleColumn}
            onReset={handleResetColumns}
          />

            {/* Export to Excel Button */}
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
          ) : purchases.length === 0 ? (
            <EmptyState
              title="No Purchases Found"
              description="There are no purchase records matching your selected search or filters."
            />
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#41BEF3] text-black text-xs font-semibold">
                  {isColVisible("sl") && <th className="py-2.5 px-3 text-center w-10">SL</th>}
                  {isColVisible("supplier") && (
                    <th className="py-2.5 px-3">
                      <SortHeader label="Supplier" activeKey="supplier" />
                    </th>
                  )}
                  {isColVisible("phone") && <th className="py-2.5 px-3">Phone</th>}
                  {isColVisible("date") && <th className="py-2.5 px-3">Date</th>}
                  {isColVisible("items") && <th className="py-2.5 px-3 text-center">Items</th>}
                  {isColVisible("total") && (
                    <th className="py-2.5 px-3 text-right">
                      <div className="flex justify-end">
                        <SortHeader label="Total (৳)" activeKey="amount" />
                      </div>
                    </th>
                  )}
                  {isColVisible("paid") && <th className="py-2.5 px-3 text-right">Paid (৳)</th>}
                  {isColVisible("due") && <th className="py-2.5 px-3 text-right">Due (৳)</th>}
                  {isColVisible("method") && <th className="py-2.5 px-3 text-center">Method</th>}
                  {isColVisible("status") && <th className="py-2.5 px-3 text-center">Payment Status</th>}
                  {isColVisible("actions") && <th className="py-2.5 px-3 text-center w-28">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchases.map((purchase, index) => {
                  const serialNumber = (currentPageNumber - 1) * dataLimit + index + 1;
                  const itemsCount = Array.isArray(purchase.purchaseDetails) && purchase.purchaseDetails.length > 0
                    ? purchase.purchaseDetails.length
                    : 1;

                  const grandTotal = Number(purchase.grandTotal ?? 0);
                  const paidAmount = Number(purchase.paidAmount ?? 0);
                  const dueAmount = Number(purchase.dueAmount ?? 0);
                  const paymentType = (purchase.paymentType || "CASH").toUpperCase();

                  let statusBadge = "Paid";
                  let statusBg = "bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold";
                  if (dueAmount > 0 && paidAmount > 0) {
                    statusBadge = "Partial";
                    statusBg = "bg-amber-100 text-amber-800 border-amber-300 font-semibold";
                  } else if (dueAmount > 0 && paidAmount === 0) {
                    statusBadge = "Due";
                    statusBg = "bg-rose-100 text-rose-800 border-rose-300 font-semibold";
                  }

                  return (
                    <tr
                      key={purchase.id || purchase.invoiceNo || index}
                      className="hover:bg-sky-50/40 transition-colors group"
                    >
                      {/* SL */}
                      {isColVisible("sl") && (
                        <td className="py-2.5 px-3 text-center text-black text-xs font-normal">
                          {serialNumber}
                        </td>
                      )}

                      {/* Supplier */}
                      {isColVisible("supplier") && (
                        <td className="py-2.5 px-3 text-black text-xs font-normal whitespace-nowrap">
                          {purchase.supplierName || "Direct Supplier"}
                        </td>
                      )}

                      {/* Phone */}
                      {isColVisible("phone") && (
                        <td className="py-2.5 px-3 text-black text-xs font-normal whitespace-nowrap">
                          {purchase.supplierPhone || "-"}
                        </td>
                      )}

                      {/* Date */}
                      {isColVisible("date") && (
                        <td className="py-2.5 px-3 text-black text-xs font-normal whitespace-nowrap">
                          <span className="flex items-center gap-1 text-[11px] text-black font-normal">
                            {purchase.purchaseDate || (purchase.createdAt ? purchase.createdAt.substring(0, 10) : "N/A")}
                          </span>
                        </td>
                      )}

                      {/* Items */}
                      {isColVisible("items") && (
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-black rounded text-[11px] font-normal">
                            {itemsCount}
                          </span>
                        </td>
                      )}

                      {/* Grand Total */}
                      {isColVisible("total") && (
                        <td className="py-2.5 px-3 text-right text-black text-xs font-normal">
                          ৳ {formatMoney(grandTotal)}
                        </td>
                      )}

                      {/* Paid */}
                      {isColVisible("paid") && (
                        <td className="py-2.5 px-3 text-right text-black text-xs font-normal">
                          ৳ {formatMoney(paidAmount)}
                        </td>
                      )}

                      {/* Due */}
                      {isColVisible("due") && (
                        <td className="py-2.5 px-3 text-right text-black text-xs font-normal">
                          ৳ {formatMoney(dueAmount)}
                        </td>
                      )}

                      {/* Method */}
                      {isColVisible("method") && (
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-sky-100 text-sky-900 border border-sky-300 rounded-md">
                            {paymentType}
                          </span>
                        </td>
                      )}

                      {/* Status */}
                      {isColVisible("status") && (
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 text-[10px] border rounded-md ${statusBg}`}
                          >
                            {statusBadge}
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      {isColVisible("actions") && (
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onView(purchase)}
                              title="View Invoice"
                              className="p-1 rounded text-sky-600 hover:bg-sky-100 transition-colors cursor-pointer"
                            >
                              <FiEye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onPrint(purchase)}
                              title="Print Invoice"
                              className="p-1 rounded text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                              <FiPrinter size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEdit(purchase)}
                              title="Edit Purchase"
                              className="p-1 rounded text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer"
                            >
                              <FiEdit size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      {/* Pagination Footer */}
      {!isLoading && purchases.length > 0 && (
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
            <span>entries per page (Total {totalCount} purchases)</span>
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

export default PurchaseTable;

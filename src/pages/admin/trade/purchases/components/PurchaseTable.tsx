import React, { useState, useRef, useEffect, useMemo } from "react";
import { FiEye, FiEdit, FiPrinter, FiChevronDown } from "react-icons/fi";
import { BsFilterRight } from "react-icons/bs";
import moment from "moment";
import Search from "@/components/table-components/Search";
import DateRangePicker from "@/components/date-range-picker/DateRangePicker";
import EmptyState from "@/components/empty-state/EmptyState";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import Pagination from "@/components/pagination";
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
  const [isSortOpen, setIsSortOpen] = useState<boolean>(false);
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState<boolean>(false);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState<string>("");

  const sortRef = useRef<HTMLDivElement>(null);
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
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
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

  const selectedSupplierObj = useMemo(() => {
    if (!supplierFilter) return null;
    return suppliersList.find(
      (s) => String(s.id ?? s.partyId ?? s.name ?? "") === String(supplierFilter)
    );
  }, [suppliersList, supplierFilter]);

  const currentSupplierLabel = selectedSupplierObj
    ? (selectedSupplierObj.name || selectedSupplierObj.partyName || "Supplier")
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

  const sortOptions = [
    { value: "latest", label: "Latest Purchases" },
    { value: "amount_high_to_low", label: "Amount: High to Low" },
    { value: "amount_low_to_high", label: "Amount: Low to High" },
    { value: "supplier_a_to_z", label: "Supplier: A to Z" },
    { value: "supplier_z_to_a", label: "Supplier: Z to A" },
  ];

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
                      className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[var(--color-primary)] text-black"
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
                        const sVal = String(s.id ?? s.partyId ?? s.name ?? "");
                        const isSelected = supplierFilter === sVal;
                        const sName = s.name || s.partyName || "Supplier";
                        const sPhone = s.phone || s.partyPhone || "";

                        return (
                          <div
                            key={s.id ?? s.partyId ?? s.name}
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

        {/* Right Actions: Sort, Export */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          {/* Sort Menu */}
          <div className="relative shrink-0 z-50 flex-1 sm:flex-none" ref={sortRef}>
            <button
              type="button"
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="w-full sm:w-auto flex items-center justify-center gap-1 px-2.5 h-8 text-[11px] sm:text-xs font-medium text-black bg-gray-50/80 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              <BsFilterRight className="text-black text-sm shrink-0" />
              <span className="truncate">
                {sortBy === "latest" ? "Latest" : sortOptions.find((s) => s.value === sortBy)?.label || "Sort"}
              </span>
            </button>

            {isSortOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-2xl border border-gray-100 py-1 z-[99999]">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      if (setSortBy) setSortBy(opt.value);
                      setIsSortOpen(false);
                      setCurrentPageNumber(1);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                      sortBy === opt.value
                        ? "bg-sky-50 text-[var(--color-primary)] font-semibold"
                        : "text-black hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

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
          <TableSkeleton columnCount={11} rowCount={8} />
        ) : purchases.length === 0 ? (
          <EmptyState
            title="No Purchases Found"
            description="There are no purchase records matching your selected search or filters."
          />
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#41BEF3] text-black text-xs font-semibold">
                <th className="py-2.5 px-3 text-center w-10">SL</th>
                <th className="py-2.5 px-3">Supplier</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-center">Items</th>
                <th className="py-2.5 px-3 text-right">Total (৳)</th>
                <th className="py-2.5 px-3 text-right">Paid (৳)</th>
                <th className="py-2.5 px-3 text-right">Due (৳)</th>
                <th className="py-2.5 px-3 text-center">Method</th>
                <th className="py-2.5 px-3 text-center">Payment Status</th>
                <th className="py-2.5 px-3 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {purchases.map((purchase, index) => {
                const serialNumber = (currentPageNumber - 1) * dataLimit + index + 1;
                const p: any = purchase;
                const rawDetails =
                  p.purchaseDetails ||
                  p.purchasesDetails ||
                  p.purchase_details ||
                  p.details ||
                  p.items ||
                  p.products ||
                  p.purchaseListDetails ||
                  p.salesDetails ||
                  p.saleDetails ||
                  p.productList ||
                  p.productsList;

                let itemsCount = 1;
                if (Array.isArray(rawDetails) && rawDetails.length > 0) {
                  const uniqueKeys = new Set<string>();
                  rawDetails.forEach((d: any) => {
                    const k = String(d.productId ?? d.product_id ?? d.productCode ?? d.pcode ?? d.productName ?? d.name ?? "").trim().toLowerCase();
                    if (k) uniqueKeys.add(k);
                  });
                  itemsCount = uniqueKeys.size > 0 ? uniqueKeys.size : rawDetails.length;
                } else {
                  const explicitCount = Number(p.itemCount ?? p.item_count ?? p.totalItems ?? p.total_items ?? p.itemsCount ?? p.items_count ?? p.productCount ?? p.product_count ?? 0);
                  itemsCount = explicitCount > 0 ? explicitCount : 1;
                }

                const grandTotal = Number(purchase.grandTotal ?? purchase.totalAmount ?? 0);
                const paidAmount = Number(purchase.paidAmount ?? 0);
                const dueAmount = Number(purchase.dueAmount ?? Math.max(0, grandTotal - paidAmount));
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
                    key={purchase.id || purchase.purchaseId || purchase.invoiceNo || index}
                    className="hover:bg-sky-50/40 transition-colors group"
                  >
                    {/* SL */}
                    <td className="py-2.5 px-3 text-center text-black text-xs font-normal">
                      {serialNumber}
                    </td>

                    {/* Supplier */}
                    <td className="py-2.5 px-3 text-black text-xs font-normal whitespace-nowrap">
                      {purchase.supplierName || "Direct Supplier"}
                    </td>

                    {/* Phone */}
                    <td className="py-2.5 px-3 text-black text-xs font-normal whitespace-nowrap">
                      {purchase.supplierPhone || "-"}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 text-black text-xs font-normal whitespace-nowrap">
                      <span className="flex items-center gap-1 text-[11px] text-black font-normal">
                        {purchase.purchaseDate || (purchase.createdAt ? purchase.createdAt.substring(0, 10) : "N/A")}
                      </span>
                    </td>

                    {/* Items */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-black rounded text-[11px] font-normal">
                        {itemsCount}
                      </span>
                    </td>

                    {/* Grand Total */}
                    <td className="py-2.5 px-3 text-right text-black text-xs font-normal">
                      ৳ {formatMoney(grandTotal)}
                    </td>

                    {/* Paid */}
                    <td className="py-2.5 px-3 text-right text-black text-xs font-normal">
                      ৳ {formatMoney(paidAmount)}
                    </td>

                    {/* Due */}
                    <td className="py-2.5 px-3 text-right text-black text-xs font-normal">
                      ৳ {formatMoney(dueAmount)}
                    </td>

                    {/* Method */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-sky-100 text-sky-900 border border-sky-300 rounded-md">
                        {paymentType}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-1.5 py-0.5 text-[10px] border rounded-md ${statusBg}`}
                      >
                        {statusBadge}
                      </span>
                    </td>

                    {/* Actions */}
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

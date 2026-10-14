import React, { useState, useRef, useEffect, useMemo } from "react";
import { FiChevronDown } from "react-icons/fi";
import { BsFilterRight } from "react-icons/bs";
import moment from "moment";
import Search from "@/components/table-components/Search";
import DateRangePicker from "@/components/date-range-picker/DateRangePicker";
import EmptyState from "@/components/empty-state/EmptyState";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import Pagination from "@/components/pagination";
import type { PurchaseItem, PartyItem } from "@/types";
import { FaSearch, FaFileExcel } from "react-icons/fa";
import { exportPurchasesToExcel } from "@/utils/excel-export";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import { formatMoney } from "@/utils/formatters";

interface PurchaseReturnPurchaseTableProps {
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
  returnedInvoiceSet?: Set<string>;
  onReturn: (purchase: PurchaseItem) => void;
  onView?: (purchase: PurchaseItem) => void;
  onPrint?: (purchase: PurchaseItem) => void;
  onExport?: () => void;
}

export const PurchaseReturnPurchaseTable: React.FC<PurchaseReturnPurchaseTableProps> = ({
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
  returnedInvoiceSet,
  onReturn,
  onView,
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
      {/* Search and Filters Bar */}
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

          {/* Date Filter Dropdown */}
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
                              <span className="text-[10px] text-gray-400 ml-2 shrink-0">{sPhone}</span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-xs text-gray-400">No suppliers found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Status Dropdown */}
          <div className="w-[calc(50%-4px)] sm:w-32 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPageNumber(1);
              }}
              className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white text-black font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Dropdown */}
          <div className="w-[calc(50%-4px)] sm:w-28 shrink-0">
            <select
              value={paymentMethodFilter}
              onChange={(e) => {
                setPaymentMethodFilter(e.target.value);
                setCurrentPageNumber(1);
              }}
              className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white text-black font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              {methodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Section: Sort By Dropdown & Export Button */}
        <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
          {/* Custom Sort Dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="h-8 px-2.5 flex items-center gap-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white text-black font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer transition-colors shadow-2xs"
            >
              <BsFilterRight size={14} className="text-gray-500" />
              <span className="hidden md:inline">Sort:</span>
              <span className="font-semibold text-gray-800">
                {sortOptions.find((o) => o.value === sortBy)?.label.replace("Purchases", "").trim() || "Latest"}
              </span>
              <FiChevronDown size={12} className="text-gray-400 ml-0.5" />
            </button>

            {isSortOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      if (setSortBy) setSortBy(opt.value);
                      setIsSortOpen(false);
                      setCurrentPageNumber(1);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      sortBy === opt.value
                        ? "bg-sky-50 text-[var(--color-primary)] font-semibold"
                        : "text-black hover:bg-gray-50 font-normal"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {sortBy === opt.value && <span className="text-[10px]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export to Excel */}
          <button
            type="button"
            onClick={handleExport}
            className="h-8 px-2.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
            title="Export to Excel"
          >
            <FaFileExcel className="text-emerald-600 text-xs" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="overflow-x-auto w-full relative z-10">
        {isLoading ? (
          <TableSkeleton />
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
                <th className="py-2.5 px-3">Order No</th>
                <th className="py-2.5 px-3">Supplier</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-center">Items</th>
                <th className="py-2.5 px-3 text-right">Total (৳)</th>
                <th className="py-2.5 px-3 text-right">Paid (৳)</th>
                <th className="py-2.5 px-3 text-right">Due (৳)</th>
                <th className="py-2.5 px-3 text-center">Method</th>
                <th className="py-2.5 px-3 text-center">Payment Status</th>
                <th className="py-2.5 px-3 text-center w-36">Action</th>
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

                const isAlreadyReturned =
                  Boolean(
                    (purchase as any).hasReturn ||
                    (purchase as any).returnNo ||
                    (purchase as any).returnGrandTotal ||
                    String((purchase as any).returnType || "").toUpperCase() === "RETURN" ||
                    (Array.isArray((purchase as any).returnDetails) && (purchase as any).returnDetails.length > 0) ||
                    (Array.isArray((purchase as any).purchaseReturnDetails) && (purchase as any).purchaseReturnDetails.length > 0)
                  ) ||
                  (returnedInvoiceSet
                    ? returnedInvoiceSet.has(String(purchase.invoiceNo || "").trim().toLowerCase()) ||
                      returnedInvoiceSet.has(String((purchase as any).purchaseInvoiceNo || "").trim().toLowerCase()) ||
                      returnedInvoiceSet.has(String((purchase as any).orderNo || (purchase as any).order_no || "").trim().toLowerCase()) ||
                      returnedInvoiceSet.has(String((purchase as any).challanNo || (purchase as any).challan_no || "").trim().toLowerCase()) ||
                      returnedInvoiceSet.has(String(purchase.id || (purchase as any).purchaseId || "").trim().toLowerCase())
                    : false);

                return (
                  <tr
                    key={purchase.id || purchase.purchaseId || purchase.invoiceNo || index}
                    className="hover:bg-sky-50/40 transition-colors group"
                  >
                    {/* SL */}
                    <td className="py-2.5 px-3 text-center text-black text-xs font-normal">
                      {serialNumber}
                    </td>

                    {/* Order No */}
                    <td className="py-2.5 px-3 text-black text-xs font-normal whitespace-nowrap">
                      <span
                        onClick={() => onView && onView(purchase)}
                        className={`font-medium ${onView ? "cursor-pointer hover:text-sky-600 transition-colors" : "text-gray-800"}`}
                        title={onView ? "Click to view invoice" : undefined}
                      >
                        {purchase.orderNo || (purchase as any).order_no || purchase.invoiceNo || (purchase as any).invoice_no || (purchase as any).purchaseInvoiceNo || purchase.challanNo || (purchase as any).challan_no || (purchase.id ? `PO-${purchase.id}` : "-")}
                      </span>
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
                        {purchase.purchaseDate || (purchase as any).date || purchase.createdAt
                          ? moment(purchase.purchaseDate || (purchase as any).date || purchase.createdAt).format("DD MMM, YYYY")
                          : moment().format("DD MMM, YYYY")}
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
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        {isAlreadyReturned ? (
                          <span
                            title="This purchase order has already been returned"
                            className="inline-flex items-center gap-1.5 px-1.5 py-1 text-xs font-semibold text-rose-600 bg-gray-100 border border-gray-200 rounded-md cursor-not-allowed select-none"
                          >
                            <span>Returned</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onReturn(purchase)}
                            title="Return Product"
                            className="inline-flex items-center gap-1.5 px-1.5 py-1 text-xs text-white bg-[var(--color-primary)] rounded-md shadow-xs transition-all cursor-pointer"
                          >
                            <span>Return Product</span>
                          </button>
                        )}
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

export default PurchaseReturnPurchaseTable;

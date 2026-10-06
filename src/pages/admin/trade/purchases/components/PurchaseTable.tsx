import React, { useState, useRef, useEffect } from "react";
import { FiEye, FiEdit, FiPrinter } from "react-icons/fi";
import { BsFilterRight } from "react-icons/bs";
import Search from "@/components/table-components/Search";
import EmptyState from "@/components/empty-state/EmptyState";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import Pagination from "@/components/pagination";
import type { PurchaseItem, PartyItem } from "@/types";
import { FaPhone, FaCalendarAlt, FaSlidersH } from "react-icons/fa";

interface PurchaseTableProps {
  purchases: PurchaseItem[];
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
  sortBy?: string;
  setSortBy?: (sort: string) => void;
  onEdit: (purchase: PurchaseItem) => void;
  onView: (purchase: PurchaseItem) => void;
  onPrint: (purchase: PurchaseItem) => void;
  onOpenChallanSettings?: () => void;
}

export const PurchaseTable: React.FC<PurchaseTableProps> = ({
  purchases,
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
  sortBy = "latest",
  setSortBy,
  onEdit,
  onView,
  onPrint,
  onOpenChallanSettings,
}) => {
  const [isSortOpen, setIsSortOpen] = useState<boolean>(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatMoney = (amount: number | string | undefined) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

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

  const supplierOptions = [
    { value: "", label: "All Suppliers" },
    ...suppliersList.map((s) => ({
      value: String(s.id ?? s.partyId ?? s.party_id ?? s.name ?? ""),
      label: s.name || s.partyName || s.party_name || "Supplier",
    })),
  ];

  const sortOptions = [
    { value: "latest", label: "Latest Purchases" },
    { value: "amount_high_to_low", label: "Amount: High to Low" },
    { value: "amount_low_to_high", label: "Amount: Low to High" },
    { value: "supplier_a_to_z", label: "Supplier: A to Z" },
    { value: "supplier_z_to_a", label: "Supplier: Z to A" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden flex flex-col">
      {/* Search and Filters Bar */}
      <div className="p-2.5 sm:p-3 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 flex-wrap">
          {/* Search Box */}
          <div className="w-full sm:w-64">
            <Search
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              placeholder="Search invoice, supplier, phone..."
            />
          </div>

          {/* Supplier Filter */}
          {suppliersList.length > 0 && (
            <div className="w-full sm:w-44">
              <select
                value={supplierFilter}
                onChange={(e) => {
                  setSupplierFilter(e.target.value);
                  setCurrentPageNumber(1);
                }}
                className="w-full h-8 px-2.5 text-xs border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white text-black font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                <option value="">All Suppliers</option>
                {suppliersList.map((s) => (
                  <option key={s.id ?? s.partyId ?? s.name} value={String(s.id ?? s.partyId ?? s.name)}>
                    {s.name || s.partyName || "Supplier"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="w-full sm:w-36">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPageNumber(1);
              }}
              className="w-full h-8 px-2.5 text-xs border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white text-black font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value="">All Status</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="DUE">Due / Credit</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="w-full sm:w-36">
            <select
              value={paymentMethodFilter}
              onChange={(e) => {
                setPaymentMethodFilter(e.target.value);
                setCurrentPageNumber(1);
              }}
              className="w-full h-8 px-2.5 text-xs border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white text-black font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value="">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
              <option value="MFS">MFS (bKash/Nagad)</option>
              <option value="CREDIT">Credit</option>
            </select>
          </div>
        </div>

        {/* Right Sort & Settings Toolbar */}
        <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
          {onOpenChallanSettings && (
            <button
              type="button"
              onClick={onOpenChallanSettings}
              title="Challan Field Settings"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-black bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              <FaSlidersH className="text-black" size={12} />
              <span className="hidden sm:inline">Challan Settings</span>
            </button>
          )}

          {/* Sort Menu */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-black bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              <BsFilterRight className="text-black text-sm" />
              <span>Sort: {sortOptions.find((s) => s.value === sortBy)?.label || "Latest"}</span>
            </button>

            {isSortOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-30">
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
        </div>
      </div>

      {/* Main Table Content */}
      <div className="overflow-x-auto w-full">
        {isLoading ? (
          <TableSkeleton columnCount={9} rowCount={8} />
        ) : purchases.length === 0 ? (
          <EmptyState
            title="No Purchases Found"
            description="There are no purchase records matching your selected search or filters."
          />
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-black">
                <th className="py-2.5 px-3 text-center w-10">SL</th>
                <th className="py-2.5 px-3">Invoice No</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Supplier</th>
                <th className="py-2.5 px-3 text-center">Items</th>
                <th className="py-2.5 px-3 text-right">Total (৳)</th>
                <th className="py-2.5 px-3 text-right">Paid (৳)</th>
                <th className="py-2.5 px-3 text-right">Due (৳)</th>
                <th className="py-2.5 px-3 text-center">Method</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {purchases.map((purchase, index) => {
                const serialNumber = (currentPageNumber - 1) * dataLimit + index + 1;
                const itemsCount = purchase.purchaseDetails?.length || (purchase as any)?.itemCount || 1;
                const grandTotal = Number(purchase.grandTotal ?? purchase.totalAmount ?? 0);
                const paidAmount = Number(purchase.paidAmount ?? 0);
                const dueAmount = Number(purchase.dueAmount ?? Math.max(0, grandTotal - paidAmount));
                const paymentType = (purchase.paymentType || "CASH").toUpperCase();

                let statusBadge = "Paid";
                let statusBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
                if (dueAmount > 0 && paidAmount > 0) {
                  statusBadge = "Partial";
                  statusBg = "bg-amber-50 text-amber-700 border-amber-200";
                } else if (dueAmount > 0 && paidAmount === 0) {
                  statusBadge = "Due";
                  statusBg = "bg-rose-50 text-rose-700 border-rose-200";
                }

                return (
                  <tr
                    key={purchase.id || purchase.purchaseId || purchase.invoiceNo || index}
                    className="hover:bg-sky-50/40 transition-colors group"
                  >
                    {/* SL */}
                    <td className="py-2.5 px-3 text-center text-black text-[11px]">
                      {serialNumber}
                    </td>

                    {/* Invoice No */}
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => onView(purchase)}
                        className="font-medium text-black hover:text-[var(--color-primary)] cursor-pointer flex items-center gap-1"
                      >
                        {purchase.invoiceNo
                          ? purchase.invoiceNo.startsWith("-")
                            ? `PUR${purchase.invoiceNo}`
                            : purchase.invoiceNo
                          : `PUR-${purchase.id || index + 1}`}
                      </button>
                      {purchase.challanNo && (
                        <span className="text-[10px] text-black/70 block">
                          Ch: {purchase.challanNo}
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 text-black whitespace-nowrap">
                      <span className="flex items-center gap-1 text-[11px]">
                        {purchase.purchaseDate || (purchase.createdAt ? purchase.createdAt.substring(0, 10) : "N/A")}
                      </span>
                    </td>

                    {/* Supplier */}
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-black block truncate max-w-[170px]">
                        {purchase.supplierName || "Direct Supplier"}
                      </span>
                    </td>

                    {/* Items */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-black rounded text-[11px] font-medium">
                        {itemsCount}
                      </span>
                    </td>

                    {/* Grand Total */}
                    <td className="py-2.5 px-3 text-right font-semibold text-black">
                      ৳ {formatMoney(grandTotal)}
                    </td>

                    {/* Paid */}
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-700">
                      ৳ {formatMoney(paidAmount)}
                    </td>

                    {/* Due */}
                    <td
                      className={`py-2.5 px-3 text-right font-medium  ${
                        dueAmount > 0 ? "text-rose-700" : "text-black"
                      }`}
                    >
                      ৳ {formatMoney(dueAmount)}
                    </td>

                    {/* Method */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-sky-50 text-sky-800 border border-sky-200">
                        {paymentType}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBg}`}
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

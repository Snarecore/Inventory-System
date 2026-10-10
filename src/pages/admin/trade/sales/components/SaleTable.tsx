import React, { useState, useRef, useEffect, useMemo } from "react";
import { FiEye, FiEdit, FiPrinter, FiChevronDown } from "react-icons/fi";
import { BsFilterRight } from "react-icons/bs";
import moment from "moment";
import Search from "@/components/table-components/Search";
import DateRangePicker from "@/components/date-range-picker/DateRangePicker";
import EmptyState from "@/components/empty-state/EmptyState";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import Pagination from "@/components/pagination";
import type { SaleItem, PartyItem } from "@/types";
import { FaSearch, FaFileExcel } from "react-icons/fa";
import { exportSalesToExcel } from "@/utils/excel-export";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import { formatMoney } from "@/utils/formatters";

interface SaleTableProps {
  sales: SaleItem[];
  exportableSales?: SaleItem[];
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
  customerFilter: string;
  setCustomerFilter: (customerId: string) => void;
  customersList?: PartyItem[];
  dateFilter?: string;
  setDateFilter?: (filter: string) => void;
  customStartDate?: string;
  setCustomStartDate?: (date: string) => void;
  customEndDate?: string;
  setCustomEndDate?: (date: string) => void;
  sortBy?: string;
  setSortBy?: (sort: string) => void;
  onEdit: (sale: SaleItem) => void;
  onView: (sale: SaleItem) => void;
  onPrint: (sale: SaleItem) => void;
  onExport?: () => void;
}

export const SaleTable: React.FC<SaleTableProps> = ({
  sales,
  exportableSales,
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
  customerFilter,
  setCustomerFilter,
  customersList = [],
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
  onDelete,
  onExport,
}) => {
  const [isSortOpen, setIsSortOpen] = useState<boolean>(false);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>("");

  const sortRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);

  const handleExport = () => {
    if (onExport) {
      onExport();
      return;
    }
    const dataToExport = exportableSales && exportableSales.length > 0 ? exportableSales : sales;
    if (!dataToExport || dataToExport.length === 0) {
      showErrorToast("No sales records available to export");
      return;
    }
    try {
      exportSalesToExcel(dataToExport);
      showSuccessToast(`Successfully exported ${dataToExport.length} sales to Excel!`);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to export Excel file");
    }
  };

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
    if (!customerFilter) return null;
    return customersList.find(
      (c) => String(c.id ?? c.partyId ?? c.name ?? "") === String(customerFilter)
    );
  }, [customersList, customerFilter]);

  const currentCustomerLabel = selectedCustomerObj
    ? (selectedCustomerObj.name || selectedCustomerObj.partyName || "Customer")
    : "All Customers";

  const statusOptions = [
    { value: "", label: "All Status" },
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
    { value: "latest", label: "Latest Sales" },
    { value: "amount_high_to_low", label: "Amount: High to Low" },
    { value: "amount_low_to_high", label: "Amount: Low to High" },
    { value: "customer_a_to_z", label: "Customer: A to Z" },
    { value: "customer_z_to_a", label: "Customer: Z to A" },
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
              placeholder="Search sales..."
            />
          </div>

          {/* Date Range Picker */}
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

          {/* Searchable Customer Filter */}
          {customersList.length > 0 && (
            <div className="relative w-[calc(50%-4px)] sm:w-36 shrink-0 z-50" ref={customerRef}>
              <button
                type="button"
                onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                className="w-full h-8 px-2 flex items-center justify-between text-xs border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white text-black font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                <span className="truncate flex-1 text-left">{currentCustomerLabel}</span>
                <FiChevronDown className="text-gray-500 shrink-0 ml-1 text-xs" size={13} />
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
                      className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[var(--color-primary)] text-black"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                    <div
                      onClick={() => {
                        setCustomerFilter("");
                        setIsCustomerDropdownOpen(false);
                        setCustomerSearchQuery("");
                        setCurrentPageNumber(1);
                      }}
                      className={`p-2 hover:bg-sky-50 cursor-pointer rounded-md transition-colors text-xs font-medium ${
                        !customerFilter ? "bg-sky-50 text-[var(--color-primary)] font-semibold" : "text-black"
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
                              isSelected ? "bg-sky-50 text-[var(--color-primary)] font-semibold" : "text-black"
                            }`}
                          >
                            <span className="truncate">{cName}</span>
                            {cPhone && (
                              <span className="text-[10px] text-gray-500 shrink-0 ml-1">
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
        ) : sales.length === 0 ? (
          <EmptyState
            title="No Sales Found"
            description="There are no sales records matching your selected search or filters."
          />
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#41BEF3] text-black text-xs font-semibold">
                <th className="py-2.5 px-3 text-center w-10">SL</th>
                <th className="py-2.5 px-3">Customer</th>
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
              {sales.map((sale, index) => {
                const serialNumber = (currentPageNumber - 1) * dataLimit + index + 1;
                const s: any = sale;
                const rawDetails =
                  s.salesDetails ||
                  s.saleDetails ||
                  s.sales_details ||
                  s.details ||
                  s.items ||
                  s.products;

                let itemsCount = 1;
                if (Array.isArray(rawDetails) && rawDetails.length > 0) {
                  const uniqueKeys = new Set<string>();
                  rawDetails.forEach((d: any) => {
                    const k = String(d.productId ?? d.product_id ?? d.productCode ?? d.pcode ?? d.productName ?? d.name ?? "").trim().toLowerCase();
                    if (k) uniqueKeys.add(k);
                  });
                  itemsCount = uniqueKeys.size > 0 ? uniqueKeys.size : rawDetails.length;
                } else {
                  const explicitCount = Number(s.itemCount ?? s.item_count ?? s.totalItems ?? s.total_items ?? 0);
                  itemsCount = explicitCount > 0 ? explicitCount : 1;
                }

                const grandTotal = Number(sale.grandTotal ?? sale.grand_total ?? sale.totalAmount ?? 0);
                const paidAmount = Number(sale.paidAmount ?? sale.paid_amount ?? 0);
                const dueAmount = Number(sale.dueAmount ?? sale.due_amount ?? Math.max(0, grandTotal - paidAmount));
                const paymentType = (sale.paymentType || sale.payment_type || "CASH").toUpperCase();

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
                    key={sale.id || sale.saleId || sale.invoiceNo || index}
                    className="hover:bg-sky-50/40 transition-colors group"
                  >
                    {/* SL */}
                    <td className="py-2.5 px-3 text-center text-gray-700 font-semibold text-xs">
                      {serialNumber}
                    </td>

                    {/* Customer */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-black">
                        {sale.customerName || sale.customer_name || "Walk-in Customer"}
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-2.5 px-3 text-black font-medium">
                      {sale.customerPhone || sale.customer_phone ? (
                        <span>{sale.customerPhone || sale.customer_phone}</span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 text-black font-medium whitespace-nowrap">
                      <span>
                        {sale.salesDate || sale.saleDate || sale.date
                          ? moment(sale.salesDate || sale.saleDate || sale.date).format("DD MMM, YYYY")
                          : moment().format("DD MMM, YYYY")}
                      </span>
                    </td>

                    {/* Items Count */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-black">
                        {itemsCount}
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td className="py-2.5 px-3 text-right font-bold text-black whitespace-nowrap">
                      ৳ {formatMoney(grandTotal)}
                    </td>

                    {/* Paid Amount */}
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                      ৳ {formatMoney(paidAmount)}
                    </td>

                    {/* Due Amount */}
                    <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                      {dueAmount > 0 ? (
                        <span className="text-rose-600 font-bold">৳ {formatMoney(dueAmount)}</span>
                      ) : (
                        <span className="text-gray-400 font-medium">৳ 0</span>
                      )}
                    </td>

                    {/* Payment Method */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-gray-100 text-gray-800">
                        {paymentType}
                      </span>
                    </td>

                    {/* Payment Status */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBg}`}>
                        {statusBadge}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onView(sale)}
                          title="View Invoice"
                          className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-md transition-colors cursor-pointer"
                        >
                          <FiEye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(sale)}
                          title="Edit Sale"
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                        >
                          <FiEdit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onPrint(sale)}
                          title="Print Invoice"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
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
      {!isLoading && sales.length > 0 && (
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
            <span>entries per page (Total {totalCount} sales)</span>
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

export default SaleTable;

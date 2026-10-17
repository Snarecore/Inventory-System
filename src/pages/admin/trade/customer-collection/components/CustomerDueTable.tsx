import React, { useState, useMemo } from "react";
import { FiChevronDown } from "react-icons/fi";
import { FaFileExcel, FaHandHoldingUsd } from "react-icons/fa";
import * as XLSX from "xlsx";
import Search from "@/components/table-components/Search";
import Pagination from "@/components/pagination";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import EmptyState from "@/components/empty-state/EmptyState";
import { useDebounce } from "@/hooks/useDebounce";
import { formatMoney } from "@/utils/formatters";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type { CustomerDueItem } from "@/types/collection.types";

interface CustomerDueTableProps {
  customers: CustomerDueItem[];
  isLoading?: boolean;
  isFetching?: boolean;
  onRefresh?: () => void;
  onCollect: (customer: CustomerDueItem) => void;
}

export const CustomerDueTable: React.FC<CustomerDueTableProps> = ({
  customers,
  isLoading = false,
  onCollect,
}) => {
  // Search & Filters State
  const [searchInput, setSearchInput] = useState<string>("");
  const debouncedSearch = useDebounce(searchInput, 250);
  const [sortBy, setSortBy] = useState<string>("highest");

  // Pagination states matching Cash-Boi standards
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [dataLimit, setDataLimit] = useState<number>(10);

  // Filtered & Sorted Customer Data
  const processedCustomers = useMemo(() => {
    let list = [...customers];

    // 1. Text Search Filter
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter((c) => {
        const name = (c.customerName || "").toLowerCase();
        const phone = (c.customerPhone || "").toLowerCase();
        const id = String(c.customerId || "").toLowerCase();
        const addr = (c.customerAddress || "").toLowerCase();
        return name.includes(q) || phone.includes(q) || id.includes(q) || addr.includes(q);
      });
    }

    // 2. Sorting
    list.sort((a, b) => {
      const dueA = Number(a.totalDue || 0);
      const dueB = Number(b.totalDue || 0);
      const invA = Number(a.invoiceCount || 0);
      const invB = Number(b.invoiceCount || 0);
      const nameA = String(a.customerName || "").toLowerCase();
      const nameB = String(b.customerName || "").toLowerCase();

      switch (sortBy) {
        case "highest":
          return dueB - dueA;
        case "lowest":
          return dueA - dueB;
        case "name_asc":
          return nameA.localeCompare(nameB);
        case "name_desc":
          return nameB.localeCompare(nameA);
        case "invoices":
          return invB - invA;
        default:
          return dueB - dueA;
      }
    });

    return list;
  }, [customers, debouncedSearch, sortBy]);

  // Paginated Slice
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPageNumber - 1) * dataLimit;
    return processedCustomers.slice(startIndex, startIndex + dataLimit);
  }, [processedCustomers, currentPageNumber, dataLimit]);

  const totalCount = processedCustomers.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / dataLimit));

  const handlePagination = (paginationData: { selected: number }) => {
    setCurrentPageNumber(paginationData.selected + 1);
  };

  // Export to Excel handler
  const handleExport = () => {
    if (processedCustomers.length === 0) {
      showErrorToast("No customer records available to export");
      return;
    }
    try {
      const rows = processedCustomers.map((c, idx) => ({
        SL: idx + 1,
        "Customer ID": c.customerId || "N/A",
        "Customer Name": c.customerName || "N/A",
        Phone: c.customerPhone || "N/A",
        Address: c.customerAddress || "N/A",
        "Invoices Count": Number(c.invoiceCount || 0),
        "Total Due (৳)": Number(c.totalDue || 0),
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Customer Dues");

      const today = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `Customer_Dues_${today}.xlsx`);
      showSuccessToast(`Successfully exported ${rows.length} records to Excel!`);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to export Excel file");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 flex flex-col relative z-20 overflow-visible">
      {/* Search and Filters Bar - Matching Cash-Boi standard layout */}
      <div className="p-2 sm:p-2.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 relative z-40 overflow-visible">
        {/* Left Section: Compact Search Box + Filters Group */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Search Box */}
          <div className="w-full sm:w-44 md:w-48 lg:w-56 shrink-0">
            <Search
              searchQuery={searchInput}
              onSearchChange={(val) => {
                setSearchInput(val);
                setCurrentPageNumber(1);
              }}
              setSearchQuery={(val) => {
                setSearchInput(val);
                setCurrentPageNumber(1);
              }}
              placeholder="Search customer, phone..."
            />
          </div>

          {/* Sort By Filter */}
          <div className="relative w-[calc(50%-4px)] sm:w-36 shrink-0">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPageNumber(1);
              }}
              className="w-full h-8 pl-2.5 pr-6 text-xs border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white text-black font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer appearance-none"
            >
              <option value="highest">Highest Due First</option>
              <option value="lowest">Lowest Due First</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="invoices">Most Invoices</option>
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-xs"
              size={13}
            />
          </div>
        </div>

        {/* Right Section: Export to Excel Button */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
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
          <TableSkeleton columnCount={7} rowCount={8} />
        ) : processedCustomers.length === 0 ? (
          <EmptyState
            title="No Due Customers Found"
            description="There are no customer receivables matching your selected search or filters."
          />
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#41BEF3] text-black text-xs font-semibold">
                <th className="py-2.5 px-3 text-center w-10">SL</th>
                <th className="py-2.5 px-3">Customer Name</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">Address</th>
                <th className="py-2.5 px-3 text-center">Invoices</th>
                <th className="py-2.5 px-3 text-right">Total Due (৳)</th>
                <th className="py-2.5 px-3 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedCustomers.map((cust, index) => {
                const serialNumber = (currentPageNumber - 1) * dataLimit + index + 1;
                const dueAmount = Number(cust.totalDue || 0);

                return (
                  <tr
                    key={cust.customerId || index}
                    className="hover:bg-sky-50/40 transition-colors group"
                  >
                    {/* SL */}
                    <td className="py-2.5 px-3 text-center text-black text-xs font-normal">
                      {serialNumber}
                    </td>

                    {/* Customer Name */}
                    <td className="py-2.5 px-3 text-black text-xs font-semibold whitespace-nowrap">
                      {cust.customerName || "Customer"}
                    </td>

                    {/* Phone */}
                    <td className="py-2.5 px-3 text-black text-xs font-normal whitespace-nowrap">
                      {cust.customerPhone ? (
                        <a
                          href={`tel:${cust.customerPhone}`}
                          className="hover:text-[var(--color-primary)] transition-colors"
                        >
                          {cust.customerPhone}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Address */}
                    <td className="py-2.5 px-3 text-black text-xs font-normal truncate max-w-[200px]">
                      {cust.customerAddress || <span className="text-gray-400">-</span>}
                    </td>

                    {/* Invoices Count */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-black rounded text-[11px] font-normal">
                        {cust.invoiceCount || 0}
                      </span>
                    </td>

                    {/* Total Due */}
                    <td className="py-2.5 px-3 text-right text-rose-600 font-semibold text-xs whitespace-nowrap">
                      ৳ {formatMoney(dueAmount)}
                    </td>

                    {/* Action */}
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => onCollect(cust)}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] rounded-md shadow-xs transition-all cursor-pointer active:scale-95"
                        title={`Collect payment from ${cust.customerName}`}
                      >
                        <FaHandHoldingUsd size={12} />
                        <span>Collect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer - Exact Cash-Boi styling */}
      {!isLoading && processedCustomers.length > 0 && (
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
            <span>entries per page (Total {totalCount} customers)</span>
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

export default CustomerDueTable;

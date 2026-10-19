import React, { useState, useMemo } from "react";
import { FiChevronDown } from "react-icons/fi";
import { FaFileExcel, FaMoneyBillWave } from "react-icons/fa";
import * as XLSX from "xlsx";
import Search from "@/components/table-components/Search";
import Pagination from "@/components/pagination";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import EmptyState from "@/components/empty-state/EmptyState";
import ColumnVisibilityDropdown, { type ColumnItem } from "@/components/table-components/ColumnVisibilityDropdown";
import { useDebounce } from "@/hooks/useDebounce";
import { formatMoney } from "@/utils/formatters";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type { SupplierDueItem } from "@/types/payment.types";

interface SupplierDueTableProps {
  suppliers: SupplierDueItem[];
  isLoading?: boolean;
  isFetching?: boolean;
  onRefresh?: () => void;
  onPay: (supplier: SupplierDueItem) => void;
}

export const SupplierDueTable: React.FC<SupplierDueTableProps> = ({
  suppliers,
  isLoading = false,
  onPay,
}) => {
  // Search & Filters State
  const [searchInput, setSearchInput] = useState<string>("");
  const debouncedSearch = useDebounce(searchInput, 250);
  const [sortBy, setSortBy] = useState<string>("highest");

  // Pagination states matching Cash-Boi standards
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [dataLimit, setDataLimit] = useState<number>(10);

  // Column Visibility Configuration
  const availableColumns: ColumnItem[] = [
    { key: "sl", label: "SL" },
    { key: "supplierId", label: "Supplier ID" },
    { key: "name", label: "Supplier Name" },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "invoices", label: "Invoices" },
    { key: "due", label: "Total Due (৳)" },
    { key: "action", label: "Action" },
  ];

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("supplier_dues_columns");
      if (saved) return JSON.parse(saved);
    } catch {}
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
        localStorage.setItem("supplier_dues_columns", JSON.stringify(next));
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
      localStorage.removeItem("supplier_dues_columns");
    } catch {}
  };

  const activeVisibleColumnCount = availableColumns.filter((c) => isColVisible(c.key)).length;

  const SortHeader = ({
    label,
    activeKey,
  }: {
    label: string;
    activeKey: "name" | "due";
  }) => {
    const isAsc =
      sortBy === (activeKey === "name" ? "name_asc" : "lowest");

    const handleClick = () => {
      if (activeKey === "name") {
        setSortBy(isAsc ? "name_desc" : "name_asc");
      } else {
        setSortBy(isAsc ? "highest" : "lowest");
      }
    };

    return (
      <span
        onClick={handleClick}
        className="inline-flex items-center gap-1 cursor-pointer select-none hover:text-black transition-colors"
      >
        <span>{label}</span>
        <FiChevronDown
          size={13}
          className={`text-gray-900 stroke-[2.5] transition-transform duration-150 ${
            isAsc ? "rotate-180" : ""
          }`}
        />
      </span>
    );
  };

  // 1. In-memory Filter by search query (instant, zero network calls)
  const processedSuppliers = useMemo(() => {
    let list = [...suppliers];

    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase().trim();
      list = list.filter((sup) => {
        const id = String(sup.supplierId || sup.id || "").toLowerCase();
        const name = (sup.supplierName || "").toLowerCase();
        const phone = (sup.supplierPhone || "").toLowerCase();
        const address = (sup.supplierAddress || "").toLowerCase();
        return (
          id.includes(query) ||
          name.includes(query) ||
          phone.includes(query) ||
          address.includes(query)
        );
      });
    }

    // Sort order
    list.sort((a, b) => {
      const dueA = Number(a.totalDue ?? a.dueAmount ?? 0);
      const dueB = Number(b.totalDue ?? b.dueAmount ?? 0);
      const nameA = String(a.supplierName || "");
      const nameB = String(b.supplierName || "");
      const invA = Number(a.invoiceCount || 0);
      const invB = Number(b.invoiceCount || 0);

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
  }, [suppliers, debouncedSearch, sortBy]);

  // 2. Pagination Slices
  const totalCount = processedSuppliers.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / dataLimit));
  const startIndex = (currentPageNumber - 1) * dataLimit;
  const paginatedSuppliers = processedSuppliers.slice(startIndex, startIndex + dataLimit);

  const handlePagination = (paginationData: { selected: number }) => {
    setCurrentPageNumber(paginationData.selected + 1);
  };

  // 3. Export to Excel
  const handleExport = () => {
    if (processedSuppliers.length === 0) {
      showErrorToast("No supplier due records to export");
      return;
    }

    try {
      const rows = processedSuppliers.map((sup, idx) => ({
        SL: idx + 1,
        "Supplier ID": sup.supplierId || "N/A",
        "Supplier Name": sup.supplierName || "N/A",
        Phone: sup.supplierPhone || "N/A",
        Address: sup.supplierAddress || "N/A",
        "Pending Invoices": Number(sup.invoiceCount || 0),
        "Total Due (৳)": Number(sup.totalDue || 0),
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Supplier Dues");
      const today = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `Supplier_Dues_${today}.xlsx`);
      showSuccessToast(`Successfully exported ${rows.length} records to Excel!`);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to export Excel file");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 flex flex-col relative z-20 overflow-visible">
      {/* Search and Filters Bar - Matching Cash-Boi standard layout */}
      <div className="p-2 sm:p-2.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 relative z-40 overflow-visible">
        {/* Left Section: Compact Search Box */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="w-full sm:w-56 shrink-0">
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
              placeholder="Search supplier, ID, phone..."
            />
          </div>
        </div>

        {/* Right Section: Column Visibility & Export */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          <ColumnVisibilityDropdown
            columns={availableColumns}
            visibleColumns={visibleColumns}
            onToggle={handleToggleColumn}
            onReset={handleResetColumns}
          />

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
        ) : processedSuppliers.length === 0 ? (
          <EmptyState
            title="No Due Suppliers Found"
            description="There are no supplier dues matching your selected search or filters."
          />
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#41BEF3] text-black text-xs font-semibold whitespace-nowrap">
                {isColVisible("sl") && <th className="py-2.5 px-3 text-center w-10 whitespace-nowrap">SL</th>}
                {isColVisible("supplierId") && <th className="py-2.5 px-3 whitespace-nowrap">Supplier ID</th>}
                {isColVisible("name") && (
                  <th className="py-2.5 px-3 whitespace-nowrap">
                    <SortHeader label="Supplier Name" activeKey="name" />
                  </th>
                )}
                {isColVisible("phone") && <th className="py-2.5 px-3 whitespace-nowrap">Phone</th>}
                {isColVisible("address") && <th className="py-2.5 px-3 whitespace-nowrap">Address</th>}
                {isColVisible("invoices") && <th className="py-2.5 px-3 text-center whitespace-nowrap">Invoices</th>}
                {isColVisible("due") && (
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="flex justify-end">
                      <SortHeader label="Total Due (৳)" activeKey="due" />
                    </div>
                  </th>
                )}
                {isColVisible("action") && <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[110px]">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 whitespace-nowrap">
              {paginatedSuppliers.map((sup, index) => {
                const serialNumber = (currentPageNumber - 1) * dataLimit + index + 1;
                const dueAmount = Number(sup.totalDue || 0);

                return (
                  <tr
                    key={sup.supplierId || index}
                    className="hover:bg-sky-50/40 transition-colors group whitespace-nowrap"
                  >
                    {/* SL */}
                    {isColVisible("sl") && (
                      <td className="py-2.5 px-3 text-center text-black text-xs font-normal whitespace-nowrap">
                        {serialNumber}
                      </td>
                    )}

                    {/* Supplier ID */}
                    {isColVisible("supplierId") && (
                      <td className="py-2.5 px-3 text-black text-xs font-normal whitespace-nowrap">
                        {sup.supplierId || sup.id || "-"}
                      </td>
                    )}

                    {/* Supplier Name */}
                    {isColVisible("name") && (
                      <td className="py-2.5 px-3 text-black text-xs font-semibold whitespace-nowrap">
                        {sup.supplierName || "Supplier"}
                      </td>
                    )}

                    {/* Phone */}
                    {isColVisible("phone") && (
                      <td className="py-2.5 px-3 text-black text-xs font-normal whitespace-nowrap">
                        {sup.supplierPhone ? (
                          <a
                            href={`tel:${sup.supplierPhone}`}
                            className="hover:text-[var(--color-primary)] transition-colors whitespace-nowrap"
                          >
                            {sup.supplierPhone}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    )}

                    {/* Address */}
                    {isColVisible("address") && (
                      <td className="py-2.5 px-3 text-black text-xs font-normal truncate max-w-[200px] whitespace-nowrap">
                        {sup.supplierAddress || <span className="text-gray-400">-</span>}
                      </td>
                    )}

                    {/* Invoices Count */}
                    {isColVisible("invoices") && (
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-black rounded text-[11px] font-normal whitespace-nowrap">
                          {sup.invoiceCount || 0}
                        </span>
                      </td>
                    )}

                    {/* Total Due */}
                    {isColVisible("due") && (
                      <td className="py-2.5 px-3 text-right text-rose-600 font-semibold text-xs whitespace-nowrap">
                        ৳ {formatMoney(dueAmount)}
                      </td>
                    )}

                    {/* Action */}
                    {isColVisible("action") && (
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onPay(sup)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] rounded-md shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
                          title={`Make payment to ${sup.supplierName}`}
                        >
                          <FaMoneyBillWave size={12} className="shrink-0" />
                          <span className="whitespace-nowrap">Pay Now</span>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer - Exact Cash-Boi styling */}
      {!isLoading && processedSuppliers.length > 0 && (
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
            <span>entries per page (Total {totalCount} suppliers)</span>
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

export default SupplierDueTable;

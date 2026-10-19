import React, { useState, useMemo } from "react";
import { FiChevronDown } from "react-icons/fi";
import { FaFileExcel } from "react-icons/fa";
import * as XLSX from "xlsx";
import Search from "@/components/table-components/Search";
import Pagination from "@/components/pagination";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import EmptyState from "@/components/empty-state/EmptyState";
import ColumnVisibilityDropdown, { type ColumnItem } from "@/components/table-components/ColumnVisibilityDropdown";
import { useDebounce } from "@/hooks/useDebounce";
import { formatMoney } from "@/utils/formatters";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";

export interface GenericTradePartyDue {
  id?: string | number;
  partyId?: string | number;
  customerId?: string | number;
  supplierId?: string | number;
  name?: string;
  customerName?: string;
  supplierName?: string;
  phone?: string;
  customerPhone?: string;
  supplierPhone?: string;
  address?: string;
  customerAddress?: string;
  supplierAddress?: string;
  invoicesCount?: number;
  invoiceCount?: number;
  totalDue?: number;
  [key: string]: any;
}

export interface TradePartyDueTableProps<T extends GenericTradePartyDue> {
  parties: T[];
  partyType: "customer" | "supplier";
  isLoading?: boolean;
  onAction: (party: T) => void;
  actionLabel: string;
  actionIcon: React.ReactNode;
  storageKey: string;
  showIdColumn?: boolean;
  excelFileName?: string;
}

export const TradePartyDueTable = <T extends GenericTradePartyDue>({
  parties,
  partyType,
  isLoading = false,
  onAction,
  actionLabel,
  actionIcon,
  storageKey,
  showIdColumn = false,
  excelFileName,
}: TradePartyDueTableProps<T>) => {
  const isCustomer = partyType === "customer";
  const partyTitle = isCustomer ? "Customer" : "Supplier";

  // Search & Filter State
  const [searchInput, setSearchInput] = useState<string>("");
  const debouncedSearch = useDebounce(searchInput, 250);
  const [sortBy, setSortBy] = useState<string>("highest");

  // Pagination states
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [dataLimit, setDataLimit] = useState<number>(10);

  // Column Visibility Configuration
  const availableColumns: ColumnItem[] = useMemo(() => {
    const cols: ColumnItem[] = [{ key: "sl", label: "SL" }];
    if (showIdColumn) {
      cols.push({ key: "partyId", label: `${partyTitle} ID` });
    }
    cols.push(
      { key: "name", label: `${partyTitle} Name` },
      { key: "phone", label: "Phone" },
      { key: "address", label: "Address" },
      { key: "invoices", label: "Invoices" },
      { key: "due", label: "Total Due (৳)" },
      { key: "action", label: "Action" }
    );
    return cols;
  }, [showIdColumn, partyTitle]);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
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
        localStorage.setItem(storageKey, JSON.stringify(next));
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
      localStorage.removeItem(storageKey);
    } catch {}
  };

  const activeVisibleColumnCount = availableColumns.filter((c) => isColVisible(c.key)).length;

  // Sort Header
  const SortHeader = ({
    label,
    activeKey,
  }: {
    label: string;
    activeKey: "name" | "due";
  }) => {
    const isAsc = sortBy === (activeKey === "name" ? "name_asc" : "lowest");

    const handleClick = () => {
      if (activeKey === "name") {
        setSortBy(sortBy === "name_asc" ? "name_desc" : sortBy === "name_desc" ? "highest" : "name_asc");
      } else {
        setSortBy(sortBy === "highest" ? "lowest" : "highest");
      }
      setCurrentPageNumber(1);
    };

    return (
      <span
        onClick={handleClick}
        className="inline-flex items-center gap-1 select-none text-black cursor-pointer hover:opacity-80 transition-opacity"
      >
        <span>{label}</span>
        <FiChevronDown
          size={12}
          className={`text-black transition-transform duration-150 ${isAsc ? "rotate-180" : ""}`}
        />
      </span>
    );
  };

  // Helper resolvers
  const getPartyName = (p: T) => p.name || p.customerName || p.supplierName || partyTitle;
  const getPartyPhone = (p: T) => p.phone || p.customerPhone || p.supplierPhone || "";
  const getPartyAddress = (p: T) => p.address || p.customerAddress || p.supplierAddress || "";
  const getPartyId = (p: T) => p.partyId || (isCustomer ? p.customerId : p.supplierId) || p.id || "";
  const getInvoiceCount = (p: T) => Number(p.invoicesCount ?? p.invoiceCount ?? 0);
  const getDueAmount = (p: T) => Number(p.totalDue ?? p.dueAmount ?? 0);

  // Filter & Sorting
  const processedParties = useMemo(() => {
    let list = [...parties];

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter((p) => {
        const name = getPartyName(p).toLowerCase();
        const phone = getPartyPhone(p).toLowerCase();
        const id = String(getPartyId(p)).toLowerCase();
        const addr = getPartyAddress(p).toLowerCase();
        return name.includes(q) || phone.includes(q) || id.includes(q) || addr.includes(q);
      });
    }

    list.sort((a, b) => {
      const dueA = getDueAmount(a);
      const dueB = getDueAmount(b);
      const invA = getInvoiceCount(a);
      const invB = getInvoiceCount(b);
      const nameA = getPartyName(a).toLowerCase();
      const nameB = getPartyName(b).toLowerCase();

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
  }, [parties, debouncedSearch, sortBy]);

  // Paginated Slice
  const startIndex = (currentPageNumber - 1) * dataLimit;
  const paginatedParties = processedParties.slice(startIndex, startIndex + dataLimit);
  const totalCount = processedParties.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / dataLimit));

  const handlePagination = (paginationData: { selected: number }) => {
    setCurrentPageNumber(paginationData.selected + 1);
  };

  // Excel Export
  const handleExport = () => {
    if (processedParties.length === 0) {
      showErrorToast(`No ${partyTitle.toLowerCase()} records available to export`);
      return;
    }
    try {
      const rows = processedParties.map((p, idx) => {
        const item: Record<string, any> = {
          SL: idx + 1,
        };
        if (showIdColumn) {
          item[`${partyTitle} ID`] = getPartyId(p) || "N/A";
        }
        item[`${partyTitle} Name`] = getPartyName(p) || "N/A";
        item["Phone"] = getPartyPhone(p) || "N/A";
        item["Address"] = getPartyAddress(p) || "N/A";
        item["Invoices Count"] = getInvoiceCount(p);
        item["Total Due (৳)"] = getDueAmount(p);
        return item;
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `${partyTitle} Dues`);

      const today = new Date().toISOString().split("T")[0];
      const fname = excelFileName || `${partyTitle}_Dues_${today}.xlsx`;
      XLSX.writeFile(workbook, fname);
      showSuccessToast(`Successfully exported ${rows.length} records to Excel!`);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to export Excel file");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 flex flex-col relative z-20 overflow-visible">
      {/* Search and Filters Bar */}
      <div className="p-2 sm:p-2.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 relative z-40 overflow-visible">
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
              placeholder={`Search ${partyTitle.toLowerCase()}, phone...`}
            />
          </div>
        </div>

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
        ) : processedParties.length === 0 ? (
          <EmptyState
            title={`No Due ${partyTitle}s Found`}
            description={`There are no ${partyTitle.toLowerCase()} receivables matching your selected search or filters.`}
          />
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#41BEF3] text-black text-xs font-semibold">
                {isColVisible("sl") && <th className="py-2.5 px-3 text-center w-10 whitespace-nowrap">SL</th>}
                {showIdColumn && isColVisible("partyId") && (
                  <th className="py-2.5 px-3 whitespace-nowrap">{partyTitle} ID</th>
                )}
                {isColVisible("name") && (
                  <th className="py-2.5 px-3 whitespace-nowrap">
                    <SortHeader label={`${partyTitle} Name`} activeKey="name" />
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
                {isColVisible("action") && (
                  <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[100px] w-28">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedParties.map((party, index) => {
                const serialNumber = (currentPageNumber - 1) * dataLimit + index + 1;
                const dueAmount = getDueAmount(party);
                const partyPhone = getPartyPhone(party);
                const partyAddress = getPartyAddress(party);
                const partyId = getPartyId(party);

                return (
                  <tr
                    key={String(partyId || index)}
                    className="hover:bg-sky-50/40 transition-colors group"
                  >
                    {/* SL */}
                    {isColVisible("sl") && (
                      <td className="py-2.5 px-3 text-center text-black text-xs font-normal">
                        {serialNumber}
                      </td>
                    )}

                    {/* Party ID */}
                    {showIdColumn && isColVisible("partyId") && (
                      <td className="py-2.5 px-3 text-black text-xs font-medium whitespace-nowrap">
                        {partyId ? `#${partyId}` : <span className="text-gray-400">-</span>}
                      </td>
                    )}

                    {/* Party Name */}
                    {isColVisible("name") && (
                      <td className="py-2.5 px-3 text-black text-xs font-semibold whitespace-nowrap">
                        {getPartyName(party)}
                      </td>
                    )}

                    {/* Phone */}
                    {isColVisible("phone") && (
                      <td className="py-2.5 px-3 text-black text-xs font-normal whitespace-nowrap">
                        {partyPhone ? (
                          <a
                            href={`tel:${partyPhone}`}
                            className="hover:text-[var(--color-primary)] transition-colors"
                          >
                            {partyPhone}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    )}

                    {/* Address */}
                    {isColVisible("address") && (
                      <td className="py-2.5 px-3 text-black text-xs font-normal truncate max-w-[200px]">
                        {partyAddress || <span className="text-gray-400">-</span>}
                      </td>
                    )}

                    {/* Invoices Count */}
                    {isColVisible("invoices") && (
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-black rounded text-[11px] font-normal">
                          {getInvoiceCount(party)}
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
                          onClick={() => onAction(party)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] rounded-md shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
                          title={`${actionLabel} ${getPartyName(party)}`}
                        >
                          {actionIcon}
                          <span className="whitespace-nowrap">{actionLabel}</span>
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

      {/* Pagination Footer */}
      {!isLoading && processedParties.length > 0 && (
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
            <span>
              entries per page (Total {totalCount} {partyTitle.toLowerCase()}s)
            </span>
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

export default TradePartyDueTable;

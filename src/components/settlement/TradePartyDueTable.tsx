import React, { useState, useMemo } from "react";
import { FiChevronDown } from "react-icons/fi";
import { FaFileExcel } from "react-icons/fa";
import * as XLSX from "xlsx";
import Search from "@/components/table-components/Search";
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
  TableSkeleton,
  EmptyState,
} from "@/components/common";
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

  // Sort Header render helper
  const renderSortHeader = (label: string, activeKey: "name" | "due") => {
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
        className="inline-flex items-center gap-1 select-none text-[var(--ui-text)] cursor-pointer hover:opacity-80 transition-opacity"
      >
        <span>{label}</span>
        <FiChevronDown
          size={12}
          className={`text-[var(--ui-text)] transition-transform duration-150 ${isAsc ? "rotate-180" : ""}`}
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
    <TableContainer>
      {/* Search and Filters Bar */}
      <TableToolbar>
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

        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--ui-border)]">
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
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 h-8 text-[11px] sm:text-xs font-semibold text-[var(--ui-success-dark)] bg-[var(--ui-success-light)] hover:bg-[var(--ui-success-border)] border border-[var(--ui-success-border)] rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <FaFileExcel className="text-[var(--ui-success)] shrink-0" size={12} />
            <span>Export</span>
          </button>
        </div>
      </TableToolbar>

      {/* Main Table Content */}
      <TableScroll>
        {isLoading ? (
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={8} />
        ) : processedParties.length === 0 ? (
          <EmptyState
            title={`No Due ${partyTitle}s Found`}
            description={`There are no ${partyTitle.toLowerCase()} receivables matching your selected search or filters.`}
          />
        ) : (
          <Table>
            <TableHead>
              {isColVisible("sl") && <TableTh align="center" width={40} className="whitespace-nowrap">SL</TableTh>}
              {showIdColumn && isColVisible("partyId") && (
                <TableTh className="whitespace-nowrap">{partyTitle} ID</TableTh>
              )}
              {isColVisible("name") && (
                <TableTh className="whitespace-nowrap">
                  {renderSortHeader(`${partyTitle} Name`, "name")}
                </TableTh>
              )}
              {isColVisible("phone") && <TableTh className="whitespace-nowrap">Phone</TableTh>}
              {isColVisible("address") && <TableTh className="whitespace-nowrap">Address</TableTh>}
              {isColVisible("invoices") && <TableTh align="center" className="whitespace-nowrap">Invoices</TableTh>}
              {isColVisible("due") && (
                <TableTh align="right" className="whitespace-nowrap">
                  <div className="flex justify-end">
                    {renderSortHeader("Total Due (৳)", "due")}
                  </div>
                </TableTh>
              )}
              {isColVisible("action") && (
                <TableTh align="center" className="whitespace-nowrap min-w-[100px] w-28">Action</TableTh>
              )}
            </TableHead>
            <TableBody>
              {paginatedParties.map((party, index) => {
                const serialNumber = (currentPageNumber - 1) * dataLimit + index + 1;
                const dueAmount = getDueAmount(party);
                const partyPhone = getPartyPhone(party);
                const partyAddress = getPartyAddress(party);
                const partyId = getPartyId(party);

                return (
                  <tr
                    key={String(partyId || index)}
                    className="hover:bg-[var(--primary-color-light)]/40 transition-colors group"
                  >
                    {/* SL */}
                    {isColVisible("sl") && (
                      <td className="py-2.5 px-3 text-center text-[var(--ui-text)] text-xs font-normal">
                        {serialNumber}
                      </td>
                    )}

                    {/* Party ID */}
                    {showIdColumn && isColVisible("partyId") && (
                      <td className="py-2.5 px-3 text-[var(--ui-text)] text-xs font-medium whitespace-nowrap">
                        {partyId ? partyId : <span className="text-[var(--ui-text-subtle)]">-</span>}
                      </td>
                    )}

                    {/* Party Name */}
                    {isColVisible("name") && (
                      <td className="py-2.5 px-3 text-[var(--ui-text)] text-xs font-semibold whitespace-nowrap">
                        {getPartyName(party)}
                      </td>
                    )}

                    {/* Phone */}
                    {isColVisible("phone") && (
                      <td className="py-2.5 px-3 text-[var(--ui-text)] text-xs font-normal whitespace-nowrap">
                        {partyPhone ? (
                          <a
                            href={`tel:${partyPhone}`}
                            className="hover:text-[var(--color-primary)] transition-colors"
                          >
                            {partyPhone}
                          </a>
                        ) : (
                          <span className="text-[var(--ui-text-subtle)]">-</span>
                        )}
                      </td>
                    )}

                    {/* Address */}
                    {isColVisible("address") && (
                      <td className="py-2.5 px-3 text-[var(--ui-text)] text-xs font-normal truncate max-w-[200px]">
                        {partyAddress || <span className="text-[var(--ui-text-subtle)]">-</span>}
                      </td>
                    )}

                    {/* Invoices Count */}
                    {isColVisible("invoices") && (
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-block px-1.5 py-0.5 bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] rounded text-[11px] font-normal">
                          {getInvoiceCount(party)}
                        </span>
                      </td>
                    )}

                    {/* Total Due */}
                    {isColVisible("due") && (
                      <td className="py-2.5 px-3 text-right text-[var(--ui-danger)] font-semibold text-xs whitespace-nowrap">
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
            </TableBody>
          </Table>
        )}
      </TableScroll>

      {/* Pagination Footer */}
      {!isLoading && processedParties.length > 0 && (
        <TablePaginationFooter
          totalCount={totalCount}
          pageCount={pageCount}
          currentPageNumber={currentPageNumber}
          dataLimit={dataLimit}
          setDataLimit={setDataLimit}
          setCurrentPageNumber={setCurrentPageNumber}
          handlePagination={handlePagination}
          entityLabel={`${partyTitle.toLowerCase()}s`}
        />
      )}
    </TableContainer>
  );
};

export default TradePartyDueTable;

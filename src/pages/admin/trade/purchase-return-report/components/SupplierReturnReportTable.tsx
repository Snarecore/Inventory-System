import React, { useMemo, useState } from "react";
import {
  FiChevronDown,
  FiChevronRight,
  FiRotateCcw,
  FiPackage,
  FiFileText,
  FiPrinter,
} from "react-icons/fi";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";
import Search from "@/components/table-components/Search";
import ReportDateRangeControl from "@/components/reports/ReportDateRangeControl";
import ReportExportButtons from "@/components/reports/ReportExportButtons";
import ColumnVisibilityDropdown, {
  type ColumnItem,
} from "@/components/table-components/ColumnVisibilityDropdown";
import {
  TableContainer,
  TableToolbar,
  TableScroll,
  Table,
  TableHead,
  TableTh,
  TableBody,
  TablePaginationFooter,
  TableSkeleton,
  EmptyState,
} from "@/components/common";
import { formatMoney } from "@/utils/formatters";
import { useDebounce } from "@/hooks/useDebounce";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import {
  useReportCompanyMeta,
  formatShortReportDate,
  type ReportDateFilterProps,
} from "@/utils/trade-report-helpers";
import type { PurchaseReturnItem } from "@/types";
import {
  type NormalizedPurchaseReturnRecord,
  type SupplierReturnSummary,
  aggregatePurchaseReturnSuppliers,
  aggregateSupplierReturnedProducts,
  exportSupplierPurchaseReturnSummaryExcel,
  downloadSupplierPurchaseReturnSummaryPdf,
  downloadSupplierDetailedReturnPdf,
  exportSupplierDetailedReturnExcel,
} from "../utils/purchase-return-report-helpers";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";

interface SupplierReturnReportTableProps extends ReportDateFilterProps {
  records: NormalizedPurchaseReturnRecord[];
  isLoading?: boolean;
  onPrint?: (item: PurchaseReturnItem) => void;
}

const AVAILABLE_COLUMNS: ColumnItem[] = [
  { key: "sl", label: "SL" },
  { key: "supplierName", label: "Supplier Name" },
  { key: "phone", label: "Phone" },
  { key: "returnCount", label: "Returns" },
  { key: "itemsCount", label: "Items" },
  { key: "cashRefund", label: "Cash/Bank Refund (৳)" },
  { key: "creditAdjust", label: "Due Adjusted (৳)" },
  { key: "totalRefund", label: "Total Refund (৳)" },
  { key: "lastReturnDate", label: "Last Return Date" },
  { key: "actions", label: "Details" },
];

export const SupplierReturnReportTable: React.FC<
  SupplierReturnReportTableProps
> = ({ records, isLoading, onPrint, ...dateFilterProps }) => {
  const companyMeta = useReportCompanyMeta(
    dateFilterProps.startDate,
    dateFilterProps.endDate
  );

  // Filter & Search states
  const [selectedSupplierKey, setSelectedSupplierKey] = useState<string>("ALL");
  const [expandedSupplierKeys, setExpandedSupplierKeys] = useState<Set<string>>(
    new Set()
  );
  const [expandedSupplierTabs, setExpandedSupplierTabs] = useState<
    Record<string, "products" | "vouchers">
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [sortBy, setSortBy] = useState<string>("amount_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isExporting, setIsExporting] = useState(false);

  const {
    visibleColumns,
    isColVisible,
    handleToggleColumn,
    handleResetColumns,
    activeVisibleColumnCount,
  } = useColumnVisibility(
    AVAILABLE_COLUMNS,
    "purchase_return_report_suppliers_columns"
  );

  const visibleTotalColumns = activeVisibleColumnCount + 1;

  // Group all records by supplier
  const suppliers = useMemo(
    () => aggregatePurchaseReturnSuppliers(records),
    [records]
  );

  // Toggle inline row expansion
  const toggleRowExpansion = (key: string) => {
    setExpandedSupplierKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const setExpandedTab = (
    supplierKey: string,
    tab: "products" | "vouchers"
  ) => {
    setExpandedSupplierTabs((prev) => ({
      ...prev,
      [supplierKey]: tab,
    }));
  };

  // Filtered supplier summary list
  const filteredSuppliers = useMemo(() => {
    let list = suppliers;

    if (selectedSupplierKey !== "ALL") {
      list = list.filter((s) => s.supplierKey === selectedSupplierKey);
    }

    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.supplierName.toLowerCase().includes(q) ||
          s.supplierPhone.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === "returns_desc") return b.returnCount - a.returnCount;
      if (sortBy === "name_asc")
        return a.supplierName.localeCompare(b.supplierName);
      return b.totalRefund - a.totalRefund;
    });
  }, [suppliers, selectedSupplierKey, debouncedSearch, sortBy]);

  const totalCount = filteredSuppliers.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const paginated = filteredSuppliers.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const totals = useMemo(() => {
    return filteredSuppliers.reduce(
      (acc, s) => {
        acc.sumReturns += s.returnCount;
        acc.sumItems += s.itemsCount;
        acc.sumCash += s.cashRefund;
        acc.sumCredit += s.creditAdjust;
        acc.sumTotal += s.totalRefund;
        return acc;
      },
      { sumReturns: 0, sumItems: 0, sumCash: 0, sumCredit: 0, sumTotal: 0 }
    );
  }, [filteredSuppliers]);

  const hasActiveFilter =
    selectedSupplierKey !== "ALL" ||
    searchQuery.trim() !== "" ||
    sortBy !== "amount_desc";

  const handleResetFilters = () => {
    setSelectedSupplierKey("ALL");
    setSearchQuery("");
    setSortBy("amount_desc");
    setCurrentPage(1);
  };

  // Single supplier detailed PDF download
  const handleDownloadSingleSupplierPdf = async (
    supplier: SupplierReturnSummary,
    tab: "products" | "vouchers" = "products"
  ) => {
    try {
      setIsExporting(true);
      await downloadSupplierDetailedReturnPdf(supplier, companyMeta, tab);
      showSuccessToast(
        `Downloaded ${supplier.supplierName}'s purchase return report PDF!`
      );
    } catch (err: any) {
      console.error(err);
      showErrorToast(
        err.message || "Failed to download supplier purchase return PDF"
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Single supplier detailed Excel export
  const handleExportSingleSupplierExcel = async (
    supplier: SupplierReturnSummary,
    tab: "products" | "vouchers" = "products"
  ) => {
    try {
      setIsExporting(true);
      await exportSupplierDetailedReturnExcel(supplier, companyMeta, tab);
      showSuccessToast(
        `Exported ${supplier.supplierName}'s purchase return report to Excel!`
      );
    } catch (err: any) {
      console.error(err);
      showErrorToast(
        err.message || "Failed to export supplier purchase return to Excel"
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <TableContainer>
      <TableToolbar>
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <ReportDateRangeControl
            {...dateFilterProps}
            onAfterChange={() => setCurrentPage(1)}
          />

          {/* Supplier Selector Dropdown */}
          <div className="relative shrink-0 max-w-[240px]">
            <select
              value={selectedSupplierKey}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSupplierKey(val);
                setSearchQuery("");
                setCurrentPage(1);
                if (val !== "ALL") {
                  setExpandedSupplierKeys((prev) => new Set([...prev, val]));
                }
              }}
              className="h-8 pl-2.5 pr-7 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg text-[var(--ui-text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] appearance-none cursor-pointer font-medium truncate"
            >
              <option value="ALL">All Suppliers (Summary)</option>
              {suppliers.map((s) => (
                <option key={s.supplierKey} value={s.supplierKey}>
                  {s.supplierName} ({s.returnCount} returns)
                </option>
              ))}
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)] pointer-events-none"
              size={12}
            />
          </div>

          <div className="w-full sm:w-56 shrink-0">
            <Search
              searchQuery={searchQuery}
              onSearchChange={(val) => {
                setSearchQuery(val);
                setCurrentPage(1);
              }}
              setSearchQuery={(val) => {
                setSearchQuery(val);
                setCurrentPage(1);
              }}
              placeholder="Search supplier name, phone..."
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 pl-2.5 pr-7 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg text-[var(--ui-text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] appearance-none cursor-pointer font-medium"
            >
              <option value="amount_desc">Highest Refund</option>
              <option value="returns_desc">Most Returns</option>
              <option value="name_asc">Supplier Name A–Z</option>
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)] pointer-events-none"
              size={12}
            />
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset all active filters"
              className="inline-flex items-center gap-1 px-2.5 h-8 text-xs font-semibold text-[var(--ui-danger)] bg-[var(--ui-danger-light)] hover:bg-[var(--ui-danger-border)] border border-[var(--ui-danger-border)] rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <FiRotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--ui-border)]">
          <ColumnVisibilityDropdown
            columns={AVAILABLE_COLUMNS}
            visibleColumns={visibleColumns}
            onToggle={handleToggleColumn}
            onReset={handleResetColumns}
          />

          <ReportExportButtons
            onExportExcel={async () => {
              const count = await exportSupplierPurchaseReturnSummaryExcel(
                filteredSuppliers,
                companyMeta,
                visibleColumns
              );
              return `Exported ${count} supplier return records to Excel!`;
            }}
            onDownloadPdf={async () => {
              await downloadSupplierPurchaseReturnSummaryPdf(
                filteredSuppliers,
                companyMeta,
                visibleColumns
              );
              return "Supplier purchase return report PDF downloaded!";
            }}
          />
        </div>
      </TableToolbar>

      <TableScroll>
        {isLoading && records.length === 0 ? (
          <TableSkeleton columnCount={visibleTotalColumns} rowCount={6} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title="No Supplier Return Records Found"
            description="No supplier purchase returns match your selected filters or date range."
            buttonText={hasActiveFilter ? "Reset Filters" : undefined}
            onButtonClick={hasActiveFilter ? handleResetFilters : undefined}
          />
        ) : (
          <Table>
            <TableHead>
              <TableTh align="center" width={32} className="whitespace-nowrap">
                {/* Chevron expand */}
              </TableTh>
              {isColVisible("sl") && (
                <TableTh align="center" width={42} className="whitespace-nowrap">
                  SL
                </TableTh>
              )}
              {isColVisible("supplierName") && (
                <TableTh className="whitespace-nowrap">Supplier Name</TableTh>
              )}
              {isColVisible("phone") && (
                <TableTh className="whitespace-nowrap">Phone</TableTh>
              )}
              {isColVisible("returnCount") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Returns
                </TableTh>
              )}
              {isColVisible("itemsCount") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Items
                </TableTh>
              )}
              {isColVisible("cashRefund") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Cash/Bank Refund (৳)
                </TableTh>
              )}
              {isColVisible("creditAdjust") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Due Adjusted (৳)
                </TableTh>
              )}
              {isColVisible("totalRefund") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Total Refund (৳)
                </TableTh>
              )}
              {isColVisible("lastReturnDate") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Last Return Date
                </TableTh>
              )}
              {isColVisible("actions") && (
                <TableTh align="center" width={80} className="whitespace-nowrap">
                  Details
                </TableTh>
              )}
            </TableHead>

            <TableBody>
              {paginated.map((s, index) => {
                const slNumber = (safePage - 1) * pageSize + index + 1;
                const isExpanded = expandedSupplierKeys.has(s.supplierKey);
                const activeTabForSupplier =
                  expandedSupplierTabs[s.supplierKey] || "products";
                const supplierProducts = aggregateSupplierReturnedProducts(
                  s.records || []
                );

                return (
                  <React.Fragment key={`${s.supplierKey}_${index}`}>
                    <tr
                      className={`hover:bg-[var(--primary-color-light)]/40 transition-colors ${
                        isExpanded ? "bg-slate-50/70 dark:bg-slate-900/30" : ""
                      }`}
                    >
                      {/* Chevron Expand Toggle */}
                      <td className="py-2.5 px-2 text-center text-xs">
                        <button
                          type="button"
                          onClick={() => toggleRowExpansion(s.supplierKey)}
                          className="p-1 rounded-md text-[var(--ui-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--primary-color-light)] transition-colors cursor-pointer"
                          title={
                            isExpanded
                              ? "Collapse returned products & vouchers"
                              : "Expand returned products & vouchers"
                          }
                        >
                          <FiChevronRight
                            size={14}
                            className={`transition-transform duration-200 ${
                              isExpanded ? "rotate-90 text-[var(--color-primary)]" : ""
                            }`}
                          />
                        </button>
                      </td>

                      {isColVisible("sl") && (
                        <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                          {slNumber}
                        </td>
                      )}

                      {isColVisible("supplierName") && (
                        <td className="py-2.5 px-3 text-left font-semibold text-xs text-[var(--ui-text)]">
                          <button
                            type="button"
                            onClick={() => toggleRowExpansion(s.supplierKey)}
                            className="font-semibold text-xs text-left hover:text-[var(--color-primary)] hover:underline cursor-pointer"
                            title="Click to view detailed returned products table"
                          >
                            {s.supplierName}
                          </button>
                        </td>
                      )}

                      {isColVisible("phone") && (
                        <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                          {s.supplierPhone || "-"}
                        </td>
                      )}

                      {isColVisible("returnCount") && (
                        <td className="py-2.5 px-3 text-center font-bold text-xs text-[var(--color-primary)]">
                          {s.returnCount}
                        </td>
                      )}

                      {isColVisible("itemsCount") && (
                        <td className="py-2.5 px-3 text-center font-medium text-xs">
                          {s.itemsCount}
                        </td>
                      )}

                      {isColVisible("cashRefund") && (
                        <td className="py-2.5 px-3 text-right font-medium text-xs text-emerald-600 dark:text-emerald-400">
                          ৳ {formatMoney(s.cashRefund)}
                        </td>
                      )}

                      {isColVisible("creditAdjust") && (
                        <td className="py-2.5 px-3 text-right font-medium text-xs text-amber-600 dark:text-amber-400">
                          ৳ {formatMoney(s.creditAdjust)}
                        </td>
                      )}

                      {isColVisible("totalRefund") && (
                        <td className="py-2.5 px-3 text-right font-bold text-xs text-rose-600 dark:text-rose-400">
                          ৳ {formatMoney(s.totalRefund)}
                        </td>
                      )}

                      {isColVisible("lastReturnDate") && (
                        <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                          {formatShortReportDate(s.lastReturnDate)}
                        </td>
                      )}

                      {isColVisible("actions") && (
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleRowExpansion(s.supplierKey)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                                isExpanded
                                  ? "bg-[var(--primary-color)] text-white shadow-xs"
                                  : "text-[var(--color-primary)] bg-[var(--primary-color-light)]/60 hover:bg-[var(--primary-color)] hover:text-white"
                              }`}
                              title="Toggle returned products & vouchers breakdown"
                            >
                              <span>{isExpanded ? "Close" : "Details"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadSingleSupplierPdf(
                                  s,
                                  activeTabForSupplier
                                )
                              }
                              disabled={isExporting}
                              className="p-1 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title={`Download ${s.supplierName}'s purchase return report PDF`}
                            >
                              <FaFilePdf size={11} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Inline Expandable Full Supplier Details */}
                    {isExpanded && (
                      <tr className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-[var(--ui-border)]">
                        <td colSpan={visibleTotalColumns} className="p-0 sm:px-1 py-1.5">
                          <div className="w-full flex flex-col gap-2.5 bg-[var(--ui-surface)] p-2 sm:p-2.5 rounded-lg border border-[var(--ui-border)] shadow-xs">
                            {/* Header of expanded supplier return section with Supplier Name */}
                            <div className="w-full flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ui-border)] pb-2 px-1">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-[var(--primary-color)]/10 text-[var(--primary-color)] flex items-center justify-center font-bold text-xs">
                                  <FiRotateCcw size={11} />
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-[var(--ui-text)]">
                                    Purchase Returns for{" "}
                                    <span className="text-[var(--primary-color)]">
                                      {s.supplierName}
                                    </span>
                                  </span>
                                  <span className="text-[11px] text-[var(--ui-text-muted)] ml-2 font-medium">
                                    ({supplierProducts.length} Products | {s.returnCount} Vouchers)
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Sub-Tabs: Returned Products vs Return Vouchers */}
                                <div className="flex items-center gap-1 bg-[var(--ui-surface-muted)]/60 p-0.5 rounded-lg border border-[var(--ui-border)]">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedTab(s.supplierKey, "products")
                                    }
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                      activeTabForSupplier === "products"
                                        ? "bg-[var(--primary-color)] text-white shadow-xs"
                                        : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
                                    }`}
                                  >
                                    <FiPackage size={12} />
                                    <span>
                                      Returned Products ({supplierProducts.length})
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedTab(s.supplierKey, "vouchers")
                                    }
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                      activeTabForSupplier === "vouchers"
                                        ? "bg-[var(--primary-color)] text-white shadow-xs"
                                        : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
                                    }`}
                                  >
                                    <FiFileText size={12} />
                                    <span>
                                      Return Vouchers ({s.returnCount})
                                    </span>
                                  </button>
                                </div>

                                {/* Action Download Buttons for active tab */}
                                <div className="flex items-center gap-1 border-l border-[var(--ui-border)] pl-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDownloadSingleSupplierPdf(
                                        s,
                                        activeTabForSupplier
                                      )
                                    }
                                    disabled={isExporting}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-md transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                                    title="Download PDF Report"
                                  >
                                    <FaFilePdf
                                      size={11}
                                      className="text-rose-600"
                                    />
                                    <span>PDF</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleExportSingleSupplierExcel(
                                        s,
                                        activeTabForSupplier
                                      )
                                    }
                                    disabled={isExporting}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-md transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                                    title="Download Excel Report"
                                  >
                                    <FaFileExcel
                                      size={11}
                                      className="text-emerald-600"
                                    />
                                    <span>Excel</span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* TAB 1: Returned Products Table (Row by Row) */}
                            {activeTabForSupplier === "products" && (
                              <div className="w-full overflow-x-auto rounded-lg border border-[var(--ui-border)]">
                                <Table>
                                  <TableHead>
                                    <TableTh align="center" width={48} className="whitespace-nowrap">
                                      SL
                                    </TableTh>
                                    <TableTh className="whitespace-nowrap">
                                      Product
                                    </TableTh>
                                    <TableTh align="center" width={80} className="whitespace-nowrap">
                                      Unit
                                    </TableTh>
                                    <TableTh align="center" width={110} className="whitespace-nowrap">
                                      Returned Qty
                                    </TableTh>
                                    <TableTh align="right" width={140} className="whitespace-nowrap">
                                      Unit Price (৳)
                                    </TableTh>
                                    <TableTh align="right" width={140} className="whitespace-nowrap">
                                      Total Refund (৳)
                                    </TableTh>
                                    <TableTh className="whitespace-nowrap">
                                      Reason
                                    </TableTh>
                                    <TableTh align="center" width={90} className="whitespace-nowrap">
                                      Vouchers
                                    </TableTh>
                                  </TableHead>
                                  <TableBody>
                                    {supplierProducts.length > 0 ? (
                                      supplierProducts.map((p, pIdx) => {
                                        const unitPrice =
                                          p.totalQuantity > 0
                                            ? p.totalAmount / p.totalQuantity
                                            : p.unitPrice;
                                        return (
                                          <tr
                                            key={p.productKey || pIdx}
                                            className="hover:bg-[var(--primary-color-light)]/20 transition-colors"
                                          >
                                            <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text-muted)] tabular-nums">
                                              {pIdx + 1}
                                            </td>
                                            <td className="py-2.5 px-3 text-xs font-bold text-[var(--ui-text)]">
                                              {p.productName}
                                            </td>
                                            <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                                              {p.unit}
                                            </td>
                                            <td className="py-2.5 px-3 text-center text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                                              {p.totalQuantity}
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-xs text-[var(--ui-text)] tabular-nums whitespace-nowrap">
                                              ৳ {formatMoney(unitPrice)}
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-xs font-bold text-[var(--ui-danger)] tabular-nums whitespace-nowrap">
                                              ৳ {formatMoney(p.totalAmount)}
                                            </td>
                                            <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)]">
                                              {p.reasons.length > 0
                                                ? p.reasons.join(", ")
                                                : "-"}
                                            </td>
                                            <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                                              {p.returnCount}
                                            </td>
                                          </tr>
                                        );
                                      })
                                    ) : (
                                      <tr>
                                        <td
                                          colSpan={8}
                                          className="py-6 text-center text-xs text-[var(--ui-text-muted)] italic"
                                        >
                                          No returned products recorded for this supplier.
                                        </td>
                                      </tr>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            )}

                            {/* TAB 2: Return Vouchers Table */}
                            {activeTabForSupplier === "vouchers" && (
                              <div className="w-full overflow-x-auto rounded-lg border border-[var(--ui-border)]">
                                <Table>
                                  <TableHead>
                                    <TableTh align="center" width={48} className="whitespace-nowrap">
                                      SL
                                    </TableTh>
                                    <TableTh className="whitespace-nowrap">
                                      Voucher No
                                    </TableTh>
                                    <TableTh className="whitespace-nowrap">
                                      Purchase No
                                    </TableTh>
                                    <TableTh align="center" className="whitespace-nowrap">
                                      Return Date
                                    </TableTh>
                                    <TableTh align="center" className="whitespace-nowrap">
                                      Items
                                    </TableTh>
                                    <TableTh align="right" className="whitespace-nowrap">
                                      Cash Refund (৳)
                                    </TableTh>
                                    <TableTh align="right" className="whitespace-nowrap">
                                      Due Adjust (৳)
                                    </TableTh>
                                    <TableTh align="right" className="whitespace-nowrap">
                                      Total Refund (৳)
                                    </TableTh>
                                    <TableTh className="whitespace-nowrap">
                                      Reason
                                    </TableTh>
                                    <TableTh align="center" width={80} className="whitespace-nowrap">
                                      Actions
                                    </TableTh>
                                  </TableHead>
                                  <TableBody>
                                    {(s.records || []).map((r, rIdx) => (
                                      <tr
                                        key={r.returnNo || rIdx}
                                        className="hover:bg-[var(--primary-color-light)]/20 transition-colors"
                                      >
                                        <td className="py-2.5 px-2.5 text-center text-xs text-[var(--ui-text-muted)] tabular-nums">
                                          {rIdx + 1}
                                        </td>
                                        <td className="py-2.5 px-3 text-xs font-semibold text-[var(--ui-text)]">
                                          {r.returnNo}
                                        </td>
                                        <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] font-mono">
                                          {r.purchaseInvoiceNo !== "-"
                                            ? r.purchaseInvoiceNo
                                            : r.orderNo}
                                        </td>
                                        <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                                          {formatShortReportDate(r.returnDate)}
                                        </td>
                                        <td className="py-2.5 px-2.5 text-center text-xs text-[var(--ui-text)] tabular-nums">
                                          {r.itemsCount}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-xs text-[var(--ui-success)] font-medium tabular-nums whitespace-nowrap">
                                          ৳ {formatMoney(r.isCreditAdjust ? 0 : r.refundAmount)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-xs text-amber-600 tabular-nums whitespace-nowrap">
                                          {r.isCreditAdjust
                                            ? `৳ ${formatMoney(r.refundAmount)}`
                                            : "-"}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-xs font-bold text-[var(--ui-danger)] tabular-nums whitespace-nowrap">
                                          ৳ {formatMoney(r.refundAmount)}
                                        </td>
                                        <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] max-w-xs truncate">
                                          {r.reasonSummary || "-"}
                                        </td>
                                        <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                                          <div className="flex items-center justify-center gap-1.5">
                                            {onPrint && (
                                              <button
                                                type="button"
                                                onClick={() => onPrint(r.raw)}
                                                className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                                                title="Print Voucher"
                                              >
                                                <FiPrinter size={13} />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Grand Total Summary Row */}
              <tr className="bg-[var(--ui-surface-muted)]/70 font-bold border-t-2 border-[var(--ui-border)] text-xs text-[var(--ui-text)]">
                <td
                  colSpan={
                    [
                      true, // chevron
                      isColVisible("sl"),
                      isColVisible("supplierName"),
                      isColVisible("phone"),
                    ].filter(Boolean).length
                  }
                  className="py-2.5 px-3 text-left font-bold"
                >
                  Grand Total ({filteredSuppliers.length} Suppliers)
                </td>

                {isColVisible("returnCount") && (
                  <td className="py-2.5 px-3 text-center font-bold">
                    {totals.sumReturns}
                  </td>
                )}

                {isColVisible("itemsCount") && (
                  <td className="py-2.5 px-3 text-center font-bold">
                    {totals.sumItems}
                  </td>
                )}

                {isColVisible("cashRefund") && (
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    ৳ {formatMoney(totals.sumCash)}
                  </td>
                )}

                {isColVisible("creditAdjust") && (
                  <td className="py-2.5 px-3 text-right font-bold text-amber-600 dark:text-amber-400">
                    ৳ {formatMoney(totals.sumCredit)}
                  </td>
                )}

                {isColVisible("totalRefund") && (
                  <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                    ৳ {formatMoney(totals.sumTotal)}
                  </td>
                )}

                {isColVisible("lastReturnDate") && <td></td>}
                {isColVisible("actions") && <td></td>}
              </tr>
            </TableBody>
          </Table>
        )}
      </TableScroll>

      {!isLoading && totalCount > 0 && (
        <TablePaginationFooter
          totalCount={totalCount}
          pageCount={pageCount}
          currentPageNumber={safePage}
          dataLimit={pageSize}
          setDataLimit={(limit) => {
            setPageSize(limit);
            setCurrentPage(1);
          }}
          setCurrentPageNumber={setCurrentPage}
          handlePagination={(d) => setCurrentPage(d.selected + 1)}
          entityLabel="suppliers"
        />
      )}
    </TableContainer>
  );
};

export default SupplierReturnReportTable;

import React, { useMemo, useState } from "react";
import {
  FiChevronDown,
  FiChevronRight,
  FiRotateCcw,
  FiArrowLeft,
  FiEye,
  FiPackage,
  FiUser,
  FiCalendar,
  FiPrinter,
  FiFileText,
  FiLayers,
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
import type { SalesReturnItem } from "@/types";
import {
  type NormalizedSalesReturnRecord,
  type CustomerReturnSummary,
  type CustomerProductReturnItem,
  aggregateSalesReturnCustomers,
  aggregateCustomerReturnedProducts,
  exportCustomerReturnSummaryExcel,
  downloadCustomerReturnSummaryPdf,
  downloadCustomerDetailedReturnPdf,
  exportCustomerDetailedReturnExcel,
} from "../utils/sales-return-report-helpers";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";

interface CustomerReturnReportTableProps extends ReportDateFilterProps {
  records: NormalizedSalesReturnRecord[];
  isLoading?: boolean;
  onView?: (item: SalesReturnItem) => void;
  onPrint?: (item: SalesReturnItem) => void;
}

const AVAILABLE_COLUMNS: ColumnItem[] = [
  { key: "sl", label: "SL" },
  { key: "customerName", label: "Customer Name" },
  { key: "phone", label: "Phone" },
  { key: "returnCount", label: "Returns" },
  { key: "itemsCount", label: "Items" },
  { key: "cashRefund", label: "Cash Refund (৳)" },
  { key: "creditAdjust", label: "Due Adjusted (৳)" },
  { key: "totalRefund", label: "Total Refund (৳)" },
  { key: "lastReturnDate", label: "Last Return Date" },
  { key: "actions", label: "Details" },
];

export const CustomerReturnReportTable: React.FC<
  CustomerReturnReportTableProps
> = ({ records, isLoading, onView, onPrint, ...dateFilterProps }) => {
  const companyMeta = useReportCompanyMeta(
    dateFilterProps.startDate,
    dateFilterProps.endDate
  );

  // Filter & Search states
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string>("ALL");
  const [expandedCustomerKeys, setExpandedCustomerKeys] = useState<Set<string>>(
    new Set()
  );
  const [customerDetailViewTab, setCustomerDetailViewTab] = useState<
    "products" | "vouchers"
  >("products");
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
    "sales_return_report_customers_columns"
  );

  // Group all records by customer
  const customers = useMemo(
    () => aggregateSalesReturnCustomers(records),
    [records]
  );

  // Currently selected customer for single-customer detailed view
  const currentSelectedCustomer = useMemo(() => {
    if (selectedCustomerKey === "ALL") return null;
    return customers.find((c) => c.customerKey === selectedCustomerKey) || null;
  }, [customers, selectedCustomerKey]);

  // Aggregated products for the selected customer
  const selectedCustomerProducts = useMemo(() => {
    if (!currentSelectedCustomer || !currentSelectedCustomer.records) return [];
    return aggregateCustomerReturnedProducts(currentSelectedCustomer.records);
  }, [currentSelectedCustomer]);

  // Toggle inline row expansion in All Customers table
  const toggleRowExpansion = (key: string) => {
    setExpandedCustomerKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Filtered customer summary list (when on All Customers)
  const filteredCustomers = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const list = q
      ? customers.filter(
          (c) =>
            c.customerName.toLowerCase().includes(q) ||
            c.customerPhone.toLowerCase().includes(q)
        )
      : customers;

    return [...list].sort((a, b) => {
      if (sortBy === "returns_desc") return b.returnCount - a.returnCount;
      if (sortBy === "name_asc")
        return a.customerName.localeCompare(b.customerName);
      return b.totalRefund - a.totalRefund;
    });
  }, [customers, debouncedSearch, sortBy]);

  // Filtered products & vouchers when viewing a specific customer
  const filteredCustomerProducts = useMemo(() => {
    if (!currentSelectedCustomer) return [];
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return selectedCustomerProducts;
    return selectedCustomerProducts.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        p.productCode.toLowerCase().includes(q) ||
        p.reasons.some((r) => r.toLowerCase().includes(q))
    );
  }, [selectedCustomerProducts, debouncedSearch, currentSelectedCustomer]);

  const filteredCustomerVouchers = useMemo(() => {
    if (!currentSelectedCustomer || !currentSelectedCustomer.records) return [];
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return currentSelectedCustomer.records;
    return currentSelectedCustomer.records.filter(
      (r) =>
        r.returnNo.toLowerCase().includes(q) ||
        r.salesInvoiceNo.toLowerCase().includes(q) ||
        r.orderNo.toLowerCase().includes(q) ||
        r.reasonSummary.toLowerCase().includes(q) ||
        r.details.some((d) => d.productName.toLowerCase().includes(q))
    );
  }, [currentSelectedCustomer, debouncedSearch]);

  const totalCount = filteredCustomers.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const paginated = filteredCustomers.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const hasActiveFilter =
    searchQuery.trim() !== "" ||
    sortBy !== "amount_desc" ||
    selectedCustomerKey !== "ALL";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSortBy("amount_desc");
    setSelectedCustomerKey("ALL");
    setCurrentPage(1);
  };

  // Direct single-customer detailed PDF download from table row or details card
  const handleDownloadSingleCustomerPdf = async (target: CustomerReturnSummary) => {
    try {
      setIsExporting(true);
      await downloadCustomerDetailedReturnPdf(target, companyMeta);
      showSuccessToast(
        `Downloaded detailed return report for ${target.customerName}!`
      );
    } catch (err: any) {
      console.error("PDF export error:", err);
      showErrorToast(err?.message || "Failed to download PDF");
    } finally {
      setIsExporting(false);
    }
  };

  // Direct single-customer detailed Excel export
  const handleExportSingleCustomerExcel = async (target: CustomerReturnSummary) => {
    try {
      setIsExporting(true);
      const count = await exportCustomerDetailedReturnExcel(target, companyMeta);
      showSuccessToast(
        `Exported ${count} return records for ${target.customerName} to Excel!`
      );
    } catch (err: any) {
      console.error("Excel export error:", err);
      showErrorToast(err?.message || "Failed to export Excel");
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

          {/* Customer Selector Dropdown */}
          <div className="relative shrink-0 max-w-[240px]">
            <select
              value={selectedCustomerKey}
              onChange={(e) => {
                setSelectedCustomerKey(e.target.value);
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="h-8 pl-2.5 pr-7 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg text-[var(--ui-text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] appearance-none cursor-pointer font-medium truncate"
            >
              <option value="ALL">All Customers (Summary)</option>
              {customers.map((c) => (
                <option key={c.customerKey} value={c.customerKey}>
                  {c.customerName} ({c.returnCount} returns)
                </option>
              ))}
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)] pointer-events-none"
              size={12}
            />
          </div>

          {/* Search */}
          <div className="w-full sm:w-52 shrink-0">
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
              placeholder={
                currentSelectedCustomer
                  ? "Search products, vouchers..."
                  : "Search customer name, phone..."
              }
            />
          </div>

          {/* Sort By (when on All Customers) */}
          {!currentSelectedCustomer && (
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
                <option value="name_asc">Customer Name A–Z</option>
              </select>
              <FiChevronDown
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)] pointer-events-none"
                size={12}
              />
            </div>
          )}

          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 h-8 text-xs font-semibold text-[var(--ui-danger)] bg-[var(--ui-danger-light)] hover:bg-[var(--ui-danger-border)] border border-[var(--ui-danger-border)] rounded-lg transition-colors cursor-pointer shrink-0"
              title="Reset all filters"
            >
              <FiRotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--ui-border)]">
          {/* Column Visibility (Only in All Customers summary view) */}
          {!currentSelectedCustomer && (
            <ColumnVisibilityDropdown
              columns={AVAILABLE_COLUMNS}
              visibleColumns={visibleColumns}
              onToggle={handleToggleColumn}
              onReset={handleResetColumns}
            />
          )}

          {/* Dynamic Export Buttons */}
          <ReportExportButtons
            isLoading={isExporting}
            onExportExcel={async () => {
              if (currentSelectedCustomer) {
                const count = await exportCustomerDetailedReturnExcel(
                  currentSelectedCustomer,
                  companyMeta
                );
                return `Exported ${count} return records for ${currentSelectedCustomer.customerName} to Excel!`;
              }
              const count = await exportCustomerReturnSummaryExcel(
                filteredCustomers,
                companyMeta,
                visibleColumns
              );
              return `Exported ${count} customer return summaries to Excel!`;
            }}
            onDownloadPdf={async () => {
              if (currentSelectedCustomer) {
                await downloadCustomerDetailedReturnPdf(
                  currentSelectedCustomer,
                  companyMeta
                );
                return `Detailed return PDF for ${currentSelectedCustomer.customerName} downloaded!`;
              }
              await downloadCustomerReturnSummaryPdf(
                filteredCustomers,
                companyMeta,
                visibleColumns
              );
              return "Customer sales return report PDF downloaded!";
            }}
          />
        </div>
      </TableToolbar>

      {/* ========================================================================= */}
      {/* CASE A: SPECIFIC CUSTOMER SELECTED -> FULL DETAILED VIEW                 */}
      {/* ========================================================================= */}
      {currentSelectedCustomer ? (
        <div className="p-3 sm:p-4 flex flex-col gap-3.5 bg-[var(--ui-surface)]">
          {/* Customer Header & Navigation Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-slate-50/80 dark:bg-slate-900/40 rounded-xl border border-[var(--ui-border)] shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedCustomerKey("ALL")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[var(--ui-text)] bg-[var(--ui-surface)] hover:bg-[var(--ui-border)] border border-[var(--ui-border)] rounded-lg transition-colors cursor-pointer shadow-xs"
                title="Return to all customers summary"
              >
                <FiArrowLeft size={13} />
                <span>All Customers</span>
              </button>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[var(--ui-text)]">
                    {currentSelectedCustomer.customerName}
                  </span>
                  <span className="text-xs font-medium text-[var(--ui-text-muted)] bg-[var(--ui-border)]/50 px-2 py-0.5 rounded-full">
                    {currentSelectedCustomer.customerPhone}
                  </span>
                </div>
                {currentSelectedCustomer.customerAddress && (
                  <span className="text-[11px] text-[var(--ui-text-subtle)] truncate max-w-md">
                    {currentSelectedCustomer.customerAddress}
                  </span>
                )}
              </div>
            </div>

            {/* Quick action buttons for this customer */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() =>
                  handleDownloadSingleCustomerPdf(currentSelectedCustomer)
                }
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <FaFilePdf size={12} className="text-rose-600" />
                <span>Customer PDF</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleExportSingleCustomerExcel(currentSelectedCustomer)
                }
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <FaFileExcel size={12} className="text-emerald-600" />
                <span>Customer Excel</span>
              </button>
            </div>
          </div>

          {/* Customer Stat Cards Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="p-2.5 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg">
              <span className="text-[11px] text-[var(--ui-text-muted)] font-medium">
                Total Returns
              </span>
              <p className="text-base font-bold text-[var(--ui-text)] mt-0.5">
                {currentSelectedCustomer.returnCount}
              </p>
            </div>
            <div className="p-2.5 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg">
              <span className="text-[11px] text-[var(--ui-text-muted)] font-medium">
                Total Items
              </span>
              <p className="text-base font-bold text-[var(--ui-text)] mt-0.5">
                {currentSelectedCustomer.itemsCount}
              </p>
            </div>
            <div className="p-2.5 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg">
              <span className="text-[11px] text-[var(--ui-text-muted)] font-medium">
                Cash Refund
              </span>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                ৳ {formatMoney(currentSelectedCustomer.cashRefund)}
              </p>
            </div>
            <div className="p-2.5 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg">
              <span className="text-[11px] text-[var(--ui-text-muted)] font-medium">
                Due Adjusted
              </span>
              <p className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {currentSelectedCustomer.creditAdjust > 0
                  ? `৳ ${formatMoney(currentSelectedCustomer.creditAdjust)}`
                  : "-"}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1 p-2.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-lg">
              <span className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                Total Refund
              </span>
              <p className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                ৳ {formatMoney(currentSelectedCustomer.totalRefund)}
              </p>
            </div>
          </div>

          {/* Detail Sub-Tabs: Products vs Return Vouchers */}
          <div className="flex items-center gap-2 border-b border-[var(--ui-border)] pb-1">
            <button
              type="button"
              onClick={() => setCustomerDetailViewTab("products")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                customerDetailViewTab === "products"
                  ? "bg-[var(--primary-color)] text-white shadow-xs"
                  : "text-[var(--ui-text-muted)] hover:bg-[var(--ui-border)]/40 hover:text-[var(--ui-text)]"
              }`}
            >
              <FiPackage size={13} />
              <span>
                Returned Products ({selectedCustomerProducts.length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCustomerDetailViewTab("vouchers")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                customerDetailViewTab === "vouchers"
                  ? "bg-[var(--primary-color)] text-white shadow-xs"
                  : "text-[var(--ui-text-muted)] hover:bg-[var(--ui-border)]/40 hover:text-[var(--ui-text)]"
              }`}
            >
              <FiFileText size={13} />
              <span>
                Return Vouchers ({currentSelectedCustomer.records?.length || 0})
              </span>
            </button>
          </div>

          {/* Sub-View 1: Itemized Product Summary Table */}
          {customerDetailViewTab === "products" && (
            <div className="overflow-x-auto border border-[var(--ui-border)] rounded-xl">
              <Table>
                <TableHead>
                  <TableTh align="center" width={42} className="whitespace-nowrap">
                    SL
                  </TableTh>
                  <TableTh className="whitespace-nowrap">Product Name & Code</TableTh>
                  <TableTh align="center" className="whitespace-nowrap">
                    Unit
                  </TableTh>
                  <TableTh align="center" className="whitespace-nowrap">
                    Returned Qty
                  </TableTh>
                  <TableTh align="right" className="whitespace-nowrap">
                    Avg / Unit Price (৳)
                  </TableTh>
                  <TableTh align="right" className="whitespace-nowrap">
                    Total Amount (৳)
                  </TableTh>
                  <TableTh className="whitespace-nowrap">Return Reasons</TableTh>
                  <TableTh align="center" className="whitespace-nowrap">
                    Vouchers
                  </TableTh>
                </TableHead>
                <TableBody>
                  {filteredCustomerProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-[var(--ui-text-muted)]">
                        No product return lines match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomerProducts.map((p, pIdx) => (
                      <tr
                        key={p.productKey || pIdx}
                        className="hover:bg-[var(--primary-color-light)]/30 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                          {pIdx + 1}
                        </td>
                        <td className="py-2.5 px-3 text-xs font-semibold text-[var(--ui-text)]">
                          <div className="flex flex-col">
                            <span>{p.productName}</span>
                            {p.productCode && p.productCode !== "-" && (
                              <span className="text-[10px] text-[var(--ui-text-subtle)] font-mono">
                                #{p.productCode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text-muted)]">
                          {p.unit || "PCS"}
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                          {p.totalQuantity}
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs text-[var(--ui-text)] tabular-nums whitespace-nowrap">
                          ৳ {formatMoney(p.unitPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs font-bold text-[var(--ui-danger)] tabular-nums whitespace-nowrap">
                          ৳ {formatMoney(p.totalAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] max-w-[200px] truncate">
                          {p.reasons.length > 0 ? p.reasons.join(", ") : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text-muted)] tabular-nums">
                          {p.returnCount}
                        </td>
                      </tr>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Sub-View 2: Voucher-by-Voucher Breakdown */}
          {customerDetailViewTab === "vouchers" && (
            <div className="flex flex-col gap-3">
              {filteredCustomerVouchers.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--ui-text-muted)] border border-[var(--ui-border)] rounded-xl bg-slate-50/50 dark:bg-slate-900/20">
                  No return vouchers match your search.
                </div>
              ) : (
                filteredCustomerVouchers.map((r, rIdx) => {
                  const rNo = String(r.returnNo || "").replace(/^#+/, "");
                  const invNo = String(r.salesInvoiceNo || r.orderNo || "-").replace(/^#+/, "");

                  return (
                    <div
                      key={r.id || r.returnNo || rIdx}
                      className="border border-[var(--ui-border)] rounded-xl overflow-hidden shadow-xs bg-[var(--ui-surface)]"
                    >
                      {/* Voucher Card Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/40 border-b border-[var(--ui-border)]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[var(--primary-color)]">
                            Return #{rNo}
                          </span>
                          <span className="text-[11px] text-[var(--ui-text-muted)] flex items-center gap-1">
                            <FiCalendar size={11} />
                            <span>{formatShortReportDate(r.returnDate)}</span>
                          </span>
                          {invNo !== "-" && (
                            <span className="text-[11px] text-[var(--ui-text-subtle)] font-mono bg-[var(--ui-border)]/40 px-2 py-0.5 rounded">
                              Invoice: #{invNo}
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                              r.isCreditAdjust
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            {r.isCreditAdjust ? "Due Adjusted" : "Cash Refund"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--ui-danger)] tabular-nums">
                            ৳ {formatMoney(r.refundAmount)}
                          </span>

                          {onView && r.raw && (
                            <button
                              type="button"
                              onClick={() => onView(r.raw)}
                              className="p-1 rounded text-[var(--ui-text-muted)] hover:text-[var(--primary-color)] hover:bg-[var(--primary-color-light)] transition-colors cursor-pointer"
                              title="View Return Invoice Voucher"
                            >
                              <FiEye size={13} />
                            </button>
                          )}
                          {onPrint && r.raw && (
                            <button
                              type="button"
                              onClick={() => onPrint(r.raw)}
                              className="p-1 rounded text-[var(--ui-text-muted)] hover:text-[var(--primary-color)] hover:bg-[var(--primary-color-light)] transition-colors cursor-pointer"
                              title="Print Return Invoice"
                            >
                              <FiPrinter size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Itemized lines table inside this voucher */}
                      {r.details && r.details.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-100/50 dark:bg-slate-800/40 text-[var(--ui-text-muted)] text-[11px] border-b border-[var(--ui-border)]">
                                <th className="py-2 px-3 text-center w-10">SL</th>
                                <th className="py-2 px-3">Product Name</th>
                                <th className="py-2 px-3 text-center w-16">Unit</th>
                                <th className="py-2 px-3 text-center w-20">Qty</th>
                                <th className="py-2 px-3 text-right w-24">Price</th>
                                <th className="py-2 px-3 text-right w-28">Total</th>
                                <th className="py-2 px-3">Reason</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--ui-border)] text-[var(--ui-text)]">
                              {r.details.map((item, iIdx) => (
                                <tr
                                  key={iIdx}
                                  className="hover:bg-[var(--primary-color-light)]/20"
                                >
                                  <td className="py-2 px-3 text-center tabular-nums text-[var(--ui-text-muted)]">
                                    {iIdx + 1}
                                  </td>
                                  <td className="py-2 px-3 font-medium">
                                    {item.productName}
                                    {item.productCode && item.productCode !== "-" && (
                                      <span className="text-[10px] text-[var(--ui-text-subtle)] font-mono ml-1.5">
                                        #{item.productCode}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center text-[var(--ui-text-muted)]">
                                    {item.unit || "PCS"}
                                  </td>
                                  <td className="py-2 px-3 text-center font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                                    {item.quantity}
                                  </td>
                                  <td className="py-2 px-3 text-right tabular-nums">
                                    ৳ {formatMoney(item.unitPrice)}
                                  </td>
                                  <td className="py-2 px-3 text-right font-semibold text-[var(--ui-danger)] tabular-nums">
                                    ৳ {formatMoney(item.total || item.quantity * item.unitPrice)}
                                  </td>
                                  <td className="py-2 px-3 text-[var(--ui-text-muted)]">
                                    {item.reason || r.reasonSummary || "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] italic">
                          No itemized product lines attached to this return. (Total: ৳ {formatMoney(r.refundAmount)})
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* CASE B: ALL CUSTOMERS VIEW (EXACT CURRENT OVERVIEW TABLE)                */
        /* ========================================================================= */
        <>
          <TableScroll>
            {isLoading && records.length === 0 ? (
              <TableSkeleton columnCount={activeVisibleColumnCount + 1} rowCount={6} />
            ) : paginated.length === 0 ? (
              <EmptyState
                title="No Customer Return Data Found"
                description="No customer return records match your selected date range or search."
              />
            ) : (
              <Table>
                <TableHead>
                  <TableTh align="center" width={32} className="whitespace-nowrap">
                    {/* Expand icon header */}
                  </TableTh>
                  {isColVisible("sl") && (
                    <TableTh align="center" width={42} className="whitespace-nowrap">
                      SL
                    </TableTh>
                  )}
                  {isColVisible("customerName") && (
                    <TableTh className="whitespace-nowrap">Customer Name</TableTh>
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
                      Cash Refund (৳)
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
                      Last Return
                    </TableTh>
                  )}
                  {isColVisible("actions") && (
                    <TableTh align="center" width={75} className="whitespace-nowrap">
                      Details
                    </TableTh>
                  )}
                </TableHead>

                <TableBody>
                  {paginated.map((c, idx) => {
                    const sl = (safePage - 1) * pageSize + idx + 1;
                    const isExpanded = expandedCustomerKeys.has(c.customerKey);
                    const customerProducts = aggregateCustomerReturnedProducts(
                      c.records || []
                    );

                    return (
                      <React.Fragment key={`${c.customerKey}_${idx}`}>
                        <tr
                          className={`hover:bg-[var(--primary-color-light)]/40 transition-colors ${
                            isExpanded ? "bg-slate-50/70 dark:bg-slate-900/30" : ""
                          }`}
                        >
                          {/* Chevron Expand Toggle */}
                          <td className="py-2.5 px-2 text-center text-xs">
                            <button
                              type="button"
                              onClick={() => toggleRowExpansion(c.customerKey)}
                              className="p-1 rounded text-[var(--ui-text-muted)] hover:text-[var(--primary-color)] hover:bg-[var(--primary-color-light)] transition-colors cursor-pointer"
                              title={isExpanded ? "Collapse return details" : "Expand returned products preview"}
                            >
                              {isExpanded ? (
                                <FiChevronDown size={14} className="text-[var(--primary-color)]" />
                              ) : (
                                <FiChevronRight size={14} />
                              )}
                            </button>
                          </td>

                          {isColVisible("sl") && (
                            <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                              {sl}
                            </td>
                          )}

                          {isColVisible("customerName") && (
                            <td className="py-2.5 px-3 text-xs font-semibold text-[var(--ui-text)] max-w-[200px] truncate">
                              <button
                                type="button"
                                onClick={() => setSelectedCustomerKey(c.customerKey)}
                                className="hover:text-[var(--primary-color)] hover:underline text-left cursor-pointer truncate font-semibold"
                                title="Click to view all returned products and vouchers"
                              >
                                {c.customerName}
                              </button>
                            </td>
                          )}

                          {isColVisible("phone") && (
                            <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                              {c.customerPhone}
                            </td>
                          )}

                          {isColVisible("returnCount") && (
                            <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                              {c.returnCount}
                            </td>
                          )}

                          {isColVisible("itemsCount") && (
                            <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                              {c.itemsCount}
                            </td>
                          )}

                          {isColVisible("cashRefund") && (
                            <td className="py-2.5 px-3 text-right text-xs font-medium text-[var(--ui-success)] tabular-nums whitespace-nowrap">
                              ৳ {formatMoney(c.cashRefund)}
                            </td>
                          )}

                          {isColVisible("creditAdjust") && (
                            <td className="py-2.5 px-3 text-right text-xs text-amber-600 tabular-nums whitespace-nowrap">
                              {c.creditAdjust > 0
                                ? `৳ ${formatMoney(c.creditAdjust)}`
                                : "-"}
                            </td>
                          )}

                          {isColVisible("totalRefund") && (
                            <td className="py-2.5 px-3 text-right text-xs font-bold text-[var(--ui-danger)] tabular-nums whitespace-nowrap">
                              ৳ {formatMoney(c.totalRefund)}
                            </td>
                          )}

                          {isColVisible("lastReturnDate") && (
                            <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                              {formatShortReportDate(c.lastReturnDate)}
                            </td>
                          )}

                          {isColVisible("actions") && (
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCustomerKey(c.customerKey)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-[var(--primary-color)] bg-[var(--primary-color-light)] hover:bg-[var(--primary-color)] hover:text-white transition-colors cursor-pointer shadow-2xs"
                                  title="View returned products & vouchers breakdown"
                                >
                                  <FiEye size={12} />
                                  <span>Details</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadSingleCustomerPdf(c)}
                                  className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                                  title="Download Customer Return PDF"
                                >
                                  <FaFilePdf size={11} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>

                        {/* Inline Expandable Products Preview Panel */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 dark:bg-slate-900/50 border-b border-[var(--ui-border)]">
                            <td colSpan={11} className="p-3 sm:p-4">
                              <div className="flex flex-col gap-2.5 bg-[var(--ui-surface)] p-3 rounded-xl border border-[var(--ui-border)] shadow-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <FiPackage className="text-rose-500" size={14} />
                                    <span className="text-xs font-bold text-[var(--ui-text)]">
                                      Returned Products by {c.customerName} ({customerProducts.length} Products, {c.returnCount} Vouchers)
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedCustomerKey(c.customerKey)}
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primary-color)] hover:underline cursor-pointer"
                                    >
                                      <span>Full Detailed View</span>
                                      <FiChevronRight size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadSingleCustomerPdf(c)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors cursor-pointer"
                                    >
                                      <FaFilePdf size={10} className="text-rose-600" />
                                      <span>PDF</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Compact Product Return Chips/Badges */}
                                {customerProducts.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {customerProducts.map((p, idx2) => (
                                      <span
                                        key={idx2}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-[var(--ui-text)] border border-[var(--ui-border)]"
                                      >
                                        <span className="font-semibold text-[var(--ui-text)]">
                                          {p.productName}
                                        </span>
                                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                                          x{p.totalQuantity} {p.unit}
                                        </span>
                                        <span className="text-[11px] text-[var(--ui-text-muted)] font-mono">
                                          (৳{formatMoney(p.totalAmount)})
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-[var(--ui-text-muted)] italic">
                                    No itemized products found for this customer.
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
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
              entityLabel="customers"
            />
          )}
        </>
      )}
    </TableContainer>
  );
};

export default CustomerReturnReportTable;

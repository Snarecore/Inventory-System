import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiChevronDown,
  FiChevronRight,
  FiRotateCcw,
  FiEye,
  FiPackage,
  FiUser,
  FiPrinter,
  FiFileText,
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
  allUnifiedRecords?: any[];
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
> = ({
  records,
  allUnifiedRecords = [],
  isLoading,
  onView,
  onPrint,
  ...dateFilterProps
}) => {
  const navigate = useNavigate();
  const companyMeta = useReportCompanyMeta(
    dateFilterProps.startDate,
    dateFilterProps.endDate
  );

  // Filter & Search states
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string>("ALL");
  const [expandedCustomerKeys, setExpandedCustomerKeys] = useState<Set<string>>(
    new Set()
  );
  const [expandedCustomerTabs, setExpandedCustomerTabs] = useState<
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
  } = useColumnVisibility(
    AVAILABLE_COLUMNS,
    "sales_return_report_customers_columns"
  );

  // Group all records by customer
  const customers = useMemo(
    () => aggregateSalesReturnCustomers(records),
    [records]
  );

  // Toggle inline row expansion
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

  const setExpandedTab = (
    customerKey: string,
    tab: "products" | "vouchers"
  ) => {
    setExpandedCustomerTabs((prev) => ({
      ...prev,
      [customerKey]: tab,
    }));
  };

  // Filtered customer summary list
  const filteredCustomers = useMemo(() => {
    let list = customers;

    if (selectedCustomerKey !== "ALL") {
      list = list.filter((c) => c.customerKey === selectedCustomerKey);
    }

    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.customerName.toLowerCase().includes(q) ||
          c.customerPhone.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === "returns_desc") return b.returnCount - a.returnCount;
      if (sortBy === "name_asc")
        return a.customerName.localeCompare(b.customerName);
      return b.totalRefund - a.totalRefund;
    });
  }, [customers, selectedCustomerKey, debouncedSearch, sortBy]);

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

  // Direct single-customer detailed PDF download
  const handleDownloadSingleCustomerPdf = async (
    target: CustomerReturnSummary
  ) => {
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
  const handleExportSingleCustomerExcel = async (
    target: CustomerReturnSummary
  ) => {
    try {
      setIsExporting(true);
      const count = await exportCustomerDetailedReturnExcel(
        target,
        companyMeta
      );
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

  // Action: Create Return for this specific customer
  const handleCreateReturnForCustomer = (customer: CustomerReturnSummary) => {
    const candidates = Array.isArray(allUnifiedRecords) ? allUnifiedRecords : [];
    const matchedSale = candidates.find(
      (cand: any) =>
        !cand.isReturnRecord &&
        ((customer.customerId &&
          String(cand.customerId || cand.customer_id) ===
            String(customer.customerId)) ||
          (customer.customerName &&
            String(cand.customerName || cand.customer_name).toLowerCase() ===
              customer.customerName.toLowerCase()))
    );

    if (matchedSale) {
      navigate("/admin/create-sales-return", {
        state: { sale: matchedSale },
      });
    } else {
      navigate("/admin/create-sales-return");
    }
  };

  // Action: Return specific product for this customer
  const handleReturnProductForCustomer = (
    customer: CustomerReturnSummary,
    product: CustomerProductReturnItem
  ) => {
    const candidates = Array.isArray(allUnifiedRecords) ? allUnifiedRecords : [];
    const targetRef = (
      product.sampleOrderNo ||
      product.sampleInvoiceNo ||
      ""
    )
      .toLowerCase()
      .trim();

    let matchedSale = candidates.find((cand: any) => {
      if (cand.isReturnRecord) return false;
      const cOrd = String(cand.orderNo || "").toLowerCase().trim();
      const cInv = String(cand.salesInvoiceNo || cand.invoiceNo || "")
        .toLowerCase()
        .trim();
      return targetRef && (cOrd === targetRef || cInv === targetRef);
    });

    if (!matchedSale) {
      matchedSale = candidates.find(
        (cand: any) =>
          !cand.isReturnRecord &&
          ((customer.customerId &&
            String(cand.customerId || cand.customer_id) ===
              String(customer.customerId)) ||
            (customer.customerName &&
              String(cand.customerName || cand.customer_name).toLowerCase() ===
                customer.customerName.toLowerCase()))
      );
    }

    if (matchedSale) {
      navigate("/admin/create-sales-return", {
        state: { sale: matchedSale },
      });
    } else {
      navigate("/admin/create-sales-return");
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
                const val = e.target.value;
                setSelectedCustomerKey(val);
                setSearchQuery("");
                setCurrentPage(1);
                if (val !== "ALL") {
                  setExpandedCustomerKeys((prev) => new Set([...prev, val]));
                }
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
              placeholder="Search customer name, phone..."
            />
          </div>

          {/* Sort By */}
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
          <ColumnVisibilityDropdown
            columns={AVAILABLE_COLUMNS}
            visibleColumns={visibleColumns}
            onToggle={handleToggleColumn}
            onReset={handleResetColumns}
          />

          <ReportExportButtons
            isLoading={isExporting}
            onExportExcel={async () => {
              const count = await exportCustomerReturnSummaryExcel(
                filteredCustomers,
                companyMeta,
                visibleColumns
              );
              return `Exported ${count} customer return summaries to Excel!`;
            }}
            onDownloadPdf={async () => {
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

      {/* Main Customers Summary Table with Embedded Row-by-Row Details */}
      <TableScroll>
        {isLoading ? (
          <TableSkeleton rows={pageSize} columns={activeVisibleColumnCount(visibleColumns) + 1} />
        ) : filteredCustomers.length === 0 ? (
          <EmptyState
            title="No Customer Returns Found"
            description="No customer sales return records match your filter criteria."
          />
        ) : (
          <Table>
            <TableHead>
              <TableTh align="center" width={32} className="whitespace-nowrap">
                {/* Chevron icon header */}
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
                <TableTh align="center" width={80} className="whitespace-nowrap">
                  Details
                </TableTh>
              )}
            </TableHead>

            <TableBody>
              {paginated.map((c, idx) => {
                const sl = (safePage - 1) * pageSize + idx + 1;
                const isExpanded = expandedCustomerKeys.has(c.customerKey);
                const activeTabForCustomer =
                  expandedCustomerTabs[c.customerKey] || "products";
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
                          title={
                            isExpanded
                              ? "Collapse return details"
                              : "Expand returned products & vouchers"
                          }
                        >
                          {isExpanded ? (
                            <FiChevronDown
                              size={14}
                              className="text-[var(--primary-color)]"
                            />
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
                            onClick={() => toggleRowExpansion(c.customerKey)}
                            className="hover:text-[var(--primary-color)] hover:underline text-left cursor-pointer truncate font-semibold"
                            title="Click to view detailed returned products table"
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
                              onClick={() => toggleRowExpansion(c.customerKey)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs ${
                                isExpanded
                                  ? "bg-[var(--primary-color)] text-white"
                                  : "text-[var(--primary-color)] bg-[var(--primary-color-light)] hover:bg-[var(--primary-color)] hover:text-white"
                              }`}
                              title="Toggle returned products & vouchers breakdown"
                            >
                              <FiEye size={12} />
                              <span>{isExpanded ? "Close" : "Details"}</span>
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

                    {/* Inline Expandable Full Customer Details (Image 2 content embedded directly!) */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90 dark:bg-slate-900/50 border-b border-[var(--ui-border)]">
                        <td colSpan={11} className="p-3 sm:p-4">
                          <div className="flex flex-col gap-3.5 bg-[var(--ui-surface)] p-3.5 sm:p-4 rounded-xl border border-[var(--ui-border)] shadow-xs">
                            {/* Customer Header Banner */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-[var(--ui-border)] shadow-xs">
                              <div className="flex flex-wrap items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-[var(--primary-color-light)] text-[var(--primary-color)]">
                                  <FiUser size={16} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-[var(--ui-text)]">
                                      {c.customerName}
                                    </span>
                                    <span className="text-xs font-medium text-[var(--ui-text-muted)] bg-[var(--ui-border)]/50 px-2 py-0.5 rounded-full">
                                      {c.customerPhone}
                                    </span>
                                  </div>
                                  {c.customerAddress && (
                                    <span className="text-[11px] text-[var(--ui-text-subtle)] truncate block max-w-md">
                                      {c.customerAddress}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Quick Action Buttons for This Customer */}
                              <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
                                {/* Create Return Button for this customer */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCreateReturnForCustomer(c)
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[var(--primary-color)] hover:opacity-90 rounded-lg transition-all cursor-pointer shadow-xs"
                                  title="Create a new sales return for this customer"
                                >
                                  <FiRotateCcw size={12} />
                                  <span>+ নতুন রিটার্ন</span>
                                </button>

                                {/* Customer PDF */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDownloadSingleCustomerPdf(c)
                                  }
                                  disabled={isExporting}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors cursor-pointer shadow-xs"
                                  title="Download Customer Return PDF"
                                >
                                  <FaFilePdf
                                    size={11}
                                    className="text-rose-600"
                                  />
                                  <span>Customer PDF</span>
                                </button>

                                {/* Customer Excel */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleExportSingleCustomerExcel(c)
                                  }
                                  disabled={isExporting}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors cursor-pointer shadow-xs"
                                  title="Download Customer Return Excel"
                                >
                                  <FaFileExcel
                                    size={11}
                                    className="text-emerald-600"
                                  />
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
                                  {c.returnCount}
                                </p>
                              </div>
                              <div className="p-2.5 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg">
                                <span className="text-[11px] text-[var(--ui-text-muted)] font-medium">
                                  Total Items
                                </span>
                                <p className="text-base font-bold text-[var(--ui-text)] mt-0.5">
                                  {c.itemsCount}
                                </p>
                              </div>
                              <div className="p-2.5 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg">
                                <span className="text-[11px] text-[var(--ui-text-muted)] font-medium">
                                  Cash Refund
                                </span>
                                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                  ৳ {formatMoney(c.cashRefund)}
                                </p>
                              </div>
                              <div className="p-2.5 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg">
                                <span className="text-[11px] text-[var(--ui-text-muted)] font-medium">
                                  Due Adjusted
                                </span>
                                <p className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                                  {c.creditAdjust > 0
                                    ? `৳ ${formatMoney(c.creditAdjust)}`
                                    : "-"}
                                </p>
                              </div>
                              <div className="col-span-2 sm:col-span-1 p-2.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-lg">
                                <span className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                                  Total Refund
                                </span>
                                <p className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                                  ৳ {formatMoney(c.totalRefund)}
                                </p>
                              </div>
                            </div>

                            {/* Sub-Tabs: Returned Products vs Return Vouchers */}
                            <div className="flex items-center gap-2 border-b border-[var(--ui-border)] pb-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedTab(c.customerKey, "products")
                                }
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                  activeTabForCustomer === "products"
                                    ? "bg-[var(--primary-color)] text-white shadow-xs"
                                    : "text-[var(--ui-text-muted)] hover:bg-[var(--ui-border)]/40 hover:text-[var(--ui-text)]"
                                }`}
                              >
                                <FiPackage size={13} />
                                <span>
                                  Returned Products ({customerProducts.length})
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedTab(c.customerKey, "vouchers")
                                }
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                  activeTabForCustomer === "vouchers"
                                    ? "bg-[var(--primary-color)] text-white shadow-xs"
                                    : "text-[var(--ui-text-muted)] hover:bg-[var(--ui-border)]/40 hover:text-[var(--ui-text)]"
                                }`}
                              >
                                <FiFileText size={13} />
                                <span>
                                  Return Vouchers ({c.returnCount})
                                </span>
                              </button>
                            </div>

                            {/* TAB 1: Returned Products Table (Row by Row) */}
                            {activeTabForCustomer === "products" && (
                              <div className="overflow-x-auto rounded-lg border border-[var(--ui-border)]">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead className="bg-[#009fe3] text-white">
                                    <tr>
                                      <th className="py-2 px-2.5 text-center w-12 font-bold">
                                        SL
                                      </th>
                                      <th className="py-2 px-3 font-bold">
                                        Product Name &amp; Code
                                      </th>
                                      <th className="py-2 px-2.5 text-center font-bold">
                                        Unit
                                      </th>
                                      <th className="py-2 px-2.5 text-center font-bold">
                                        Returned Qty
                                      </th>
                                      <th className="py-2 px-3 text-right font-bold">
                                        Avg / Unit Price (৳)
                                      </th>
                                      <th className="py-2 px-3 text-right font-bold">
                                        Total Amount (৳)
                                      </th>
                                      <th className="py-2 px-3 font-bold">
                                        Return Reasons
                                      </th>
                                      <th className="py-2 px-2.5 text-center font-bold">
                                        Vouchers
                                      </th>
                                      <th className="py-2 px-2.5 text-center font-bold w-20">
                                        Action
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[var(--ui-border)] bg-[var(--ui-surface)]">
                                    {customerProducts.length > 0 ? (
                                      customerProducts.map((p, pIdx) => {
                                        const avgUnitPrice =
                                          p.totalQuantity > 0
                                            ? p.totalAmount / p.totalQuantity
                                            : p.unitPrice;
                                        return (
                                          <tr
                                            key={p.productKey || pIdx}
                                            className="hover:bg-[var(--primary-color-light)]/20 transition-colors"
                                          >
                                            <td className="py-2.5 px-2.5 text-center text-xs text-[var(--ui-text-muted)] tabular-nums">
                                              {pIdx + 1}
                                            </td>
                                            <td className="py-2.5 px-3 text-xs">
                                              <div className="flex flex-col">
                                                <span className="font-bold text-[var(--ui-text)]">
                                                  {p.productName}
                                                </span>
                                                {p.productCode &&
                                                  p.productCode !== "-" && (
                                                    <span className="text-[11px] text-[var(--ui-text-muted)] font-mono">
                                                      #{p.productCode}
                                                    </span>
                                                  )}
                                              </div>
                                            </td>
                                            <td className="py-2.5 px-2.5 text-center text-xs text-[var(--ui-text-muted)]">
                                              {p.unit || "PCS"}
                                            </td>
                                            <td className="py-2.5 px-2.5 text-center text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                                              {p.totalQuantity}
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-xs text-[var(--ui-text)] tabular-nums whitespace-nowrap">
                                              ৳ {formatMoney(avgUnitPrice)}
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-xs font-bold text-[var(--ui-danger)] tabular-nums whitespace-nowrap">
                                              ৳ {formatMoney(p.totalAmount)}
                                            </td>
                                            <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] max-w-xs truncate">
                                              {p.reasons.length > 0
                                                ? p.reasons.join(", ")
                                                : "Quality Issue / Defective"}
                                            </td>
                                            <td className="py-2.5 px-2.5 text-center text-xs text-[var(--ui-text)] tabular-nums">
                                              {p.returnCount}
                                            </td>
                                            <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleReturnProductForCustomer(
                                                    c,
                                                    p
                                                  )
                                                }
                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[var(--primary-color)] bg-[var(--primary-color-light)] hover:bg-[var(--primary-color)] hover:text-white rounded transition-colors cursor-pointer"
                                                title="Return this item for customer"
                                              >
                                                <FiRotateCcw size={11} />
                                                <span>ফেরত</span>
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })
                                    ) : (
                                      <tr>
                                        <td
                                          colSpan={9}
                                          className="py-6 text-center text-xs text-[var(--ui-text-muted)] italic"
                                        >
                                          No returned products recorded for this customer.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* TAB 2: Return Vouchers Table */}
                            {activeTabForCustomer === "vouchers" && (
                              <div className="overflow-x-auto rounded-lg border border-[var(--ui-border)]">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead className="bg-[#009fe3] text-white">
                                    <tr>
                                      <th className="py-2 px-2.5 text-center w-12 font-bold">
                                        SL
                                      </th>
                                      <th className="py-2 px-3 font-bold">
                                        Voucher No
                                      </th>
                                      <th className="py-2 px-3 font-bold">
                                        Order ID
                                      </th>
                                      <th className="py-2 px-3 text-center font-bold">
                                        Return Date
                                      </th>
                                      <th className="py-2 px-2.5 text-center font-bold">
                                        Items
                                      </th>
                                      <th className="py-2 px-3 text-right font-bold">
                                        Cash Refund (৳)
                                      </th>
                                      <th className="py-2 px-3 text-right font-bold">
                                        Due Adjust (৳)
                                      </th>
                                      <th className="py-2 px-3 text-right font-bold">
                                        Total Refund (৳)
                                      </th>
                                      <th className="py-2 px-3 font-bold">
                                        Reason
                                      </th>
                                      <th className="py-2 px-2.5 text-center font-bold w-20">
                                        Actions
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[var(--ui-border)] bg-[var(--ui-surface)]">
                                    {(c.records || []).map((r, rIdx) => (
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
                                          {r.orderNo && r.orderNo !== "-"
                                            ? r.orderNo
                                            : r.salesInvoiceNo}
                                        </td>
                                        <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                                          {formatShortReportDate(r.returnDate)}
                                        </td>
                                        <td className="py-2.5 px-2.5 text-center text-xs text-[var(--ui-text)] tabular-nums">
                                          {r.itemsCount}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-xs text-[var(--ui-success)] font-medium tabular-nums whitespace-nowrap">
                                          ৳ {formatMoney(r.cashRefund)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-xs text-amber-600 tabular-nums whitespace-nowrap">
                                          {r.creditAdjust > 0
                                            ? `৳ ${formatMoney(r.creditAdjust)}`
                                            : "-"}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-xs font-bold text-[var(--ui-danger)] tabular-nums whitespace-nowrap">
                                          ৳ {formatMoney(r.refundAmount)}
                                        </td>
                                        <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] max-w-xs truncate">
                                          {r.reasonSummary}
                                        </td>
                                        <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                                          <div className="flex items-center justify-center gap-1.5">
                                            {onView && (
                                              <button
                                                type="button"
                                                onClick={() => onView(r.raw)}
                                                className="p-1 rounded text-[var(--primary-color)] hover:bg-[var(--primary-color-light)] transition-colors cursor-pointer"
                                                title="View Voucher Invoice"
                                              >
                                                <FiEye size={13} />
                                              </button>
                                            )}
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
                                  </tbody>
                                </table>
                              </div>
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

      {/* Pagination Footer */}
      {!isLoading && filteredCustomers.length > 0 && (
        <TablePaginationFooter
          totalItems={totalCount}
          currentPage={safePage}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      )}
    </TableContainer>
  );
};

export default CustomerReturnReportTable;

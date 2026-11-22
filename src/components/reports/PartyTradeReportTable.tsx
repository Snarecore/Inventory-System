import React, { useState, useMemo } from "react";
import moment from "moment";
import {
  FiChevronRight,
  FiEye,
  FiCopy,
  FiCheck,
  FiRotateCcw,
} from "react-icons/fi";
import {
  FaFileExcel,
  FaFilePdf,
  FaShoppingCart,
  FaShoppingBag,
} from "react-icons/fa";
import Search from "@/components/table-components/Search";
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
  TableFilterSelect,
} from "@/components/common";
import { formatMoney } from "@/utils/formatters";
import { useDebounce } from "@/hooks/useDebounce";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import ColumnVisibilityDropdown, {
  type ColumnItem,
} from "@/components/table-components/ColumnVisibilityDropdown";
import ReportExportButtons from "./ReportExportButtons";
import ReportDateRangeControl from "./ReportDateRangeControl";
import ReportPartyFilterDropdown, {
  type ReportPartyOption,
} from "@/components/reports/ReportPartyFilterDropdown";
import { showSuccessToast } from "@/utils/toast-utils";
import {
  type TradeDomain,
  type PartyTradeSummary,
  type ReportCompanyMeta,
  type ReportDateFilterProps,
  aggregateTradeParties,
  extractTradeRecordMetrics,
  useReportCompanyMeta,
} from "@/utils/trade-report-helpers";

interface PartyTradeReportTableProps extends ReportDateFilterProps {
  domain: TradeDomain;
  transactions: any[];
  isLoading?: boolean;
  onExportExcel: (
    parties: PartyTradeSummary[],
    meta: ReportCompanyMeta,
    visibleColumns?: Record<string, boolean>
  ) => Promise<number>;
  onDownloadPdf: (
    parties: PartyTradeSummary[],
    meta: ReportCompanyMeta,
    visibleColumns?: Record<string, boolean>
  ) => Promise<void>;
  onExportPartyInvoicesExcel?: (
    invoices: any[],
    partyName: string,
    meta: ReportCompanyMeta
  ) => Promise<number>;
  onDownloadPartyInvoicesPdf?: (
    invoices: any[],
    partyName: string,
    meta: ReportCompanyMeta
  ) => Promise<void>;
  onViewInvoice?: (invoice: any) => void;
  excelSuccessText: (count: number) => string;
  pdfSuccessText: string;
}

const PARTY_LABELS: Record<
  TradeDomain,
  {
    searchPlaceholder: string;
    partyCol: string;
    partyFilterAllLabel: string;
    partyFilterPlaceholder: string;
    partyFilterEmptyLabel: string;
    emptyTitle: string;
    emptyDesc: string;
    entityLabel: string;
    invoiceSectionTitle: string;
    invoiceSingleLabel: string;
    invoicePluralLabel: string;
  }
> = {
  sale: {
    searchPlaceholder: "Search customer name, phone, address...",
    partyCol: "Customer Name",
    partyFilterAllLabel: "All Customers",
    partyFilterPlaceholder: "Search customer name, phone...",
    partyFilterEmptyLabel: "No customer found",
    emptyTitle: "No Customers Found",
    emptyDesc: "No customer accounts match the current filter criteria.",
    entityLabel: "customers",
    invoiceSectionTitle: "Sales Invoices for",
    invoiceSingleLabel: "Sale",
    invoicePluralLabel: "Sales",
  },
  purchase: {
    searchPlaceholder: "Search supplier name, phone, address...",
    partyCol: "Supplier Name",
    partyFilterAllLabel: "All Suppliers",
    partyFilterPlaceholder: "Search supplier name, phone...",
    partyFilterEmptyLabel: "No supplier found",
    emptyTitle: "No Suppliers Found",
    emptyDesc: "No supplier accounts match the current filter criteria.",
    entityLabel: "suppliers",
    invoiceSectionTitle: "Purchase Invoices from",
    invoiceSingleLabel: "Purchase",
    invoicePluralLabel: "Purchases",
  },
};

/**
 * Shared Party-Wise (Customer / Supplier) Trade Report table with:
 * - Searchable Customer / Supplier Filter Dropdown
 * - In-depth customer/supplier sales breakdown
 * - Customer/Supplier-specific Excel & PDF download
 */
export const PartyTradeReportTable: React.FC<PartyTradeReportTableProps> = ({
  domain,
  transactions,
  isLoading,
  startDate,
  endDate,
  dateRange,
  onPresetChange,
  onDateChange,
  onExportExcel,
  onDownloadPdf,
  onExportPartyInvoicesExcel,
  onDownloadPartyInvoicesPdf,
  onViewInvoice,
  excelSuccessText,
  pdfSuccessText,
}) => {
  const labels = PARTY_LABELS[domain];
  const companyMeta = useReportCompanyMeta(startDate, endDate);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [selectedParty, setSelectedParty] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("billed_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedPartyName, setExpandedPartyName] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const availableColumns: ColumnItem[] = [
    { key: "sl", label: "SL" },
    { key: "partyName", label: labels.partyCol },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "orders", label: "Orders" },
    { key: "totalBilled", label: "Gross Billed (৳)" },
    { key: "totalPaid", label: "Total Paid (৳)" },
    { key: "totalDue", label: "Outstanding (৳)" },
    { key: "lastDate", label: "Last Order" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Invoices" },
  ];

  const {
    visibleColumns,
    isColVisible,
    handleToggleColumn,
    handleResetColumns,
    activeVisibleColumnCount,
  } = useColumnVisibility(availableColumns, `party_${domain}_report_columns`);

  const partySummaries = useMemo(
    () => aggregateTradeParties(transactions, domain),
    [transactions, domain]
  );

  // Distinct party options for searchable dropdown
  const partyOptions: ReportPartyOption[] = useMemo(() => {
    return partySummaries.map((p) => ({
      id: p.partyId || p.partyName,
      name: p.partyName,
      phone: p.partyPhone,
    }));
  }, [partySummaries]);

  // Helper to fetch all transactions matching a party name
  const getPartyTransactions = (name: string) => {
    if (!name) return [];
    const lower = name.toLowerCase();
    return transactions.filter((tx) => {
      const m = extractTradeRecordMetrics(tx, domain);
      return m.partyName.toLowerCase() === lower;
    });
  };

  const handleCopyOrderId = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedOrderId(text);
    showSuccessToast(`Copied Order ID: ${text}`);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const isAnyFilterActive =
    searchQuery.trim() !== "" ||
    selectedParty !== "all" ||
    statusFilter !== "all" ||
    sortBy !== "billed_desc";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedParty("all");
    setStatusFilter("all");
    setSortBy("billed_desc");
    setCurrentPage(1);
    setExpandedPartyName(null);
  };

  const toggleExpand = (name: string) => {
    setExpandedPartyName((prev) => (prev === name ? null : name));
  };

  const filtered = useMemo(() => {
    return partySummaries
      .filter((p) => {
        if (
          selectedParty !== "all" &&
          p.partyName.toLowerCase() !== selectedParty.toLowerCase()
        ) {
          return false;
        }
        if (statusFilter === "due_only" && p.totalDue <= 0) return false;
        if (statusFilter === "cleared_only" && p.totalDue > 0) return false;
        if (debouncedSearch.trim()) {
          const q = debouncedSearch.toLowerCase().trim();
          return (
            p.partyName.toLowerCase().includes(q) ||
            p.partyPhone.toLowerCase().includes(q) ||
            p.partyAddress.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "billed_desc") return b.totalBilled - a.totalBilled;
        if (sortBy === "due_desc") return b.totalDue - a.totalDue;
        if (sortBy === "orders_desc") return b.invoicesCount - a.invoicesCount;
        if (sortBy === "name_asc") return a.partyName.localeCompare(b.partyName);
        return 0;
      });
  }, [partySummaries, selectedParty, statusFilter, debouncedSearch, sortBy]);

  const totalCount = filtered.length;
  const pageCount = Math.ceil(totalCount / pageSize) || 1;
  const safePage = Math.min(Math.max(1, currentPage), pageCount);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  // Toolbar Excel Export: If party is selected (or only 1 party is shown), export party transactions
  const handleToolbarExportExcel = async () => {
    if (selectedParty !== "all" && onExportPartyInvoicesExcel) {
      const partyInvoices = getPartyTransactions(selectedParty);
      const count = await onExportPartyInvoicesExcel(
        partyInvoices,
        selectedParty,
        companyMeta
      );
      return `Exported ${count} ${labels.invoicePluralLabel.toLowerCase()} for ${selectedParty} to Excel!`;
    }
    if (filtered.length === 1 && debouncedSearch.trim() && onExportPartyInvoicesExcel) {
      const targetParty = filtered[0].partyName;
      const partyInvoices = getPartyTransactions(targetParty);
      const count = await onExportPartyInvoicesExcel(
        partyInvoices,
        targetParty,
        companyMeta
      );
      return `Exported ${count} ${labels.invoicePluralLabel.toLowerCase()} for ${targetParty} to Excel!`;
    }
    const count = await onExportExcel(filtered, companyMeta, visibleColumns);
    return excelSuccessText(count);
  };

  // Toolbar PDF Download: If party is selected (or only 1 party is shown), export party transactions PDF
  const handleToolbarDownloadPdf = async () => {
    if (selectedParty !== "all" && onDownloadPartyInvoicesPdf) {
      const partyInvoices = getPartyTransactions(selectedParty);
      await onDownloadPartyInvoicesPdf(
        partyInvoices,
        selectedParty,
        companyMeta
      );
      return `${domain === "sale" ? "Customer sales" : "Supplier purchase"} report for ${selectedParty} PDF downloaded!`;
    }
    if (filtered.length === 1 && debouncedSearch.trim() && onDownloadPartyInvoicesPdf) {
      const targetParty = filtered[0].partyName;
      const partyInvoices = getPartyTransactions(targetParty);
      await onDownloadPartyInvoicesPdf(
        partyInvoices,
        targetParty,
        companyMeta
      );
      return `${domain === "sale" ? "Customer sales" : "Supplier purchase"} report for ${targetParty} PDF downloaded!`;
    }
    await onDownloadPdf(filtered, companyMeta, visibleColumns);
    return pdfSuccessText;
  };

  return (
    <TableContainer>
      {/* Top Filter Bar */}
      <TableToolbar>
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="w-full sm:w-48 md:w-56 shrink-0">
            <Search
              searchQuery={searchQuery}
              onSearchChange={(val) => {
                setSearchQuery(val);
                setCurrentPage(1);
              }}
              setSearchQuery={setSearchQuery}
              placeholder={labels.searchPlaceholder}
            />
          </div>

          <ReportDateRangeControl
            startDate={startDate}
            endDate={endDate}
            dateRange={dateRange}
            onPresetChange={onPresetChange}
            onDateChange={onDateChange}
            onAfterChange={() => setCurrentPage(1)}
            className="w-[calc(50%-4px)] sm:w-36 lg:w-40 shrink-0"
          />

          {/* Searchable Customer / Supplier Filter Dropdown */}
          <ReportPartyFilterDropdown
            parties={partyOptions}
            selectedParty={selectedParty}
            onSelect={(val) => {
              setSelectedParty(val);
              setCurrentPage(1);
              if (val !== "all") {
                setExpandedPartyName(val);
              }
            }}
            allLabel={labels.partyFilterAllLabel}
            searchPlaceholder={labels.partyFilterPlaceholder}
            emptyLabel={labels.partyFilterEmptyLabel}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
          {/* Status filter */}
          <TableFilterSelect
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setCurrentPage(1);
            }}
            isFiltered={statusFilter !== "all"}
            className="w-32 shrink-0"
            options={[
              { value: "all", label: "All Status" },
              { value: "due_only", label: "Outstanding" },
              { value: "cleared_only", label: "Paid" },
            ]}
          />

          {/* Sort selector */}
          <TableFilterSelect
            value={sortBy}
            onChange={(val) => {
              setSortBy(val);
              setCurrentPage(1);
            }}
            isFiltered={sortBy !== "billed_desc"}
            className="w-36 shrink-0"
            options={[
              { value: "billed_desc", label: "Highest Billed" },
              { value: "due_desc", label: "Highest Due" },
              { value: "orders_desc", label: "Most Orders" },
              { value: "name_asc", label: "Name (A-Z)" },
            ]}
          />

          {/* Reset Filters button if any filter is active */}
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset all filters"
              className="h-8 px-2.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] bg-[var(--primary-color-light)] hover:bg-[var(--primary-color-light)]/80 border border-[var(--color-primary)]/30 rounded-lg transition-colors cursor-pointer"
            >
              <FiRotateCcw size={12} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          <ColumnVisibilityDropdown
            columns={availableColumns}
            visibleColumns={visibleColumns}
            onToggle={handleToggleColumn}
            onReset={handleResetColumns}
          />

          <ReportExportButtons
            onExportExcel={handleToolbarExportExcel}
            onDownloadPdf={handleToolbarDownloadPdf}
          />
        </div>
      </TableToolbar>

      {/* Table */}
      <TableScroll>
        {isLoading ? (
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={8} />
        ) : paginated.length === 0 ? (
          <EmptyState title={labels.emptyTitle} description={labels.emptyDesc} />
        ) : (
          <Table>
            <TableHead>
              {isColVisible("sl") && (
                <TableTh align="center" width={40} className="whitespace-nowrap">
                  SL
                </TableTh>
              )}
              {isColVisible("partyName") && (
                <TableTh className="whitespace-nowrap">{labels.partyCol}</TableTh>
              )}
              {isColVisible("phone") && (
                <TableTh className="whitespace-nowrap">Phone</TableTh>
              )}
              {isColVisible("address") && (
                <TableTh className="whitespace-nowrap">Address</TableTh>
              )}
              {isColVisible("orders") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Orders
                </TableTh>
              )}
              {isColVisible("totalBilled") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Gross Billed (৳)
                </TableTh>
              )}
              {isColVisible("totalPaid") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Total Paid (৳)
                </TableTh>
              )}
              {isColVisible("totalDue") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Outstanding (৳)
                </TableTh>
              )}
              {isColVisible("lastDate") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Last Order
                </TableTh>
              )}
              {isColVisible("status") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Status
                </TableTh>
              )}
              {isColVisible("actions") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Invoices
                </TableTh>
              )}
            </TableHead>
            <TableBody>
              {paginated.map((p, idx) => {
                const hasDue = p.totalDue > 0;
                const isExpanded = expandedPartyName === p.partyName;
                const partyInvoices = isExpanded ? getPartyTransactions(p.partyName) : [];

                return (
                  <React.Fragment key={p.partyName + idx}>
                    <tr className="hover:bg-[var(--primary-color-light)]/40 transition-colors">
                      {isColVisible("sl") && (
                        <td className="py-2.5 px-3 text-center text-[var(--ui-text)] font-semibold text-xs">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </td>
                      )}
                      {isColVisible("partyName") && (
                        <td className="py-2.5 px-3 font-medium text-[var(--ui-text)] text-xs whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleExpand(p.partyName)}
                            className="inline-flex items-center gap-1.5 font-medium text-[var(--ui-text)] text-xs hover:text-[var(--color-primary)] cursor-pointer text-left"
                            title="Click to view transactions"
                          >
                            <FiChevronRight
                              className={`transition-transform duration-200 text-[var(--ui-text-muted)] ${
                                isExpanded ? "rotate-90 text-[var(--color-primary)]" : ""
                              }`}
                              size={13}
                            />
                            <span className="font-semibold">{p.partyName}</span>
                          </button>
                        </td>
                      )}
                      {isColVisible("phone") && (
                        <td className="py-2.5 px-3 text-xs text-[var(--ui-text)] whitespace-nowrap">
                          {p.partyPhone || (
                            <span className="text-[var(--ui-text-subtle)] font-normal">
                              N/A
                            </span>
                          )}
                        </td>
                      )}
                      {isColVisible("address") && (
                        <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] max-w-[200px] truncate">
                          {p.partyAddress || (
                            <span className="text-[var(--ui-text-subtle)] font-normal">
                              N/A
                            </span>
                          )}
                        </td>
                      )}
                      {isColVisible("orders") && (
                        <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                          {p.invoicesCount}
                        </td>
                      )}
                      {isColVisible("totalBilled") && (
                        <td className="py-2.5 px-3 text-right font-bold text-xs text-[var(--ui-text)] whitespace-nowrap">
                          ৳ {formatMoney(p.totalBilled)}
                        </td>
                      )}
                      {isColVisible("totalPaid") && (
                        <td className="py-2.5 px-3 text-right font-semibold text-xs text-[var(--ui-success-dark)] whitespace-nowrap">
                          ৳ {formatMoney(p.totalPaid)}
                        </td>
                      )}
                      {isColVisible("totalDue") && (
                        <td className="py-2.5 px-3 text-right text-xs whitespace-nowrap">
                          {hasDue ? (
                            <span className="text-[var(--ui-danger)] font-bold">
                              ৳ {formatMoney(p.totalDue)}
                            </span>
                          ) : (
                            <span className="text-[var(--ui-text-subtle)] font-normal">
                              ৳ 0
                            </span>
                          )}
                        </td>
                      )}
                      {isColVisible("lastDate") && (
                        <td className="py-2.5 px-3 text-center text-[var(--ui-text-muted)] whitespace-nowrap text-xs">
                          {p.lastDate
                            ? moment(p.lastDate).format("DD MMM, YYYY")
                            : "N/A"}
                        </td>
                      )}
                      {isColVisible("status") && (
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                              hasDue
                                ? "bg-[var(--ui-danger-light)] text-[var(--ui-danger-dark)] border-[var(--ui-danger-border)]"
                                : "bg-[var(--ui-success-light)] text-[var(--ui-success-dark)] border-[var(--ui-success-border)]"
                            }`}
                          >
                            {hasDue ? "Outstanding" : "Paid"}
                          </span>
                        </td>
                      )}
                      {isColVisible("actions") && (
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleExpand(p.partyName)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--color-primary)] bg-[var(--primary-color-light)]/60 hover:bg-[var(--color-primary)] hover:text-white rounded-md transition-colors cursor-pointer"
                            title="View Invoices"
                          >
                            <FiEye size={12} />
                            <span>{isExpanded ? "Hide" : "Invoices"}</span>
                          </button>
                        </td>
                      )}
                    </tr>

                    {/* Expanded Invoices Row */}
                    {isExpanded && (
                      <tr className="bg-[var(--ui-surface-muted)]/20 border-b border-[var(--ui-border)]">
                        <td
                          colSpan={activeVisibleColumnCount}
                          className="p-2 sm:p-3 text-left"
                        >
                          <div className="bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg shadow-xs overflow-hidden">
                            {/* Header of expanded section */}
                            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[var(--ui-surface-muted)]/50 border-b border-[var(--ui-border)]">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold text-xs">
                                  {domain === "sale" ? (
                                    <FaShoppingCart size={11} />
                                  ) : (
                                    <FaShoppingBag size={11} />
                                  )}
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-[var(--ui-text)]">
                                    {labels.invoiceSectionTitle}{" "}
                                    <span className="text-[var(--color-primary)]">
                                      {p.partyName}
                                    </span>
                                  </span>
                                  <span className="text-[11px] text-[var(--ui-text-muted)] ml-2 font-medium">
                                    ({partyInvoices.length}{" "}
                                    {partyInvoices.length === 1
                                      ? labels.invoiceSingleLabel
                                      : labels.invoicePluralLabel}
                                    )
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {onExportPartyInvoicesExcel && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await onExportPartyInvoicesExcel(
                                          partyInvoices,
                                          p.partyName,
                                          companyMeta
                                        );
                                        showSuccessToast(
                                          `Exported ${partyInvoices.length} invoices for ${p.partyName} to Excel!`
                                        );
                                      } catch (e: any) {
                                        console.error(e);
                                      }
                                    }}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[var(--ui-success-dark)] bg-[var(--ui-success-light)] border border-[var(--ui-success-border)] rounded-md hover:bg-[var(--ui-success)]/20 transition-colors cursor-pointer"
                                    title={`Export ${p.partyName}'s ${labels.invoicePluralLabel.toLowerCase()} to Excel`}
                                  >
                                    <FaFileExcel size={11} />
                                    <span>Excel</span>
                                  </button>
                                )}

                                {onDownloadPartyInvoicesPdf && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await onDownloadPartyInvoicesPdf(
                                          partyInvoices,
                                          p.partyName,
                                          companyMeta
                                        );
                                      } catch (e: any) {
                                        console.error(e);
                                      }
                                    }}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-md transition-colors cursor-pointer"
                                    title={`Download ${p.partyName}'s ${labels.invoicePluralLabel.toLowerCase()} report PDF`}
                                  >
                                    <FaFilePdf size={11} />
                                    <span>Download PDF</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Table of invoices for this party */}
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHead>
                                  <TableTh align="center" width={40} className="whitespace-nowrap">
                                    SL
                                  </TableTh>
                                  <TableTh className="whitespace-nowrap">Order ID</TableTh>
                                  <TableTh align="center" className="whitespace-nowrap">Date</TableTh>
                                  <TableTh align="center" className="whitespace-nowrap">Items</TableTh>
                                  <TableTh align="right" className="whitespace-nowrap">Total Amount</TableTh>
                                  <TableTh align="right" className="whitespace-nowrap">Paid</TableTh>
                                  <TableTh align="right" className="whitespace-nowrap">Due</TableTh>
                                  <TableTh align="center" className="whitespace-nowrap">Method</TableTh>
                                  <TableTh align="center" className="whitespace-nowrap">Status</TableTh>
                                  {onViewInvoice && (
                                    <TableTh align="center" width={50} className="whitespace-nowrap">
                                      Action
                                    </TableTh>
                                  )}
                                </TableHead>
                                <TableBody>
                                  {partyInvoices.map((inv: any, iIdx: number) => {
                                    const m = extractTradeRecordMetrics(inv, domain, iIdx);
                                    const isDue = m.due > 0;

                                    return (
                                      <tr
                                        key={m.orderNo + iIdx}
                                        className="hover:bg-[var(--primary-color-light)]/40 transition-colors"
                                      >
                                        <td className="py-2.5 px-3 text-center text-[var(--ui-text)] font-semibold text-xs">
                                          {iIdx + 1}
                                        </td>
                                        <td className="py-2.5 px-3 font-medium text-[var(--ui-text)] text-xs whitespace-nowrap">
                                          <div className="flex items-center gap-1.5">
                                            <span>{m.orderNo}</span>
                                            <button
                                              type="button"
                                              onClick={() => handleCopyOrderId(m.orderNo)}
                                              title="Copy Order ID"
                                              className="text-[var(--ui-text-muted)] hover:text-[var(--color-primary)] cursor-pointer p-0.5"
                                            >
                                              {copiedOrderId === m.orderNo ? (
                                                <FiCheck
                                                  className="text-[var(--ui-success)]"
                                                  size={11}
                                                />
                                              ) : (
                                                <FiCopy size={11} />
                                              )}
                                            </button>
                                          </div>
                                        </td>
                                        <td className="py-2.5 px-3 text-center text-[var(--ui-text-muted)] whitespace-nowrap text-xs">
                                          {m.tradeDate
                                            ? moment(m.tradeDate).format("DD MMM, YYYY")
                                            : "N/A"}
                                        </td>
                                        <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)]">
                                          {m.itemsCount}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-bold text-xs text-[var(--ui-text)] whitespace-nowrap">
                                          ৳ {formatMoney(m.grandTotal)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-semibold text-xs text-[var(--ui-success-dark)] whitespace-nowrap">
                                          ৳ {formatMoney(m.paid)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-xs whitespace-nowrap">
                                          {isDue ? (
                                            <span className="text-[var(--ui-danger)] font-bold text-xs">
                                              ৳ {formatMoney(m.due)}
                                            </span>
                                          ) : (
                                            <span className="text-[var(--ui-text-subtle)] font-normal text-xs">
                                              ৳ 0
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 text-center text-xs whitespace-nowrap">
                                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--ui-surface-muted)] text-[var(--ui-text)] border border-[var(--ui-border)]">
                                            {m.paymentType || "CASH"}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-center text-xs whitespace-nowrap">
                                          <span
                                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                              isDue
                                                ? "bg-[var(--ui-danger-light)] text-[var(--ui-danger-dark)] border-[var(--ui-danger-border)]"
                                                : "bg-[var(--ui-success-light)] text-[var(--ui-success-dark)] border-[var(--ui-success-border)]"
                                            }`}
                                          >
                                            {isDue ? "Outstanding" : "Paid"}
                                          </span>
                                        </td>
                                        {onViewInvoice && (
                                          <td className="py-2.5 px-3 text-center text-xs whitespace-nowrap">
                                            <button
                                              type="button"
                                              onClick={() => onViewInvoice(inv)}
                                              className="p-1 rounded text-[var(--color-primary)] hover:bg-[var(--primary-color-light)] transition-colors cursor-pointer"
                                              title="View Invoice"
                                            >
                                              <FiEye size={13} />
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
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
      {paginated.length > 0 && (
        <TablePaginationFooter
          totalCount={totalCount}
          pageCount={pageCount}
          currentPageNumber={safePage}
          dataLimit={pageSize}
          setDataLimit={setPageSize}
          setCurrentPageNumber={setCurrentPage}
          handlePagination={(data) => setCurrentPage(data.selected + 1)}
          pageSizeOptions={[10, 20, 50]}
          entityLabel={labels.entityLabel}
        />
      )}
    </TableContainer>
  );
};

export default PartyTradeReportTable;

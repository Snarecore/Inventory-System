import React, { useState } from "react";
import moment from "moment";
import { FiChevronDown } from "react-icons/fi";
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
import {
  type TradeDomain,
  type PartyTradeSummary,
  type ReportCompanyMeta,
  type ReportDateFilterProps,
  aggregateTradeParties,
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
  excelSuccessText: (count: number) => string;
  pdfSuccessText: string;
}

const PARTY_LABELS: Record<
  TradeDomain,
  {
    searchPlaceholder: string;
    allStatusLabel: string;
    partyCol: string;
    emptyTitle: string;
    emptyDesc: string;
    entityLabel: string;
  }
> = {
  sale: {
    searchPlaceholder: "Search customer name, phone, address...",
    allStatusLabel: "All Customers",
    partyCol: "Customer Name",
    emptyTitle: "No Customers Found",
    emptyDesc: "No customer accounts match the current filter criteria.",
    entityLabel: "customers",
  },
  purchase: {
    searchPlaceholder: "Search supplier name, phone, address...",
    allStatusLabel: "All Suppliers",
    partyCol: "Supplier Name",
    emptyTitle: "No Suppliers Found",
    emptyDesc: "No supplier accounts match the current filter criteria.",
    entityLabel: "suppliers",
  },
};

/**
 * Shared Party-Wise (Customer / Supplier) Trade Report table preserving separate Phone & Address columns
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
  excelSuccessText,
  pdfSuccessText,
}) => {
  const labels = PARTY_LABELS[domain];
  const companyMeta = useReportCompanyMeta(startDate, endDate);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("billed_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const availableColumns: ColumnItem[] = [
    { key: "sl", label: "SL" },
    { key: "partyName", label: labels.partyCol },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "orders", label: "Orders" },
    { key: "totalBilled", label: "Gross Billed (৳)" },
    { key: "totalPaid", label: "Total Paid (৳)" },
    { key: "totalDue", label: "Outstanding Due (৳)" },
    { key: "lastDate", label: "Last Order" },
    { key: "status", label: "Status" },
  ];

  const {
    visibleColumns,
    isColVisible,
    handleToggleColumn,
    handleResetColumns,
    activeVisibleColumnCount,
  } = useColumnVisibility(availableColumns, `party_${domain}_report_columns`);

  const partySummaries = aggregateTradeParties(transactions, domain);

  const filtered = partySummaries
    .filter((p) => {
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

  const totalCount = filtered.length;
  const pageCount = Math.ceil(totalCount / pageSize) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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
            className="w-36 shrink-0"
            options={[
              { value: "all", label: labels.allStatusLabel },
              { value: "due_only", label: "With Outstanding Due" },
              { value: "cleared_only", label: "Settled / Zero Due" },
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

          <ColumnVisibilityDropdown
            columns={availableColumns}
            visibleColumns={visibleColumns}
            onToggle={handleToggleColumn}
            onReset={handleResetColumns}
          />

          <ReportExportButtons
            onExportExcel={async () => {
              const count = await onExportExcel(
                filtered,
                companyMeta,
                visibleColumns
              );
              return excelSuccessText(count);
            }}
            onDownloadPdf={async () => {
              await onDownloadPdf(filtered, companyMeta, visibleColumns);
              return pdfSuccessText;
            }}
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
              {isColVisible("sl") && <TableTh align="center" width={40} className="whitespace-nowrap">SL</TableTh>}
              {isColVisible("partyName") && <TableTh className="whitespace-nowrap">{labels.partyCol}</TableTh>}
              {isColVisible("phone") && <TableTh className="whitespace-nowrap">Phone</TableTh>}
              {isColVisible("address") && <TableTh className="whitespace-nowrap">Address</TableTh>}
              {isColVisible("orders") && <TableTh align="center" className="whitespace-nowrap">Orders</TableTh>}
              {isColVisible("totalBilled") && <TableTh align="right" className="whitespace-nowrap">Gross Billed (৳)</TableTh>}
              {isColVisible("totalPaid") && <TableTh align="right" className="whitespace-nowrap">Total Paid (৳)</TableTh>}
              {isColVisible("totalDue") && <TableTh align="right" className="whitespace-nowrap">Outstanding Due (৳)</TableTh>}
              {isColVisible("lastDate") && <TableTh align="center" className="whitespace-nowrap">Last Order</TableTh>}
              {isColVisible("status") && <TableTh align="center" className="whitespace-nowrap">Status</TableTh>}
            </TableHead>
            <TableBody>
              {paginated.map((p, idx) => {
                const hasDue = p.totalDue > 0;

                return (
                  <tr
                    key={p.partyName + idx}
                    className="hover:bg-[var(--primary-color-light)]/40 transition-colors"
                  >
                    {isColVisible("sl") && (
                      <td className="py-2.5 px-3 text-center text-[var(--ui-text)] font-semibold text-xs">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                    )}
                    {isColVisible("partyName") && (
                      <td className="py-2.5 px-3 font-medium text-[var(--ui-text)] text-xs whitespace-nowrap">
                        {p.partyName}
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
                      <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)]">
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
                          {hasDue ? "Has Due" : "Settled"}
                        </span>
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
      {paginated.length > 0 && (
        <TablePaginationFooter
          totalCount={totalCount}
          pageCount={pageCount}
          currentPageNumber={currentPage}
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

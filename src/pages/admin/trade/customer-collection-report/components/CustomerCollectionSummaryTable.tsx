import React, { useMemo, useState } from "react";
import { FiChevronDown, FiRotateCcw } from "react-icons/fi";
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
import {
  type NormalizedCollectionRecord,
  type NormalizedCustomerDueRow,
  aggregateCustomerCollections,
  exportCustomerCollectionSummaryExcel,
  downloadCustomerCollectionSummaryPdf,
} from "../utils/customer-collection-report-helpers";

interface CustomerCollectionSummaryTableProps extends ReportDateFilterProps {
  collections: NormalizedCollectionRecord[];
  dueRows: NormalizedCustomerDueRow[];
  isLoading?: boolean;
}

const AVAILABLE_COLUMNS: ColumnItem[] = [
  { key: "sl", label: "SL" },
  { key: "customerName", label: "Customer Name" },
  { key: "phone", label: "Phone" },
  { key: "voucherCount", label: "Vouchers" },
  { key: "billsSettled", label: "Bills Settled" },
  { key: "cashPaid", label: "Cash Paid (৳)" },
  { key: "digitalPaid", label: "Bank / MFS (৳)" },
  { key: "totalDiscount", label: "Discount (৳)" },
  { key: "totalCollected", label: "Total Collected (৳)" },
  { key: "currentDue", label: "Remaining Due (৳)" },
  { key: "lastCollectionDate", label: "Last Collection" },
];

export const CustomerCollectionSummaryTable: React.FC<
  CustomerCollectionSummaryTableProps
> = ({ collections, dueRows, isLoading, ...dateFilterProps }) => {
  const companyMeta = useReportCompanyMeta(
    dateFilterProps.startDate,
    dateFilterProps.endDate
  );

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [sortBy, setSortBy] = useState<string>("collected_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const {
    visibleColumns,
    isColVisible,
    handleToggleColumn,
    handleResetColumns,
    activeVisibleColumnCount,
  } = useColumnVisibility(
    AVAILABLE_COLUMNS,
    "customer_collection_report_customers_columns"
  );

  const summaries = useMemo(
    () => aggregateCustomerCollections(collections, dueRows),
    [collections, dueRows]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const list = q
      ? summaries.filter(
          (c) =>
            c.customerName.toLowerCase().includes(q) ||
            c.customerPhone.toLowerCase().includes(q)
        )
      : summaries;

    return [...list].sort((a, b) => {
      if (sortBy === "due_desc") return b.currentDue - a.currentDue;
      if (sortBy === "vouchers_desc") return b.voucherCount - a.voucherCount;
      if (sortBy === "name_asc")
        return a.customerName.localeCompare(b.customerName);
      return b.totalCollected - a.totalCollected;
    });
  }, [summaries, debouncedSearch, sortBy]);

  const totalCount = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const hasActiveFilter =
    searchQuery.trim() !== "" || sortBy !== "collected_desc";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSortBy("collected_desc");
    setCurrentPage(1);
  };

  return (
    <TableContainer>
      <TableToolbar>
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <ReportDateRangeControl
            {...dateFilterProps}
            onAfterChange={() => setCurrentPage(1)}
          />

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
              placeholder="Search customer, phone..."
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
              <option value="collected_desc">Highest Collected</option>
              <option value="due_desc">Highest Remaining Due</option>
              <option value="vouchers_desc">Most Vouchers</option>
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
              const count = await exportCustomerCollectionSummaryExcel(
                filtered,
                companyMeta,
                visibleColumns
              );
              return `Exported ${count} customer collection summaries to Excel!`;
            }}
            onDownloadPdf={async () => {
              await downloadCustomerCollectionSummaryPdf(
                filtered,
                companyMeta,
                visibleColumns
              );
              return "Customer-wise collection summary PDF downloaded!";
            }}
          />
        </div>
      </TableToolbar>

      <TableScroll>
        {isLoading && collections.length === 0 ? (
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={6} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title="No Customer Collection Data Found"
            description="No customer collections match the selected date range or search."
          />
        ) : (
          <Table>
            <TableHead>
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
              {isColVisible("voucherCount") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Vouchers
                </TableTh>
              )}
              {isColVisible("billsSettled") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Bills Settled
                </TableTh>
              )}
              {isColVisible("cashPaid") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Cash (৳)
                </TableTh>
              )}
              {isColVisible("digitalPaid") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Bank / MFS (৳)
                </TableTh>
              )}
              {isColVisible("totalDiscount") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Discount (৳)
                </TableTh>
              )}
              {isColVisible("totalCollected") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Collected (৳)
                </TableTh>
              )}
              {isColVisible("currentDue") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Remaining Due (৳)
                </TableTh>
              )}
              {isColVisible("lastCollectionDate") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Last Collection
                </TableTh>
              )}
            </TableHead>

            <TableBody>
              {paginated.map((c, idx) => {
                const sl = (safePage - 1) * pageSize + idx + 1;

                return (
                  <tr
                    key={`${c.customerKey}_${idx}`}
                    className="hover:bg-[var(--primary-color-light)]/40 transition-colors"
                  >
                    {isColVisible("sl") && (
                      <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                        {sl}
                      </td>
                    )}
                    {isColVisible("customerName") && (
                      <td className="py-2.5 px-3 text-xs font-semibold text-[var(--ui-text)] max-w-[200px] truncate">
                        {c.customerName}
                      </td>
                    )}
                    {isColVisible("phone") && (
                      <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                        {c.customerPhone}
                      </td>
                    )}
                    {isColVisible("voucherCount") && (
                      <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                        {c.voucherCount}
                      </td>
                    )}
                    {isColVisible("billsSettled") && (
                      <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                        {c.billsSettled}
                      </td>
                    )}
                    {isColVisible("cashPaid") && (
                      <td className="py-2.5 px-3 text-right text-xs text-[var(--ui-text)] tabular-nums whitespace-nowrap">
                        ৳ {formatMoney(c.cashPaid)}
                      </td>
                    )}
                    {isColVisible("digitalPaid") && (
                      <td className="py-2.5 px-3 text-right text-xs text-[var(--primary-color)] tabular-nums whitespace-nowrap">
                        {c.digitalPaid > 0
                          ? `৳ ${formatMoney(c.digitalPaid)}`
                          : "-"}
                      </td>
                    )}
                    {isColVisible("totalDiscount") && (
                      <td className="py-2.5 px-3 text-right text-xs text-amber-600 tabular-nums whitespace-nowrap">
                        {c.totalDiscount > 0
                          ? `৳ ${formatMoney(c.totalDiscount)}`
                          : "-"}
                      </td>
                    )}
                    {isColVisible("totalCollected") && (
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-[var(--ui-success)] tabular-nums whitespace-nowrap">
                        ৳ {formatMoney(c.totalCollected)}
                      </td>
                    )}
                    {isColVisible("currentDue") && (
                      <td className="py-2.5 px-3 text-right text-xs font-semibold tabular-nums whitespace-nowrap">
                        {c.currentDue > 0 ? (
                          <span className="text-[var(--ui-danger)]">
                            ৳ {formatMoney(c.currentDue)}
                          </span>
                        ) : (
                          <span className="text-[var(--ui-text-subtle)]">-</span>
                        )}
                      </td>
                    )}
                    {isColVisible("lastCollectionDate") && (
                      <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                        {formatShortReportDate(c.lastCollectionDate)}
                      </td>
                    )}
                  </tr>
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
          entityLabel="customers"
        />
      )}
    </TableContainer>
  );
};

export default CustomerCollectionSummaryTable;

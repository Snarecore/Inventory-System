import React, { useMemo, useState } from "react";
import { FiChevronDown, FiRotateCcw } from "react-icons/fi";
import Search from "@/components/table-components/Search";
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
  calculateRevenueSharePct,
  formatShortReportDate,
} from "@/utils/trade-report-helpers";
import {
  type NormalizedCustomerDueRow,
  exportCustomerDueReportExcel,
  downloadCustomerDueReportPdf,
} from "../utils/customer-collection-report-helpers";

interface CustomerDueReportTableProps {
  dueRows: NormalizedCustomerDueRow[];
  isLoading?: boolean;
}

const AVAILABLE_COLUMNS: ColumnItem[] = [
  { key: "sl", label: "SL" },
  { key: "customerName", label: "Customer Name" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "invoiceCount", label: "Pending Invoices" },
  { key: "lastSaleDate", label: "Last Sale Date" },
  { key: "totalDue", label: "Outstanding Due (৳)" },
  { key: "dueShare", label: "Receivable Share" },
];

export const CustomerDueReportTable: React.FC<CustomerDueReportTableProps> = ({
  dueRows,
  isLoading,
}) => {
  const companyMeta = useReportCompanyMeta();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [sortBy, setSortBy] = useState<string>("due_desc");
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
    "customer_collection_report_dues_columns"
  );

  const grandTotalDue = useMemo(
    () => dueRows.reduce((sum, r) => sum + r.totalDue, 0),
    [dueRows]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const list = q
      ? dueRows.filter(
          (d) =>
            d.customerName.toLowerCase().includes(q) ||
            d.customerPhone.toLowerCase().includes(q) ||
            d.customerAddress.toLowerCase().includes(q)
        )
      : dueRows;

    return [...list].sort((a, b) => {
      if (sortBy === "due_asc") return a.totalDue - b.totalDue;
      if (sortBy === "invoices_desc") return b.invoiceCount - a.invoiceCount;
      if (sortBy === "name_asc")
        return a.customerName.localeCompare(b.customerName);
      return b.totalDue - a.totalDue;
    });
  }, [dueRows, debouncedSearch, sortBy]);

  const totalCount = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const hasActiveFilter = searchQuery.trim() !== "" || sortBy !== "due_desc";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSortBy("due_desc");
    setCurrentPage(1);
  };

  return (
    <TableContainer>
      <TableToolbar>
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="w-full sm:w-60 shrink-0">
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
              placeholder="Search customer, phone, address..."
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
              <option value="due_desc">Highest Due</option>
              <option value="due_asc">Lowest Due</option>
              <option value="invoices_desc">Most Pending Invoices</option>
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
              const count = await exportCustomerDueReportExcel(
                filtered,
                companyMeta,
                visibleColumns
              );
              return `Exported ${count} customer due records to Excel!`;
            }}
            onDownloadPdf={async () => {
              await downloadCustomerDueReportPdf(
                filtered,
                companyMeta,
                visibleColumns
              );
              return "Customer due report PDF downloaded!";
            }}
          />
        </div>
      </TableToolbar>

      <TableScroll>
        {isLoading && dueRows.length === 0 ? (
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={6} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title="No Outstanding Customer Dues"
            description="No customers currently match the receivable filter or have unpaid balances."
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
              {isColVisible("address") && (
                <TableTh className="whitespace-nowrap">Address</TableTh>
              )}
              {isColVisible("invoiceCount") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Pending Invoices
                </TableTh>
              )}
              {isColVisible("lastSaleDate") && (
                <TableTh align="center" className="w-px whitespace-nowrap">
                  Last Sale Date
                </TableTh>
              )}
              {isColVisible("totalDue") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Outstanding Due (৳)
                </TableTh>
              )}
              {isColVisible("dueShare") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Share
                </TableTh>
              )}
            </TableHead>

            <TableBody>
              {paginated.map((d, idx) => {
                const sl = (safePage - 1) * pageSize + idx + 1;
                const sharePct = calculateRevenueSharePct(
                  d.totalDue,
                  grandTotalDue
                );

                return (
                  <tr
                    key={`${d.customerKey}_${idx}`}
                    className="hover:bg-[var(--primary-color-light)]/40 transition-colors"
                  >
                    {isColVisible("sl") && (
                      <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                        {sl}
                      </td>
                    )}
                    {isColVisible("customerName") && (
                      <td className="py-2.5 px-3 text-xs font-semibold text-[var(--ui-text)] max-w-[200px] truncate">
                        {d.customerName}
                      </td>
                    )}
                    {isColVisible("phone") && (
                      <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                        {d.customerPhone}
                      </td>
                    )}
                    {isColVisible("address") && (
                      <td
                        className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] max-w-[210px] truncate"
                        title={d.customerAddress}
                      >
                        {d.customerAddress}
                      </td>
                    )}
                    {isColVisible("invoiceCount") && (
                      <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                        <span className="inline-flex px-2 py-0.5 rounded bg-[var(--ui-surface-sunken)] border border-[var(--ui-border)] text-[11px] font-medium">
                          {d.invoiceCount}
                        </span>
                      </td>
                    )}
                    {isColVisible("lastSaleDate") && (
                      <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                        {formatShortReportDate(d.lastSaleDate)}
                      </td>
                    )}
                    {isColVisible("totalDue") && (
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-[var(--ui-danger)] tabular-nums whitespace-nowrap">
                        ৳ {formatMoney(d.totalDue)}
                      </td>
                    )}
                    {isColVisible("dueShare") && (
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-[var(--ui-text)] tabular-nums whitespace-nowrap">
                        {sharePct}%
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

export default CustomerDueReportTable;

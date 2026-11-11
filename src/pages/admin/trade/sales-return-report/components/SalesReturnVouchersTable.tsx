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
  TableActionButtons,
  EmptyState,
} from "@/components/common";
import { formatMoney } from "@/utils/formatters";
import { useDebounce } from "@/hooks/useDebounce";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import {
  useReportCompanyMeta,
  formatShortReportDate,
  parseFlexibleReportDate,
  type ReportDateFilterProps,
} from "@/utils/trade-report-helpers";
import type { SalesReturnItem } from "@/types";
import {
  type NormalizedSalesReturnRecord,
  exportSalesReturnVouchersExcel,
  downloadSalesReturnVouchersPdf,
} from "../utils/sales-return-report-helpers";

interface SalesReturnVouchersTableProps extends ReportDateFilterProps {
  records: NormalizedSalesReturnRecord[];
  isLoading?: boolean;
  onView: (item: SalesReturnItem) => void;
  onPrint: (item: SalesReturnItem) => void;
}

const AVAILABLE_COLUMNS: ColumnItem[] = [
  { key: "sl", label: "SL" },
  { key: "returnNo", label: "Return No" },
  { key: "orderId", label: "Order ID" },
  { key: "returnDate", label: "Return Date" },
  { key: "customer", label: "Customer" },
  { key: "phone", label: "Phone" },
  { key: "items", label: "Items" },
  { key: "reason", label: "Reason / Remarks" },
  { key: "refundMode", label: "Refund Mode" },
  { key: "refundAmount", label: "Refund Amount (৳)" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
];

export const SalesReturnVouchersTable: React.FC<
  SalesReturnVouchersTableProps
> = ({ records, isLoading, onView, onPrint, ...dateFilterProps }) => {
  const companyMeta = useReportCompanyMeta(
    dateFilterProps.startDate,
    dateFilterProps.endDate
  );

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("latest");
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
    "sales_return_report_vouchers_columns"
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();

    const list = records.filter((r) => {
      if (modeFilter === "CREDIT" && !r.isCreditAdjust) return false;
      if (modeFilter === "CASH" && (r.isCreditAdjust || r.paymentType.includes("BANK") || r.paymentType.includes("MFS"))) return false;
      if (modeFilter === "BANK" && !r.paymentType.includes("BANK")) return false;
      if (modeFilter === "MFS" && !r.paymentType.includes("MFS")) return false;

      if (q) {
        const matches =
          r.returnNo.toLowerCase().includes(q) ||
          r.orderNo.toLowerCase().includes(q) ||
          r.salesInvoiceNo.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.customerPhone.toLowerCase().includes(q) ||
          r.reasonSummary.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "amount_desc") return b.refundAmount - a.refundAmount;
      if (sortBy === "amount_asc") return a.refundAmount - b.refundAmount;
      const tA = parseFlexibleReportDate(a.returnDate)?.valueOf() || 0;
      const tB = parseFlexibleReportDate(b.returnDate)?.valueOf() || 0;
      return sortBy === "oldest" ? tA - tB : tB - tA;
    });
  }, [records, modeFilter, debouncedSearch, sortBy]);

  const totalCount = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const hasActiveFilter =
    searchQuery.trim() !== "" || modeFilter !== "all" || sortBy !== "latest";

  const handleResetFilters = () => {
    setSearchQuery("");
    setModeFilter("all");
    setSortBy("latest");
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
              placeholder="Search return, order id, customer..."
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={modeFilter}
              onChange={(e) => {
                setModeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 pl-2.5 pr-7 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg text-[var(--ui-text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] appearance-none cursor-pointer font-medium"
            >
              <option value="all">All Modes</option>
              <option value="CASH">Cash Refund</option>
              <option value="CREDIT">Credit / Due Adjust</option>
              <option value="BANK">Bank Transfer</option>
              <option value="MFS">MFS</option>
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)] pointer-events-none"
              size={12}
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
              <option value="latest">Latest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount_desc">Highest Refund</option>
              <option value="amount_asc">Lowest Refund</option>
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
              const count = await exportSalesReturnVouchersExcel(
                filtered,
                companyMeta,
                visibleColumns
              );
              return `Exported ${count} sales return records to Excel!`;
            }}
            onDownloadPdf={async () => {
              await downloadSalesReturnVouchersPdf(
                filtered,
                companyMeta,
                visibleColumns
              );
              return "Sales return report PDF downloaded!";
            }}
          />
        </div>
      </TableToolbar>

      <TableScroll>
        {isLoading && records.length === 0 ? (
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={6} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title="No Sales Return Records Found"
            description="No sales returns match the selected date range or filters."
            buttonText={hasActiveFilter ? "Reset Filters" : undefined}
            onButtonClick={hasActiveFilter ? handleResetFilters : undefined}
          />
        ) : (
          <Table>
            <TableHead>
              {isColVisible("sl") && (
                <TableTh align="center" width={42} className="whitespace-nowrap">
                  SL
                </TableTh>
              )}
              {isColVisible("returnNo") && (
                <TableTh className="w-px whitespace-nowrap">Return No</TableTh>
              )}
              {isColVisible("orderId") && (
                <TableTh className="w-px whitespace-nowrap">
                  Order ID
                </TableTh>
              )}
              {isColVisible("returnDate") && (
                <TableTh className="w-px whitespace-nowrap">
                  Return Date
                </TableTh>
              )}
              {isColVisible("customer") && (
                <TableTh className="whitespace-nowrap">Customer</TableTh>
              )}
              {isColVisible("phone") && (
                <TableTh className="whitespace-nowrap">Phone</TableTh>
              )}
              {isColVisible("items") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Items
                </TableTh>
              )}
              {isColVisible("reason") && (
                <TableTh className="whitespace-nowrap">
                  Reason / Remarks
                </TableTh>
              )}
              {isColVisible("refundMode") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Refund Mode
                </TableTh>
              )}
              {isColVisible("refundAmount") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Refund (৳)
                </TableTh>
              )}
              {isColVisible("status") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Status
                </TableTh>
              )}
              {isColVisible("actions") && (
                <TableTh align="center" width={76} className="whitespace-nowrap">
                  Actions
                </TableTh>
              )}
            </TableHead>

            <TableBody>
              {paginated.map((r, idx) => {
                const sl = (safePage - 1) * pageSize + idx + 1;
                const statusUpper = r.status.toUpperCase();
                const statusClass = statusUpper.includes("PENDING")
                  ? "bg-[var(--ui-warning-border)] text-[var(--ui-warning-dark)] border-[var(--ui-warning-border)]"
                  : statusUpper.includes("CANCEL") ||
                    statusUpper.includes("REJECT")
                  ? "bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)] border-[var(--ui-danger-border)]"
                  : "bg-[var(--ui-success-border)] text-[var(--ui-success-dark)] border-[var(--ui-success-border)]";

                return (
                  <tr
                    key={`${r.id}_${idx}`}
                    className="hover:bg-[var(--primary-color-light)]/40 transition-colors"
                  >
                    {isColVisible("sl") && (
                      <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                        {sl}
                      </td>
                    )}
                    {isColVisible("returnNo") && (
                      <td className="py-2.5 px-3 text-xs font-semibold text-[var(--primary-color)] whitespace-nowrap">
                        <span
                          onClick={() => onView(r.raw)}
                          className="cursor-pointer hover:underline"
                        >
                          {r.returnNo}
                        </span>
                      </td>
                    )}
                    {isColVisible("orderId") && (
                      <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                        {r.orderNo}
                      </td>
                    )}
                    {isColVisible("returnDate") && (
                      <td className="py-2.5 px-3 text-xs text-[var(--ui-text)] whitespace-nowrap">
                        {formatShortReportDate(r.returnDate)}
                      </td>
                    )}
                    {isColVisible("customer") && (
                      <td className="py-2.5 px-3 text-xs font-medium text-[var(--ui-text)] max-w-[180px] truncate">
                        {r.customerName}
                      </td>
                    )}
                    {isColVisible("phone") && (
                      <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                        {r.customerPhone || "-"}
                      </td>
                    )}
                    {isColVisible("items") && (
                      <td className="py-2.5 px-3 text-center text-xs tabular-nums whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 rounded bg-[var(--ui-surface-sunken)] border border-[var(--ui-border)] text-[11px] font-medium">
                          {r.itemsCount} {r.itemsCount === 1 ? "item" : "items"}
                        </span>
                      </td>
                    )}
                    {isColVisible("reason") && (
                      <td
                        className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] max-w-[190px] truncate"
                        title={r.reasonSummary}
                      >
                        {r.reasonSummary}
                      </td>
                    )}
                    {isColVisible("refundMode") && (
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded border bg-[var(--primary-color-muted)] text-[var(--primary-color-dark)] border-[var(--primary-color-muted)]">
                          {r.paymentType}
                        </span>
                      </td>
                    )}
                    {isColVisible("refundAmount") && (
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-[var(--ui-danger)] whitespace-nowrap tabular-nums">
                        ৳ {formatMoney(r.refundAmount)}
                      </td>
                    )}
                    {isColVisible("status") && (
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded-md border ${statusClass}`}
                        >
                          {r.status}
                        </span>
                      </td>
                    )}
                    {isColVisible("actions") && (
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <TableActionButtons
                          onView={() => onView(r.raw)}
                          onPrint={() => onPrint(r.raw)}
                          viewTitle="View Return Voucher"
                          printTitle="Print Return Voucher"
                        />
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
          entityLabel="returns"
        />
      )}
    </TableContainer>
  );
};

export default SalesReturnVouchersTable;

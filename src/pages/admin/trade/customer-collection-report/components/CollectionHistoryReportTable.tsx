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
  TableFilterSelect,
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
import type { CollectionReceiptData } from "@/pages/admin/trade/customer-collection/components/CollectionReceiptModal";
import {
  type NormalizedCollectionRecord,
  exportCollectionVouchersExcel,
  downloadCollectionVouchersPdf,
} from "../utils/customer-collection-report-helpers";

interface CollectionHistoryReportTableProps extends ReportDateFilterProps {
  records: NormalizedCollectionRecord[];
  isLoading?: boolean;
  onViewReceipt: (receipt: CollectionReceiptData) => void;
}

const AVAILABLE_COLUMNS: ColumnItem[] = [
  { key: "sl", label: "SL" },
  { key: "collectionDate", label: "Date" },
  { key: "voucherNo", label: "Voucher No" },
  { key: "customer", label: "Customer Name" },
  { key: "phone", label: "Phone" },
  { key: "method", label: "Method" },
  { key: "bills", label: "Adjusted Bills" },
  { key: "discount", label: "Discount (৳)" },
  { key: "collected", label: "Collected (৳)" },
  { key: "remark", label: "Remark" },
  { key: "actions", label: "Actions" },
];

export const CollectionHistoryReportTable: React.FC<
  CollectionHistoryReportTableProps
> = ({ records, isLoading, onViewReceipt, ...dateFilterProps }) => {
  const companyMeta = useReportCompanyMeta(
    dateFilterProps.startDate,
    dateFilterProps.endDate
  );

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [methodFilter, setMethodFilter] = useState<string>("all");
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
    "customer_collection_report_vouchers_columns"
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();

    const list = records.filter((r) => {
      if (
        methodFilter !== "all" &&
        !r.paymentMode.toLowerCase().includes(methodFilter.toLowerCase())
      ) {
        return false;
      }

      if (q) {
        const matches =
          r.voucherNo.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.customerPhone.toLowerCase().includes(q) ||
          r.billsSummary.toLowerCase().includes(q) ||
          r.remark.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "amount_desc") return b.totalAmount - a.totalAmount;
      if (sortBy === "amount_asc") return a.totalAmount - b.totalAmount;
      const tA = parseFlexibleReportDate(a.collectionDate)?.valueOf() || 0;
      const tB = parseFlexibleReportDate(b.collectionDate)?.valueOf() || 0;
      return sortBy === "oldest" ? tA - tB : tB - tA;
    });
  }, [records, methodFilter, debouncedSearch, sortBy]);

  const totalCount = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const hasActiveFilter =
    searchQuery.trim() !== "" || methodFilter !== "all" || sortBy !== "latest";

  const handleResetFilters = () => {
    setSearchQuery("");
    setMethodFilter("all");
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
              placeholder="Search voucher, customer, bill..."
            />
          </div>

          <TableFilterSelect
            value={methodFilter}
            onChange={(val) => {
              setMethodFilter(val);
              setCurrentPage(1);
            }}
            className="shrink-0"
            options={[
              { value: "all", label: "All Methods" },
              { value: "cash", label: "Cash" },
              { value: "bank", label: "Bank / Card" },
              { value: "mfs", label: "MFS" },
            ]}
          />

          <TableFilterSelect
            value={sortBy}
            onChange={(val) => {
              setSortBy(val);
              setCurrentPage(1);
            }}
            isFiltered={sortBy !== "latest"}
            className="shrink-0"
            options={[
              { value: "latest", label: "Latest First" },
              { value: "oldest", label: "Oldest First" },
              { value: "amount_desc", label: "Highest Amount" },
              { value: "amount_asc", label: "Lowest Amount" },
            ]}
          />

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
              const count = await exportCollectionVouchersExcel(
                filtered,
                companyMeta,
                visibleColumns
              );
              return `Exported ${count} collection vouchers to Excel!`;
            }}
            onDownloadPdf={async () => {
              await downloadCollectionVouchersPdf(
                filtered,
                companyMeta,
                visibleColumns
              );
              return "Customer collection report PDF downloaded!";
            }}
          />
        </div>
      </TableToolbar>

      <TableScroll>
        {isLoading && records.length === 0 ? (
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={6} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title="No Collection Vouchers Found"
            description="No customer collection records match the selected date range or filters."
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
              {isColVisible("collectionDate") && (
                <TableTh className="w-px whitespace-nowrap">Date</TableTh>
              )}
              {isColVisible("voucherNo") && (
                <TableTh className="w-px whitespace-nowrap">Voucher No</TableTh>
              )}
              {isColVisible("customer") && (
                <TableTh className="whitespace-nowrap">Customer Name</TableTh>
              )}
              {isColVisible("phone") && (
                <TableTh className="whitespace-nowrap">Phone</TableTh>
              )}
              {isColVisible("method") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Method
                </TableTh>
              )}
              {isColVisible("bills") && (
                <TableTh className="whitespace-nowrap">Adjusted Bills</TableTh>
              )}
              {isColVisible("discount") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Discount (৳)
                </TableTh>
              )}
              {isColVisible("collected") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Collected (৳)
                </TableTh>
              )}
              {isColVisible("remark") && (
                <TableTh className="whitespace-nowrap">Remark</TableTh>
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
                    {isColVisible("collectionDate") && (
                      <td className="py-2.5 px-3 text-xs text-[var(--ui-text)] whitespace-nowrap">
                        {formatShortReportDate(r.collectionDate)}
                      </td>
                    )}
                    {isColVisible("voucherNo") && (
                      <td className="py-2.5 px-3 text-xs font-semibold text-[var(--primary-color)] whitespace-nowrap">
                        <span
                          onClick={() => onViewReceipt(r.receiptData)}
                          className="cursor-pointer hover:underline"
                        >
                          {r.voucherNo}
                        </span>
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
                    {isColVisible("method") && (
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded border bg-[var(--primary-color-muted)] text-[var(--primary-color-dark)] border-[var(--primary-color-muted)]">
                          {r.paymentMode}
                        </span>
                      </td>
                    )}
                    {isColVisible("bills") && (
                      <td
                        className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] max-w-[180px] truncate"
                        title={r.billsSummary}
                      >
                        {r.billsSummary}
                      </td>
                    )}
                    {isColVisible("discount") && (
                      <td className="py-2.5 px-3 text-right text-xs text-amber-600 whitespace-nowrap tabular-nums">
                        {r.totalDiscount > 0
                          ? `৳ ${formatMoney(r.totalDiscount)}`
                          : "-"}
                      </td>
                    )}
                    {isColVisible("collected") && (
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-[var(--ui-success)] whitespace-nowrap tabular-nums">
                        ৳ {formatMoney(r.totalAmount)}
                      </td>
                    )}
                    {isColVisible("remark") && (
                      <td
                        className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] max-w-[170px] truncate"
                        title={r.remark}
                      >
                        {r.remark}
                      </td>
                    )}
                    {isColVisible("actions") && (
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <TableActionButtons
                          onPrint={() => onViewReceipt(r.receiptData)}
                          onView={() => onViewReceipt(r.receiptData)}
                          viewTitle="View Collection Receipt"
                          printTitle="Print Collection Receipt"
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
          handlePagination={(d) => setCurrentPage(d.selected + 1)}
          entityLabel="vouchers"
        />
      )}
    </TableContainer>
  );
};

export default CollectionHistoryReportTable;

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
  type NormalizedPurchaseReturnRecord,
  aggregatePurchaseReturnSuppliers,
  exportSupplierPurchaseReturnSummaryExcel,
  downloadSupplierPurchaseReturnSummaryPdf,
} from "../utils/purchase-return-report-helpers";

interface SupplierReturnReportTableProps extends ReportDateFilterProps {
  records: NormalizedPurchaseReturnRecord[];
  isLoading?: boolean;
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
];

export const SupplierReturnReportTable: React.FC<
  SupplierReturnReportTableProps
> = ({ records, isLoading, ...dateFilterProps }) => {
  const companyMeta = useReportCompanyMeta(
    dateFilterProps.startDate,
    dateFilterProps.endDate
  );

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [sortBy, setSortBy] = useState<string>("amount_desc");
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
    "purchase_return_report_suppliers_columns"
  );

  const suppliers = useMemo(
    () => aggregatePurchaseReturnSuppliers(records),
    [records]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const list = q
      ? suppliers.filter(
          (s) =>
            s.supplierName.toLowerCase().includes(q) ||
            s.supplierPhone.toLowerCase().includes(q)
        )
      : suppliers;

    return [...list].sort((a, b) => {
      if (sortBy === "returns_desc") return b.returnCount - a.returnCount;
      if (sortBy === "name_asc")
        return a.supplierName.localeCompare(b.supplierName);
      return b.totalRefund - a.totalRefund;
    });
  }, [suppliers, debouncedSearch, sortBy]);

  const totalCount = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const totals = useMemo(() => {
    return filtered.reduce(
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
  }, [filtered]);

  const hasActiveFilter = searchQuery.trim() !== "" || sortBy !== "amount_desc";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSortBy("amount_desc");
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
                filtered,
                companyMeta,
                visibleColumns
              );
              return `Exported ${count} supplier return records to Excel!`;
            }}
            onDownloadPdf={async () => {
              await downloadSupplierPurchaseReturnSummaryPdf(
                filtered,
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
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={6} />
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
            </TableHead>

            <TableBody>
              {paginated.map((s, index) => {
                const slNumber = (safePage - 1) * pageSize + index + 1;
                return (
                  <tr
                    key={s.supplierKey}
                    className="hover:bg-[var(--primary-color-light)]/40 transition-colors"
                  >
                    {isColVisible("sl") && (
                      <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                        {slNumber}
                      </td>
                    )}

                    {isColVisible("supplierName") && (
                      <td className="py-2.5 px-3 text-left font-semibold text-xs text-[var(--ui-text)]">
                        {s.supplierName}
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
                  </tr>
                );
              })}

              {/* Grand Total Summary Row */}
              <tr className="bg-[var(--ui-surface-muted)]/70 font-bold border-t-2 border-[var(--ui-border)] text-xs text-[var(--ui-text)]">
                <td
                  colSpan={
                    [
                      isColVisible("sl"),
                      isColVisible("supplierName"),
                      isColVisible("phone"),
                    ].filter(Boolean).length
                  }
                  className="py-2.5 px-3 text-left font-bold"
                >
                  Grand Total ({filtered.length} Suppliers)
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

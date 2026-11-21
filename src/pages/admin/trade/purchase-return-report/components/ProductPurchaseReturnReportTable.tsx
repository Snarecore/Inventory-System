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
  calculateRevenueSharePct,
  type ReportDateFilterProps,
} from "@/utils/trade-report-helpers";
import {
  type NormalizedPurchaseReturnRecord,
  aggregatePurchaseReturnProducts,
  exportProductPurchaseReturnSummaryExcel,
  downloadProductPurchaseReturnSummaryPdf,
} from "../utils/purchase-return-report-helpers";

interface ProductPurchaseReturnReportTableProps extends ReportDateFilterProps {
  records: NormalizedPurchaseReturnRecord[];
  isLoading?: boolean;
}

const AVAILABLE_COLUMNS: ColumnItem[] = [
  { key: "sl", label: "SL" },
  { key: "productCode", label: "Product Code" },
  { key: "productName", label: "Product" },
  { key: "unit", label: "Unit" },
  { key: "topReason", label: "Top Reason" },
  { key: "returnCount", label: "Vouchers" },
  { key: "quantity", label: "Returned Qty" },
  { key: "avgRate", label: "Unit Price (৳)" },
  { key: "amount", label: "Refund Value (৳)" },
  { key: "share", label: "Return Share" },
];

export const ProductPurchaseReturnReportTable: React.FC<
  ProductPurchaseReturnReportTableProps
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
    "purchase_return_report_products_columns"
  );

  const products = useMemo(
    () => aggregatePurchaseReturnProducts(records),
    [records]
  );

  const grandTotalAmount = useMemo(
    () => products.reduce((sum, p) => sum + p.totalAmount, 0),
    [products]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const list = q
      ? products.filter(
          (p) =>
            p.productName.toLowerCase().includes(q) ||
            p.productCode.toLowerCase().includes(q) ||
            p.topReason.toLowerCase().includes(q)
        )
      : products;

    return [...list].sort((a, b) => {
      if (sortBy === "qty_desc") return b.totalQuantity - a.totalQuantity;
      if (sortBy === "name_asc")
        return a.productName.localeCompare(b.productName);
      return b.totalAmount - a.totalAmount;
    });
  }, [products, debouncedSearch, sortBy]);

  const totalCount = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, p) => {
        acc.sumQuantity += p.totalQuantity;
        acc.sumAmount += p.totalAmount;
        acc.sumVouchers += p.returnCount;
        return acc;
      },
      { sumQuantity: 0, sumAmount: 0, sumVouchers: 0 }
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
              placeholder="Search product, code, reason..."
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
              <option value="amount_desc">Highest Refund Value</option>
              <option value="qty_desc">Most Returned Qty</option>
              <option value="name_asc">Product Name A–Z</option>
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
              const count = await exportProductPurchaseReturnSummaryExcel(
                filtered,
                companyMeta,
                visibleColumns
              );
              return `Exported ${count} returned products to Excel!`;
            }}
            onDownloadPdf={async () => {
              await downloadProductPurchaseReturnSummaryPdf(
                filtered,
                companyMeta,
                visibleColumns
              );
              return "Product purchase return report PDF downloaded!";
            }}
          />
        </div>
      </TableToolbar>

      <TableScroll>
        {isLoading && records.length === 0 ? (
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={6} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title="No Returned Products Found"
            description="No returned product items match your selected filters or date range."
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
              {isColVisible("productCode") && (
                <TableTh className="w-px whitespace-nowrap">Product Code</TableTh>
              )}
              {isColVisible("productName") && (
                <TableTh className="whitespace-nowrap">Product</TableTh>
              )}
              {isColVisible("unit") && (
                <TableTh align="center" className="w-px whitespace-nowrap">
                  Unit
                </TableTh>
              )}
              {isColVisible("topReason") && (
                <TableTh className="whitespace-nowrap">Top Reason</TableTh>
              )}
              {isColVisible("returnCount") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Vouchers
                </TableTh>
              )}
              {isColVisible("quantity") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Returned Qty
                </TableTh>
              )}
              {isColVisible("avgRate") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Unit Price (৳)
                </TableTh>
              )}
              {isColVisible("amount") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Refund Value (৳)
                </TableTh>
              )}
              {isColVisible("share") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Return Share
                </TableTh>
              )}
            </TableHead>

            <TableBody>
              {paginated.map((p, index) => {
                const slNumber = (safePage - 1) * pageSize + index + 1;
                const avgRate =
                  p.totalQuantity > 0 ? p.totalAmount / p.totalQuantity : 0;
                const sharePct = calculateRevenueSharePct(
                  p.totalAmount,
                  grandTotalAmount
                );

                return (
                  <tr
                    key={p.productKey}
                    className="hover:bg-[var(--primary-color-light)]/40 transition-colors"
                  >
                    {isColVisible("sl") && (
                      <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                        {slNumber}
                      </td>
                    )}

                    {isColVisible("productCode") && (
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-[var(--ui-text-muted)] whitespace-nowrap">
                        {p.productCode || "-"}
                      </td>
                    )}

                    {isColVisible("productName") && (
                      <td className="py-2.5 px-3 text-left font-semibold text-xs text-[var(--ui-text)]">
                        {p.productName}
                      </td>
                    )}

                    {isColVisible("unit") && (
                      <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text-muted)]">
                        {p.unit}
                      </td>
                    )}

                    {isColVisible("topReason") && (
                      <td className="py-2.5 px-3 text-left text-xs text-[var(--ui-text-muted)]">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] bg-[var(--ui-surface-muted)] text-[var(--ui-text)]">
                          {p.topReason}
                        </span>
                      </td>
                    )}

                    {isColVisible("returnCount") && (
                      <td className="py-2.5 px-3 text-center font-bold text-xs text-[var(--color-primary)]">
                        {p.returnCount}
                      </td>
                    )}

                    {isColVisible("quantity") && (
                      <td className="py-2.5 px-3 text-right font-bold text-xs text-[var(--ui-text)]">
                        {p.totalQuantity}
                      </td>
                    )}

                    {isColVisible("avgRate") && (
                      <td className="py-2.5 px-3 text-right font-medium text-xs text-[var(--ui-text-muted)]">
                        ৳ {formatMoney(avgRate)}
                      </td>
                    )}

                    {isColVisible("amount") && (
                      <td className="py-2.5 px-3 text-right font-bold text-xs text-rose-600 dark:text-rose-400">
                        ৳ {formatMoney(p.totalAmount)}
                      </td>
                    )}

                    {isColVisible("share") && (
                      <td className="py-2.5 px-3 text-right font-semibold text-xs text-[var(--color-primary)]">
                        {sharePct}%
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
                      isColVisible("productCode"),
                      isColVisible("productName"),
                      isColVisible("unit"),
                      isColVisible("topReason"),
                    ].filter(Boolean).length
                  }
                  className="py-2.5 px-3 text-left font-bold"
                >
                  Grand Total ({filtered.length} Products)
                </td>

                {isColVisible("returnCount") && (
                  <td className="py-2.5 px-3 text-center font-bold">
                    {totals.sumVouchers}
                  </td>
                )}

                {isColVisible("quantity") && (
                  <td className="py-2.5 px-3 text-right font-bold">
                    {totals.sumQuantity}
                  </td>
                )}

                {isColVisible("avgRate") && <td></td>}

                {isColVisible("amount") && (
                  <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                    ৳ {formatMoney(totals.sumAmount)}
                  </td>
                )}

                {isColVisible("share") && (
                  <td className="py-2.5 px-3 text-right font-bold">100%</td>
                )}
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
          entityLabel="products"
        />
      )}
    </TableContainer>
  );
};

export default ProductPurchaseReturnReportTable;

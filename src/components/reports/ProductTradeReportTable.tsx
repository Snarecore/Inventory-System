import React, { useState } from "react";
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
  type ProductTradeSummary,
  type ReportCompanyMeta,
  type ReportDateFilterProps,
  aggregateTradeProducts,
  calculateProductTotals,
  calculateRevenueSharePct,
  useReportCompanyMeta,
} from "@/utils/trade-report-helpers";

interface ProductTradeReportTableProps extends ReportDateFilterProps {
  domain: TradeDomain;
  transactions: any[];
  isLoading?: boolean;
  onExportExcel: (
    products: ProductTradeSummary[],
    meta: ReportCompanyMeta,
    visibleColumns?: Record<string, boolean>
  ) => Promise<number>;
  onDownloadPdf: (
    products: ProductTradeSummary[],
    meta: ReportCompanyMeta,
    visibleColumns?: Record<string, boolean>
  ) => Promise<void>;
  excelSuccessText: (count: number) => string;
  pdfSuccessText: string;
}

const DOMAIN_LABELS: Record<
  TradeDomain,
  {
    qtyCol: string;
    amountCol: string;
    highAmountOpt: string;
    lowAmountOpt: string;
    highQtyOpt: string;
    emptyTitle: string;
    emptyDesc: string;
  }
> = {
  sale: {
    qtyCol: "Qty Sold",
    amountCol: "Net Revenue (৳)",
    highAmountOpt: "Highest Revenue",
    lowAmountOpt: "Lowest Revenue",
    highQtyOpt: "Highest Qty Sold",
    emptyTitle: "No Product Sales Found",
    emptyDesc: "No line items found in the current transactions set.",
  },
  purchase: {
    qtyCol: "Qty Purchased",
    amountCol: "Total Cost (৳)",
    highAmountOpt: "Highest Cost",
    lowAmountOpt: "Lowest Cost",
    highQtyOpt: "Highest Qty Purchased",
    emptyTitle: "No Product Purchases Found",
    emptyDesc: "No line items found in the current purchases set.",
  },
};

/**
 * Shared Product-Wise Trade Report table for both Sales Report and Purchase Report
 */
export const ProductTradeReportTable: React.FC<ProductTradeReportTableProps> = ({
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
  const labels = DOMAIN_LABELS[domain];
  const companyMeta = useReportCompanyMeta(startDate, endDate);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [sortBy, setSortBy] = useState<string>("revenue_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const availableColumns: ColumnItem[] = [
    { key: "sl", label: "SL" },
    { key: "productCode", label: "Product Code" },
    { key: "productName", label: "Product Description" },
    { key: "unit", label: "Unit" },
    { key: "orders", label: "Orders" },
    { key: "quantity", label: labels.qtyCol },
    { key: "avgRate", label: "Avg Rate (৳)" },
    { key: "discount", label: "Discounts (৳)" },
    { key: "amount", label: labels.amountCol },
    { key: "share", label: "Contribution" },
  ];

  const {
    visibleColumns,
    isColVisible,
    handleToggleColumn,
    handleResetColumns,
    activeVisibleColumnCount,
  } = useColumnVisibility(availableColumns, `product_${domain}_report_columns`);

  const productSummaries = aggregateTradeProducts(transactions, domain);
  const { totalAmount: grandTotalAmount } =
    calculateProductTotals(productSummaries);

  const filtered = productSummaries
    .filter((p) => {
      if (!debouncedSearch.trim()) return true;
      const q = debouncedSearch.toLowerCase().trim();
      return (
        p.productName.toLowerCase().includes(q) ||
        p.productCode.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "revenue_desc") return b.totalAmount - a.totalAmount;
      if (sortBy === "revenue_asc") return a.totalAmount - b.totalAmount;
      if (sortBy === "qty_desc") return b.totalQuantity - a.totalQuantity;
      if (sortBy === "name_asc") return a.productName.localeCompare(b.productName);
      return 0;
    });

  const totalCount = filtered.length;
  const pageCount = Math.ceil(totalCount / pageSize) || 1;
  const safePage = Math.min(Math.max(1, currentPage), pageCount);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
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
              placeholder="Search product code, name..."
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
          {/* Sort selector */}
          <TableFilterSelect
            value={sortBy}
            onChange={(val) => {
              setSortBy(val);
              setCurrentPage(1);
            }}
            isFiltered={sortBy !== "revenue_desc"}
            className="w-44 shrink-0"
            options={[
              { value: "revenue_desc", label: labels.highAmountOpt },
              { value: "revenue_asc", label: labels.lowAmountOpt },
              { value: "qty_desc", label: labels.highQtyOpt },
              { value: "name_asc", label: "Product Name (A-Z)" },
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
          <EmptyState
            title={labels.emptyTitle}
            description={labels.emptyDesc}
          />
        ) : (
          <Table>
            <TableHead>
              {isColVisible("sl") && <TableTh align="center" width={40} className="whitespace-nowrap">SL</TableTh>}
              {isColVisible("productCode") && <TableTh className="w-px whitespace-nowrap">Product Code</TableTh>}
              {isColVisible("productName") && <TableTh className="whitespace-nowrap">Product Description</TableTh>}
              {isColVisible("unit") && <TableTh align="center" className="whitespace-nowrap">Unit</TableTh>}
              {isColVisible("orders") && <TableTh align="center" className="whitespace-nowrap">Orders</TableTh>}
              {isColVisible("quantity") && <TableTh align="right" className="whitespace-nowrap">{labels.qtyCol}</TableTh>}
              {isColVisible("avgRate") && <TableTh align="right" className="whitespace-nowrap">Avg Rate (৳)</TableTh>}
              {isColVisible("discount") && <TableTh align="right" className="whitespace-nowrap">Discounts (৳)</TableTh>}
              {isColVisible("amount") && <TableTh align="right" className="whitespace-nowrap">{labels.amountCol}</TableTh>}
              {isColVisible("share") && <TableTh align="right" className="whitespace-nowrap">Contribution</TableTh>}
            </TableHead>
            <TableBody>
              {paginated.map((item, idx) => {
                const sharePct = calculateRevenueSharePct(
                  item.totalAmount,
                  grandTotalAmount
                );
                const avgPrice =
                  item.totalQuantity > 0
                    ? Math.round(item.totalAmount / item.totalQuantity)
                    : 0;

                return (
                  <tr
                    key={item.productCode + idx}
                    className="hover:bg-[var(--primary-color-light)]/40 transition-colors"
                  >
                    {isColVisible("sl") && (
                      <td className="py-2.5 px-3 text-center text-[var(--ui-text)] font-semibold text-xs">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                    )}
                    {isColVisible("productCode") && (
                      <td className="py-2.5 px-3 font-semibold text-xs text-[var(--ui-text)] whitespace-nowrap">
                        {item.productCode}
                      </td>
                    )}
                    {isColVisible("productName") && (
                      <td className="py-2.5 px-3 font-semibold text-xs text-[var(--ui-text)]">
                        {item.productName}
                      </td>
                    )}
                    {isColVisible("unit") && (
                      <td className="py-2.5 px-3 text-center text-[var(--ui-text-muted)] text-xs">
                        {item.unit}
                      </td>
                    )}
                    {isColVisible("orders") && (
                      <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)]">
                        {item.invoicesCount}
                      </td>
                    )}
                    {isColVisible("quantity") && (
                      <td className="py-2.5 px-3 text-right font-bold text-xs text-[var(--ui-text)]">
                        {item.totalQuantity}
                      </td>
                    )}
                    {isColVisible("avgRate") && (
                      <td className="py-2.5 px-3 text-right text-xs text-[var(--ui-text)]">
                        ৳ {formatMoney(avgPrice)}
                      </td>
                    )}
                    {isColVisible("discount") && (
                      <td className="py-2.5 px-3 text-right text-xs text-[var(--ui-text-muted)]">
                        {item.totalDiscount > 0
                          ? `৳ ${formatMoney(item.totalDiscount)}`
                          : "N/A"}
                      </td>
                    )}
                    {isColVisible("amount") && (
                      <td className="py-2.5 px-3 text-right font-bold text-xs text-[var(--ui-text)] whitespace-nowrap">
                        ৳ {formatMoney(item.totalAmount)}
                      </td>
                    )}
                    {isColVisible("share") && (
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-[var(--ui-text)]">
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
          entityLabel="products"
        />
      )}
    </TableContainer>
  );
};

export default ProductTradeReportTable;

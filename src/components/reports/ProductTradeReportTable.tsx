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
} from "@/components/common";
import { formatMoney } from "@/utils/formatters";
import { useDebounce } from "@/hooks/useDebounce";
import ReportExportButtons from "./ReportExportButtons";
import {
  type TradeDomain,
  type ProductTradeSummary,
  type ReportCompanyMeta,
  aggregateTradeProducts,
  calculateProductTotals,
  calculateRevenueSharePct,
  useReportCompanyMeta,
} from "@/utils/trade-report-helpers";

interface ProductTradeReportTableProps {
  domain: TradeDomain;
  transactions: any[];
  isLoading?: boolean;
  startDate?: string;
  endDate?: string;
  onExportExcel: (
    products: ProductTradeSummary[],
    meta: ReportCompanyMeta
  ) => Promise<number>;
  onDownloadPdf: (
    products: ProductTradeSummary[],
    meta: ReportCompanyMeta
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
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <TableContainer>
      {/* Top Filter Bar */}
      <TableToolbar>
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

        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Sort selector */}
          <div className="relative w-44 shrink-0">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 pl-2.5 pr-6 text-xs border border-[var(--ui-border)] 
              rounded-lg bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] 
              text-[var(--ui-text)] font-medium focus:outline-none focus:border-[var(--primary-color)] 
              cursor-pointer appearance-none"
            >
              <option value="revenue_desc">{labels.highAmountOpt}</option>
              <option value="revenue_asc">{labels.lowAmountOpt}</option>
              <option value="qty_desc">{labels.highQtyOpt}</option>
              <option value="name_asc">Product Name (A-Z)</option>
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text-subtle)] pointer-events-none text-xs"
              size={13}
            />
          </div>

          <ReportExportButtons
            onExportExcel={async () => {
              const count = await onExportExcel(filtered, companyMeta);
              return excelSuccessText(count);
            }}
            onDownloadPdf={async () => {
              await onDownloadPdf(filtered, companyMeta);
              return pdfSuccessText;
            }}
          />
        </div>
      </TableToolbar>

      {/* Table */}
      <TableScroll>
        {isLoading ? (
          <TableSkeleton columnCount={10} rowCount={8} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title={labels.emptyTitle}
            description={labels.emptyDesc}
          />
        ) : (
          <Table>
            <TableHead>
              <TableTh align="center" width={40}>SL</TableTh>
              <TableTh width={130}>Product Code</TableTh>
              <TableTh>Product Description</TableTh>
              <TableTh align="center" width={70}>Unit</TableTh>
              <TableTh align="center" width={80}>Orders</TableTh>
              <TableTh align="right" width={110}>{labels.qtyCol}</TableTh>
              <TableTh align="right" width={110}>Avg Rate (৳)</TableTh>
              <TableTh align="right" width={110}>Discounts (৳)</TableTh>
              <TableTh align="right" width={130}>{labels.amountCol}</TableTh>
              <TableTh align="right" width={110}>Contribution</TableTh>
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
                    <td className="py-2.5 px-3 text-center text-[var(--ui-text)] font-semibold text-xs">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-xs text-[var(--ui-text)]">
                      {item.productCode}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-xs text-[var(--ui-text)]">
                      {item.productName}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[var(--ui-text-muted)] text-xs">
                      {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)]">
                      {item.invoicesCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-xs text-[var(--ui-text)]">
                      {item.totalQuantity}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs text-[var(--ui-text)]">
                      ৳ {formatMoney(avgPrice)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs text-[var(--ui-text-muted)]">
                      {item.totalDiscount > 0
                        ? `৳ ${formatMoney(item.totalDiscount)}`
                        : "N/A"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-xs text-[var(--ui-text)] whitespace-nowrap">
                      ৳ {formatMoney(item.totalAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs font-semibold text-[var(--ui-text)]">
                      {sharePct}%
                    </td>
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
          entityLabel="products"
        />
      )}
    </TableContainer>
  );
};

export default ProductTradeReportTable;

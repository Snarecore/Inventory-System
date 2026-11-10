import React, { useState, useMemo } from "react";
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
import type { SaleItem } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";
import {
  aggregateProductSales,
  type ProductSummary,
} from "../utils/sales-report-helpers";

interface ProductSalesReportTableProps {
  transactions: SaleItem[];
  isLoading?: boolean;
}

export const ProductSalesReportTable: React.FC<ProductSalesReportTableProps> = ({
  transactions,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [sortBy, setSortBy] = useState<string>("revenue_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Group line items by product using shared aggregator
  const productSummaries: ProductSummary[] = useMemo(
    () => aggregateProductSales(transactions),
    [transactions]
  );

  // Overall total revenue from products
  const grandProductRevenue = useMemo(
    () => productSummaries.reduce((acc, p) => acc + p.totalRevenue, 0),
    [productSummaries]
  );

  // Filter & Sort
  const filtered = useMemo(() => {
    let list = productSummaries;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.productName.toLowerCase().includes(q) ||
          p.productCode.toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    if (sortBy === "revenue_desc") {
      sorted.sort((a, b) => b.totalRevenue - a.totalRevenue);
    } else if (sortBy === "revenue_asc") {
      sorted.sort((a, b) => a.totalRevenue - b.totalRevenue);
    } else if (sortBy === "qty_desc") {
      sorted.sort((a, b) => b.totalQuantity - a.totalQuantity);
    } else if (sortBy === "name_asc") {
      sorted.sort((a, b) => a.productName.localeCompare(b.productName));
    }

    return sorted;
  }, [productSummaries, debouncedSearch, sortBy]);

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

        <div className="flex flex-wrap items-center gap-2">
          {/* Sort selector */}
          <div className="relative w-40 shrink-0">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 pl-2.5 pr-6 text-xs border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] font-medium focus:outline-none focus:border-[var(--primary-color)] cursor-pointer appearance-none"
            >
              <option value="revenue_desc">Highest Revenue</option>
              <option value="revenue_asc">Lowest Revenue</option>
              <option value="qty_desc">Highest Qty Sold</option>
              <option value="name_asc">Product Name (A-Z)</option>
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text-subtle)] pointer-events-none text-xs"
              size={13}
            />
          </div>
        </div>
      </TableToolbar>

      {/* Table */}
      <TableScroll>
        {isLoading ? (
          <TableSkeleton columnCount={10} rowCount={8} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title="No Product Sales Found"
            description="No line items found in the current transactions set."
          />
        ) : (
          <Table>
            <TableHead>
              <TableTh align="center" width={40}>SL</TableTh>
              <TableTh width={130}>Product Code</TableTh>
              <TableTh>Product Description</TableTh>
              <TableTh align="center" width={70}>Unit</TableTh>
              <TableTh align="center" width={80}>Orders</TableTh>
              <TableTh align="right" width={100}>Qty Sold</TableTh>
              <TableTh align="right" width={110}>Avg Rate (৳)</TableTh>
              <TableTh align="right" width={110}>Discounts (৳)</TableTh>
              <TableTh align="right" width={130}>Net Revenue (৳)</TableTh>
              <TableTh align="right" width={110}>Contribution</TableTh>
            </TableHead>
            <TableBody>
              {paginated.map((item, idx) => {
                const sharePct =
                  grandProductRevenue > 0
                    ? ((item.totalRevenue / grandProductRevenue) * 100).toFixed(1)
                    : "0.0";
                const avgPrice =
                  item.totalQuantity > 0
                    ? Math.round(item.totalRevenue / item.totalQuantity)
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
                      ৳ {formatMoney(item.totalRevenue)}
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

export default ProductSalesReportTable;

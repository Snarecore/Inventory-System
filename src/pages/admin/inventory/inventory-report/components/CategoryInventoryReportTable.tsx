import React, { useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import Search from "@/components/table-components/Search";
import ReportDateRangeControl from "@/components/reports/ReportDateRangeControl";
import ReportExportButtons from "@/components/reports/ReportExportButtons";
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
import {
  useReportCompanyMeta,
  calculateRevenueSharePct,
  type ReportDateFilterProps,
} from "@/utils/trade-report-helpers";
import type { ProductItem } from "@/types";
import {
  aggregateCategoryInventory,
  exportCategoryInventoryExcel,
  downloadCategoryInventoryPdf,
} from "../utils/inventory-report-helpers";

interface CategoryInventoryReportTableProps extends ReportDateFilterProps {
  products: ProductItem[];
  isLoading?: boolean;
}

export const CategoryInventoryReportTable: React.FC<
  CategoryInventoryReportTableProps
> = ({
  products,
  isLoading,
  startDate,
  endDate,
  dateRange,
  onPresetChange,
  onDateChange,
}) => {
  const companyMeta = useReportCompanyMeta(startDate, endDate);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [sortBy, setSortBy] = useState<string>("cost_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const categorySummaries = aggregateCategoryInventory(products);
  const grandTotalCost = categorySummaries.reduce(
    (sum, c) => sum + c.totalCostValue,
    0
  );

  const filtered = categorySummaries
    .filter((c) => {
      if (!debouncedSearch.trim()) return true;
      return c.category
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase().trim());
    })
    .sort((a, b) => {
      if (sortBy === "cost_desc") return b.totalCostValue - a.totalCostValue;
      if (sortBy === "retail_desc")
        return b.totalRetailValue - a.totalRetailValue;
      if (sortBy === "products_desc") return b.productCount - a.productCount;
      if (sortBy === "low_desc") return b.lowStockCount - a.lowStockCount;
      if (sortBy === "name_asc") return a.category.localeCompare(b.category);
      return 0;
    });

  const totalCount = filtered.length;
  const pageCount = Math.ceil(totalCount / pageSize) || 1;
  const safePage = Math.min(currentPage, pageCount);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  return (
    <TableContainer>
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
              placeholder="Search category name..."
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
          <div className="relative w-44 shrink-0">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 pl-2.5 pr-6 text-xs border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] font-medium focus:outline-none focus:border-[var(--primary-color)] cursor-pointer appearance-none"
            >
              <option value="cost_desc">Highest Cost Value</option>
              <option value="retail_desc">Highest Retail Value</option>
              <option value="products_desc">Most Products</option>
              <option value="low_desc">Most Low-Stock Alerts</option>
              <option value="name_asc">Category (A-Z)</option>
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text-subtle)] pointer-events-none text-xs"
              size={13}
            />
          </div>

          <ReportExportButtons
            onExportExcel={async () => {
              const count = await exportCategoryInventoryExcel(
                filtered,
                companyMeta
              );
              return `Exported ${count} categories to Excel!`;
            }}
            onDownloadPdf={async () => {
              await downloadCategoryInventoryPdf(filtered, companyMeta);
              return "Category inventory report PDF downloaded!";
            }}
          />
        </div>
      </TableToolbar>

      <TableScroll>
        {isLoading && products.length === 0 ? (
          <TableSkeleton columnCount={10} rowCount={6} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title="No Category Data Found"
            description="No product categories match the current search or date filter."
          />
        ) : (
          <Table minWidth={920}>
            <TableHead>
              <TableTh align="center" width={42}>
                SL
              </TableTh>
              <TableTh>Category Name</TableTh>
              <TableTh align="center">Products</TableTh>
              <TableTh align="center">Active</TableTh>
              <TableTh align="center">Low / Out</TableTh>
              <TableTh align="right">Stock Units</TableTh>
              <TableTh align="right">Cost Value (৳)</TableTh>
              <TableTh align="right">Retail Value (৳)</TableTh>
              <TableTh align="right">Est. Profit (৳)</TableTh>
              <TableTh align="right" width={130}>
                Value Share
              </TableTh>
            </TableHead>

            <TableBody>
              {paginated.map((c, idx) => {
                const sl = (safePage - 1) * pageSize + idx + 1;
                const sharePct = calculateRevenueSharePct(
                  c.totalCostValue,
                  grandTotalCost
                );

                return (
                  <tr
                    key={c.category}
                    className="hover:bg-[var(--primary-color-light)]/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                      {sl}
                    </td>

                    <td className="py-2.5 px-3 text-xs font-semibold text-[var(--ui-text)]">
                      {c.category}
                    </td>

                    <td className="py-2.5 px-3 text-center text-xs tabular-nums">
                      <span className="inline-block px-2 py-0.5 rounded bg-[var(--ui-surface-sunken)] font-semibold text-[var(--ui-text)]">
                        {c.productCount}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center text-xs font-semibold text-[var(--ui-success)] tabular-nums">
                      {c.activeCount}
                    </td>

                    <td className="py-2.5 px-3 text-center text-xs tabular-nums">
                      {c.lowStockCount > 0 ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-[var(--ui-warning-border)] text-[var(--ui-warning-dark)]">
                          {c.lowStockCount}
                        </span>
                      ) : (
                        <span className="text-[var(--ui-text-subtle)]">0</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right text-xs font-semibold text-[var(--ui-text)] tabular-nums">
                      {c.totalUnits.toLocaleString("en-IN")}
                    </td>

                    <td className="py-2.5 px-3 text-right text-xs font-bold text-[var(--primary-color)] whitespace-nowrap tabular-nums">
                      ৳ {formatMoney(c.totalCostValue)}
                    </td>

                    <td className="py-2.5 px-3 text-right text-xs font-semibold text-[var(--ui-success)] whitespace-nowrap tabular-nums">
                      ৳ {formatMoney(c.totalRetailValue)}
                    </td>

                    <td className="py-2.5 px-3 text-right text-xs font-semibold whitespace-nowrap tabular-nums">
                      <span
                        className={
                          c.estimatedProfit >= 0
                            ? "text-[var(--ui-success)]"
                            : "text-[var(--ui-danger)]"
                        }
                      >
                        ৳ {formatMoney(c.estimatedProfit)}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right text-xs">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-[var(--ui-border)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--primary-color)]"
                            style={{ width: `${Math.min(100, Number(sharePct))}%` }}
                          />
                        </div>
                        <span className="font-semibold text-[var(--ui-text)] w-11 text-right tabular-nums">
                          {sharePct}%
                        </span>
                      </div>
                    </td>
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
          entityLabel="categories"
        />
      )}
    </TableContainer>
  );
};

export default CategoryInventoryReportTable;

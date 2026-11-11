import React, { useState } from "react";
import { FiChevronDown, FiRotateCcw } from "react-icons/fi";
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
  TableActionButtons,
  EmptyState,
} from "@/components/common";
import { formatMoney } from "@/utils/formatters";
import { useDebounce } from "@/hooks/useDebounce";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import ColumnVisibilityDropdown, {
  type ColumnItem,
} from "@/components/table-components/ColumnVisibilityDropdown";
import {
  useReportCompanyMeta,
  type ReportDateFilterProps,
} from "@/utils/trade-report-helpers";
import type { ProductItem } from "@/types";
import {
  extractInventoryProductMetrics,
  exportLowStockReportExcel,
  downloadLowStockReportPdf,
} from "../utils/inventory-report-helpers";

interface LowStockReportTableProps extends ReportDateFilterProps {
  products: ProductItem[];
  categoryOptions: string[];
  isLoading?: boolean;
  onViewProduct: (product: ProductItem) => void;
}

const AVAILABLE_COLUMNS: ColumnItem[] = [
  { key: "sl", label: "SL" },
  { key: "code", label: "Code" },
  { key: "name", label: "Product Name" },
  { key: "category", label: "Category" },
  { key: "currentStock", label: "Current Stock" },
  { key: "minThreshold", label: "Min Threshold" },
  { key: "shortfall", label: "Shortfall" },
  { key: "buyPrice", label: "Buy Price" },
  { key: "restockCost", label: "Est. Restock Cost" },
  { key: "alertLevel", label: "Alert Level" },
  { key: "actions", label: "Actions" },
];

export const LowStockReportTable: React.FC<LowStockReportTableProps> = ({
  products,
  categoryOptions,
  isLoading,
  startDate,
  endDate,
  dateRange,
  onPresetChange,
  onDateChange,
  onViewProduct,
}) => {
  const companyMeta = useReportCompanyMeta(startDate, endDate);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const {
    visibleColumns,
    isColVisible,
    handleToggleColumn,
    handleResetColumns,
    activeVisibleColumnCount,
  } = useColumnVisibility(AVAILABLE_COLUMNS, "low_stock_report_columns");

  const isAnyFilterActive =
    searchQuery.trim() !== "" ||
    categoryFilter !== "all" ||
    severityFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setSeverityFilter("all");
    setCurrentPage(1);
  };

  const alertEntries = products
    .map((product, idx) => ({
      product,
      m: extractInventoryProductMetrics(product, idx),
    }))
    .filter(({ m }) => m.stockState === "OUT" || m.stockState === "LOW")
    .filter(({ m }) => {
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const hay = `${m.name} ${m.code} ${m.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (
        categoryFilter !== "all" &&
        m.category.toLowerCase() !== categoryFilter.toLowerCase()
      ) {
        return false;
      }

      if (severityFilter === "out" && m.stockState !== "OUT") return false;
      if (severityFilter === "low" && m.stockState !== "LOW") return false;

      return true;
    })
    // Show Out of Stock first, then lowest remaining quantity
    .sort((a, b) => a.m.quantity - b.m.quantity);

  const filteredProducts = alertEntries.map((e) => e.product);
  const totalCount = alertEntries.length;
  const pageCount = Math.ceil(totalCount / pageSize) || 1;
  const safePage = Math.min(currentPage, pageCount);
  const paginated = alertEntries.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  return (
    <TableContainer>
      <TableToolbar>
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="w-full sm:w-44 md:w-52 shrink-0">
            <Search
              searchQuery={searchQuery}
              onSearchChange={(val) => {
                setSearchQuery(val);
                setCurrentPage(1);
              }}
              setSearchQuery={setSearchQuery}
              placeholder="Search low-stock product..."
            />
          </div>

          <ReportDateRangeControl
            startDate={startDate}
            endDate={endDate}
            dateRange={dateRange}
            onPresetChange={onPresetChange}
            onDateChange={onDateChange}
            onAfterChange={() => setCurrentPage(1)}
            className="w-[calc(50%-4px)] sm:w-40 lg:w-44 shrink-0 z-50"
          />

          <div className="relative w-[calc(50%-4px)] sm:w-36 shrink-0">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 pl-2.5 pr-6 text-xs border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer appearance-none"
            >
              <option value="all">All Categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text)] pointer-events-none text-xs"
              size={13}
            />
          </div>

          <div className="relative w-full sm:w-36 shrink-0">
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 pl-2.5 pr-6 text-xs border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer appearance-none"
            >
              <option value="all">All Stock Alerts</option>
              <option value="out">Out of Stock Only</option>
              <option value="low">Low Stock Only</option>
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text)] pointer-events-none text-xs"
              size={13}
            />
          </div>
        </div>

        <div className="flex items-center flex-wrap justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--ui-border)]">
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 h-8 text-[11px] sm:text-xs font-semibold text-[var(--ui-danger)] bg-[var(--ui-danger-light)] hover:bg-[var(--ui-danger-border)] border border-[var(--ui-danger-border)] rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <FiRotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}

          <ColumnVisibilityDropdown
            columns={AVAILABLE_COLUMNS}
            visibleColumns={visibleColumns}
            onToggle={handleToggleColumn}
            onReset={handleResetColumns}
          />

          <ReportExportButtons
            onExportExcel={async () => {
              const count = await exportLowStockReportExcel(
                filteredProducts,
                companyMeta,
                visibleColumns
              );
              return `Exported ${count} low-stock alerts to Excel!`;
            }}
            onDownloadPdf={async () => {
              await downloadLowStockReportPdf(
                filteredProducts,
                companyMeta,
                visibleColumns
              );
              return "Low-stock alert report PDF downloaded!";
            }}
          />
        </div>
      </TableToolbar>

      <TableScroll>
        {isLoading && products.length === 0 ? (
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={6} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title="All Products Healthy"
            description="No products are currently at or below their minimum stock threshold."
          />
        ) : (
          <Table minWidth={920}>
            <TableHead>
              {isColVisible("sl") && (
                <TableTh align="center" width={42}>
                  SL
                </TableTh>
              )}
              {isColVisible("code") && <TableTh>Code</TableTh>}
              {isColVisible("name") && <TableTh>Product Name</TableTh>}
              {isColVisible("category") && <TableTh>Category</TableTh>}
              {isColVisible("currentStock") && (
                <TableTh align="right">Current Stock</TableTh>
              )}
              {isColVisible("minThreshold") && (
                <TableTh align="right">Min Threshold</TableTh>
              )}
              {isColVisible("shortfall") && (
                <TableTh align="right">Shortfall</TableTh>
              )}
              {isColVisible("buyPrice") && (
                <TableTh align="right">Buy Price</TableTh>
              )}
              {isColVisible("restockCost") && (
                <TableTh align="right">Est. Restock Cost</TableTh>
              )}
              {isColVisible("alertLevel") && (
                <TableTh align="center">Alert Level</TableTh>
              )}
              {isColVisible("actions") && (
                <TableTh align="center" width={64}>
                  Actions
                </TableTh>
              )}
            </TableHead>

            <TableBody>
              {paginated.map(({ product, m }, idx) => {
                const sl = (safePage - 1) * pageSize + idx + 1;
                const isOut = m.stockState === "OUT";

                return (
                  <tr
                    key={m.id}
                    className="hover:bg-[var(--primary-color-light)]/40 transition-colors"
                  >
                    {isColVisible("sl") && (
                      <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                        {sl}
                      </td>
                    )}

                    {isColVisible("code") && (
                      <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                        <span className="bg-[var(--ui-surface-sunken)] px-1.5 py-0.5 rounded border border-[var(--ui-border)] text-[11px] font-medium">
                          {m.code}
                        </span>
                      </td>
                    )}

                    {isColVisible("name") && (
                      <td className="py-2.5 px-3 text-xs font-semibold text-[var(--ui-text)] max-w-[210px] truncate">
                        <span
                          onClick={() => onViewProduct(product)}
                          className="cursor-pointer hover:text-[var(--primary-color)] transition-colors"
                          title={m.name}
                        >
                          {m.name}
                        </span>
                      </td>
                    )}

                    {isColVisible("category") && (
                      <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10.5px] font-medium bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] border border-[var(--ui-border)]">
                          {m.category}
                        </span>
                      </td>
                    )}

                    {isColVisible("currentStock") && (
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-[var(--ui-text)] whitespace-nowrap tabular-nums">
                        {m.displayStock}
                      </td>
                    )}

                    {isColVisible("minThreshold") && (
                      <td className="py-2.5 px-3 text-right text-xs text-[var(--ui-text-muted)] whitespace-nowrap tabular-nums">
                        {m.lowThreshold} {m.unit}
                      </td>
                    )}

                    {isColVisible("shortfall") && (
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-[var(--ui-danger)] whitespace-nowrap tabular-nums">
                        {m.shortfallQty} {m.unit}
                      </td>
                    )}

                    {isColVisible("buyPrice") && (
                      <td className="py-2.5 px-3 text-right text-xs text-[var(--ui-text-muted)] whitespace-nowrap tabular-nums">
                        ৳ {formatMoney(m.buyPrice)}
                      </td>
                    )}

                    {isColVisible("restockCost") && (
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-[var(--ui-danger)] whitespace-nowrap tabular-nums">
                        ৳ {formatMoney(m.restockCost)}
                      </td>
                    )}

                    {isColVisible("alertLevel") && (
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold border rounded-md ${
                            isOut
                              ? "bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)] border-[var(--ui-danger-border)]"
                              : "bg-[var(--ui-warning-border)] text-[var(--ui-warning-dark)] border-[var(--ui-warning-border)]"
                          }`}
                        >
                          {isOut ? "Out of Stock" : "Low Stock"}
                        </span>
                      </td>
                    )}

                    {isColVisible("actions") && (
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <TableActionButtons
                          onView={() => onViewProduct(product)}
                          viewTitle="View Product Valuation Snapshot"
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
          entityLabel="alerts"
        />
      )}
    </TableContainer>
  );
};

export default LowStockReportTable;

import React, { useState } from "react";
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
  type ReportDateFilterProps,
} from "@/utils/trade-report-helpers";
import type { ProductItem } from "@/types";
import {
  extractInventoryProductMetrics,
  exportInventoryStockExcel,
  downloadInventoryStockPdf,
} from "../utils/inventory-report-helpers";

interface InventoryStockReportTableProps extends ReportDateFilterProps {
  products: ProductItem[];
  categoryOptions: string[];
  isLoading?: boolean;
  onViewProduct: (product: ProductItem) => void;
}

const AVAILABLE_COLUMNS: ColumnItem[] = [
  { key: "sl", label: "SL" },
  { key: "category", label: "Category" },
  { key: "code", label: "Code" },
  { key: "name", label: "Product Name" },
  { key: "primaryUnit", label: "Primary Unit" },
  { key: "secondaryUnit", label: "Secondary Unit" },
  { key: "conversion", label: "Conversion" },
  { key: "stock", label: "Stock" },
  { key: "buyPrice", label: "Buy Price" },
  { key: "sellPrice", label: "Sell Price" },
  { key: "costValue", label: "Cost Value" },
  { key: "retailValue", label: "Retail Value" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
];

export const InventoryStockReportTable: React.FC<
  InventoryStockReportTableProps
> = ({
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
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const {
    visibleColumns,
    isColVisible,
    handleToggleColumn,
    handleResetColumns,
    activeVisibleColumnCount,
  } = useColumnVisibility(AVAILABLE_COLUMNS, "inventory_stock_report_columns");

  const isAnyFilterActive =
    searchQuery.trim() !== "" ||
    categoryFilter !== "all" ||
    stockFilter !== "all" ||
    sortBy !== "latest";

  const handleResetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setStockFilter("all");
    setSortBy("latest");
    setCurrentPage(1);
  };

  const normalizedEntries = products.map((product, idx) => ({
    product,
    m: extractInventoryProductMetrics(product, idx),
  }));

  const filteredEntries = normalizedEntries.filter(({ m }) => {
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      const hay = `${m.name} ${m.code} ${m.sku} ${m.barcode} ${m.category}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    if (
      categoryFilter !== "all" &&
      m.category.toLowerCase() !== categoryFilter.toLowerCase()
    ) {
      return false;
    }

    if (stockFilter === "active" && !m.isActive) return false;
    if (stockFilter === "inactive" && m.isActive) return false;
    if (stockFilter === "in_stock" && m.stockState !== "IN") return false;
    if (stockFilter === "low_stock" && m.stockState === "IN") return false;
    if (stockFilter === "out_of_stock" && m.stockState !== "OUT") return false;

    return true;
  });

  if (sortBy === "cost_desc") {
    filteredEntries.sort((a, b) => b.m.costValue - a.m.costValue);
  } else if (sortBy === "retail_desc") {
    filteredEntries.sort((a, b) => b.m.retailValue - a.m.retailValue);
  } else if (sortBy === "qty_asc") {
    filteredEntries.sort((a, b) => a.m.quantity - b.m.quantity);
  } else if (sortBy === "qty_desc") {
    filteredEntries.sort((a, b) => b.m.quantity - a.m.quantity);
  } else if (sortBy === "name_asc") {
    filteredEntries.sort((a, b) => a.m.name.localeCompare(b.m.name));
  }

  const filteredProducts = filteredEntries.map((e) => e.product);
  const totalCount = filteredEntries.length;
  const pageCount = Math.ceil(totalCount / pageSize) || 1;
  const safePage = Math.min(currentPage, pageCount);
  const paginated = filteredEntries.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const toggleHeaderSort = (ascKey: string, descKey: string) => {
    setSortBy(sortBy === ascKey ? descKey : sortBy === descKey ? "latest" : descKey);
    setCurrentPage(1);
  };

  return (
    <TableContainer>
      <TableToolbar>
        {/* Left Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="w-full sm:w-44 md:w-52 shrink-0">
            <Search
              searchQuery={searchQuery}
              onSearchChange={(val) => {
                setSearchQuery(val);
                setCurrentPage(1);
              }}
              setSearchQuery={setSearchQuery}
              placeholder="Search code, product..."
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

          {/* Category Filter */}
          <TableFilterSelect
            value={categoryFilter}
            onChange={(val) => {
              setCategoryFilter(val);
              setCurrentPage(1);
            }}
            className="w-[calc(50%-4px)] sm:w-36 shrink-0"
            options={[
              { value: "all", label: "All Categories" },
              ...categoryOptions.map((cat) => ({ value: cat, label: cat })),
            ]}
          />

          {/* Stock & Status Filter */}
          <TableFilterSelect
            value={stockFilter}
            onChange={(val) => {
              setStockFilter(val);
              setCurrentPage(1);
            }}
            className="w-[calc(50%-4px)] sm:w-32 shrink-0"
            options={[
              { value: "all", label: "All Stock/Status" },
              { value: "active", label: "Active Only" },
              { value: "inactive", label: "Inactive Only" },
              { value: "in_stock", label: "Healthy Stock" },
              { value: "low_stock", label: "Low / Out Stock" },
              { value: "out_of_stock", label: "Out of Stock" },
            ]}
          />

          {/* Sort Selector */}
          <TableFilterSelect
            value={sortBy}
            onChange={(val) => {
              setSortBy(val);
              setCurrentPage(1);
            }}
            isFiltered={sortBy !== "latest"}
            className="w-[calc(50%-4px)] sm:w-36 shrink-0"
            options={[
              { value: "latest", label: "Latest Products" },
              { value: "cost_desc", label: "Highest Cost Value" },
              { value: "retail_desc", label: "Highest Retail Value" },
              { value: "qty_desc", label: "Highest Stock Qty" },
              { value: "qty_asc", label: "Lowest Stock Qty" },
              { value: "name_asc", label: "Name (A-Z)" },
            ]}
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center flex-wrap justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--ui-border)]">
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset all active filters"
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
              const count = await exportInventoryStockExcel(
                filteredProducts,
                companyMeta,
                visibleColumns
              );
              return `Exported ${count} inventory products to Excel!`;
            }}
            onDownloadPdf={async () => {
              await downloadInventoryStockPdf(
                filteredProducts,
                companyMeta,
                visibleColumns
              );
              return "Inventory stock report PDF downloaded!";
            }}
          />
        </div>
      </TableToolbar>

      <TableScroll>
        {isLoading && products.length === 0 ? (
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={8} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title="No Products Found"
            description="There are no inventory products matching the current search or filter criteria."
          />
        ) : (
          <Table>
            <TableHead>
              {isColVisible("sl") && (
                <TableTh align="center" width={42} className="whitespace-nowrap">
                  SL
                </TableTh>
              )}
              {isColVisible("category") && (
                <TableTh className="w-px whitespace-nowrap">Category</TableTh>
              )}
              {isColVisible("code") && (
                <TableTh className="w-px whitespace-nowrap">Code</TableTh>
              )}
              {isColVisible("name") && (
                <TableTh className="whitespace-nowrap">
                  <span
                    onClick={() => {
                      setSortBy(sortBy === "name_asc" ? "latest" : "name_asc");
                      setCurrentPage(1);
                    }}
                    className="inline-flex items-center gap-1 cursor-pointer select-none"
                  >
                    <span>Product Name</span>
                    <FiChevronDown
                      size={11}
                      className={`transition-transform ${
                        sortBy === "name_asc" ? "rotate-180" : ""
                      }`}
                    />
                  </span>
                </TableTh>
              )}
              {isColVisible("primaryUnit") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Primary Unit
                </TableTh>
              )}
              {isColVisible("secondaryUnit") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Secondary Unit
                </TableTh>
              )}
              {isColVisible("conversion") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Conversion
                </TableTh>
              )}
              {isColVisible("stock") && (
                <TableTh align="right" className="whitespace-nowrap">
                  <span
                    onClick={() => toggleHeaderSort("qty_asc", "qty_desc")}
                    className="inline-flex items-center gap-1 cursor-pointer select-none"
                  >
                    <span>Stock</span>
                    <FiChevronDown
                      size={11}
                      className={`transition-transform ${
                        sortBy === "qty_asc" ? "rotate-180" : ""
                      }`}
                    />
                  </span>
                </TableTh>
              )}
              {isColVisible("buyPrice") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Buy Price
                </TableTh>
              )}
              {isColVisible("sellPrice") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Sell Price
                </TableTh>
              )}
              {isColVisible("costValue") && (
                <TableTh align="right" className="whitespace-nowrap">
                  <span
                    onClick={() => {
                      setSortBy(sortBy === "cost_desc" ? "latest" : "cost_desc");
                      setCurrentPage(1);
                    }}
                    className="inline-flex items-center gap-1 cursor-pointer select-none"
                  >
                    <span>Cost Value</span>
                    <FiChevronDown size={11} />
                  </span>
                </TableTh>
              )}
              {isColVisible("retailValue") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Retail Value
                </TableTh>
              )}
              {isColVisible("status") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Status
                </TableTh>
              )}
              {isColVisible("actions") && (
                <TableTh align="center" width={64} className="whitespace-nowrap">
                  Actions
                </TableTh>
              )}
            </TableHead>

            <TableBody>
              {paginated.map(({ product, m }, idx) => {
                const sl = (safePage - 1) * pageSize + idx + 1;
                const stockAlertBadge =
                  m.stockState === "OUT" ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)]">
                      Out
                    </span>
                  ) : m.stockState === "LOW" ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--ui-warning-border)] text-[var(--ui-warning-dark)]">
                      Low
                    </span>
                  ) : null;

                return (
                  <tr
                    key={m.id}
                    className="hover:bg-[var(--primary-color-light)]/40 transition-colors group"
                  >
                    {isColVisible("sl") && (
                      <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                        {sl}
                      </td>
                    )}

                    {isColVisible("category") && (
                      <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10.5px] font-medium bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] border border-[var(--ui-border)]">
                          {m.category}
                        </span>
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
                      <td className="py-2.5 px-3 text-xs text-[var(--ui-text)] max-w-[230px]">
                        <span
                          onClick={() => onViewProduct(product)}
                          className="font-semibold text-xs text-[var(--ui-text)] hover:text-[var(--primary-color)] block truncate cursor-pointer transition-colors"
                          title={m.name}
                        >
                          {m.name}
                        </span>
                      </td>
                    )}

                    {isColVisible("primaryUnit") && (
                      <td
                        className="py-2.5 px-3 text-center text-xs whitespace-nowrap"
                        title={
                          m.hasSecondaryUnit
                            ? m.conversionDisplay
                              ? `${m.primaryStockDisplay} (${m.conversionDisplay})`
                              : m.primaryStockDisplay
                            : undefined
                        }
                      >
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10.5px] font-medium bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] border border-[var(--ui-border)]">
                          {m.primaryUnit}
                        </span>
                      </td>
                    )}

                    {isColVisible("secondaryUnit") && (
                      <td className="py-2.5 px-3 text-center text-xs whitespace-nowrap">
                        {m.hasSecondaryUnit ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10.5px] font-medium bg-[var(--ui-surface-sunken)] text-[var(--ui-text-muted)] border border-[var(--ui-border)]">
                            {m.secondaryUnit}
                          </span>
                        ) : (
                          <span className="text-[var(--ui-text-subtle)]">—</span>
                        )}
                      </td>
                    )}

                    {isColVisible("conversion") && (
                      <td className="py-2.5 px-3 text-center text-xs whitespace-nowrap">
                        {m.conversionDisplay ? (
                          <span className="text-[11px] font-medium text-[var(--ui-text-muted)]">
                            {m.conversionDisplay}
                          </span>
                        ) : (
                          <span className="text-[var(--ui-text-subtle)]">—</span>
                        )}
                      </td>
                    )}

                    {isColVisible("stock") && (
                      <td
                        className="py-2.5 px-3 text-right text-xs whitespace-nowrap tabular-nums"
                        title={
                          m.hasSecondaryUnit
                            ? m.conversionDisplay
                              ? `${m.primaryStockDisplay} (${m.conversionDisplay})`
                              : m.primaryStockDisplay
                            : undefined
                        }
                      >
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <span className="font-semibold text-[var(--ui-text)]">
                            {m.quantity.toLocaleString("en-IN", {
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          {stockAlertBadge}
                        </div>
                      </td>
                    )}

                    {isColVisible("buyPrice") && (
                      <td className="py-2.5 px-3 text-right text-xs text-[var(--ui-text-muted)] whitespace-nowrap tabular-nums">
                        ৳ {formatMoney(m.buyPrice)}
                      </td>
                    )}

                    {isColVisible("sellPrice") && (
                      <td className="py-2.5 px-3 text-right text-xs text-[var(--ui-text)] whitespace-nowrap tabular-nums">
                        ৳ {formatMoney(m.sellPrice)}
                      </td>
                    )}

                    {isColVisible("costValue") && (
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-[var(--primary-color)] whitespace-nowrap tabular-nums">
                        ৳ {formatMoney(m.costValue)}
                      </td>
                    )}

                    {isColVisible("retailValue") && (
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-[var(--ui-success)] whitespace-nowrap tabular-nums">
                        ৳ {formatMoney(m.retailValue)}
                      </td>
                    )}

                    {isColVisible("status") && (
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold border rounded-md ${
                            m.isActive
                              ? "bg-[var(--ui-success-border)] text-[var(--ui-success-dark)] border-[var(--ui-success-border)]"
                              : "bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)] border-[var(--ui-danger-border)]"
                          }`}
                        >
                          {m.isActive ? "Active" : "Inactive"}
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
          entityLabel="products"
        />
      )}
    </TableContainer>
  );
};

export default InventoryStockReportTable;

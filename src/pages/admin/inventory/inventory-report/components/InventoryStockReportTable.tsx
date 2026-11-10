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
} from "@/components/common";
import { formatMoney } from "@/utils/formatters";
import { useDebounce } from "@/hooks/useDebounce";
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
  { key: "code", label: "Code" },
  { key: "name", label: "Product Name" },
  { key: "category", label: "Category" },
  { key: "primaryUnit", label: "Primary Unit" },
  { key: "secondaryUnit", label: "Secondary Unit" },
  { key: "buyPrice", label: "Buy Price" },
  { key: "sellPrice", label: "Sell Price" },
  { key: "margin", label: "Margin %" },
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

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    () => {
      try {
        const saved = localStorage.getItem("inventory_stock_report_columns");
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore storage error
      }
      return {};
    }
  );

  const isColVisible = (key: string) => visibleColumns[key] !== false;

  const handleToggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const currentlyVisible = prev[key] !== false;
      const willBeVisible = !currentlyVisible;
      const countAfter = AVAILABLE_COLUMNS.filter((c) =>
        c.key === key ? willBeVisible : prev[c.key] !== false
      ).length;
      if (countAfter === 0) return prev;
      const next = { ...prev, [key]: willBeVisible };
      try {
        localStorage.setItem(
          "inventory_stock_report_columns",
          JSON.stringify(next)
        );
      } catch {
        // ignore storage error
      }
      return next;
    });
  };

  const handleResetColumns = () => {
    const resetState: Record<string, boolean> = {};
    AVAILABLE_COLUMNS.forEach((c) => {
      resetState[c.key] = true;
    });
    setVisibleColumns(resetState);
    try {
      localStorage.removeItem("inventory_stock_report_columns");
    } catch {
      // ignore storage error
    }
  };

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

          {/* Stock & Status Filter */}
          <div className="relative w-[calc(50%-4px)] sm:w-32 shrink-0">
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 pl-2.5 pr-6 text-xs border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer appearance-none"
            >
              <option value="all">All Stock/Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="in_stock">Healthy Stock</option>
              <option value="low_stock">Low / Out Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text)] pointer-events-none text-xs"
              size={13}
            />
          </div>

          {/* Sort Selector */}
          <div className="relative w-[calc(50%-4px)] sm:w-36 shrink-0">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 pl-2.5 pr-6 text-xs border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer appearance-none"
            >
              <option value="latest">Latest Products</option>
              <option value="cost_desc">Highest Cost Value</option>
              <option value="retail_desc">Highest Retail Value</option>
              <option value="qty_desc">Highest Stock Qty</option>
              <option value="qty_asc">Lowest Stock Qty</option>
              <option value="name_asc">Name (A-Z)</option>
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text)] pointer-events-none text-xs"
              size={13}
            />
          </div>
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
                companyMeta
              );
              return `Exported ${count} inventory products to Excel!`;
            }}
            onDownloadPdf={async () => {
              await downloadInventoryStockPdf(filteredProducts, companyMeta);
              return "Inventory stock report PDF downloaded!";
            }}
          />
        </div>
      </TableToolbar>

      <TableScroll>
        {isLoading && products.length === 0 ? (
          <TableSkeleton columnCount={10} rowCount={8} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title="No Products Found"
            description="There are no inventory products matching the current search or filter criteria."
          />
        ) : (
          <Table minWidth={1120}>
            <TableHead>
              {isColVisible("sl") && (
                <TableTh align="center" width={42}>
                  SL
                </TableTh>
              )}
              {isColVisible("code") && <TableTh>Code</TableTh>}
              {isColVisible("name") && (
                <TableTh>
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
              {isColVisible("category") && <TableTh>Category</TableTh>}
              {isColVisible("primaryUnit") && (
                <TableTh align="right">
                  <span
                    onClick={() => toggleHeaderSort("qty_asc", "qty_desc")}
                    className="inline-flex items-center gap-1 cursor-pointer select-none"
                  >
                    <span>Primary Unit</span>
                    <FiChevronDown
                      size={11}
                      className={`transition-transform ${
                        sortBy === "qty_asc" ? "rotate-180" : ""
                      }`}
                    />
                  </span>
                </TableTh>
              )}
              {isColVisible("secondaryUnit") && (
                <TableTh align="right">Secondary Unit</TableTh>
              )}
              {isColVisible("buyPrice") && (
                <TableTh align="right">Buy Price</TableTh>
              )}
              {isColVisible("sellPrice") && (
                <TableTh align="right">Sell Price</TableTh>
              )}
              {isColVisible("margin") && (
                <TableTh align="right">Margin</TableTh>
              )}
              {isColVisible("costValue") && (
                <TableTh align="right">
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
                <TableTh align="right">Retail Value</TableTh>
              )}
              {isColVisible("status") && (
                <TableTh align="center">Status</TableTh>
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

                    {isColVisible("category") && (
                      <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10.5px] font-medium bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] border border-[var(--ui-border)]">
                          {m.category}
                        </span>
                      </td>
                    )}

                    {isColVisible("primaryUnit") && (
                      <td className="py-2.5 px-3 text-right text-xs whitespace-nowrap tabular-nums">
                        <div className="inline-flex flex-col items-end">
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-semibold text-[var(--ui-text)]">
                              {m.primaryStockDisplay}
                            </span>
                            {!m.hasSecondaryUnit && stockAlertBadge}
                          </div>
                          {m.hasSecondaryUnit &&
                            m.packingLevels &&
                            m.packingLevels.toLowerCase() !==
                              m.primaryUnit.toLowerCase() && (
                              <span className="text-[10px] text-[var(--ui-text-subtle)]">
                                {m.packingLevels}
                              </span>
                            )}
                        </div>
                      </td>
                    )}

                    {isColVisible("secondaryUnit") && (
                      <td className="py-2.5 px-3 text-right text-xs whitespace-nowrap tabular-nums">
                        {m.hasSecondaryUnit ? (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <span className="font-semibold text-[var(--ui-text)]">
                              {m.secondaryStockDisplay}
                            </span>
                            {stockAlertBadge}
                          </div>
                        ) : (
                          <span className="text-[var(--ui-text-subtle)]">—</span>
                        )}
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

                    {isColVisible("margin") && (
                      <td className="py-2.5 px-3 text-right text-xs whitespace-nowrap tabular-nums">
                        <span
                          className={`font-semibold ${
                            m.marginPct >= 0
                              ? "text-[var(--ui-success)]"
                              : "text-[var(--ui-danger)]"
                          }`}
                        >
                          {m.marginPct.toFixed(1)}%
                        </span>
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

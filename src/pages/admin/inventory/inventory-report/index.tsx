import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FaBoxes,
  FaChartLine,
  FaExclamationTriangle,
  FaLayerGroup,
  FaMoneyBillWave,
} from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import StatsCards, { type StatCardItem } from "@/components/common/StatsCards";
import apiConfig from "@/config/api.json";
import { productListQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import { formatMoney } from "@/utils/formatters";
import { useReportDateRange } from "@/utils/trade-report-helpers";
import type { ProductItem } from "@/types";
import InventoryStockReportTable from "./components/InventoryStockReportTable";
import CategoryInventoryReportTable from "./components/CategoryInventoryReportTable";
import LowStockReportTable from "./components/LowStockReportTable";
import InventoryProductQuickModal from "./components/InventoryProductQuickModal";
import {
  type InventoryReportTab,
  normalizeInventoryProducts,
  filterProductsByDateRange,
  computeInventoryKpiTotals,
  aggregateCategoryInventory,
} from "./utils/inventory-report-helpers";

const InventoryReportPage: React.FC = () => {
  const { startDate, endDate, datePickerProps } = useReportDateRange("all");
  const [activeTab, setActiveTab] = useState<InventoryReportTab>("stock");

  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(
    null
  );
  const [isQuickModalOpen, setIsQuickModalOpen] = useState<boolean>(false);

  const productListUrl = apiConfig.productList.productListUrl;

  const {
    data: rawProductResponse,
    isLoading: isQueryLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [productListQueryKey],
    queryFn: async () =>
      postData<any>({
        url: productListUrl,
        body: { accessUser: buildAccessUser() },
      }),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const allProducts = normalizeInventoryProducts(rawProductResponse);
  const products = filterProductsByDateRange(allProducts, startDate, endDate);
  const isLoading = isQueryLoading || isFetching;

  // Derive unique category list from date-filtered products (or full catalog so filter remains useful)
  const categoryMap = new Map<string, string>();
  allProducts.forEach((p) => {
    const rawCat = String(p.category || p.categoryName || "").trim();
    if (rawCat) {
      categoryMap.set(rawCat.toLowerCase(), rawCat);
    }
  });
  const categoryOptions = Array.from(categoryMap.values()).sort((a, b) =>
    a.localeCompare(b)
  );

  const kpis = computeInventoryKpiTotals(products);
  const categorySummaries = aggregateCategoryInventory(products);

  const kpiCards: StatCardItem[] = [
    {
      title: `Products (${kpis.activeCount} Active)`,
      value: kpis.totalProducts.toLocaleString("en-IN"),
      icon: FaBoxes,
      color: "text-[var(--primary-color)]",
      bg: "bg-[var(--primary-color-light)]/60 border-[var(--primary-color-muted)]",
      iconBg: "bg-[var(--primary-color-muted)] text-[var(--primary-color)]",
    },
    {
      title: "Stock Cost Valuation",
      value: `৳ ${formatMoney(kpis.totalCostValue)}`,
      icon: FaMoneyBillWave,
      color: "text-[var(--ui-info)]",
      bg: "bg-[var(--ui-info-light)]/60 border-[var(--ui-info-border)]",
      iconBg: "bg-[var(--ui-info-border)] text-[var(--ui-info)]",
    },
    {
      title: `Retail Value (+৳ ${formatMoney(kpis.estimatedProfit)})`,
      value: `৳ ${formatMoney(kpis.totalRetailValue)}`,
      icon: FaChartLine,
      color: "text-[var(--ui-success)]",
      bg: "bg-[var(--ui-success-light)]/60 border-[var(--ui-success-border)]",
      iconBg: "bg-[var(--ui-success-border)] text-[var(--ui-success)]",
    },
    {
      title: `Low / Out Stock (${kpis.outOfStockCount} Out)`,
      value: kpis.lowStockCount.toLocaleString("en-IN"),
      icon: FaExclamationTriangle,
      color:
        kpis.lowStockCount > 0
          ? "text-[var(--ui-danger)]"
          : "text-[var(--ui-success)]",
      bg:
        kpis.lowStockCount > 0
          ? "bg-[var(--ui-danger-light)]/60 border-[var(--ui-danger-border)]"
          : "bg-[var(--ui-success-light)]/60 border-[var(--ui-success-border)]",
      iconBg:
        kpis.lowStockCount > 0
          ? "bg-[var(--ui-danger-border)] text-[var(--ui-danger)]"
          : "bg-[var(--ui-success-border)] text-[var(--ui-success)]",
    },
  ];

  const handleViewProduct = (product: ProductItem) => {
    setSelectedProduct(product);
    setIsQuickModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 max-w-[1600px] mx-auto w-full">
      {/* ── Top Header & Refresh ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <PageHeader
          headerTitle="Product Report"
          headerDescription="Stock valuation,  category breakdown and low-stock reorder alerts"
        />

        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 self-start md:self-auto shrink-0">
          <RefreshButton onClick={() => refetch()} isLoading={isLoading} />
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <StatsCards cards={kpiCards} />

      {/* ── Unified Tab Switcher ── */}
      <div className="flex items-center gap-1.5 border-b border-[var(--ui-border)]/90 -my-0.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("stock")}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === "stock"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]/50 rounded-t-md"
              : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] rounded-t-md"
          }`}
        >
          <FaBoxes size={11} />
          <span>Product Stock List ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === "categories"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]/50 rounded-t-md"
              : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] rounded-t-md"
          }`}
        >
          <FaLayerGroup size={11} />
          <span>Category-Wise Valuation ({categorySummaries.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("low_stock")}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === "low_stock"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]/50 rounded-t-md"
              : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] rounded-t-md"
          }`}
        >
          <FaExclamationTriangle size={11} />
          <span>Low Stock Alerts ({kpis.lowStockCount})</span>
        </button>
      </div>

      {/* ── Active Report Table ── */}
      <div className="w-full">
        {activeTab === "stock" && (
          <InventoryStockReportTable
            products={products}
            categoryOptions={categoryOptions}
            isLoading={isLoading}
            {...datePickerProps}
            onViewProduct={handleViewProduct}
          />
        )}

        {activeTab === "categories" && (
          <CategoryInventoryReportTable
            products={products}
            isLoading={isLoading}
            {...datePickerProps}
          />
        )}

        {activeTab === "low_stock" && (
          <LowStockReportTable
            products={products}
            categoryOptions={categoryOptions}
            isLoading={isLoading}
            {...datePickerProps}
            onViewProduct={handleViewProduct}
          />
        )}
      </div>

      {/* ── Product Valuation Quick Snapshot Drawer ── */}
      <InventoryProductQuickModal
        isOpen={isQuickModalOpen}
        onClose={() => {
          setIsQuickModalOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
      />
    </div>
  );
};

export default InventoryReportPage;

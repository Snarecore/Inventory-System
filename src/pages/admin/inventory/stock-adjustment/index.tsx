import React, { useState } from "react";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import { formatMoney } from "@/utils/formatters";
import { useStockAdjustmentReportQuery } from "@/hooks/useStockAdjustment";
import { useTradeProducts } from "@/hooks/useTradeProducts";
import { calculateStockAdjustmentKpi } from "@/services/stock-adjustment-service";
import { StatsCards, type StatCardItem } from "@/components/common";
import { StockAdjustmentTable } from "./components/StockAdjustmentTable";
import { StockAdjustmentDrawer } from "./components/StockAdjustmentDrawer";
import { StockAdjustmentDetailsModal } from "./components/StockAdjustmentDetailsModal";
import type { StockAdjustmentReportItem, ProductItem } from "@/types";
import {
  FaPlus,
  FaBoxes,
  FaArrowUp,
  FaArrowDown,
  FaExchangeAlt,
} from "react-icons/fa";

export const StockAdjustmentPage: React.FC = () => {
  // Query adjustment report
  const { data: reportData, isLoading, isFetching, refetch } =
    useStockAdjustmentReportQuery();
  const items = reportData?.data || [];

  // Query product catalog
  const {
    allProducts,
    isLoading: isProductsLoading,
    refetch: refetchProducts,
  } = useTradeProducts();

  // Helper to determine if a product is active and not deleted
  const isProductActive = (p: ProductItem) => {
    const isDel = String(
      p.isDeleted || (p as any).is_deleted || ""
    ).trim().toUpperCase();
    if (isDel === "Y" || isDel === "YES" || isDel === "TRUE" || isDel === "1")
      return false;
    const rawStatus = String(p.status ?? "").trim().toLowerCase();
    if (rawStatus === "inactive" || rawStatus === "false" || rawStatus === "0")
      return false;
    return true;
  };

  // 1. Filter product catalog: ONLY active products
  const activeProducts = (allProducts || []).filter(isProductActive);

  // 2. Set of identifiers for active products (id, pcode, productCode, name)
  const activeProductIdentifiers = new Set<string>();
  activeProducts.forEach((p) => {
    if (p.id !== undefined && p.id !== null)
      activeProductIdentifiers.add(String(p.id).trim().toLowerCase());
    if (p.pcode) activeProductIdentifiers.add(String(p.pcode).trim().toLowerCase());
    if (p.productCode) activeProductIdentifiers.add(String(p.productCode).trim().toLowerCase());
    if (p.name) activeProductIdentifiers.add(String(p.name).trim().toLowerCase());
  });

  // 3. Filter adjustment records: ONLY show records belonging to products currently ACTIVE in the product list
  const activeAdjustmentItems: StockAdjustmentReportItem[] =
    isProductsLoading || !allProducts || allProducts.length === 0
      ? []
      : items
          .filter((item) => {
            const pId = String(item.productId || "").trim().toLowerCase();
            const pName = String(item.productName || "").trim().toLowerCase();
            return (
              (pId && activeProductIdentifiers.has(pId)) ||
              (pName && activeProductIdentifiers.has(pName))
            );
          })
          .map((item) => {
            const pId = String(item.productId || "").trim().toLowerCase();
            const pName = String(item.productName || "").trim().toLowerCase();
            const matched = activeProducts.find((p) => {
              const id = String(p.id ?? "").trim().toLowerCase();
              const pcode = String(p.pcode ?? "").trim().toLowerCase();
              const code = String(p.productCode ?? "").trim().toLowerCase();
              const name = String(p.name ?? "").trim().toLowerCase();
              return (
                (pId && (id === pId || pcode === pId || code === pId)) ||
                (pName && name === pName)
              );
            });

            const productUnit = matched?.unit || matched?.secondary_unit || "";
            const rawPack = String(item.packSize || "").trim();
            const packSize =
              productUnit && !productUnit.toLowerCase().includes("dozen")
                ? productUnit
                : !rawPack || rawPack.toLowerCase().includes("dozen")
                ? "Pcs"
                : rawPack;

            return {
              ...item,
              packSize,
            };
          });

  // 4. Recalculate KPIs strictly for active products
  const kpi = calculateStockAdjustmentKpi(activeAdjustmentItems);

  const statCards: StatCardItem[] = [
    {
      title: "Total Adjustments",
      value: kpi.totalAdjustments,
      icon: FaBoxes,
      color: "text-[var(--ui-info)]",
      bg: "bg-[var(--ui-info-light)]/60 border-[var(--ui-info-border)] hover:border-[var(--ui-info-border)]",
      iconBg: "bg-[var(--ui-info-border)] text-[var(--ui-info)]",
    },
    {
      title: "Total Stock In (+)",
      value: `+${kpi.totalInQty}`,
      icon: FaArrowUp,
      color: "text-[var(--ui-success)]",
      bg: "bg-[var(--ui-success-light)]/60 border-[var(--ui-success-border)] hover:border-[var(--ui-success-border)]",
      iconBg: "bg-[var(--ui-success-border)] text-[var(--ui-success)]",
    },
    {
      title: "Total Stock Out (-)",
      value: `-${kpi.totalOutQty}`,
      icon: FaArrowDown,
      color: "text-[var(--ui-danger)]",
      bg: "bg-[var(--ui-danger-light)]/60 border-[var(--ui-danger-border)] hover:border-[var(--ui-danger-border)]",
      iconBg: "bg-[var(--ui-danger-border)] text-[var(--ui-danger)]",
    },
    {
      title: "Net Value Impact",
      value: `${kpi.totalValueImpact >= 0 ? "+" : "-"}৳ ${formatMoney(Math.abs(kpi.totalValueImpact))}`,
      icon: FaExchangeAlt,
      color: "text-[var(--primary-color)]",
      bg: "bg-[var(--primary-color-light)]/60 border-[var(--primary-color-muted)] hover:border-[var(--primary-color-muted)]",
      iconBg: "bg-[var(--primary-color-muted)] text-[var(--primary-color)]",
    },
  ];

  // State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] =
    useState<StockAdjustmentReportItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleOpenCreate = () => {
    setIsDrawerOpen(true);
  };

  const handleViewDetails = (item: StockAdjustmentReportItem) => {
    setSelectedAdjustment(item);
    setIsDetailsOpen(true);
  };

  const handleRefresh = () => {
    refetch();
    refetchProducts();
  };

  const isTableLoading = isLoading || isProductsLoading;

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Page Header & Top Action Buttons */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          headerTitle="Stock Adjustments"
          headerDescription="Audit, track, and record physical inventory adjustments, additions, damages, and write-offs"
        />

        <div className="flex flex-wrap items-center gap-2">
          <RefreshButton
            onClick={handleRefresh}
            isLoading={isLoading || isFetching || isProductsLoading}
          />

          <button
            type="button"
            onClick={handleOpenCreate}
            className="bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] text-white text-xs sm:text-xs font-medium cursor-pointer h-8 px-3 rounded-md flex justify-center items-center gap-1.5 transition-all ease-in duration-200 whitespace-nowrap shrink-0"
          >
            <FaPlus size={11} className="text-white" />
            <span>Stock Adjustment</span>
          </button>
        </div>
      </div>

      {/* Reusable KPI Summary Cards */}
      <StatsCards cards={statCards} />

      {/* Stock Adjustment Audit Table */}
      <StockAdjustmentTable
        items={activeAdjustmentItems}
        isLoading={isTableLoading}
        onViewDetails={handleViewDetails}
      />

      {/* Drawer for creating stock adjustments */}
      <StockAdjustmentDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        products={activeProducts}
        onSuccess={() => {
          handleRefresh();
        }}
      />

      {/* Details drawer for inspecting adjustment details */}
      <StockAdjustmentDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedAdjustment(null);
        }}
        adjustment={selectedAdjustment}
      />
    </div>
  );
};

export default StockAdjustmentPage;

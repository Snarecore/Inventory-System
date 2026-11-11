import moment from "moment";
import type { ProductItem } from "@/types";
import { formatMoney } from "@/utils/formatters";
import {
  buildAndDownloadExcel,
  resolveThemeArgb,
  argbToRgbTuple,
} from "@/utils/excel-export";
import {
  buildDynamicExcelPayload,
  buildDynamicPdfPayload,
  type ExportColumnDef,
} from "@/utils/report-export-columns";
import { getProductStockDisplay } from "@/utils/product-unit";
import {
  type ReportCompanyMeta,
  REPORT_RGB,
  generateAndDownloadCorporatePdf,
  calculateRevenueSharePct,
} from "@/utils/trade-report-helpers";

export type InventoryReportTab = "stock" | "categories" | "low_stock";

export interface NormalizedProductMetrics {
  id: string;
  code: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  primaryUnit: string;
  secondaryUnit: string;
  primaryStockDisplay: string;
  secondaryStockDisplay: string;
  displayStock: string;
  primaryStockText: string;
  hasSecondaryUnit: boolean;
  packingLevels: string;
  conversionDisplay: string;
  quantity: number;
  lowThreshold: number;
  buyPrice: number;
  sellPrice: number;
  costValue: number;
  retailValue: number;
  potentialProfit: number;
  marginPct: number;
  isActive: boolean;
  stockState: "OUT" | "LOW" | "IN";
  shortfallQty: number;
  restockCost: number;
  createdAt: string;
}

export interface CategoryInventorySummary {
  category: string;
  productCount: number;
  activeCount: number;
  inactiveCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalUnits: number;
  totalCostValue: number;
  totalRetailValue: number;
  estimatedProfit: number;
}

export interface InventoryKpiTotals {
  totalProducts: number;
  activeCount: number;
  inactiveCount: number;
  totalStockUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalCostValue: number;
  totalRetailValue: number;
  estimatedProfit: number;
}

/**
 * Normalizes raw API product response payload into active (non-deleted) ProductItem array
 */
export function normalizeInventoryProducts(rawResponse: any): ProductItem[] {
  if (!rawResponse) return [];

  let rawList: any[] = [];
  if (Array.isArray(rawResponse?.productsList)) {
    rawList = rawResponse.productsList;
  } else if (Array.isArray(rawResponse?.productList)) {
    rawList = rawResponse.productList;
  } else if (Array.isArray(rawResponse?.data)) {
    rawList = rawResponse.data;
  } else if (Array.isArray(rawResponse)) {
    rawList = rawResponse;
  }

  return rawList.filter((p: any) => {
    const isDel = String(p?.isDeleted || p?.is_deleted || "")
      .trim()
      .toUpperCase();
    return (
      isDel !== "Y" && isDel !== "YES" && isDel !== "TRUE" && isDel !== "1"
    );
  });
}

/**
 * Filters products inclusively by selected date range when bounds are set
 */
export function filterProductsByDateRange(
  products: ProductItem[],
  startDate?: string,
  endDate?: string
): ProductItem[] {
  if (!startDate || !endDate) return products;

  const startBoundary = moment(startDate, "YYYY-MM-DD").startOf("day");
  const endBoundary = moment(endDate, "YYYY-MM-DD").endOf("day");
  if (!startBoundary.isValid() || !endBoundary.isValid()) return products;

  return products.filter((p) => {
    const rawDate = p.createdAt || p.created_at || p.date;
    if (!rawDate) return false;
    const parsed = moment(rawDate);
    if (!parsed.isValid()) return false;
    return parsed.isBetween(startBoundary, endBoundary, undefined, "[]");
  });
}

/**
 * Single source of truth for normalizing ProductItem metrics, valuation & alert flags
 */
export function extractInventoryProductMetrics(
  product: ProductItem,
  fallbackIndex = 0
): NormalizedProductMetrics {
  const raw: any = product || {};
  const id = String(raw.id ?? raw.productId ?? raw.pcode ?? fallbackIndex);
  const code = String(
    raw.pcode || raw.productCode || raw.code || raw.sku || "-"
  ).trim();
  const sku = String(raw.sku || "-").trim();
  const barcode = String(raw.barcode || "-").trim();
  const name = String(raw.name || raw.productName || "Unnamed Product").trim();
  const category = String(
    raw.category || raw.categoryName || "General"
  ).trim() || "General";
  const primaryUnit = String(raw.unit || "PCS").trim() || "PCS";
  const secondaryUnit = String(
    raw.secondary_unit || raw.secondaryUnit || ""
  ).trim();
  const unit = secondaryUnit || primaryUnit;
  const stockDisplay = getProductStockDisplay(raw);
  const packingLevels = String(
    raw.packing_levels || raw.packingLevels || ""
  ).trim();

  const isPackingSameAsUnit =
    packingLevels.toLowerCase() === primaryUnit.toLowerCase() ||
    Boolean(
      secondaryUnit &&
        packingLevels.toLowerCase() === secondaryUnit.toLowerCase()
    );
  const isInvalidPacking =
    !packingLevels ||
    isPackingSameAsUnit ||
    packingLevels === "-" ||
    packingLevels.toUpperCase() === "N/A" ||
    packingLevels === "0";

  let conversionDisplay = "";
  if (stockDisplay.hasSecondaryUnit) {
    if (!isInvalidPacking) {
      conversionDisplay = /^\d+(\.\d+)?$/.test(packingLevels)
        ? `${packingLevels} ${secondaryUnit}/${primaryUnit}`
        : packingLevels;
    } else if (
      stockDisplay.conversionFactor &&
      stockDisplay.conversionFactor > 0
    ) {
      conversionDisplay = `${stockDisplay.conversionFactor} ${secondaryUnit}/${primaryUnit}`;
    }
  } else if (!isInvalidPacking) {
    conversionDisplay = packingLevels;
  }

  const quantity = Number(raw.quantity ?? raw.stock ?? 0);
  const formattedQty = quantity.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

  let primaryStockDisplay = `${formattedQty} ${primaryUnit}`;
  if (stockDisplay.hasSecondaryUnit) {
    if (stockDisplay.conversionFactor && stockDisplay.conversionFactor > 0) {
      const converted = Number(
        (quantity / stockDisplay.conversionFactor).toFixed(2)
      );
      const formattedPrimary = converted.toLocaleString("en-IN", {
        maximumFractionDigits: 2,
      });
      primaryStockDisplay = `${formattedPrimary} ${primaryUnit}`;
    } else {
      primaryStockDisplay = primaryUnit;
    }
  }
  const secondaryStockDisplay = stockDisplay.hasSecondaryUnit
    ? `${formattedQty} ${secondaryUnit}`
    : "-";

  const lowThreshold = Number(
    raw.lowStockThreshold ?? raw.low_stock_threshold ?? 5
  );
  const buyPrice = Number(raw.buyPrice ?? raw.buy_price ?? 0);
  const sellPrice = Number(raw.sellPrice ?? raw.sell_price ?? 0);

  const costValue = quantity * buyPrice;
  const retailValue = quantity * sellPrice;
  const potentialProfit = retailValue - costValue;
  const marginPct =
    sellPrice > 0 ? ((sellPrice - buyPrice) / sellPrice) * 100 : 0;

  const rawStatus = String(raw.status ?? "").trim().toLowerCase();
  const isActive =
    rawStatus !== "inactive" && rawStatus !== "false" && rawStatus !== "0";

  const stockState: "OUT" | "LOW" | "IN" =
    quantity <= 0 ? "OUT" : quantity <= lowThreshold ? "LOW" : "IN";

  // Target restock amount needed to climb above low threshold (at least 1 unit when out of stock with 0 threshold)
  const targetMin = lowThreshold > 0 ? lowThreshold : 1;
  const shortfallQty =
    stockState === "IN" ? 0 : Math.max(0, targetMin - Math.max(0, quantity));
  const restockCost = shortfallQty * buyPrice;

  return {
    id,
    code: code || "-",
    sku: sku || "-",
    barcode: barcode || "-",
    name,
    category,
    unit: stockDisplay.unit || unit,
    primaryUnit,
    secondaryUnit,
    primaryStockDisplay,
    secondaryStockDisplay,
    displayStock: stockDisplay.displayStock,
    primaryStockText: stockDisplay.primaryStockText,
    hasSecondaryUnit: stockDisplay.hasSecondaryUnit,
    packingLevels,
    conversionDisplay,
    quantity,
    lowThreshold,
    buyPrice,
    sellPrice,
    costValue,
    retailValue,
    potentialProfit,
    marginPct,
    isActive,
    stockState,
    shortfallQty,
    restockCost,
    createdAt: String(raw.createdAt || raw.created_at || "").trim(),
  };
}

/**
 * Computes high-level KPI totals for StatsCards & report headers
 */
export function computeInventoryKpiTotals(
  products: ProductItem[]
): InventoryKpiTotals {
  let activeCount = 0;
  let inactiveCount = 0;
  let totalStockUnits = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalCostValue = 0;
  let totalRetailValue = 0;

  for (let i = 0; i < products.length; i++) {
    const m = extractInventoryProductMetrics(products[i], i);
    if (m.isActive) activeCount++;
    else inactiveCount++;

    totalStockUnits += m.quantity;
    if (m.stockState === "OUT") {
      outOfStockCount++;
      lowStockCount++;
    } else if (m.stockState === "LOW") {
      lowStockCount++;
    }

    totalCostValue += m.costValue;
    totalRetailValue += m.retailValue;
  }

  return {
    totalProducts: products.length,
    activeCount,
    inactiveCount,
    totalStockUnits,
    lowStockCount,
    outOfStockCount,
    totalCostValue,
    totalRetailValue,
    estimatedProfit: totalRetailValue - totalCostValue,
  };
}

/**
 * Aggregates product metrics cleanly by category
 */
export function aggregateCategoryInventory(
  products: ProductItem[]
): CategoryInventorySummary[] {
  const map: Record<string, CategoryInventorySummary> = {};

  products.forEach((p, idx) => {
    const m = extractInventoryProductMetrics(p, idx);
    const key = m.category.toLowerCase();

    if (!map[key]) {
      map[key] = {
        category: m.category,
        productCount: 0,
        activeCount: 0,
        inactiveCount: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        totalUnits: 0,
        totalCostValue: 0,
        totalRetailValue: 0,
        estimatedProfit: 0,
      };
    }

    map[key].productCount += 1;
    if (m.isActive) map[key].activeCount += 1;
    else map[key].inactiveCount += 1;

    if (m.stockState === "OUT") {
      map[key].outOfStockCount += 1;
      map[key].lowStockCount += 1;
    } else if (m.stockState === "LOW") {
      map[key].lowStockCount += 1;
    }

    map[key].totalUnits += m.quantity;
    map[key].totalCostValue += m.costValue;
    map[key].totalRetailValue += m.retailValue;
    map[key].estimatedProfit += m.potentialProfit;
  });

  return Object.values(map);
}

function getExportFileDateSuffix(meta: ReportCompanyMeta): string {
  if (meta.startDate && meta.endDate) {
    return `${meta.startDate}_to_${meta.endDate}`;
  }
  return moment().format("YYYY-MM-DD");
}

function getPdfStockColor(state: "OUT" | "LOW" | "IN"): [number, number, number] {
  if (state === "OUT") return REPORT_RGB.rose;
  if (state === "LOW") return REPORT_RGB.amber;
  return REPORT_RGB.emerald;
}

type StockTotals = {
  sumQty: number;
  sumCost: number;
  sumRetail: number;
  sumProfit: number;
};

function buildInventoryStockColumns(
  themeRgb: [number, number, number]
): ExportColumnDef<NormalizedProductMetrics, StockTotals>[] {
  return [
    {
      key: "sl",
      excelHeader: "SL",
      isLeadingLabel: true,
      pdfStyle: { halign: "center", cellWidth: 8 },
      excelValue: (_, idx) => idx + 1,
      pdfCell: (_, idx) => idx + 1,
    },
    {
      key: "code",
      excelHeader: "Code",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", cellWidth: 20 },
      excelValue: (m) => m.code,
      pdfCell: (m) => m.code,
    },
    {
      key: "name",
      excelHeader: "Product Name",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", fontStyle: "bold" },
      excelValue: (m) => m.name,
      pdfCell: (m) => m.name,
    },
    {
      key: "category",
      excelHeader: "Category",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", cellWidth: 20 },
      excelValue: (m) => m.category,
      pdfCell: (m) => m.category,
    },
    {
      key: "primaryUnit",
      excelHeader: "Primary Unit",
      isLeadingLabel: true,
      pdfStyle: { halign: "center", cellWidth: 16 },
      excelValue: (m) => m.primaryUnit,
      pdfCell: (m) => m.primaryUnit,
    },
    {
      key: "secondaryUnit",
      excelHeader: "Secondary Unit",
      isLeadingLabel: true,
      pdfStyle: { halign: "center", cellWidth: 16 },
      excelValue: (m) => (m.hasSecondaryUnit ? m.secondaryUnit : "-"),
      pdfCell: (m) => (m.hasSecondaryUnit ? m.secondaryUnit : "-"),
    },
    {
      key: "conversion",
      excelHeader: "Conversion",
      isLeadingLabel: true,
      pdfStyle: { halign: "center", cellWidth: 20 },
      excelValue: (m) => m.conversionDisplay || "-",
      pdfCell: (m) => m.conversionDisplay || "-",
    },
    {
      key: "stock",
      excelHeader: "Stock",
      pdfStyle: { halign: "right", cellWidth: 15, fontStyle: "bold" },
      excelValue: (m) => m.quantity,
      excelTotalValue: (t) => t.sumQty,
      pdfCell: (m) =>
        m.quantity.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
      pdfSummaryCell: (t) => ({
        content: t.sumQty.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
        styles: { textColor: REPORT_RGB.dark },
      }),
    },
    {
      key: "buyPrice",
      excelHeader: "Buy Price (BDT)",
      pdfHeader: "Buy Price",
      pdfStyle: { halign: "right", cellWidth: 18 },
      excelValue: (m) => m.buyPrice,
      excelTotalValue: () => "-",
      pdfCell: (m) => formatMoney(m.buyPrice),
      pdfSummaryCell: () => ({
        content: "-",
        styles: { textColor: REPORT_RGB.muted, fontStyle: "normal" },
      }),
    },
    {
      key: "sellPrice",
      excelHeader: "Sell Price (BDT)",
      pdfHeader: "Sell Price",
      pdfStyle: { halign: "right", cellWidth: 18 },
      excelValue: (m) => m.sellPrice,
      excelTotalValue: () => "-",
      pdfCell: (m) => formatMoney(m.sellPrice),
      pdfSummaryCell: () => ({
        content: "-",
        styles: { textColor: REPORT_RGB.muted, fontStyle: "normal" },
      }),
    },
    {
      key: "margin",
      excelHeader: "Margin (%)",
      pdfHeader: "Margin %",
      pdfStyle: { halign: "right", cellWidth: 15 },
      excelValue: (m) => `${m.marginPct.toFixed(1)}%`,
      excelTotalValue: (t) =>
        t.sumRetail > 0
          ? `${((t.sumProfit / t.sumRetail) * 100).toFixed(1)}%`
          : "0.0%",
      pdfCell: (m) => `${m.marginPct.toFixed(1)}%`,
      pdfSummaryCell: (t) => ({
        content:
          t.sumRetail > 0
            ? `${((t.sumProfit / t.sumRetail) * 100).toFixed(1)}%`
            : "0.0%",
        styles: { textColor: REPORT_RGB.dark },
      }),
    },
    {
      key: "costValue",
      excelHeader: "Cost Value (BDT)",
      pdfHeader: "Cost Value",
      pdfStyle: { halign: "right", cellWidth: 21, fontStyle: "bold" },
      excelValue: (m) => m.costValue,
      excelTotalValue: (t) => t.sumCost,
      pdfCell: (m) => formatMoney(m.costValue),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.sumCost),
        styles: { textColor: themeRgb },
      }),
    },
    {
      key: "retailValue",
      excelHeader: "Retail Value (BDT)",
      pdfHeader: "Retail Value",
      pdfStyle: {
        halign: "right",
        cellWidth: 21,
        fontStyle: "bold",
        textColor: REPORT_RGB.emerald,
      },
      excelValue: (m) => m.retailValue,
      excelTotalValue: (t) => t.sumRetail,
      pdfCell: (m) => formatMoney(m.retailValue),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.sumRetail),
        styles: { textColor: REPORT_RGB.emerald },
      }),
    },
    {
      key: "status",
      excelHeader: "Status",
      pdfStyle: { halign: "center", cellWidth: 16 },
      excelValue: (m) => (m.isActive ? "Active" : "Inactive"),
      excelTotalValue: () => "-",
      pdfCell: (m) => ({
        content: m.isActive ? "ACTIVE" : "INACTIVE",
        styles: {
          textColor: m.isActive ? REPORT_RGB.emerald : REPORT_RGB.rose,
          fontStyle: "bold",
        },
      }),
    },
  ];
}

/**
 * Tab 1 Export: Product Stock & Valuation Excel Report
 */
export async function exportInventoryStockExcel(
  products: ProductItem[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<number> {
  if (!products || products.length === 0) {
    throw new Error("No product records available to export");
  }

  let sumQty = 0;
  let sumCost = 0;
  let sumRetail = 0;
  let sumProfit = 0;

  const metrics = products.map((p, idx) => {
    const m = extractInventoryProductMetrics(p, idx);
    sumQty += m.quantity;
    sumCost += m.costValue;
    sumRetail += m.retailValue;
    sumProfit += m.potentialProfit;
    return m;
  });

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildInventoryStockColumns(themeRgb);
  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    metrics,
    columns,
    { sumQty, sumCost, sumRetail, sumProfit },
    "TOTAL INVENTORY VALUATION",
    visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    fileName: `Inventory_Stock_Report_${getExportFileDateSuffix(meta)}.xlsx`,
    sheetName: "Inventory Report",
    reportTitle: "Inventory Stock & Valuation Report",
    businessName: meta.businessName,
    businessAddress: meta.businessAddress,
    businessLogoUrl: meta.businessLogoUrl,
    startDate: meta.startDate,
    endDate: meta.endDate,
    totalLabel: "Total Items",
    totalSummarySpan,
    includeSignatures: true,
  });

  return products.length;
}

/**
 * Tab 1 Export: Product Stock & Valuation Corporate PDF Report
 */
export async function downloadInventoryStockPdf(
  products: ProductItem[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<void> {
  if (!products || products.length === 0) {
    throw new Error("No product records available to download PDF");
  }

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  let sumQty = 0;
  let sumCost = 0;
  let sumRetail = 0;
  let sumProfit = 0;

  const metrics = products.map((p, idx) => {
    const m = extractInventoryProductMetrics(p, idx);
    sumQty += m.quantity;
    sumCost += m.costValue;
    sumRetail += m.retailValue;
    sumProfit += m.potentialProfit;
    return m;
  });

  const columns = buildInventoryStockColumns(themeRgb);
  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    metrics,
    columns,
    { sumQty, sumCost, sumRetail, sumProfit },
    "TOTAL INVENTORY VALUATION",
    {
      visibleColumns,
      preserveFixedWidthsFromCount: 11,
    }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `Inventory_Stock_Report_${getExportFileDateSuffix(meta)}.pdf`,
    reportTitle: "Inventory Stock & Valuation Report",
    metaRightLabel: `Total Items: ${products.length}`,
    headers,
    bodyRows,
    meta,
    columnStyles,
  });
}

type CategoryTotals = {
  sumProducts: number;
  sumActive: number;
  sumLow: number;
  sumUnits: number;
  sumCost: number;
  sumRetail: number;
  sumProfit: number;
};

function buildCategoryInventoryColumns(
  grandTotalCost: number,
  themeRgb: [number, number, number]
): ExportColumnDef<CategoryInventorySummary, CategoryTotals>[] {
  return [
    {
      key: "sl",
      excelHeader: "SL",
      isLeadingLabel: true,
      pdfStyle: { halign: "center", cellWidth: 12 },
      excelValue: (_, idx) => idx + 1,
      pdfCell: (_, idx) => idx + 1,
    },
    {
      key: "category",
      excelHeader: "Category Name",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", fontStyle: "bold" },
      excelValue: (c) => c.category,
      pdfCell: (c) => c.category,
    },
    {
      key: "products",
      excelHeader: "Products Count",
      pdfHeader: "Products",
      pdfStyle: { halign: "right", cellWidth: 22 },
      excelValue: (c) => c.productCount,
      excelTotalValue: (t) => t.sumProducts,
      pdfCell: (c) => c.productCount,
      pdfSummaryCell: (t) => ({
        content: t.sumProducts,
        styles: { textColor: REPORT_RGB.dark },
      }),
    },
    {
      key: "active",
      excelHeader: "Active Count",
      pdfHeader: "Active",
      pdfStyle: {
        halign: "right",
        cellWidth: 20,
        textColor: REPORT_RGB.emerald,
      },
      excelValue: (c) => c.activeCount,
      excelTotalValue: (t) => t.sumActive,
      pdfCell: (c) => c.activeCount,
      pdfSummaryCell: (t) => ({
        content: t.sumActive,
        styles: { textColor: REPORT_RGB.emerald },
      }),
    },
    {
      key: "lowStock",
      excelHeader: "Low Stock Count",
      pdfHeader: "Low Stock",
      pdfStyle: { halign: "right", cellWidth: 22 },
      excelValue: (c) => c.lowStockCount,
      excelTotalValue: (t) => t.sumLow,
      pdfCell: (c) => ({
        content: c.lowStockCount,
        styles: {
          textColor: c.lowStockCount > 0 ? REPORT_RGB.amber : REPORT_RGB.muted,
          fontStyle: c.lowStockCount > 0 ? "bold" : "normal",
        },
      }),
      pdfSummaryCell: (t) => ({
        content: t.sumLow,
        styles: { textColor: REPORT_RGB.amber },
      }),
    },
    {
      key: "stockUnits",
      excelHeader: "Stock Qty",
      pdfStyle: { halign: "right", cellWidth: 26 },
      excelValue: (c) => c.totalUnits,
      excelTotalValue: (t) => t.sumUnits,
      pdfCell: (c) => c.totalUnits,
      pdfSummaryCell: (t) => ({
        content: t.sumUnits,
        styles: { textColor: REPORT_RGB.dark },
      }),
    },
    {
      key: "costValue",
      excelHeader: "Cost Value (BDT)",
      pdfHeader: "Cost Value",
      pdfStyle: { halign: "right", cellWidth: 30, fontStyle: "bold" },
      excelValue: (c) => c.totalCostValue,
      excelTotalValue: (t) => t.sumCost,
      pdfCell: (c) => formatMoney(c.totalCostValue),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.sumCost),
        styles: { textColor: themeRgb },
      }),
    },
    {
      key: "retailValue",
      excelHeader: "Retail Value (BDT)",
      pdfHeader: "Retail Value",
      pdfStyle: {
        halign: "right",
        cellWidth: 30,
        fontStyle: "bold",
        textColor: REPORT_RGB.emerald,
      },
      excelValue: (c) => c.totalRetailValue,
      excelTotalValue: (t) => t.sumRetail,
      pdfCell: (c) => formatMoney(c.totalRetailValue),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.sumRetail),
        styles: { textColor: REPORT_RGB.emerald },
      }),
    },
    {
      key: "estProfit",
      excelHeader: "Est. Profit (BDT)",
      pdfHeader: "Est. Profit",
      pdfStyle: {
        halign: "right",
        cellWidth: 28,
        fontStyle: "bold",
        textColor: REPORT_RGB.emerald,
      },
      excelValue: (c) => c.estimatedProfit,
      excelTotalValue: (t) => t.sumProfit,
      pdfCell: (c) => formatMoney(c.estimatedProfit),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.sumProfit),
        styles: { textColor: REPORT_RGB.emerald },
      }),
    },
    {
      key: "valueShare",
      excelHeader: "Value Share",
      pdfHeader: "Share %",
      pdfStyle: { halign: "right", cellWidth: 20 },
      excelValue: (c) =>
        `${calculateRevenueSharePct(c.totalCostValue, grandTotalCost)}%`,
      excelTotalValue: () => "100.0%",
      pdfCell: (c) =>
        `${calculateRevenueSharePct(c.totalCostValue, grandTotalCost)}%`,
      pdfSummaryCell: () => ({
        content: "100.0%",
        styles: { textColor: REPORT_RGB.dark },
      }),
    },
  ];
}

/**
 * Tab 2 Export: Category-Wise Inventory Excel Report
 */
export async function exportCategoryInventoryExcel(
  categories: CategoryInventorySummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<number> {
  if (!categories || categories.length === 0) {
    throw new Error("No category inventory records available to export");
  }

  let sumProducts = 0;
  let sumActive = 0;
  let sumLow = 0;
  let sumUnits = 0;
  let sumCost = 0;
  let sumRetail = 0;
  let sumProfit = 0;

  categories.forEach((c) => {
    sumProducts += c.productCount;
    sumActive += c.activeCount;
    sumLow += c.lowStockCount;
    sumUnits += c.totalUnits;
    sumCost += c.totalCostValue;
    sumRetail += c.totalRetailValue;
    sumProfit += c.estimatedProfit;
  });

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildCategoryInventoryColumns(sumCost, themeRgb);
  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    categories,
    columns,
    { sumProducts, sumActive, sumLow, sumUnits, sumCost, sumRetail, sumProfit },
    "TOTAL BY CATEGORY",
    visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    fileName: `Category_Inventory_Report_${getExportFileDateSuffix(meta)}.xlsx`,
    sheetName: "Category Valuation",
    reportTitle: "Category-Wise Inventory Valuation Report",
    businessName: meta.businessName,
    businessAddress: meta.businessAddress,
    businessLogoUrl: meta.businessLogoUrl,
    startDate: meta.startDate,
    endDate: meta.endDate,
    totalLabel: "Total Categories",
    totalSummarySpan,
    includeSignatures: true,
  });

  return categories.length;
}

/**
 * Tab 2 Export: Category-Wise Inventory Corporate PDF Report
 */
export async function downloadCategoryInventoryPdf(
  categories: CategoryInventorySummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<void> {
  if (!categories || categories.length === 0) {
    throw new Error("No category inventory records available to download PDF");
  }

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  let sumProducts = 0;
  let sumActive = 0;
  let sumLow = 0;
  let sumUnits = 0;
  let sumCost = 0;
  let sumRetail = 0;
  let sumProfit = 0;

  categories.forEach((c) => {
    sumProducts += c.productCount;
    sumActive += c.activeCount;
    sumLow += c.lowStockCount;
    sumUnits += c.totalUnits;
    sumCost += c.totalCostValue;
    sumRetail += c.totalRetailValue;
    sumProfit += c.estimatedProfit;
  });

  const columns = buildCategoryInventoryColumns(sumCost, themeRgb);
  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    categories,
    columns,
    { sumProducts, sumActive, sumLow, sumUnits, sumCost, sumRetail, sumProfit },
    "TOTAL",
    {
      visibleColumns,
      preserveFixedWidthsFromCount: 8,
    }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `Category_Inventory_Report_${getExportFileDateSuffix(meta)}.pdf`,
    reportTitle: "Category-Wise Inventory Valuation Report",
    metaRightLabel: `Total Categories: ${categories.length}`,
    headers,
    bodyRows,
    meta,
    columnStyles,
  });
}

type LowStockTotals = {
  sumCurrent: number;
  sumShortfall: number;
  sumRestockCost: number;
  itemCount: number;
};

function buildLowStockColumns(): ExportColumnDef<
  NormalizedProductMetrics,
  LowStockTotals
>[] {
  return [
    {
      key: "sl",
      excelHeader: "SL",
      isLeadingLabel: true,
      pdfStyle: { halign: "center", cellWidth: 10 },
      excelValue: (_, idx) => idx + 1,
      pdfCell: (_, idx) => idx + 1,
    },
    {
      key: "code",
      excelHeader: "Code",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", cellWidth: 26 },
      excelValue: (m) => m.code,
      pdfCell: (m) => m.code,
    },
    {
      key: "name",
      excelHeader: "Product Name",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", fontStyle: "bold" },
      excelValue: (m) => m.name,
      pdfCell: (m) => m.name,
    },
    {
      key: "category",
      excelHeader: "Category",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", cellWidth: 28 },
      excelValue: (m) => m.category,
      pdfCell: (m) => m.category,
    },
    {
      key: "currentStock",
      excelHeader: "Current Qty",
      pdfHeader: "Current Stock",
      pdfStyle: { halign: "right", cellWidth: 28 },
      excelValue: (m) => m.quantity,
      excelTotalValue: (t) => t.sumCurrent,
      pdfCell: (m) => m.displayStock,
      pdfSummaryCell: (t) => ({
        content: t.sumCurrent,
        styles: { textColor: REPORT_RGB.dark },
      }),
    },
    {
      key: "minThreshold",
      excelHeader: "Min Threshold",
      pdfHeader: "Threshold",
      pdfStyle: { halign: "right", cellWidth: 22 },
      excelValue: (m) => m.lowThreshold,
      excelTotalValue: () => "-",
      pdfCell: (m) => m.lowThreshold,
      pdfSummaryCell: () => ({
        content: "-",
        styles: { textColor: REPORT_RGB.muted, fontStyle: "normal" },
      }),
    },
    {
      key: "shortfall",
      excelHeader: "Shortfall Qty",
      pdfHeader: "Shortfall",
      pdfStyle: {
        halign: "right",
        cellWidth: 22,
        fontStyle: "bold",
        textColor: REPORT_RGB.rose,
      },
      excelValue: (m) => m.shortfallQty,
      excelTotalValue: (t) => t.sumShortfall,
      pdfCell: (m) => m.shortfallQty,
      pdfSummaryCell: (t) => ({
        content: t.sumShortfall,
        styles: { textColor: REPORT_RGB.rose },
      }),
    },
    {
      key: "buyPrice",
      excelHeader: "Buy Price (BDT)",
      pdfHeader: "Buy Price",
      pdfStyle: { halign: "right", cellWidth: 24 },
      excelValue: (m) => m.buyPrice,
      excelTotalValue: () => "-",
      pdfCell: (m) => formatMoney(m.buyPrice),
      pdfSummaryCell: () => ({
        content: "-",
        styles: { textColor: REPORT_RGB.muted, fontStyle: "normal" },
      }),
    },
    {
      key: "restockCost",
      excelHeader: "Est. Restock Cost (BDT)",
      pdfHeader: "Restock Cost",
      pdfStyle: {
        halign: "right",
        cellWidth: 28,
        fontStyle: "bold",
        textColor: REPORT_RGB.rose,
      },
      excelValue: (m) => m.restockCost,
      excelTotalValue: (t) => t.sumRestockCost,
      pdfCell: (m) => formatMoney(m.restockCost),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.sumRestockCost),
        styles: { textColor: REPORT_RGB.rose },
      }),
    },
    {
      key: "alertLevel",
      excelHeader: "Alert Level",
      pdfHeader: "Alert",
      pdfStyle: { halign: "center", cellWidth: 26 },
      excelValue: (m) =>
        m.stockState === "OUT" ? "Out of Stock" : "Low Stock",
      excelTotalValue: (t) => `${t.itemCount} Alerts`,
      pdfCell: (m) => ({
        content: m.stockState === "OUT" ? "OUT OF STOCK" : "LOW STOCK",
        styles: {
          textColor: getPdfStockColor(m.stockState),
          fontStyle: "bold",
        },
      }),
      pdfSummaryCell: (t) => ({
        content: `${t.itemCount} Items`,
        styles: { halign: "center", textColor: REPORT_RGB.amber },
      }),
    },
  ];
}

/**
 * Tab 3 Export: Low & Out of Stock Alert Excel Report
 */
export async function exportLowStockReportExcel(
  products: ProductItem[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<number> {
  if (!products || products.length === 0) {
    throw new Error("No low-stock product alerts available to export");
  }

  let sumCurrent = 0;
  let sumShortfall = 0;
  let sumRestockCost = 0;

  const metrics = products.map((p, idx) => {
    const m = extractInventoryProductMetrics(p, idx);
    sumCurrent += m.quantity;
    sumShortfall += m.shortfallQty;
    sumRestockCost += m.restockCost;
    return m;
  });

  const columns = buildLowStockColumns();
  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    metrics,
    columns,
    { sumCurrent, sumShortfall, sumRestockCost, itemCount: products.length },
    "TOTAL RESTOCK SUMMARY",
    visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    fileName: `Low_Stock_Alert_Report_${getExportFileDateSuffix(meta)}.xlsx`,
    sheetName: "Low Stock Alerts",
    reportTitle: "Low & Out of Stock Reorder Alert Report",
    businessName: meta.businessName,
    businessAddress: meta.businessAddress,
    businessLogoUrl: meta.businessLogoUrl,
    startDate: meta.startDate,
    endDate: meta.endDate,
    totalLabel: "Total Alerts",
    totalSummarySpan,
    includeSignatures: true,
  });

  return products.length;
}

/**
 * Tab 3 Export: Low & Out of Stock Alert Corporate PDF Report
 */
export async function downloadLowStockReportPdf(
  products: ProductItem[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<void> {
  if (!products || products.length === 0) {
    throw new Error("No low-stock product alerts available to download PDF");
  }

  let sumCurrent = 0;
  let sumShortfall = 0;
  let sumRestockCost = 0;

  const metrics = products.map((p, idx) => {
    const m = extractInventoryProductMetrics(p, idx);
    sumCurrent += m.quantity;
    sumShortfall += m.shortfallQty;
    sumRestockCost += m.restockCost;
    return m;
  });

  const columns = buildLowStockColumns();
  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    metrics,
    columns,
    { sumCurrent, sumShortfall, sumRestockCost, itemCount: products.length },
    "TOTAL RESTOCK ESTIMATE",
    {
      visibleColumns,
      preserveFixedWidthsFromCount: 8,
    }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `Low_Stock_Alert_Report_${getExportFileDateSuffix(meta)}.pdf`,
    reportTitle: "Low & Out of Stock Reorder Alert Report",
    metaRightLabel: `Total Alerts: ${products.length}`,
    headers,
    bodyRows,
    meta,
    columnStyles,
  });
}

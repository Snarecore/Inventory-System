import moment from "moment";
import type { RowInput } from "jspdf-autotable";
import type { ProductItem } from "@/types";
import { formatMoney } from "@/utils/formatters";
import {
  buildAndDownloadExcel,
  resolveThemeArgb,
  argbToRgbTuple,
} from "@/utils/excel-export";
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

/**
 * Tab 1 Export: Product Stock & Valuation Excel Report
 */
export async function exportInventoryStockExcel(
  products: ProductItem[],
  meta: ReportCompanyMeta
): Promise<number> {
  if (!products || products.length === 0) {
    throw new Error("No product records available to export");
  }

  let sumQty = 0;
  let sumCost = 0;
  let sumRetail = 0;
  let sumProfit = 0;

  const rows = products.map((p, idx) => {
    const m = extractInventoryProductMetrics(p, idx);
    sumQty += m.quantity;
    sumCost += m.costValue;
    sumRetail += m.retailValue;
    sumProfit += m.potentialProfit;

    return {
      SL: idx + 1,
      Code: m.code,
      "Product Name": m.name,
      Category: m.category,
      "Primary Unit": m.primaryUnit,
      "Secondary Unit": m.hasSecondaryUnit ? m.secondaryUnit : "-",
      Conversion: m.conversionDisplay || "-",
      Stock: m.quantity,
      "Buy Price (BDT)": m.buyPrice,
      "Sell Price (BDT)": m.sellPrice,
      "Margin (%)": `${m.marginPct.toFixed(1)}%`,
      "Cost Value (BDT)": m.costValue,
      "Retail Value (BDT)": m.retailValue,
      "Est. Profit (BDT)": m.potentialProfit,
      "Stock Status":
        m.stockState === "OUT"
          ? "Out of Stock"
          : m.stockState === "LOW"
          ? "Low Stock"
          : "In Stock",
      Status: m.isActive ? "Active" : "Inactive",
    };
  });

  const totalRow = {
    SL: "TOTAL INVENTORY VALUATION",
    Code: "",
    "Product Name": "",
    Category: "",
    "Primary Unit": "",
    "Secondary Unit": "",
    Conversion: "",
    Stock: sumQty,
    "Buy Price (BDT)": "-",
    "Sell Price (BDT)": "-",
    "Margin (%)":
      sumRetail > 0 ? `${((sumProfit / sumRetail) * 100).toFixed(1)}%` : "0.0%",
    "Cost Value (BDT)": sumCost,
    "Retail Value (BDT)": sumRetail,
    "Est. Profit (BDT)": sumProfit,
    "Stock Status": "-",
    Status: "-",
  };

  await buildAndDownloadExcel(rows, totalRow, {
    fileName: `Inventory_Stock_Report_${getExportFileDateSuffix(meta)}.xlsx`,
    sheetName: "Inventory Report",
    reportTitle: "Inventory Stock & Valuation Report",
    businessName: meta.businessName,
    businessAddress: meta.businessAddress,
    businessLogoUrl: meta.businessLogoUrl,
    startDate: meta.startDate,
    endDate: meta.endDate,
    metaRightLabel: `Total Items: ${products.length}`,
    totalSummarySpan: 7,
    includeSignatures: true,
  });

  return products.length;
}

/**
 * Tab 1 Export: Product Stock & Valuation Corporate PDF Report
 */
export async function downloadInventoryStockPdf(
  products: ProductItem[],
  meta: ReportCompanyMeta
): Promise<void> {
  if (!products || products.length === 0) {
    throw new Error("No product records available to download PDF");
  }

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  let sumQty = 0;
  let sumCost = 0;
  let sumRetail = 0;
  let sumProfit = 0;

  const bodyRows: RowInput[] = products.map((p, idx) => {
    const m = extractInventoryProductMetrics(p, idx);
    sumQty += m.quantity;
    sumCost += m.costValue;
    sumRetail += m.retailValue;
    sumProfit += m.potentialProfit;

    const stockLabel =
      m.stockState === "OUT"
        ? "OUT OF STOCK"
        : m.stockState === "LOW"
        ? "LOW STOCK"
        : "IN STOCK";

    return [
      idx + 1,
      m.code,
      m.name,
      m.category,
      m.primaryUnit,
      m.hasSecondaryUnit ? m.secondaryUnit : "-",
      m.conversionDisplay || "-",
      m.quantity.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
      formatMoney(m.buyPrice),
      formatMoney(m.sellPrice),
      formatMoney(m.costValue),
      formatMoney(m.retailValue),
      {
        content: stockLabel,
        styles: {
          textColor: getPdfStockColor(m.stockState),
          fontStyle: "bold",
        },
      },
      {
        content: m.isActive ? "ACTIVE" : "INACTIVE",
        styles: {
          textColor: m.isActive ? REPORT_RGB.emerald : REPORT_RGB.rose,
          fontStyle: "bold",
        },
      },
    ];
  });

  bodyRows.push([
    {
      content: "TOTAL INVENTORY VALUATION",
      colSpan: 7,
      styles: {
        halign: "center",
        fontStyle: "bold",
        fillColor: [241, 245, 249],
        textColor: REPORT_RGB.dark,
      },
    },
    {
      content: sumQty.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: [241, 245, 249],
        textColor: REPORT_RGB.dark,
      },
    },
    {
      content: "-",
      styles: {
        halign: "right",
        fillColor: [241, 245, 249],
        textColor: REPORT_RGB.muted,
      },
    },
    {
      content: "-",
      styles: {
        halign: "right",
        fillColor: [241, 245, 249],
        textColor: REPORT_RGB.muted,
      },
    },
    {
      content: formatMoney(sumCost),
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: [241, 245, 249],
        textColor: themeRgb,
      },
    },
    {
      content: formatMoney(sumRetail),
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: [241, 245, 249],
        textColor: REPORT_RGB.emerald,
      },
    },
    {
      content: `Profit: ${formatMoney(sumProfit)}`,
      colSpan: 2,
      styles: {
        halign: "center",
        fontStyle: "bold",
        fillColor: [241, 245, 249],
        textColor: sumProfit >= 0 ? REPORT_RGB.emerald : REPORT_RGB.rose,
      },
    },
  ]);

  await generateAndDownloadCorporatePdf({
    fileName: `Inventory_Stock_Report_${getExportFileDateSuffix(meta)}.pdf`,
    reportTitle: "Inventory Stock & Valuation Report",
    metaRightLabel: `Total Items: ${products.length}`,
    headers: [
      "SL",
      "Code",
      "Product Name",
      "Category",
      "Primary Unit",
      "Secondary Unit",
      "Conversion",
      "Stock",
      "Buy Price",
      "Sell Price",
      "Cost Value",
      "Retail Value",
      "Stock Alert",
      "Status",
    ],
    bodyRows,
    meta,
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      1: { halign: "left", cellWidth: 20 },
      2: { halign: "left", fontStyle: "bold" },
      3: { halign: "left", cellWidth: 20 },
      4: { halign: "center", cellWidth: 17 },
      5: { halign: "center", cellWidth: 17 },
      6: { halign: "center", cellWidth: 22 },
      7: { halign: "right", cellWidth: 15, fontStyle: "bold" },
      8: { halign: "right", cellWidth: 18 },
      9: { halign: "right", cellWidth: 18 },
      10: { halign: "right", cellWidth: 22, fontStyle: "bold" },
      11: {
        halign: "right",
        cellWidth: 22,
        fontStyle: "bold",
        textColor: REPORT_RGB.emerald,
      },
      12: { halign: "center", cellWidth: 20 },
      13: { halign: "center", cellWidth: 16 },
    },
  });
}

/**
 * Tab 2 Export: Category-Wise Inventory Excel Report
 */
export async function exportCategoryInventoryExcel(
  categories: CategoryInventorySummary[],
  meta: ReportCompanyMeta
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

  const grandTotalCost = categories.reduce((s, c) => s + c.totalCostValue, 0);

  const rows = categories.map((c, idx) => {
    sumProducts += c.productCount;
    sumActive += c.activeCount;
    sumLow += c.lowStockCount;
    sumUnits += c.totalUnits;
    sumCost += c.totalCostValue;
    sumRetail += c.totalRetailValue;
    sumProfit += c.estimatedProfit;

    return {
      SL: idx + 1,
      "Category Name": c.category,
      "Products Count": c.productCount,
      "Active Count": c.activeCount,
      "Low Stock Count": c.lowStockCount,
      "Stock Qty": c.totalUnits,
      "Cost Value (BDT)": c.totalCostValue,
      "Retail Value (BDT)": c.totalRetailValue,
      "Est. Profit (BDT)": c.estimatedProfit,
      "Value Share": `${calculateRevenueSharePct(c.totalCostValue, grandTotalCost)}%`,
    };
  });

  const totalRow = {
    SL: "TOTAL BY CATEGORY",
    "Category Name": "",
    "Products Count": sumProducts,
    "Active Count": sumActive,
    "Low Stock Count": sumLow,
    "Stock Qty": sumUnits,
    "Cost Value (BDT)": sumCost,
    "Retail Value (BDT)": sumRetail,
    "Est. Profit (BDT)": sumProfit,
    "Value Share": "100.0%",
  };

  await buildAndDownloadExcel(rows, totalRow, {
    fileName: `Category_Inventory_Report_${getExportFileDateSuffix(meta)}.xlsx`,
    sheetName: "Category Valuation",
    reportTitle: "Category-Wise Inventory Valuation Report",
    businessName: meta.businessName,
    businessAddress: meta.businessAddress,
    businessLogoUrl: meta.businessLogoUrl,
    startDate: meta.startDate,
    endDate: meta.endDate,
    metaRightLabel: `Total Categories: ${categories.length}`,
    totalSummarySpan: 2,
    includeSignatures: true,
  });

  return categories.length;
}

/**
 * Tab 2 Export: Category-Wise Inventory Corporate PDF Report
 */
export async function downloadCategoryInventoryPdf(
  categories: CategoryInventorySummary[],
  meta: ReportCompanyMeta
): Promise<void> {
  if (!categories || categories.length === 0) {
    throw new Error("No category inventory records available to download PDF");
  }

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const grandTotalCost = categories.reduce((s, c) => s + c.totalCostValue, 0);

  let sumProducts = 0;
  let sumActive = 0;
  let sumLow = 0;
  let sumUnits = 0;
  let sumCost = 0;
  let sumRetail = 0;
  let sumProfit = 0;

  const bodyRows: RowInput[] = categories.map((c, idx) => {
    sumProducts += c.productCount;
    sumActive += c.activeCount;
    sumLow += c.lowStockCount;
    sumUnits += c.totalUnits;
    sumCost += c.totalCostValue;
    sumRetail += c.totalRetailValue;
    sumProfit += c.estimatedProfit;

    return [
      idx + 1,
      c.category,
      c.productCount,
      c.activeCount,
      {
        content: c.lowStockCount,
        styles: {
          textColor: c.lowStockCount > 0 ? REPORT_RGB.amber : REPORT_RGB.muted,
          fontStyle: c.lowStockCount > 0 ? "bold" : "normal",
        },
      },
      c.totalUnits,
      formatMoney(c.totalCostValue),
      formatMoney(c.totalRetailValue),
      formatMoney(c.estimatedProfit),
      `${calculateRevenueSharePct(c.totalCostValue, grandTotalCost)}%`,
    ];
  });

  bodyRows.push([
    {
      content: "TOTAL",
      colSpan: 2,
      styles: {
        halign: "center",
        fontStyle: "bold",
        fillColor: [241, 245, 249],
        textColor: REPORT_RGB.dark,
      },
    },
    {
      content: sumProducts,
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: [241, 245, 249],
        textColor: REPORT_RGB.dark,
      },
    },
    {
      content: sumActive,
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: [241, 245, 249],
        textColor: REPORT_RGB.emerald,
      },
    },
    {
      content: sumLow,
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: [241, 245, 249],
        textColor: REPORT_RGB.amber,
      },
    },
    {
      content: sumUnits,
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: [241, 245, 249],
        textColor: REPORT_RGB.dark,
      },
    },
    {
      content: formatMoney(sumCost),
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: [241, 245, 249],
        textColor: themeRgb,
      },
    },
    {
      content: formatMoney(sumRetail),
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: [241, 245, 249],
        textColor: REPORT_RGB.emerald,
      },
    },
    {
      content: formatMoney(sumProfit),
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: [241, 245, 249],
        textColor: REPORT_RGB.emerald,
      },
    },
    {
      content: "100.0%",
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: [241, 245, 249],
        textColor: REPORT_RGB.dark,
      },
    },
  ]);

  await generateAndDownloadCorporatePdf({
    fileName: `Category_Inventory_Report_${getExportFileDateSuffix(meta)}.pdf`,
    reportTitle: "Category-Wise Inventory Valuation Report",
    metaRightLabel: `Total Categories: ${categories.length}`,
    headers: [
      "SL",
      "Category Name",
      "Products",
      "Active",
      "Low Stock",
      "Stock Qty",
      "Cost Value",
      "Retail Value",
      "Est. Profit",
      "Share %",
    ],
    bodyRows,
    meta,
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      1: { halign: "left", fontStyle: "bold" },
      2: { halign: "right", cellWidth: 22 },
      3: { halign: "right", cellWidth: 20, textColor: REPORT_RGB.emerald },
      4: { halign: "right", cellWidth: 22 },
      5: { halign: "right", cellWidth: 26 },
      6: { halign: "right", cellWidth: 30, fontStyle: "bold" },
      7: {
        halign: "right",
        cellWidth: 30,
        fontStyle: "bold",
        textColor: REPORT_RGB.emerald,
      },
      8: {
        halign: "right",
        cellWidth: 28,
        fontStyle: "bold",
        textColor: REPORT_RGB.emerald,
      },
      9: { halign: "right", cellWidth: 20 },
    },
  });
}

/**
 * Tab 3 Export: Low & Out of Stock Alert Excel Report
 */
export async function exportLowStockReportExcel(
  products: ProductItem[],
  meta: ReportCompanyMeta
): Promise<number> {
  if (!products || products.length === 0) {
    throw new Error("No low-stock product alerts available to export");
  }

  let sumCurrent = 0;
  let sumShortfall = 0;
  let sumRestockCost = 0;

  const rows = products.map((p, idx) => {
    const m = extractInventoryProductMetrics(p, idx);
    sumCurrent += m.quantity;
    sumShortfall += m.shortfallQty;
    sumRestockCost += m.restockCost;

    return {
      SL: idx + 1,
      Code: m.code,
      "Product Name": m.name,
      Category: m.category,
      "Current Qty": m.quantity,
      "Min Threshold": m.lowThreshold,
      "Shortfall Qty": m.shortfallQty,
      Unit: m.unit,
      "Buy Price (BDT)": m.buyPrice,
      "Est. Restock Cost (BDT)": m.restockCost,
      "Alert Level": m.stockState === "OUT" ? "Out of Stock" : "Low Stock",
    };
  });

  const totalRow = {
    SL: "TOTAL RESTOCK SUMMARY",
    Code: "",
    "Product Name": "",
    Category: "",
    "Current Qty": sumCurrent,
    "Min Threshold": "-",
    "Shortfall Qty": sumShortfall,
    Unit: "",
    "Buy Price (BDT)": "-",
    "Est. Restock Cost (BDT)": sumRestockCost,
    "Alert Level": `${products.length} Alerts`,
  };

  await buildAndDownloadExcel(rows, totalRow, {
    fileName: `Low_Stock_Alert_Report_${getExportFileDateSuffix(meta)}.xlsx`,
    sheetName: "Low Stock Alerts",
    reportTitle: "Low & Out of Stock Reorder Alert Report",
    businessName: meta.businessName,
    businessAddress: meta.businessAddress,
    businessLogoUrl: meta.businessLogoUrl,
    startDate: meta.startDate,
    endDate: meta.endDate,
    metaRightLabel: `Total Alerts: ${products.length}`,
    totalSummarySpan: 4,
    includeSignatures: true,
  });

  return products.length;
}

/**
 * Tab 3 Export: Low & Out of Stock Alert Corporate PDF Report
 */
export async function downloadLowStockReportPdf(
  products: ProductItem[],
  meta: ReportCompanyMeta
): Promise<void> {
  if (!products || products.length === 0) {
    throw new Error("No low-stock product alerts available to download PDF");
  }

  let sumCurrent = 0;
  let sumShortfall = 0;
  let sumRestockCost = 0;

  const bodyRows: RowInput[] = products.map((p, idx) => {
    const m = extractInventoryProductMetrics(p, idx);
    sumCurrent += m.quantity;
    sumShortfall += m.shortfallQty;
    sumRestockCost += m.restockCost;

    return [
      idx + 1,
      m.code,
      m.name,
      m.category,
      m.displayStock,
      m.lowThreshold,
      m.shortfallQty,
      formatMoney(m.buyPrice),
      formatMoney(m.restockCost),
      {
        content: m.stockState === "OUT" ? "OUT OF STOCK" : "LOW STOCK",
        styles: {
          textColor: getPdfStockColor(m.stockState),
          fontStyle: "bold",
        },
      },
    ];
  });

  bodyRows.push([
    {
      content: "TOTAL RESTOCK ESTIMATE",
      colSpan: 4,
      styles: {
        halign: "center",
        fontStyle: "bold",
        fillColor: [241, 245, 249],
        textColor: REPORT_RGB.dark,
      },
    },
    {
      content: sumCurrent,
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: [241, 245, 249],
        textColor: REPORT_RGB.dark,
      },
    },
    {
      content: "-",
      styles: {
        halign: "right",
        fillColor: [241, 245, 249],
        textColor: REPORT_RGB.muted,
      },
    },
    {
      content: sumShortfall,
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: [241, 245, 249],
        textColor: REPORT_RGB.rose,
      },
    },
    {
      content: "-",
      styles: {
        halign: "right",
        fillColor: [241, 245, 249],
        textColor: REPORT_RGB.muted,
      },
    },
    {
      content: formatMoney(sumRestockCost),
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: [241, 245, 249],
        textColor: REPORT_RGB.rose,
      },
    },
    {
      content: `${products.length} Items`,
      styles: {
        halign: "center",
        fontStyle: "bold",
        fillColor: [241, 245, 249],
        textColor: REPORT_RGB.amber,
      },
    },
  ]);

  await generateAndDownloadCorporatePdf({
    fileName: `Low_Stock_Alert_Report_${getExportFileDateSuffix(meta)}.pdf`,
    reportTitle: "Low & Out of Stock Reorder Alert Report",
    metaRightLabel: `Total Alerts: ${products.length}`,
    headers: [
      "SL",
      "Code",
      "Product Name",
      "Category",
      "Current Stock",
      "Threshold",
      "Shortfall",
      "Buy Price",
      "Restock Cost",
      "Alert",
    ],
    bodyRows,
    meta,
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "left", cellWidth: 26 },
      2: { halign: "left", fontStyle: "bold" },
      3: { halign: "left", cellWidth: 28 },
      4: { halign: "right", cellWidth: 28 },
      5: { halign: "right", cellWidth: 22 },
      6: {
        halign: "right",
        cellWidth: 22,
        fontStyle: "bold",
        textColor: REPORT_RGB.rose,
      },
      7: { halign: "right", cellWidth: 24 },
      8: {
        halign: "right",
        cellWidth: 28,
        fontStyle: "bold",
        textColor: REPORT_RGB.rose,
      },
      9: { halign: "center", cellWidth: 26 },
    },
  });
}

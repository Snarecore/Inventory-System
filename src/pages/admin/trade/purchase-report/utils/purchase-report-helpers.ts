import moment from "moment";
import { buildAndDownloadExcel, formatReportDate } from "@/utils/excel-export";
import type { PurchaseItem } from "@/types";
import {
  buildDynamicExcelPayload,
  type ExportColumnDef,
} from "@/utils/report-export-columns";
import {
  type ReportCompanyMeta,
  type ProductTradeSummary,
  type PartyTradeSummary,
  type ProductExportLabels,
  type PartyExportLabels,
  extractTradeRecordMetrics,
  aggregateTradeProducts,
  aggregateTradeParties,
  downloadTradeInvoicesPdf,
  exportProductTradeExcel,
  downloadProductTradePdf,
  exportPartyTradeExcel,
  downloadPartyTradePdf,
} from "@/utils/trade-report-helpers";

export type PurchaseReportTab = "invoices" | "products" | "suppliers";

export const extractPurchaseReportMetrics = (
  item: any,
  fallbackIndex = 0
) => extractTradeRecordMetrics(item, "purchase", fallbackIndex);

export const aggregateProductPurchases = (
  transactions: PurchaseItem[]
): ProductTradeSummary[] => aggregateTradeProducts(transactions, "purchase");

export const aggregateSupplierPurchases = (
  transactions: PurchaseItem[]
): PartyTradeSummary[] => aggregateTradeParties(transactions, "purchase");

const PRODUCT_PURCHASE_EXPORT_LABELS: ProductExportLabels = {
  filePrefix: "Product_Purchase_Report",
  sheetName: "Product Purchases",
  reportTitle: "Product-Wise Purchase Register",
  excelQtyHeader: "Quantity Purchased",
  excelInvoicesHeader: "Invoices Count",
  excelAmountHeader: "Total Cost (BDT)",
  excelShareHeader: "Share of Purchases",
  pdfQtyHeader: "Qty Purchased",
  pdfAmountHeader: "Total Cost (BDT)",
  emptyExcelError: "No product purchase records available to export",
  emptyPdfError: "No product purchase records available to download PDF",
};

const SUPPLIER_EXPORT_LABELS: PartyExportLabels = {
  filePrefix: "Supplier_Purchase_Report",
  sheetName: "Supplier Purchases",
  reportTitle: "Supplier-Wise Purchase Register",
  partyColumnHeader: "Supplier Name",
  totalLabel: "Total Suppliers",
  summaryEntityPlural: "Suppliers",
  emptyExcelError: "No supplier purchase records available to export",
  emptyPdfError: "No supplier purchase records available to download PDF",
};

/**
 * Corporate Excel export for filtered Purchase Invoices matching PDF & Sales Report Excel standards
 */
export async function exportFilteredPurchasesExcel(
  purchases: PurchaseItem[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<number> {
  if (!purchases || purchases.length === 0) {
    throw new Error("No purchase records available to export");
  }

  let sumSubtotal = 0;
  let sumDiscount = 0;
  let sumVat = 0;
  let sumTransport = 0;
  let sumGrandTotal = 0;
  let sumPaid = 0;
  let sumDue = 0;
  let sumItems = 0;

  const normalizedRows = purchases.map((item: any, idx: number) => {
    const m = extractPurchaseReportMetrics(item, idx);
    sumSubtotal += m.subtotal;
    sumDiscount += m.discount;
    sumVat += m.vat;
    sumTransport += m.transportCost;
    sumGrandTotal += m.grandTotal;
    sumPaid += m.paid;
    sumDue += m.due;
    sumItems += m.itemsCount;
    return m;
  });

  const totals = {
    sumItems,
    sumSubtotal: Number(sumSubtotal.toFixed(2)),
    sumDiscount: Number(sumDiscount.toFixed(2)),
    sumVat: Number(sumVat.toFixed(2)),
    sumTransport: Number(sumTransport.toFixed(2)),
    sumGrandTotal: Number(sumGrandTotal.toFixed(2)),
    sumPaid: Number(sumPaid.toFixed(2)),
    sumDue: Number(sumDue.toFixed(2)),
  };

  type PurchaseRow = (typeof normalizedRows)[number];
  const columns: ExportColumnDef<PurchaseRow, typeof totals>[] = [
    { key: "sl", excelHeader: "SL", isLeadingLabel: true, excelValue: (_, idx) => idx + 1 },
    { key: "orderId", excelHeader: "Order ID", isLeadingLabel: true, excelValue: (m) => m.orderNo },
    { key: "date", excelHeader: "Date", isLeadingLabel: true, excelValue: (m) => (m.tradeDate ? formatReportDate(m.tradeDate) : "-") },
    { key: "supplier", excelHeader: "Supplier Name", isLeadingLabel: true, excelValue: (m) => m.partyName },
    { key: "phone", excelHeader: "Phone", isLeadingLabel: true, excelValue: (m) => m.partyPhone || "-" },
    { key: "items", excelHeader: "Items", excelValue: (m) => m.itemsCount, excelTotalValue: (t) => t.sumItems },
    { key: "subtotal", excelHeader: "Subtotal (৳)", excelValue: (m) => m.subtotal, excelTotalValue: (t) => t.sumSubtotal },
    { key: "discount", excelHeader: "Discount (৳)", excelValue: (m) => m.discount, excelTotalValue: (t) => t.sumDiscount },
    { key: "vat", excelHeader: "VAT (৳)", excelValue: (m) => m.vat, excelTotalValue: (t) => t.sumVat },
    { key: "transport", excelHeader: "Transport (৳)", excelValue: (m) => m.transportCost, excelTotalValue: (t) => t.sumTransport },
    { key: "total", excelHeader: "Grand Total (৳)", excelValue: (m) => m.grandTotal, excelTotalValue: (t) => t.sumGrandTotal },
    { key: "paid", excelHeader: "Paid (৳)", excelValue: (m) => m.paid, excelTotalValue: (t) => t.sumPaid },
    { key: "due", excelHeader: "Due (৳)", excelValue: (m) => m.due, excelTotalValue: (t) => t.sumDue },
    { key: "method", excelHeader: "Method", excelValue: (m) => m.paymentType },
    { key: "status", excelHeader: "Status", excelValue: (m) => m.status },
  ];

  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    normalizedRows,
    columns,
    totals,
    `TOTAL SUMMARY (${purchases.length} Invoices)`,
    visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Purchase_Report_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Purchase Register",
    reportTitle: "Purchase Register",
    totalLabel: "Total Invoices",
    totalSummarySpan,
    includeSignatures: true,
  });

  return rows.length;
}

export async function downloadFilteredPurchasesPdf(
  purchases: PurchaseItem[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<void> {
  await downloadTradeInvoicesPdf(purchases, meta, {
    domain: "purchase",
    filePrefix: "Purchase_Register",
    reportTitle: "Purchase Register",
    partyColumnHeader: "Supplier Name",
    includeTransport: true,
    emptyErrorMessage: "No purchase records available to download PDF",
    visibleColumns,
  });
}

export const exportFilteredPurchaseProductsExcel = (
  products: ProductTradeSummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
) =>
  exportProductTradeExcel(
    products,
    meta,
    PRODUCT_PURCHASE_EXPORT_LABELS,
    visibleColumns
  );

export const downloadFilteredPurchaseProductsPdf = (
  products: ProductTradeSummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
) =>
  downloadProductTradePdf(
    products,
    meta,
    PRODUCT_PURCHASE_EXPORT_LABELS,
    visibleColumns
  );

export const exportFilteredSuppliersExcel = (
  suppliers: PartyTradeSummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
) =>
  exportPartyTradeExcel(
    suppliers,
    meta,
    SUPPLIER_EXPORT_LABELS,
    visibleColumns
  );

export const downloadFilteredSuppliersPdf = (
  suppliers: PartyTradeSummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
) =>
  downloadPartyTradePdf(
    suppliers,
    meta,
    SUPPLIER_EXPORT_LABELS,
    visibleColumns
  );

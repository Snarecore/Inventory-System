import moment from "moment";
import { buildAndDownloadExcel, formatReportDate } from "@/utils/excel-export";
import type { PurchaseItem } from "@/types";
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
  reportTitle: "Product-Wise Purchase Report",
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
  reportTitle: "Supplier-Wise Purchase Report",
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
  meta: ReportCompanyMeta
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

  const rows = purchases.map((item: any, idx: number) => {
    const m = extractPurchaseReportMetrics(item, idx);
    sumSubtotal += m.subtotal;
    sumDiscount += m.discount;
    sumVat += m.vat;
    sumTransport += m.transportCost;
    sumGrandTotal += m.grandTotal;
    sumPaid += m.paid;
    sumDue += m.due;
    sumItems += m.itemsCount;

    return {
      SL: idx + 1,
      "Order ID": m.orderNo,
      Date: m.tradeDate ? formatReportDate(m.tradeDate) : "-",
      "Supplier Name": m.partyName,
      Phone: m.partyPhone || "-",
      Items: m.itemsCount,
      "Subtotal (৳)": m.subtotal,
      "Discount (৳)": m.discount,
      "VAT (৳)": m.vat,
      "Transport (৳)": m.transportCost,
      "Grand Total (৳)": m.grandTotal,
      "Paid (৳)": m.paid,
      "Due (৳)": m.due,
      Method: m.paymentType,
      Status: m.status,
    };
  });

  const totalRow = {
    SL: `TOTAL SUMMARY (${purchases.length} Invoices)`,
    "Order ID": "",
    Date: "",
    "Supplier Name": "",
    Phone: "",
    Items: sumItems,
    "Subtotal (৳)": Number(sumSubtotal.toFixed(2)),
    "Discount (৳)": Number(sumDiscount.toFixed(2)),
    "VAT (৳)": Number(sumVat.toFixed(2)),
    "Transport (৳)": Number(sumTransport.toFixed(2)),
    "Grand Total (৳)": Number(sumGrandTotal.toFixed(2)),
    "Paid (৳)": Number(sumPaid.toFixed(2)),
    "Due (৳)": Number(sumDue.toFixed(2)),
    Method: "",
    Status: "",
  };

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Purchase_Report_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Purchase Report",
    reportTitle: "Purchase Report",
    totalLabel: "Total Invoices",
    totalSummarySpan: 5,
    includeSignatures: true,
  });

  return rows.length;
}

export async function downloadFilteredPurchasesPdf(
  purchases: PurchaseItem[],
  meta: ReportCompanyMeta
): Promise<void> {
  await downloadTradeInvoicesPdf(purchases, meta, {
    domain: "purchase",
    filePrefix: "Purchase_Report",
    reportTitle: "Purchase Report",
    partyColumnHeader: "Supplier Name",
    includeTransport: true,
    emptyErrorMessage: "No purchase records available to download PDF",
  });
}

export const exportFilteredPurchaseProductsExcel = (
  products: ProductTradeSummary[],
  meta: ReportCompanyMeta
) => exportProductTradeExcel(products, meta, PRODUCT_PURCHASE_EXPORT_LABELS);

export const downloadFilteredPurchaseProductsPdf = (
  products: ProductTradeSummary[],
  meta: ReportCompanyMeta
) => downloadProductTradePdf(products, meta, PRODUCT_PURCHASE_EXPORT_LABELS);

export const exportFilteredSuppliersExcel = (
  suppliers: PartyTradeSummary[],
  meta: ReportCompanyMeta
) => exportPartyTradeExcel(suppliers, meta, SUPPLIER_EXPORT_LABELS);

export const downloadFilteredSuppliersPdf = (
  suppliers: PartyTradeSummary[],
  meta: ReportCompanyMeta
) => downloadPartyTradePdf(suppliers, meta, SUPPLIER_EXPORT_LABELS);

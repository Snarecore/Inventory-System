import moment from "moment";
import { exportSalesToExcel } from "@/utils/excel-export";
import type { SaleItem } from "@/types";
import {
  type ReportCompanyMeta,
  type ProductTradeSummary,
  type PartyTradeSummary,
  type ProductExportLabels,
  type PartyExportLabels,
  extractTradeRecordMetrics,
  downloadTradeInvoicesPdf,
  exportProductTradeExcel,
  downloadProductTradePdf,
  exportPartyTradeExcel,
  downloadPartyTradePdf,
} from "@/utils/trade-report-helpers";

export type ReportTab = "invoices" | "products" | "customers";

export type ProductSummary = ProductTradeSummary;
export type CustomerSummary = PartyTradeSummary;
export type { ReportCompanyMeta };

export const extractSaleReportMetrics = (item: any, fallbackIndex = 0) =>
  extractTradeRecordMetrics(item, "sale", fallbackIndex);

const PRODUCT_SALES_EXPORT_LABELS: ProductExportLabels = {
  filePrefix: "Product_Sales_Report",
  sheetName: "Product Sales",
  reportTitle: "Product-Wise Sales Report",
  excelQtyHeader: "Quantity Sold",
  excelInvoicesHeader: "Invoices Sold",
  excelAmountHeader: "Total Revenue (BDT)",
  excelShareHeader: "Share of Sales",
  pdfQtyHeader: "Qty Sold",
  pdfAmountHeader: "Net Revenue (BDT)",
  emptyExcelError: "No product sales records available to export",
  emptyPdfError: "No product sales records available to download PDF",
};

const CUSTOMER_EXPORT_LABELS: PartyExportLabels = {
  filePrefix: "Customer_Sales_Report",
  sheetName: "Customer Sales",
  reportTitle: "Customer-Wise Sales Report",
  partyColumnHeader: "Customer Name",
  totalLabel: "Total Customers",
  summaryEntityPlural: "Customers",
  emptyExcelError: "No customer sales records available to export",
  emptyPdfError: "No customer sales records available to download PDF",
};

export async function exportFilteredInvoicesExcel(
  invoices: SaleItem[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>,
  customTitle?: string,
  customFileName?: string
): Promise<number> {
  if (!invoices || invoices.length === 0) {
    throw new Error("No sales records available to export");
  }
  await exportSalesToExcel(invoices, {
    ...meta,
    fileName:
      customFileName || `Sales_Report_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Sales Report",
    reportTitle: customTitle || "Sales Report",
    visibleColumns,
  });
  return invoices.length;
}

export async function downloadFilteredInvoicesPdf(
  invoices: SaleItem[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>,
  customTitle?: string,
  customFilePrefix?: string
): Promise<void> {
  await downloadTradeInvoicesPdf(invoices, meta, {
    domain: "sale",
    filePrefix: customFilePrefix || "Sales_Report",
    reportTitle: customTitle || "Sales Report",
    partyColumnHeader: "Customer Name",
    includeTransport: false,
    emptyErrorMessage: "No sales records available to download PDF",
    visibleColumns,
  });
}

export async function exportCustomerSalesInvoicesExcel(
  invoices: SaleItem[],
  customerName: string,
  meta: ReportCompanyMeta
): Promise<number> {
  const safeName = customerName.replace(/[^a-zA-Z0-9_\-]/g, "_");
  return exportFilteredInvoicesExcel(
    invoices,
    meta,
    undefined,
    `Sales Report - ${customerName}`,
    `Sales_Report_${safeName}_${moment().format("YYYY-MM-DD")}.xlsx`
  );
}

export async function downloadCustomerSalesInvoicesPdf(
  invoices: SaleItem[],
  customerName: string,
  meta: ReportCompanyMeta
): Promise<void> {
  const safeName = customerName.replace(/[^a-zA-Z0-9_\-]/g, "_");
  return downloadFilteredInvoicesPdf(
    invoices,
    meta,
    undefined,
    `Sales Report - ${customerName}`,
    `Sales_Report_${safeName}`
  );
}

export const exportFilteredProductsExcel = (
  products: ProductTradeSummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
) =>
  exportProductTradeExcel(
    products,
    meta,
    PRODUCT_SALES_EXPORT_LABELS,
    visibleColumns
  );

export const downloadFilteredProductsPdf = (
  products: ProductTradeSummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
) =>
  downloadProductTradePdf(
    products,
    meta,
    PRODUCT_SALES_EXPORT_LABELS,
    visibleColumns
  );

export const exportFilteredCustomersExcel = (
  customers: PartyTradeSummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
) =>
  exportPartyTradeExcel(
    customers,
    meta,
    CUSTOMER_EXPORT_LABELS,
    visibleColumns
  );

export const downloadFilteredCustomersPdf = (
  customers: PartyTradeSummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
) =>
  downloadPartyTradePdf(
    customers,
    meta,
    CUSTOMER_EXPORT_LABELS,
    visibleColumns
  );

import moment from "moment";
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
import {
  type ReportCompanyMeta,
  REPORT_RGB,
  calculateRevenueSharePct,
  formatShortReportDate,
  generateAndDownloadCorporatePdf,
  isDateInReportRange,
  parseFlexibleReportDate,
} from "@/utils/trade-report-helpers";
import {
  SALES_RETURN_REASONS,
  extractReturnRemarks,
  getReturnReasonLabel,
} from "@/pages/admin/trade/constants/returnReasons";
import {
  isReturnRecord,
  type UnifiedTradeRecord,
} from "@/pages/admin/trade/sales/hooks/useSalesQueries";
import type { SalesReturnItem } from "@/types";

export type SalesReturnReportTab = "returns" | "products" | "customers";

export interface NormalizedSalesReturnLine {
  productId: string;
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  reason: string;
}

export interface NormalizedSalesReturnRecord {
  id: string | number;
  returnNo: string;
  orderNo: string;
  salesInvoiceNo: string;
  returnDate: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  itemsCount: number;
  details: NormalizedSalesReturnLine[];
  reasonSummary: string;
  paymentType: string;
  isCreditAdjust: boolean;
  refundAmount: number;
  grandTotal: number;
  status: string;
  raw: SalesReturnItem;
}

export interface ProductReturnSummary {
  productKey: string;
  productCode: string;
  productName: string;
  unit: string;
  topReason: string;
  returnCount: number;
  totalQuantity: number;
  totalAmount: number;
}

export interface CustomerReturnSummary {
  customerKey: string;
  customerName: string;
  customerPhone: string;
  returnCount: number;
  itemsCount: number;
  cashRefund: number;
  creditAdjust: number;
  totalRefund: number;
  lastReturnDate: string;
}

function extractRawReturnLines(item: any): any[] {
  const candidates = [
    item?.returnDetails,
    item?.salesReturnDetails,
    item?.details,
    item?.items,
    item?.products,
    item?.saleDetails,
    item?.salesDetails,
  ];
  for (const list of candidates) {
    if (Array.isArray(list) && list.length > 0) return list;
  }
  return [];
}

/**
 * Extracts and normalizes return records from `get-sales-and-return` unified API output.
 */
export function extractNormalizedSalesReturns(
  records: UnifiedTradeRecord[],
  startDate?: string,
  endDate?: string
): NormalizedSalesReturnRecord[] {
  if (!Array.isArray(records)) return [];

  const saleOrderByRef = new Map<string, string>();
  records.forEach((rec: any) => {
    if (!rec || Boolean(rec?.isReturnRecord) || isReturnRecord(rec)) return;
    const recOrderNo = String(rec.orderNo || rec.order_no || "").trim();
    if (!recOrderNo) return;
    [rec.salesInvoiceNo, rec.invoiceNo, rec.id, rec.saleId].forEach((ref) => {
      const cleanRef = String(ref ?? "").trim().toLowerCase();
      if (cleanRef && !saleOrderByRef.has(cleanRef)) {
        saleOrderByRef.set(cleanRef, recOrderNo);
      }
    });
  });

  const result: NormalizedSalesReturnRecord[] = [];

  records.forEach((item: any, idx: number) => {
    if (!(Boolean(item?.isReturnRecord) || isReturnRecord(item))) return;

    const rawDate =
      item.returnDate ||
      item.return_date ||
      item.salesDate ||
      item.date ||
      item.createdAt ||
      item.created_at ||
      "";
    if (!isDateInReportRange(rawDate, startDate, endDate)) return;

    const refundAmount = Number(
      item.refundAmount ??
        item.refund_amount ??
        item.returnRefundAmount ??
        item.returnGrandTotal ??
        item.return_grand_total ??
        item.grandTotal ??
        item.totalAmount ??
        0
    );
    const grandTotal = Number(
      item.returnGrandTotal ??
        item.return_grand_total ??
        item.grandTotal ??
        item.totalAmount ??
        refundAmount
    );
    const returnNo = String(
      item.returnNo || item.return_no || item.orderNo || `SR-${item.id || idx + 1}`
    );
    const salesInvoiceNo = String(
      item.salesInvoiceNo || item.invoiceNo || "-"
    );
    const matchedOrderNo =
      saleOrderByRef.get(salesInvoiceNo.trim().toLowerCase()) ||
      saleOrderByRef.get(String(item.saleId ?? item.sale_id ?? "").trim().toLowerCase()) ||
      "";
    const directOrderNo = String(item.orderNo || item.order_no || "").trim();
    const orderNo =
      (directOrderNo && directOrderNo !== returnNo ? directOrderNo : "") ||
      matchedOrderNo ||
      directOrderNo ||
      (salesInvoiceNo !== "-" ? salesInvoiceNo : "-");
    const rawReasonText = extractReturnRemarks(item);
    const matchedReason = rawReasonText
      ? SALES_RETURN_REASONS.find(
          (opt) =>
            opt.value.toLowerCase() ===
            rawReasonText.split(" || ")[0].trim().toLowerCase()
        )?.label
      : undefined;
    const reasonSummary = matchedReason || rawReasonText || "N/A";
    const paymentType = String(item.paymentType || "CASH").toUpperCase();
    const isCreditAdjust =
      paymentType.includes("CREDIT") ||
      paymentType.includes("DUE") ||
      paymentType.includes("ADJUST");

    const rawLines = extractRawReturnLines(item);
    const details: NormalizedSalesReturnLine[] =
      rawLines.length > 0
        ? rawLines.map((line: any, lineIdx: number) => {
            const qty = Number(
              line.returnQuantity ?? line.quantity ?? line.qty ?? 1
            );
            const price = Number(
              line.unitPrice ?? line.price ?? line.sellPrice ?? 0
            );
            const lineTotal = Number(
              line.total ?? line.totalAmount ?? qty * price
            );
            const lineReason =
              getReturnReasonLabel(
                line.returnReason || line.return_reason || line.reason || line.note
              ) || reasonSummary;

            return {
              productId: String(
                line.productId ||
                  line.product_id ||
                  line.id ||
                  line.pcode ||
                  `line-${lineIdx}`
              ),
              productCode: String(
                line.productCode ||
                  line.product_code ||
                  line.pcode ||
                  line.sku ||
                  "-"
              ),
              productName: String(
                line.productName || line.product_name || line.name || "Returned Item"
              ),
              unit: String(line.unit || line.unitName || "pcs"),
              quantity: qty,
              unitPrice: price,
              total: lineTotal,
              reason: lineReason,
            };
          })
        : [
            {
              productId: String(item.id || returnNo),
              productCode: returnNo,
              productName: `Return #${returnNo}`,
              unit: "pcs",
              quantity: Number(item.itemsCount || 1),
              unitPrice: refundAmount,
              total: refundAmount,
              reason: reasonSummary,
            },
          ];

    const rawItem: SalesReturnItem = {
      id:
        item.id ||
        item.returnId ||
        item.salesReturnId ||
        returnNo ||
        `ret_${idx}`,
      returnNo,
      orderNo,
      salesInvoiceNo,
      invoiceNo: item.invoiceNo || salesInvoiceNo,
      returnDate: rawDate || moment().format("YYYY-MM-DD"),
      createdAt: item.createdAt || rawDate,
      customerId: item.customerId ?? "",
      customerName: item.customerName || "Walk-in Customer",
      customerPhone: item.customerPhone || "",
      customerAddress: item.customerAddress || "",
      totalAmount: Number(item.totalAmount ?? grandTotal),
      discount: Number(item.discount ?? 0),
      vat: Number(item.vat ?? 0),
      deliveryCharge: Number(item.deliveryCharge ?? 0),
      grandTotal,
      refundAmount,
      paymentType,
      status: String(item.status || "Completed").trim(),
      note: reasonSummary === "N/A" ? "" : reasonSummary,
      remarks: reasonSummary === "N/A" ? "" : reasonSummary,
      returnDetails: rawLines.length > 0 ? rawLines : details,
      itemsCount: details.length,
    };

    result.push({
      id: rawItem.id!,
      returnNo,
      orderNo,
      salesInvoiceNo,
      returnDate: rawDate,
      customerId: String(item.customerId ?? "walkin"),
      customerName: rawItem.customerName,
      customerPhone: rawItem.customerPhone || "",
      customerAddress: rawItem.customerAddress || "",
      itemsCount: details.length,
      details,
      reasonSummary,
      paymentType,
      isCreditAdjust,
      refundAmount,
      grandTotal,
      status: rawItem.status,
      raw: rawItem,
    });
  });

  return result.sort((a, b) => {
    const mA = parseFlexibleReportDate(a.returnDate);
    const mB = parseFlexibleReportDate(b.returnDate);
    return (mB ? mB.valueOf() : 0) - (mA ? mA.valueOf() : 0);
  });
}

export function computeSalesReturnKpis(
  records: NormalizedSalesReturnRecord[]
): {
  totalCount: number;
  totalRefundAmount: number;
  totalCashRefund: number;
  totalCreditAdjust: number;
} {
  let totalRefundAmount = 0;
  let totalCashRefund = 0;
  let totalCreditAdjust = 0;

  records.forEach((r) => {
    totalRefundAmount += r.refundAmount;
    if (r.isCreditAdjust) {
      totalCreditAdjust += r.refundAmount;
    } else {
      totalCashRefund += r.refundAmount;
    }
  });

  return {
    totalCount: records.length,
    totalRefundAmount,
    totalCashRefund,
    totalCreditAdjust,
  };
}

export function aggregateSalesReturnProducts(
  records: NormalizedSalesReturnRecord[]
): ProductReturnSummary[] {
  const map: Record<
    string,
    ProductReturnSummary & { reasonCounts: Record<string, number> }
  > = {};

  records.forEach((r) => {
    const seenProductsInVoucher = new Set<string>();
    r.details.forEach((line) => {
      const key =
        line.productId !== "unknown"
          ? `${line.productId}_${line.productName}`
          : line.productName;

      if (!map[key]) {
        map[key] = {
          productKey: key,
          productCode: line.productCode,
          productName: line.productName,
          unit: line.unit,
          topReason: line.reason || "N/A",
          returnCount: 0,
          totalQuantity: 0,
          totalAmount: 0,
          reasonCounts: {},
        };
      }

      if (!seenProductsInVoucher.has(key)) {
        map[key].returnCount += 1;
        seenProductsInVoucher.add(key);
      }
      map[key].totalQuantity += line.quantity;
      map[key].totalAmount += line.total;

      const reason = line.reason && line.reason !== "N/A" ? line.reason : "";
      if (reason) {
        map[key].reasonCounts[reason] =
          (map[key].reasonCounts[reason] || 0) + 1;
      }
    });
  });

  return Object.values(map).map(({ reasonCounts, ...summary }) => {
    const entries = Object.entries(reasonCounts);
    if (entries.length > 0) {
      entries.sort((a, b) => b[1] - a[1]);
      summary.topReason = entries[0][0];
    }
    return summary;
  });
}

export function aggregateSalesReturnCustomers(
  records: NormalizedSalesReturnRecord[]
): CustomerReturnSummary[] {
  const map: Record<string, CustomerReturnSummary> = {};

  records.forEach((r) => {
    const key =
      r.customerId && r.customerId !== "walkin"
        ? `id_${r.customerId}`
        : r.customerPhone
        ? `ph_${r.customerPhone}`
        : `name_${r.customerName.toLowerCase()}`;

    if (!map[key]) {
      map[key] = {
        customerKey: key,
        customerName: r.customerName,
        customerPhone: r.customerPhone || "-",
        returnCount: 0,
        itemsCount: 0,
        cashRefund: 0,
        creditAdjust: 0,
        totalRefund: 0,
        lastReturnDate: r.returnDate,
      };
    }

    map[key].returnCount += 1;
    map[key].itemsCount += r.itemsCount;
    if (r.isCreditAdjust) {
      map[key].creditAdjust += r.refundAmount;
    } else {
      map[key].cashRefund += r.refundAmount;
    }
    map[key].totalRefund += r.refundAmount;

    const currentM = parseFlexibleReportDate(r.returnDate);
    const prevM = parseFlexibleReportDate(map[key].lastReturnDate);
    if (currentM && (!prevM || currentM.isAfter(prevM))) {
      map[key].lastReturnDate = r.returnDate;
    }
  });

  return Object.values(map);
}

// ============================================================================
// Tab 1 Export: Return Vouchers Excel & PDF
// ============================================================================

function buildSalesReturnVoucherColumns(
  themeRgb: [number, number, number]
): ExportColumnDef<
  NormalizedSalesReturnRecord,
  { sumItems: number; sumRefund: number }
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
      key: "returnNo",
      excelHeader: "Return No",
      isLeadingLabel: true,
      pdfStyle: { halign: "left" },
      excelValue: (r) => r.returnNo,
      pdfCell: (r) => r.returnNo,
    },
    {
      key: "orderId",
      excelHeader: "Order ID",
      isLeadingLabel: true,
      pdfStyle: { halign: "left" },
      excelValue: (r) => r.orderNo,
      pdfCell: (r) => r.orderNo,
    },
    {
      key: "returnDate",
      excelHeader: "Return Date",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (r) => formatShortReportDate(r.returnDate),
      pdfCell: (r) => formatShortReportDate(r.returnDate),
    },
    {
      key: "customer",
      excelHeader: "Customer Name",
      pdfHeader: "Customer",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", fontStyle: "bold" },
      excelValue: (r) => r.customerName,
      pdfCell: (r) => ({ content: r.customerName, styles: { fontStyle: "bold" } }),
    },
    {
      key: "phone",
      excelHeader: "Phone",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (r) => r.customerPhone || "-",
      pdfCell: (r) => r.customerPhone || "-",
    },
    {
      key: "items",
      excelHeader: "Items",
      pdfStyle: { halign: "center" },
      excelValue: (r) => r.itemsCount,
      excelTotalValue: (t) => t.sumItems,
      pdfCell: (r) => r.itemsCount,
      pdfSummaryCell: (t) => ({
        content: t.sumItems,
        styles: { halign: "center" },
      }),
    },
    {
      key: "reason",
      excelHeader: "Reason / Remarks",
      pdfHeader: "Reason",
      pdfStyle: { halign: "left" },
      excelValue: (r) => r.reasonSummary,
      pdfCell: (r) => r.reasonSummary,
    },
    {
      key: "refundMode",
      excelHeader: "Refund Mode",
      pdfHeader: "Mode",
      pdfStyle: { halign: "center" },
      excelValue: (r) => r.paymentType,
      pdfCell: (r) => r.paymentType,
    },
    {
      key: "refundAmount",
      excelHeader: "Refund Amount (BDT)",
      pdfHeader: "Refund (BDT)",
      pdfStyle: { halign: "right", fontStyle: "bold" },
      excelValue: (r) => Number(r.refundAmount.toFixed(2)),
      excelTotalValue: (t) => Number(t.sumRefund.toFixed(2)),
      pdfCell: (r) => ({
        content: formatMoney(r.refundAmount),
        styles: { fontStyle: "bold", textColor: REPORT_RGB.rose },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.sumRefund),
        styles: { textColor: themeRgb },
      }),
    },
    {
      key: "status",
      excelHeader: "Status",
      pdfStyle: { halign: "center" },
      excelValue: (r) => r.status.toUpperCase(),
      pdfCell: (r) => r.status.toUpperCase(),
    },
  ];
}

export async function exportSalesReturnVouchersExcel(
  records: NormalizedSalesReturnRecord[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<number> {
  if (!records || records.length === 0) {
    throw new Error("No sales return records available to export");
  }

  const totals = records.reduce(
    (acc, r) => {
      acc.sumItems += r.itemsCount;
      acc.sumRefund += r.refundAmount;
      return acc;
    },
    { sumItems: 0, sumRefund: 0 }
  );

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildSalesReturnVoucherColumns(themeRgb);
  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    records,
    columns,
    totals,
    `TOTAL SUMMARY (${records.length} Returns)`,
    visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Sales_Return_Report_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Sales Return Report",
    reportTitle: "Sales Return Report",
    totalLabel: "Total Returns",
    totalSummarySpan,
    includeSignatures: true,
  });

  return rows.length;
}

export async function downloadSalesReturnVouchersPdf(
  records: NormalizedSalesReturnRecord[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<void> {
  if (!records || records.length === 0) {
    throw new Error("No sales return records available to download PDF");
  }

  const totals = records.reduce(
    (acc, r) => {
      acc.sumItems += r.itemsCount;
      acc.sumRefund += r.refundAmount;
      return acc;
    },
    { sumItems: 0, sumRefund: 0 }
  );

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildSalesReturnVoucherColumns(themeRgb);
  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    records,
    columns,
    totals,
    `TOTAL SUMMARY (${records.length} Returns)`,
    { visibleColumns }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `Sales_Return_Report_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: "Sales Return Report",
    metaRightLabel: `Total Returns: ${records.length}`,
    headers,
    bodyRows,
    columnStyles,
    meta,
  });
}

// ============================================================================
// Tab 2 Export: Product-Wise Returns Excel & PDF
// ============================================================================

function buildProductReturnColumns(
  grandTotalAmount: number,
  themeRgb: [number, number, number]
): ExportColumnDef<
  ProductReturnSummary,
  { totalQuantity: number; totalAmount: number; totalVouchers: number }
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
      key: "productCode",
      excelHeader: "Product Code",
      pdfHeader: "Code",
      isLeadingLabel: true,
      pdfStyle: { halign: "left" },
      excelValue: (p) => p.productCode,
      pdfCell: (p) => p.productCode,
    },
    {
      key: "productName",
      excelHeader: "Product Name",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", fontStyle: "bold" },
      excelValue: (p) => p.productName,
      pdfCell: (p) => ({ content: p.productName, styles: { fontStyle: "bold" } }),
    },
    {
      key: "unit",
      excelHeader: "Unit",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (p) => p.unit,
      pdfCell: (p) => p.unit,
    },
    {
      key: "topReason",
      excelHeader: "Top Reason",
      isLeadingLabel: true,
      pdfStyle: { halign: "left" },
      excelValue: (p) => p.topReason,
      pdfCell: (p) => p.topReason,
    },
    {
      key: "returnCount",
      excelHeader: "Vouchers",
      pdfStyle: { halign: "center" },
      excelValue: (p) => p.returnCount,
      excelTotalValue: (t) => t.totalVouchers,
      pdfCell: (p) => p.returnCount,
      pdfSummaryCell: (t) => ({
        content: t.totalVouchers,
        styles: { halign: "center" },
      }),
    },
    {
      key: "quantity",
      excelHeader: "Returned Qty",
      pdfHeader: "Qty",
      pdfStyle: { halign: "right", fontStyle: "bold" },
      excelValue: (p) => p.totalQuantity,
      excelTotalValue: (t) => t.totalQuantity,
      pdfCell: (p) => ({ content: p.totalQuantity, styles: { fontStyle: "bold" } }),
      pdfSummaryCell: (t) => ({ content: t.totalQuantity }),
    },
    {
      key: "avgRate",
      excelHeader: "Avg Rate (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (p) =>
        p.totalQuantity > 0
          ? Number((p.totalAmount / p.totalQuantity).toFixed(2))
          : 0,
      pdfCell: (p) =>
        formatMoney(p.totalQuantity > 0 ? p.totalAmount / p.totalQuantity : 0),
    },
    {
      key: "amount",
      excelHeader: "Refund Value (BDT)",
      pdfHeader: "Refund (BDT)",
      pdfStyle: { halign: "right", fontStyle: "bold" },
      excelValue: (p) => Number(p.totalAmount.toFixed(2)),
      excelTotalValue: (t) => Number(t.totalAmount.toFixed(2)),
      pdfCell: (p) => ({
        content: formatMoney(p.totalAmount),
        styles: { fontStyle: "bold" },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.totalAmount),
        styles: { textColor: themeRgb },
      }),
    },
    {
      key: "share",
      excelHeader: "Return Share (%)",
      pdfHeader: "Share (%)",
      pdfStyle: { halign: "right" },
      excelValue: (p) =>
        `${calculateRevenueSharePct(p.totalAmount, grandTotalAmount)}%`,
      excelTotalValue: () => "100.0%",
      pdfCell: (p) =>
        `${calculateRevenueSharePct(p.totalAmount, grandTotalAmount)}%`,
      pdfSummaryCell: () => ({ content: "100.0%" }),
    },
  ];
}

export async function exportProductReturnSummaryExcel(
  products: ProductReturnSummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<number> {
  if (!products || products.length === 0) {
    throw new Error("No product return records available to export");
  }

  const totals = products.reduce(
    (acc, p) => {
      acc.totalQuantity += p.totalQuantity;
      acc.totalAmount += p.totalAmount;
      acc.totalVouchers += p.returnCount;
      return acc;
    },
    { totalQuantity: 0, totalAmount: 0, totalVouchers: 0 }
  );

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildProductReturnColumns(totals.totalAmount, themeRgb);
  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    products,
    columns,
    totals,
    `TOTAL SUMMARY (${products.length} Products)`,
    visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Product_Sales_Return_Report_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Product Returns",
    reportTitle: "Product-Wise Sales Return Report",
    totalLabel: "Total Products",
    totalSummarySpan,
    includeSignatures: true,
  });

  return rows.length;
}

export async function downloadProductReturnSummaryPdf(
  products: ProductReturnSummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<void> {
  if (!products || products.length === 0) {
    throw new Error("No product return records available to download PDF");
  }

  const totals = products.reduce(
    (acc, p) => {
      acc.totalQuantity += p.totalQuantity;
      acc.totalAmount += p.totalAmount;
      acc.totalVouchers += p.returnCount;
      return acc;
    },
    { totalQuantity: 0, totalAmount: 0, totalVouchers: 0 }
  );

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildProductReturnColumns(totals.totalAmount, themeRgb);
  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    products,
    columns,
    totals,
    `TOTAL SUMMARY (${products.length} Products)`,
    { visibleColumns }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `Product_Sales_Return_Report_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: "Product-Wise Sales Return Report",
    metaRightLabel: `Total Products: ${products.length}`,
    headers,
    bodyRows,
    columnStyles,
    meta,
  });
}

// ============================================================================
// Tab 3 Export: Customer-Wise Returns Excel & PDF
// ============================================================================

function buildCustomerReturnColumns(
  themeRgb: [number, number, number]
): ExportColumnDef<
  CustomerReturnSummary,
  {
    totalReturns: number;
    totalItems: number;
    cashRefund: number;
    creditAdjust: number;
    totalRefund: number;
  }
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
      key: "customerName",
      excelHeader: "Customer Name",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", fontStyle: "bold" },
      excelValue: (c) => c.customerName,
      pdfCell: (c) => ({ content: c.customerName, styles: { fontStyle: "bold" } }),
    },
    {
      key: "phone",
      excelHeader: "Phone",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (c) => c.customerPhone || "-",
      pdfCell: (c) => c.customerPhone || "-",
    },
    {
      key: "returnCount",
      excelHeader: "Returns",
      pdfStyle: { halign: "center" },
      excelValue: (c) => c.returnCount,
      excelTotalValue: (t) => t.totalReturns,
      pdfCell: (c) => c.returnCount,
      pdfSummaryCell: (t) => ({
        content: t.totalReturns,
        styles: { halign: "center" },
      }),
    },
    {
      key: "itemsCount",
      excelHeader: "Items",
      pdfStyle: { halign: "center" },
      excelValue: (c) => c.itemsCount,
      excelTotalValue: (t) => t.totalItems,
      pdfCell: (c) => c.itemsCount,
      pdfSummaryCell: (t) => ({
        content: t.totalItems,
        styles: { halign: "center" },
      }),
    },
    {
      key: "cashRefund",
      excelHeader: "Cash Refund (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (c) => Number(c.cashRefund.toFixed(2)),
      excelTotalValue: (t) => Number(t.cashRefund.toFixed(2)),
      pdfCell: (c) => ({
        content: formatMoney(c.cashRefund),
        styles: { textColor: REPORT_RGB.emerald },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.cashRefund),
        styles: { textColor: REPORT_RGB.emerald },
      }),
    },
    {
      key: "creditAdjust",
      excelHeader: "Due Adjusted (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (c) => Number(c.creditAdjust.toFixed(2)),
      excelTotalValue: (t) => Number(t.creditAdjust.toFixed(2)),
      pdfCell: (c) => ({
        content: c.creditAdjust > 0 ? formatMoney(c.creditAdjust) : "-",
        styles: {
          textColor: c.creditAdjust > 0 ? REPORT_RGB.amber : REPORT_RGB.muted,
        },
      }),
      pdfSummaryCell: (t) => ({
        content: t.creditAdjust > 0 ? formatMoney(t.creditAdjust) : "-",
        styles: {
          textColor: t.creditAdjust > 0 ? REPORT_RGB.amber : REPORT_RGB.muted,
        },
      }),
    },
    {
      key: "totalRefund",
      excelHeader: "Total Refund (BDT)",
      pdfStyle: { halign: "right", fontStyle: "bold" },
      excelValue: (c) => Number(c.totalRefund.toFixed(2)),
      excelTotalValue: (t) => Number(t.totalRefund.toFixed(2)),
      pdfCell: (c) => ({
        content: formatMoney(c.totalRefund),
        styles: { fontStyle: "bold", textColor: REPORT_RGB.rose },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.totalRefund),
        styles: { textColor: themeRgb },
      }),
    },
    {
      key: "lastReturnDate",
      excelHeader: "Last Return Date",
      pdfStyle: { halign: "center" },
      excelValue: (c) => formatShortReportDate(c.lastReturnDate),
      pdfCell: (c) => formatShortReportDate(c.lastReturnDate),
    },
  ];
}

export async function exportCustomerReturnSummaryExcel(
  customers: CustomerReturnSummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<number> {
  if (!customers || customers.length === 0) {
    throw new Error("No customer return records available to export");
  }

  const totals = customers.reduce(
    (acc, c) => {
      acc.totalReturns += c.returnCount;
      acc.totalItems += c.itemsCount;
      acc.cashRefund += c.cashRefund;
      acc.creditAdjust += c.creditAdjust;
      acc.totalRefund += c.totalRefund;
      return acc;
    },
    {
      totalReturns: 0,
      totalItems: 0,
      cashRefund: 0,
      creditAdjust: 0,
      totalRefund: 0,
    }
  );

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildCustomerReturnColumns(themeRgb);
  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    customers,
    columns,
    totals,
    `TOTAL SUMMARY (${customers.length} Customers)`,
    visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Customer_Sales_Return_Report_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Customer Returns",
    reportTitle: "Customer-Wise Sales Return Report",
    totalLabel: "Total Customers",
    totalSummarySpan,
    includeSignatures: true,
  });

  return rows.length;
}

export async function downloadCustomerReturnSummaryPdf(
  customers: CustomerReturnSummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<void> {
  if (!customers || customers.length === 0) {
    throw new Error("No customer return records available to download PDF");
  }

  const totals = customers.reduce(
    (acc, c) => {
      acc.totalReturns += c.returnCount;
      acc.totalItems += c.itemsCount;
      acc.cashRefund += c.cashRefund;
      acc.creditAdjust += c.creditAdjust;
      acc.totalRefund += c.totalRefund;
      return acc;
    },
    {
      totalReturns: 0,
      totalItems: 0,
      cashRefund: 0,
      creditAdjust: 0,
      totalRefund: 0,
    }
  );

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildCustomerReturnColumns(themeRgb);
  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    customers,
    columns,
    totals,
    `TOTAL SUMMARY (${customers.length} Customers)`,
    { visibleColumns }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `Customer_Sales_Return_Report_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: "Customer-Wise Sales Return Report",
    metaRightLabel: `Total Customers: ${customers.length}`,
    headers,
    bodyRows,
    columnStyles,
    meta,
  });
}

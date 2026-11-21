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
  extractPurchaseReturnRemarks,
  getPurchaseReturnReasonLabel,
} from "@/pages/admin/trade/constants/returnReasons";
import {
  isPurchaseReturnRecord,
  type UnifiedPurchaseRecord,
} from "@/pages/admin/trade/purchases/hooks/usePurchaseQueries";
import type { PurchaseReturnItem } from "@/types";

export type PurchaseReturnReportTab = "returns" | "products" | "suppliers";

export interface NormalizedPurchaseReturnLine {
  productId: string;
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  reason: string;
}

export interface NormalizedPurchaseReturnRecord {
  id: string | number;
  returnNo: string;
  orderNo: string;
  purchaseInvoiceNo: string;
  challanNo: string;
  returnDate: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  supplierAddress: string;
  itemsCount: number;
  details: NormalizedPurchaseReturnLine[];
  reasonSummary: string;
  paymentType: string;
  isCreditAdjust: boolean;
  refundAmount: number;
  grandTotal: number;
  status: string;
  raw: PurchaseReturnItem;
}

export interface ProductPurchaseReturnSummary {
  productKey: string;
  productCode: string;
  productName: string;
  unit: string;
  topReason: string;
  returnCount: number;
  totalQuantity: number;
  totalAmount: number;
}

export interface SupplierReturnSummary {
  supplierKey: string;
  supplierName: string;
  supplierPhone: string;
  supplierAddress?: string;
  returnCount: number;
  itemsCount: number;
  cashRefund: number;
  creditAdjust: number;
  totalRefund: number;
  lastReturnDate: string;
  records?: NormalizedPurchaseReturnRecord[];
}

export interface SupplierProductReturnItem {
  productKey: string;
  productCode: string;
  productName: string;
  unit: string;
  totalQuantity: number;
  unitPrice: number;
  totalAmount: number;
  reasons: string[];
  returnCount: number;
}

function extractRawReturnLines(item: any): any[] {
  const candidates = [
    item?.returnDetails,
    item?.purchaseReturnDetails,
    item?.return_details,
    item?.purchase_return_details,
    item?.returnedItems,
    item?.returned_items,
    item?.details,
    item?.items,
    item?.products,
  ];
  for (const list of candidates) {
    if (Array.isArray(list) && list.length > 0) return list;
  }
  return [];
}

/**
 * Extracts and normalizes purchase return records from the unified query data,
 * filtering strictly within the requested report date range.
 */
export function extractNormalizedPurchaseReturns(
  records: UnifiedPurchaseRecord[],
  startDate?: string,
  endDate?: string
): NormalizedPurchaseReturnRecord[] {
  if (!Array.isArray(records)) return [];

  const isBackendReturnNo = (no?: string): boolean => {
    if (!no) return false;
    const clean = String(no).trim().toUpperCase();
    if (
      clean.startsWith("PR-") ||
      clean.startsWith("RET_") ||
      clean.startsWith("RET-") ||
      clean.startsWith("PR_")
    ) {
      return false;
    }
    return true;
  };

  const getInvoiceKey = (item: any): string => {
    const raw =
      item.purchaseInvoiceNo ||
      item.purchase_invoice_no ||
      item.invoiceNo ||
      item.invoice_no ||
      item.orderNo ||
      item.order_no ||
      "";
    return String(raw || "").trim().toLowerCase();
  };

  // Filter raw return candidates
  const rawReturns = records.filter(
    (item: any) =>
      item && (Boolean(item.isReturnRecord) || isPurchaseReturnRecord(item))
  );

  // Phase 1: Collect all authentic backend returns and parent purchases
  const purchasesByRef = new Map<string, any>();
  records.forEach((rec: any) => {
    if (!rec || Boolean(rec.isReturnRecord) || isPurchaseReturnRecord(rec)) return;
    [
      rec.purchaseInvoiceNo,
      rec.invoiceNo,
      rec.id,
      rec.purchaseId,
      rec.orderNo,
      rec.challanNo,
    ].forEach((ref) => {
      const cleanRef = String(ref ?? "").trim().toLowerCase();
      if (cleanRef && !purchasesByRef.has(cleanRef)) {
        purchasesByRef.set(cleanRef, rec);
      }
    });
  });

  const backendReturnsByInvoice = new Map<string, any>();
  rawReturns.forEach((item: any) => {
    const rawRNo = String(
      item.returnNo || item.return_no || item.purchaseReturnNo || item.id || ""
    ).trim();

    if (isBackendReturnNo(rawRNo)) {
      const invKey = getInvoiceKey(item);
      if (invKey && invKey !== "-") {
        backendReturnsByInvoice.set(invKey, item);
      }
    }
  });

  // Phase 2: Sort candidates so authentic backend return records are processed FIRST
  const sortedReturns = [...rawReturns].sort((a: any, b: any) => {
    const aNo = String(
      a.returnNo || a.return_no || a.purchaseReturnNo || a.id || ""
    ).trim();
    const bNo = String(
      b.returnNo || b.return_no || b.purchaseReturnNo || b.id || ""
    ).trim();
    const aIsBackend = isBackendReturnNo(aNo);
    const bIsBackend = isBackendReturnNo(bNo);
    if (aIsBackend && !bIsBackend) return -1;
    if (!aIsBackend && bIsBackend) return 1;
    return 0;
  });

  const result: NormalizedPurchaseReturnRecord[] = [];
  const seenReturnNos = new Set<string>();
  const seenInvoiceRefundPairs = new Set<string>();

  sortedReturns.forEach((item: any, idx: number) => {
    let returnNo = String(
      item.returnNo ||
        item.return_no ||
        item.purchaseReturnNo ||
        item.refNo ||
        item.orderNo ||
        `PR-${idx + 1}`
    ).trim();

    // Prefer backend-generated ID if available on the object
    if (!isBackendReturnNo(returnNo) && item.id && isBackendReturnNo(String(item.id))) {
      returnNo = String(item.id).trim();
    }

    const isBackend = isBackendReturnNo(returnNo);
    const invKey = getInvoiceKey(item);
    const refundAmount = Number(
      item.returnRefundAmount ??
        item.refundAmount ??
        item.refund_amount ??
        item.grandTotal ??
        item.returnGrandTotal ??
        0
    );

    // If this is a synthetic client-persisted PR- record:
    if (!isBackend) {
      // If an authentic backend return exists for this purchase invoice, DROP this client duplicate!
      if (invKey && invKey !== "-" && backendReturnsByInvoice.has(invKey)) {
        return;
      }
    }

    // Deduplicate identical return numbers
    const dedupKey = returnNo.toLowerCase();
    if (seenReturnNos.has(dedupKey)) {
      return;
    }

    // Deduplicate multiple returns for the same invoice & refund amount (keeping backend record)
    if (invKey && invKey !== "-") {
      const invDedupKey = `${invKey}_${refundAmount.toFixed(2)}`;
      if (seenInvoiceRefundPairs.has(invDedupKey)) {
        return;
      }
      seenInvoiceRefundPairs.add(invDedupKey);
    }

    seenReturnNos.add(dedupKey);

    const rawDate = String(
      item.returnDate ||
        item.return_date ||
        item.date ||
        item.purchaseDate ||
        item.createdAt ||
        item.created_at ||
        ""
    ).trim();

    if (!isDateInReportRange(rawDate, startDate, endDate)) {
      return;
    }

    let rawLines = extractRawReturnLines(item);
    if (rawLines.length === 0) {
      const parentPur =
        purchasesByRef.get(invKey) ||
        purchasesByRef.get(String(item.purchaseId ?? item.purchase_id ?? "").trim().toLowerCase()) ||
        purchasesByRef.get(String(item.id ?? "").trim().toLowerCase());

      if (parentPur) {
        rawLines = extractRawReturnLines(parentPur);
      }
    }

    const validLines = rawLines.filter(
      (line) =>
        Number(line?.returnQuantity ?? line?.return_quantity ?? line?.quantity ?? line?.qty ?? 0) > 0 ||
        (line && (line.productName || line.productId || line.name || line.productCode))
    );

    const details: NormalizedPurchaseReturnLine[] = validLines.map((line: any, lIdx: number) => {
      const quantity = Number(
        line.returnQuantity ??
          line.return_quantity ??
          line.quantity ??
          line.qty ??
          1
      );
      const unitPrice = Number(
        line.unitPrice ??
          line.unit_price ??
          line.rate ??
          line.price ??
          line.buyPrice ??
          0
      );
      const lineTotal = Number(
        line.total ??
          line.totalAmount ??
          line.total_amount ??
          quantity * unitPrice
      );

      const rawReason =
        line.returnReason ||
        line.return_reason ||
        line.reason ||
        line.remarks ||
        line.note ||
        "";

      return {
        productId: String(line.productId ?? line.product_id ?? line.id ?? `prod-${lIdx}`),
        productCode: String(line.productCode ?? line.product_code ?? line.sku ?? line.pcode ?? "").trim(),
        productName: String(line.productName ?? line.product_name ?? line.name ?? "Item"),
        unit: String(line.unit ?? line.unitName ?? line.unit_name ?? "Pcs"),
        quantity,
        unitPrice,
        total: lineTotal,
        reason: getPurchaseReturnReasonLabel(rawReason) || rawReason || "N/A",
      };
    });

    const finalRefund =
      refundAmount > 0
        ? refundAmount
        : Number(
            item.returnRefundAmount ??
              item.refundAmount ??
              item.refund_amount ??
              0
          );

    if (details.length === 0 && finalRefund > 0) {
      const orderLabel =
        item.orderNo && item.orderNo !== "-"
          ? `Order #${item.orderNo}`
          : returnNo && returnNo !== "-"
          ? `Return Voucher #${returnNo}`
          : "Purchase Return";

      details.push({
        productId: String(item.id || returnNo || `ret-${idx}`),
        productCode: returnNo || "-",
        productName: `${orderLabel} (Return Refund)`,
        unit: "vchr",
        quantity: 1,
        unitPrice: finalRefund,
        total: finalRefund,
        reason: "N/A",
      });
    }

    const reasonSummary =
      extractPurchaseReturnRemarks(item) ||
      details.map((d) => d.reason).filter((r) => r && r !== "N/A").join(", ") ||
      "N/A";

    const paymentType = String(
      item.paymentType || item.payment_type || item.paymentMode || item.refundMode || "CASH"
    ).trim().toUpperCase();

    const isCreditAdjust =
      paymentType.includes("CREDIT") ||
      paymentType.includes("DUE") ||
      paymentType.includes("ADJUST") ||
      item.isCreditAdjust === true;

    const grandTotal = Number(
      item.grandTotal ??
        item.grand_total ??
        item.returnGrandTotal ??
        item.return_grand_total ??
        details.reduce((sum, d) => sum + d.total, 0)
    );

    const orderNo = String(
      item.orderNo || item.order_no || item.purchaseOrderNo || item.invoiceNo || "-"
    ).trim();

    const purchaseInvoiceNo = String(
      item.purchaseInvoiceNo || item.purchase_invoice_no || item.invoiceNo || item.invoice_no || "-"
    ).trim();

    const challanNo = String(item.challanNo || item.challan_no || "-").trim();

    const supplierId = String(
      item.supplierId ?? item.supplier_id ?? item.partyId ?? item.party_id ?? ""
    ).trim();

    const supplierName = String(
      item.supplierName ||
        item.supplier_name ||
        item.partyName ||
        item.party_name ||
        item.supplier ||
        "Direct Supplier"
    ).trim();

    const supplierPhone = String(
      item.supplierPhone ||
        item.supplier_phone ||
        item.phone ||
        item.partyPhone ||
        item.party_phone ||
        ""
    ).trim();

    const supplierAddress = String(
      item.supplierAddress ||
        item.supplier_address ||
        item.address ||
        item.partyAddress ||
        ""
    ).trim();

    const status = String(item.status || "Completed").trim();

    const rawPurchaseReturnItem: PurchaseReturnItem = {
      id: item.id || returnNo || idx,
      returnNo,
      orderNo,
      purchaseInvoiceNo,
      invoiceNo: purchaseInvoiceNo,
      challanNo,
      returnDate: rawDate || moment().format("YYYY-MM-DD"),
      createdAt: item.createdAt || rawDate,
      supplierId,
      supplierName,
      supplierPhone,
      supplierAddress,
      totalAmount: grandTotal,
      discount: Number(item.discount ?? 0),
      vat: Number(item.vat ?? 0),
      deliveryCharge: Number(item.deliveryCharge ?? 0),
      grandTotal,
      refundAmount: finalRefund,
      paymentType,
      status,
      note: reasonSummary === "N/A" ? "" : reasonSummary,
      remarks: reasonSummary === "N/A" ? "" : reasonSummary,
      reason: reasonSummary === "N/A" ? "" : reasonSummary,
      cashReceived: Number(item.cashReceived ?? 0),
      cardReceived: Number(item.cardReceived ?? 0),
      mfsReceived: Number(item.mfsReceived ?? 0),
      dueAmount: Number(item.dueAmount ?? 0),
      bankName: item.bankName,
      returnDetails: details.map((d) => ({
        ...d,
        buyPrice: d.unitPrice,
      })),
      itemsCount: details.length,
    };

    result.push({
      id: rawPurchaseReturnItem.id!,
      returnNo,
      orderNo,
      purchaseInvoiceNo,
      challanNo,
      returnDate: rawDate,
      supplierId,
      supplierName,
      supplierPhone,
      supplierAddress,
      itemsCount: details.length,
      details,
      reasonSummary,
      paymentType,
      isCreditAdjust,
      refundAmount: finalRefund,
      grandTotal,
      status,
      raw: rawPurchaseReturnItem,
    });
  });

  return result.sort((a, b) => {
    const mA = parseFlexibleReportDate(a.returnDate);
    const mB = parseFlexibleReportDate(b.returnDate);
    return (mB ? mB.valueOf() : 0) - (mA ? mA.valueOf() : 0);
  });
}

/**
 * Computes high-performance KPI aggregates for purchase returns.
 */
export function computePurchaseReturnKpis(
  records: NormalizedPurchaseReturnRecord[]
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

/**
 * Aggregates returned line items by product.
 */
export function aggregatePurchaseReturnProducts(
  records: NormalizedPurchaseReturnRecord[]
): ProductPurchaseReturnSummary[] {
  const map: Record<
    string,
    ProductPurchaseReturnSummary & { reasonCounts: Record<string, number> }
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
      } else {
        if ((map[key].productCode === "-" || !map[key].productCode) && line.productCode && line.productCode !== "-") {
          map[key].productCode = line.productCode;
        }
        if (map[key].unit === "Pcs" && line.unit && line.unit !== "Pcs") {
          map[key].unit = line.unit;
        }
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

/**
 * Aggregates returned records by supplier.
 */
export function aggregatePurchaseReturnSuppliers(
  records: NormalizedPurchaseReturnRecord[]
): SupplierReturnSummary[] {
  const map: Record<string, SupplierReturnSummary> = {};

  records.forEach((r) => {
    const key =
      r.supplierId && r.supplierId !== "direct"
        ? `id_${r.supplierId}`
        : r.supplierPhone
        ? `ph_${r.supplierPhone}`
        : `name_${r.supplierName.toLowerCase()}`;

    if (!map[key]) {
      map[key] = {
        supplierKey: key,
        supplierName: r.supplierName,
        supplierPhone: r.supplierPhone || "-",
        supplierAddress: r.supplierAddress || "",
        returnCount: 0,
        itemsCount: 0,
        cashRefund: 0,
        creditAdjust: 0,
        totalRefund: 0,
        lastReturnDate: r.returnDate,
        records: [],
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
    if (r.supplierAddress && !map[key].supplierAddress) {
      map[key].supplierAddress = r.supplierAddress;
    }
    map[key].records!.push(r);

    const currentM = parseFlexibleReportDate(r.returnDate);
    const prevM = parseFlexibleReportDate(map[key].lastReturnDate);
    if (currentM && (!prevM || currentM.isAfter(prevM))) {
      map[key].lastReturnDate = r.returnDate;
    }
  });

  return Object.values(map);
}

/**
 * Aggregates all returned products for a specific supplier.
 */
export function aggregateSupplierReturnedProducts(
  records: NormalizedPurchaseReturnRecord[]
): SupplierProductReturnItem[] {
  const map: Record<string, SupplierProductReturnItem> = {};

  records.forEach((r) => {
    const seenProducts = new Set<string>();
    (r.details || []).forEach((line) => {
      const pName = String(line.productName || "Returned Product").trim();
      const pCode = String(line.productCode || "-").trim();
      const pUnit = line.unit || "Pcs";
      const key =
        line.productId && line.productId !== "unknown"
          ? `${line.productId}_${pName}`
          : pCode !== "-"
          ? `code_${pCode}`
          : `name_${pName.toLowerCase()}`;

      if (!map[key]) {
        map[key] = {
          productKey: key,
          productCode: pCode,
          productName: pName,
          unit: pUnit,
          totalQuantity: 0,
          unitPrice:
            line.unitPrice ||
            (line.quantity > 0 ? line.total / line.quantity : 0),
          totalAmount: 0,
          reasons: [],
          returnCount: 0,
        };
      }

      if (!seenProducts.has(key)) {
        map[key].returnCount += 1;
        seenProducts.add(key);
      }
      map[key].totalQuantity += line.quantity;
      map[key].totalAmount += line.total;

      const reason = line.reason && line.reason !== "N/A" ? line.reason : "";
      if (reason && !map[key].reasons.includes(reason)) {
        map[key].reasons.push(reason);
      }
    });
  });

  return Object.values(map);
}

// ============================================================================
// Tab 1 Export: Return Vouchers Excel & PDF
// ============================================================================

function buildPurchaseReturnVoucherColumns(
  themeRgb: [number, number, number]
): ExportColumnDef<
  NormalizedPurchaseReturnRecord,
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
      excelHeader: "Purchase / Invoice No",
      pdfHeader: "Purchase No",
      isLeadingLabel: true,
      pdfStyle: { halign: "left" },
      excelValue: (r) => r.purchaseInvoiceNo !== "-" ? r.purchaseInvoiceNo : r.orderNo,
      pdfCell: (r) => r.purchaseInvoiceNo !== "-" ? r.purchaseInvoiceNo : r.orderNo,
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
      key: "supplier",
      excelHeader: "Supplier Name",
      pdfHeader: "Supplier",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", fontStyle: "bold" },
      excelValue: (r) => r.supplierName,
      pdfCell: (r) => ({ content: r.supplierName, styles: { fontStyle: "bold" } }),
    },
    {
      key: "phone",
      excelHeader: "Phone",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (r) => r.supplierPhone || "-",
      pdfCell: (r) => r.supplierPhone || "-",
    },
    {
      key: "address",
      excelHeader: "Address",
      isLeadingLabel: true,
      pdfStyle: { halign: "left" },
      excelValue: (r) => r.supplierAddress || "-",
      pdfCell: (r) => r.supplierAddress || "-",
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

export async function exportPurchaseReturnVouchersExcel(
  records: NormalizedPurchaseReturnRecord[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<number> {
  if (!records || records.length === 0) {
    throw new Error("No purchase return records available to export");
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
  const columns = buildPurchaseReturnVoucherColumns(themeRgb);
  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    records,
    columns,
    totals,
    `TOTAL SUMMARY (${records.length} Returns)`,
    visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Purchase_Return_Report_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Purchase Return Report",
    reportTitle: "Purchase Return Report",
    totalLabel: "Total Returns",
    totalSummarySpan,
    includeSignatures: true,
  });

  return rows.length;
}

export async function downloadPurchaseReturnVouchersPdf(
  records: NormalizedPurchaseReturnRecord[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<void> {
  if (!records || records.length === 0) {
    throw new Error("No purchase return records available to download PDF");
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
  const columns = buildPurchaseReturnVoucherColumns(themeRgb);
  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    records,
    columns,
    totals,
    `TOTAL SUMMARY (${records.length} Returns)`,
    { visibleColumns }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `Purchase_Return_Report_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: "Purchase Return Report",
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
  ProductPurchaseReturnSummary,
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
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (p) => p.productCode || "-",
      pdfCell: (p) => p.productCode || "-",
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
      pdfStyle: { halign: "center" },
      excelValue: (p) => p.unit,
      pdfCell: (p) => p.unit,
    },
    {
      key: "topReason",
      excelHeader: "Top Reason",
      pdfStyle: { halign: "left" },
      excelValue: (p) => p.topReason,
      pdfCell: (p) => p.topReason,
    },
    {
      key: "returnCount",
      excelHeader: "Return Vouchers",
      pdfHeader: "Vouchers",
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
      excelHeader: "Returned Quantity",
      pdfHeader: "Qty",
      pdfStyle: { halign: "right", fontStyle: "bold" },
      excelValue: (p) => Number(p.totalQuantity.toFixed(2)),
      excelTotalValue: (t) => Number(t.totalQuantity.toFixed(2)),
      pdfCell: (p) => Number(p.totalQuantity.toFixed(2)),
      pdfSummaryCell: (t) => ({
        content: Number(t.totalQuantity.toFixed(2)),
        styles: { halign: "right", fontStyle: "bold" },
      }),
    },
    {
      key: "avgRate",
      excelHeader: "Unit Price (BDT)",
      pdfHeader: "Unit Price (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (p) =>
        Number((p.totalQuantity > 0 ? p.totalAmount / p.totalQuantity : 0).toFixed(2)),
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
        styles: { fontStyle: "bold", textColor: REPORT_RGB.rose },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.totalAmount),
        styles: { textColor: themeRgb },
      }),
    },
    {
      key: "share",
      excelHeader: "Return Share (%)",
      pdfHeader: "Share",
      pdfStyle: { halign: "right" },
      excelValue: (p) =>
        calculateRevenueSharePct(p.totalAmount, grandTotalAmount),
      pdfCell: (p) =>
        `${calculateRevenueSharePct(p.totalAmount, grandTotalAmount)}%`,
    },
  ];
}

export async function exportProductPurchaseReturnSummaryExcel(
  products: ProductPurchaseReturnSummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<number> {
  if (!products || products.length === 0) {
    throw new Error("No product return records available to export");
  }

  const grandTotalAmount = products.reduce((sum, p) => sum + p.totalAmount, 0);
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
  const columns = buildProductReturnColumns(grandTotalAmount, themeRgb);
  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    products,
    columns,
    totals,
    `TOTAL SUMMARY (${products.length} Products)`,
    visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Product_Purchase_Return_Summary_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Product Return Summary",
    reportTitle: "Product-Wise Purchase Return Summary",
    totalLabel: "Total Products",
    totalSummarySpan,
    includeSignatures: true,
  });

  return rows.length;
}

export async function downloadProductPurchaseReturnSummaryPdf(
  products: ProductPurchaseReturnSummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<void> {
  if (!products || products.length === 0) {
    throw new Error("No product return records available to download PDF");
  }

  const grandTotalAmount = products.reduce((sum, p) => sum + p.totalAmount, 0);
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
  const columns = buildProductReturnColumns(grandTotalAmount, themeRgb);
  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    products,
    columns,
    totals,
    `TOTAL SUMMARY (${products.length} Products)`,
    { visibleColumns }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `Product_Purchase_Return_Summary_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: "Product-Wise Purchase Return Summary",
    metaRightLabel: `Total Products: ${products.length}`,
    headers,
    bodyRows,
    columnStyles,
    meta,
  });
}

// ============================================================================
// Tab 3 Export: Supplier-Wise Returns Excel & PDF
// ============================================================================

function buildSupplierReturnColumns(
  themeRgb: [number, number, number]
): ExportColumnDef<
  SupplierReturnSummary,
  {
    sumReturns: number;
    sumItems: number;
    sumCash: number;
    sumCredit: number;
    sumTotal: number;
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
      key: "supplierName",
      excelHeader: "Supplier Name",
      pdfHeader: "Supplier",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", fontStyle: "bold" },
      excelValue: (s) => s.supplierName,
      pdfCell: (s) => ({ content: s.supplierName, styles: { fontStyle: "bold" } }),
    },
    {
      key: "phone",
      excelHeader: "Phone",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (s) => s.supplierPhone || "-",
      pdfCell: (s) => s.supplierPhone || "-",
    },
    {
      key: "returnCount",
      excelHeader: "Return Vouchers",
      pdfHeader: "Returns",
      pdfStyle: { halign: "center" },
      excelValue: (s) => s.returnCount,
      excelTotalValue: (t) => t.sumReturns,
      pdfCell: (s) => s.returnCount,
      pdfSummaryCell: (t) => ({
        content: t.sumReturns,
        styles: { halign: "center" },
      }),
    },
    {
      key: "itemsCount",
      excelHeader: "Total Items",
      pdfHeader: "Items",
      pdfStyle: { halign: "center" },
      excelValue: (s) => s.itemsCount,
      excelTotalValue: (t) => t.sumItems,
      pdfCell: (s) => s.itemsCount,
      pdfSummaryCell: (t) => ({
        content: t.sumItems,
        styles: { halign: "center" },
      }),
    },
    {
      key: "cashRefund",
      excelHeader: "Cash/Bank Refund (BDT)",
      pdfHeader: "Cash Refund (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (s) => Number(s.cashRefund.toFixed(2)),
      excelTotalValue: (t) => Number(t.sumCash.toFixed(2)),
      pdfCell: (s) => formatMoney(s.cashRefund),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.sumCash),
        styles: { halign: "right" },
      }),
    },
    {
      key: "creditAdjust",
      excelHeader: "Due Adjusted (BDT)",
      pdfHeader: "Due Adjusted (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (s) => Number(s.creditAdjust.toFixed(2)),
      excelTotalValue: (t) => Number(t.sumCredit.toFixed(2)),
      pdfCell: (s) => formatMoney(s.creditAdjust),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.sumCredit),
        styles: { halign: "right" },
      }),
    },
    {
      key: "totalRefund",
      excelHeader: "Total Refund (BDT)",
      pdfHeader: "Total Refund (BDT)",
      pdfStyle: { halign: "right", fontStyle: "bold" },
      excelValue: (s) => Number(s.totalRefund.toFixed(2)),
      excelTotalValue: (t) => Number(t.sumTotal.toFixed(2)),
      pdfCell: (s) => ({
        content: formatMoney(s.totalRefund),
        styles: { fontStyle: "bold", textColor: REPORT_RGB.rose },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.sumTotal),
        styles: { textColor: themeRgb },
      }),
    },
    {
      key: "lastReturnDate",
      excelHeader: "Last Return Date",
      pdfStyle: { halign: "center" },
      excelValue: (s) => formatShortReportDate(s.lastReturnDate),
      pdfCell: (s) => formatShortReportDate(s.lastReturnDate),
    },
  ];
}

export async function exportSupplierPurchaseReturnSummaryExcel(
  suppliers: SupplierReturnSummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<number> {
  if (!suppliers || suppliers.length === 0) {
    throw new Error("No supplier return records available to export");
  }

  const totals = suppliers.reduce(
    (acc, s) => {
      acc.sumReturns += s.returnCount;
      acc.sumItems += s.itemsCount;
      acc.sumCash += s.cashRefund;
      acc.sumCredit += s.creditAdjust;
      acc.sumTotal += s.totalRefund;
      return acc;
    },
    {
      sumReturns: 0,
      sumItems: 0,
      sumCash: 0,
      sumCredit: 0,
      sumTotal: 0,
    }
  );

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildSupplierReturnColumns(themeRgb);
  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    suppliers,
    columns,
    totals,
    `TOTAL SUMMARY (${suppliers.length} Suppliers)`,
    visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Supplier_Purchase_Return_Summary_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Supplier Return Summary",
    reportTitle: "Supplier-Wise Purchase Return Summary",
    totalLabel: "Total Suppliers",
    totalSummarySpan,
    includeSignatures: true,
  });

  return rows.length;
}

export async function downloadSupplierPurchaseReturnSummaryPdf(
  suppliers: SupplierReturnSummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<void> {
  if (!suppliers || suppliers.length === 0) {
    throw new Error("No supplier return records available to download PDF");
  }

  const totals = suppliers.reduce(
    (acc, s) => {
      acc.sumReturns += s.returnCount;
      acc.sumItems += s.itemsCount;
      acc.sumCash += s.cashRefund;
      acc.sumCredit += s.creditAdjust;
      acc.sumTotal += s.totalRefund;
      return acc;
    },
    {
      sumReturns: 0,
      sumItems: 0,
      sumCash: 0,
      sumCredit: 0,
      sumTotal: 0,
    }
  );

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildSupplierReturnColumns(themeRgb);
  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    suppliers,
    columns,
    totals,
    `TOTAL SUMMARY (${suppliers.length} Suppliers)`,
    { visibleColumns }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `Supplier_Purchase_Return_Summary_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: "Supplier-Wise Purchase Return Summary",
    headers,
    bodyRows,
    columnStyles,
    meta,
  });
}

/**
 * Downloads a detailed Purchase Return PDF for a specific supplier,
 * exporting the exact table data (Returned Products or Return Vouchers).
 */
export async function downloadSupplierDetailedReturnPdf(
  supplier: SupplierReturnSummary,
  meta: ReportCompanyMeta,
  activeTab: "products" | "vouchers" = "products"
): Promise<void> {
  const records = supplier.records || [];
  if (records.length === 0) {
    throw new Error("No return records found for this supplier");
  }

  const commonPersonInfo = {
    name: supplier.supplierName,
    phone: supplier.supplierPhone,
    address: supplier.supplierAddress || "",
    balanceStatement: `Returns: ${supplier.returnCount} | Items: ${supplier.itemsCount} | Cash: BDT ${formatMoney(
      supplier.cashRefund
    )} | Due Adjusted: BDT ${formatMoney(
      supplier.creditAdjust
    )} | Total Refund: BDT ${formatMoney(supplier.totalRefund)}`,
    isReceivable: false,
  };

  if (activeTab === "products") {
    const products = aggregateSupplierReturnedProducts(records);
    if (products.length === 0) {
      throw new Error("No returned products found for this supplier");
    }

    const headers = [
      "SL",
      "Product",
      "Unit",
      "Returned Qty",
      "Unit Price (BDT)",
      "Total Refund (BDT)",
      "Reason",
      "Vouchers",
    ];

    let totalQty = 0;
    let totalAmt = 0;
    let totalVouchers = 0;

    const bodyRows: any[][] = products.map((p, idx) => {
      const unitPrice =
        p.totalQuantity > 0 ? p.totalAmount / p.totalQuantity : p.unitPrice;
      totalQty += p.totalQuantity;
      totalAmt += p.totalAmount;
      totalVouchers += p.returnCount;

      const reasonStr =
        p.reasons && p.reasons.length > 0 ? p.reasons.join(", ") : "-";

      return [
        idx + 1,
        p.productName,
        p.unit,
        p.totalQuantity,
        formatMoney(unitPrice),
        formatMoney(p.totalAmount),
        reasonStr,
        p.returnCount,
      ];
    });

    bodyRows.push([
      "Total",
      `Products: ${products.length}`,
      "-",
      totalQty || supplier.itemsCount,
      "-",
      formatMoney(totalAmt || supplier.totalRefund),
      "-",
      supplier.returnCount || totalVouchers,
    ]);

    await generateAndDownloadCorporatePdf({
      fileName: `Supplier_Returned_Products_${supplier.supplierName.replace(
        /\s+/g,
        "_"
      )}_${moment().format("YYYY-MM-DD")}.pdf`,
      reportTitle: `Supplier Returned Products Report - ${supplier.supplierName}`,
      personInfo: commonPersonInfo,
      headers,
      bodyRows,
      orientation: "landscape",
      columnStyles: {
        0: { halign: "center", cellWidth: 12 },
        1: { halign: "left", cellWidth: 70 },
        2: { halign: "center", cellWidth: 16 },
        3: { halign: "center", cellWidth: 24 },
        4: { halign: "right", cellWidth: 36 },
        5: { halign: "right", cellWidth: 38 },
        6: { halign: "left" },
        7: { halign: "center", cellWidth: 20 },
      },
      meta,
    });
    return;
  }

  // Case 2: Vouchers
  const headers = [
    "SL",
    "Return No",
    "Purchase No",
    "Return Date",
    "Items",
    "Cash Refund (BDT)",
    "Due Adjust (BDT)",
    "Total Refund (BDT)",
    "Reason",
  ];

  let totalItems = 0;
  let totalCash = 0;
  let totalDueAdj = 0;
  let totalRefund = 0;

  const bodyRows: any[][] = records.map((r, idx) => {
    totalItems += r.itemsCount;
    if (r.isCreditAdjust) totalDueAdj += r.refundAmount;
    else totalCash += r.refundAmount;
    totalRefund += r.refundAmount;

    return [
      idx + 1,
      r.returnNo,
      r.purchaseInvoiceNo !== "-" ? r.purchaseInvoiceNo : r.orderNo,
      formatShortReportDate(r.returnDate),
      r.itemsCount,
      r.isCreditAdjust ? "-" : formatMoney(r.refundAmount),
      r.isCreditAdjust ? formatMoney(r.refundAmount) : "-",
      formatMoney(r.refundAmount),
      r.reasonSummary || "-",
    ];
  });

  bodyRows.push([
    "Total",
    `Vouchers: ${records.length}`,
    "-",
    "-",
    totalItems,
    formatMoney(totalCash),
    formatMoney(totalDueAdj),
    formatMoney(totalRefund),
    "-",
  ]);

  await generateAndDownloadCorporatePdf({
    fileName: `Supplier_Return_Vouchers_${supplier.supplierName.replace(
      /\s+/g,
      "_"
    )}_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: `Supplier Return Vouchers - ${supplier.supplierName}`,
    personInfo: commonPersonInfo,
    headers,
    bodyRows,
    orientation: "landscape",
    meta,
  });
}

/**
 * Exports a detailed Purchase Return Excel for a specific supplier.
 */
export async function exportSupplierDetailedReturnExcel(
  supplier: SupplierReturnSummary,
  meta: ReportCompanyMeta,
  activeTab: "products" | "vouchers" = "products"
): Promise<void> {
  const records = supplier.records || [];
  if (records.length === 0) {
    throw new Error("No return records found for this supplier");
  }

  if (activeTab === "products") {
    const products = aggregateSupplierReturnedProducts(records);
    if (products.length === 0) {
      throw new Error("No returned products found for this supplier");
    }

    let totalQty = 0;
    let totalAmt = 0;
    let totalVouchers = 0;

    const rows = products.map((p, idx) => {
      const unitPrice =
        p.totalQuantity > 0 ? p.totalAmount / p.totalQuantity : p.unitPrice;
      totalQty += p.totalQuantity;
      totalAmt += p.totalAmount;
      totalVouchers += p.returnCount;

      return {
        SL: idx + 1,
        Product: p.productName,
        Unit: p.unit,
        "Returned Qty": p.totalQuantity,
        "Unit Price (BDT)": unitPrice,
        "Total Refund (BDT)": p.totalAmount,
        Reason: p.reasons.length > 0 ? p.reasons.join(", ") : "-",
        Vouchers: p.returnCount,
      };
    });

    const totalRow = {
      SL: "Total",
      Product: `Products: ${products.length} (Supplier: ${supplier.supplierName})`,
      Unit: "-",
      "Returned Qty": totalQty || supplier.itemsCount,
      "Unit Price (BDT)": "-",
      "Total Refund (BDT)": totalAmt || supplier.totalRefund,
      Reason: `Cash: ${supplier.cashRefund} | Due Adj: ${supplier.creditAdjust}`,
      Vouchers: supplier.returnCount || totalVouchers,
    };

    await buildAndDownloadExcel(rows, totalRow, {
      ...meta,
      fileName: `Supplier_Returned_Products_${supplier.supplierName.replace(
        /\s+/g,
        "_"
      )}_${moment().format("YYYY-MM-DD")}.xlsx`,
      sheetName: "Returned Products",
      reportTitle: `Supplier Returned Products - ${supplier.supplierName}`,
      totalLabel: "Total Items",
    });
    return;
  }

  // Case 2: Vouchers
  let totalItems = 0;
  let totalCash = 0;
  let totalDueAdj = 0;
  let totalRefund = 0;

  const rows = records.map((r, idx) => {
    totalItems += r.itemsCount;
    if (r.isCreditAdjust) totalDueAdj += r.refundAmount;
    else totalCash += r.refundAmount;
    totalRefund += r.refundAmount;

    return {
      SL: idx + 1,
      "Return No": r.returnNo,
      "Purchase No":
        r.purchaseInvoiceNo !== "-" ? r.purchaseInvoiceNo : r.orderNo,
      "Return Date": formatShortReportDate(r.returnDate),
      Items: r.itemsCount,
      "Cash Refund (BDT)": r.isCreditAdjust ? 0 : r.refundAmount,
      "Due Adjust (BDT)": r.isCreditAdjust ? r.refundAmount : 0,
      "Total Refund (BDT)": r.refundAmount,
      Reason: r.reasonSummary || "-",
    };
  });

  const totalRow = {
    SL: "Total",
    "Return No": `Vouchers: ${records.length} (Supplier: ${supplier.supplierName})`,
    "Purchase No": "-",
    "Return Date": "-",
    Items: totalItems,
    "Cash Refund (BDT)": totalCash,
    "Due Adjust (BDT)": totalDueAdj,
    "Total Refund (BDT)": totalRefund,
    Reason: "-",
  };

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Supplier_Return_Vouchers_${supplier.supplierName.replace(
      /\s+/g,
      "_"
    )}_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Return Vouchers",
    reportTitle: `Supplier Return Vouchers - ${supplier.supplierName}`,
    totalLabel: "Total Vouchers",
  });
}

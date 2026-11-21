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
  getCleanOrderNo,
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

/**
 * Format product unit nicely without all-caps (e.g. "PCS" -> "Pcs", "KG" -> "Kg").
 */
export const formatUnit = (unit?: string): string => {
  if (!unit) return "Pcs";
  const str = String(unit).trim();
  if (
    !str ||
    str.toLowerCase() === "vchr" ||
    str.toLowerCase() === "item" ||
    str.toLowerCase() === "none" ||
    str === "-"
  ) {
    return "Pcs";
  }
  if (str.toUpperCase() === "PCS") {
    return "Pcs";
  }
  if (str === str.toUpperCase() && str.length > 1) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
  return str;
};

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

export interface CustomerProductReturnItem {
  productKey: string;
  productId: string;
  productCode: string;
  productName: string;
  unit: string;
  totalQuantity: number;
  unitPrice: number;
  totalAmount: number;
  reasons: string[];
  returnCount: number;
  sampleOrderNo?: string;
  sampleInvoiceNo?: string;
  records?: NormalizedSalesReturnRecord[];
}

export interface CustomerReturnSummary {
  customerKey: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  returnCount: number;
  itemsCount: number;
  cashRefund: number;
  creditAdjust: number;
  totalRefund: number;
  lastReturnDate: string;
  records?: NormalizedSalesReturnRecord[];
}

function extractRawReturnLines(item: any): any[] {
  const candidates = [
    item?.returnDetails,
    item?.salesReturnDetails,
    item?.return_details,
    item?.sales_return_details,
    item?.returnedItems,
    item?.returned_items,
    item?.details,
    item?.items,
    item?.products,
    item?.salesDetails,
    item?.saleDetails,
    item?.saleDetailsList,
    item?.returnDetailList,
    item?.salesReturnDetailList,
    item?.raw?.returnDetails,
    item?.raw?.salesReturnDetails,
    item?.raw?.details,
    item?.raw?.items,
  ];
  for (const list of candidates) {
    if (Array.isArray(list) && list.length > 0) return list;
  }
  return [];
}

const normalizeTradeReference = (value: unknown): string => {
  const reference = String(value ?? "").trim().toLowerCase();
  return reference && reference !== "-" ? reference : "";
};

const getTradeReferences = (record: any): string[] =>
  Array.from(
    new Set(
      [
        record?.salesInvoiceNo,
        record?.invoiceNo,
        record?.orderNo,
        record?.saleId,
        record?.sale_id,
        record?.id,
      ]
        .map(normalizeTradeReference)
        .filter(Boolean)
    )
  );

const getRawSaleLines = (record: any): any[] => {
  const candidates = [
    record?.salesDetails,
    record?.saleDetails,
    record?.saleDetailsList,
    record?.details,
    record?.items,
    record?.products,
  ];
  return candidates.find((list) => Array.isArray(list) && list.length > 0) || [];
};

const getProductKey = (line: any): string => {
  const productId = normalizeTradeReference(line?.productId ?? line?.product_id);
  if (productId) return `id:${productId}`;

  const productCode = normalizeTradeReference(
    line?.productCode ?? line?.product_code ?? line?.pcode ?? line?.sku
  );
  if (productCode) return `code:${productCode}`;

  const productName = normalizeTradeReference(line?.productName ?? line?.product_name ?? line?.name);
  return productName ? `name:${productName}` : "";
};

const getLineQuantity = (line: any, isReturnLine: boolean): number => {
  const rawQuantity = isReturnLine
    ? line?.returnQuantity ??
      line?.return_quantity ??
      line?.returnQty ??
      line?.return_qty ??
      line?.returnedQuantity ??
      line?.returned_quantity ??
      line?.returnedQty ??
      line?.returned_qty ??
      line?.quantity ??
      line?.qty ??
      line?.productQuantity ??
      line?.product_quantity ??
      line?.itemQuantity ??
      line?.item_quantity ??
      line?.count ??
      line?.soldQuantity
    : line?.quantity ??
      line?.qty ??
      line?.soldQuantity ??
      line?.sold_quantity ??
      line?.productQuantity ??
      line?.product_quantity ??
      line?.itemQuantity ??
      line?.item_quantity ??
      line?.count;
  const quantity = Number(rawQuantity);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
};

const buildQuantityMap = (
  lines: any[],
  isReturnLine: boolean
): Map<string, number> | null => {
  if (lines.length === 0) return null;

  const quantities = new Map<string, number>();
  for (const line of lines) {
    const productKey = getProductKey(line);
    const quantity = getLineQuantity(line, isReturnLine);
    if (!productKey || quantity <= 0) return null;
    quantities.set(productKey, (quantities.get(productKey) || 0) + quantity);
  }
  return quantities;
};

function deriveReturnStatuses(records: UnifiedTradeRecord[]): Map<any, string> {
  const salesByReference = new Map<
    string,
    { key: string; quantities: Map<string, number> | null }
  >();

  records.forEach((record: any) => {
    if (!record || Boolean(record.isReturnRecord) || isReturnRecord(record)) return;

    const references = getTradeReferences(record);
    if (references.length === 0) return;

    const context = {
      key: references[0],
      quantities: buildQuantityMap(getRawSaleLines(record), false),
    };
    references.forEach((reference) => {
      const current = salesByReference.get(reference);
      if (!current || (!current.quantities && context.quantities)) {
        salesByReference.set(reference, context);
      }
    });
  });

  const returnEntries = records
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => Boolean(record?.isReturnRecord) || isReturnRecord(record))
    .sort((a, b) => {
      const dateValue = (record: any) =>
        parseFlexibleReportDate(
          record.returnDate || record.return_date || record.createdAt || record.created_at || record.date
        )?.valueOf() ?? 0;
      const dateDifference = dateValue(a.record) - dateValue(b.record);
      if (dateDifference !== 0) return dateDifference;

      const createdAt = (record: any) => {
        const value = Date.parse(String(record.createdAt || record.created_at || ""));
        return Number.isFinite(value) ? value : 0;
      };
      return createdAt(a.record) - createdAt(b.record) || a.index - b.index;
    });

  const statuses = new Map<any, string>();
  const invoiceStates = new Map<
    string,
    { returned: Map<string, number>; historyComplete: boolean }
  >();

  returnEntries.forEach(({ record }) => {
    // 1. Direct Backend field if provided (returnType, return_type, or status)
    const explicitReturnType = String(
      record.returnType || record.return_type || record.returnMode || ""
    ).trim().toUpperCase();

    if (
      explicitReturnType === "FULL" ||
      explicitReturnType === "FULL_RETURN" ||
      explicitReturnType === "FULL RETURN"
    ) {
      statuses.set(record, "Full Return");
      return;
    }
    if (
      explicitReturnType === "PARTIAL" ||
      explicitReturnType === "PARTIAL_RETURN" ||
      explicitReturnType === "PARTIAL RETURN"
    ) {
      statuses.set(record, "Partial Return");
      return;
    }

    const explicitStatus = String(record.status || "").trim();
    if (
      explicitStatus &&
      explicitStatus.toUpperCase() !== "RETURN" &&
      explicitStatus.toUpperCase() !== "UNKNOWN"
    ) {
      statuses.set(record, explicitStatus);
      return;
    }

    const references = getTradeReferences(record);
    const saleContext = references
      .map((reference) => salesByReference.get(reference))
      .find(Boolean);
    if (!saleContext) {
      statuses.set(record, "Unknown");
      return;
    }

    let invoiceState = invoiceStates.get(saleContext.key);
    if (!invoiceState) {
      invoiceState = { returned: new Map(), historyComplete: true };
      invoiceStates.set(saleContext.key, invoiceState);
    }

    const returnQuantities = buildQuantityMap(extractRawReturnLines(record), true);
    if (!saleContext.quantities?.size || !returnQuantities) {
      invoiceState.historyComplete = false;
      statuses.set(record, "Unknown");
      return;
    }

    if (!invoiceState.historyComplete) {
      statuses.set(record, "Unknown");
      return;
    }

    for (const [productKey, quantity] of returnQuantities) {
      const soldQuantity = saleContext.quantities.get(productKey);
      const returnedQuantity = (invoiceState.returned.get(productKey) || 0) + quantity;
      if (soldQuantity === undefined || returnedQuantity > soldQuantity + 0.0001) {
        invoiceState.historyComplete = false;
        statuses.set(record, "Unknown");
        return;
      }
    }

    returnQuantities.forEach((quantity, productKey) => {
      invoiceState!.returned.set(
        productKey,
        (invoiceState!.returned.get(productKey) || 0) + quantity
      );
    });

    const isFullyReturned = Array.from(saleContext.quantities).every(
      ([productKey, soldQuantity]) =>
        (invoiceState!.returned.get(productKey) || 0) >= soldQuantity - 0.0001
    );
    statuses.set(record, isFullyReturned ? "Full Return" : "Partial Return");
  });

  return statuses;
}

const isBackendReturnNo = (no?: string): boolean => {
  if (!no) return false;
  const clean = String(no).trim().toUpperCase();
  return (
    clean.length > 0 &&
    !clean.startsWith("SR-") &&
    !clean.startsWith("RET_") &&
    !clean.startsWith("RET-") &&
    !clean.startsWith("SR_")
  );
};

/**
 * Extracts and normalizes return records from `get-sales-and-return` unified API output.
 */
const isDummyTestRecord = (item: any): boolean => {
  if (!item) return false;
  const phone = String(item.customerPhone || item.phone || "").replace(/\D/g, "");
  const name = String(item.customerName || item.customer_name || "").trim().toLowerCase();
  const note = String(item.note || item.remarks || item.notes || item.reason || "").toLowerCase();
  return (
    phone === "01712274563" ||
    name === "arman" ||
    note.includes("01712274563") ||
    note.includes("(arman)")
  );
};

export function extractNormalizedSalesReturns(
  records: UnifiedTradeRecord[],
  startDate?: string,
  endDate?: string
): NormalizedSalesReturnRecord[] {
  if (!Array.isArray(records)) return [];

  const saleOrderByRef = new Map<string, string>();
  const salesByRef = new Map<string, any>();
  const salesByCustomerPhone = new Map<string, any[]>();
  const salesByCustomerId = new Map<string, any[]>();
  const salesByCustomerName = new Map<string, any[]>();
  const customerProductsMap = new Map<
    string,
    Array<{
      productId: string;
      productCode: string;
      productName: string;
      unit: string;
      unitPrice: number;
      total: number;
    }>
  >();

  records.forEach((rec: any) => {
    if (!rec || Boolean(rec?.isReturnRecord) || isReturnRecord(rec) || isDummyTestRecord(rec)) return;
    const recOrderNo = String(rec.orderNo || rec.order_no || "").trim();
    [
      rec.salesInvoiceNo,
      rec.invoiceNo,
      rec.id,
      rec.saleId,
      rec.orderNo,
      rec.order_no,
    ].forEach((ref) => {
      const cleanRef = String(ref ?? "").trim().toLowerCase();
      if (cleanRef && cleanRef !== "-" && cleanRef !== "0") {
        if (recOrderNo && !saleOrderByRef.has(cleanRef)) {
          saleOrderByRef.set(cleanRef, recOrderNo);
        }
        if (!salesByRef.has(cleanRef)) {
          salesByRef.set(cleanRef, rec);
        }
        // Also index normalized variants without "order #", "#", hyphens
        const stripped = cleanRef.replace(/^order\s*#?/i, "").replace(/^#/, "").trim();
        if (stripped && stripped !== cleanRef) {
          if (recOrderNo && !saleOrderByRef.has(stripped)) {
            saleOrderByRef.set(stripped, recOrderNo);
          }
          if (!salesByRef.has(stripped)) {
            salesByRef.set(stripped, rec);
          }
        }
      }
    });

    const cPhone = String(rec.customerPhone || rec.phone || "").replace(/\D/g, "");
    const cId = String(rec.customerId || rec.customer_id || "").trim();
    const cName = String(rec.customerName || rec.customer_name || "").trim().toLowerCase();

    if (cPhone.length >= 7) {
      if (!salesByCustomerPhone.has(cPhone)) salesByCustomerPhone.set(cPhone, []);
      salesByCustomerPhone.get(cPhone)!.push(rec);
    }
    if (cId && cId !== "-" && cId !== "0") {
      if (!salesByCustomerId.has(cId)) salesByCustomerId.set(cId, []);
      salesByCustomerId.get(cId)!.push(rec);
    }
    if (cName && cName !== "customer" && cName !== "-") {
      if (!salesByCustomerName.has(cName)) salesByCustomerName.set(cName, []);
      salesByCustomerName.get(cName)!.push(rec);
    }

    const lines = extractRawReturnLines(rec);
    lines.forEach((l: any) => {
      const pName = String(
        l.productName || l.product_name || l.name || l.itemName || l.item_name || ""
      ).trim();
      if (
        pName &&
        pName !== "Returned Product" &&
        pName !== "Returned Item" &&
        !/^order\s*#?/i.test(pName) &&
        !/return\s*refund/i.test(pName) &&
        pName.toLowerCase() !== "invoice" &&
        pName.toLowerCase() !== "null"
      ) {
        const prodItem = {
          productId: String(l.productId || l.product_id || l.id || ""),
          productCode: String(l.productCode || l.product_code || l.pcode || l.sku || "-"),
          productName: pName,
          unit: formatUnit(String(l.unit || l.unitName || l.unit_name || "Pcs")),
          unitPrice: Number(l.unitPrice ?? l.unit_price ?? l.price ?? l.rate ?? 0),
          total: Number(l.total ?? l.totalAmount ?? 0),
        };
        const addCustProd = (key: string) => {
          if (!customerProductsMap.has(key)) customerProductsMap.set(key, []);
          customerProductsMap.get(key)!.push(prodItem);
        };
        if (cPhone.length >= 7) addCustProd(`phone_${cPhone}`);
        if (cId && cId !== "-" && cId !== "0") addCustProd(`id_${cId}`);
        if (cName && cName !== "customer" && cName !== "-") addCustProd(`name_${cName}`);
      }
    });
  });

  const getInvoiceKey = (item: any): string => {
    const rawInv = String(
      item.salesInvoiceNo || item.sales_invoice_no || item.invoiceNo || item.invoice_no || item.orderNo || ""
    ).trim().toLowerCase();
    if (rawInv && rawInv !== "-" && rawInv !== "0" && rawInv !== "null") return rawInv;

    const noteText = String(
      item.remarks || item.note || item.notes || item.reason || item.reasonSummary || item.description || ""
    );
    const match = noteText.match(/([0-9]{4,8}-[0-9]{10,25})/);
    if (match) return match[1].toLowerCase();

    const ordMatch = noteText.match(/(?:order|ord)\s*(?:no|number)?\s*[:#]?\s*([A-Za-z0-9_-]+)/i);
    if (ordMatch && ordMatch[1] && ordMatch[1].toLowerCase() !== "null" && ordMatch[1].toLowerCase() !== "invoice") {
      return ordMatch[1].toLowerCase();
    }

    return "";
  };

  // Filter raw return records (excluding dummy test records)
  const rawReturnItems = records.filter(
    (item: any) =>
      (Boolean(item?.isReturnRecord) || isReturnRecord(item)) &&
      !isDummyTestRecord(item)
  );

  const backendReturnsByInvoice = new Set<string>();
  rawReturnItems.forEach((item: any) => {
    const rNo = String(item.returnNo || item.return_no || item.salesReturnNo || item.id || "").trim();
    if (isBackendReturnNo(rNo)) {
      const invKey = getInvoiceKey(item);
      if (invKey) backendReturnsByInvoice.add(invKey);
      if (item.orderNo) backendReturnsByInvoice.add(String(item.orderNo).trim().toLowerCase());
    }
  });

  // Sort candidates so authentic backend return records come FIRST
  const sortedReturns = [...rawReturnItems].sort((a: any, b: any) => {
    const aNo = String(a.returnNo || a.return_no || a.salesReturnNo || a.id || "").trim();
    const bNo = String(b.returnNo || b.return_no || b.salesReturnNo || b.id || "").trim();
    const aIsBackend = isBackendReturnNo(aNo);
    const bIsBackend = isBackendReturnNo(bNo);
    if (aIsBackend && !bIsBackend) return -1;
    if (!aIsBackend && bIsBackend) return 1;
    return 0;
  });

  const result: NormalizedSalesReturnRecord[] = [];
  const seenReturnNos = new Set<string>();
  const seenInvoiceRefundPairs = new Set<string>();
  const seenOrderRefundPairs = new Set<string>();
  const returnStatuses = deriveReturnStatuses(records);

  sortedReturns.forEach((item: any, idx: number) => {
    let returnNo = String(
      item.returnNo || item.return_no || item.salesReturnNo || item.refNo || item.orderNo || `SR-${idx + 1}`
    ).trim();

    // Prefer backend-generated ID if available on the object
    if (!isBackendReturnNo(returnNo) && item.id && isBackendReturnNo(String(item.id))) {
      returnNo = String(item.id).trim();
    }

    const isBackend = isBackendReturnNo(returnNo);
    const invKey = getInvoiceKey(item);
    const cleanOrd = getCleanOrderNo(item.orderNo, item.salesInvoiceNo || item.invoiceNo, item.id);
    const ordKey = String(cleanOrd || item.orderNo || "").trim().toLowerCase();

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

    // If this is a synthetic client-persisted RET- / SR- record:
    if (!isBackend) {
      // If an authentic backend return exists for this sale invoice or order, DROP this client duplicate!
      if (invKey && invKey !== "-" && backendReturnsByInvoice.has(invKey)) {
        return;
      }
      if (ordKey && ordKey !== "-" && backendReturnsByInvoice.has(ordKey)) {
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

    // Deduplicate multiple returns for the same order & refund amount
    if (ordKey && ordKey !== "-") {
      const ordDedupKey = `${ordKey}_${refundAmount.toFixed(2)}`;
      if (seenOrderRefundPairs.has(ordDedupKey)) {
        return;
      }
      seenOrderRefundPairs.add(ordDedupKey);
    }

    seenReturnNos.add(dedupKey);

    const rawDate =
      item.returnDate ||
      item.return_date ||
      item.salesDate ||
      item.date ||
      item.createdAt ||
      item.created_at ||
      "";
    if (!isDateInReportRange(rawDate, startDate, endDate)) return;

    const grandTotal = Number(
      item.returnGrandTotal ??
        item.return_grand_total ??
        item.grandTotal ??
        item.totalAmount ??
        refundAmount
    );
    const rawReasonText = extractReturnRemarks(item);
    const rawNoteText = String(
      item.remarks || item.note || item.notes || item.reason || item.reasonSummary || item.description || ""
    );
    const extractedInvoiceFromNote = rawNoteText.match(/([0-9]{4,8}-[0-9]{10,25})/)?.[1] || "";
    const extractedOrderFromNote = rawNoteText.match(/(?:order|ord)\s*(?:no|number)?\s*[:#]?\s*([A-Za-z0-9_-]+)/i)?.[1] || "";

    const salesInvoiceNo = String(
      item.salesInvoiceNo && item.salesInvoiceNo !== "-"
        ? item.salesInvoiceNo
        : item.invoiceNo && item.invoiceNo !== "-"
        ? item.invoiceNo
        : extractedInvoiceFromNote || "-"
    );
    const matchedOrderNo =
      saleOrderByRef.get(salesInvoiceNo.trim().toLowerCase()) ||
      saleOrderByRef.get(String(item.saleId ?? item.sale_id ?? "").trim().toLowerCase()) ||
      (extractedInvoiceFromNote ? saleOrderByRef.get(extractedInvoiceFromNote.toLowerCase()) : "") ||
      "";
    const directOrderNo = String(item.orderNo || item.order_no || extractedOrderFromNote || "").trim();
    const orderNo =
      cleanOrd ||
      (directOrderNo && directOrderNo !== returnNo ? directOrderNo : "") ||
      matchedOrderNo ||
      directOrderNo ||
      (salesInvoiceNo !== "-" ? salesInvoiceNo : "-");
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

    const itemPhone = String(item.customerPhone || item.phone || "").replace(/\D/g, "");
    const itemId = String(item.customerId || item.customer_id || "").trim();
    const itemName = String(item.customerName || item.customer_name || "").trim().toLowerCase();

    let rawLines = extractRawReturnLines(item);
    let parentSale =
      salesByRef.get(invKey) ||
      salesByRef.get(ordKey) ||
      (extractedInvoiceFromNote ? salesByRef.get(extractedInvoiceFromNote.toLowerCase()) : undefined) ||
      salesByRef.get(String(item.saleId ?? item.sale_id ?? "").trim().toLowerCase()) ||
      salesByRef.get(String(item.id ?? "").trim().toLowerCase());

    // If parent sale not found by reference, look up among the customer's sales
    if (!parentSale && (itemPhone.length >= 7 || (itemId && itemId !== "-") || (itemName && itemName !== "customer"))) {
      const candidateSales =
        (itemPhone.length >= 7 && salesByCustomerPhone.get(itemPhone)) ||
        (itemId && itemId !== "-" && salesByCustomerId.get(itemId)) ||
        (itemName && itemName !== "customer" && salesByCustomerName.get(itemName)) ||
        [];

      parentSale =
        candidateSales.find((s) => {
          const sLines = extractRawReturnLines(s);
          return (
            Math.abs(Number(s.grandTotal || 0) - refundAmount) < 0.01 ||
            sLines.some(
              (l) =>
                Math.abs(Number(l.total ?? l.price ?? l.unitPrice ?? 0) - refundAmount) < 0.01
            )
          );
        }) || candidateSales[0];
    }

    if (rawLines.length === 0 && parentSale) {
      const saleLines = extractRawReturnLines(parentSale);
      if (saleLines.length > 0) {
        // Try finding matching item by refund amount
        const matchingLine = saleLines.find(
          (l) =>
            Math.abs(Number(l.total ?? l.unitPrice ?? l.price ?? 0) - refundAmount) < 0.01
        );
        if (matchingLine) {
          rawLines = [matchingLine];
        } else if (
          Math.abs(Number(parentSale.grandTotal || 0) - refundAmount) < 0.01 ||
          saleLines.length === 1
        ) {
          rawLines = saleLines;
        } else {
          // Select line with closest price
          const sortedByClosest = [...saleLines].sort((a, b) => {
            const diffA = Math.abs(Number(a.unitPrice ?? a.price ?? 0) - refundAmount);
            const diffB = Math.abs(Number(b.unitPrice ?? b.price ?? 0) - refundAmount);
            return diffA - diffB;
          });
          rawLines = [sortedByClosest[0]];
        }
      }
    }

    const validLines = rawLines.filter(
      (line) =>
        getLineQuantity(line, true) > 0 ||
        (line && (line.productName || line.productId || line.name || line.productCode))
    );

    const details: NormalizedSalesReturnLine[] = validLines.map(
      (line: any, lineIdx: number) => {
        const qty = getLineQuantity(line, true) || 1;
        const price = Number(
          line.unitPrice ??
            line.unit_price ??
            line.price ??
            line.sellPrice ??
            line.sell_price ??
            line.rate ??
            0
        );
        const lineTotal = Number(
          line.total ??
            line.totalAmount ??
            line.total_amount ??
            qty * price
        );
        const lineReason =
          getReturnReasonLabel(
            line.returnReason ||
              line.return_reason ||
              line.reason ||
              line.note ||
              line.remarks
          ) || reasonSummary;

        const resolvedLineName = String(
          line.productName ||
            line.product_name ||
            line.name ||
            line.itemName ||
            line.item_name ||
            line.product?.name ||
            line.product?.productName ||
            line.product?.title ||
            "Returned Product"
        );

        return {
          productId: String(
            line.productId ||
              line.product_id ||
              line.id ||
              line.pcode ||
              `prod-${lineIdx}`
          ),
          productCode: String(
            line.productCode ||
              line.product_code ||
              line.pcode ||
              line.sku ||
              "-"
          ),
          productName: resolvedLineName,
          unit: String(
            line.unit ||
              line.unitName ||
              line.unit_name ||
              line.secondary_unit ||
              line.product?.unit ||
              "pcs"
          ),
          quantity: qty,
          unitPrice: price,
          total: lineTotal,
          reason: lineReason,
        };
      }
    );

    if (details.length === 0 && refundAmount > 0) {
      let resolvedProdName = String(
        item.productName ||
        item.product_name ||
        item.itemName ||
        item.item_name ||
        item.name ||
        ""
      ).trim();
      let resolvedProdCode = String(
        item.productCode ||
        item.product_code ||
        item.pcode ||
        item.sku ||
        "-"
      ).trim();
      let resolvedUnit = formatUnit(String(item.unit || item.unitName || item.unit_name || "Pcs").trim());

      if (!resolvedProdName || resolvedProdName === "Returned Product" || resolvedProdName === "Returned Item") {
        const custProds =
          (itemPhone.length >= 7 && customerProductsMap.get(`phone_${itemPhone}`)) ||
          (itemId && itemId !== "-" && customerProductsMap.get(`id_${itemId}`)) ||
          (itemName && itemName !== "customer" && customerProductsMap.get(`name_${itemName}`)) ||
          [];

        if (custProds.length > 0) {
          const priceMatch = custProds.find(
            (p) => Math.abs(p.unitPrice - refundAmount) < 0.01 || Math.abs(p.total - refundAmount) < 0.01
          );
          const chosen = priceMatch || custProds[0];
          resolvedProdName = chosen.productName;
          resolvedProdCode = chosen.productCode;
          resolvedUnit = formatUnit(chosen.unit || "Pcs");
        }
      }

      if (!resolvedProdName || resolvedProdName === "Returned Product" || resolvedProdName === "Returned Item") {
        const noteMatch = rawNoteText.match(/(?:product|item|return(?:ed)?)\s*[:#]?\s*([A-Za-z0-9\s_-]+?)(?:\s*(?:price|qty|amount|inv|\(|$))/i);
        if (noteMatch && noteMatch[1] && noteMatch[1].trim().length > 2 && !noteMatch[1].toLowerCase().includes("invoice")) {
          resolvedProdName = noteMatch[1].trim();
        }
      }

      if (!resolvedProdName) {
        resolvedProdName = "Returned Product";
      }

      details.push({
        productId: String(item.id || returnNo || `ret-${idx}`),
        productCode: resolvedProdCode,
        productName: resolvedProdName,
        unit: formatUnit(resolvedUnit || "Pcs"),
        quantity: 1,
        unitPrice: refundAmount,
        total: refundAmount,
        reason: reasonSummary,
      });
    }

    const explicitItemReturnType = String(
      item.returnType || item.return_type || item.returnMode || ""
    ).trim().toUpperCase();
    const explicitItemStatus = String(item.status || "").trim();

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
      status:
        explicitItemReturnType === "FULL" ||
        explicitItemReturnType === "FULL_RETURN" ||
        explicitItemReturnType === "FULL RETURN"
          ? "Full Return"
          : explicitItemReturnType === "PARTIAL" ||
            explicitItemReturnType === "PARTIAL_RETURN" ||
            explicitItemReturnType === "PARTIAL RETURN"
          ? "Partial Return"
          : explicitItemStatus &&
            explicitItemStatus.toUpperCase() !== "RETURN" &&
            explicitItemStatus.toUpperCase() !== "UNKNOWN"
          ? explicitItemStatus
          : returnStatuses.get(item) || "Unknown",
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
      } else {
        if ((map[key].productCode === "-" || !map[key].productCode) && line.productCode && line.productCode !== "-") {
          map[key].productCode = line.productCode;
        }
        if (map[key].unit === "pcs" && line.unit && line.unit !== "pcs") {
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
        customerId: r.customerId || "",
        customerName: r.customerName,
        customerPhone: r.customerPhone || "-",
        customerAddress: r.customerAddress || "",
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
    if (r.customerAddress && !map[key].customerAddress) {
      map[key].customerAddress = r.customerAddress;
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
 * Aggregates all returned products for a specific customer or set of return records.
 */
export function aggregateCustomerReturnedProducts(
  records: NormalizedSalesReturnRecord[]
): CustomerProductReturnItem[] {
  const map: Record<string, CustomerProductReturnItem> = {};

  // Find all known real products among these customer return records
  const knownRealProducts: Array<{ name: string; code: string; unit: string; price: number }> = [];
  records.forEach((r) => {
    (r.details || []).forEach((line) => {
      const name = String(line.productName || "").trim();
      if (
        name &&
        name !== "Returned Product" &&
        name !== "Returned Item" &&
        !/^order\s*#?/i.test(name) &&
        !/return\s*refund/i.test(name) &&
        name.toLowerCase() !== "invoice" &&
        name.toLowerCase() !== "null"
      ) {
        knownRealProducts.push({
          name,
          code: String(line.productCode || "-").trim(),
          unit: formatUnit(String(line.unit || "Pcs").trim()),
          price: Number(line.unitPrice || line.total || 0),
        });
      }
    });
  });

  records.forEach((r) => {
    (r.details || []).forEach((line) => {
      let pName = String(line.productName || "Returned Product").trim();
      let pCode = String(line.productCode || "-").trim();
      let pUnit = formatUnit(line.unit && line.unit !== "vchr" ? line.unit : "Pcs");

      // If generic, resolve using knownRealProducts from this customer
      if (
        !pName ||
        pName === "Returned Product" ||
        pName === "Returned Item" ||
        /^order\s*#?/i.test(pName) ||
        /return\s*refund/i.test(pName) ||
        pName.toLowerCase() === "invoice" ||
        pName.toLowerCase() === "null"
      ) {
        if (knownRealProducts.length > 0) {
          const linePrice = Number(line.unitPrice || line.total || 0);
          const priceMatch = knownRealProducts.find(
            (kp) => Math.abs(kp.price - linePrice) < 0.01
          );
          const chosen = priceMatch || knownRealProducts[0];
          pName = chosen.name;
          if (pCode === "-" && chosen.code !== "-") pCode = chosen.code;
          if (pUnit === "Pcs" && chosen.unit) pUnit = formatUnit(chosen.unit);
        } else {
          pName = "Returned Product";
        }
      }

      if (
        pCode.toLowerCase().startsWith("order") ||
        pCode.toLowerCase() === "invoice" ||
        pCode.toLowerCase() === "null"
      ) {
        pCode = "-";
      }

      const key =
        line.productId && line.productId !== "0" && !line.productId.startsWith("ret-")
          ? `id_${line.productId}`
          : pCode && pCode !== "-"
          ? `code_${pCode}`
          : `name_${pName.toLowerCase().trim()}`;

      if (!map[key]) {
        map[key] = {
          productKey: key,
          productId: line.productId || "",
          productCode: pCode,
          productName: pName,
          unit: formatUnit(pUnit),
          totalQuantity: 0,
          unitPrice: line.unitPrice || 0,
          totalAmount: 0,
          reasons: [],
          returnCount: 0,
          sampleOrderNo: r.orderNo && r.orderNo !== "-" ? r.orderNo : r.salesInvoiceNo,
          sampleInvoiceNo: r.salesInvoiceNo && r.salesInvoiceNo !== "-" ? r.salesInvoiceNo : r.orderNo,
          records: [],
        };
      }

      map[key].totalQuantity += line.quantity;
      const lineTotal = line.total || line.quantity * (line.unitPrice || 0);
      map[key].totalAmount += lineTotal;
      map[key].returnCount += 1;
      if (line.unitPrice > 0 && map[key].unitPrice === 0) {
        map[key].unitPrice = line.unitPrice;
      }
      const rsn = line.reason || r.reasonSummary;
      if (rsn && rsn !== "N/A" && !map[key].reasons.includes(rsn)) {
        map[key].reasons.push(rsn);
      }
      if (!map[key].records) {
        map[key].records = [];
      }
      if (!map[key].records!.some((rec) => rec.returnNo === r.returnNo)) {
        map[key].records!.push(r);
      }
    });
  });

  return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
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
      excelHeader: "Product",
      pdfHeader: "Product",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", fontStyle: "bold" },
      excelValue: (p) => p.productName,
      pdfCell: (p) => ({ content: p.productName, styles: { fontStyle: "bold" } }),
    },
    {
      key: "returnCount",
      excelHeader: "Vouchers",
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
      excelHeader: "Returned Qty",
      pdfHeader: "Qty",
      pdfStyle: { halign: "right", fontStyle: "bold" },
      excelValue: (p) => p.totalQuantity,
      excelTotalValue: (t) => t.totalQuantity,
      pdfCell: (p) => ({ content: p.totalQuantity, styles: { fontStyle: "bold" } }),
      pdfSummaryCell: (t) => ({ content: t.totalQuantity }),
    },
    {
      key: "unit",
      excelHeader: "Unit",
      pdfHeader: "Unit",
      pdfStyle: { halign: "center" },
      excelValue: (p) => p.unit,
      pdfCell: (p) => p.unit,
    },
    {
      key: "avgRate",
      excelHeader: "Unit Price (BDT)",
      pdfHeader: "Unit Price (BDT)",
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
    {
      key: "topReason",
      excelHeader: "Top Reason",
      pdfHeader: "Top Reason",
      pdfStyle: { halign: "left" },
      excelValue: (p) => p.topReason,
      pdfCell: (p) => p.topReason,
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

/**
 * Downloads a detailed Sales Return PDF for a specific customer,
 * exporting the exact table data (Returned Products or Return Vouchers)
 * along with the customer's return KPI metrics.
 */
export async function downloadCustomerDetailedReturnPdf(
  customer: CustomerReturnSummary,
  meta: ReportCompanyMeta,
  activeTab: "products" | "vouchers" = "products"
): Promise<void> {
  const records = customer.records || [];
  if (records.length === 0) {
    throw new Error("No return records found for this customer");
  }

  const commonPersonInfo = {
    name: customer.customerName,
    phone: customer.customerPhone,
    address: customer.customerAddress || "",
    balanceStatement: `Returns: ${customer.returnCount} | Items: ${customer.itemsCount} | Cash: BDT ${formatMoney(
      customer.cashRefund
    )} | Due Adjusted: BDT ${formatMoney(
      customer.creditAdjust
    )} | Total Refund: BDT ${formatMoney(customer.totalRefund)}`,
    isReceivable: false,
  };

  // Case 1: Returned Products Table (Aggregated by Product, matching the active UI table)
  if (activeTab === "products") {
    const products = aggregateCustomerReturnedProducts(records);
    if (products.length === 0) {
      throw new Error("No returned products found for this customer");
    }

    const headers = [
      "SL",
      "Product Name",
      "Unit",
      "Returned Qty",
      "Unit Price (BDT)",
      "Total Amount (BDT)",
      "Return Reasons",
      "Vouchers",
    ];

    let totalQty = 0;
    let totalAmt = 0;
    let totalVouchers = 0;

    const bodyRows: any[][] = products.map((p, idx) => {
      const avgUnitPrice =
        p.totalQuantity > 0 ? p.totalAmount / p.totalQuantity : p.unitPrice;
      totalQty += p.totalQuantity;
      totalAmt += p.totalAmount;
      totalVouchers += p.returnCount;

      const reasonStr =
        p.reasons && p.reasons.length > 0
          ? p.reasons.join(", ")
          : "Quality Issue / Defective";

      return [
        idx + 1,
        p.productName,
        formatUnit(p.unit),
        p.totalQuantity,
        formatMoney(avgUnitPrice),
        formatMoney(p.totalAmount),
        reasonStr,
        p.returnCount,
      ];
    });

    // Summary / Total row
    bodyRows.push([
      "Total",
      `Products: ${products.length}`,
      "-",
      totalQty || customer.itemsCount,
      "-",
      formatMoney(totalAmt || customer.totalRefund),
      "-",
      customer.returnCount || totalVouchers,
    ]);

    await generateAndDownloadCorporatePdf({
      fileName: `Customer_Returned_Products_${customer.customerName.replace(
        /\s+/g,
        "_"
      )}_${moment().format("YYYY-MM-DD")}.pdf`,
      reportTitle: `Customer Returned Products Report - ${customer.customerName}`,
      metaRightLabel: `Total Items: ${customer.itemsCount} | Total Refund: BDT ${formatMoney(
        customer.totalRefund
      )}`,
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
        6: { halign: "left", cellWidth: 62 },
        7: { halign: "center", cellWidth: 18 },
      },
      meta,
    });
    return;
  }

  // Case 2: Return Vouchers Table (Individual return vouchers)
  const headers = [
    "SL",
    "Voucher No",
    "Order / Invoice #",
    "Return Date",
    "Items",
    "Cash Refund (BDT)",
    "Due Adjust (BDT)",
    "Total Refund (BDT)",
    "Reason",
  ];

  let totalCash = 0;
  let totalDueAdj = 0;
  let totalRefundAmt = 0;
  let totalItemsCount = 0;

  const bodyRows: any[][] = records.map((r, idx) => {
    const invNo =
      r.orderNo && r.orderNo !== "-"
        ? r.orderNo
        : r.salesInvoiceNo || "-";
    totalCash += r.cashRefund;
    totalDueAdj += r.creditAdjust;
    totalRefundAmt += r.refundAmount;
    totalItemsCount += r.itemsCount;

    return [
      idx + 1,
      r.returnNo,
      invNo,
      formatShortReportDate(r.returnDate),
      r.itemsCount,
      formatMoney(r.cashRefund),
      r.creditAdjust > 0 ? formatMoney(r.creditAdjust) : "-",
      formatMoney(r.refundAmount),
      r.reasonSummary || "Quality Issue / Defective",
    ];
  });

  bodyRows.push([
    "Total",
    `Total Returns: ${customer.returnCount}`,
    "-",
    "-",
    totalItemsCount || customer.itemsCount,
    formatMoney(totalCash || customer.cashRefund),
    formatMoney(totalDueAdj || customer.creditAdjust),
    formatMoney(totalRefundAmt || customer.totalRefund),
    "-",
  ]);

  await generateAndDownloadCorporatePdf({
    fileName: `Customer_Return_Vouchers_${customer.customerName.replace(
      /\s+/g,
      "_"
    )}_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: `Customer Return Vouchers Report - ${customer.customerName}`,
    metaRightLabel: `Total Returns: ${customer.returnCount} | Total Refund: BDT ${formatMoney(
      customer.totalRefund
    )}`,
    personInfo: commonPersonInfo,
    headers,
    bodyRows,
    orientation: "landscape",
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      1: { halign: "left", cellWidth: 42 },
      2: { halign: "left", cellWidth: 42 },
      3: { halign: "center", cellWidth: 26 },
      4: { halign: "center", cellWidth: 18 },
      5: { halign: "right", cellWidth: 32 },
      6: { halign: "right", cellWidth: 32 },
      7: { halign: "right", cellWidth: 35 },
      8: { halign: "left", cellWidth: 37 },
    },
    meta,
  });
}

/**
 * Exports a detailed Sales Return Excel spreadsheet for a specific customer,
 * exporting the exact table data (Returned Products or Return Vouchers) based on active view.
 */
export async function exportCustomerDetailedReturnExcel(
  customer: CustomerReturnSummary,
  meta: ReportCompanyMeta,
  activeTab: "products" | "vouchers" = "products"
): Promise<number> {
  const records = customer.records || [];
  if (records.length === 0) {
    throw new Error("No return records found for this customer");
  }

  if (activeTab === "products") {
    const products = aggregateCustomerReturnedProducts(records);
    if (products.length === 0) {
      throw new Error("No returned products found for this customer");
    }

    let totalQty = 0;
    let totalAmt = 0;
    let totalVouchers = 0;

    const rows: any[] = products.map((p, idx) => {
      const avgUnitPrice =
        p.totalQuantity > 0 ? p.totalAmount / p.totalQuantity : p.unitPrice;
      totalQty += p.totalQuantity;
      totalAmt += p.totalAmount;
      totalVouchers += p.returnCount;

      return {
        SL: idx + 1,
        "Product Name": p.productName,
        Unit: formatUnit(p.unit),
        "Returned Qty": p.totalQuantity,
        "Unit Price (BDT)": avgUnitPrice,
        "Total Amount (BDT)": p.totalAmount,
        "Return Reasons":
          p.reasons && p.reasons.length > 0
            ? p.reasons.join(", ")
            : "Quality Issue / Defective",
        Vouchers: p.returnCount,
      };
    });

    const totalRow = {
      SL: "Total",
      "Product Name": `Products: ${products.length} (Customer: ${customer.customerName})`,
      Unit: "-",
      "Returned Qty": totalQty || customer.itemsCount,
      "Unit Price (BDT)": "-",
      "Total Amount (BDT)": totalAmt || customer.totalRefund,
      "Return Reasons": `Cash: ${customer.cashRefund} | Due Adj: ${customer.creditAdjust}`,
      Vouchers: customer.returnCount || totalVouchers,
    };

    await buildAndDownloadExcel(rows, totalRow, {
      ...meta,
      fileName: `Customer_Returned_Products_${customer.customerName.replace(
        /\s+/g,
        "_"
      )}_${moment().format("YYYY-MM-DD")}.xlsx`,
      sheetName: "Returned Products",
      reportTitle: `Customer Returned Products - ${customer.customerName}`,
      totalLabel: "Total Items",
      includeSignatures: true,
    });

    return rows.length;
  }

  // Return Vouchers Excel
  let totalCash = 0;
  let totalDueAdj = 0;
  let totalRefundAmt = 0;
  let totalItemsCount = 0;

  const rows: any[] = records.map((r, idx) => {
    const invNo =
      r.orderNo && r.orderNo !== "-"
        ? r.orderNo
        : r.salesInvoiceNo || "-";
    totalCash += r.cashRefund;
    totalDueAdj += r.creditAdjust;
    totalRefundAmt += r.refundAmount;
    totalItemsCount += r.itemsCount;

    return {
      SL: idx + 1,
      "Voucher No": r.returnNo,
      "Order / Invoice #": invNo,
      "Return Date": formatShortReportDate(r.returnDate),
      Items: r.itemsCount,
      "Cash Refund (BDT)": r.cashRefund,
      "Due Adjust (BDT)": r.creditAdjust,
      "Total Refund (BDT)": r.refundAmount,
      Reason: r.reasonSummary || "Quality Issue / Defective",
    };
  });

  const totalRow = {
    SL: "Total",
    "Voucher No": `Total Returns: ${customer.returnCount}`,
    "Order / Invoice #": `Customer: ${customer.customerName} (${customer.customerPhone})`,
    "Return Date": "-",
    Items: totalItemsCount || customer.itemsCount,
    "Cash Refund (BDT)": totalCash || customer.cashRefund,
    "Due Adjust (BDT)": totalDueAdj || customer.creditAdjust,
    "Total Refund (BDT)": totalRefundAmt || customer.totalRefund,
    Reason: "-",
  };

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Customer_Return_Vouchers_${customer.customerName.replace(
      /\s+/g,
      "_"
    )}_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Return Vouchers",
    reportTitle: `Customer Return Vouchers - ${customer.customerName}`,
    totalLabel: "Total Returns",
    includeSignatures: true,
  });

  return rows.length;
}

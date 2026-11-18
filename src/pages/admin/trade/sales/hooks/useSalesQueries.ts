import moment from "moment";
import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import {
  salesAndReturnQueryKey,
  salesListQueryKey,
  productListQueryKey,
  customersDueQueryKey,
  customerInvoicesDueQueryKey,
  cashBalanceQueryKey,
  dashboardQueryKey,
} from "@/config/query-key";
import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";

import {
  checkSalesDelete,
  deleteSalesOrder,
  validateCheckSalesDeleteResult,
} from "@/services/sales-service";
import type {
  SaleItem,
  CheckSalesDeletePayload,
  CheckSalesDeleteResponse,
  DeleteSalesOrderPayload,
  DeleteSalesOrderResponse,
} from "@/types";

export interface UnifiedTradeRecord extends SaleItem {
  isReturnRecord?: boolean;
  salesInvoiceNo?: string;
  returnNo?: string;
  returnGrandTotal?: number;
  returnType?: string;
  refNo?: string;
  salesReturnDetails?: any[];
  returnDetails?: any[];
}

export const extractLineItems = (item: any): any[] => {
  if (Array.isArray(item?.salesDetails) && item.salesDetails.length > 0) return item.salesDetails;
  if (Array.isArray(item?.saleDetails) && item.saleDetails.length > 0) return item.saleDetails;
  if (Array.isArray(item?.details) && item.details.length > 0) return item.details;
  return [];
};


export const getCleanOrderNo = (
  orderNo?: string | number | null,
  invoiceNo?: string | null,
  id?: string | number | null
): string => {
  const rawOrd = String(orderNo || "").trim();
  const rawInv = String(invoiceNo || "").trim();
  const rawId = String(id || "").trim();

  // Strip synthetic or accidental "ORD-" / "ORD_" prefix if present
  const ord = rawOrd.replace(/^ORD[-_]?/i, "").trim();
  const inv = rawInv.replace(/^ORD[-_]?/i, "").trim();

  // Helper: detect if a string is a timestamp / auto-generated ref
  // (e.g. "28488-202611161814777", "202611161814777", "2611161438531964", length > 8 digits)
  const isTimestampOrGeneratedRef = (s: string) => {
    if (!s) return false;
    if (s.includes("-") && /\d{10,}/.test(s)) return true;
    if (/^\d{9,}$/.test(s)) return true;
    if (/^(pur|sale|ret|fin)_/i.test(s)) return true;
    return false;
  };

  // 1. Direct priority to real database/backend orderNo (e.g., "000354", "354")
  if (ord && !isTimestampOrGeneratedRef(ord)) {
    if (/^\d+$/.test(ord)) {
      if (ord.length < 6) return ord.padStart(6, "0");
      if (ord.length <= 8) return ord;
      return "";
    }
    return ord;
  }

  // 2. Direct priority to numeric database ID (e.g. id: 354 -> "000354")
  if (rawId && /^\d+$/.test(rawId) && Number(rawId) > 0 && rawId.length <= 8) {
    return rawId.padStart(6, "0");
  }

  // 3. Clean numeric invoiceNo (e.g., "000354", "354") - ONLY if genuine short numeric
  if (inv && !isTimestampOrGeneratedRef(inv)) {
    if (/^\d+$/.test(inv)) {
      if (inv.length < 6) return inv.padStart(6, "0");
      if (inv.length <= 8) return inv;
    }
  }

  return "";
};

/**
 * Single source of truth for normalizing sale record numeric fields and line items.
 */
export const normalizeSaleRecord = (item: any): SaleItem => {
  const lineItems = extractLineItems(item);
  const grandTotal = Number(item?.grandTotal ?? item?.grand_total ?? item?.totalAmount ?? 0);
  const paidAmount = Number(item?.paidAmount ?? item?.paid_amount ?? 0);
  const dueAmount = Number(item?.dueAmount ?? item?.due_amount ?? 0);
  const customerId = item?.customerId ?? item?.customer_id;
  const customerName =
    item?.customerName ||
    item?.customer_name ||
    "Customer";
  const customerPhone =
    item?.customerPhone ||
    item?.customer_phone ||
    "";
  const customerAddress =
    item?.customerAddress ||
    item?.customer_address ||
    "";
  // Strict check for hasReturn:
  // ONLY true if item.hasReturn is explicitly true/1,
  // or returnNo is a non-empty, non-dash, non-zero string,
  // or returnDetails array actually contains items.
  const rawHasReturn = item?.hasReturn;
  const isExplicitlyTrue =
    rawHasReturn === true ||
    rawHasReturn === 1 ||
    rawHasReturn === "1" ||
    rawHasReturn === "true";
  const validReturnNo =
    typeof item?.returnNo === "string" &&
    item.returnNo.trim() !== "" &&
    item.returnNo.trim() !== "-" &&
    item.returnNo.trim() !== "0" &&
    item.returnNo.trim().toLowerCase() !== "null";
  const validReturn_no =
    typeof item?.return_no === "string" &&
    item.return_no.trim() !== "" &&
    item.return_no.trim() !== "-" &&
    item.return_no.trim() !== "0" &&
    item.return_no.trim().toLowerCase() !== "null";
  const hasReturnDetails =
    (Array.isArray(item?.returnDetails) && item.returnDetails.length > 0) ||
    (Array.isArray(item?.salesReturnDetails) && item.salesReturnDetails.length > 0);

  const hasReturn = Boolean(
    isExplicitlyTrue ||
    validReturnNo ||
    validReturn_no ||
    hasReturnDetails
  );

  const cleanOrderNo = getCleanOrderNo(
    item?.orderNo || item?.order_no,
    item?.invoiceNo || item?.salesInvoiceNo || item?.invoice_no,
    item?.id || item?.saleId
  );

  return {
    ...item,
    salesDate: item?.salesDate || item?.saleDate || item?.date || item?.createdAt || "",
    createdAt: item?.createdAt || item?.created_at || item?.salesDate || "",
    orderNo: cleanOrderNo,
    customerId,
    customerName,
    customerPhone,
    customerAddress,
    grandTotal,
    paidAmount,
    dueAmount,
    hasReturn,
    salesDetails: lineItems,
    details: lineItems,
  };
};

export const isReturnRecord = (item: any): boolean => {
  if (!item || typeof item !== "object") return false;
  if (item.isReturnRecord === true) return true;
  if (item.isReturnRecord === false) return false;

  const hasExplicitReturnNo = Boolean(
    (typeof item.returnNo === "string" && item.returnNo.trim() !== "" && item.returnNo !== "-" && item.returnNo !== "0") ||
    (typeof item.salesReturnNo === "string" && item.salesReturnNo.trim() !== "") ||
    (typeof item.return_no === "string" && item.return_no.trim() !== "")
  );

  const hasReturnLines =
    (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
    (Array.isArray(item.salesReturnDetails) && item.salesReturnDetails.length > 0);

  const lineItems = extractLineItems(item);
  const hasSalesLines = lineItems.length > 0;

  // An enriched sale record (sale lines + sale date + sale grand total) is primarily a sale
  // Its return voucher will be extracted separately
  if (hasSalesLines && item.salesDate && item.invoiceNo && !item.returnDate && !hasExplicitReturnNo) {
    return false;
  }

  // Explicit return markers
  if (typeof item.refNo === "string" && (item.refNo.startsWith("SR-") || item.refNo.startsWith("SR_"))) {
    return true;
  }
  if (item.head === "Sales Return") {
    return true;
  }
  const retType = String(item.returnType || "").toUpperCase();
  if (retType === "RETURN" || retType === "FULL" || retType === "PARTIAL") {
    return true;
  }
  if (String(item.status || "").toUpperCase() === "RETURN" && (hasReturnLines || !hasSalesLines || hasExplicitReturnNo)) {
    return true;
  }
  if (hasExplicitReturnNo && (hasReturnLines || !hasSalesLines || item.returnDate || item.refundAmount || item.returnGrandTotal)) {
    return true;
  }
  if (hasReturnLines && !hasSalesLines) {
    return true;
  }

  return false;
};

export const fetchSalesList = async (): Promise<SaleItem[]> => {
  try {
    const accessUser = buildAccessUser();
    const endpoint = apiConfig.sales.salesListUrl;

    const res: any = await postData({
      url: endpoint,
      body: { accessUser },
    });

    const list =
      (Array.isArray(res?.data) ? res.data : null) ||
      res?.saleList ||
      res?.salesList ||
      [];

    return (Array.isArray(list) ? list : []).map(normalizeSaleRecord);
  } catch (error) {
    console.error("Failed to fetch sales list:", error);
    return [];
  }
};

/**
 * Standardized fetcher for combined sales and return records.
 * Single source of truth for combined sales and return query.
 * Preserves every sale in salesList while also extracting return vouchers for returnsList.
 */
export const fetchSalesAndReturnList = async (): Promise<UnifiedTradeRecord[]> => {
  try {
    const accessUser = buildAccessUser();
    const endpoint = apiConfig.salesReturn.getSalesAndReturnUrl;

    const [salesAndReturnRes, finTxRes] = await Promise.allSettled([
      postData({
        url: endpoint,
        body: { accessUser },
      }),
      postData({
        url: apiConfig.finance.getFinancialTransactionUrl,
        body: { accessUser, startDate: "", endDate: "", type: "EXPENSE" },
      }),
    ]);

    const res: any = salesAndReturnRes.status === "fulfilled" ? salesAndReturnRes.value : null;
    const finVal: any = finTxRes.status === "fulfilled" ? finTxRes.value : null;
    const finTxList: any[] =
      (Array.isArray(finVal?.data)
        ? finVal.data
        : Array.isArray(finVal?.financialTransactionList)
        ? finVal.financialTransactionList
        : Array.isArray(finVal)
        ? finVal
        : []
      ).filter(
            (t: any) =>
              t &&
              t.isDeleted !== "Y" &&
              t.head === "Sales Return" &&
              (!t.notes || !t.notes.includes("Auto Sales Return")) &&
              !(t.refNo && t.billRef && String(t.refNo).trim() === String(t.billRef).trim())
          );



    const sales = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.saleList)
      ? res.saleList
      : Array.isArray(res?.salesList)
      ? res.salesList
      : [];

    const returns = Array.isArray(res?.returns)
      ? res.returns
      : Array.isArray(res?.returnList)
      ? res.returnList
      : Array.isArray(res?.salesReturnList)
      ? res.salesReturnList
      : [];

    const combinedList = Array.isArray(res?.salesAndReturnList)
      ? res.salesAndReturnList
      : Array.isArray(res)
      ? res
      : [];

    // Deduplicate into unified records array with multi-alias indexing to avoid duplicate sales
    const seenReturnKeys = new Set<string>();
    const returnedInvoices = new Set<string>();
    const backendReturnAliases = new Set<string>();
    const unifiedList: UnifiedTradeRecord[] = [];
    const aliasToSaleIdx = new Map<string, number>();

    const getSaleAliases = (item: any): string[] => {
      if (!item) return [];
      const invNo = item.salesInvoiceNo || item.invoiceNo || item.sales_invoice_no || item.invoice_no;
      const ordNo = item.orderNo || item.order_no;
      const sId = item.id || item.saleId || item.sale_id;
      const cleanOrd = getCleanOrderNo(ordNo, invNo, sId);

      return [
        cleanOrd ? `sale_ord_${cleanOrd.toLowerCase()}` : null,
        ordNo ? `sale_ord_${String(ordNo).trim().toLowerCase()}` : null,
        invNo ? `sale_inv_${String(invNo).trim().toLowerCase()}` : null,
        sId ? `sale_id_${String(sId).trim().toLowerCase()}` : null,
      ].filter(Boolean) as string[];
    };

    // Safely extract aliases for the PARENT SALE of a return record
    // CRITICAL: NEVER use return record's own item.id as parent saleId or orderId!
    const getReturnParentSaleAliases = (item: any): string[] => {
      if (!item) return [];
      const retNo = String(item.returnNo || item.return_no || item.salesReturnNo || "").trim().toLowerCase();

      const rawOrd = item.orderNo || item.order_no;
      const rawInv = item.salesInvoiceNo || item.sales_invoice_no || item.invoiceNo || item.invoice_no;
      const rawSaleId = item.saleId || item.sale_id; // ONLY authentic parent saleId, NEVER return's own item.id!

      const noteText = String(
        item.remarks || item.note || item.notes || item.reason || item.reasonSummary || item.description || ""
      );
      const match = noteText.match(/([0-9]{4,8}-[0-9]{10,25})/);
      const extractedInv = match ? match[1] : "";
      const ordMatch = noteText.match(/(?:order|ord)\s*(?:no|number)?\s*[:#]?\s*([A-Za-z0-9_-]+)/i);
      const extractedOrd =
        ordMatch && ordMatch[1] && ordMatch[1].toLowerCase() !== "null" && ordMatch[1].toLowerCase() !== "invoice"
          ? ordMatch[1]
          : "";

      const ordNo =
        rawOrd &&
        String(rawOrd).trim() !== "-" &&
        String(rawOrd).trim() !== "0" &&
        String(rawOrd).trim().toLowerCase() !== retNo &&
        !String(rawOrd).trim().toUpperCase().startsWith("SR-")
          ? String(rawOrd).trim()
          : extractedOrd;
      const invNo =
        rawInv &&
        String(rawInv).trim() !== "-" &&
        String(rawInv).trim() !== "0" &&
        String(rawInv).trim().toLowerCase() !== retNo
          ? String(rawInv).trim()
          : extractedInv;
      const sId =
        rawSaleId && String(rawSaleId).trim() !== "-" && String(rawSaleId).trim() !== "0"
          ? String(rawSaleId).trim()
          : "";

      const cleanOrd = ordNo || invNo || sId ? getCleanOrderNo(ordNo, invNo, sId) : "";

      return [
        cleanOrd ? `sale_ord_${cleanOrd.toLowerCase()}` : null,
        ordNo ? `sale_ord_${ordNo.toLowerCase()}` : null,
        invNo ? `sale_inv_${invNo.toLowerCase()}` : null,
        sId ? `sale_id_${sId.toLowerCase()}` : null,
      ].filter(Boolean) as string[];
    };

    const addSaleRecord = (item: any, fallbackIdx: number) => {
      if (!item) return;
      const aliases = getSaleAliases(item);
      const cleanOrd = getCleanOrderNo(
        item.orderNo || item.order_no,
        item.invoiceNo || item.salesInvoiceNo,
        item.id || item.saleId
      );

      const rawHasReturn = item?.hasReturn;
      const isExplicitlyTrue =
        rawHasReturn === true ||
        rawHasReturn === 1 ||
        rawHasReturn === "1" ||
        rawHasReturn === "true";
      const validReturnNo =
        typeof item?.returnNo === "string" &&
        item.returnNo.trim() !== "" &&
        item.returnNo.trim() !== "-" &&
        item.returnNo.trim() !== "0" &&
        item.returnNo.trim().toLowerCase() !== "null";
      const validReturn_no =
        typeof item?.return_no === "string" &&
        item.return_no.trim() !== "" &&
        item.return_no.trim() !== "-" &&
        item.return_no.trim() !== "0" &&
        item.return_no.trim().toLowerCase() !== "null";
      const hasReturnDetails =
        (Array.isArray(item?.returnDetails) && item.returnDetails.length > 0) ||
        (Array.isArray(item?.salesReturnDetails) && item.salesReturnDetails.length > 0) ||
        (Array.isArray(item?.returns) && item.returns.length > 0) ||
        (Array.isArray(item?.salesReturns) && item.salesReturns.length > 0);

      const statusStr = String(item?.status || "").trim().toUpperCase();
      const returnTypeStr = String(item?.returnType || item?.return_type || item?.returnMode || "").trim().toUpperCase();
      const isStatusReturn =
        statusStr === "RETURN" ||
        statusStr === "RETURNED" ||
        statusStr === "FULL_RETURN" ||
        statusStr === "FULL RETURN" ||
        statusStr === "PARTIAL_RETURN" ||
        statusStr === "PARTIAL RETURN";
      const isReturnTypeReturn =
        returnTypeStr === "FULL" ||
        returnTypeStr === "PARTIAL" ||
        returnTypeStr === "RETURN";
      const hasReturnAmount =
        Number(item?.returnGrandTotal ?? item?.returnTotalAmount ?? item?.returnRefundAmount ?? item?.refundAmount ?? 0) > 0;

      const hasReturnInfo = Boolean(
        isExplicitlyTrue ||
        validReturnNo ||
        validReturn_no ||
        hasReturnDetails ||
        isStatusReturn ||
        isReturnTypeReturn ||
        hasReturnAmount
      );

      let existingIdx = -1;
      for (const a of aliases) {
        if (aliasToSaleIdx.has(a)) {
          existingIdx = aliasToSaleIdx.get(a)!;
          break;
        }
      }

      if (existingIdx === -1) {
        const normalized = normalizeSaleRecord(item) as UnifiedTradeRecord;
        normalized.isReturnRecord = false;
        normalized.hasReturn = hasReturnInfo;
        const newIdx = unifiedList.length;
        unifiedList.push(normalized);
        aliases.forEach((a) => aliasToSaleIdx.set(a, newIdx));
      } else {
        const existing = unifiedList[existingIdx];
        const existingDetails = Array.isArray(existing.salesDetails) && existing.salesDetails.length > 0
          ? existing.salesDetails
          : existing.details || [];
        const newDetails = extractLineItems(item);
        const bestDetails = existingDetails.length >= newDetails.length ? existingDetails : newDetails;

        unifiedList[existingIdx] = {
          ...existing,
          ...item,
          orderNo: cleanOrd || existing.orderNo || item.orderNo,
          hasReturn: Boolean(existing.hasReturn || hasReturnInfo),
          grandTotal: existing.grandTotal || Number(item.grandTotal ?? 0),
          paidAmount: existing.paidAmount || Number(item.paidAmount ?? 0),
          salesDetails: bestDetails,
          details: bestDetails,
          isReturnRecord: false,
        };
        aliases.forEach((a) => aliasToSaleIdx.set(a, existingIdx));
      }

      if (hasReturnInfo) {
        aliases.forEach((a) => returnedInvoices.add(a));

        // Update any previously added return record in unifiedList that matches this sale
        unifiedList.forEach((u) => {
          if (u.isReturnRecord) {
            const uAliases = getReturnParentSaleAliases(u);
            if (uAliases.some((a) => aliases.includes(a))) {
              if (cleanOrd && (!u.orderNo || isBackendGeneratedNo(u.orderNo))) {
                u.orderNo = cleanOrd;
              }
              if (!u.customerPhone && item.customerPhone) {
                u.customerPhone = item.customerPhone;
              }
              if ((!u.customerName || u.customerName === "Customer") && item.customerName) {
                u.customerName = item.customerName;
              }
              if (!u.returnDetails || u.returnDetails.length === 0) {
                const saleLines = [
                  item.returnDetails,
                  item.salesReturnDetails,
                  item.salesDetails,
                  item.details,
                ].find((lines) => Array.isArray(lines) && lines.length > 0);
                if (saleLines && saleLines.length > 0) {
                  u.returnDetails = saleLines;
                  u.details = saleLines;
                }
              }
            }
          }
        });

        // Extract nested return records
        const nestedReturns = [
          ...(Array.isArray(item.returns) ? item.returns : []),
          ...(Array.isArray(item.salesReturns) ? item.salesReturns : []),
        ];

        if (nestedReturns.length > 0) {
          nestedReturns.forEach((r: any, rIdx: number) => {
            if (!r || typeof r !== "object") return;
            const rNo = r.returnNo || r.return_no || (cleanOrd ? `SR-${cleanOrd}-${rIdx + 1}` : `SR-${item.id || fallbackIdx}`);
            const rKey = `ret_${String(rNo).trim().toLowerCase()}`;
            if (!seenReturnKeys.has(rKey)) {
              seenReturnKeys.add(rKey);
              const rDetails = Array.isArray(r.returnDetails)
                ? r.returnDetails
                : Array.isArray(r.salesReturnDetails)
                ? r.salesReturnDetails
                : Array.isArray(r.details)
                ? r.details
                : [];
              const retRecord: UnifiedTradeRecord = {
                ...normalizeSaleRecord({ ...item, ...r }),
                id: r.id || r.returnId || `${item.id}_ret_${rIdx}`,
                returnNo: rNo,
                salesInvoiceNo: item.salesInvoiceNo || item.invoiceNo || item.orderNo || "",
                invoiceNo: item.invoiceNo || item.salesInvoiceNo || "",
                orderNo: r.orderNo || cleanOrd || item.orderNo || "",
                returnDate: r.returnDate || r.return_date || item.salesDate || moment().format("YYYY-MM-DD"),
                grandTotal: Number(r.returnGrandTotal ?? r.grandTotal ?? r.totalAmount ?? 0),
                refundAmount: Number(r.returnRefundAmount ?? r.refundAmount ?? r.returnGrandTotal ?? r.grandTotal ?? 0),
                totalAmount: Number(r.totalAmount ?? r.returnTotalAmount ?? r.returnGrandTotal ?? 0),
                returnDetails: rDetails,
                salesDetails: [],
                details: rDetails,
                isReturnRecord: true,
                hasReturn: true,
              };
              unifiedList.push(retRecord);
            }
          });
        } else {
          // Direct return on sale record (as returned by /get-sales-and-return API)
          const rNo =
            item.returnNo ||
            item.return_no ||
            item.salesReturnNo ||
            (cleanOrd ? `SR-${cleanOrd}` : `SR-${item.id || fallbackIdx}`);
          const rKey = `ret_${String(rNo).trim().toLowerCase()}`;
          if (!seenReturnKeys.has(rKey)) {
            seenReturnKeys.add(rKey);
            const rDetails = [
              item.returnDetails,
              item.salesReturnDetails,
              item.returnedItems,
              item.returned_items,
              item.salesDetails,
              item.details,
              item.items,
              item.products,
            ].find((lines) => Array.isArray(lines) && lines.length > 0) || [];

            const returnAmt = Number(
              item.returnGrandTotal ??
              item.returnTotalAmount ??
              item.returnRefundAmount ??
              item.refundAmount ??
              item.grandTotal ??
              item.totalAmount ??
              0
            );

            const refundAmt = Number(
              item.returnRefundAmount ??
              item.refundAmount ??
              item.returnGrandTotal ??
              item.returnTotalAmount ??
              returnAmt
            );

            const retRecord: UnifiedTradeRecord = {
              ...normalizeSaleRecord(item),
              id: item.returnId || item.salesReturnId || `${item.id}_ret`,
              returnNo: rNo,
              salesInvoiceNo: item.salesInvoiceNo || item.invoiceNo || item.orderNo || "",
              invoiceNo: item.invoiceNo || item.salesInvoiceNo || "",
              orderNo: cleanOrd || item.orderNo || "",
              returnDate: item.returnDate || item.return_date || item.salesDate || item.saleDate || moment().format("YYYY-MM-DD"),
              grandTotal: returnAmt,
              refundAmount: refundAmt,
              totalAmount: returnAmt,
              returnDetails: rDetails,
              salesDetails: [],
              details: rDetails,
              isReturnRecord: true,
              hasReturn: true,
            };
            unifiedList.push(retRecord);
          }
        }
      }
    };

    const isBackendGeneratedNo = (no?: string): boolean => {
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

    const addReturnRecord = (item: any, fallbackIdx: number) => {
      if (!item) return;
      const rNo = String(item.returnNo || item.return_no || item.salesReturnNo || item.id || `ret_idx_${fallbackIdx}`).trim();
      const rKey = `ret_${rNo.toLowerCase()}`;
      const saleAliases = getReturnParentSaleAliases(item);
      const isBackend = isBackendGeneratedNo(rNo);

      // If a synthetic record was already added earlier for this sale, update it with authentic backend info
      if (saleAliases.length > 0) {
        const existingSyntheticIdx = unifiedList.findIndex(
          (u) =>
            u.isReturnRecord &&
            !isBackendGeneratedNo(u.returnNo) &&
            getReturnParentSaleAliases(u).some((a) => saleAliases.includes(a))
        );

        if (existingSyntheticIdx !== -1) {
          const existing = unifiedList[existingSyntheticIdx];
          const existingDetails =
            Array.isArray(existing.returnDetails) && existing.returnDetails.length > 0
              ? existing.returnDetails
              : existing.details || [];
          const incomingDetails = [
            item.returnDetails,
            item.salesReturnDetails,
            item.returnedItems,
            item.returned_items,
            item.salesDetails,
            item.details,
            item.items,
          ].find((lines) => Array.isArray(lines) && lines.length > 0) || [];
          const bestDetails = incomingDetails.length >= existingDetails.length ? incomingDetails : existingDetails;

          unifiedList[existingSyntheticIdx] = {
            ...existing,
            ...normalizeSaleRecord(item),
            returnNo: isBackend ? rNo : existing.returnNo || rNo,
            orderNo: existing.orderNo || item.orderNo,
            returnDetails: bestDetails,
            details: bestDetails,
            salesDetails: [],
            grandTotal: Number(item.returnGrandTotal ?? item.grandTotal ?? existing.grandTotal ?? 0),
            refundAmount: Number(item.returnRefundAmount ?? item.refundAmount ?? existing.refundAmount ?? 0),
            totalAmount: Number(item.returnTotalAmount ?? item.totalAmount ?? existing.totalAmount ?? 0),
            isReturnRecord: true,
            hasReturn: true,
          };
          if (isBackend) {
            saleAliases.forEach((a) => backendReturnAliases.add(a));
          }
          return;
        }
      }

      // If this is synthetic and a backend record already exists, enrich the backend record if it was missing items
      if (!isBackend && saleAliases.length > 0) {
        const existingBackendIdx = unifiedList.findIndex(
          (u) =>
            u.isReturnRecord &&
            isBackendGeneratedNo(u.returnNo) &&
            getReturnParentSaleAliases(u).some((a) => saleAliases.includes(a))
        );
        if (existingBackendIdx !== -1) {
          const existing = unifiedList[existingBackendIdx];
          const incomingDetails = [
            item.returnDetails,
            item.salesReturnDetails,
            item.salesDetails,
            item.details,
            item.items,
          ].find((lines) => Array.isArray(lines) && lines.length > 0);
          if (incomingDetails && incomingDetails.length > 0 && (!existing.returnDetails || existing.returnDetails.length === 0)) {
            existing.returnDetails = incomingDetails;
            existing.details = incomingDetails;
          }
          return;
        }
      }

      if (isBackend && saleAliases.length > 0) {
        saleAliases.forEach((a) => backendReturnAliases.add(a));
      }

      let normalized: UnifiedTradeRecord | null = null;
      if (!seenReturnKeys.has(rKey)) {
        seenReturnKeys.add(rKey);
        const explicitReturnDetails = [
          item.returnDetails,
          item.salesReturnDetails,
          item.return_details,
          item.sales_return_details,
          item.returnedItems,
          item.returned_items,
          item.details,
          item.items,
          item.products,
        ].find((lines) => Array.isArray(lines) && lines.length > 0);
        const hasSeparateSaleLines = [
          item.salesDetails,
          item.saleDetails,
        ].some((lines) => Array.isArray(lines) && lines.length > 0);
        const returnDetails =
          explicitReturnDetails ||
          (!hasSeparateSaleLines ? extractLineItems(item) : []);
        normalized = normalizeSaleRecord(item) as UnifiedTradeRecord;
        normalized.isReturnRecord = true;
        normalized.hasReturn = true;
        if (rNo && !normalized.returnNo) {
          normalized.returnNo = rNo;
        }
        normalized.grandTotal = Number(item.returnGrandTotal ?? item.grandTotal ?? item.returnTotalAmount ?? item.totalAmount ?? item.refundAmount ?? 0);
        normalized.refundAmount = Number(item.returnRefundAmount ?? item.refundAmount ?? normalized.grandTotal);
        normalized.totalAmount = Number(item.returnTotalAmount ?? normalized.grandTotal);
        normalized.returnDate = item.returnDate || item.return_date || item.salesDate || item.saleDate || moment().format("YYYY-MM-DD");
        normalized.returnDetails = returnDetails;
        normalized.details = returnDetails;
        normalized.salesDetails = [];
        unifiedList.push(normalized);

        // ONLY index returned invoice aliases if this return genuinely has parent sale aliases!
        if (saleAliases.length > 0) {
          saleAliases.forEach((a) => returnedInvoices.add(a));
        }
      }

      // Check if original sale already exists (ONLY if genuine parent sale aliases exist)
      let existingIdx = -1;
      if (saleAliases.length > 0) {
        for (const a of saleAliases) {
          if (aliasToSaleIdx.has(a)) {
            existingIdx = aliasToSaleIdx.get(a)!;
            break;
          }
        }
      }

      if (existingIdx !== -1) {
        // Original sale already exists! DO NOT create a synthetic duplicate!
        unifiedList[existingIdx].hasReturn = true;
        saleAliases.forEach((a) => aliasToSaleIdx.set(a, existingIdx));
        const parentSale = unifiedList[existingIdx];
        if (normalized) {
          if (parentSale.orderNo && (!normalized.orderNo || isBackendGeneratedNo(normalized.orderNo))) {
            normalized.orderNo = parentSale.orderNo;
          }
          if (!normalized.customerPhone && parentSale.customerPhone) {
            normalized.customerPhone = parentSale.customerPhone;
          }
          if ((!normalized.customerName || normalized.customerName === "Customer") && parentSale.customerName) {
            normalized.customerName = parentSale.customerName;
          }
          if (!normalized.returnDetails || normalized.returnDetails.length === 0) {
            const parentLines = [
              parentSale.returnDetails,
              parentSale.salesReturnDetails,
              parentSale.salesDetails,
              parentSale.details,
            ].find((lines) => Array.isArray(lines) && lines.length > 0);
            if (parentLines && parentLines.length > 0) {
              normalized.returnDetails = parentLines;
              normalized.details = parentLines;
            }
          }
        }
      }
    };

    // 1. Process items from API (route each item based on isReturnRecord)
    const rawItems = [
      ...sales,
      ...combinedList,
    ];
    rawItems.forEach((d: any, idx: number) => {
      if (isReturnRecord(d)) {
        addReturnRecord(d, idx);
      } else {
        addSaleRecord(d, idx);
      }
    });

    // 2. Process explicit backend returns
    returns.forEach((r: any, idx: number) => addReturnRecord(r, idx));

    // 4. Financial transactions (carries authentic 16-digit backend return numbers like 2611...)
    finTxList.forEach((tx: any, idx: number) => {
      let invNo = "";
      let ordNo = "";
      let custName = "Customer";

      if (tx.notes) {
        const directInvMatch = tx.notes.match(/([0-9]{4,8}-[0-9]{10,25})/);
        if (directInvMatch) {
          invNo = directInvMatch[1].trim();
        }

        const ordMatch = tx.notes.match(/(?:order|ord)\s*(?:no|number)?\s*[:#]?\s*([A-Za-z0-9_-]+)/i);
        if (ordMatch && ordMatch[1] && ordMatch[1].toLowerCase() !== "null" && ordMatch[1].toLowerCase() !== "invoice") {
          ordNo = ordMatch[1].trim();
        }

        if (!invNo) {
          const invMatch =
            tx.notes.match(/(?:return\s+(?:from|for|against)\s+(?:invoice\s+)?|refund\s+(?:for|from)\s+(?:invoice\s+)?|invoice\s*(?:no|number)?\s*[:#]?\s*|inv\s*[:#]?\s*)([A-Za-z0-9_-]+)/i);
          if (invMatch && invMatch[1] && invMatch[1].toLowerCase() !== "invoice" && invMatch[1].toLowerCase() !== "null") {
            invNo = invMatch[1].trim();
          }
        }

        const custMatch = tx.notes.match(/\(([^)]+)\)/);
        if (custMatch && custMatch[1]) {
          custName = custMatch[1].trim();
        }
      }

      if (!invNo && tx.billRef) {
        const refStr = String(tx.billRef).trim();
        if (
          aliasToSaleIdx.has(`sale_inv_${refStr.toLowerCase()}`) ||
          aliasToSaleIdx.has(`sale_ord_${refStr.toLowerCase()}`) ||
          aliasToSaleIdx.has(`sale_id_${refStr.toLowerCase()}`) ||
          /^[0-9]{4,8}-[0-9]{10,25}$/.test(refStr)
        ) {
          invNo = refStr;
        }
      }
      if (!invNo && tx.refNo) {
        const refStr = String(tx.refNo).trim();
        if (
          aliasToSaleIdx.has(`sale_inv_${refStr.toLowerCase()}`) ||
          aliasToSaleIdx.has(`sale_ord_${refStr.toLowerCase()}`) ||
          aliasToSaleIdx.has(`sale_id_${refStr.toLowerCase()}`) ||
          /^[0-9]{4,8}-[0-9]{10,25}$/.test(refStr)
        ) {
          invNo = refStr;
        }
      }

      if (!invNo && !ordNo && !tx.billRef && !tx.refNo) return;

      const cleanOrdNo = getCleanOrderNo(ordNo, invNo);
      const finAliases = [
        cleanOrdNo ? `sale_ord_${cleanOrdNo.toLowerCase()}` : null,
        invNo ? `sale_inv_${invNo.toLowerCase()}` : null,
      ].filter(Boolean) as string[];

      let matchedSale: UnifiedTradeRecord | null = null;
      for (const alias of finAliases) {
        if (aliasToSaleIdx.has(alias)) {
          const sIdx = aliasToSaleIdx.get(alias)!;
          unifiedList[sIdx].hasReturn = true;
          matchedSale = unifiedList[sIdx];
          break;
        }
      }

      // Authentic return voucher with backend-generated return number (e.g. 2611...)
      const returnNo = tx.billRef || tx.refNo || `SR-${invNo || idx}`;
      const retKey = `ret_${String(returnNo).toLowerCase()}`;
      const resolvedOrdNo = matchedSale?.orderNo || cleanOrdNo;

      const saleReturnLines = matchedSale
        ? [
            matchedSale.returnDetails,
            matchedSale.salesReturnDetails,
            (matchedSale as any).return_details,
            (matchedSale as any).sales_return_details,
            (matchedSale as any).returnedItems,
            (matchedSale as any).returned_items,
          ].find((lines) => Array.isArray(lines) && lines.length > 0)
        : null;

      const saleLines = matchedSale
        ? [
            matchedSale.salesDetails,
            matchedSale.saleDetails,
            matchedSale.details,
            (matchedSale as any).saleDetailsList,
            (matchedSale as any).items,
            (matchedSale as any).products,
          ].find((lines) => Array.isArray(lines) && lines.length > 0)
        : null;

      let inheritedLines = saleReturnLines || saleLines || [];
      const txAmt = Number(tx.amount || 0);
      if (inheritedLines.length > 0 && txAmt > 0) {
        const exactMatch = inheritedLines.find((l: any) =>
          Math.abs(Number(l.total ?? l.price ?? l.unitPrice ?? 0) - txAmt) < 0.01
        );
        if (exactMatch) {
          inheritedLines = [exactMatch];
        }
      }

      const reconstructedReturn: UnifiedTradeRecord = {
        id: `ret_fin_${tx.id || tx.billRef || idx}`,
        returnNo,
        orderNo: resolvedOrdNo,
        invoiceNo: matchedSale?.invoiceNo || invNo,
        salesInvoiceNo: matchedSale?.salesInvoiceNo || matchedSale?.invoiceNo || invNo,
        customerName: matchedSale?.customerName || custName,
        customerId: matchedSale?.customerId || 0,
        customerPhone: matchedSale?.customerPhone || "",
        customerAddress: matchedSale?.customerAddress || "",
        returnDate:
          tx.transactionDate ||
          (tx.createdDate ? String(tx.createdDate).split("T")[0] : moment().format("YYYY-MM-DD")),
        createdAt: tx.createdDate || tx.transactionDate,
        grandTotal: Number(tx.amount || 0),
        refundAmount: Number(tx.amount || 0),
        totalAmount: Number(tx.amount || 0),
        paymentType: String(tx.accountType || "CASH").toUpperCase(),
        status: "Completed",
        note: tx.notes || "Sales return refund",
        remarks: tx.notes || "Sales return refund",
        reason: tx.notes || "Sales return refund",
        returnDetails: inheritedLines,
        salesDetails: [],
        details: inheritedLines,
        isReturnRecord: true,
        hasReturn: true,
      };

      // If a synthetic SR- or RET- record was already in unifiedList, replace it with this authentic backend return!
      const existingSyntheticIdx = unifiedList.findIndex(
        (u) =>
          u.isReturnRecord &&
          !isBackendGeneratedNo(u.returnNo) &&
          (getReturnParentSaleAliases(u).some((a) => finAliases.includes(a)) ||
            (resolvedOrdNo && String(u.orderNo || "").toLowerCase() === resolvedOrdNo.toLowerCase()) ||
            (invNo && String(u.invoiceNo || u.salesInvoiceNo || "").toLowerCase() === invNo.toLowerCase()))
      );

      if (existingSyntheticIdx !== -1) {
        const existing = unifiedList[existingSyntheticIdx];
        const existingLines = Array.isArray(existing.returnDetails) && existing.returnDetails.length > 0
          ? existing.returnDetails
          : Array.isArray(existing.details) && existing.details.length > 0
          ? existing.details
          : [];
        if (existingLines.length > 0) {
          reconstructedReturn.returnDetails = existingLines;
          reconstructedReturn.details = existingLines;
        }
        unifiedList[existingSyntheticIdx] = reconstructedReturn;
      } else if (!seenReturnKeys.has(retKey)) {
        seenReturnKeys.add(retKey);
        unifiedList.push(reconstructedReturn);
      }

      finAliases.forEach((a) => backendReturnAliases.add(a));
    });

    // 5. Ensure hasReturn is set on any sale record whose aliases match returnedInvoices
    unifiedList.forEach((rec) => {
      if (!rec.isReturnRecord) {
        const aliases = getSaleAliases(rec);
        if (aliases.some((a) => returnedInvoices.has(a))) {
          rec.hasReturn = true;
        }
      }
    });

    // Fallback: If sales array from /get-sales-and-return was empty, fetch from /get-sale-list
    if (sales.length === 0 && combinedList.length === 0) {
      try {
        const directSales = await fetchSalesList();
        directSales.forEach((s, idx) => addSaleRecord(s, idx));
      } catch (err) {
        console.warn("Fallback to fetchSalesList in fetchSalesAndReturnList failed:", err);
      }
    }

    return unifiedList;
  } catch (error) {
    console.error("Failed to fetch sales and return list:", error);
    return [];
  }
};

/**
 * Standardized hook for Sales List query
 * Shared across Sales page, Create Sale Form, and Customer Collection.
 */
export const useSalesQuery = <TData = SaleItem[]>(
  options?: Omit<UseQueryOptions<SaleItem[], Error, TData>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [salesListQueryKey],
    queryFn: fetchSalesList,
    staleTime: 0,
    ...options,
  });
};

/**
 * Standardized hook for Combined Sales & Returns query
 * Shared across Unified Sales Hub, Sales Return list, and Return Forms.
 */
export const useSalesAndReturnsQuery = <TData = UnifiedTradeRecord[]>(
  options?: Omit<UseQueryOptions<UnifiedTradeRecord[], Error, TData>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [salesAndReturnQueryKey],
    queryFn: fetchSalesAndReturnList,
    staleTime: 0,
    ...options,
  });
};

/**
 * Safely extracts set of returned invoice/order/challan/saleId keys.
 * Accurately indexes both return records and sales flagged with returns.
 */
export const extractReturnedSalesInvoiceKeysSet = (records: any[]): Set<string> => {
  const set = new Set<string>();
  if (!Array.isArray(records)) return set;

  records.forEach((item: any) => {
    if (!item || typeof item !== "object") return;
    const isRet = item?.isReturnRecord === true || isReturnRecord(item);
    const statusUpper = String(item?.status || "").trim().toUpperCase();
    const returnTypeUpper = String(item?.returnType || item?.return_type || item?.returnMode || "").trim().toUpperCase();
    const isStatusReturn =
      statusUpper === "RETURN" ||
      statusUpper === "RETURNED" ||
      statusUpper === "FULL_RETURN" ||
      statusUpper === "FULL RETURN" ||
      statusUpper === "PARTIAL_RETURN" ||
      statusUpper === "PARTIAL RETURN" ||
      returnTypeUpper === "FULL" ||
      returnTypeUpper === "RETURN";
    const hasRet = Boolean(item?.hasReturn || isStatusReturn);

    if (isRet) {
      const retNo = String(item.returnNo || item.return_no || item.salesReturnNo || "").trim().toLowerCase();

      const inv = item.salesInvoiceNo || item.sales_invoice_no || item.invoiceNo || item.invoice_no;
      if (inv && inv !== "-" && inv !== "0" && String(inv).trim().toLowerCase() !== retNo) {
        set.add(String(inv).trim().toLowerCase());
      }

      const ord = item.orderNo || item.order_no;
      if (ord && ord !== "-" && ord !== "0" && String(ord).trim().toLowerCase() !== retNo && !String(ord).trim().toUpperCase().startsWith("SR-")) {
        set.add(String(ord).trim().toLowerCase());
        const cleanOrd = getCleanOrderNo(ord);
        if (cleanOrd) set.add(cleanOrd.toLowerCase());
      }

      const saleId = item.saleId || item.sale_id;
      if (saleId && String(saleId).trim() !== "-" && String(saleId).trim() !== "0") {
        const cleanIdOrd = getCleanOrderNo(undefined, undefined, saleId);
        if (cleanIdOrd) set.add(cleanIdOrd.toLowerCase());
      }

      if (item.challanNo && item.challanNo !== "-") {
        set.add(String(item.challanNo).trim().toLowerCase());
      }
    } else if (hasRet) {
      if (item.salesInvoiceNo && item.salesInvoiceNo !== "-") {
        set.add(String(item.salesInvoiceNo).trim().toLowerCase());
      }
      if (item.invoiceNo && item.invoiceNo !== "-") {
        set.add(String(item.invoiceNo).trim().toLowerCase());
      }
      if (item.orderNo && item.orderNo !== "-") {
        set.add(String(item.orderNo).trim().toLowerCase());
        const cleanOrd = getCleanOrderNo(item.orderNo);
        if (cleanOrd) set.add(cleanOrd.toLowerCase());
      }
      if (item.challanNo && item.challanNo !== "-") {
        set.add(String(item.challanNo).trim().toLowerCase());
      }
      const saleId = item.id || item.saleId || item.sale_id;
      if (saleId && String(saleId).trim() !== "-" && String(saleId).trim() !== "0") {
        set.add(String(saleId).trim().toLowerCase());
        const cleanIdOrd = getCleanOrderNo(undefined, undefined, saleId);
        if (cleanIdOrd) set.add(cleanIdOrd.toLowerCase());
      }
    }
  });

  return set;
};

/**
 * Mutation hook to verify if a sales order can be deleted (/check-sales-delete).
 */
export const useCheckSalesDeleteMutation = () => {
  return useMutation({
    mutationFn: (payload: CheckSalesDeletePayload) => checkSalesDelete(payload),
  });
};

/**
 * Mutation hook to delete a sales order (/delete-sales-order).
 * Automatically invalidates sales, returns, dues, product inventory, and cash balances on success.
 */
export const useDeleteSalesOrderMutation = (options?: {
  onSuccess?: (data: DeleteSalesOrderResponse) => void;
  onError?: (error: any) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DeleteSalesOrderPayload) => deleteSalesOrder(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [salesListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [salesAndReturnQueryKey] });
      queryClient.invalidateQueries({ queryKey: [productListQueryKey], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: [customersDueQueryKey] });
      queryClient.invalidateQueries({ queryKey: [customerInvoicesDueQueryKey] });
      queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey] });
      queryClient.invalidateQueries({ queryKey: [dashboardQueryKey] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
};

export {
  checkSalesDelete,
  deleteSalesOrder,
  validateCheckSalesDeleteResult,
};

export default useSalesQuery;

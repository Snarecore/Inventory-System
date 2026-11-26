import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import moment from "moment";
import {
  purchaseAndReturnQueryKey,
  purchaseListQueryKey,
  productListQueryKey,
  purchasesDueQueryKey,
  purchasesInvoicesDueQueryKey,
} from "@/config/query-key";
import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import { invalidateFinancialBalances } from "@/utils/invalidate-balances";
import {
  checkPurchaseDelete,
  deletePurchaseOrder,
  validateCheckPurchaseDeleteResult,
} from "@/services/purchase-service";
import type {
  PurchaseItem,
  CheckPurchaseDeletePayload,
  CheckPurchaseDeleteResponse,
  DeletePurchaseOrderPayload,
  DeletePurchaseOrderResponse,
} from "@/types";

import { getCleanOrderNo } from "@/pages/admin/trade/sales/hooks/useSalesQueries";

/**
 * Unified Purchase Record interface representing both Purchases and Returns
 * in the Trade domain with strict typing.
 */
export interface UnifiedPurchaseRecord extends PurchaseItem {
  isReturnRecord?: boolean;
  purchaseInvoiceNo?: string;
  returnNo?: string;
  returnGrandTotal?: number;
  returnRefundAmount?: number;
  returnType?: string;
  refNo?: string;
  purchaseReturnDetails?: any[];
  returnDetails?: any[];
}

/**
 * Extracts line items array from arbitrary backend property names.
 */
export const extractPurchaseLineItems = (item: any): any[] => {
  const raw =
    (Array.isArray(item?.purchaseDetails) && item.purchaseDetails.length > 0 ? item.purchaseDetails : null) ||
    (Array.isArray(item?.purchasesDetails) && item.purchasesDetails.length > 0 ? item.purchasesDetails : null) ||
    (Array.isArray(item?.details) && item.details.length > 0 ? item.details : null) ||
    [];
  return raw.map((d: any) => ({
    ...d,
    purchaseDetailId: d.purchaseDetailId ?? d.purchase_detail_id ?? d.detailId ?? d.id,
    detailId: d.detailId ?? d.purchaseDetailId ?? d.purchase_detail_id ?? d.id,
    productId: d.productId ?? d.product_id ?? d.id,
    productCode: d.productCode ?? d.product_code ?? d.pcode ?? d.code ?? "",
    productName: d.productName ?? d.name ?? "Product",
  }));
};

/**
 * Single source of truth for normalizing purchase record numeric fields and line items.
 */
export const normalizePurchaseRecord = (item: any): PurchaseItem => {
  const lineItems = extractPurchaseLineItems(item);
  const grandTotal = Number(item?.grandTotal ?? item?.grand_total ?? item?.totalAmount ?? 0);
  const paidAmount = Number(item?.paidAmount ?? item?.paid_amount ?? 0);
  const dueAmount = Number(item?.dueAmount ?? item?.due_amount ?? 0);
  const supplierId = item?.supplierId ?? item?.supplier_id;
  const supplierName =
    item?.supplierName ||
    item?.supplier_name ||
    "Direct Supplier";
  const supplierPhone =
    item?.supplierPhone ||
    item?.supplier_phone ||
    "";
  const supplierAddress =
    item?.supplierAddress ||
    item?.supplier_address ||
    "";
  // Strict check for hasReturn:
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
    (Array.isArray(item?.purchaseReturnDetails) && item.purchaseReturnDetails.length > 0);

  const hasReturn = Boolean(
    isExplicitlyTrue ||
    validReturnNo ||
    validReturn_no ||
    hasReturnDetails
  );

  const cleanOrderNo = getCleanOrderNo(
    item?.orderNo || item?.order_no,
    item?.invoiceNo || item?.purchaseInvoiceNo || item?.invoice_no,
    item?.id || item?.purchaseId
  );

  return {
    ...item,
    orderNo: cleanOrderNo,
    supplierId,
    supplierName,
    supplierPhone,
    supplierAddress,
    grandTotal,
    paidAmount,
    dueAmount,
    hasReturn,
    purchaseDetails: lineItems,
    details: lineItems,
  };
};

/**
 * Determines if an arbitrary item represents a purchase return record.
 * A purchase record with line items and invoice/order must NEVER be classified as a return voucher.
 */
export const isPurchaseReturnRecord = (item: any): boolean => {
  if (!item) return false;
  if (item.isReturnRecord === true) return true;
  if (item.isReturnRecord === false) return false;

  const lineItems = extractPurchaseLineItems(item);
  const hasPurchaseLines = lineItems.length > 0;

  // A purchase invoice is ALWAYS a purchase record, even if it has returned items attached
  if (hasPurchaseLines && (item.invoiceNo || item.purchaseInvoiceNo || item.orderNo || item.challanNo)) return false;
  if (item.invoiceNo && item.purchaseDate && !item.returnNo?.startsWith?.("PR-")) return false;

  const hasReturnLines =
    (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
    (Array.isArray(item.purchaseReturnDetails) && item.purchaseReturnDetails.length > 0);

  return (
    (typeof item.refNo === "string" && item.refNo.startsWith("PR-")) ||
    (typeof item.returnNo === "string" && !item.invoiceNo && !item.purchaseDate) ||
    String(item.returnType || "").toUpperCase() === "RETURN" ||
    (String(item.status || "").toUpperCase() === "RETURN" && !item.invoiceNo) ||
    (hasReturnLines && !hasPurchaseLines)
  );
};

/**
 * Standardized fetcher for all purchase records.
 * Single source of truth for purchases list query across the entire app.
 */
export const fetchPurchasesList = async (): Promise<PurchaseItem[]> => {
  try {
    const accessUser = buildAccessUser();
    const endpoint = apiConfig.purchase.purchaseListUrl;
    const res: any = await postData({
      url: endpoint,
      body: { accessUser },
    });

    const list =
      (Array.isArray(res?.data) ? res.data : null) ||
      res?.purchaseList ||
      res?.purchasesList ||
      res?.purchases ||
      [];

    return (Array.isArray(list) ? list : []).map(normalizePurchaseRecord);
  } catch (error) {
    console.error("Failed to fetch purchases list:", error);
    return [];
  }
};

/**
 * Standardized fetcher for combined purchase and return records.
 * Single source of truth for combined purchase and return query.
 * Preserves every purchase in purchasesList while also extracting return vouchers for returnsList.
 */
export const fetchPurchaseAndReturnList = async (): Promise<UnifiedPurchaseRecord[]> => {
  try {
    const accessUser = buildAccessUser();
    const endpoint = apiConfig.purchaseReturn.getPurchaseAndReturnListUrl;

    const [purchaseAndReturnRes, finTxRes] = await Promise.allSettled([
      postData({
        url: endpoint,
        body: { accessUser },
      }),
      postData({
        url: apiConfig.finance.getFinancialTransactionUrl,
        body: { accessUser, startDate: "", endDate: "", type: "INCOME" },
      }),
    ]);

    const res: any = purchaseAndReturnRes.status === "fulfilled" ? purchaseAndReturnRes.value : null;
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
              (t.head === "Purchase Return" || String(t.notes || "").toLowerCase().includes("purchase return")) &&
              (!t.notes || !t.notes.includes("Auto Purchase Return")) &&
              !(t.refNo && t.billRef && String(t.refNo).trim() === String(t.billRef).trim())
          );


    const purchases = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.purchaseList)
      ? res.purchaseList
      : Array.isArray(res?.purchasesList)
      ? res.purchasesList
      : Array.isArray(res?.purchases)
      ? res.purchases
      : [];

    const returns = Array.isArray(res?.returns)
      ? res.returns
      : Array.isArray(res?.returnList)
      ? res.returnList
      : Array.isArray(res?.purchaseReturnList)
      ? res.purchaseReturnList
      : [];

    const combinedList = Array.isArray(res?.purchaseAndReturnList)
      ? res.purchaseAndReturnList
      : Array.isArray(res)
      ? res
      : [];

    // Deduplicate into unified records array with multi-alias indexing to avoid duplicate purchases
    const seenReturnKeys = new Set<string>();
    const returnedInvoices = new Set<string>();
    const backendReturnAliases = new Set<string>();
    const unifiedList: UnifiedPurchaseRecord[] = [];
    const aliasToPurIdx = new Map<string, number>();

    const getPurchaseAliases = (item: any): string[] => {
      if (!item) return [];
      const invNo = item.purchaseInvoiceNo || item.invoiceNo || item.purchase_invoice_no || item.invoice_no;
      const chnNo = item.challanNo || item.challan_no;
      const ordNo = item.orderNo || item.order_no;
      const pId = item.id || item.purchaseId || item.purchase_id;
      const cleanOrd = getCleanOrderNo(ordNo, invNo, pId);

      const isBusinessCode = String(pId).trim() === "28488" || String(ordNo).trim() === "28488";
      return [
        cleanOrd ? `pur_ord_${cleanOrd.toLowerCase()}` : null,
        ordNo && !isBusinessCode ? `pur_ord_${String(ordNo).trim().toLowerCase()}` : null,
        invNo ? `pur_inv_${String(invNo).trim().toLowerCase()}` : null,
        chnNo ? `pur_chn_${String(chnNo).trim().toLowerCase()}` : null,
        pId && !isBusinessCode ? `pur_id_${String(pId).trim().toLowerCase()}` : null,
      ].filter(Boolean) as string[];
    };

    const addPurchaseRecord = (item: any, fallbackIdx: number) => {
      if (!item) return;
      const aliases = getPurchaseAliases(item);
      const cleanOrd = getCleanOrderNo(item.orderNo, item.invoiceNo || item.purchaseInvoiceNo, item.id || item.purchaseId);

      const hasReturnInfo = Boolean(
        item.hasReturn ||
        item.returnNo ||
        item.return_no ||
        (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
        (Array.isArray(item.purchaseReturnDetails) && item.purchaseReturnDetails.length > 0) ||
        (Array.isArray(item.returns) && item.returns.length > 0)
      );

      let existingIdx = -1;
      for (const a of aliases) {
        if (aliasToPurIdx.has(a)) {
          const candidateIdx = aliasToPurIdx.get(a)!;
          const candidate = unifiedList[candidateIdx];
          const candInv = candidate?.purchaseInvoiceNo || candidate?.invoiceNo;
          const itemInv = item?.purchaseInvoiceNo || item?.invoiceNo;
          if (candInv && itemInv && cleanKey(candInv) !== cleanKey(itemInv)) {
            // Distinct purchase invoices must never overwrite each other
            continue;
          }
          existingIdx = candidateIdx;
          break;
        }
      }

      if (existingIdx === -1) {
        const normalized = normalizePurchaseRecord(item) as UnifiedPurchaseRecord;
        normalized.isReturnRecord = false;
        normalized.hasReturn = hasReturnInfo;
        const newIdx = unifiedList.length;
        unifiedList.push(normalized);
        aliases.forEach((a) => aliasToPurIdx.set(a, newIdx));
      } else {
        const existing = unifiedList[existingIdx];
        const existingDetails = Array.isArray(existing.purchaseDetails) && existing.purchaseDetails.length > 0
          ? existing.purchaseDetails
          : existing.details || [];
        const newDetails = extractPurchaseLineItems(item);
        const bestDetails = existingDetails.length >= newDetails.length ? existingDetails : newDetails;

        unifiedList[existingIdx] = {
          ...existing,
          ...item,
          orderNo: cleanOrd || existing.orderNo || item.orderNo,
          hasReturn: Boolean(existing.hasReturn || hasReturnInfo),
          grandTotal: existing.grandTotal || Number(item.grandTotal ?? 0),
          paidAmount: existing.paidAmount || Number(item.paidAmount ?? 0),
          purchaseDetails: bestDetails,
          details: bestDetails,
          isReturnRecord: false,
        };
        aliases.forEach((a) => aliasToPurIdx.set(a, existingIdx));
      }

      if (hasReturnInfo) {
        aliases.forEach((a) => returnedInvoices.add(a));

        // Update any previously added return record in unifiedList that matches this purchase
        unifiedList.forEach((u) => {
          if (u.isReturnRecord) {
            const uAliases = getPurchaseAliases(u);
            if (uAliases.some((a) => aliases.includes(a))) {
              if (cleanOrd && (!u.orderNo || isBackendGeneratedNo(u.orderNo))) {
                u.orderNo = cleanOrd;
              }
              if (!u.supplierPhone && item.supplierPhone) {
                u.supplierPhone = item.supplierPhone;
              }
              if ((!u.supplierName || u.supplierName === "Supplier") && item.supplierName) {
                u.supplierName = item.supplierName;
              }
              if (!u.returnDetails || u.returnDetails.length === 0) {
                const purLines = [
                  item.returnDetails,
                  item.purchaseReturnDetails,
                  item.purchaseDetails,
                  item.details,
                ].find((lines) => Array.isArray(lines) && lines.length > 0);
                if (purLines && purLines.length > 0) {
                  u.returnDetails = purLines;
                  u.details = purLines;
                }
              }
            }
          }
        });

        // Extract nested return records
        const nestedReturns = [
          ...(Array.isArray(item.returns) ? item.returns : []),
          ...(Array.isArray(item.purchaseReturns) ? item.purchaseReturns : []),
        ];

        if (nestedReturns.length > 0) {
          nestedReturns.forEach((r: any, rIdx: number) => {
            if (!r || typeof r !== "object") return;
            const rNo = r.returnNo || r.return_no || (item.orderNo ? `PR-${item.orderNo}-${rIdx + 1}` : `PR-${item.id || fallbackIdx}`);
            const rKey = `ret_${rNo}`;
            if (!seenReturnKeys.has(rKey)) {
              seenReturnKeys.add(rKey);
              const rDetails = Array.isArray(r.returnDetails)
                ? r.returnDetails
                : Array.isArray(r.purchaseReturnDetails)
                ? r.purchaseReturnDetails
                : Array.isArray(r.details)
                ? r.details
                : [];
              const retRecord: UnifiedPurchaseRecord = {
                ...normalizePurchaseRecord({ ...item, ...r }),
                id: r.id || r.returnId || `${item.id}_ret_${rIdx}`,
                returnNo: rNo,
                purchaseInvoiceNo: item.purchaseInvoiceNo || item.invoiceNo || item.orderNo || "",
                invoiceNo: item.invoiceNo || item.purchaseInvoiceNo || "",
                orderNo: r.orderNo || item.orderNo || "",
                challanNo: r.challanNo || item.challanNo || "",
                returnDate: r.returnDate || r.return_date || item.purchaseDate || moment().format("YYYY-MM-DD"),
                grandTotal: Number(r.returnGrandTotal ?? r.grandTotal ?? r.totalAmount ?? 0),
                refundAmount: Number(r.returnRefundAmount ?? r.refundAmount ?? r.returnGrandTotal ?? r.grandTotal ?? 0),
                totalAmount: Number(r.totalAmount ?? r.returnTotalAmount ?? r.returnGrandTotal ?? 0),
                returnDetails: rDetails,
                purchaseDetails: [],
                details: rDetails,
                isReturnRecord: true,
                hasReturn: true,
              };
              unifiedList.push(retRecord);
            }
          });
        }
      }
    };

    const isBackendGeneratedNo = (no?: string): boolean => {
      if (!no) return false;
      const clean = String(no).trim().toUpperCase();
      return (
        clean.length > 0 &&
        !clean.startsWith("PR-") &&
        !clean.startsWith("RET_") &&
        !clean.startsWith("RET-") &&
        !clean.startsWith("PR_")
      );
    };

    const addReturnRecord = (item: any, fallbackIdx: number) => {
      if (!item) return;
      const rNo = String(item.returnNo || item.return_no || item.purchaseReturnNo || item.id || `ret_idx_${fallbackIdx}`).trim();
      const rKey = `ret_${rNo.toLowerCase()}`;
      const purAliases = getPurchaseAliases(item);
      const isBackend = isBackendGeneratedNo(rNo);

      // If this is synthetic, drop it if backend already has this return!
      if (!isBackend) {
        const hasBackend = purAliases.some((a) => backendReturnAliases.has(a));
        if (hasBackend) {
          return;
        }
      }

      if (isBackend) {
        purAliases.forEach((a) => backendReturnAliases.add(a));

        // If a synthetic PR- record was already added earlier for this purchase, remove it!
        const existingSyntheticIdx = unifiedList.findIndex(
          (u) =>
            u.isReturnRecord &&
            !isBackendGeneratedNo(u.returnNo) &&
            getPurchaseAliases(u).some((a) => purAliases.includes(a))
        );
        if (existingSyntheticIdx !== -1) {
          unifiedList.splice(existingSyntheticIdx, 1);
        }
      }

      let normalized: UnifiedPurchaseRecord | null = null;
      if (!seenReturnKeys.has(rKey)) {
        seenReturnKeys.add(rKey);
        const explicitReturnDetails = [
          item.returnDetails,
          item.purchaseReturnDetails,
          item.return_details,
          item.purchase_return_details,
          item.returnedItems,
          item.returned_items,
          item.details,
          item.items,
          item.products,
        ].find((lines) => Array.isArray(lines) && lines.length > 0);
        const hasSeparatePurchaseLines = [
          item.purchaseDetails,
          item.details,
        ].some((lines) => Array.isArray(lines) && lines.length > 0);
        const returnDetails =
          explicitReturnDetails ||
          (!hasSeparatePurchaseLines ? extractPurchaseLineItems(item) : []);

        normalized = normalizePurchaseRecord(item) as UnifiedPurchaseRecord;
        normalized.isReturnRecord = true;
        normalized.hasReturn = true;
        if (rNo && !normalized.returnNo) {
          normalized.returnNo = rNo;
        }
        normalized.returnDetails = returnDetails;
        normalized.details = returnDetails;
        normalized.purchaseDetails = [];
        unifiedList.push(normalized);

        purAliases.forEach((a) => returnedInvoices.add(a));
      }

      // Check if original purchase already exists
      const purAliasesForCheck = getPurchaseAliases(item);
      let existingIdx = -1;
      for (const a of purAliasesForCheck) {
        if (aliasToPurIdx.has(a)) {
          existingIdx = aliasToPurIdx.get(a)!;
          break;
        }
      }

      if (existingIdx !== -1) {
        // Original purchase already exists! DO NOT create a synthetic duplicate!
        unifiedList[existingIdx].hasReturn = true;
        purAliasesForCheck.forEach((a) => aliasToPurIdx.set(a, existingIdx));
        const parentPurchase = unifiedList[existingIdx];
        if (normalized) {
          if (parentPurchase.orderNo && (!normalized.orderNo || isBackendGeneratedNo(normalized.orderNo))) {
            normalized.orderNo = parentPurchase.orderNo;
          }
          if (!normalized.supplierPhone && parentPurchase.supplierPhone) {
            normalized.supplierPhone = parentPurchase.supplierPhone;
          }
          if ((!normalized.supplierName || normalized.supplierName === "Supplier") && parentPurchase.supplierName) {
            normalized.supplierName = parentPurchase.supplierName;
          }
          if (!normalized.returnDetails || normalized.returnDetails.length === 0) {
            const parentLines = [
              parentPurchase.returnDetails,
              parentPurchase.purchaseReturnDetails,
              parentPurchase.purchaseDetails,
              parentPurchase.details,
            ].find((lines) => Array.isArray(lines) && lines.length > 0);
            if (parentLines && parentLines.length > 0) {
              normalized.returnDetails = parentLines;
              normalized.details = parentLines;
            }
          }
        }
      }
    };

    // 1. Process actual purchases first!
    purchases.forEach((p: any, idx: number) => addPurchaseRecord(p, idx));

    // 2. Process combinedList (actual purchases / returns from API)
    combinedList.forEach((d: any, idx: number) => {
      if (isPurchaseReturnRecord(d)) {
        addReturnRecord(d, idx);
      } else {
        addPurchaseRecord(d, idx);
      }
    });

    // 3. Process backend returns first
    returns.forEach((r: any, idx: number) => addReturnRecord(r, idx));

    // 4. Financial transactions (carries authentic 16-digit backend return numbers like 2611161438531964)
    finTxList.forEach((tx: any, idx: number) => {
      let invNo = "";
      let ordNo = "";
      let supName = "Supplier";

      if (tx.notes) {
        const ordMatch = tx.notes.match(/(?:order|order\s*#|ord\s*#?)\s*[:#]?\s*([A-Za-z0-9_-]+)/i);
        if (ordMatch && ordMatch[1]) {
          ordNo = ordMatch[1].trim();
        }
        const invMatch = tx.notes.match(/(?:invoice|inv|from|supplier)\s*[:#]?\s*([A-Za-z0-9_-]+)/i);
        if (invMatch && invMatch[1]) {
          invNo = invMatch[1].trim();
        }
        const supMatch = tx.notes.match(/\(([^)]+)\)/);
        if (supMatch && supMatch[1]) {
          supName = supMatch[1].trim();
        }
      }

      if (!invNo && tx.billRef && !isBackendGeneratedNo(tx.billRef)) {
        invNo = String(tx.billRef).trim();
      }
      if (!invNo && tx.refNo && !isBackendGeneratedNo(tx.refNo)) {
        invNo = String(tx.refNo).trim();
      }

      if (!invNo && !ordNo && !tx.billRef && !tx.refNo) return;

      const cleanOrdNo = getCleanOrderNo(ordNo, invNo);
      const finAliases = [
        cleanOrdNo ? `pur_ord_${cleanOrdNo.toLowerCase()}` : null,
        invNo ? `pur_inv_${invNo.toLowerCase()}` : null,
      ].filter(Boolean) as string[];

      let matchedPurchase: UnifiedPurchaseRecord | null = null;
      for (const alias of finAliases) {
        if (aliasToPurIdx.has(alias)) {
          const pIdx = aliasToPurIdx.get(alias)!;
          unifiedList[pIdx].hasReturn = true;
          matchedPurchase = unifiedList[pIdx];
          break;
        }
      }

      // We do NOT match purchases to returns solely by supplier name!
      // A supplier can have multiple purchases, and an old refund must never mark new purchases as returned.

      // Authentic return voucher with backend-generated return number (e.g. 2611161438531964)
      const returnNo = tx.billRef || tx.refNo || `PR-${invNo || idx}`;
      const retKey = `ret_${String(returnNo).toLowerCase()}`;
      const resolvedOrdNo = matchedPurchase?.orderNo || cleanOrdNo;

      const purReturnLines = matchedPurchase
        ? [
            matchedPurchase.returnDetails,
            matchedPurchase.purchaseReturnDetails,
            (matchedPurchase as any).return_details,
            (matchedPurchase as any).purchase_return_details,
            (matchedPurchase as any).returnedItems,
            (matchedPurchase as any).returned_items,
          ].find((lines) => Array.isArray(lines) && lines.length > 0)
        : null;

      const purLines = matchedPurchase
        ? [
            matchedPurchase.purchaseDetails,
            matchedPurchase.details,
            (matchedPurchase as any).items,
            (matchedPurchase as any).products,
          ].find((lines) => Array.isArray(lines) && lines.length > 0)
        : null;

      const inheritedLines = purReturnLines || purLines || [];

      const reconstructedReturn: UnifiedPurchaseRecord = {
        id: `ret_fin_${tx.id || tx.billRef || idx}`,
        returnNo,
        orderNo: resolvedOrdNo,
        invoiceNo: matchedPurchase?.invoiceNo || invNo,
        purchaseInvoiceNo: matchedPurchase?.purchaseInvoiceNo || matchedPurchase?.invoiceNo || invNo,
        challanNo: matchedPurchase?.challanNo || "",
        supplierName: matchedPurchase?.supplierName || supName,
        supplierId: matchedPurchase?.supplierId || 0,
        supplierPhone: matchedPurchase?.supplierPhone || "",
        supplierAddress: matchedPurchase?.supplierAddress || "",
        returnDate:
          tx.transactionDate ||
          (tx.createdDate ? String(tx.createdDate).split("T")[0] : moment().format("YYYY-MM-DD")),
        createdAt: tx.createdDate || tx.transactionDate,
        grandTotal: Number(tx.amount || 0),
        refundAmount: Number(tx.amount || 0),
        totalAmount: Number(tx.amount || 0),
        paymentType: String(tx.accountType || "CASH").toUpperCase(),
        status: "Completed",
        note: tx.notes || "Purchase return refund",
        remarks: tx.notes || "Purchase return refund",
        returnDetails: inheritedLines,
        purchaseDetails: [],
        details: inheritedLines,
        isReturnRecord: true,
        hasReturn: true,
      };

      // If a synthetic PR- record was already in unifiedList, replace it with this authentic backend return!
      const existingSyntheticIdx = unifiedList.findIndex(
        (u) =>
          u.isReturnRecord &&
          !isBackendGeneratedNo(u.returnNo) &&
          (getPurchaseAliases(u).some((a) => finAliases.includes(a)) ||
            (resolvedOrdNo && String(u.orderNo || "").toLowerCase() === resolvedOrdNo.toLowerCase()) ||
            (invNo && String(u.invoiceNo || u.purchaseInvoiceNo || "").toLowerCase() === invNo.toLowerCase()))
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

    // 5. Ensure hasReturn is set on any purchase record whose aliases match returnedInvoices
    unifiedList.forEach((rec) => {
      if (!rec.isReturnRecord) {
        const aliases = getPurchaseAliases(rec);
        if (aliases.some((a) => returnedInvoices.has(a))) {
          rec.hasReturn = true;
        }
      }
    });

    // Fallback: If purchases array from /get-purchase-and-return was empty, fetch from /get-purchase-list
    if (purchases.length === 0 && combinedList.length === 0) {
      try {
        const directPurchases = await fetchPurchasesList();
        directPurchases.forEach((p, idx) => addPurchaseRecord(p, idx));
      } catch (err) {
        console.warn("Fallback to fetchPurchasesList in fetchPurchaseAndReturnList failed:", err);
      }
    }

    return unifiedList;
  } catch (error) {
    console.error("Failed to fetch purchase and return list:", error);
    return [];
  }
};

/**
 * Standardized hook for purchase list
 * Shared across Purchases page, Purchase Return list, Purchase tab, and Create Form.
 */
export const usePurchasesQuery = <TData = PurchaseItem[]>(
  options?: Omit<UseQueryOptions<PurchaseItem[], Error, TData>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [purchaseListQueryKey],
    queryFn: fetchPurchasesList,
    ...options,
  });
};

/**
 * Standardized hook for combined purchase and return list
 * Shared across Purchase Return list, Purchases page, and Create Form.
 */
export const usePurchaseAndReturnsQuery = <TData = UnifiedPurchaseRecord[]>(
  options?: Omit<UseQueryOptions<UnifiedPurchaseRecord[], Error, TData>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [purchaseAndReturnQueryKey],
    queryFn: fetchPurchaseAndReturnList,
    ...options,
  });
};

/**
 * Safely extracts set of returned invoice/order/challan/purchaseId keys.
 * Note: Never indexes return record id (item.id) to prevent collisions with purchase.id.
 */
export const extractReturnedPurchaseKeysSet = (records: any[]): Set<string> => {
  const set = new Set<string>();
  if (!Array.isArray(records)) return set;

  records.forEach((item: any) => {
    if (!item || typeof item !== "object") return;

    const isRet =
      isPurchaseReturnRecord(item) ||
      Boolean(item.hasReturn) ||
      Boolean(item.returnNo || item.return_no) ||
      (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
      (Array.isArray(item.purchaseReturnDetails) && item.purchaseReturnDetails.length > 0) ||
      (Array.isArray(item.returns) && item.returns.length > 0);

    if (isRet) {
      const inv = item.purchaseInvoiceNo || item.purchase_invoice_no || item.invoiceNo || item.invoice_no;
      if (inv && inv !== "-") {
        set.add(String(inv).trim().toLowerCase());
      }
      const ord = item.orderNo || item.order_no;
      if (ord) {
        set.add(String(ord).trim().toLowerCase());
        const cleanOrd = getCleanOrderNo(ord, inv, item.purchaseId || item.purchase_id);
        if (cleanOrd) set.add(cleanOrd.toLowerCase());
      }
      const chn = item.challanNo || item.challan_no;
      if (chn) {
        set.add(String(chn).trim().toLowerCase());
      }
      const pId = item.purchaseId || item.purchase_id;
      if (pId) {
        set.add(String(pId).trim().toLowerCase());
      }
    }
  });

  return set;
};

/** Backward compatibility alias */
export const extractReturnedInvoiceKeysSet = extractReturnedPurchaseKeysSet;

/**
 * Mutation hook to verify if a purchase order can be deleted (/check-purchase-delete).
 */
export const useCheckPurchaseDeleteMutation = () => {
  return useMutation({
    mutationFn: (payload: CheckPurchaseDeletePayload) => checkPurchaseDelete(payload),
  });
};

/**
 * Mutation hook to delete a purchase order (/delete-purchase-order).
 * Automatically invalidates purchases, purchase-returns, dues, inventory, and cash balances on success.
 */
export const useDeletePurchaseOrderMutation = (options?: {
  onSuccess?: (data: DeletePurchaseOrderResponse) => void;
  onError?: (error: any) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DeletePurchaseOrderPayload) => deletePurchaseOrder(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [purchaseListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [purchaseAndReturnQueryKey] });
      queryClient.invalidateQueries({ queryKey: [productListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [purchasesDueQueryKey] });
      queryClient.invalidateQueries({ queryKey: [purchasesInvoicesDueQueryKey] });
      invalidateFinancialBalances();
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
};

export {
  checkPurchaseDelete,
  deletePurchaseOrder,
  validateCheckPurchaseDeleteResult,
};

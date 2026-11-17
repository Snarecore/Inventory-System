import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import moment from "moment";
import {
  purchaseAndReturnQueryKey,
  purchaseListQueryKey,
  productListQueryKey,
  purchasesDueQueryKey,
  purchasesInvoicesDueQueryKey,
  cashBalanceQueryKey,
  dashboardQueryKey,
} from "@/config/query-key";
import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
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
    (Array.isArray(item?.details) && item.details.length > 0 ? item.details : null) ||
    [];
  return raw.map((d: any) => ({
    ...d,
    productId: d.productId ?? d.product_id ?? d.id,
    productCode: d.productCode ?? d.pcode ?? "",
    productName: d.productName ?? d.name ?? "",
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
  const hasReturn = Boolean(
    item?.hasReturn ||
    item?.returnNo ||
    (Array.isArray(item?.returnDetails) && item.returnDetails.length > 0) ||
    (Array.isArray(item?.purchaseReturnDetails) && item.purchaseReturnDetails.length > 0)
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
    const finTxList: any[] =
      finTxRes.status === "fulfilled"
        ? (Array.isArray(finTxRes.value?.data)
            ? finTxRes.value.data
            : Array.isArray(finTxRes.value?.financialTransactionList)
            ? finTxRes.value.financialTransactionList
            : Array.isArray(finTxRes.value)
            ? finTxRes.value
            : []
          ).filter(
            (t: any) =>
              t &&
              t.isDeleted !== "Y" &&
              (t.head === "Purchase Return" || String(t.notes || "").toLowerCase().includes("purchase return")) &&
              (!t.notes || !t.notes.includes("Auto Purchase Return")) &&
              !(t.refNo && t.billRef && String(t.refNo).trim() === String(t.billRef).trim()) &&
              !(t.refNo && String(t.refNo).startsWith("261111"))
          )
        : [];


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

      return [
        cleanOrd ? `pur_ord_${cleanOrd.toLowerCase()}` : null,
        ordNo ? `pur_ord_${String(ordNo).trim().toLowerCase()}` : null,
        invNo ? `pur_inv_${String(invNo).trim().toLowerCase()}` : null,
        chnNo ? `pur_chn_${String(chnNo).trim().toLowerCase()}` : null,
        pId ? `pur_id_${String(pId).trim().toLowerCase()}` : null,
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
          existingIdx = aliasToPurIdx.get(a)!;
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

      if (!seenReturnKeys.has(rKey)) {
        seenReturnKeys.add(rKey);
        const normalized = normalizePurchaseRecord(item) as UnifiedPurchaseRecord;
        normalized.isReturnRecord = true;
        normalized.hasReturn = true;
        if (rNo && !normalized.returnNo) {
          normalized.returnNo = rNo;
        }
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
        const ordMatch = tx.notes.match(/(?:order|order\s*#|ord\s*#?)\s*([A-Za-z0-9_-]+)/i);
        if (ordMatch && ordMatch[1]) {
          ordNo = ordMatch[1].trim();
        }
        const invMatch = tx.notes.match(/(?:invoice|from|supplier)\s+([A-Za-z0-9_-]+)/i);
        if (invMatch && invMatch[1]) {
          invNo = invMatch[1].trim();
        }
        const supMatch = tx.notes.match(/\(([^)]+)\)/);
        if (supMatch && supMatch[1]) {
          supName = supMatch[1].trim();
        }
      }

      if (!invNo && tx.refNo && !tx.refNo.startsWith("261111") && !tx.refNo.startsWith("PR-")) {
        invNo = String(tx.refNo).trim();
      }
      if (!invNo && tx.refNo) {
        invNo = String(tx.refNo).trim();
      }
      if (!invNo && tx.billRef) {
        invNo = String(tx.billRef).trim();
      }

      if (!invNo && !ordNo) return;

      const cleanOrdNo = getCleanOrderNo(ordNo, invNo);
      const finAliases = [
        cleanOrdNo ? `pur_ord_${cleanOrdNo.toLowerCase()}` : null,
        invNo ? `pur_inv_${invNo.toLowerCase()}` : null,
      ].filter(Boolean) as string[];

      for (const alias of finAliases) {
        if (aliasToPurIdx.has(alias)) {
          const pIdx = aliasToPurIdx.get(alias)!;
          unifiedList[pIdx].hasReturn = true;
          break;
        }
      }

      // Authentic return voucher with backend-generated return number (e.g. 2611161438531964)
      const returnNo = tx.billRef || `PR-${invNo}`;
      const retKey = `ret_${String(returnNo).toLowerCase()}`;
      const resolvedOrdNo = cleanOrdNo;

      const reconstructedReturn: UnifiedPurchaseRecord = {
        id: `ret_fin_${tx.id || tx.billRef || idx}`,
        returnNo,
        orderNo: resolvedOrdNo,
        invoiceNo: invNo,
        purchaseInvoiceNo: invNo,
        challanNo: "",
        supplierName: supName,
        supplierId: 0,
        supplierPhone: "",
        supplierAddress: "",
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
        returnDetails: [],
        purchaseDetails: [],
        details: [],
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
        if (Array.isArray(existing.returnDetails) && existing.returnDetails.length > 0) {
          reconstructedReturn.returnDetails = existing.returnDetails;
          reconstructedReturn.details = existing.returnDetails;
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
    staleTime: 0,
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
    staleTime: 0,
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
        const cleanOrd = getCleanOrderNo(ord, inv, item.id || item.purchaseId);
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
  checkPurchaseDelete,
  deletePurchaseOrder,
  validateCheckPurchaseDeleteResult,
};

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { purchaseAndReturnQueryKey, purchaseListQueryKey } from "@/config/query-key";
import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type { PurchaseItem } from "@/types";

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
  if (Array.isArray(item?.purchaseDetails) && item.purchaseDetails.length > 0) return item.purchaseDetails;
  if (Array.isArray(item?.purchasesDetails) && item.purchasesDetails.length > 0) return item.purchasesDetails;
  if (Array.isArray(item?.details) && item.details.length > 0) return item.details;
  return [];
};

/**
 * Single source of truth for normalizing purchase record numeric fields and line items.
 */
export const normalizePurchaseRecord = (item: any): PurchaseItem => {
  const lineItems = extractPurchaseLineItems(item);
  const grandTotal = Number(item?.grandTotal ?? item?.grand_total ?? item?.totalAmount ?? 0);
  const paidAmount = Number(item?.paidAmount ?? item?.paid_amount ?? 0);
  const dueAmount = Number(item?.dueAmount ?? item?.due_amount ?? 0);
  const supplierId = item?.supplierId ?? item?.supplier_id ?? item?.partyId ?? item?.party_id;
  const supplierName =
    item?.supplierName ||
    item?.supplier_name ||
    item?.partyName ||
    item?.party_name ||
    item?.supplier ||
    "Direct Supplier";
  const supplierPhone =
    item?.supplierPhone ||
    item?.supplier_phone ||
    item?.phone ||
    item?.partyPhone ||
    item?.party_phone ||
    "";
  const supplierAddress =
    item?.supplierAddress ||
    item?.supplier_address ||
    item?.address ||
    item?.partyAddress ||
    "";
  const hasReturn = Boolean(
    item?.hasReturn ||
    item?.returnNo ||
    (Array.isArray(item?.returnDetails) && item.returnDetails.length > 0) ||
    (Array.isArray(item?.purchaseReturnDetails) && item.purchaseReturnDetails.length > 0)
  );

  return {
    ...item,
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
 * NOTE: item.hasReturn is a boolean on a PURCHASE and must NEVER classify the purchase as a return.
 */
export const isPurchaseReturnRecord = (item: any): boolean => {
  if (!item) return false;
  return (
    Boolean(item.isReturnRecord) ||
    Boolean(item.returnNo) ||
    (typeof item.refNo === "string" && item.refNo.startsWith("PR-")) ||
    String(item.returnType || "").toUpperCase() === "RETURN" ||
    (String(item.status || "").toUpperCase() === "RETURN" && !item.invoiceNo) ||
    (Array.isArray(item.returnDetails) && item.returnDetails.length > 0 && !item.purchaseDetails?.length)
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
      res?.purchaseList ||
      res?.purchasesList ||
      res?.purchases ||
      res?.purchaseListDetails ||
      res?.purchaseInfoList ||
      res?.purchase_list ||
      (Array.isArray(res?.data)
        ? res?.data
        : res?.data?.purchaseList || res?.data?.purchases || res?.data?.purchase_list) ||
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
 */
export const fetchPurchaseAndReturnList = async (): Promise<any[]> => {
  try {
    const accessUser = buildAccessUser();
    const endpoint = apiConfig.purchaseReturn.getPurchaseAndReturnListUrl;
    const res: any = await postData({
      url: endpoint,
      body: { accessUser },
    });

    const purchases = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.purchaseList)
      ? res.purchaseList
      : Array.isArray(res?.purchases)
      ? res.purchases
      : Array.isArray(res?.purchasesList)
      ? res.purchasesList
      : [];

    const returns = Array.isArray(res?.returns)
      ? res.returns
      : Array.isArray(res?.returnList)
      ? res.returnList
      : Array.isArray(res?.purchaseReturnList)
      ? res.purchaseReturnList
      : Array.isArray(res?.purchaseReturns)
      ? res.purchaseReturns
      : [];

    const directList = Array.isArray(res) ? res : [];

    // Deduplicate into unified records array with prefixed keys to avoid ID collision
    const seen = new Set<string>();
    const unifiedList: any[] = [];

    const addItem = (item: any, forceIsReturn?: boolean) => {
      if (!item) return;
      const isReturn = forceIsReturn !== undefined ? forceIsReturn : isPurchaseReturnRecord(item);

      const prefix = isReturn ? "ret" : "pur";
      const idKey = item.returnNo || item.purchaseInvoiceNo || item.invoiceNo || item.orderNo || item.id;
      const key = `${prefix}_${idKey || Math.random()}`;

      if (!seen.has(key)) {
        seen.add(key);

        const lineItems = extractPurchaseLineItems(item);
        item.purchaseDetails = lineItems;
        item.details = lineItems;
        item.isReturnRecord = isReturn;

        unifiedList.push(item);
      }
    };

    purchases.forEach((p: any) => addItem(p, false));
    returns.forEach((r: any) => addItem(r, true));
    directList.forEach((d: any) => addItem(d));

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
export const usePurchaseAndReturnsQuery = <TData = any[]>(
  options?: Omit<UseQueryOptions<any[], Error, TData>, "queryKey" | "queryFn">
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
    if (isPurchaseReturnRecord(item)) {
      if (item.purchaseInvoiceNo && item.purchaseInvoiceNo !== "-") {
        set.add(String(item.purchaseInvoiceNo).trim().toLowerCase());
      }
      if (item.invoiceNo && item.invoiceNo !== "-") {
        set.add(String(item.invoiceNo).trim().toLowerCase());
      }
      if (item.orderNo) {
        set.add(String(item.orderNo).trim().toLowerCase());
      }
      if (item.challanNo) {
        set.add(String(item.challanNo).trim().toLowerCase());
      }
      // NOTE: Do NOT add item.id because item.id is the return record ID, which would incorrectly collide with purchase.id
      if (item.purchaseId) {
        set.add(String(item.purchaseId).trim().toLowerCase());
      }
      if (item.purchase_id) {
        set.add(String(item.purchase_id).trim().toLowerCase());
      }
    }
  });

  return set;
};

/** Backward compatibility alias */
export const extractReturnedInvoiceKeysSet = extractReturnedPurchaseKeysSet;

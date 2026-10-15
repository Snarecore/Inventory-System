import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { purchaseAndReturnQueryKey, purchaseListQueryKey } from "@/config/query-key";
import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type { PurchaseItem } from "@/types";

/**
 * Standardized fetcher for all purchase records.
 * Single source of truth for /get-purchase-list query across the entire app.
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

    return Array.isArray(list) ? (list as PurchaseItem[]) : [];
  } catch (error) {
    console.error("Failed to fetch purchases list:", error);
    return [];
  }
};

/**
 * Standardized fetcher for combined purchase and return records.
 * Single source of truth for /get-purchase-and-return-list query.
 */
export const fetchPurchaseAndReturnList = async (): Promise<any[]> => {
  try {
    const accessUser = buildAccessUser();
    const endpoint =
      apiConfig.purchaseReturn?.getPurchaseAndReturnListUrl;
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

    const addItem = (item: any) => {
      if (!item) return;
      const isReturn =
        Boolean(item.hasReturn) ||
        Boolean(item.returnNo) ||
        Boolean(item.returnGrandTotal) ||
        String(item.returnType || "").toUpperCase() === "RETURN" ||
        String(item.status || "").toUpperCase() === "RETURN" ||
        (item.refNo && String(item.refNo).startsWith("PR-")) ||
        (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
        (Array.isArray(item.purchaseReturnDetails) && item.purchaseReturnDetails.length > 0);

      const prefix = isReturn ? "ret" : "pur";
      const idKey = item.returnNo || item.purchaseInvoiceNo || item.invoiceNo || item.orderNo || item.id;
      const key = `${prefix}_${idKey || Math.random()}`;

      if (!seen.has(key)) {
        seen.add(key);
        unifiedList.push(item);
      }
    };

    purchases.forEach(addItem);
    returns.forEach(addItem);
    directList.forEach(addItem);

    return unifiedList;
  } catch (error) {
    console.error("Failed to fetch purchase and return list:", error);
    return [];
  }
};

/**
 * Standardized hook for /get-purchase-list
 * Shared across Purchases page, Purchase Return list, Purchase tab, and Create Form.
 */
export const usePurchasesQuery = <TData = PurchaseItem[]>(
  options?: Omit<UseQueryOptions<PurchaseItem[], Error, TData>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [purchaseListQueryKey],
    queryFn: fetchPurchasesList,
    staleTime: 60 * 1000,
    ...options,
  });
};

/**
 * Standardized hook for /get-purchase-and-return-list
 * Shared across Purchase Return list, Purchases page, and Create Form.
 */
export const usePurchaseAndReturnsQuery = <TData = any[]>(
  options?: Omit<UseQueryOptions<any[], Error, TData>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [purchaseAndReturnQueryKey],
    queryFn: fetchPurchaseAndReturnList,
    staleTime: 60 * 1000,
    ...options,
  });
};

/**
 * Safely extracts set of returned invoice/order/challan/purchaseId keys.
 * Note: Never indexes return record id (item.id) to prevent collisions with purchase.id.
 */
export const extractReturnedInvoiceKeysSet = (records: any[]): Set<string> => {
  const set = new Set<string>();
  if (!Array.isArray(records)) return set;

  records.forEach((item: any) => {
    const isReturned =
      Boolean(item.hasReturn) ||
      Boolean(item.returnNo) ||
      Boolean(item.returnGrandTotal) ||
      String(item.returnType || "").toUpperCase() === "RETURN" ||
      String(item.status || "").toUpperCase() === "RETURN" ||
      (item.refNo && String(item.refNo).startsWith("PR-")) ||
      (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
      (Array.isArray(item.purchaseReturnDetails) && item.purchaseReturnDetails.length > 0);

    if (isReturned) {
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

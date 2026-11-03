import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { salesAndReturnQueryKey, salesListQueryKey } from "@/config/query-key";
import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type { SaleItem } from "@/types";

/**
 * Unified Trade Record interface representing both Sales and Returns
 * in the Trade domain with strict typing.
 */
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

/**
 * Extracts line items array from arbitrary backend property names.
 */
export const extractLineItems = (item: any): any[] => {
  if (Array.isArray(item?.salesDetails) && item.salesDetails.length > 0) return item.salesDetails;
  if (Array.isArray(item?.saleDetails) && item.saleDetails.length > 0) return item.saleDetails;
  if (Array.isArray(item?.details) && item.details.length > 0) return item.details;
  return [];
};

/**
 * Single source of truth for normalizing sale record numeric fields and line items.
 */
export const normalizeSaleRecord = (item: any): SaleItem => {
  const lineItems = extractLineItems(item);
  const grandTotal = Number(item?.grandTotal ?? item?.grand_total ?? item?.totalAmount ?? 0);
  const paidAmount = Number(item?.paidAmount ?? item?.paid_amount ?? 0);
  const dueAmount = Number(item?.dueAmount ?? item?.due_amount ?? 0);
  const customerId = item?.customerId ?? item?.customer_id ?? item?.partyId ?? item?.party_id;
  const customerName =
    item?.customerName ||
    item?.customer_name ||
    item?.partyName ||
    item?.party_name ||
    item?.customer ||
    "Customer";
  const customerPhone =
    item?.customerPhone ||
    item?.customer_phone ||
    item?.phone ||
    item?.partyPhone ||
    item?.party_phone ||
    "";
  const customerAddress =
    item?.customerAddress ||
    item?.customer_address ||
    item?.address ||
    item?.partyAddress ||
    "";
  const hasReturn = Boolean(
    item?.hasReturn ||
    item?.returnNo ||
    (Array.isArray(item?.returnDetails) && item.returnDetails.length > 0) ||
    (Array.isArray(item?.salesReturnDetails) && item.salesReturnDetails.length > 0)
  );

  return {
    ...item,
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

/**
 * Determines if an arbitrary item represents a return record.
 * NOTE: item.hasReturn is a boolean on a SALE and must NEVER classify the sale as a return.
 */
export const isReturnRecord = (item: any): boolean => {
  if (!item) return false;
  return (
    Boolean(item.isReturnRecord) ||
    Boolean(item.returnNo) ||
    (typeof item.refNo === "string" && item.refNo.startsWith("SR-")) ||
    String(item.returnType || "").toUpperCase() === "RETURN" ||
    (String(item.status || "").toUpperCase() === "RETURN" && !item.invoiceNo) ||
    (Array.isArray(item.returnDetails) && item.returnDetails.length > 0 && !item.salesDetails?.length)
  );
};

/**
 * Standardized fetcher for all sales records.
 * Single source of truth for sales query across the entire app.
 */
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
      res?.sales ||
      res?.saleDetailsList ||
      res?.sale_list ||
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
 */
export const fetchSalesAndReturnList = async (): Promise<UnifiedTradeRecord[]> => {
  try {
    const accessUser = buildAccessUser();
    const endpoint = apiConfig.salesReturn.getSalesAndReturnUrl;
    const res: any = await postData({
      url: endpoint,
      body: { accessUser },
    });

    const sales = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.saleList)
      ? res.saleList
      : Array.isArray(res?.sales)
      ? res.sales
      : Array.isArray(res?.salesList)
      ? res.salesList
      : [];

    const returns = Array.isArray(res?.returns)
      ? res.returns
      : Array.isArray(res?.returnList)
      ? res.returnList
      : Array.isArray(res?.salesReturnList)
      ? res.salesReturnList
      : Array.isArray(res?.salesReturns)
      ? res.salesReturns
      : [];

    const directList = Array.isArray(res) ? res : [];

    // Deduplicate into unified records array with deterministic composite keys
    const seen = new Set<string>();
    const unifiedList: UnifiedTradeRecord[] = [];

    const addItem = (item: any, index: number, forceIsReturn?: boolean) => {
      if (!item) return;
      const isRet = forceIsReturn !== undefined ? forceIsReturn : isReturnRecord(item);
      const prefix = isRet ? "ret" : "sale";
      const idKey =
        item.returnNo ||
        item.salesInvoiceNo ||
        item.invoiceNo ||
        item.orderNo ||
        item.id ||
        `idx_${index}`;
      const key = `${prefix}_${idKey}`;

      if (!seen.has(key)) {
        seen.add(key);
        const normalized = normalizeSaleRecord(item) as UnifiedTradeRecord;
        normalized.isReturnRecord = isRet;
        unifiedList.push(normalized);
      }
    };

    sales.forEach((s, idx) => addItem(s, idx, false));
    returns.forEach((r, idx) => addItem(r, idx, true));
    directList.forEach((d, idx) => addItem(d, idx));

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
    staleTime: 60 * 1000,
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
    staleTime: 60 * 1000,
    ...options,
  });
};

/**
 * Safely extracts set of returned invoice/order/challan/saleId keys.
 * Note: Never indexes return record id (item.id) to prevent collisions with sale.id.
 */
export const extractReturnedSalesInvoiceKeysSet = (records: any[]): Set<string> => {
  const set = new Set<string>();
  if (!Array.isArray(records)) return set;

  records.forEach((item: any) => {
    if (isReturnRecord(item)) {
      if (item.salesInvoiceNo && item.salesInvoiceNo !== "-") {
        set.add(String(item.salesInvoiceNo).trim().toLowerCase());
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
      if (item.saleId) {
        set.add(String(item.saleId).trim().toLowerCase());
      }
      if (item.sale_id) {
        set.add(String(item.sale_id).trim().toLowerCase());
      }
    }
  });

  return set;
};

export default useSalesQuery;

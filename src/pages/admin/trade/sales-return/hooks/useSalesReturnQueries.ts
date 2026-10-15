import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { salesAndReturnQueryKey, salesListQueryKey } from "@/config/query-key";
import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type { SaleItem } from "@/types";

/**
 * Standardized fetcher for all sales records.
 * Single source of truth for /get-sale-list query across the entire app.
 */
export const fetchSalesList = async (): Promise<SaleItem[]> => {
  try {
    const accessUser = buildAccessUser();
    const endpoint = apiConfig.sales?.salesListUrl || "get-sale-list";
    const res: any = await postData({
      url: endpoint,
      body: { accessUser },
    });

    const list =
      res?.saleList ||
      res?.salesList ||
      res?.sales ||
      res?.saleDetailsList ||
      res?.sale_list ||
      (Array.isArray(res?.data)
        ? res?.data
        : res?.data?.saleList || res?.data?.sales || res?.data?.sale_list) ||
      [];

    return Array.isArray(list) ? (list as SaleItem[]) : [];
  } catch (error) {
    console.error("Failed to fetch sales list:", error);
    return [];
  }
};

/**
 * Standardized fetcher for combined sales and return records.
 * Single source of truth for /get-sales-and-return query.
 */
export const fetchSalesAndReturnList = async (): Promise<any[]> => {
  try {
    const accessUser = buildAccessUser();
    const endpoint =
      apiConfig.salesReturn?.getSalesAndReturnUrl ||
      apiConfig.salesReturn?.salesAndReturnUrl ||
      apiConfig.sales?.salesAndReturnUrl ||
      "get-sales-and-return";
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
        (item.refNo && String(item.refNo).startsWith("SR-")) ||
        (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
        (Array.isArray(item.salesReturnDetails) && item.salesReturnDetails.length > 0);

      const prefix = isReturn ? "ret" : "sale";
      const idKey = item.returnNo || item.salesInvoiceNo || item.invoiceNo || item.orderNo || item.id;
      const key = `${prefix}_${idKey || Math.random()}`;

      if (!seen.has(key)) {
        seen.add(key);
        unifiedList.push(item);
      }
    };

    sales.forEach(addItem);
    returns.forEach(addItem);
    directList.forEach(addItem);

    return unifiedList;
  } catch (error) {
    console.error("Failed to fetch sales and return list:", error);
    return [];
  }
};

/**
 * Standardized hook for /get-sale-list
 * Shared across Sales page, Sales Return list, Sales tab, and Create Form.
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
 * Standardized hook for /get-sales-and-return
 * Shared across Sales Return list, Sales tab, and Create Form.
 */
export const useSalesAndReturnsQuery = <TData = any[]>(
  options?: Omit<UseQueryOptions<any[], Error, TData>, "queryKey" | "queryFn">
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
    const isReturned =
      Boolean(item.hasReturn) ||
      Boolean(item.returnNo) ||
      Boolean(item.returnGrandTotal) ||
      String(item.returnType || "").toUpperCase() === "RETURN" ||
      String(item.status || "").toUpperCase() === "RETURN" ||
      (item.refNo && String(item.refNo).startsWith("SR-")) ||
      (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
      (Array.isArray(item.salesReturnDetails) && item.salesReturnDetails.length > 0);

    if (isReturned) {
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
      // NOTE: Do NOT add item.id because item.id is the return record ID, which would incorrectly collide with sale.id
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

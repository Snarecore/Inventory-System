import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import apiConfig from "@/config/api.json";
import { customersDueQueryKey } from "@/config/query-key";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type { CustomerDueItem } from "@/types/collection.types";

/**
 * Standard normalizer for customers due response
 */
export const normalizeCustomersDue = (raw: any): CustomerDueItem[] => {
  if (!raw) return [];

  const list: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.customerDueList)
    ? raw.customerDueList
    : [];

  return list.map((item: any) => {
    const customerId = item.customerId || item.id || "";
    const totalDue = Number(item.totalDue ?? item.dueAmount ?? 0);
    const invoiceCount = Number(
      item.invoiceCount ?? (Array.isArray(item.invoices) ? item.invoices.length : 0)
    );

    return {
      ...item,
      id: customerId,
      customerId,
      customerName: item.customerName || item.name || "General Customer",
      customerPhone: item.customerPhone || item.phone || "",
      customerAddress: item.customerAddress || item.address || "",
      totalDue,
      dueAmount: totalDue,
      invoiceCount,
      lastSaleDate: item.lastSaleDate || item.salesDate || null,
    };
  });
};

/**
 * Fetcher function for all due customers
 */
export const fetchCustomersDue = async (): Promise<CustomerDueItem[]> => {
  try {
    const endpoint = apiConfig.collection.customersDueUrl;
    const res: any = await postData({
      url: endpoint,
      body: { accessUser: buildAccessUser() },
    });

    return normalizeCustomersDue(res);
  } catch (err) {
    console.error("Failed to fetch customers due:", err);
    return [];
  }
};

/**
 * TanStack Query hook for fetching and caching outstanding customer dues.
 * Shared cache with 60-second stale time for instant client-side performance.
 */
export const useCustomersDueQuery = (
  options?: Omit<UseQueryOptions<CustomerDueItem[]>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [customersDueQueryKey],
    queryFn: fetchCustomersDue,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export default useCustomersDueQuery;

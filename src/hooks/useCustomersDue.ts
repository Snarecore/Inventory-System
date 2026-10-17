import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import apiConfig from "@/config/api.json";
import { customersDueQueryKey } from "@/config/query-key";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type { CustomerDueItem } from "@/types/collection.types";

/**
 * Standard normalizer for /customers-due response
 */
export const normalizeCustomersDue = (raw: any): CustomerDueItem[] => {
  if (!raw) return [];

  let list: any[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === "object") {
    if (Array.isArray(raw.data)) list = raw.data;
    else if (Array.isArray(raw.customerDueList)) list = raw.customerDueList;
    else if (Array.isArray(raw.customersDue)) list = raw.customersDue;
    else if (Array.isArray(raw.customersDueList)) list = raw.customersDueList;
    else if (Array.isArray(raw.customers)) list = raw.customers;
  }

  return list.map((item: any, idx: number) => {
    const custId = item.customerId ?? item.id ?? item.partyId ?? `cust_${idx}`;
    const due = Number(item.totalDue ?? item.dueAmount ?? item.due_amount ?? item.due ?? 0);

    return {
      ...item,
      id: custId,
      customerId: custId,
      customerName: item.customerName || item.name || item.partyName || "General Customer",
      customerPhone: item.customerPhone || item.phone || item.mobile || "",
      customerAddress: item.customerAddress || item.address || "",
      totalDue: due,
      total_due: due,
      dueAmount: due,
      due_amount: due,
      invoiceCount: Number(item.invoiceCount ?? item.invoicesCount ?? item.count ?? 0),
      lastSaleDate: item.lastSaleDate || item.salesDate || item.saleDate || null,
    };
  });
};

/**
 * Fetcher function for all due customers
 */
export const fetchCustomersDue = async (): Promise<CustomerDueItem[]> => {
  try {
    const endpoint = apiConfig.collection?.customersDueUrl || "customers-due";
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
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export default useCustomersDueQuery;

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import apiConfig from "@/config/api.json";
import { purchasesDueQueryKey } from "@/config/query-key";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type { SupplierDueItem } from "@/types/payment.types";

/**
 * Standard normalizer for purchases due response
 */
export const normalizePurchasesDue = (raw: any): SupplierDueItem[] => {
  if (!raw) return [];

  const list: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.supplierDueList)
    ? raw.supplierDueList
    : Array.isArray(raw?.purchaseDueList)
    ? raw.purchaseDueList
    : [];

  return list.map((item: any) => {
    const supplierId = item.supplierId || item.id || "";
    const totalDue = Number(item.totalDue ?? item.dueAmount ?? 0);
    const invoiceCount = Number(
      item.invoiceCount ?? (Array.isArray(item.invoices) ? item.invoices.length : 0)
    );

    return {
      ...item,
      id: supplierId,
      supplierId,
      supplierName: item.supplierName || item.name || "General Supplier",
      supplierPhone: item.supplierPhone || item.phone || "",
      supplierAddress: item.supplierAddress || item.address || "",
      totalDue,
      dueAmount: totalDue,
      invoiceCount,
      lastPurchaseDate: item.lastPurchaseDate || item.purchaseDate || null,
    };
  });
};

/**
 * Fetcher function for all due suppliers
 */
export const fetchPurchasesDue = async (): Promise<SupplierDueItem[]> => {
  try {
    const endpoint = apiConfig.payment.purchasesDueUrl;
    const res: any = await postData({
      url: endpoint,
      body: { accessUser: buildAccessUser() },
    });

    return normalizePurchasesDue(res);
  } catch (err) {
    console.error("Failed to fetch purchases due:", err);
    return [];
  }
};

/**
 * TanStack Query hook for fetching and caching outstanding supplier dues.
 * Shared cache with 60-second stale time for instant client-side performance.
 */
export const usePurchasesDueQuery = (
  options?: Omit<UseQueryOptions<SupplierDueItem[]>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [purchasesDueQueryKey],
    queryFn: fetchPurchasesDue,
    staleTime: 0,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const usePurchasesDue = usePurchasesDueQuery;

export default usePurchasesDueQuery;

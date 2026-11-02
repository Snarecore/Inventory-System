import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import apiConfig from "@/config/api.json";
import { purchasesDueQueryKey } from "@/config/query-key";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type { SupplierDueItem } from "@/types/payment.types";

/**
 * Standard normalizer for /purchases-due response
 */
export const normalizePurchasesDue = (raw: any): SupplierDueItem[] => {
  if (!raw) return [];

  let list: any[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === "object") {
    if (Array.isArray(raw.data)) list = raw.data;
    else if (Array.isArray(raw.supplierDueList)) list = raw.supplierDueList;
    else if (Array.isArray(raw.suppliersDue)) list = raw.suppliersDue;
    else if (Array.isArray(raw.purchaseDueList)) list = raw.purchaseDueList;
    else if (Array.isArray(raw.suppliers)) list = raw.suppliers;
    else if (Array.isArray(raw.purchasesDue)) list = raw.purchasesDue;
  }

  return list.map((item: any, idx: number) => {
    const supId = item.supplierId ?? item.id ?? item.partyId ?? `sup_${idx}`;
    const due = Number(item.totalDue ?? item.dueAmount ?? item.due_amount ?? item.due ?? 0);

    const address =
      item.supplierAddress ||
      item.address ||
      item.partyAddress ||
      "";

    let invCount = Number(
      item.invoiceCount ??
      item.invoicesCount ??
      item.totalInvoices ??
      item.totalInvoice ??
      item.purchaseCount ??
      item.purchasesCount ??
      item.count ??
      0
    );
    if (invCount === 0) {
      if (Array.isArray(item.invoices)) invCount = item.invoices.length;
      else if (Array.isArray(item.invoiceList)) invCount = item.invoiceList.length;
      else if (Array.isArray(item.purchasesDueList)) invCount = item.purchasesDueList.length;
      else if (Array.isArray(item.details)) invCount = item.details.length;
    }

    return {
      ...item,
      id: supId,
      supplierId: supId,
      supplierName: item.supplierName || item.name || item.partyName || "General Supplier",
      supplierPhone: item.supplierPhone || item.phone || item.mobile || "",
      supplierAddress: address,
      totalDue: due,
      total_due: due,
      dueAmount: due,
      due_amount: due,
      invoiceCount: invCount,
      lastPurchaseDate: item.lastPurchaseDate || item.purchaseDate || item.date || null,
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
    staleTime: 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const usePurchasesDue = usePurchasesDueQuery;

export default usePurchasesDueQuery;

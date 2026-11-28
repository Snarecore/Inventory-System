import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { purchasesInvoicesDueQueryKey } from "@/config/query-key";
import { fetchPurchasesInvoicesDueResponse } from "@/services/trade-finance-query-service";
import type { PurchaseInvoiceDueItem } from "@/types/payment.types";

/**
 * Standard normalizer for purchases invoices due response
 */
export const normalizePurchasesInvoicesDue = (raw: any): PurchaseInvoiceDueItem[] => {
  if (!raw) return [];

  const list: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.invoicesDueList)
    ? raw.invoicesDueList
    : [];

  return list
    .filter((inv: any) => inv && (inv.invoiceNo || inv.purchaseNo || inv.orderNo))
    .map((inv: any) => {
      const invNo = String(inv.invoiceNo || inv.purchaseNo || inv.orderNo).trim();
      const grandTotal = Number(inv.grandTotal ?? inv.totalAmount ?? 0);
      const paidAmount = Number(inv.paidAmount ?? 0);
      const dueAmount = Number(inv.dueAmount ?? Math.max(0, grandTotal - paidAmount));
      const purchaseDate = inv.purchaseDate || inv.date || null;

      return {
        ...inv,
        id: inv.id || invNo,
        invoiceNo: invNo,
        purchaseNo: inv.purchaseNo || invNo,
        orderNo: inv.orderNo || invNo,
        purchaseDate,
        date: purchaseDate,
        grandTotal,
        paidAmount,
        dueAmount,
        paymentType: inv.paymentType || "",
        status: inv.status || "",
      };
    })
    .filter((inv) => inv.dueAmount > 0);
};

/**
 * Fetcher function for a specific supplier's outstanding purchase invoices.
 * Note: Java Spring Boot backend expects `customerId: supplierId` in the request body.
 */
export const fetchPurchasesInvoicesDue = async (
  supplierId: string | number
): Promise<PurchaseInvoiceDueItem[]> => {
  if (!supplierId) return [];

  try {
    const res: any = await fetchPurchasesInvoicesDueResponse(supplierId);

    return normalizePurchasesInvoicesDue(res);
  } catch (err) {
    console.error(`Failed to fetch invoices due for supplier ${supplierId}:`, err);
    return [];
  }
};

/**
 * TanStack Query hook for fetching and caching outstanding purchase invoices of a supplier.
 */
export const usePurchasesInvoicesDueQuery = (
  supplierId: string | number | undefined,
  options?: Omit<UseQueryOptions<PurchaseInvoiceDueItem[]>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [purchasesInvoicesDueQueryKey, String(supplierId || "")],
    queryFn: () => fetchPurchasesInvoicesDue(supplierId!),
    enabled: Boolean(supplierId),
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const usePurchasesInvoicesDue = usePurchasesInvoicesDueQuery;

export default usePurchasesInvoicesDueQuery;

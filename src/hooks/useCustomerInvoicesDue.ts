import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { customerInvoicesDueQueryKey } from "@/config/query-key";
import { fetchCustomerInvoicesDueResponse } from "@/services/trade-finance-query-service";
import type { InvoiceDueItem } from "@/types/collection.types";

/**
 * Standard normalizer for customer invoices due response
 */
export const normalizeCustomerInvoicesDue = (raw: any): InvoiceDueItem[] => {
  if (!raw) return [];

  const list: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.invoicesDueList)
    ? raw.invoicesDueList
    : [];

  return list
    .filter((inv: any) => inv && (inv.invoiceNo || inv.orderNo))
    .map((inv: any) => {
      const invNo = String(inv.invoiceNo || inv.orderNo).trim();
      const grandTotal = Number(inv.grandTotal ?? inv.totalAmount ?? 0);
      const paidAmount = Number(inv.paidAmount ?? 0);
      const dueAmount = Number(inv.dueAmount ?? Math.max(0, grandTotal - paidAmount));
      const invoiceDate = inv.salesDate || inv.saleDate || inv.date || null;

      return {
        ...inv,
        id: inv.id || invNo,
        invoiceNo: invNo,
        orderNo: inv.orderNo || invNo,
        salesDate: invoiceDate,
        saleDate: invoiceDate,
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
 * Fetcher function for a specific customer's outstanding invoices
 */
export const fetchCustomerInvoicesDue = async (
  customerId: string | number
): Promise<InvoiceDueItem[]> => {
  if (!customerId) return [];

  try {
    const res: any = await fetchCustomerInvoicesDueResponse(customerId);

    return normalizeCustomerInvoicesDue(res);
  } catch (err) {
    console.error(`Failed to fetch invoices due for customer ${customerId}:`, err);
    return [];
  }
};

/**
 * TanStack Query hook for fetching and caching outstanding invoices of a customer.
 */
export const useCustomerInvoicesDueQuery = (
  customerId: string | number | undefined,
  options?: Omit<UseQueryOptions<InvoiceDueItem[]>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [customerInvoicesDueQueryKey, String(customerId || "")],
    queryFn: () => fetchCustomerInvoicesDue(customerId!),
    enabled: Boolean(customerId),
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useCustomerInvoicesDue = useCustomerInvoicesDueQuery;

export default useCustomerInvoicesDueQuery;

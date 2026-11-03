import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import apiConfig from "@/config/api.json";
import { purchasesInvoicesDueQueryKey } from "@/config/query-key";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type { PurchaseInvoiceDueItem } from "@/types/payment.types";

/**
 * Standard normalizer for purchases invoices due response
 */
export const normalizePurchasesInvoicesDue = (raw: any): PurchaseInvoiceDueItem[] => {
  if (!raw) return [];

  let list: any[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === "object") {
    if (Array.isArray(raw.data)) list = raw.data;
    else if (Array.isArray(raw.invoicesDueList)) list = raw.invoicesDueList;
    else if (Array.isArray(raw.invoices)) list = raw.invoices;
    else if (Array.isArray(raw.invoiceList)) list = raw.invoiceList;
    else if (Array.isArray(raw.purchaseList)) list = raw.purchaseList;
  }

  return list
    .map((inv: any, idx: number) => {
      const invNo = String(
        inv.invoiceNo || inv.purchaseNo || inv.orderNo || `PINV_${idx}`
      ).trim();
      const grand = Number(inv.grandTotal ?? inv.totalAmount ?? inv.grand_total ?? 0);
      const paid = Number(inv.paidAmount ?? inv.paid_amount ?? 0);
      const due = Number(inv.dueAmount ?? inv.due_amount ?? 0);

      return {
        ...inv,
        id: inv.id ?? invNo,
        invoiceNo: invNo,
        purchaseNo: inv.purchaseNo || invNo,
        orderNo: inv.orderNo || invNo,
        purchaseDate: inv.purchaseDate || inv.salesDate || inv.saleDate || inv.date || null,
        date: inv.purchaseDate || inv.salesDate || inv.saleDate || inv.date || null,
        grandTotal: grand,
        paidAmount: paid,
        dueAmount: due,
        paymentType: inv.paymentType || inv.paymentMode || "",
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
    const endpoint = apiConfig.payment.purchasesInvoicesDueUrl;
    const res: any = await postData({
      url: endpoint,
      body: {
        accessUser: buildAccessUser(),
        customerId: String(supplierId),
      },
    });

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
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const usePurchasesInvoicesDue = usePurchasesInvoicesDueQuery;

export default usePurchasesInvoicesDueQuery;

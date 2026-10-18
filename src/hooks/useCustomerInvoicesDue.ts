import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import apiConfig from "@/config/api.json";
import { customerInvoicesDueQueryKey } from "@/config/query-key";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type { InvoiceDueItem } from "@/types/collection.types";

/**
 * Standard normalizer for /customer-invoices-due response
 */
export const normalizeCustomerInvoicesDue = (raw: any): InvoiceDueItem[] => {
  if (!raw) return [];

  let list: any[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === "object") {
    if (Array.isArray(raw.data)) list = raw.data;
    else if (Array.isArray(raw.invoicesDueList)) list = raw.invoicesDueList;
    else if (Array.isArray(raw.invoices)) list = raw.invoices;
    else if (Array.isArray(raw.invoiceList)) list = raw.invoiceList;
  }

  return list
    .map((inv: any, idx: number) => {
      const invNo = String(inv.invoiceNo || inv.orderNo || `INV_${idx}`).trim();
      const grand = Number(inv.grandTotal ?? inv.totalAmount ?? inv.grand_total ?? 0);
      const paid = Number(inv.paidAmount ?? inv.paid_amount ?? 0);
      const due = Number(inv.dueAmount ?? inv.due_amount ?? 0);

      return {
        ...inv,
        id: inv.id ?? invNo,
        invoiceNo: invNo,
        orderNo: inv.orderNo || invNo,
        salesDate: inv.salesDate || inv.saleDate || inv.date || null,
        saleDate: inv.salesDate || inv.saleDate || inv.date || null,
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
 * Fetcher function for a specific customer's outstanding invoices
 */
export const fetchCustomerInvoicesDue = async (
  customerId: string | number
): Promise<InvoiceDueItem[]> => {
  if (!customerId) return [];

  try {
    const endpoint = apiConfig.collection?.customerInvoicesDueUrl || "customer-invoices-due";
    const res: any = await postData({
      url: endpoint,
      body: {
        accessUser: buildAccessUser(),
        customerId: String(customerId),
      },
    });

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
    staleTime: 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useCustomerInvoicesDue = useCustomerInvoicesDueQuery;

export default useCustomerInvoicesDueQuery;

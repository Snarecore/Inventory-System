import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import apiConfig from "@/config/api.json";
import { paymentReportQueryKey } from "@/config/query-key";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import { getUserInfo } from "@/utils/auth-storage";
import type { PaymentReportItem } from "@/types/payment.types";

export interface PaymentReportFilterParams {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

/**
 * Converts ISO "YYYY-MM-DD" to backend API format "DD-MM-YYYY"
 */
export const toApiDate = (isoDate?: string): string => {
  if (!isoDate || !isoDate.includes("-")) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  }
  return isoDate;
};

/**
 * Standard normalizer for payment report response
 */
export const normalizePaymentReport = (raw: any): PaymentReportItem[] => {
  if (!raw) return [];

  let list: any[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === "object") {
    if (Array.isArray(raw.data)) list = raw.data;
    else if (Array.isArray(raw.reportData)) list = raw.reportData;
    else if (Array.isArray(raw.paymentList)) list = raw.paymentList;
  }

  return list.map((item: any, idx: number) => {
    const details = Array.isArray(item.details)
      ? item.details
      : Array.isArray(item.paymentDetails)
      ? item.paymentDetails
      : [];

    return {
      ...item,
      id: item.id ?? item.paymentNo ?? item.voucherNo ?? `pay_${idx}`,
      paymentNo: item.paymentNo || item.voucherNo || item.id || `PAY-${idx + 1}`,
      voucherNo: item.voucherNo || item.paymentNo || item.id || `PAY-${idx + 1}`,
      supplierId: item.supplierId ?? item.customerId ?? "",
      supplierName: item.supplierName || item.customerName || "Supplier",
      customerName: item.supplierName || item.customerName || "Supplier",
      supplierPhone: item.supplierPhone || item.customerPhone || "",
      customerPhone: item.supplierPhone || item.customerPhone || "",
      paymentDate: item.paymentDate || item.collectionDate || item.date || "",
      collectionDate: item.paymentDate || item.collectionDate || item.date || "",
      addedDate: item.addedDate || item.createdAt || "",
      totalAmount: Number(item.totalAmount ?? item.amount ?? 0),
      totalDiscount: Number(item.totalDiscount ?? item.discount ?? 0),
      paymentMode: item.paymentMode || "Cash",
      remark: item.remark || item.notes || "",
      details: details.map((d: any) => ({
        invoiceNo: d.invoiceNo || "-",
        paidAmount: Number(d.paidAmount ?? 0),
        dueAmount: Number(d.dueAmount ?? 0),
      })),
      paymentDetails: details.map((d: any) => ({
        invoiceNo: d.invoiceNo || "-",
        paidAmount: Number(d.paidAmount ?? 0),
        dueAmount: Number(d.dueAmount ?? 0),
      })),
    };
  });
};

/**
 * Fetcher for payment report
 */
export const fetchPaymentReport = async (
  filters?: PaymentReportFilterParams
): Promise<PaymentReportItem[]> => {
  const userInfo = getUserInfo();
  const accessPhone = userInfo?.phone || userInfo?.phoneNumber || "";

  const payload: any = {
    accessUser: buildAccessUser(),
    accessPhone,
  };

  if (filters?.startDate) {
    payload.startDate = toApiDate(filters.startDate);
  }
  if (filters?.endDate) {
    payload.endDate = toApiDate(filters.endDate);
  }

  try {
    const endpoint = apiConfig.payment.paymentReportUrl;
    const res: any = await postData({
      url: endpoint,
      body: payload,
    });

    return normalizePaymentReport(res);
  } catch (err) {
    console.error("Failed to fetch payment report:", err);
    return [];
  }
};

/**
 * TanStack Query hook for fetching and caching supplier payment report
 */
export const usePaymentReportQuery = (
  filters?: PaymentReportFilterParams,
  options?: Omit<UseQueryOptions<PaymentReportItem[]>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [
      paymentReportQueryKey,
      filters?.startDate || "all",
      filters?.endDate || "all",
    ],
    queryFn: () => fetchPaymentReport(filters),
    staleTime: 0,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const usePaymentReport = usePaymentReportQuery;

export default usePaymentReportQuery;

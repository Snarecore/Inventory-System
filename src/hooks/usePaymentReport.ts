import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { paymentReportQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { getUserInfo } from "@/utils/auth-storage";
import { fetchPaymentReportResponse } from "@/services/trade-finance-query-service";
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

  const list: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.reportData)
    ? raw.reportData
    : Array.isArray(raw?.paymentList)
    ? raw.paymentList
    : [];

  return list.map((item: any) => {
    const rawDetails = Array.isArray(item.details)
      ? item.details
      : Array.isArray(item.paymentDetails)
      ? item.paymentDetails
      : [];

    const details = rawDetails.map((d: any) => ({
      invoiceNo: d.invoiceNo || "-",
      paidAmount: Number(d.paidAmount ?? 0),
      dueAmount: Number(d.dueAmount ?? 0),
    }));

    const paymentNo = item.paymentNo || item.voucherNo || item.id || "";

    return {
      ...item,
      id: item.id || paymentNo,
      paymentNo,
      voucherNo: paymentNo,
      supplierId: item.supplierId ?? "",
      supplierName: item.supplierName || "Supplier",
      supplierPhone: item.supplierPhone || "",
      paymentDate: item.paymentDate || item.date || "",
      addedDate: item.addedDate || item.createdAt || "",
      totalAmount: Number(item.totalAmount ?? item.amount ?? 0),
      totalDiscount: Number(item.totalDiscount ?? item.discount ?? 0),
      paymentMode: item.paymentMode || "Cash",
      remark: item.remark || item.notes || "",
      details,
      paymentDetails: details,
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
    const res: any = await fetchPaymentReportResponse(payload);

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
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const usePaymentReport = usePaymentReportQuery;

export default usePaymentReportQuery;

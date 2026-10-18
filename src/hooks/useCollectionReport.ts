import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import apiConfig from "@/config/api.json";
import { collectionReportQueryKey } from "@/config/query-key";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import { getUserInfo } from "@/utils/auth-storage";
import type { CollectionReportItem } from "@/types/collection.types";

export interface CollectionReportFilterParams {
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
 * Standard normalizer for /get-collection-report response
 */
export const normalizeCollectionReport = (raw: any): CollectionReportItem[] => {
  if (!raw) return [];

  let list: any[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === "object") {
    if (Array.isArray(raw.data)) list = raw.data;
    else if (Array.isArray(raw.reportData)) list = raw.reportData;
    else if (Array.isArray(raw.collectionList)) list = raw.collectionList;
  }

  return list.map((item: any, idx: number) => {
    const details = Array.isArray(item.details)
      ? item.details
      : Array.isArray(item.collectionDetails)
      ? item.collectionDetails
      : [];

    return {
      ...item,
      id: item.id ?? item.collectionNo ?? `col_${idx}`,
      collectionNo: item.collectionNo || item.id || `COL-${idx + 1}`,
      customerId: item.customerId ?? "",
      customerName: item.customerName || "Customer",
      customerPhone: item.customerPhone || "",
      collectionDate: item.collectionDate || item.date || "",
      addedDate: item.addedDate || item.createdAt || "",
      totalAmount: Number(item.totalAmount ?? item.amount ?? 0),
      paymentMode: item.paymentMode || "Cash",
      remark: item.remark || item.notes || "",
      details: details.map((d: any) => ({
        invoiceNo: d.invoiceNo || "-",
        paidAmount: Number(d.paidAmount ?? 0),
        dueAmount: Number(d.dueAmount ?? 0),
      })),
      collectionDetails: details.map((d: any) => ({
        invoiceNo: d.invoiceNo || "-",
        paidAmount: Number(d.paidAmount ?? 0),
        dueAmount: Number(d.dueAmount ?? 0),
      })),
    };
  });
};

/**
 * Fetcher for collection report
 */
export const fetchCollectionReport = async (
  filters?: CollectionReportFilterParams
): Promise<CollectionReportItem[]> => {
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
    const endpoint =
      apiConfig.collection?.collectionReportUrl || "get-collection-report";
    const res: any = await postData({
      url: endpoint,
      body: payload,
    });

    return normalizeCollectionReport(res);
  } catch (err) {
    console.error("Failed to fetch collection report:", err);
    return [];
  }
};

/**
 * TanStack Query hook for customer collection report & audit history
 */
export const useCollectionReportQuery = (
  filters?: CollectionReportFilterParams,
  options?: Omit<UseQueryOptions<CollectionReportItem[]>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [collectionReportQueryKey, filters?.startDate, filters?.endDate],
    queryFn: () => fetchCollectionReport(filters),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    ...options,
  });
};

export default useCollectionReportQuery;

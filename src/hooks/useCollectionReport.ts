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

export const toApiDate = (isoDate?: string): string => {
  if (!isoDate || !isoDate.includes("-")) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  }
  return isoDate;
};

export const normalizeCollectionReport = (raw: any): CollectionReportItem[] => {
  if (!raw) return [];

  const list: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.reportData)
    ? raw.reportData
    : Array.isArray(raw?.collectionList)
    ? raw.collectionList
    : [];

  return list.map((item: any) => {
    const rawDetails = Array.isArray(item.details)
      ? item.details
      : Array.isArray(item.collectionDetails)
      ? item.collectionDetails
      : [];

    const details = rawDetails.map((d: any) => ({
      invoiceNo: d.invoiceNo || "-",
      paidAmount: Number(d.paidAmount ?? 0),
      dueAmount: Number(d.dueAmount ?? 0),
    }));

    const collectionNo = item.collectionNo || item.id || "";

    return {
      ...item,
      id: item.id || collectionNo,
      collectionNo,
      customerId: item.customerId ?? "",
      customerName: item.customerName || "Customer",
      customerPhone: item.customerPhone || "",
      collectionDate: item.collectionDate || item.date || "",
      addedDate: item.addedDate || item.createdAt || "",
      totalAmount: Number(item.totalAmount ?? item.amount ?? 0),
      totalDiscount: Number(item.totalDiscount ?? item.discount ?? 0),
      paymentMode: item.paymentMode || "Cash",
      remark: item.remark || item.notes || "",
      details,
      collectionDetails: details,
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
    const endpoint = apiConfig.collection.collectionReportUrl;
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
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    ...options,
  });
};

export default useCollectionReportQuery;

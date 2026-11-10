import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import {
  fetchCashClosing,
  fetchCashClosingReport,
  insertCashClosing,
} from "@/services/cash-closing-service";
import {
  cashClosingQueryKey,
  cashClosingReportQueryKey,
  cashBalanceQueryKey,
} from "@/config/query-key";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type {
  CashClosingData,
  CashClosingReportData,
  InsertCashClosingPayload,
} from "@/types";

export function useCashClosingQuery(closingDate?: string) {
  const targetDate = closingDate || moment().format("YYYY-MM-DD");

  return useQuery<CashClosingData | null>({
    queryKey: [cashClosingQueryKey, targetDate],
    queryFn: () => fetchCashClosing(targetDate),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to fetch reconciliation history & summary report (by month/year or startDate/endDate range)
 */
export function useCashClosingReportQuery(params?: {
  month?: string;
  year?: string;
  startDate?: string;
  endDate?: string;
}) {
  const hasDateRange =
    params?.startDate !== undefined || params?.endDate !== undefined;
  const currentMonth = params?.month || moment().format("MM");
  const currentYear = params?.year || moment().format("YYYY");

  const queryKey = hasDateRange
    ? [
        cashClosingReportQueryKey,
        "range",
        params?.startDate || "",
        params?.endDate || "",
      ]
    : [cashClosingReportQueryKey, currentMonth, currentYear];

  return useQuery<CashClosingReportData | null>({
    queryKey,
    queryFn: () =>
      fetchCashClosingReport(
        hasDateRange
          ? { startDate: params?.startDate, endDate: params?.endDate }
          : { month: currentMonth, year: currentYear }
      ),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useInsertCashClosingMutation(options?: {
  onSuccess?: (data?: CashClosingData | null) => void;
  onError?: (error: unknown) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: InsertCashClosingPayload) => insertCashClosing(payload),
    onSuccess: (result) => {
      if (result.success) {
        showSuccessToast(result.message || "Cash closing saved successfully!");
        queryClient.invalidateQueries({ queryKey: [cashClosingQueryKey] });
        queryClient.invalidateQueries({ queryKey: [cashClosingReportQueryKey] });
        queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey] });
        options?.onSuccess?.(result.data);
      } else {
        showErrorToast(result.message || "Failed to save cash closing.");
      }
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to save cash closing record.";
      showErrorToast(msg);
      options?.onError?.(err);
    },
  });
}

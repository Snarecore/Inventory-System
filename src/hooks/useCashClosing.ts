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

/**
 * Hook to fetch daily cash closing details for a given date
 */
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
 * Hook to fetch reconciliation history & summary report
 */
export function useCashClosingReportQuery(params?: {
  month?: string;
  year?: string;
}) {
  const currentMonth = params?.month || moment().format("MM");
  const currentYear = params?.year || moment().format("YYYY");

  return useQuery<CashClosingReportData | null>({
    queryKey: [cashClosingReportQueryKey, currentMonth, currentYear],
    queryFn: () => fetchCashClosingReport(params),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to insert / close daily cash
 */
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

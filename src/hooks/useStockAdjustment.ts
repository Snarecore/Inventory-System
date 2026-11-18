import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  saveStockAdjustment,
  fetchStockAdjustmentReport,
} from "@/services/stock-adjustment-service";
import {
  stockAdjustmentReportQueryKey,
  productListQueryKey,
} from "@/config/query-key";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type {
  SaveStockAdjustmentPayload,
  StockAdjustmentReportParams,
} from "@/types";

/**
 * Hook to fetch historical stock adjustment report
 */
export const useStockAdjustmentReportQuery = (
  params?: StockAdjustmentReportParams,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [stockAdjustmentReportQueryKey, params?.fromDate, params?.toDate],
    queryFn: () => fetchStockAdjustmentReport(params),
    staleTime: 0,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });
};

/**
 * Hook to save a new stock adjustment (IN or OUT)
 */
export const useSaveStockAdjustmentMutation = (options?: {
  onSuccess?: () => void;
  onError?: (err: any) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveStockAdjustmentPayload) => saveStockAdjustment(payload),
    onSuccess: (res) => {
      showSuccessToast(res?.msg || "Stock adjustment recorded successfully!");
      // Invalidate adjustment report list
      queryClient.invalidateQueries({ queryKey: [stockAdjustmentReportQueryKey] });
      // Invalidate product catalog list since inventory stock quantities changed
      queryClient.invalidateQueries({ queryKey: [productListQueryKey], refetchType: "all" });
      options?.onSuccess?.();
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to record stock adjustment";
      showErrorToast(msg);
      options?.onError?.(err);
    },
  });
};

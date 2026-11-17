import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  cashBalanceQueryKey,
  cashClosingQueryKey,
  bankInfoListQueryKey,
  mfsUserListQueryKey,
  dashboardQueryKey,
  financialTransactionQueryKey,
  financeDashboardQueryKey,
} from "@/config/query-key";
import {
  fetchFinanceDashboard,
  fetchFinancialTransactions,
  postSingleFinancialTransaction,
  type FinanceDashboardParams,
  type FinanceDashboardResult,
  type FetchFinancialTransactionsParams,
  type FinancialTransactionPayload,
  type FinancialTransactionResult,
} from "@/services/financial-ledger-service";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";

/**
 * Hook to fetch finance dashboard figures
 */
export const useFinanceDashboardQuery = (params?: FinanceDashboardParams) => {
  return useQuery<FinanceDashboardResult>({
    queryKey: [financeDashboardQueryKey, params?.startDate, params?.endDate],
    queryFn: () => fetchFinanceDashboard(params),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
};

export const useFinancialTransactionsQuery = (
  params?: FetchFinancialTransactionsParams,
  options?: Omit<UseQueryOptions<any[]>, "queryKey" | "queryFn">
) => {
  return useQuery<any[]>({
    queryKey: [financialTransactionQueryKey, params?.type, params?.startDate, params?.endDate],
    queryFn: () => fetchFinancialTransactions(params),
    staleTime: 0,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useInsertFinancialTransactionMutation = (options?: {
  onSuccess?: (res: FinancialTransactionResult) => void;
  onError?: (err: any) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Omit<FinancialTransactionPayload, "accessUser" | "osType">) =>
      postSingleFinancialTransaction(payload),
    onSuccess: (res, vars) => {
      if (res.ok) {
        // Selectively invalidate ONLY the affected balance cache based on payment account type
        const accountType = vars.accountType?.toUpperCase();
        if (vars.type === "TRANSFER") {
          queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey] });
          queryClient.invalidateQueries({ queryKey: [cashClosingQueryKey] });
          queryClient.invalidateQueries({ queryKey: [bankInfoListQueryKey] });
          queryClient.invalidateQueries({ queryKey: [mfsUserListQueryKey] });
        } else if (accountType === "CASH") {
          queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey] });
          queryClient.invalidateQueries({ queryKey: [cashClosingQueryKey] });
        } else if (accountType === "BANK") {
          queryClient.invalidateQueries({ queryKey: [bankInfoListQueryKey] });
        } else if (accountType === "MFS") {
          queryClient.invalidateQueries({ queryKey: [mfsUserListQueryKey] });
        } else {
          // Fallback if unspecified
          queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey] });
          queryClient.invalidateQueries({ queryKey: [cashClosingQueryKey] });
          queryClient.invalidateQueries({ queryKey: [bankInfoListQueryKey] });
          queryClient.invalidateQueries({ queryKey: [mfsUserListQueryKey] });
        }

        queryClient.invalidateQueries({ queryKey: [financialTransactionQueryKey] });
        queryClient.invalidateQueries({ queryKey: [dashboardQueryKey] });
        queryClient.invalidateQueries({ queryKey: [financeDashboardQueryKey] });

        const actionLabel =
          vars.type === "TRANSFER"
            ? "Fund transfer"
            : vars.type === "INCOME"
            ? "Income"
            : "Expense";
        showSuccessToast(res.msg || `${actionLabel} recorded successfully`);
        if (options?.onSuccess) options.onSuccess(res);
      } else {
        showErrorToast(res.msg || "Failed to record transaction");
        if (options?.onError) options.onError(new Error(res.msg));
      }
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to save financial transaction");
      if (options?.onError) options.onError(err);
    },
  });
};

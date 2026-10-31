import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  cashBalanceQueryKey,
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
 * Hook to fetch finance dashboard figures (/site/admin-dashboard)
 */
export const useFinanceDashboardQuery = (params?: FinanceDashboardParams) => {
  return useQuery<FinanceDashboardResult>({
    queryKey: [financeDashboardQueryKey, params?.startDate, params?.endDate],
    queryFn: () => fetchFinanceDashboard(params),
    staleTime: 1000 * 30, // 30 seconds
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
};

export const useFinancialTransactionsQuery = (params?: FetchFinancialTransactionsParams) => {
  return useQuery<any[]>({
    queryKey: [financialTransactionQueryKey, params?.type, params?.startDate, params?.endDate],
    queryFn: () => fetchFinancialTransactions(params),
    staleTime: 1000 * 30,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
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
          queryClient.invalidateQueries({ queryKey: [bankInfoListQueryKey] });
          queryClient.invalidateQueries({ queryKey: [mfsUserListQueryKey] });
        } else if (accountType === "CASH") {
          queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey] });
        } else if (accountType === "BANK") {
          queryClient.invalidateQueries({ queryKey: [bankInfoListQueryKey] });
        } else if (accountType === "MFS") {
          queryClient.invalidateQueries({ queryKey: [mfsUserListQueryKey] });
        } else {
          // Fallback if unspecified
          queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey] });
          queryClient.invalidateQueries({ queryKey: [bankInfoListQueryKey] });
          queryClient.invalidateQueries({ queryKey: [mfsUserListQueryKey] });
        }

        queryClient.invalidateQueries({ queryKey: [financialTransactionQueryKey] });
        queryClient.invalidateQueries({ queryKey: [dashboardQueryKey], refetchType: "none" });
        queryClient.invalidateQueries({ queryKey: [financeDashboardQueryKey], refetchType: "none" });

        showSuccessToast(res.msg || `${vars.type === "INCOME" ? "Income" : "Expense"} recorded successfully`);
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

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import {
  ledgerPersonListQueryKey,
  ledgerTransactionListQueryKey,
  cashBalanceQueryKey,
  bankInfoListQueryKey,
  mfsUserListQueryKey,
  dashboardQueryKey,
  financialTransactionQueryKey,
  financeDashboardQueryKey,
} from "@/config/query-key";
import {
  fetchLedgerPersonList,
  saveLedgerPerson,
  deleteLedgerPerson,
  fetchLedgerTransactionList,
  createLedgerTransaction,
  updateLedgerTransaction,
  deleteLedgerTransaction,
  deleteAllTransactionsOfPerson,
  enrichPersonsWithTransactions,
} from "@/services/khatabook-service";
import type {
  LedgerPerson,
  LedgerPersonListResponse,
  LedgerTransaction,
  LedgerTransactionListResponse,
  SaveLedgerPersonPayload,
  CreateLedgerTransactionPayload,
  UpdateLedgerTransactionPayload,
  LedgerActionResponse,
} from "@/types";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";

export interface LedgerMutationCallbacks<TData = LedgerActionResponse, TVariables = unknown> {
  onSuccess?: (data: TData, variables: TVariables, context?: unknown) => void;
  onError?: (error: Error, variables: TVariables, context?: unknown) => void;
  onSettled?: (
    data: TData | undefined,
    error: Error | null,
    variables: TVariables,
    context?: unknown
  ) => void;
}

/**
 * 1. Fetch persons list
 */
export const useLedgerPersonsQuery = (
  status: string = "Active",
  options?: Omit<UseQueryOptions<LedgerPersonListResponse, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<LedgerPersonListResponse, Error>({
    queryKey: [ledgerPersonListQueryKey, status],
    queryFn: () => fetchLedgerPersonList(status),
    staleTime: 0,
    ...options,
  });
};

/**
 * 2. Fetch transactions list (optional personId)
 */
export const useLedgerTransactionsQuery = (
  personId?: number | null,
  options?: Omit<UseQueryOptions<LedgerTransactionListResponse, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<LedgerTransactionListResponse, Error>({
    queryKey: [ledgerTransactionListQueryKey, personId ?? "all"],
    queryFn: () => fetchLedgerTransactionList(personId),
    staleTime: 0,
    ...options,
  });
};

/**
 * 3. Combined hook for Khatabook dashboard with persons and KPIs
 */
export const useKhatabookDashboardQuery = (status: string = "Active") => {
  const personsQuery = useLedgerPersonsQuery(status);
  const transactionsQuery = useLedgerTransactionsQuery(null);

  // Safely extract persons from either direct array or { data: [...] }
  const rawPersons: LedgerPerson[] = Array.isArray(personsQuery.data)
    ? personsQuery.data
    : Array.isArray(personsQuery.data?.data)
    ? personsQuery.data.data
    : [];

  // Safely extract transactions from either direct array or { data: [...] }
  const allTransactions: LedgerTransaction[] = Array.isArray(transactionsQuery.data)
    ? transactionsQuery.data
    : Array.isArray(transactionsQuery.data?.data)
    ? transactionsQuery.data.data
    : [];

  const enrichedPersons = enrichPersonsWithTransactions(rawPersons, allTransactions);

  let totalPabo = 0;
  let totalDibo = 0;
  let totalCommission = 0;

  for (const person of enrichedPersons) {
    const pabo = Number(person.totalPabo ?? 0);
    const dibo = Number(person.totalDibo ?? 0);
    const comm = Number(person.totalCommission ?? 0);
    totalPabo += pabo;
    totalDibo += dibo;
    totalCommission += comm;
  }

  const netBalance = totalPabo - totalDibo;

  const isLoading = personsQuery.isLoading || transactionsQuery.isLoading;
  const isFetching = personsQuery.isFetching || transactionsQuery.isFetching;
  const isError = personsQuery.isError || transactionsQuery.isError;
  const error = personsQuery.error || transactionsQuery.error;

  const refetch = async () => {
    await Promise.all([personsQuery.refetch(), transactionsQuery.refetch()]);
  };

  return {
    persons: enrichedPersons,
    allTransactions,
    kpi: {
      totalPersons: enrichedPersons.length,
      totalPabo,
      totalDibo,
      totalCommission,
      netBalance,
      totalTransactions: allTransactions.length,
    },
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  };
};

/**
 * 4. Save person (create / update)
 */
export const useSaveLedgerPersonMutation = (
  callbacks?: LedgerMutationCallbacks<LedgerActionResponse, SaveLedgerPersonPayload>
) => {
  const queryClient = useQueryClient();

  return useMutation<LedgerActionResponse, Error, SaveLedgerPersonPayload>({
    mutationFn: saveLedgerPerson,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [ledgerPersonListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [ledgerTransactionListQueryKey] });

      const isUpdate = Boolean(variables.id);
      showSuccessToast(
        data.msg || (isUpdate ? "Person details updated successfully" : "New person added successfully")
      );

      callbacks?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      showErrorToast(error?.message || "Failed to save person details");
      callbacks?.onError?.(error, variables, context);
    },
    onSettled: callbacks?.onSettled,
  });
};

/**
 * 5. Delete person
 */
export const useDeleteLedgerPersonMutation = (
  callbacks?: LedgerMutationCallbacks<LedgerActionResponse, number>
) => {
  const queryClient = useQueryClient();

  return useMutation<LedgerActionResponse, Error, number>({
    mutationFn: deleteLedgerPerson,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [ledgerPersonListQueryKey] });
      showSuccessToast(data.msg || "ব্যক্তিটি তালিকা থেকে সফলভাবে ডিলিট করা হয়েছে");
      callbacks?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      const errMsg = error?.message || "";
      const isTxnError =
        errMsg.toLowerCase().includes("transaction") ||
        errMsg.toLowerCase().includes("লেনদেন") ||
        errMsg.toLowerCase().includes("foreign") ||
        errMsg.toLowerCase().includes("constraint") ||
        errMsg.toLowerCase().includes("cannot delete");

      showErrorToast(
        isTxnError
          ? "এই ব্যক্তির সাথে লেনদেন রয়েছে। ব্যক্তি ডিলিট করার আগে তার সকল লেনদেন ডিলিট করতে হবে।"
          : errMsg || "ব্যক্তি ডিলিট করা সম্ভব হয়নি।"
      );
      callbacks?.onError?.(error, variables, context);
    },
    onSettled: callbacks?.onSettled,
  });
};

/**
 * 6. Create transaction
 */
export const useCreateLedgerTransactionMutation = (
  callbacks?: LedgerMutationCallbacks<LedgerActionResponse, CreateLedgerTransactionPayload>
) => {
  const queryClient = useQueryClient();

  return useMutation<LedgerActionResponse, Error, CreateLedgerTransactionPayload>({
    mutationFn: createLedgerTransaction,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [ledgerTransactionListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [ledgerPersonListQueryKey] });
      // Invalidate live financial balances
      queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey] });
      queryClient.invalidateQueries({ queryKey: [bankInfoListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [mfsUserListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [financialTransactionQueryKey] });
      queryClient.invalidateQueries({ queryKey: [dashboardQueryKey] });
      queryClient.invalidateQueries({ queryKey: [financeDashboardQueryKey] });

      const isPabo = variables.transactionType === "PABO";
      showSuccessToast(
        data.msg ||
          (isPabo
            ? "Receivable transaction recorded successfully"
            : "Payable transaction recorded successfully")
      );

      callbacks?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      showErrorToast(error?.message || "Failed to record transaction");
      callbacks?.onError?.(error, variables, context);
    },
    onSettled: callbacks?.onSettled,
  });
};

/**
 * 7. Update transaction
 */
export const useUpdateLedgerTransactionMutation = (
  callbacks?: LedgerMutationCallbacks<LedgerActionResponse, UpdateLedgerTransactionPayload>
) => {
  const queryClient = useQueryClient();

  return useMutation<LedgerActionResponse, Error, UpdateLedgerTransactionPayload>({
    mutationFn: updateLedgerTransaction,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [ledgerTransactionListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [ledgerPersonListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey] });
      queryClient.invalidateQueries({ queryKey: [bankInfoListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [mfsUserListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [financialTransactionQueryKey] });
      queryClient.invalidateQueries({ queryKey: [dashboardQueryKey] });
      queryClient.invalidateQueries({ queryKey: [financeDashboardQueryKey] });

      showSuccessToast(data.msg || "Transaction updated successfully");
      callbacks?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      showErrorToast(error?.message || "Failed to update transaction");
      callbacks?.onError?.(error, variables, context);
    },
    onSettled: callbacks?.onSettled,
  });
};

/**
 * 8. Delete transaction
 */
export const useDeleteLedgerTransactionMutation = (
  callbacks?: LedgerMutationCallbacks<LedgerActionResponse, number>
) => {
  const queryClient = useQueryClient();

  return useMutation<LedgerActionResponse, Error, number>({
    mutationFn: deleteLedgerTransaction,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [ledgerTransactionListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [ledgerPersonListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey] });
      queryClient.invalidateQueries({ queryKey: [bankInfoListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [mfsUserListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [financialTransactionQueryKey] });
      queryClient.invalidateQueries({ queryKey: [dashboardQueryKey] });
      queryClient.invalidateQueries({ queryKey: [financeDashboardQueryKey] });

      showSuccessToast(data.msg || "Transaction deleted successfully and balance restored");
      callbacks?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      showErrorToast(error?.message || "Failed to delete transaction");
      callbacks?.onError?.(error, variables, context);
    },
    onSettled: callbacks?.onSettled,
  });
};

/**
 * 9. Delete all transactions of a person mutation
 */
export const useDeleteAllTransactionsOfPersonMutation = (
  callbacks?: LedgerMutationCallbacks<{ success: boolean; deletedCount: number; message: string }, number>
) => {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; deletedCount: number; message: string }, Error, number>({
    mutationFn: deleteAllTransactionsOfPerson,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [ledgerTransactionListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [ledgerPersonListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey] });
      queryClient.invalidateQueries({ queryKey: [bankInfoListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [mfsUserListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [financialTransactionQueryKey] });
      queryClient.invalidateQueries({ queryKey: [dashboardQueryKey] });
      queryClient.invalidateQueries({ queryKey: [financeDashboardQueryKey] });

      showSuccessToast(data.message || "সকল লেনদেন সফলভাবে ডিলিট করা হয়েছে");
      callbacks?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      showErrorToast(error?.message || "লেনদেনগুলো ডিলিট করতে সমস্যা হয়েছে");
      callbacks?.onError?.(error, variables, context);
    },
    onSettled: callbacks?.onSettled,
  });
};

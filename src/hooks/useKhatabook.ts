import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import {
  ledgerPersonListQueryKey,
  ledgerTransactionListQueryKey,
  cashBalanceQueryKey,
  bankInfoListQueryKey,
  mfsUserListQueryKey,
} from "@/config/query-key";
import {
  fetchLedgerPersonList,
  saveLedgerPerson,
  deleteLedgerPerson,
  fetchLedgerTransactionList,
  createLedgerTransaction,
  updateLedgerTransaction,
  deleteLedgerTransaction,
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
  options?: Omit<UseQueryOptions<LedgerPersonListResponse, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<LedgerPersonListResponse, Error>({
    queryKey: [ledgerPersonListQueryKey],
    queryFn: fetchLedgerPersonList,
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
 * 3. Combined hook for Khatabook dashboard with pre-aggregated person balances
 */
export const useKhatabookDashboardQuery = () => {
  const personsQuery = useLedgerPersonsQuery();
  const allTransactionsQuery = useLedgerTransactionsQuery(null);

  const rawPersons: LedgerPerson[] = personsQuery.data?.data || [];
  const allTransactions: LedgerTransaction[] = allTransactionsQuery.data?.data || [];

  const enrichedPersons = enrichPersonsWithTransactions(rawPersons, allTransactions);

  let totalPabo = 0;
  let totalDibo = 0;

  for (const person of enrichedPersons) {
    if ((person.netBalance ?? 0) > 0) {
      totalPabo += person.netBalance!;
    } else if ((person.netBalance ?? 0) < 0) {
      totalDibo += Math.abs(person.netBalance!);
    }
  }

  const netBalance = totalPabo - totalDibo;

  const isLoading = personsQuery.isLoading || allTransactionsQuery.isLoading;
  const isFetching = personsQuery.isFetching || allTransactionsQuery.isFetching;
  const isError = personsQuery.isError || allTransactionsQuery.isError;
  const error = personsQuery.error || allTransactionsQuery.error;

  const refetch = async () => {
    await Promise.all([personsQuery.refetch(), allTransactionsQuery.refetch()]);
  };

  return {
    persons: enrichedPersons,
    allTransactions,
    kpi: {
      totalPersons: enrichedPersons.length,
      totalPabo,
      totalDibo,
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
      showSuccessToast(data.msg || "Person deleted successfully");
      callbacks?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      showErrorToast(error?.message || "Failed to delete person");
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
      // If transaction affects CASH, BANK, or MFS balance, invalidate financial balances
      queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey] });
      queryClient.invalidateQueries({ queryKey: [bankInfoListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [mfsUserListQueryKey] });

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

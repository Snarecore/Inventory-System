import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { bankInfoListQueryKey, bankNameListQueryKey } from "@/config/query-key";
import {
  fetchBankInfoList,
  fetchBankNameList,
  insertBankAccount,
  updateBankAccount,
} from "@/services/bank-service";
import type {
  BankInfoListResponse,
  BankNameListResponse,
  InsertBankAccountPayload,
  UpdateBankAccountPayload,
  BankAccountActionResponse,
} from "@/types";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";

export interface BankMutationCallbacks<TData = BankAccountActionResponse, TVariables = unknown> {
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
 * Hook to fetch registered bank accounts
 */
export const useBankInfoListQuery = (
  options?: Omit<UseQueryOptions<BankInfoListResponse, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<BankInfoListResponse, Error>({
    queryKey: [bankInfoListQueryKey],
    queryFn: fetchBankInfoList,
    refetchOnWindowFocus: false,
    ...options,
  });
};

/**
 * Hook to fetch master bank names directory
 */
export const useBankNameListQuery = (
  options?: Omit<UseQueryOptions<BankNameListResponse, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<BankNameListResponse, Error>({
    queryKey: [bankNameListQueryKey],
    queryFn: fetchBankNameList,
    staleTime: 30 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to insert a new bank account
 */
export const useInsertBankAccountMutation = (
  options?: BankMutationCallbacks<BankAccountActionResponse, InsertBankAccountPayload>
) => {
  const queryClient = useQueryClient();

  return useMutation<BankAccountActionResponse, Error, InsertBankAccountPayload>({
    mutationFn: insertBankAccount,
    onSuccess: async (data, variables, context) => {
      // 1. Optimistic Cache Update: Immediately place the new account into the cache
      queryClient.setQueryData<BankInfoListResponse>([bankInfoListQueryKey], (old) => {
        if (!old) return old;
        const newAccount = {
          bankId: Date.now(),
          bankName: variables.bankName,
          bankAccountName: variables.bankAccountName,
          accountNo: variables.accountNo,
          branchName: "",
          currentBalance: Number(variables.openingBalance || 0),
          openingBalance: Number(variables.openingBalance || 0),
          status: variables.status || "Active",
          hasCard: Boolean(variables.hasCard),
          cardType: variables.cardType || null,
          cardNumber: variables.cardNumber || null,
          balanceDate: variables.balanceDate || "",
          transactionDate: variables.transactionDate || variables.balanceDate || "",
        };
        const currentList = Array.isArray(old.bankAccounts) ? old.bankAccounts : [];
        return {
          ...old,
          bankAccounts: [newAccount, ...currentList],
        };
      });

      // 2. Invalidate and refetch all queries
      await queryClient.invalidateQueries({
        queryKey: [bankInfoListQueryKey],
      });

      showSuccessToast(data?.msg || "Bank account created successfully!");
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      showErrorToast(error?.message || "Failed to create bank account");
      options?.onError?.(error, variables, context);
    },
  });
};

/**
 * Hook to update an existing bank account
 */
export const useUpdateBankAccountMutation = (
  options?: BankMutationCallbacks<BankAccountActionResponse, UpdateBankAccountPayload>
) => {
  const queryClient = useQueryClient();

  return useMutation<BankAccountActionResponse, Error, UpdateBankAccountPayload>({
    mutationFn: updateBankAccount,
    onSuccess: async (data, variables, context) => {
      // 1. Optimistic Cache Update: Immediately update account in the cache
      queryClient.setQueryData<BankInfoListResponse>([bankInfoListQueryKey], (old) => {
        if (!old) return old;
        const currentList = Array.isArray(old.bankAccounts) ? old.bankAccounts : [];
        const updatedList = currentList.map((acc) => {
          if (
            String(acc.bankId) === String(variables.bankId) ||
            Number(acc.bankId) === Number(variables.bankId)
          ) {
            const nextBal =
              variables.currentBalance !== undefined
                ? Number(variables.currentBalance)
                : variables.openingBalance !== undefined
                ? Number(variables.openingBalance)
                : acc.currentBalance;
            return {
              ...acc,
              bankName: variables.bankName,
              bankAccountName: variables.bankAccountName,
              accountNo: variables.accountNo,
              currentBalance: nextBal,
              balance: nextBal,
              openingBalance:
                variables.openingBalance !== undefined
                  ? Number(variables.openingBalance)
                  : acc.openingBalance,
              status: variables.status || "Active",
              hasCard: Boolean(variables.hasCard),
              cardType: variables.cardType || null,
              cardNumber: variables.cardNumber || null,
              balanceDate: variables.balanceDate || acc.balanceDate,
              transactionDate: variables.transactionDate || variables.balanceDate || acc.transactionDate,
            };
          }
          return acc;
        });
        return {
          ...old,
          bankAccounts: updatedList,
        };
      });

      // 2. Invalidate and refetch all queries
      await queryClient.invalidateQueries({
        queryKey: [bankInfoListQueryKey],
      });

      showSuccessToast(data?.msg || "Bank account updated successfully!");
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      showErrorToast(error?.message || "Failed to update bank account");
      options?.onError?.(error, variables, context);
    },
  });
};

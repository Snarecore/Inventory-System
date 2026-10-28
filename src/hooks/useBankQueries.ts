import { useQuery, useMutation, useQueryClient, type UseQueryOptions, type UseMutationOptions } from "@tanstack/react-query";
import { bankInfoListQueryKey, bankNameListQueryKey } from "@/config/query-key";
import {
  fetchBankInfoList,
  fetchBankNameList,
  insertBankAccount,
} from "@/services/bank-service";
import type {
  BankInfoListResponse,
  BankNameListResponse,
  InsertBankAccountPayload,
  BankAccountActionResponse,
} from "@/types";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";

/**
 * Hook to fetch registered bank accounts (/get-bank-info-list)
 */
export const useBankInfoListQuery = (
  options?: Omit<UseQueryOptions<BankInfoListResponse, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<BankInfoListResponse, Error>({
    queryKey: [bankInfoListQueryKey],
    queryFn: fetchBankInfoList,
    staleTime: 0,
    refetchOnMount: "always",
    ...options,
  });
};

/**
 * Hook to fetch master bank names directory (/get-bank-name-list)
 */
export const useBankNameListQuery = (
  options?: Omit<UseQueryOptions<BankNameListResponse, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<BankNameListResponse, Error>({
    queryKey: [bankNameListQueryKey],
    queryFn: fetchBankNameList,
    staleTime: 30 * 60 * 1000, // 30 mins staleTime for static master list
    ...options,
  });
};

/**
 * Hook to insert a new bank account (/insert-bank-account)
 */
export const useInsertBankAccountMutation = (
  options?: UseMutationOptions<BankAccountActionResponse, Error, InsertBankAccountPayload>
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
          transactionDate: variables.transactionDate || "",
        };
        const currentList = Array.isArray(old.bankAccounts) ? old.bankAccounts : [];
        return {
          ...old,
          bankAccounts: [newAccount, ...currentList],
        };
      });

      // 2. Invalidate and refetch all queries across all components
      await queryClient.invalidateQueries({
        queryKey: [bankInfoListQueryKey],
        refetchType: "all",
      });

      showSuccessToast(data?.msg || "Bank account created successfully!");
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      showErrorToast(error?.message || "Failed to create bank account");
      options?.onError?.(error, variables, context);
    },
    ...options,
  });
};

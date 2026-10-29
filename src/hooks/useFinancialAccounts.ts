import { useMemo } from "react";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { bankInfoListQueryKey, mfsUserListQueryKey } from "@/config/query-key";
import { fetchBankInfoList } from "@/services/bank-service";
import { fetchMfsUserList } from "@/services/mfs-service";
import type { BankAccountItem, MfsUserItem } from "@/types";

export type { BankAccountItem, MfsUserItem };
export type MfsAccountItem = MfsUserItem;

/**
 * Standardized parser for bank accounts response.
 * Uses strict BankAccountItem fields from backend.
 */
export const extractBankAccounts = (raw: any): BankAccountItem[] => {
  if (!raw) return [];
  const list: any[] = Array.isArray(raw?.bankAccounts)
    ? raw.bankAccounts
    : Array.isArray(raw?.data?.bankAccounts)
    ? raw.data.bankAccounts
    : Array.isArray(raw)
    ? raw
    : [];

  return list.map((b: any) => ({
    bankId: Number(b.bankId || b.id || 0),
    bankName: b.bankName || "",
    bankAccountName: b.bankAccountName || "",
    accountNo: b.accountNo || "",
    branchName: b.branchName || "",
    currentBalance: Number(b.currentBalance ?? 0),
    openingBalance: Number(b.openingBalance ?? 0),
    status: b.status ? String(b.status).trim() : "Inactive",
    hasCard: Boolean(b.hasCard),
    cardType: b.cardType || null,
    cardNumber: b.cardNumber || null,
    balanceDate: b.balanceDate,
    transactionDate: b.transactionDate,
  }));
};

/**
 * Standardized parser for MFS accounts response.
 * Uses strict MfsUserItem fields from backend.
 */
export const extractMfsAccounts = (raw: any): MfsUserItem[] => {
  if (!raw) return [];
  const list: any[] = Array.isArray(raw?.mfsUsers)
    ? raw.mfsUsers
    : Array.isArray(raw?.data?.mfsUsers)
    ? raw.data.mfsUsers
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw)
    ? raw
    : [];

  return list.map((m: any) => ({
    id: Number(m.id || 0),
    name: m.name || "",
    phoneNumber: m.phoneNumber || "",
    method: m.method || "",
    openingBalance: Number(m.openingBalance ?? 0),
    currentBalance: Number(m.currentBalance ?? 0),
    status: m.status ? String(m.status).trim() : "Inactive",
  }));
};

// Aliases forwarding to the single source of truth services
export const fetchBankAccounts = fetchBankInfoList;
export const fetchMfsAccounts = fetchMfsUserList;

export const useBankAccountsQuery = (
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [bankInfoListQueryKey],
    queryFn: fetchBankInfoList,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    ...options,
  });
};

// Enterprise standard hook for fetching and caching MFS Accounts. Defaults to real-time refetching on mount and window focus.

export const useMfsAccountsQuery = (
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [mfsUserListQueryKey],
    queryFn: fetchMfsUserList,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    ...options,
  });
};

export interface UseFinancialAccountsOptions {
  bankOptions?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">;
  mfsOptions?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">;
}

  // Composite hook that provides normalized Bank and MFS accounts with shared caching.

export const useFinancialAccounts = (options?: UseFinancialAccountsOptions) => {
  const bankQuery = useBankAccountsQuery(options?.bankOptions);
  const mfsQuery = useMfsAccountsQuery(options?.mfsOptions);

  const registeredBankAccounts = useMemo(() => {
    return extractBankAccounts(bankQuery.data);
  }, [bankQuery.data]);

  const registeredMfsAccounts = useMemo(() => {
    return extractMfsAccounts(mfsQuery.data);
  }, [mfsQuery.data]);

  return {
    registeredBankAccounts,
    registeredMfsAccounts,
    bankQuery,
    mfsQuery,
    isLoading: bankQuery.isLoading || mfsQuery.isLoading,
  };
};

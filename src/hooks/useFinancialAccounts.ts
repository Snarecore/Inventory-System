import { useMemo } from "react";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { bankInfoListQueryKey, mfsUserListQueryKey } from "@/config/query-key";
import { fetchBankInfoList } from "@/services/bank-service";
import { fetchMfsUserList } from "@/services/mfs-service";
import type { BankAccountItem as ServiceBankAccountItem, MfsUserItem } from "@/types";

export interface BankAccountItem {
  id?: string | number;
  bankId?: string | number;
  bankName?: string;
  accountNo?: string;
  bankAccountName?: string;
  branchName?: string;
  balance?: number;
  currentBalance?: number;
  status?: string;
  [key: string]: any;
}

export interface MfsAccountItem {
  id?: string | number;
  mfsId?: string | number;
  mfsName?: string;
  mfsPhone?: string;
  phone?: string;
  accountNo?: string;
  balance?: number;
  currentBalance?: number;
  status?: string;
  [key: string]: any;
}

// Standardized parser for bank accounts response.
export const extractBankAccounts = (raw: any): BankAccountItem[] => {
  if (!raw) return [];
  const list: any[] = Array.isArray(raw?.bankAccounts)
    ? raw.bankAccounts
    : Array.isArray(raw?.bankInfoList)
    ? raw.bankInfoList
    : Array.isArray(raw?.data?.bankAccounts)
    ? raw.data.bankAccounts
    : Array.isArray(raw)
    ? raw
    : [];

  return list.map((b: any) => ({
    ...b,
    id: b.id ?? b.bankId ?? b._id,
    bankId: b.bankId ?? b.id ?? b._id,
    bankName: b.bankName || b.name || "Bank",
    accountNo: b.accountNo || b.accountNumber || b.bankAccountNumber || b.bankAccountNo || "-",
    bankAccountName: b.bankAccountName || b.accountName || "-",
    balance: Number(b.currentBalance ?? b.balance ?? b.openingBalance ?? 0),
    currentBalance: Number(b.currentBalance ?? b.balance ?? b.openingBalance ?? 0),
    status: b.status || "Active",
  }));
};

// Standardized parser for MFS accounts response.
export const extractMfsAccounts = (raw: any): MfsAccountItem[] => {
  if (!raw) return [];
  const list: any[] = Array.isArray(raw?.mfsUsers)
    ? raw.mfsUsers
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.data?.mfsUsers)
    ? raw.data.mfsUsers
    : Array.isArray(raw)
    ? raw
    : [];

  return list.map((m: any) => ({
    ...m,
    id: m.id ?? m.mfsId ?? m._id,
    mfsId: m.id ?? m.mfsId ?? m._id,
    mfsName: m.method || m.name || "bKash",
    mfsPhone: m.phoneNumber || m.phone || m.mfsPhone || "",
    phone: m.phoneNumber || m.phone || m.mfsPhone || "",
    accountNo: m.phoneNumber || m.phone || m.accountNo || "",
    balance: Number(m.currentBalance ?? m.balance ?? m.openingBalance ?? 0),
    currentBalance: Number(m.currentBalance ?? m.balance ?? m.openingBalance ?? 0),
    status: m.status || "Active",
  }));
};

// Aliases forwarding to the single source of truth services
export const fetchBankAccounts = fetchBankInfoList;
export const fetchMfsAccounts = fetchMfsUserList;

/**
 * Enterprise standard hook for fetching and caching Bank Accounts.
 * Defaults to real-time refetching on mount and window focus.
 */
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

/**
 * Enterprise standard hook for fetching and caching MFS Accounts.
 * Defaults to real-time refetching on mount and window focus.
 */
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

/**
 * Composite hook that provides normalized Bank and MFS accounts with shared caching.
 */
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

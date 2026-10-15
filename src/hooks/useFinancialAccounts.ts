import { useMemo } from "react";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { postData } from "@/services/api-service";
import apiConfig from "@/config/api.json";
import { bankInfoListQueryKey, mfsUserListQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";

export interface BankAccountItem {
  id?: string | number;
  bankId?: string | number;
  _id?: string | number;
  bankName?: string;
  bank_name?: string;
  name?: string;
  accountNo?: string;
  account_no?: string;
  accountNumber?: string;
  bankAccountNumber?: string;
  bankAccountNo?: string;
  branchName?: string;
  branch_name?: string;
  balance?: number;
  status?: string;
  [key: string]: any;
}

export interface MfsAccountItem {
  id?: string | number;
  mfsId?: string | number;
  _id?: string | number;
  mfsName?: string;
  mfs_name?: string;
  name?: string;
  mfsPhone?: string;
  mfs_phone?: string;
  phone?: string;
  accountNo?: string;
  status?: string;
  [key: string]: any;
}

// Standardized parser for bank accounts response.

export const extractBankAccounts = (raw: any): BankAccountItem[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") {
    if (Array.isArray(raw.bankAccounts)) return raw.bankAccounts;
    if (Array.isArray(raw.bankInfoList)) return raw.bankInfoList;
    if (Array.isArray(raw.bankList)) return raw.bankList;
    if (Array.isArray(raw.data)) return raw.data;
    if (raw.data && typeof raw.data === "object") {
      if (Array.isArray(raw.data.bankAccounts)) return raw.data.bankAccounts;
      if (Array.isArray(raw.data.bankInfoList)) return raw.data.bankInfoList;
      if (Array.isArray(raw.data.bankList)) return raw.data.bankList;
    }
  }
  return [];
};

// Standardized parser for MFS accounts response.

export const extractMfsAccounts = (raw: any): MfsAccountItem[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") {
    if (Array.isArray(raw.mfsUsers)) return raw.mfsUsers;
    if (Array.isArray(raw.mfsUserList)) return raw.mfsUserList;
    if (Array.isArray(raw.mfsList)) return raw.mfsList;
    if (Array.isArray(raw.data)) return raw.data;
    if (raw.data && typeof raw.data === "object") {
      if (Array.isArray(raw.data.mfsUsers)) return raw.data.mfsUsers;
      if (Array.isArray(raw.data.mfsUserList)) return raw.data.mfsUserList;
      if (Array.isArray(raw.data.mfsList)) return raw.data.mfsList;
    }
  }
  return [];
};

// Centralized fetcher for registered Bank Accounts.

export const fetchBankAccounts = async (): Promise<any> => {
  try {
    const bankInfoListUrl = apiConfig.bank?.bankInfoListUrl || "get-bank-info-list";
    const accessUser = buildAccessUser();
    const res = await postData<any>({
      url: bankInfoListUrl,
      body: { accessUser },
    });
    return res;
  } catch (error) {
    console.error("Failed to fetch bank accounts:", error);
    return null;
  }
};

/**
 * Centralized fetcher for registered MFS Accounts.
 */
export const fetchMfsAccounts = async (): Promise<any> => {
  try {
    const mfsUserListUrl = apiConfig.mfs?.mfsUserListUrl || "mfs-user-list";
    const accessUser = buildAccessUser();
    const res = await postData<any>({
      url: mfsUserListUrl,
      body: { accessUser },
    });
    return res;
  } catch (error) {
    console.error("Failed to fetch MFS accounts:", error);
    return null;
  }
};

/**
 * Enterprise standard hook for fetching and caching Bank Accounts.
 * Shared across Trade, Purchase, Sale, and Return modules (5-minute staleTime).
 */
export const useBankAccountsQuery = (
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [bankInfoListQueryKey],
    queryFn: fetchBankAccounts,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Enterprise standard hook for fetching and caching MFS Accounts.
 * Shared across Trade, Purchase, Sale, and Return modules (5-minute staleTime).
 */
export const useMfsAccountsQuery = (
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [mfsUserListQueryKey],
    queryFn: fetchMfsAccounts,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Composite hook that provides normalized Bank and MFS accounts with shared caching.
 */
export const useFinancialAccounts = () => {
  const bankQuery = useBankAccountsQuery();
  const mfsQuery = useMfsAccountsQuery();

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

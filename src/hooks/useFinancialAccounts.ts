import { useMemo } from "react";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { postData } from "@/services/api-service";
import apiConfig from "@/config/api.json";
import { bankInfoListQueryKey, mfsUserListQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";

export interface BankAccountItem {
  id?: string | number;
  bankId?: string | number;
  bankName?: string;
  accountNo?: string;
  bankAccountName?: string;
  branchName?: string;
  balance?: number;
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
  status?: string;
  [key: string]: any;
}

// Standardized parser for bank accounts response.
export const extractBankAccounts = (raw: any): BankAccountItem[] => {
  if (!raw) return [];
  let list: any[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === "object") {
    if (Array.isArray(raw.bankAccounts)) list = raw.bankAccounts;
    else if (Array.isArray(raw.bankInfoList)) list = raw.bankInfoList;
    else if (Array.isArray(raw.bankList)) list = raw.bankList;
    else if (Array.isArray(raw.data)) list = raw.data;
    else if (raw.data && typeof raw.data === "object") {
      if (Array.isArray(raw.data.bankAccounts)) list = raw.data.bankAccounts;
      else if (Array.isArray(raw.data.bankInfoList)) list = raw.data.bankInfoList;
      else if (Array.isArray(raw.data.bankList)) list = raw.data.bankList;
    }
  }

  return list.map((b: any) => ({
    ...b,
    id: b.id ?? b.bankId ?? b._id,
    bankName: b.bankName || b.name || "Bank",
    accountNo: b.accountNo || b.accountNumber || b.bankAccountNumber || b.bankAccountNo || "",
    bankAccountName: b.bankAccountName || b.accountName || "",
  }));
};

// Standardized parser for MFS accounts response.
export const extractMfsAccounts = (raw: any): MfsAccountItem[] => {
  if (!raw) return [];
  let list: any[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === "object") {
    if (Array.isArray(raw.mfsUsers)) list = raw.mfsUsers;
    else if (Array.isArray(raw.mfsUserList)) list = raw.mfsUserList;
    else if (Array.isArray(raw.mfsList)) list = raw.mfsList;
    else if (Array.isArray(raw.data)) list = raw.data;
    else if (raw.data && typeof raw.data === "object") {
      if (Array.isArray(raw.data.mfsUsers)) list = raw.data.mfsUsers;
      else if (Array.isArray(raw.data.mfsUserList)) list = raw.data.mfsUserList;
      else if (Array.isArray(raw.data.mfsList)) list = raw.data.mfsList;
    }
  }

  return list.map((m: any) => ({
    ...m,
    id: m.id ?? m.mfsId ?? m._id,
    mfsName: m.mfsName || m.name || m.method || "bKash",
    mfsPhone: m.mfsPhone || m.phoneNumber || m.phone || m.mobileNo || "",
  }));
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

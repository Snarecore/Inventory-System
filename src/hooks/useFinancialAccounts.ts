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

  return list.map((b: any) => {
    const bankId = Number(b.bankId || b.id || 0);
    return {
      id: bankId,
      bankId,
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
    };
  });
};


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

  return list.map((m: any) => {
    const id = Number(m.id ?? m.mfsId ?? 0);
    const method = m.method || m.mfsMethod || m.provider || "";
    const name = m.name || m.accountName || "";
    const phone = m.phoneNumber || m.phone || m.mfsPhone || "";
    const mfsName = method ? `${method}${name && name !== "-" ? ` (${name})` : ""}` : name || "MFS";
    return {
      id,
      mfsId: id,
      name: name || "-",
      phoneNumber: phone,
      phone,
      mfsPhone: phone,
      method,
      mfsName,
      openingBalance: Number(m.openingBalance ?? 0),
      currentBalance: Number(m.currentBalance ?? m.balance ?? 0),
      status: m.status ? String(m.status).trim() : "Inactive",
    };
  });
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

// Enterprise standard hook for fetching and caching MFS Accounts.
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

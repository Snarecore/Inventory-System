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
    const opening = Number(m.openingBalance ?? m.opening_balance ?? 0);
    const current = Number(m.currentBalance ?? m.current_balance ?? m.balance ?? m.amount ?? opening);
    const rawStatus = m.status !== undefined && m.status !== null ? String(m.status).trim() : "Active";
    return {
      id,
      mfsId: id,
      name: name || "-",
      phoneNumber: phone,
      phone,
      mfsPhone: phone,
      method,
      mfsName,
      openingBalance: opening,
      currentBalance: current,
      status: rawStatus || "Active",
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
    refetchOnWindowFocus: false,
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
    refetchOnWindowFocus: false,
    ...options,
  });
};

export interface UseFinancialAccountsOptions {
  bankOptions?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">;
  mfsOptions?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">;
}

export const isAccountActive = (acc: { status?: string | number | null } | null | undefined): boolean => {
  const s = String(acc?.status ?? "").toLowerCase().trim();
  return s === "active" || s === "1" || s === "y" || s === "true" || !s;
};

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

  const activeBankAccounts = useMemo(
    () => registeredBankAccounts.filter(isAccountActive),
    [registeredBankAccounts]
  );

  const activeMfsAccounts = useMemo(
    () => registeredMfsAccounts.filter(isAccountActive),
    [registeredMfsAccounts]
  );

  return {
    registeredBankAccounts,
    registeredMfsAccounts,
    activeBankAccounts,
    activeMfsAccounts,
    bankQuery,
    mfsQuery,
    isLoading: bankQuery.isLoading || mfsQuery.isLoading,
  };
};

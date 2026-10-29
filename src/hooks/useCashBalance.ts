import { useQuery } from "@tanstack/react-query";
import apiConfig from "@/config/api.json";
import { cashBalanceQueryKey } from "@/config/query-key";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";

export interface CashBalanceRecord {
  id?: string | number;
  currentBalance?: number | string;
  [key: string]: any;
}

/**
 * Single source of truth fetcher for Cash Balance (/get-cash-balance-info).
 * Sums up currentBalance across all active cash registers/drawers.
 */
export const fetchCashBalance = async (): Promise<number> => {
  try {
    const endpoint = apiConfig.finance?.getCashBalanceInfoUrl || "get-cash-balance-info";
    const res: any = await postData({
      url: endpoint,
      body: { accessUser: buildAccessUser() },
    });

    const rows =
      res?.status === "Success" || res?.success
        ? (Array.isArray(res?.data) ? res.data : Array.isArray(res?.cashBalanceList) ? res.cashBalanceList : [])
        : [];

    if (!Array.isArray(rows) || rows.length === 0) {
      const singleNum = Number(res?.currentBalance ?? res?.cashBalance ?? 0);
      return !isNaN(singleNum) ? singleNum : 0;
    }

    const total = rows.reduce((sum: number, r: CashBalanceRecord) => {
      const val = Number(r?.currentBalance || 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    return total;
  } catch (error) {
    console.error("Failed to fetch cash balance:", error);
    return 0;
  }
};

/**
 * TanStack Query Hook for live Cash Balance
 */
export const useCashBalanceQuery = (
  options?: Omit<import("@tanstack/react-query").UseQueryOptions<number, Error>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [cashBalanceQueryKey],
    queryFn: fetchCashBalance,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    ...options,
  });
};


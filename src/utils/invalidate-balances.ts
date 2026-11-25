import { queryClient } from "@/api/query-client";
import {
  cashBalanceQueryKey,
  bankInfoListQueryKey,
  mfsUserListQueryKey,
  userDashboardQueryKey,
  dashboardQueryKey,
  financeDashboardQueryKey,
  financialTransactionQueryKey,
} from "@/config/query-key";

/**
 * Event-driven cache invalidation for all live financial balances (Cash, Bank, MFS, Dashboard).
 * Refetches currently mounted balance queries immediately and marks unmounted ones stale so
 * they refresh once when visited—zero background polling or redundant API calls.
 */
export const invalidateFinancialBalances = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey] }),
    queryClient.invalidateQueries({ queryKey: [bankInfoListQueryKey] }),
    queryClient.invalidateQueries({ queryKey: [mfsUserListQueryKey] }),
    queryClient.invalidateQueries({ queryKey: [userDashboardQueryKey] }),
    queryClient.invalidateQueries({ queryKey: [dashboardQueryKey] }),
    queryClient.invalidateQueries({ queryKey: [financeDashboardQueryKey] }),
    queryClient.invalidateQueries({ queryKey: [financialTransactionQueryKey] }),
  ]);

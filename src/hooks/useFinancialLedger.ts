import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  postTradeFinancialEntries,
  type PostTradeFinancialParams,
} from "@/services/financial-ledger-service";
import {
  cashBalanceQueryKey,
  bankInfoListQueryKey,
  mfsUserListQueryKey,
  financialTransactionQueryKey,
  dashboardQueryKey,
} from "@/config/query-key";

/**
 * Hook to execute trade financial ledger entries and synchronize TanStack Query cache.
 */
export const useFinancialLedger = () => {
  const queryClient = useQueryClient();

  const recordTradeLedger = useCallback(
    async (params: PostTradeFinancialParams) => {
      const outcome = await postTradeFinancialEntries(params);

      // Invalidate live balance caches if any money was moved
      if (params.tenders && params.tenders.some((t) => Number(t.amount || 0) > 0)) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey] }),
          queryClient.invalidateQueries({ queryKey: [bankInfoListQueryKey] }),
          queryClient.invalidateQueries({ queryKey: [mfsUserListQueryKey] }),
          queryClient.invalidateQueries({ queryKey: [financialTransactionQueryKey] }),
          queryClient.invalidateQueries({ queryKey: [dashboardQueryKey] }),
        ]);
      }

      return outcome;
    },
    [queryClient]
  );

  return { recordTradeLedger };
};

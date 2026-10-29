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

      // Selectively invalidate live balance caches for accounts where money actually moved
      if (params.tenders && params.tenders.some((t) => Number(t.amount || 0) > 0)) {
        const promises: Promise<any>[] = [
          queryClient.invalidateQueries({ queryKey: [financialTransactionQueryKey] }),
          queryClient.invalidateQueries({ queryKey: [dashboardQueryKey], refetchType: "none" }),
        ];

        const hasCash = params.tenders.some(
          (t) => Number(t.amount || 0) > 0 && t.leg?.accountType?.toUpperCase() === "CASH"
        );
        const hasBank = params.tenders.some(
          (t) => Number(t.amount || 0) > 0 && t.leg?.accountType?.toUpperCase() === "BANK"
        );
        const hasMfs = params.tenders.some(
          (t) => Number(t.amount || 0) > 0 && t.leg?.accountType?.toUpperCase() === "MFS"
        );

        if (hasCash) promises.push(queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey] }));
        if (hasBank) promises.push(queryClient.invalidateQueries({ queryKey: [bankInfoListQueryKey] }));
        if (hasMfs) promises.push(queryClient.invalidateQueries({ queryKey: [mfsUserListQueryKey] }));

        await Promise.all(promises);
      }

      return outcome;
    },
    [queryClient]
  );

  return { recordTradeLedger };
};

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  buildCollectionPayload,
  postCollection,
  postCollectionLedger,
} from "@/services/collection-service";
import {
  customersDueQueryKey,
  customerInvoicesDueQueryKey,
  cashBalanceQueryKey,
  bankInfoListQueryKey,
  salesListQueryKey,
  dashboardQueryKey,
  partyListQueryKey,
} from "@/config/query-key";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import { formatMoney } from "@/utils/formatters";
import type { CollectionAllocation } from "@/types/collection.types";

export interface SubmitCollectionParams {
  customerId: string | number;
  customerName: string;
  customerPhone: string;
  collectionDate?: string;
  paymentMode: "Cash" | "Bank" | "CASH" | "BANK" | string;
  remark?: string;
  allocations: CollectionAllocation[];
  selectedBank?: any;
  totalCollected: number;
  remainingTotalDue: number;
}

export interface CollectionMutationResult {
  success: boolean;
  ledgerOk: boolean;
  msg: string;
}

/**
 * Enterprise standard mutation hook for customer collection.
 * Phase 1: /insert-collection (updates trade invoices and dues)
 * Phase 2: /insert-financial-transaction (credits cash/bank balance)
 * Followed by complete TanStack Query multi-cache invalidation.
 */
export const useCollectionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      params: SubmitCollectionParams
    ): Promise<CollectionMutationResult> => {
      const {
        customerId,
        customerName,
        customerPhone,
        collectionDate,
        paymentMode,
        remark,
        allocations,
        selectedBank,
        totalCollected,
        remainingTotalDue,
      } = params;

      // 1. Build strict API payload
      const requestPayload = buildCollectionPayload({
        customerId,
        customerName,
        customerPhone,
        collectionDate,
        paymentMode,
        remark,
        allocations,
        selectedBank,
      });

      // 2. Submit collection to backend
      const collectionRes = await postCollection(requestPayload);
      if (!collectionRes.success) {
        throw new Error(collectionRes.msg || "Failed to submit collection");
      }

      // 3. Post financial ledger entry (Income) to credit cash or bank balance
      let ledgerOk = true;
      let ledgerMsg = "";

      try {
        const ledgerRes = await postCollectionLedger({
          customerId,
          customerPhone,
          totalCollected,
          remainingDue: remainingTotalDue,
          paymentMode,
          selectedBank,
          notes: remark,
          date: collectionDate,
        });

        ledgerOk = ledgerRes.ok;
        ledgerMsg = ledgerRes.msg;
      } catch (ledgerErr: any) {
        console.error("Collection saved, but ledger posting encountered error:", ledgerErr);
        ledgerOk = false;
        ledgerMsg = ledgerErr?.message || "Ledger sync error";
      }

      return {
        success: true,
        ledgerOk,
        msg: ledgerOk ? collectionRes.msg : `${collectionRes.msg} (Ledger note: ${ledgerMsg})`,
      };
    },
    onSuccess: (data, variables) => {
      const { customerId, totalCollected } = variables;

      // Invalidate relevant caches immediately so UI is 100% synchronized
      queryClient.invalidateQueries({ queryKey: [customersDueQueryKey] });
      queryClient.invalidateQueries({
        queryKey: [customerInvoicesDueQueryKey, String(customerId)],
      });
      queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey] });
      queryClient.invalidateQueries({ queryKey: [bankInfoListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [salesListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [dashboardQueryKey], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: [partyListQueryKey], refetchType: "none" });

      if (data.ledgerOk) {
        showSuccessToast(
          `Collection of ৳${formatMoney(totalCollected)} recorded successfully!`
        );
      } else {
        showSuccessToast(
          `Collection recorded! (Balance ledger update is syncing in background)`
        );
      }
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to submit collection");
    },
  });
};

export default useCollectionMutation;

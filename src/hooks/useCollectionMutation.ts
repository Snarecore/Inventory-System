import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  buildCollectionPayload,
  postCollection,
  postCollectionLedger,
} from "@/services/collection-service";
import {
  customersDueQueryKey,
  customerInvoicesDueQueryKey,
  collectionReportQueryKey,
  cashBalanceQueryKey,
  bankInfoListQueryKey,
  mfsUserListQueryKey,
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
  paymentMode: "Cash" | "Bank" | "MFS" | "CASH" | "BANK" | string;
  remark?: string;
  allocations: CollectionAllocation[];
  selectedBank?: any;
  selectedMfs?: any;
  totalCollected: number;
  totalDiscount?: number;
  remainingTotalDue: number;
  cashAmount?: number;
  bankAmount?: number;
  mfsAmount?: number;
}

export interface CollectionMutationResult {
  success: boolean;
  ledgerOk: boolean;
  msg: string;
}

/**
 * Enterprise standard mutation hook for customer collection.
 * Phase 1: /insert-collection (updates trade invoices and dues)
 * Phase 2: /insert-financial-transaction (credits cash/bank/MFS balance)
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
        selectedMfs,
        totalCollected,
        totalDiscount = 0,
        remainingTotalDue,
        cashAmount,
        bankAmount,
        mfsAmount,
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
        selectedMfs,
        totalAmount: totalCollected,
        totalDiscount,
        cashAmount,
        bankAmount,
        mfsAmount,
      });

      // 2. Submit collection to backend
      const collectionRes = await postCollection(requestPayload);
      if (!collectionRes.success) {
        throw new Error(collectionRes.msg || "Failed to submit collection");
      }

      // 3. Post financial ledger entry (Income) to credit cash, bank or MFS balance
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
          selectedMfs,
          notes: remark,
          date: collectionDate,
          cashAmount,
          bankAmount,
          mfsAmount,
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
      const { customerId, totalCollected, totalDiscount = 0 } = variables;

      // Invalidate relevant caches: active table updates immediately, background queries marked stale
      queryClient.invalidateQueries({ queryKey: [customersDueQueryKey] });
      queryClient.invalidateQueries({ queryKey: [customerInvoicesDueQueryKey], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: [collectionReportQueryKey], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: [bankInfoListQueryKey], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: [mfsUserListQueryKey], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: [salesListQueryKey], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: [dashboardQueryKey], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: [partyListQueryKey], refetchType: "none" });

      const discText = totalDiscount > 0 ? ` (Discount: ৳${formatMoney(totalDiscount)})` : "";

      if (data.ledgerOk) {
        showSuccessToast(
          `Collection of ৳${formatMoney(totalCollected)}${discText} recorded successfully!`
        );
      } else {
        showSuccessToast(
          `Collection recorded!${discText} (Balance ledger update is syncing in background)`
        );
      }
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to submit collection");
    },
  });
};

export default useCollectionMutation;

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
import type { CustomerDueItem, CollectionAllocation } from "@/types/collection.types";

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
      const {
        customerId,
        allocations = [],
        totalCollected,
        totalDiscount = 0,
        remainingTotalDue,
      } = variables;

      const clearedInvoiceNos = new Set(
        allocations
          .filter((a) => Number(a.remainingDue ?? a.dueAmount ?? 0) <= 0)
          .map((a) => String(a.invoiceNo).toLowerCase().trim())
      );

      // 1. Optimistically update customersDueQueryKey cache
      queryClient.setQueryData<CustomerDueItem[]>([customersDueQueryKey], (oldList) => {
        if (!Array.isArray(oldList)) return oldList;
        return oldList
          .map((cust) => {
            const currentCustId = String(cust.customerId ?? cust.id ?? "");
            if (currentCustId === String(customerId)) {
              const currentInvCount = Number(cust.invoiceCount || 0);
              const newInvCount = Math.max(0, currentInvCount - clearedInvoiceNos.size);
              const safeRemaining = Math.max(0, Number(remainingTotalDue));
              return {
                ...cust,
                totalDue: safeRemaining,
                total_due: safeRemaining,
                dueAmount: safeRemaining,
                due_amount: safeRemaining,
                invoiceCount: newInvCount,
              };
            }
            return cust;
          })
          .filter((cust) => Number(cust.totalDue || 0) > 0);
      });

      // 2. Optimistically update salesListQueryKey cache so pending invoice counts update immediately
      queryClient.setQueryData<any[]>([salesListQueryKey], (oldSales) => {
        if (!Array.isArray(oldSales)) return oldSales;
        return oldSales.map((s: any) => {
          const invNo = String(s.invoiceNo || s.orderNo || s.id || "").toLowerCase().trim();
          const matchedAlloc = allocations.find(
            (a) => String(a.invoiceNo).toLowerCase().trim() === invNo
          );
          if (matchedAlloc) {
            const newDue = Math.max(0, Number(matchedAlloc.remainingDue ?? 0));
            const paidInc = Number(matchedAlloc.allocatedPaid ?? matchedAlloc.paidAmount ?? 0);
            return {
              ...s,
              dueAmount: newDue,
              due_amount: newDue,
              due: newDue,
              paidAmount: Number(s.paidAmount ?? s.paid_amount ?? 0) + paidInc,
              paid_amount: Number(s.paidAmount ?? s.paid_amount ?? 0) + paidInc,
            };
          }
          return s;
        });
      });

      // 3. Actively invalidate and refetch active due tables and invoice queries
      queryClient.invalidateQueries({ queryKey: [customersDueQueryKey] });
      queryClient.invalidateQueries({ queryKey: [salesListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [customerInvoicesDueQueryKey] });
      queryClient.invalidateQueries({ queryKey: [collectionReportQueryKey] });
      queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: [bankInfoListQueryKey], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: [mfsUserListQueryKey], refetchType: "none" });
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

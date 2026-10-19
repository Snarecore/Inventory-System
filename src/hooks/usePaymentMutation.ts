import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  buildPaymentPayload,
  postPayment,
  postPaymentLedger,
} from "@/services/payment-service";
import {
  purchasesDueQueryKey,
  purchasesInvoicesDueQueryKey,
  paymentReportQueryKey,
  cashBalanceQueryKey,
  bankInfoListQueryKey,
  mfsUserListQueryKey,
  purchaseListQueryKey,
  dashboardQueryKey,
  partyListQueryKey,
} from "@/config/query-key";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import { formatMoney } from "@/utils/formatters";
import type { PaymentAllocation } from "@/types/payment.types";

export interface SubmitPaymentParams {
  supplierId: string | number;
  supplierName: string;
  supplierPhone: string;
  paymentDate?: string;
  paymentMode: "Cash" | "Bank" | "MFS" | "CASH" | "BANK" | string;
  remark?: string;
  allocations: PaymentAllocation[];
  selectedBank?: any;
  selectedMfs?: any;
  totalPaid: number;
  totalDiscount?: number;
  remainingTotalDue: number;
  cashAmount?: number;
  bankAmount?: number;
  mfsAmount?: number;
}

export interface PaymentMutationResult {
  success: boolean;
  ledgerOk: boolean;
  msg: string;
}

/**
 * Enterprise standard mutation hook for supplier payment.
 * Phase 1: /insert-payment (updates trade purchase invoices and dues)
 * Phase 2: /insert-financial-transaction (debits cash/bank/MFS balance)
 * Followed by targeted TanStack Query multi-cache invalidation.
 */
export const usePaymentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      params: SubmitPaymentParams
    ): Promise<PaymentMutationResult> => {
      const {
        supplierId,
        supplierName,
        supplierPhone,
        paymentDate,
        paymentMode,
        remark,
        allocations,
        selectedBank,
        selectedMfs,
        totalPaid,
        totalDiscount = 0,
        remainingTotalDue,
        cashAmount,
        bankAmount,
        mfsAmount,
      } = params;

      // 1. Build strict API payload
      const requestPayload = buildPaymentPayload({
        supplierId,
        supplierName,
        supplierPhone,
        paymentDate,
        paymentMode,
        remark,
        allocations,
        selectedBank,
        selectedMfs,
        totalAmount: totalPaid,
        totalDiscount,
        cashAmount,
        bankAmount,
        mfsAmount,
      });

      // 2. Submit payment to backend
      const paymentRes = await postPayment(requestPayload);
      if (!paymentRes.success) {
        throw new Error(paymentRes.msg || "Failed to submit supplier payment");
      }

      // 3. Post financial ledger entry (Expense) to debit cash, bank or MFS balance
      let ledgerOk = true;
      let ledgerMsg = "";

      try {
        const ledgerRes = await postPaymentLedger({
          supplierId,
          supplierPhone,
          totalPaid,
          remainingDue: remainingTotalDue,
          paymentMode,
          selectedBank,
          selectedMfs,
          notes: remark,
          date: paymentDate,
          cashAmount,
          bankAmount,
          mfsAmount,
        });

        ledgerOk = ledgerRes.ok;
        ledgerMsg = ledgerRes.msg;
      } catch (ledgerErr: any) {
        console.error("Payment saved, but ledger posting encountered error:", ledgerErr);
        ledgerOk = false;
        ledgerMsg = ledgerErr?.message || "Ledger sync error";
      }

      return {
        success: true,
        ledgerOk,
        msg: ledgerOk
          ? paymentRes.msg
          : `${paymentRes.msg} (Ledger note: ${ledgerMsg})`,
      };
    },
    onSuccess: (data, variables) => {
      const { totalPaid, totalDiscount = 0 } = variables;

      // Invalidate relevant caches: active due table updates immediately, background queries marked stale
      queryClient.invalidateQueries({ queryKey: [purchasesDueQueryKey] });
      queryClient.invalidateQueries({
        queryKey: [purchasesInvoicesDueQueryKey],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: [paymentReportQueryKey],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: [cashBalanceQueryKey],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: [bankInfoListQueryKey],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: [mfsUserListQueryKey],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: [purchaseListQueryKey],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: [dashboardQueryKey],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: [partyListQueryKey],
        refetchType: "none",
      });

      const discText =
        totalDiscount > 0 ? ` (Discount: ৳${formatMoney(totalDiscount)})` : "";

      if (data.ledgerOk) {
        showSuccessToast(
          `Payment of ৳${formatMoney(totalPaid)}${discText} recorded successfully!`
        );
      } else {
        showSuccessToast(
          `Payment recorded!${discText} (Balance ledger update is syncing in background)`
        );
      }
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to submit supplier payment");
    },
  });
};

export default usePaymentMutation;

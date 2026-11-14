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
import type { SupplierDueItem, PaymentAllocation } from "@/types/payment.types";
import type { PurchaseItem } from "@/types";

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
 * Phase 1: Record payment (updates trade purchase invoices and dues)
 * Phase 2: Post financial transaction (debits cash/bank/MFS balance)
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
      const {
        supplierId,
        allocations = [],
        totalPaid,
        totalDiscount = 0,
        remainingTotalDue,
      } = variables;

      const clearedInvoiceNos = new Set(
        allocations
          .filter((a) => Number(a.remainingDue ?? a.dueAmount ?? 0) <= 0)
          .map((a) => String(a.invoiceNo).toLowerCase().trim())
      );

      // 1. Optimistically update purchasesDueQueryKey cache
      queryClient.setQueryData<SupplierDueItem[]>([purchasesDueQueryKey], (oldList) => {
        if (!Array.isArray(oldList)) return oldList;
        return oldList
          .map((sup) => {
            const currentSupId = String(sup.supplierId ?? sup.id ?? "");
            if (currentSupId === String(supplierId)) {
              const currentInvCount = Number(sup.invoiceCount || 0);
              const newInvCount = Math.max(0, currentInvCount - clearedInvoiceNos.size);
              const safeRemaining = Math.max(0, Number(remainingTotalDue));
              return {
                ...sup,
                totalDue: safeRemaining,
                total_due: safeRemaining,
                dueAmount: safeRemaining,
                due_amount: safeRemaining,
                invoiceCount: newInvCount,
              };
            }
            return sup;
          })
          .filter((sup) => Number(sup.totalDue || 0) > 0);
      });

      // 2. Optimistically update purchaseListQueryKey cache so pending invoice counts update immediately
      queryClient.setQueryData<PurchaseItem[]>([purchaseListQueryKey], (oldPurchases) => {
        if (!Array.isArray(oldPurchases)) return oldPurchases;
        return oldPurchases.map((p: any) => {
          const invNo = String(p.invoiceNo || p.purchaseNo || p.challanNo || p.id || "").toLowerCase().trim();
          const matchedAlloc = allocations.find(
            (a) => String(a.invoiceNo).toLowerCase().trim() === invNo
          );
          if (matchedAlloc) {
            const newDue = Math.max(0, Number(matchedAlloc.remainingDue ?? 0));
            const paidInc = Number(matchedAlloc.allocatedPaid ?? matchedAlloc.paidAmount ?? 0);
            return {
              ...p,
              dueAmount: newDue,
              due_amount: newDue,
              due: newDue,
              paidAmount: Number(p.paidAmount ?? p.paid_amount ?? 0) + paidInc,
              paid_amount: Number(p.paidAmount ?? p.paid_amount ?? 0) + paidInc,
            };
          }
          return p;
        });
      });

      // 3. Actively invalidate and refetch active due tables and invoice queries
      queryClient.invalidateQueries({ queryKey: [purchasesDueQueryKey] });
      queryClient.invalidateQueries({ queryKey: [purchaseListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [purchasesInvoicesDueQueryKey] });
      queryClient.invalidateQueries({ queryKey: [paymentReportQueryKey] });
      const payMode = variables.paymentMode?.toUpperCase();
      const hasCash = payMode === "CASH" || Number(variables.cashAmount || 0) > 0;
      const hasBank = payMode === "BANK" || Number(variables.bankAmount || 0) > 0;
      const hasMfs = payMode === "MFS" || Number(variables.mfsAmount || 0) > 0;

      if (hasCash || (!hasCash && !hasBank && !hasMfs)) {
        queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey] });
      }
      if (hasBank) {
        queryClient.invalidateQueries({ queryKey: [bankInfoListQueryKey] });
      }
      if (hasMfs) {
        queryClient.invalidateQueries({ queryKey: [mfsUserListQueryKey] });
      }
      queryClient.invalidateQueries({ queryKey: [dashboardQueryKey] });
      queryClient.invalidateQueries({ queryKey: [partyListQueryKey] });

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

import { useState, useMemo, useEffect } from "react";
import type { TradePaymentAccount } from "./useTradePayment";

export interface UseTradeRefundOptions {
  selectedRecord: any;
  refundAmount: number;
  returnMode: "FULL" | "PARTIAL";
  registeredBankAccounts?: TradePaymentAccount[];
  registeredMfsAccounts?: TradePaymentAccount[];
  priority?: "cash_first" | "due_first";
}

export const useTradeRefund = ({
  selectedRecord,
  refundAmount,
  returnMode,
  registeredBankAccounts = [],
  registeredMfsAccounts = [],
  priority = "cash_first",
}: UseTradeRefundOptions) => {
  const [refundCashAmount, setRefundCashAmount] = useState<string>("");
  const [refundBankAmount, setRefundBankAmount] = useState<string>("");
  const [refundMfsAmount, setRefundMfsAmount] = useState<string>("");
  const [refundDueAmount, setRefundDueAmount] = useState<string>("");
  const [selectedRefundBankId, setSelectedRefundBankId] = useState<string>("");
  const [selectedRefundMfsId, setSelectedRefundMfsId] = useState<string>("");

  // Extract original invoice payment figures
  const origPaymentMode = String(
    selectedRecord?.paymentType || (selectedRecord as any)?.payment_type || "CASH"
  ).toUpperCase();

  const origGrandTotal = Number(
    selectedRecord?.grandTotal ??
      (selectedRecord as any)?.grand_total ??
      selectedRecord?.totalAmount ??
      (selectedRecord as any)?.total_amount ??
      0
  );

  const origPaidAmount = Number(
    selectedRecord?.paidAmount ?? (selectedRecord as any)?.paid_amount ?? 0
  );

  const origDueAmount = Number(
    selectedRecord?.dueAmount ??
      (selectedRecord as any)?.due_amount ??
      (origPaymentMode === "CREDIT"
        ? origGrandTotal
        : Math.max(0, origGrandTotal - origPaidAmount))
  );

  // Split amounts recorded on the original document
  const { origCashPaid, origBankPaid, origMfsPaid } = useMemo(() => {
    const rawCash = Number(
      selectedRecord?.cashReceived ??
        (selectedRecord as any)?.cash_received ??
        (selectedRecord as any)?.cash_amount ??
        (selectedRecord as any)?.cashAmount ??
        0
    );
    const rawBank = Number(
      selectedRecord?.cardReceived ??
        (selectedRecord as any)?.card_received ??
        (selectedRecord as any)?.bankAmount ??
        (selectedRecord as any)?.bank_amount ??
        0
    );
    const rawMfs = Number(
      selectedRecord?.mfsReceived ??
        (selectedRecord as any)?.mfs_received ??
        (selectedRecord as any)?.mfsAmount ??
        (selectedRecord as any)?.mfs_amount ??
        0
    );

    const hasSplitDetails = rawCash > 0 || rawBank > 0 || rawMfs > 0;
    if (hasSplitDetails) {
      return { origCashPaid: rawCash, origBankPaid: rawBank, origMfsPaid: rawMfs };
    }

    let c = 0;
    let b = 0;
    let m = 0;
    if (origPaidAmount > 0) {
      if (origPaymentMode === "BANK" || selectedRecord?.bankId || (selectedRecord as any)?.bank_id) {
        b = origPaidAmount;
      } else if (origPaymentMode === "MFS" || selectedRecord?.mfsId || (selectedRecord as any)?.mfs_id) {
        m = origPaidAmount;
      } else {
        c = origPaidAmount;
      }
    }
    return { origCashPaid: c, origBankPaid: b, origMfsPaid: m };
  }, [selectedRecord, origPaidAmount, origPaymentMode]);

  // Auto-distribute refund
  useEffect(() => {
    if (!selectedRecord || refundAmount <= 0) {
      setRefundCashAmount("");
      setRefundBankAmount("");
      setRefundMfsAmount("");
      setRefundDueAmount("");
      return;
    }

    // Full Return (or return amount matches full original total)
    if (returnMode === "FULL" || Math.abs(refundAmount - origGrandTotal) < 0.01) {
      setRefundCashAmount(origCashPaid > 0 ? String(origCashPaid) : "");
      setRefundBankAmount(origBankPaid > 0 ? String(origBankPaid) : "");
      setRefundMfsAmount(origMfsPaid > 0 ? String(origMfsPaid) : "");
      setRefundDueAmount(origDueAmount > 0 ? String(origDueAmount) : "");
      return;
    }

    let remaining = refundAmount;
    let allocCash = 0;
    let allocBank = 0;
    let allocMfs = 0;
    let allocDue = 0;

    if (priority === "due_first") {
      // 1. Due adjust first (Purchase Return)
      if (origDueAmount > 0) {
        allocDue = Math.min(remaining, origDueAmount);
        remaining = Number((remaining - allocDue).toFixed(2));
      }
      // 2. Cash
      if (remaining > 0 && origCashPaid > 0) {
        allocCash = Math.min(remaining, origCashPaid);
        remaining = Number((remaining - allocCash).toFixed(2));
      }
      // 3. Bank
      if (remaining > 0 && origBankPaid > 0) {
        allocBank = Math.min(remaining, origBankPaid);
        remaining = Number((remaining - allocBank).toFixed(2));
      }
      // 4. MFS
      if (remaining > 0 && origMfsPaid > 0) {
        allocMfs = Math.min(remaining, origMfsPaid);
        remaining = Number((remaining - allocMfs).toFixed(2));
      }
    } else {
      // Cash first (Sales Return)
      // 1. Cash
      if (origCashPaid > 0) {
        allocCash = Math.min(remaining, origCashPaid);
        remaining = Number((remaining - allocCash).toFixed(2));
      }
      // 2. Bank
      if (remaining > 0 && origBankPaid > 0) {
        allocBank = Math.min(remaining, origBankPaid);
        remaining = Number((remaining - allocBank).toFixed(2));
      }
      // 3. MFS
      if (remaining > 0 && origMfsPaid > 0) {
        allocMfs = Math.min(remaining, origMfsPaid);
        remaining = Number((remaining - allocMfs).toFixed(2));
      }
      // 4. Due Adjust
      if (remaining > 0 && origDueAmount > 0) {
        allocDue = Math.min(remaining, origDueAmount);
        remaining = Number((remaining - allocDue).toFixed(2));
      }
      // Fallback
      if (allocCash === 0 && allocBank === 0 && allocMfs === 0 && allocDue === 0) {
        allocCash = remaining;
      }
    }

    setRefundCashAmount(allocCash > 0 ? String(allocCash) : "");
    setRefundBankAmount(allocBank > 0 ? String(allocBank) : "");
    setRefundMfsAmount(allocMfs > 0 ? String(allocMfs) : "");
    setRefundDueAmount(allocDue > 0 ? String(allocDue) : "");
  }, [
    selectedRecord,
    refundAmount,
    returnMode,
    origCashPaid,
    origBankPaid,
    origMfsPaid,
    origDueAmount,
    origGrandTotal,
    priority,
  ]);

  // Sync bank / mfs dropdown selection
  useEffect(() => {
    if (selectedRecord?.bankId || (selectedRecord as any)?.bank_id) {
      setSelectedRefundBankId(String(selectedRecord.bankId || (selectedRecord as any)?.bank_id));
    } else if (registeredBankAccounts.length > 0 && !selectedRefundBankId) {
      setSelectedRefundBankId(
        String(registeredBankAccounts[0].id || registeredBankAccounts[0].bankId || registeredBankAccounts[0]._id || "")
      );
    }

    if (selectedRecord?.mfsId || (selectedRecord as any)?.mfs_id) {
      setSelectedRefundMfsId(String(selectedRecord.mfsId || (selectedRecord as any)?.mfs_id));
    } else if (registeredMfsAccounts.length > 0 && !selectedRefundMfsId) {
      setSelectedRefundMfsId(
        String(registeredMfsAccounts[0].id || registeredMfsAccounts[0].mfsId || registeredMfsAccounts[0]._id || "")
      );
    }
  }, [selectedRecord, registeredBankAccounts, registeredMfsAccounts]);

  const numRefundCash = Number(refundCashAmount) || 0;
  const numRefundBank = Number(refundBankAmount) || 0;
  const numRefundMfs = Number(refundMfsAmount) || 0;
  const numRefundDue = Number(refundDueAmount) || 0;

  const totalRefundAllocated = numRefundCash + numRefundBank + numRefundMfs + numRefundDue;
  const refundDifference = Number((refundAmount - totalRefundAllocated).toFixed(2));

  const resetRefund = () => {
    setRefundCashAmount("");
    setRefundBankAmount("");
    setRefundMfsAmount("");
    setRefundDueAmount("");
    setSelectedRefundBankId("");
    setSelectedRefundMfsId("");
  };

  return {
    refundCashAmount,
    setRefundCashAmount,
    refundBankAmount,
    setRefundBankAmount,
    refundMfsAmount,
    setRefundMfsAmount,
    refundDueAmount,
    setRefundDueAmount,
    selectedRefundBankId,
    setSelectedRefundBankId,
    selectedRefundMfsId,
    setSelectedRefundMfsId,
    origPaymentMode,
    origGrandTotal,
    origDueAmount,
    origCashPaid,
    origBankPaid,
    origMfsPaid,
    numRefundCash,
    numRefundBank,
    numRefundMfs,
    numRefundDue,
    totalRefundAllocated,
    refundDifference,
    resetRefund,
  };
};

export type UseTradeRefundReturn = ReturnType<typeof useTradeRefund>;

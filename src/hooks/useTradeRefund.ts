import { useState, useMemo, useEffect } from "react";
import type { TradePaymentAccount } from "./useTradePayment";

export interface UseTradeRefundOptions {
  selectedRecord?: any;
  refundAmount: number;
  returnMode?: "FULL" | "PARTIAL";
  registeredBankAccounts?: TradePaymentAccount[];
  registeredMfsAccounts?: TradePaymentAccount[];
  priority?: "cash_first" | "due_first";
  autoSyncCash?: boolean;
}

export const useTradeRefund = ({
  selectedRecord,
  refundAmount,
  returnMode = "FULL",
  registeredBankAccounts = [],
  registeredMfsAccounts = [],
  priority = "cash_first",
  autoSyncCash = false,
}: UseTradeRefundOptions) => {
  const [refundCashAmount, setRefundCashAmount] = useState<string>("");
  const [refundBankAmount, setRefundBankAmount] = useState<string>("");
  const [refundMfsAmount, setRefundMfsAmount] = useState<string>("");
  const [refundDueAmount, setRefundDueAmount] = useState<string>("");
  const [selectedRefundBankId, setSelectedRefundBankId] = useState<string>("");
  const [selectedRefundMfsId, setSelectedRefundMfsId] = useState<string>("");

  // Extract original invoice payment figures
  const origPaymentMode = String(selectedRecord?.paymentType || "CASH").toUpperCase();

  const origGrandTotal = Number(
    selectedRecord?.grandTotal ?? selectedRecord?.totalAmount ?? 0
  );

  const origPaidAmount = Number(selectedRecord?.paidAmount ?? 0);

  const origDueAmount = Number(
    selectedRecord?.dueAmount ??
      (origPaymentMode === "CREDIT"
        ? origGrandTotal
        : Math.max(0, origGrandTotal - origPaidAmount))
  );

  // Split amounts recorded on the original document
  const { origCashPaid, origBankPaid, origMfsPaid } = useMemo(() => {
    const rawCash = Number(
      selectedRecord?.cashReceived ?? selectedRecord?.cashAmount ?? 0
    );
    const rawBank = Number(
      selectedRecord?.cardReceived ?? selectedRecord?.bankAmount ?? 0
    );
    const rawMfs = Number(
      selectedRecord?.mfsReceived ?? selectedRecord?.mfsAmount ?? 0
    );

    const hasSplitDetails = rawCash > 0 || rawBank > 0 || rawMfs > 0;
    if (hasSplitDetails) {
      return { origCashPaid: rawCash, origBankPaid: rawBank, origMfsPaid: rawMfs };
    }

    let c = 0;
    let b = 0;
    let m = 0;
    if (origPaidAmount > 0) {
      if (origPaymentMode === "BANK" || selectedRecord?.bankId) {
        b = origPaidAmount;
      } else if (origPaymentMode === "MFS" || selectedRecord?.mfsId) {
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
      if (autoSyncCash && refundAmount > 0) {
        setRefundCashAmount(String(refundAmount));
        setRefundBankAmount("");
        setRefundMfsAmount("");
        setRefundDueAmount("");
        return;
      }
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
    autoSyncCash,
  ]);

  // Sync bank / mfs dropdown selection
  useEffect(() => {
    if (selectedRecord?.bankId) {
      setSelectedRefundBankId(String(selectedRecord.bankId));
    } else if (registeredBankAccounts.length > 0 && !selectedRefundBankId) {
      setSelectedRefundBankId(
        String(registeredBankAccounts[0].id || registeredBankAccounts[0].bankId || "")
      );
    }

    if (selectedRecord?.mfsId) {
      setSelectedRefundMfsId(String(selectedRecord.mfsId));
    } else if (registeredMfsAccounts.length > 0 && !selectedRefundMfsId) {
      setSelectedRefundMfsId(
        String(registeredMfsAccounts[0].id || registeredMfsAccounts[0].mfsId || "")
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
    refundCash: refundCashAmount,
    refundCashAmount,
    setRefundCashAmount,
    handleRefundCashChange: setRefundCashAmount,
    refundBank: refundBankAmount,
    refundBankAmount,
    setRefundBankAmount,
    handleRefundBankChange: setRefundBankAmount,
    refundMfs: refundMfsAmount,
    refundMfsAmount,
    setRefundMfsAmount,
    handleRefundMfsChange: setRefundMfsAmount,
    refundDue: refundDueAmount,
    refundDueAmount,
    setRefundDueAmount,
    handleRefundDueChange: setRefundDueAmount,
    selectedRefundBankId,
    setSelectedRefundBankId,
    handleSelectRefundBank: setSelectedRefundBankId,
    selectedRefundMfsId,
    setSelectedRefundMfsId,
    handleSelectRefundMfs: setSelectedRefundMfsId,
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

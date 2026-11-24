import { useState, useMemo, useEffect, useRef } from "react";
import type { TradePaymentAccount } from "./useTradePayment";

export type RefundAdjustmentTarget = "due" | "cash";

export interface UseTradeRefundOptions {
  selectedRecord?: any;
  refundAmount: number;
  returnMode?: "FULL" | "PARTIAL";
  registeredBankAccounts?: TradePaymentAccount[];
  registeredMfsAccounts?: TradePaymentAccount[];
  priority?: "cash_first" | "due_first";
  autoSyncCash?: boolean;
  defaultAdjustmentTarget?: RefundAdjustmentTarget;
}

export const useTradeRefund = ({
  selectedRecord,
  refundAmount,
  returnMode = "FULL",
  registeredBankAccounts = [],
  registeredMfsAccounts = [],
  priority = "cash_first",
  autoSyncCash = false,
  defaultAdjustmentTarget,
}: UseTradeRefundOptions) => {
  const [adjustmentTarget, setAdjustmentTarget] = useState<RefundAdjustmentTarget>(() => {
    return defaultAdjustmentTarget || (priority === "due_first" ? "due" : "due");
  });
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

  // Auto-set default adjustment target when a record is selected
  const prevRecordIdRef = useRef<any>(null);
  useEffect(() => {
    if (!selectedRecord) {
      prevRecordIdRef.current = null;
      return;
    }
    const currentId =
      selectedRecord?.id ||
      selectedRecord?.saleId ||
      selectedRecord?.purchaseId ||
      selectedRecord?.orderNo ||
      selectedRecord?.invoiceNo;

    if (prevRecordIdRef.current !== currentId) {
      prevRecordIdRef.current = currentId;
      // If the invoice has an outstanding due amount, default to adjusting due; otherwise cash
      if (origDueAmount > 0) {
        setAdjustmentTarget("due");
      } else {
        setAdjustmentTarget("cash");
      }
    }
  }, [selectedRecord, origDueAmount]);

  // Auto-distribute refund
  useEffect(() => {
    if (!selectedRecord || refundAmount <= 0) {
      if (autoSyncCash && refundAmount > 0) {
        const nextCash = String(refundAmount);
        setRefundCashAmount((prev) => (prev !== nextCash ? nextCash : prev));
        setRefundBankAmount((prev) => (prev !== "" ? "" : prev));
        setRefundMfsAmount((prev) => (prev !== "" ? "" : prev));
        setRefundDueAmount((prev) => (prev !== "" ? "" : prev));
        return;
      }
      setRefundCashAmount((prev) => (prev !== "" ? "" : prev));
      setRefundBankAmount((prev) => (prev !== "" ? "" : prev));
      setRefundMfsAmount((prev) => (prev !== "" ? "" : prev));
      setRefundDueAmount((prev) => (prev !== "" ? "" : prev));
      return;
    }

    // Reuse the original tender split only when the refund covers the full invoice total
    if (
      returnMode === "FULL" &&
      Math.abs(refundAmount - origGrandTotal) < 0.01
    ) {
      const nextCash = origCashPaid > 0 ? String(origCashPaid) : "";
      const nextBank = origBankPaid > 0 ? String(origBankPaid) : "";
      const nextMfs = origMfsPaid > 0 ? String(origMfsPaid) : "";
      const nextDue = origDueAmount > 0 ? String(origDueAmount) : "";
      setRefundCashAmount((prev) => (prev !== nextCash ? nextCash : prev));
      setRefundBankAmount((prev) => (prev !== nextBank ? nextBank : prev));
      setRefundMfsAmount((prev) => (prev !== nextMfs ? nextMfs : prev));
      setRefundDueAmount((prev) => (prev !== nextDue ? nextDue : prev));
      return;
    }

    let remaining = refundAmount;
    let allocCash = 0;
    let allocBank = 0;
    let allocMfs = 0;
    let allocDue = 0;

    if (adjustmentTarget === "due") {
      // 1. Adjust from Outstanding / Due first
      if (origDueAmount > 0) {
        allocDue = Math.min(remaining, origDueAmount);
        remaining = Number((remaining - allocDue).toFixed(2));
      }
      // 2. Remainder to Cash paid
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
      // 5. Excess beyond original allocations
      if (remaining > 0) {
        allocCash = Number((allocCash + remaining).toFixed(2));
        remaining = 0;
      }
    } else {
      // 1. Refund in Cash first
      const availableCash =
        origCashPaid > 0
          ? origCashPaid
          : origPaidAmount > 0
          ? origPaidAmount
          : remaining;
      if (availableCash > 0) {
        allocCash = Math.min(remaining, availableCash);
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
      // 5. Excess beyond original allocations
      if (remaining > 0) {
        allocCash = Number((allocCash + remaining).toFixed(2));
        remaining = 0;
      }
    }

    const nextCash = allocCash > 0 ? String(allocCash) : "";
    const nextBank = allocBank > 0 ? String(allocBank) : "";
    const nextMfs = allocMfs > 0 ? String(allocMfs) : "";
    const nextDue = allocDue > 0 ? String(allocDue) : "";

    setRefundCashAmount((prev) => (prev !== nextCash ? nextCash : prev));
    setRefundBankAmount((prev) => (prev !== nextBank ? nextBank : prev));
    setRefundMfsAmount((prev) => (prev !== nextMfs ? nextMfs : prev));
    setRefundDueAmount((prev) => (prev !== nextDue ? nextDue : prev));
  }, [
    selectedRecord,
    refundAmount,
    returnMode,
    origCashPaid,
    origBankPaid,
    origMfsPaid,
    origDueAmount,
    origGrandTotal,
    adjustmentTarget,
    autoSyncCash,
    origPaidAmount,
  ]);

  // Sync bank / mfs dropdown selection
  useEffect(() => {
    if (selectedRecord?.bankId) {
      const bId = String(selectedRecord.bankId);
      setSelectedRefundBankId((prev) => (prev !== bId ? bId : prev));
    } else if (registeredBankAccounts.length > 0) {
      const firstBankId = String(registeredBankAccounts[0].id || registeredBankAccounts[0].bankId || "");
      setSelectedRefundBankId((prev) => (!prev ? firstBankId : prev));
    }

    if (selectedRecord?.mfsId) {
      const mId = String(selectedRecord.mfsId);
      setSelectedRefundMfsId((prev) => (prev !== mId ? mId : prev));
    } else if (registeredMfsAccounts.length > 0) {
      const firstMfsId = String(registeredMfsAccounts[0].id || registeredMfsAccounts[0].mfsId || "");
      setSelectedRefundMfsId((prev) => (!prev ? firstMfsId : prev));
    }
  }, [
    selectedRecord?.bankId,
    selectedRecord?.mfsId,
    registeredBankAccounts,
    registeredMfsAccounts,
  ]);

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
    adjustmentTarget,
    setAdjustmentTarget,
    handleSelectAdjustmentTarget: setAdjustmentTarget,
    hasDueAndCash: origDueAmount > 0 && (origCashPaid > 0 || origPaidAmount > 0),
    origPaymentMode,
    origGrandTotal,
    origDueAmount,
    origCashPaid,
    origBankPaid,
    origMfsPaid,
    origPaidAmount,
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

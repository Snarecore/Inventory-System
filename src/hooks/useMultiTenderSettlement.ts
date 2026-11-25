import { useState, useMemo, useEffect, ChangeEvent } from "react";
import moment from "moment";
import { useFinancialAccounts } from "@/hooks/useFinancialAccounts";
import {
  allocateSettlementFIFO,
  allocateSettlementManual,
  type GenericDueInvoice,
  type GenericSettlementAllocation,
} from "@/services/settlement-allocation-service";
import { formatMoney } from "@/utils/formatters";

export interface TenderBreakdown {
  cash: number;
  bank: number;
  mfs: number;
  bankName?: string;
  mfsName?: string;
}

export interface UseMultiTenderSettlementOptions<TInvoice extends GenericDueInvoice> {
  isOpen: boolean;
  totalDue?: number;
  entityId?: string | number | null;
  invoices?: TInvoice[];
  initialDate?: string;
}

export const useMultiTenderSettlement = <TInvoice extends GenericDueInvoice>({
  isOpen,
  totalDue = 0,
  entityId,
  invoices = [],
  initialDate,
}: UseMultiTenderSettlementOptions<TInvoice>) => {
  const {
    activeBankAccounts: registeredBankAccounts,
    activeMfsAccounts: registeredMfsAccounts,
    isLoading: isAccountsLoading,
  } = useFinancialAccounts();

  // Multi-Tender Form States
  const [cashAmountInput, setCashAmountInput] = useState<string>("");
  const [bankAmountInput, setBankAmountInput] = useState<string>("");
  const [mfsAmountInput, setMfsAmountInput] = useState<string>("");
  const [discountInput, setDiscountInput] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<"Cash" | "Bank" | "MFS">("Cash");
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [selectedMfsId, setSelectedMfsId] = useState<string>("");
  const [settlementDate, setSettlementDate] = useState<string>(
    initialDate || moment().format("YYYY-MM-DD")
  );
  const [remark, setRemark] = useState<string>("");
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [selectedInvoiceNos, setSelectedInvoiceNos] = useState<Set<string>>(() => new Set());

  // Reset and sync state on modal open or entity change
  useEffect(() => {
    if (isOpen) {
      setCashAmountInput(totalDue != null && totalDue > 0 ? String(totalDue) : "");
      setBankAmountInput("");
      setMfsAmountInput("");
      setDiscountInput("");
      setPaymentMode("Cash");
      setSelectedBankId("");
      setSelectedMfsId("");
      setSettlementDate(initialDate || moment().format("YYYY-MM-DD"));
      setRemark("");
      setIsManualMode(false);
      setSelectedInvoiceNos(new Set());
    }
  }, [isOpen, entityId]);

  // Auto-select first bank account
  useEffect(() => {
    if (registeredBankAccounts.length > 0 && !selectedBankId) {
      const firstBank = registeredBankAccounts[0];
      setSelectedBankId(String(firstBank.id || firstBank.bankId || ""));
    }
  }, [registeredBankAccounts, selectedBankId]);

  // Auto-select first MFS account
  useEffect(() => {
    if (registeredMfsAccounts.length > 0 && !selectedMfsId) {
      const firstMfs = registeredMfsAccounts[0];
      setSelectedMfsId(String(firstMfs.id || ""));
    }
  }, [registeredMfsAccounts, selectedMfsId]);

  const selectedBankObj = useMemo(() => {
    return (
      registeredBankAccounts.find((b) => String(b.id || b.bankId) === String(selectedBankId)) ||
      null
    );
  }, [registeredBankAccounts, selectedBankId]);

  const selectedMfsObj = useMemo(() => {
    return (
      registeredMfsAccounts.find((m) => String(m.id) === String(selectedMfsId)) ||
      null
    );
  }, [registeredMfsAccounts, selectedMfsId]);

  // Compute total dues
  const computedTotalDue = useMemo(() => {
    if (invoices.length > 0) {
      return invoices.reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0);
    }
    return Number(totalDue || 0);
  }, [invoices, totalDue]);

  const selectedInvoicesDue = useMemo(() => {
    return invoices
      .filter((inv) => selectedInvoiceNos.has(inv.invoiceNo))
      .reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0);
  }, [invoices, selectedInvoiceNos]);

  const effectiveMaxDue =
    isManualMode && selectedInvoiceNos.size > 0 ? selectedInvoicesDue : computedTotalDue;

  // Numeric amounts
  const numericCash = Math.max(0, parseFloat(cashAmountInput) || 0);
  const numericBank = Math.max(0, parseFloat(bankAmountInput) || 0);
  const numericMfs = Math.max(0, parseFloat(mfsAmountInput) || 0);
  const numericTotalPaid = Number((numericCash + numericBank + numericMfs).toFixed(2));
  const numericDiscount = Math.max(0, parseFloat(discountInput) || 0);
  const totalSettleAmount = Number((numericTotalPaid + numericDiscount).toFixed(2));

  // Current amount value mapped to active mode
  const currentAmountValue =
    paymentMode === "Cash"
      ? cashAmountInput
      : paymentMode === "Bank"
      ? bankAmountInput
      : mfsAmountInput;

  // Allocations calculation
  const { allocations, allocatedTotal, remainingTotalDue } = useMemo(() => {
    if (invoices.length === 0) {
      return {
        allocations: [] as GenericSettlementAllocation[],
        allocatedTotal: Math.min(totalSettleAmount, computedTotalDue),
        remainingTotalDue: Math.max(0, Number((computedTotalDue - totalSettleAmount).toFixed(2))),
      };
    }

    if (isManualMode && selectedInvoiceNos.size > 0) {
      return allocateSettlementManual(invoices, numericTotalPaid, selectedInvoiceNos, numericDiscount);
    }

    return allocateSettlementFIFO(invoices, numericTotalPaid, numericDiscount);
  }, [
    invoices,
    numericTotalPaid,
    numericDiscount,
    totalSettleAmount,
    computedTotalDue,
    isManualMode,
    selectedInvoiceNos,
  ]);

  // Tender breakdown object
  const tenderBreakdown: TenderBreakdown = useMemo(() => {
    return {
      cash: numericCash,
      bank: numericBank,
      mfs: numericMfs,
      bankName: selectedBankObj?.bankName,
      mfsName: selectedMfsObj?.mfsName,
    };
  }, [numericCash, numericBank, numericMfs, selectedBankObj, selectedMfsObj]);

  // Multi-tender display label e.g. "Cash + Bank"
  const finalPaymentMode = useMemo(() => {
    const activeModes: string[] = [];
    if (numericCash > 0) activeModes.push("Cash");
    if (numericBank > 0) activeModes.push("Bank");
    if (numericMfs > 0) activeModes.push("MFS");
    return activeModes.join(" + ") || paymentMode;
  }, [numericCash, numericBank, numericMfs, paymentMode]);

  // Handlers
  const handlePaymentModeChange = (newMode: "Cash" | "Bank" | "MFS") => {
    setPaymentMode(newMode);
  };

  const handleToggleInvoice = (invNo: string) => {
    setSelectedInvoiceNos((prev) => {
      const next = new Set(prev);
      if (next.has(invNo)) next.delete(invNo);
      else next.add(invNo);
      return next;
    });
  };

  const isAllSelected =
    invoices.length > 0 && invoices.every((inv) => selectedInvoiceNos.has(inv.invoiceNo));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedInvoiceNos(new Set());
    } else {
      const next = new Set<string>();
      invoices.forEach((inv) => next.add(inv.invoiceNo));
      setSelectedInvoiceNos(next);
    }
  };

  const handleToggleManualMode = () => {
    setIsManualMode((prev) => {
      const next = !prev;
      if (next && selectedInvoiceNos.size === 0) {
        const initialSet = new Set<string>();
        invoices.forEach((i) => initialSet.add(i.invoiceNo));
        setSelectedInvoiceNos(initialSet);
      }
      return next;
    });
  };

  // Clamped Amount change handler
  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value;
    if (rawValue === "") {
      if (paymentMode === "Cash") setCashAmountInput("");
      else if (paymentMode === "Bank") setBankAmountInput("");
      else setMfsAmountInput("");
      return;
    }

    if (rawValue.length > 1 && rawValue.startsWith("0") && !rawValue.startsWith("0.")) {
      rawValue = rawValue.replace(/^0+/, "") || "0";
    }

    const val = parseFloat(rawValue);
    if (isNaN(val)) {
      if (paymentMode === "Cash") setCashAmountInput("");
      else if (paymentMode === "Bank") setBankAmountInput("");
      else setMfsAmountInput("");
      return;
    }

    if (val < 0) {
      if (paymentMode === "Cash") setCashAmountInput("0");
      else if (paymentMode === "Bank") setBankAmountInput("0");
      else setMfsAmountInput("0");
      return;
    }

    const otherPaid =
      paymentMode === "Cash"
        ? numericBank + numericMfs
        : paymentMode === "Bank"
        ? numericCash + numericMfs
        : numericCash + numericBank;

    const maxAllowed = Math.max(
      0,
      Number((effectiveMaxDue - numericDiscount - otherPaid).toFixed(2))
    );

    if (effectiveMaxDue >= 0 && val > maxAllowed) {
      const clamped = String(maxAllowed);
      if (paymentMode === "Cash") setCashAmountInput(clamped);
      else if (paymentMode === "Bank") setBankAmountInput(clamped);
      else setMfsAmountInput(clamped);
      return;
    }

    if (paymentMode === "Cash") setCashAmountInput(rawValue);
    else if (paymentMode === "Bank") setBankAmountInput(rawValue);
    else setMfsAmountInput(rawValue);
  };

  // Clamped Discount change handler
  const handleDiscountChange = (e: ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value;
    if (rawValue === "") {
      setDiscountInput("");
      return;
    }

    if (rawValue.length > 1 && rawValue.startsWith("0") && !rawValue.startsWith("0.")) {
      rawValue = rawValue.replace(/^0+/, "") || "0";
    }

    const val = parseFloat(rawValue);
    if (isNaN(val)) {
      setDiscountInput("");
      return;
    }

    if (val < 0) {
      setDiscountInput("0");
      return;
    }

    const maxDiscountAllowed = Math.max(
      0,
      Number((effectiveMaxDue - numericTotalPaid).toFixed(2))
    );

    if (effectiveMaxDue >= 0 && val > maxDiscountAllowed) {
      setDiscountInput(String(maxDiscountAllowed));
      return;
    }

    setDiscountInput(rawValue);
  };

  // Auto-clamp entered amounts and discount if effectiveMaxDue drops below totalSettleAmount
  useEffect(() => {
    if (effectiveMaxDue >= 0 && totalSettleAmount > effectiveMaxDue) {
      const disc = Math.min(effectiveMaxDue, numericDiscount);
      let remainingForPay = Math.max(0, Number((effectiveMaxDue - disc).toFixed(2)));

      setDiscountInput(disc > 0 ? String(disc) : "");

      const newCash = Math.min(numericCash, remainingForPay);
      remainingForPay = Math.max(0, Number((remainingForPay - newCash).toFixed(2)));

      const newBank = Math.min(numericBank, remainingForPay);
      remainingForPay = Math.max(0, Number((remainingForPay - newBank).toFixed(2)));

      const newMfs = Math.min(numericMfs, remainingForPay);

      setCashAmountInput(newCash > 0 ? String(newCash) : "");
      setBankAmountInput(newBank > 0 ? String(newBank) : "");
      setMfsAmountInput(newMfs > 0 ? String(newMfs) : "");
    }
  }, [effectiveMaxDue]);

  // Validation function
  const validateSettlement = (): { isValid: boolean; error?: string } => {
    if (numericTotalPaid <= 0 && numericDiscount <= 0) {
      return { isValid: false, error: "Please enter a valid amount or discount greater than 0" };
    }
    if (isManualMode && selectedInvoiceNos.size === 0) {
      return { isValid: false, error: "Please select at least one invoice in manual mode" };
    }
    if (totalSettleAmount > effectiveMaxDue && effectiveMaxDue > 0) {
      return {
        isValid: false,
        error: `Total payment + discount cannot exceed due of ৳ ${formatMoney(effectiveMaxDue)}`,
      };
    }
    if (numericBank > 0 && !selectedBankId) {
      return { isValid: false, error: "Please select a bank account for the bank payment" };
    }
    if (numericMfs > 0 && !selectedMfsId) {
      return { isValid: false, error: "Please select an MFS account for the MFS payment" };
    }
    return { isValid: true };
  };

  return {
    // Form Inputs & Setters
    cashAmountInput,
    setCashAmountInput,
    bankAmountInput,
    setBankAmountInput,
    mfsAmountInput,
    setMfsAmountInput,
    discountInput,
    setDiscountInput,
    paymentMode,
    setPaymentMode,
    handlePaymentModeChange,
    selectedBankId,
    setSelectedBankId,
    selectedMfsId,
    setSelectedMfsId,
    settlementDate,
    setSettlementDate,
    remark,
    setRemark,
    isManualMode,
    setIsManualMode,
    handleToggleManualMode,
    selectedInvoiceNos,
    setSelectedInvoiceNos,
    handleToggleInvoice,
    handleToggleSelectAll,
    isAllSelected,

    // Financial Accounts
    registeredBankAccounts,
    registeredMfsAccounts,
    isAccountsLoading,
    selectedBankObj,
    selectedMfsObj,

    // Numerics & Calculated Values
    numericCash,
    numericBank,
    numericMfs,
    numericTotalPaid,
    numericDiscount,
    totalSettleAmount,
    effectiveMaxDue,
    currentAmountValue,
    finalPaymentMode,
    tenderBreakdown,

    // Allocations
    allocations,
    allocatedTotal,
    remainingTotalDue,

    // Event Handlers
    handleAmountChange,
    handleDiscountChange,

    // Validation
    validateSettlement,
  };
};

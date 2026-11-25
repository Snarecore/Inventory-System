import { useState, useCallback, useMemo, useEffect } from "react";
import { showErrorToast } from "@/utils/toast-utils";

export interface TradePaymentAccount {
  id?: string | number;
  bankId?: string | number;
  mfsId?: string | number;
  name?: string;
  bankName?: string;
  mfsName?: string;
  method?: string;
  accountNo?: string;
  bankAccountName?: string;
  branchName?: string;
  phoneNumber?: string;
  mfsPhone?: string;
  phone?: string;
}

export interface UseTradePaymentOptions {
  grandTotal: number;
  registeredBankAccounts: TradePaymentAccount[];
  registeredMfsAccounts: TradePaymentAccount[];
  initialCash?: string;
  initialBank?: string;
  initialMfs?: string;
  autoSyncCashWithTotal?: boolean;
}

export interface TradePaymentInitData {
  cashAmount?: string | number;
  bankAmount?: string | number;
  mfsAmount?: string | number;
  selectedBankId?: string;
  selectedMfsId?: string;
  bankName?: string;
  accountNo?: string;
  bankRef?: string;
  mfsName?: string;
  mfsPhone?: string;
}

export const useTradePayment = ({
  grandTotal,
  registeredBankAccounts,
  registeredMfsAccounts,
  initialCash = "",
  initialBank = "",
  initialMfs = "",
  autoSyncCashWithTotal = true,
}: UseTradePaymentOptions) => {
  const [cashAmount, setCashAmount] = useState<string>(initialCash);
  const [bankAmount, setBankAmount] = useState<string>(initialBank);
  const [mfsAmount, setMfsAmount] = useState<string>(initialMfs);
  const [cashGiven, setCashGiven] = useState<string>("");

  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [accountNo, setAccountNo] = useState<string>("");
  const [bankRef, setBankRef] = useState<string>("");

  const [selectedMfsId, setSelectedMfsId] = useState<string>("");
  const [mfsName, setMfsName] = useState<string>("");
  const [mfsPhone, setMfsPhone] = useState<string>("");

  // Numeric computations
  const numCash = Math.max(0, Number(cashAmount) || 0);
  const numBank = Math.max(0, Number(bankAmount) || 0);
  const numMfs = Math.max(0, Number(mfsAmount) || 0);

  const totalPaid = numCash + numBank + numMfs;
  const dueAmount = Math.max(0, grandTotal - totalPaid);

  const givenCash = Number(cashGiven) || 0;
  const changeReturnAmount = givenCash > numCash && numCash > 0 ? givenCash - numCash : 0;

  // Normalize / cap value helper
  const normalizePaymentValue = useCallback((val: string, max: number): string => {
    if (!val || val === "") return "";
    const num = Number(val);
    if (isNaN(num)) return "";
    if (num < 0) return "0";
    if (num > max) return String(max);
    return val;
  }, []);

  // Card / Bank amount change with auto-deduction from cash
  const handleBankAmountChange = useCallback(
    (rawVal: string) => {
      if (!selectedBankId) {
        showErrorToast("Please select a bank first before entering card/bank amount");
        return;
      }
      const currentMfs = Number(mfsAmount) || 0;
      const maxForCard = Math.max(0, grandTotal - currentMfs);
      const normalized = normalizePaymentValue(rawVal, maxForCard);
      setBankAmount(normalized);

      const numCard = Number(normalized) || 0;
      const remainingCash = Math.max(0, grandTotal - numCard - currentMfs);
      setCashAmount(remainingCash > 0 ? String(Math.round(remainingCash * 100) / 100) : "0");
    },
    [selectedBankId, mfsAmount, grandTotal, normalizePaymentValue]
  );

  // MFS amount change with auto-deduction from cash
  const handleMfsAmountChange = useCallback(
    (rawVal: string) => {
      if (!selectedMfsId) {
        showErrorToast("Please select an MFS provider first before entering MFS amount");
        return;
      }
      const currentCard = Number(bankAmount) || 0;
      const maxForMfs = Math.max(0, grandTotal - currentCard);
      const normalized = normalizePaymentValue(rawVal, maxForMfs);
      setMfsAmount(normalized);

      const numMfsVal = Number(normalized) || 0;
      const remainingCash = Math.max(0, grandTotal - currentCard - numMfsVal);
      setCashAmount(remainingCash > 0 ? String(Math.round(remainingCash * 100) / 100) : "0");
    },
    [selectedMfsId, bankAmount, grandTotal, normalizePaymentValue]
  );

  // Cash amount change capped to remaining
  const handleCashAmountChange = useCallback(
    (rawVal: string) => {
      const currentCard = Number(bankAmount) || 0;
      const currentMfs = Number(mfsAmount) || 0;
      const maxForCash = Math.max(0, grandTotal - currentCard - currentMfs);
      const normalized = normalizePaymentValue(rawVal, maxForCash);
      setCashAmount(normalized);
    },
    [bankAmount, mfsAmount, grandTotal, normalizePaymentValue]
  );

  // Auto-sync cash with grandTotal when grandTotal changes (if no bank/mfs used or auto-sync enabled)
  useEffect(() => {
    if (!autoSyncCashWithTotal) return;

    const currentCard = Number(bankAmount) || 0;
    const currentMfs = Number(mfsAmount) || 0;

    if (currentCard === 0 && currentMfs === 0) {
      if (grandTotal > 0) {
        setCashAmount(String(grandTotal));
      } else {
        setCashAmount("");
      }
    } else {
      const remainingCash = Math.max(0, grandTotal - currentCard - currentMfs);
      setCashAmount(remainingCash > 0 ? String(Math.round(remainingCash * 100) / 100) : "0");
    }
  }, [grandTotal, autoSyncCashWithTotal]);

  // Bank selection
  const handleSelectBank = useCallback(
    (bankId: string) => {
      setSelectedBankId(bankId);
      const found = registeredBankAccounts.find(
        (b) => String(b.bankId ?? b.id) === String(bankId)
      );
      if (found) {
        setBankName(found.bankName || "");
        setAccountNo(found.accountNo || "");
        setBankRef(found.bankAccountName || "");
      } else {
        setBankName("");
        setAccountNo("");
        setBankRef("");
        if (bankAmount) {
          setBankAmount("");
          const remCash = Math.max(0, grandTotal - (Number(mfsAmount) || 0));
          setCashAmount(remCash > 0 ? String(remCash) : "");
        }
      }
    },
    [registeredBankAccounts, bankAmount, grandTotal, mfsAmount]
  );

  // MFS selection
  const handleSelectMfs = useCallback(
    (mfsId: string) => {
      setSelectedMfsId(mfsId);
      const found = registeredMfsAccounts.find(
        (m) => String(m.id ?? m.mfsId ?? "") === String(mfsId)
      );
      if (found) {
        setMfsName(found.name || found.method || "MFS");
        setMfsPhone(found.phoneNumber || "");
      } else {
        setMfsName("");
        setMfsPhone("");
        if (mfsAmount) {
          setMfsAmount("");
          const remCash = Math.max(0, grandTotal - (Number(bankAmount) || 0));
          setCashAmount(remCash > 0 ? String(remCash) : "");
        }
      }
    },
    [registeredMfsAccounts, mfsAmount, grandTotal, bankAmount]
  );

  // Quick Action Presets
  const handlePayFullCash = useCallback(() => {
    setCashAmount(grandTotal > 0 ? String(grandTotal) : "");
    setBankAmount("");
    setMfsAmount("");
  }, [grandTotal]);

  const isAccountActive = (acc: TradePaymentAccount) => {
    const s = String((acc as any)?.status ?? "").toLowerCase().trim();
    return s === "active" || s === "1" || s === "y" || s === "true" || !s;
  };

  const handlePayFullBank = useCallback(() => {
    if (!selectedBankId) {
      const firstBank = registeredBankAccounts.find(isAccountActive);
      if (firstBank) {
        const bId = String(firstBank.bankId ?? firstBank.id ?? "");
        handleSelectBank(bId);
      } else {
        showErrorToast("Please select / register an active bank account first");
        return;
      }
    }
    setBankAmount(grandTotal > 0 ? String(grandTotal) : "");
    setCashAmount("0");
    setMfsAmount("");
  }, [selectedBankId, registeredBankAccounts, grandTotal, handleSelectBank]);

  const handlePayFullMfs = useCallback(() => {
    if (!selectedMfsId) {
      const firstMfs = registeredMfsAccounts.find(isAccountActive);
      if (firstMfs) {
        const mId = String(firstMfs.id ?? firstMfs.mfsId ?? "");
        handleSelectMfs(mId);
      } else {
        showErrorToast("Please select / register an active MFS account first");
        return;
      }
    }
    setMfsAmount(grandTotal > 0 ? String(grandTotal) : "");
    setCashAmount("0");
    setBankAmount("");
  }, [selectedMfsId, registeredMfsAccounts, grandTotal, handleSelectMfs]);

  const handlePayFullCredit = useCallback(() => {
    setCashAmount("0");
    setBankAmount("");
    setMfsAmount("");
    setCashGiven("");
  }, []);

  const resetPayment = useCallback(() => {
    setCashAmount("");
    setBankAmount("");
    setMfsAmount("");
    setCashGiven("");
    setSelectedBankId("");
    setSelectedMfsId("");
    setBankName("");
    setAccountNo("");
    setBankRef("");
    setMfsName("");
    setMfsPhone("");
  }, []);

  const initializePayment = useCallback((data: TradePaymentInitData) => {
    if (data.cashAmount !== undefined) setCashAmount(String(data.cashAmount || "0"));
    if (data.bankAmount !== undefined) setBankAmount(String(data.bankAmount || "0"));
    if (data.mfsAmount !== undefined) setMfsAmount(String(data.mfsAmount || "0"));
    if (data.selectedBankId !== undefined) setSelectedBankId(String(data.selectedBankId || ""));
    if (data.selectedMfsId !== undefined) setSelectedMfsId(String(data.selectedMfsId || ""));
    if (data.bankName !== undefined) setBankName(data.bankName);
    if (data.accountNo !== undefined) setAccountNo(data.accountNo);
    if (data.bankRef !== undefined) setBankRef(data.bankRef);
    if (data.mfsName !== undefined) setMfsName(data.mfsName);
    if (data.mfsPhone !== undefined) setMfsPhone(data.mfsPhone);
  }, []);

  return {
    cashAmount,
    setCashAmount,
    bankAmount,
    setBankAmount,
    mfsAmount,
    setMfsAmount,
    cashGiven,
    setCashGiven,
    selectedBankId,
    setSelectedBankId,
    selectedMfsId,
    setSelectedMfsId,
    bankName,
    setBankName,
    accountNo,
    setAccountNo,
    bankRef,
    setBankRef,
    mfsName,
    setMfsName,
    mfsPhone,
    setMfsPhone,
    numCash,
    numBank,
    numMfs,
    totalPaid,
    dueAmount,
    changeReturnAmount,
    handleSelectBank,
    handleSelectMfs,
    handlePayFullCash,
    handlePayFullBank,
    handlePayFullMfs,
    handlePayFullCredit,
    handleCashAmountChange,
    handleBankAmountChange,
    handleMfsAmountChange,
    resetPayment,
    initializePayment,
  };
};

export type UseTradePaymentReturn = ReturnType<typeof useTradePayment>;

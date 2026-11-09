import React, { useState, useMemo } from "react";
import PageHeader from "@/components/page-header/PageHeader";
import { RefreshButton, Button, DatePicker, TextInput } from "@/components/common";
import { useCashBalanceQuery } from "@/hooks/useCashBalance";
import { useFinancialAccounts } from "@/hooks/useFinancialAccounts";
import AccountPickerModal from "../components/AccountPickerModal";
import { formatMoney } from "@/utils/formatters";
import { showErrorToast } from "@/utils/toast-utils";
import { useInsertFinancialTransactionMutation } from "@/hooks/useFinanceQueries";
import { yearmonthOf, type FinancialAccountType } from "@/services/financial-ledger-service";
import type { BankAccountItem, MfsUserItem } from "@/types";
import { usePermission } from "@/hooks/usePermission";
import {
  FaWallet,
  FaLandmark,
  FaMobileAlt,
  FaExchangeAlt,
  FaArrowRight,
  FaExclamationTriangle,
  FaRandom,
  FaCalendarAlt,
  FaChevronRight,
} from "react-icons/fa";

type TransferMethod = "CASH" | "BANK" | "MFS";

const getTodayString = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const FundTransferPage: React.FC = () => {
  const { canCreate } = usePermission();
  const todayStr = useMemo(() => getTodayString(), []);

  // Form State
  const [date, setDate] = useState<string>(todayStr);
  const [amount, setAmount] = useState<string>("");

  // Source Account (From)
  const [fromMethod, setFromMethod] = useState<TransferMethod>("CASH");
  const [fromBank, setFromBank] = useState<BankAccountItem | null>(null);
  const [fromWallet, setFromWallet] = useState<MfsUserItem | null>(null);

  // Destination Account (To)
  const [toMethod, setToMethod] = useState<TransferMethod>("BANK");
  const [toBank, setToBank] = useState<BankAccountItem | null>(null);
  const [toWallet, setToWallet] = useState<MfsUserItem | null>(null);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    target: "FROM" | "TO";
    type: "BANK" | "MFS";
  }>({ isOpen: false, target: "FROM", type: "BANK" });

  // Errors & UI state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Live Accounts & Balances
  const {
    data: cashBalance = 0,
    refetch: refetchCash,
    isRefetching: isRefetchingCash,
  } = useCashBalanceQuery({
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const {
    registeredBankAccounts,
    registeredMfsAccounts,
    bankQuery,
    mfsQuery,
  } = useFinancialAccounts();

  const insertMutation = useInsertFinancialTransactionMutation({
    onSuccess: () => {
      setAmount("");
      setErrors({});
    },
  });

  const isRefreshing =
    isRefetchingCash || bankQuery.isRefetching || mfsQuery.isRefetching || insertMutation.isPending;

  const handleRefreshAll = () => {
    refetchCash();
    bankQuery.refetch();
    mfsQuery.refetch();
  };

  const activeBankAccounts = useMemo(() => {
    return (registeredBankAccounts || []).filter(
      (b) => b.status.toLowerCase() === "active"
    );
  }, [registeredBankAccounts]);

  const activeMfsAccounts = useMemo(() => {
    return (registeredMfsAccounts || []).filter(
      (w) => w.status.toLowerCase() === "active"
    );
  }, [registeredMfsAccounts]);

  // Auto-select when only a single bank/wallet exists
  React.useEffect(() => {
    if (toMethod === "BANK" && !toBank && activeBankAccounts.length === 1) {
      setToBank(activeBankAccounts[0]);
    }
    if (toMethod === "MFS" && !toWallet && activeMfsAccounts.length === 1) {
      setToWallet(activeMfsAccounts[0]);
    }
    if (fromMethod === "BANK" && !fromBank && activeBankAccounts.length === 1) {
      setFromBank(activeBankAccounts[0]);
    }
    if (fromMethod === "MFS" && !fromWallet && activeMfsAccounts.length === 1) {
      setFromWallet(activeMfsAccounts[0]);
    }
  }, [activeBankAccounts, activeMfsAccounts, toMethod, fromMethod, toBank, toWallet, fromBank, fromWallet]);

  const totalBankBalance = useMemo(() => {
    return activeBankAccounts.reduce((sum, b) => sum + (b.currentBalance || 0), 0);
  }, [activeBankAccounts]);

  const totalMfsBalance = useMemo(() => {
    return activeMfsAccounts.reduce((sum, w) => sum + (w.currentBalance || 0), 0);
  }, [activeMfsAccounts]);

  const totalLiquidity = useMemo(() => {
    return Number(cashBalance || 0) + totalBankBalance + totalMfsBalance;
  }, [cashBalance, totalBankBalance, totalMfsBalance]);

  // Compute From Account Balance
  const fromBalance = useMemo(() => {
    if (fromMethod === "CASH") return Number(cashBalance || 0);
    if (fromMethod === "BANK") {
      return fromBank ? Number(fromBank.currentBalance || 0) : 0;
    }
    if (fromMethod === "MFS") {
      return fromWallet ? Number(fromWallet.currentBalance || 0) : 0;
    }
    return 0;
  }, [fromMethod, fromBank, fromWallet, cashBalance]);

  // Compute To Account Balance
  const toBalance = useMemo(() => {
    if (toMethod === "CASH") return Number(cashBalance || 0);
    if (toMethod === "BANK") {
      return toBank ? Number(toBank.currentBalance || 0) : 0;
    }
    if (toMethod === "MFS") {
      return toWallet ? Number(toWallet.currentBalance || 0) : 0;
    }
    return 0;
  }, [toMethod, toBank, toWallet, cashBalance]);

  // Label helpers
  const fromAccountLabel = useMemo(() => {
    if (fromMethod === "CASH") return "Cash Drawer (Hand Cash)";
    if (fromMethod === "BANK") {
      return fromBank ? `${fromBank.bankName} (A/C: ${fromBank.accountNo})` : "Bank Account (Choose)";
    }
    if (fromMethod === "MFS") {
      return fromWallet ? `${fromWallet.method} - ${fromWallet.phoneNumber}` : "MFS Wallet (Choose)";
    }
    return "Account";
  }, [fromMethod, fromBank, fromWallet]);

  const toAccountLabel = useMemo(() => {
    if (toMethod === "CASH") return "Cash Drawer (Hand Cash)";
    if (toMethod === "BANK") {
      return toBank ? `${toBank.bankName} (A/C: ${toBank.accountNo})` : "Bank Account (Choose)";
    }
    if (toMethod === "MFS") {
      return toWallet ? `${toWallet.method} - ${toWallet.phoneNumber}` : "MFS Wallet (Choose)";
    }
    return "Account";
  }, [toMethod, toBank, toWallet]);

  // Detect same source and destination
  const isSameAccount = useMemo(() => {
    if (fromMethod !== toMethod) return false;
    if (fromMethod === "CASH") return true; // Cash to Cash is redundant
    if (fromMethod === "BANK") {
      return !!fromBank && !!toBank && (fromBank.bankId === toBank.bankId || fromBank.accountNo === toBank.accountNo);
    }
    if (fromMethod === "MFS") {
      return !!fromWallet && !!toWallet && fromWallet.id === toWallet.id;
    }
    return false;
  }, [fromMethod, toMethod, fromBank, toBank, fromWallet, toWallet]);

  const isFromAccountSelected =
    fromMethod === "CASH" ||
    (fromMethod === "BANK" && !!fromBank) ||
    (fromMethod === "MFS" && !!fromWallet);

  const amountNum = Number(amount || 0);
  const totalDeduction = amountNum;
  const afterFromBalance = fromBalance - totalDeduction;
  const afterToBalance = toBalance + amountNum;
  const isInsufficient = isFromAccountSelected && amountNum > 0 && totalDeduction > fromBalance;

  // Swap From and To
  const handleSwap = () => {
    const tempMethod = fromMethod;
    const tempBank = fromBank;
    const tempWallet = fromWallet;

    setFromMethod(toMethod);
    setFromBank(toBank);
    setFromWallet(toWallet);

    setToMethod(tempMethod);
    setToBank(tempBank);
    setToWallet(tempWallet);

    setErrors({});
  };

  // Switch From method
  const handleSwitchFromMethod = (method: TransferMethod) => {
    setFromMethod(method);
    if (errors.fromAccount) setErrors((prev) => ({ ...prev, fromAccount: "" }));
    if (method === "BANK" && !fromBank) {
      if (activeBankAccounts.length === 1) {
        setFromBank(activeBankAccounts[0]);
      } else {
        setModalConfig({ isOpen: true, target: "FROM", type: "BANK" });
      }
    } else if (method === "MFS" && !fromWallet) {
      if (activeMfsAccounts.length === 1) {
        setFromWallet(activeMfsAccounts[0]);
      } else {
        setModalConfig({ isOpen: true, target: "FROM", type: "MFS" });
      }
    }
  };

  // Switch To method
  const handleSwitchToMethod = (method: TransferMethod) => {
    setToMethod(method);
    if (errors.toAccount) setErrors((prev) => ({ ...prev, toAccount: "" }));
    if (method === "BANK" && !toBank) {
      if (activeBankAccounts.length === 1) {
        setToBank(activeBankAccounts[0]);
      } else {
        setModalConfig({ isOpen: true, target: "TO", type: "BANK" });
      }
    } else if (method === "MFS" && !toWallet) {
      if (activeMfsAccounts.length === 1) {
        setToWallet(activeMfsAccounts[0]);
      } else {
        setModalConfig({ isOpen: true, target: "TO", type: "MFS" });
      }
    }
  };

  // Modal Account Selection
  const handleSelectBank = (bank: BankAccountItem) => {
    if (modalConfig.target === "FROM") {
      setFromBank(bank);
      if (errors.fromAccount) setErrors((prev) => ({ ...prev, fromAccount: "" }));
    } else {
      setToBank(bank);
      if (errors.toAccount) setErrors((prev) => ({ ...prev, toAccount: "" }));
    }
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSelectWallet = (wallet: MfsUserItem) => {
    if (modalConfig.target === "FROM") {
      setFromWallet(wallet);
      if (errors.fromAccount) setErrors((prev) => ({ ...prev, fromAccount: "" }));
    } else {
      setToWallet(wallet);
      if (errors.toAccount) setErrors((prev) => ({ ...prev, toAccount: "" }));
    }
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  // Submit Handler connected to backend API
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreate("fund_transfer")) {
      showErrorToast("You do not have permission to execute fund transfers.");
      return;
    }

    const newErrors: Record<string, string> = {};

    if (!amountNum || amountNum <= 0) {
      newErrors.amount = "Please enter a valid transfer amount greater than 0";
    }
    if (!date) {
      newErrors.date = "Please pick a transfer date";
    }
    if (fromMethod === "BANK" && !fromBank) {
      newErrors.fromAccount = "Please select a source bank account";
    }
    if (fromMethod === "MFS" && !fromWallet) {
      newErrors.fromAccount = "Please select a source MFS wallet";
    }
    if (toMethod === "BANK" && !toBank) {
      newErrors.toAccount = "Please select a destination bank account";
    }
    if (toMethod === "MFS" && !toWallet) {
      newErrors.toAccount = "Please select a destination MFS wallet";
    }
    if (isSameAccount) {
      newErrors.toAccount = "Source and destination accounts must be different";
    }
    if (isInsufficient) {
      newErrors.amount = "Insufficient balance in source account";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showErrorToast("Please fix the validation errors in the transfer form");
      return;
    }

    setErrors({});

    const when = new Date(date);
    const validWhen = isNaN(when.getTime()) ? new Date() : when;
    const ym = yearmonthOf(validWhen);

    // Source account details
    let fromAccountName = "Cash";
    let fromAccountNumber: string | null = null;
    if (fromMethod === "BANK") {
      fromAccountName = fromBank?.bankName || "Bank";
      fromAccountNumber = fromBank?.accountNo ? String(fromBank.accountNo) : null;
    } else if (fromMethod === "MFS") {
      fromAccountName =
        [fromWallet?.method, fromWallet?.phoneNumber || fromWallet?.name]
          .filter(Boolean)
          .join(" - ") || "MFS";
      fromAccountNumber = fromWallet?.id != null ? String(fromWallet.id) : null;
    }

    // Destination account details
    let toAccountNumber: string | null = null;
    let itemsSummary = "Transfer to Cash";
    if (toMethod === "BANK") {
      toAccountNumber = toBank?.accountNo ? String(toBank.accountNo) : null;
      itemsSummary = `Transfer to ${toBank?.bankName || "Bank"}`;
    } else if (toMethod === "MFS") {
      toAccountNumber = toWallet?.id != null ? String(toWallet.id) : null;
      const walletLabel =
        [toWallet?.method, toWallet?.phoneNumber || toWallet?.name]
          .filter(Boolean)
          .join(" - ") || "MFS";
      itemsSummary = `Transfer to ${walletLabel}`;
    }

    // Resolved accountType
    const resolvedAccountType: FinancialAccountType =
      fromMethod === "BANK" || toMethod === "BANK"
        ? "BANK"
        : fromMethod === "MFS" || toMethod === "MFS"
        ? "MFS"
        : "CASH";

    const refNo = `${Date.now()}`;
    const billRef = `${Date.now()}${Math.floor(100 + Math.random() * 900)}`;

    insertMutation.mutate({
      type: "TRANSFER",
      amount: amountNum,
      collectionAmount: 0,
      dueAmount: 0,
      categoryId: "",
      accountType: resolvedAccountType,
      account: fromAccountName,
      fromAccount: fromMethod,
      toAccount: toMethod,
      head: "Transfer",
      items: itemsSummary,
      bill_ref: billRef,
      refNo,
      notes: "",
      transactionDate: validWhen.toISOString(),
      yearmonth: ym,
      accountNumber: fromAccountNumber,
      accountNumber2: toAccountNumber,
    });
  };

  return (
    <div className="flex flex-col gap-2.5 px-2.5 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageHeader
          headerTitle="Fund Transfer"
          headerDescription="Transfer money seamlessly between Cash Drawer, Bank Accounts, and Mobile Financial Services (MFS)"
        />
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <RefreshButton onClick={handleRefreshAll} isLoading={isRefreshing} />
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 items-start">
        {/* Left Column: Transfer Form (8 cols on lg) */}
        <form onSubmit={handleSubmit} className="lg:col-span-8 flex flex-col gap-2.5 sm:gap-3">
          <div className="bg-white dark:bg-[var(--ui-surface)] rounded-xl border border-gray-300/80 dark:border-[var(--ui-border-strong)] shadow-2xs p-3 sm:p-4 flex flex-col gap-3">
            {/* Form Section Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-200/80 dark:border-[var(--ui-border)] gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-sky-100/70 dark:bg-sky-950/60 text-[var(--color-primary)] dark:text-sky-400 flex items-center justify-center text-xs shrink-0 border border-sky-200 dark:border-sky-800/60 shadow-2xs">
                  <FaExchangeAlt />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-[var(--ui-text)] tracking-wide">
                    Transfer Details
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-[var(--ui-text-subtle)] font-medium truncate">
                    Configure source, destination, amount, and reference details
                  </p>
                </div>
              </div>

              {/* Swap Direction Button */}
              <button
                type="button"
                onClick={handleSwap}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-300 dark:border-sky-700 bg-sky-100/70 dark:bg-sky-950/70 text-[var(--color-primary)] dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 hover:border-sky-400 dark:hover:border-sky-600 hover:shadow-2xs transition-all cursor-pointer text-xs font-bold shrink-0"
                title="Swap source and destination"
              >
                <FaRandom className="text-[10px]" />
                <span>Swap Direction</span>
              </button>
            </div>

            {/* Date & Amount Row */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
              {/* Transfer Date (4 cols) */}
              <div className="sm:col-span-4">
                <DatePicker
                  label="Transfer Date"
                  required
                  value={date}
                  onChange={(dStr) => {
                    setDate(dStr || todayStr);
                    if (errors.date) setErrors((prev) => ({ ...prev, date: "" }));
                  }}
                  displayFormat="DD MMM, YYYY"
                  isClearable={false}
                  placeholder="Select date"
                  error={errors.date}
                />
              </div>

              {/* Transfer Amount (8 cols) */}
              <div className="sm:col-span-8">
                <TextInput
                  label="Transfer Amount (৳)"
                  required
                  type="number"
                  step="any"
                  min="0"
                  value={amount}
                  onChange={(val) => {
                    setAmount(val);
                    if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }));
                  }}
                  placeholder="0.00"
                  error={errors.amount}
                  icon={<span className="text-gray-700 dark:text-[var(--ui-text-muted)] font-medium text-xs select-none">৳</span>}
                  inputClass="font-medium text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* From Account & To Account Section with Central Swap */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start relative">
                {/* 1. SOURCE: Transfer From */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-rose-300 dark:border-rose-800/60 bg-rose-100/50 dark:bg-rose-950/35 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 tracking-wide">
                      Transfer From
                    </span>
                    <span className="text-[11px] font-semibold text-gray-600 dark:text-[var(--ui-text-muted)]">
                      Balance: <b className="text-gray-900 dark:text-[var(--ui-text)] tabular-nums font-bold">৳ {formatMoney(fromBalance)}</b>
                    </span>
                  </div>

                  {/* 3 Source Method Options */}
                  <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                    {/* Cash Drawer */}
                    <button
                      type="button"
                      onClick={() => handleSwitchFromMethod("CASH")}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        fromMethod === "CASH"
                          ? "border-[var(--color-primary)] dark:border-sky-400 bg-sky-100/70 dark:bg-sky-950/60 ring-1 ring-[var(--color-primary)] dark:ring-sky-400 shadow-2xs text-[var(--color-primary)] dark:text-sky-300 font-bold"
                          : "border-gray-300/80 dark:border-[var(--ui-border)] bg-white dark:bg-[var(--ui-surface)] hover:bg-gray-50 dark:hover:bg-[var(--ui-surface-muted)] text-gray-700 dark:text-[var(--ui-text-muted)] hover:border-gray-400 dark:hover:border-[var(--ui-border-strong)] font-medium"
                      }`}
                    >
                      <FaWallet className="text-xs mb-0.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-[11px]">Cash Drawer</span>
                    </button>

                    {/* Bank Account */}
                    <button
                      type="button"
                      onClick={() => handleSwitchFromMethod("BANK")}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        fromMethod === "BANK"
                          ? "border-[var(--color-primary)] dark:border-sky-400 bg-sky-100/70 dark:bg-sky-950/60 ring-1 ring-[var(--color-primary)] dark:ring-sky-400 shadow-2xs text-[var(--color-primary)] dark:text-sky-300 font-bold"
                          : "border-gray-300/80 dark:border-[var(--ui-border)] bg-white dark:bg-[var(--ui-surface)] hover:bg-gray-50 dark:hover:bg-[var(--ui-surface-muted)] text-gray-700 dark:text-[var(--ui-text-muted)] hover:border-gray-400 dark:hover:border-[var(--ui-border-strong)] font-medium"
                      }`}
                    >
                      <FaLandmark className="text-xs mb-0.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-[11px]">Bank Account</span>
                    </button>

                    {/* MFS Wallet */}
                    <button
                      type="button"
                      onClick={() => handleSwitchFromMethod("MFS")}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        fromMethod === "MFS"
                          ? "border-[var(--color-primary)] dark:border-sky-400 bg-sky-100/70 dark:bg-sky-950/60 ring-1 ring-[var(--color-primary)] dark:ring-sky-400 shadow-2xs text-[var(--color-primary)] dark:text-sky-300 font-bold"
                          : "border-gray-300/80 dark:border-[var(--ui-border)] bg-white dark:bg-[var(--ui-surface)] hover:bg-gray-50 dark:hover:bg-[var(--ui-surface-muted)] text-gray-700 dark:text-[var(--ui-text-muted)] hover:border-gray-400 dark:hover:border-[var(--ui-border-strong)] font-medium"
                      }`}
                    >
                      <FaMobileAlt className="text-xs mb-0.5 text-purple-600 dark:text-purple-400" />
                      <span className="text-[11px]">MFS Wallet</span>
                    </button>
                  </div>

                  {/* Bank / MFS Selector Trigger */}
                  {fromMethod === "BANK" && (
                    <button
                      type="button"
                      onClick={() => setModalConfig({ isOpen: true, target: "FROM", type: "BANK" })}
                      className="w-full h-9 flex items-center justify-between px-2.5 rounded-lg border border-blue-300 dark:border-blue-800/70 bg-white dark:bg-[var(--ui-surface)] hover:bg-blue-50/70 dark:hover:bg-blue-950/30 transition-all cursor-pointer text-left shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FaLandmark className="text-xs text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="text-xs font-semibold text-gray-900 dark:text-[var(--ui-text)] truncate">
                          {fromBank
                            ? `${fromBank.bankName} - ${fromBank.accountNo}`
                            : "Choose Bank Account..."}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-[var(--color-primary)] dark:text-sky-400 shrink-0 flex items-center gap-1">
                        {fromBank ? "Change" : "Browse"} <FaChevronRight className="text-[8px]" />
                      </span>
                    </button>
                  )}

                  {fromMethod === "MFS" && (
                    <button
                      type="button"
                      onClick={() => setModalConfig({ isOpen: true, target: "FROM", type: "MFS" })}
                      className="w-full h-9 flex items-center justify-between px-2.5 rounded-lg border border-purple-300 dark:border-purple-800/70 bg-white dark:bg-[var(--ui-surface)] hover:bg-purple-50/70 dark:hover:bg-purple-950/30 transition-all cursor-pointer text-left shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FaMobileAlt className="text-xs text-purple-600 dark:text-purple-400 shrink-0" />
                        <span className="text-xs font-semibold text-gray-900 dark:text-[var(--ui-text)] truncate">
                          {fromWallet
                            ? `${fromWallet.method} - ${fromWallet.phoneNumber} (${fromWallet.name})`
                            : "Choose MFS Wallet..."}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-[var(--color-primary)] dark:text-sky-400 shrink-0 flex items-center gap-1">
                        {fromWallet ? "Change" : "Browse"} <FaChevronRight className="text-[8px]" />
                      </span>
                    </button>
                  )}

                  {errors.fromAccount && (
                    <p className="text-[11px] text-red-500 flex items-center gap-1 mt-0.5">
                      <FaExclamationTriangle className="text-[10px] shrink-0" /> {errors.fromAccount}
                    </p>
                  )}
                </div>

                {/* 2. DESTINATION: Transfer To */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-100/50 dark:bg-emerald-950/35 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tracking-wide">
                      Transfer To
                    </span>
                    <span className="text-[11px] font-semibold text-gray-600 dark:text-[var(--ui-text-muted)]">
                      Balance: <b className="text-gray-900 dark:text-[var(--ui-text)] tabular-nums font-bold">৳ {formatMoney(toBalance)}</b>
                    </span>
                  </div>

                  {/* 3 Destination Method Options */}
                  <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                    {/* Cash Drawer */}
                    <button
                      type="button"
                      onClick={() => handleSwitchToMethod("CASH")}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        toMethod === "CASH"
                          ? "border-[var(--color-primary)] dark:border-sky-400 bg-sky-100/70 dark:bg-sky-950/60 ring-1 ring-[var(--color-primary)] dark:ring-sky-400 shadow-2xs text-[var(--color-primary)] dark:text-sky-300 font-bold"
                          : "border-gray-300/80 dark:border-[var(--ui-border)] bg-white dark:bg-[var(--ui-surface)] hover:bg-gray-50 dark:hover:bg-[var(--ui-surface-muted)] text-gray-700 dark:text-[var(--ui-text-muted)] hover:border-gray-400 dark:hover:border-[var(--ui-border-strong)] font-medium"
                      }`}
                    >
                      <FaWallet className="text-xs mb-0.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-[11px]">Cash Drawer</span>
                    </button>

                    {/* Bank Account */}
                    <button
                      type="button"
                      onClick={() => handleSwitchToMethod("BANK")}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        toMethod === "BANK"
                          ? "border-[var(--color-primary)] dark:border-sky-400 bg-sky-100/70 dark:bg-sky-950/60 ring-1 ring-[var(--color-primary)] dark:ring-sky-400 shadow-2xs text-[var(--color-primary)] dark:text-sky-300 font-bold"
                          : "border-gray-300/80 dark:border-[var(--ui-border)] bg-white dark:bg-[var(--ui-surface)] hover:bg-gray-50 dark:hover:bg-[var(--ui-surface-muted)] text-gray-700 dark:text-[var(--ui-text-muted)] hover:border-gray-400 dark:hover:border-[var(--ui-border-strong)] font-medium"
                      }`}
                    >
                      <FaLandmark className="text-xs mb-0.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-[11px]">Bank Account</span>
                    </button>

                    {/* MFS Wallet */}
                    <button
                      type="button"
                      onClick={() => handleSwitchToMethod("MFS")}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        toMethod === "MFS"
                          ? "border-[var(--color-primary)] dark:border-sky-400 bg-sky-100/70 dark:bg-sky-950/60 ring-1 ring-[var(--color-primary)] dark:ring-sky-400 shadow-2xs text-[var(--color-primary)] dark:text-sky-300 font-bold"
                          : "border-gray-300/80 dark:border-[var(--ui-border)] bg-white dark:bg-[var(--ui-surface)] hover:bg-gray-50 dark:hover:bg-[var(--ui-surface-muted)] text-gray-700 dark:text-[var(--ui-text-muted)] hover:border-gray-400 dark:hover:border-[var(--ui-border-strong)] font-medium"
                      }`}
                    >
                      <FaMobileAlt className="text-xs mb-0.5 text-purple-600 dark:text-purple-400" />
                      <span className="text-[11px]">MFS Wallet</span>
                    </button>
                  </div>

                  {/* Bank / MFS Selector Trigger */}
                  {toMethod === "BANK" && (
                    <button
                      type="button"
                      onClick={() => setModalConfig({ isOpen: true, target: "TO", type: "BANK" })}
                      className="w-full h-9 flex items-center justify-between px-2.5 rounded-lg border border-blue-300 dark:border-blue-800/70 bg-white dark:bg-[var(--ui-surface)] hover:bg-blue-50/70 dark:hover:bg-blue-950/30 transition-all cursor-pointer text-left shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FaLandmark className="text-xs text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="text-xs font-semibold text-gray-900 dark:text-[var(--ui-text)] truncate">
                          {toBank
                            ? `${toBank.bankName} - ${toBank.accountNo}`
                            : "Choose Bank Account..."}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-[var(--color-primary)] dark:text-sky-400 shrink-0 flex items-center gap-1">
                        {toBank ? "Change" : "Browse"} <FaChevronRight className="text-[8px]" />
                      </span>
                    </button>
                  )}

                  {toMethod === "MFS" && (
                    <button
                      type="button"
                      onClick={() => setModalConfig({ isOpen: true, target: "TO", type: "MFS" })}
                      className="w-full h-9 flex items-center justify-between px-2.5 rounded-lg border border-purple-300 dark:border-purple-800/70 bg-white dark:bg-[var(--ui-surface)] hover:bg-purple-50/70 dark:hover:bg-purple-950/30 transition-all cursor-pointer text-left shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FaMobileAlt className="text-xs text-purple-600 dark:text-purple-400 shrink-0" />
                        <span className="text-xs font-semibold text-gray-900 dark:text-[var(--ui-text)] truncate">
                          {toWallet
                            ? `${toWallet.method} - ${toWallet.phoneNumber} (${toWallet.name})`
                            : "Choose MFS Wallet..."}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-[var(--color-primary)] dark:text-sky-400 shrink-0 flex items-center gap-1">
                        {toWallet ? "Change" : "Browse"} <FaChevronRight className="text-[8px]" />
                      </span>
                    </button>
                  )}

                  {errors.toAccount && (
                    <p className="text-[11px] text-red-500 flex items-center gap-1 mt-0.5">
                      <FaExclamationTriangle className="text-[10px] shrink-0" /> {errors.toAccount}
                    </p>
                  )}
                </div>
              </div>

              {/* Duplicate Account Warning Alert */}
              {isSameAccount && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <FaExclamationTriangle className="text-amber-600 dark:text-amber-400 text-sm shrink-0" />
                  <span>
                    <b>Warning:</b> Source and destination accounts cannot be the same. Please choose a different destination.
                  </span>
                </div>
              )}
            </div>

            {/* Insufficient Balance Alert */}
            {isInsufficient && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
                <FaExclamationTriangle className="text-red-600 dark:text-red-400 text-sm shrink-0" />
                <span>
                  <b>Insufficient Funds:</b> Source account available balance is <b>৳ {formatMoney(fromBalance)}</b>, but total required is <b>৳ {formatMoney(totalDeduction)}</b>.
                </span>
              </div>
            )}

            {/* Submit Action Bar */}
            <div className="pt-3 border-t border-gray-100 dark:border-[var(--ui-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="text-xs text-black dark:text-[var(--ui-text)] min-w-0">
                {amountNum > 0 ? (
                  <div className="leading-relaxed">
                    Transferring <b className="text-black dark:text-[var(--ui-text)] font-bold">৳ {formatMoney(amountNum)}</b> from{" "}
                    <b className="text-rose-700 dark:text-rose-400">{fromAccountLabel}</b> to{" "}
                    <b className="text-emerald-700 dark:text-emerald-400">{toAccountLabel}</b>
                  </div>
                ) : (
                  <span className="text-gray-500 dark:text-[var(--ui-text-subtle)]">
                    Enter the amount and select source & destination accounts to transfer.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  disabled={insertMutation.isPending}
                  onClick={() => {
                    setAmount("");
                    setErrors({});
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-[var(--ui-text-muted)] bg-white dark:bg-[var(--ui-surface)] hover:bg-gray-50 dark:hover:bg-[var(--ui-surface-muted)] border border-gray-300 dark:border-[var(--ui-border)] rounded-lg transition-all cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <Button
                  label={insertMutation.isPending ? "Transferring..." : "Transfer Now"}
                  type="submit"
                  size="sm"
                  disabled={amountNum <= 0 || isInsufficient || isSameAccount || insertMutation.isPending || !canCreate("fund_transfer")}
                  isLoading={insertMutation.isPending}
                  color="var(--color-primary)"
                  hoverColor="var(--color-primary-hover)"
                  buttonClass="!text-xs !py-1.5 !px-3.5 !rounded-lg font-semibold shadow-2xs !text-white flex items-center gap-1.5"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Right Column: Balances, Simulation & History (4 cols on lg) */}
        <div className="lg:col-span-4 flex flex-col gap-2.5 sm:gap-3">
          {/* Card 1: BALANCES */}
          <div className="bg-white dark:bg-[var(--ui-surface)] rounded-xl border border-gray-300/80 dark:border-[var(--ui-border-strong)] shadow-2xs p-3 sm:p-3.5 flex flex-col gap-2.5">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-200/80 dark:border-[var(--ui-border)]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs shrink-0 font-bold border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
                  <FaWallet />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-black dark:text-[var(--ui-text)] tracking-wide">
                    Balances
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-[var(--ui-text-subtle)] font-medium">Real-time channel funds</p>
                </div>
              </div>
            </div>

            {/* 3 Channels: Cash, Bank, MFS */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {/* Cash Drawer */}
              <div className="relative rounded-xl border border-emerald-300/80 dark:border-emerald-900/60 bg-gradient-to-b from-emerald-100/60 via-emerald-50/30 to-white dark:from-emerald-950/40 dark:via-emerald-950/25 dark:to-[var(--ui-surface)] p-2 sm:p-2.5 flex flex-col gap-1 transition-all hover:border-emerald-400 dark:hover:border-emerald-700 hover:shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wide text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                    <FaWallet className="text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0" />
                    Cash
                  </span>
                </div>
                <div
                  className="text-xs sm:text-[13px] font-extrabold text-black dark:text-[var(--ui-text)] tabular-nums truncate"
                  title={`৳ ${formatMoney(Number(cashBalance || 0))}`}
                >
                  ৳ {formatMoney(Number(cashBalance || 0))}
                </div>
              </div>

              {/* Bank Accounts */}
              <div className="relative rounded-xl border border-blue-300/80 dark:border-blue-900/60 bg-gradient-to-b from-blue-100/60 via-blue-50/30 to-white dark:from-blue-950/40 dark:via-blue-950/25 dark:to-[var(--ui-surface)] p-2 sm:p-2.5 flex flex-col gap-1 transition-all hover:border-blue-400 dark:hover:border-blue-700 hover:shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wide text-blue-800 dark:text-blue-300 flex items-center gap-1">
                    <FaLandmark className="text-[10px] text-blue-600 dark:text-blue-400 shrink-0" />
                    Bank
                  </span>
                  <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300 px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 shrink-0">
                    {activeBankAccounts.length}
                  </span>
                </div>
                <div
                  className="text-xs sm:text-[13px] font-extrabold text-black dark:text-[var(--ui-text)] tabular-nums truncate"
                  title={`৳ ${formatMoney(totalBankBalance)}`}
                >
                  ৳ {formatMoney(totalBankBalance)}
                </div>
              </div>

              {/* MFS Wallets */}
              <div className="relative rounded-xl border border-purple-300/80 dark:border-purple-900/60 bg-gradient-to-b from-purple-100/60 via-purple-50/30 to-white dark:from-purple-950/40 dark:via-purple-950/25 dark:to-[var(--ui-surface)] p-2 sm:p-2.5 flex flex-col gap-1 transition-all hover:border-purple-400 dark:hover:border-purple-700 hover:shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wide text-purple-800 dark:text-purple-300 flex items-center gap-1">
                    <FaMobileAlt className="text-[10px] text-purple-600 dark:text-purple-400 shrink-0" />
                    MFS
                  </span>
                  <span className="text-[9px] font-bold text-purple-700 dark:text-purple-300 px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-900/60 shrink-0">
                    {activeMfsAccounts.length}
                  </span>
                </div>
                <div
                  className="text-xs sm:text-[13px] font-extrabold text-black dark:text-[var(--ui-text)] tabular-nums truncate"
                  title={`৳ ${formatMoney(totalMfsBalance)}`}
                >
                  ৳ {formatMoney(totalMfsBalance)}
                </div>
              </div>
            </div>

            {/* Total Available Liquidity */}
            <div className="pt-2 border-t border-gray-200/80 dark:border-[var(--ui-border)] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-black dark:text-[var(--ui-text)] tracking-wide">
                  Total Available:
                </span>
                <span className="text-[10px] text-gray-500 dark:text-[var(--ui-text-subtle)] font-medium">(All Channels)</span>
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                ৳ {formatMoney(totalLiquidity)}
              </span>
            </div>
          </div>

          {/* Card 2: Transfer Flow Preview */}
          <div className="bg-white dark:bg-[var(--ui-surface)] rounded-xl border border-gray-300/80 dark:border-[var(--ui-border-strong)] shadow-2xs p-3 sm:p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200/80 dark:border-[var(--ui-border)]">
              <h3 className="text-xs font-bold text-black dark:text-[var(--ui-text)] tracking-wide flex items-center gap-1.5">
                <FaExchangeAlt className="text-[var(--color-primary)] dark:text-sky-400 text-xs" />
                Transfer Simulation
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100/70 dark:bg-sky-950/60 text-[var(--color-primary)] dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                Preview
              </span>
            </div>

            {/* Source Box */}
            <div className="bg-rose-100/50 dark:bg-rose-950/35 border border-rose-300/90 dark:border-rose-800/60 rounded-xl p-2.5 flex flex-col gap-1 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400">From (Source)</span>
                <span className="text-[11px] font-semibold text-gray-600 dark:text-[var(--ui-text-muted)]">Current: ৳ {formatMoney(fromBalance)}</span>
              </div>
              <span className="text-xs font-bold text-black dark:text-[var(--ui-text)] truncate">{fromAccountLabel}</span>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-rose-200/80 dark:border-rose-900/40 mt-0.5">
                <span className="text-gray-500 dark:text-[var(--ui-text-subtle)]">Balance After:</span>
                <span className={`font-bold tabular-nums ${afterFromBalance < 0 ? "text-rose-600 dark:text-rose-400" : "text-black dark:text-[var(--ui-text)]"}`}>
                  ৳ {formatMoney(afterFromBalance)}
                </span>
              </div>
            </div>

            {/* Center Direction Indicator */}
            <div className="flex items-center justify-center my-0.5 text-xs text-gray-400 dark:text-[var(--ui-text-subtle)] font-bold">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100/80 dark:bg-slate-800 border border-gray-300/80 dark:border-slate-700 text-black dark:text-[var(--ui-text)]">
                <span className="text-rose-600 dark:text-rose-400 font-bold tabular-nums">-৳ {formatMoney(totalDeduction)}</span>
                <FaArrowRight className="text-[10px] text-gray-400 dark:text-[var(--ui-text-subtle)]" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">+৳ {formatMoney(amountNum)}</span>
              </div>
            </div>

            {/* Destination Box */}
            <div className="bg-emerald-100/50 dark:bg-emerald-950/35 border border-emerald-300/90 dark:border-emerald-800/60 rounded-xl p-2.5 flex flex-col gap-1 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">To (Destination)</span>
                <span className="text-[11px] font-semibold text-gray-600 dark:text-[var(--ui-text-muted)]">Current: ৳ {formatMoney(toBalance)}</span>
              </div>
              <span className="text-xs font-bold text-black dark:text-[var(--ui-text)] truncate">{toAccountLabel}</span>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-emerald-200/80 dark:border-emerald-900/40 mt-0.5">
                <span className="text-gray-500 dark:text-[var(--ui-text-subtle)]">Balance After:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  ৳ {formatMoney(afterToBalance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reusable Account Picker Modal for Bank / MFS */}
      <AccountPickerModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        type={modalConfig.type}
        banks={activeBankAccounts}
        wallets={activeMfsAccounts}
        selectedBankId={
          modalConfig.target === "FROM" ? fromBank?.bankId : toBank?.bankId
        }
        selectedWalletId={
          modalConfig.target === "FROM" ? fromWallet?.id : toWallet?.id
        }
        onSelectBank={handleSelectBank}
        onSelectWallet={handleSelectWallet}
      />
    </div>
  );
};

export default FundTransferPage;

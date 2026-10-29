import React, { useState, useMemo } from "react";
import PageHeader from "@/components/page-header/PageHeader";
import { RefreshButton, Button, DatePicker, TextInput } from "@/components/common";
import { useCashBalanceQuery } from "@/hooks/useCashBalance";
import { useFinancialAccounts } from "@/hooks/useFinancialAccounts";
import { useCategoryListQuery } from "@/hooks/useCategoryQueries";
import {
  useFinancialTransactionsQuery,
  useInsertFinancialTransactionMutation,
} from "@/hooks/useFinanceQueries";
import AccountPickerModal from "./AccountPickerModal";
import CategoryPickerModal from "./CategoryPickerModal";
import { formatMoney } from "@/utils/formatters";
import type { BankAccountItem, MfsUserItem, CategoryItem, CategoryType } from "@/types";
import {
  FaArrowDown,
  FaArrowUp,
  FaWallet,
  FaLandmark,
  FaMobileAlt,
  FaTag,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaHistory,
  FaPlus,
  FaChevronRight,
  FaReceipt,
} from "react-icons/fa";

export type FinancialEntryMode = "EXPENSE" | "INCOME";
type PaymentMethod = "CASH" | "BANK" | "MFS";

export interface FinancialEntryPageProps {
  mode: FinancialEntryMode;
}

const getTodayString = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const FinancialEntryPage: React.FC<FinancialEntryPageProps> = ({ mode }) => {
  const isExpense = mode === "EXPENSE";
  const todayStr = useMemo(() => getTodayString(), []);

  // Configuration determined strictly by mode
  const config = useMemo(() => {
    return {
      title: isExpense ? "Expense Entry" : "Income Entry",
      description: isExpense
        ? "Record operational expenditures and outgoing funds with real-time account balances"
        : "Record business revenues and incoming funds deposited directly into Cash, Bank, or MFS",
      categoryType: (isExpense ? "Expense" : "Income") as CategoryType,
      detailsCardTitle: isExpense ? "Expense Details" : "Income Details",
      detailsCardSubtitle: isExpense
        ? "Select expense category, transaction date, amount, and payment account"
        : "Select income category, collection date, amount, and deposit account",
      categoryLabel: isExpense ? "Expense Category" : "Income Category",
      dateLabel: isExpense ? "Expense Date" : "Income Date",
      amountLabel: isExpense ? "Expense Amount" : "Income Amount",
      categoryPlaceholder: isExpense ? "Select expense category..." : "Select income category...",
      accountSectionLabel: isExpense ? "Payment From" : "Deposit To",
      submitLabel: isExpense ? "Save" : "Save",
      previewVerb: isExpense ? "Saving" : "Depositing",
      previewPreposition: isExpense ? "from" : "to",
      recentTitle: isExpense ? "Recent Expenses" : "Recent Income",
      recentSubtitle: isExpense ? "Latest debits from financial ledger" : "Latest credits to financial ledger",
      amountPrefix: isExpense ? "-৳" : "+৳",
      amountColor: isExpense ? "text-rose-600" : "text-emerald-600",
      themeBg: isExpense ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700",
      Icon: isExpense ? FaArrowDown : FaArrowUp,
    };
  }, [isExpense]);

  // Form State
  const [amount, setAmount] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [selectedBank, setSelectedBank] = useState<BankAccountItem | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<MfsUserItem | null>(null);
  const [date, setDate] = useState<string>(todayStr);
  const [note, setNote] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Modals State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Queries
  const {
    data: cashBalance = 0,
    refetch: refetchCash,
    isRefetching: isRefetchingCash,
  } = useCashBalanceQuery({
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const {
    registeredBankAccounts,
    registeredMfsAccounts,
    bankQuery,
    mfsQuery,
  } = useFinancialAccounts();

  const {
    data: categoryData,
    refetch: refetchCategories,
    isLoading: isLoadingCategories,
  } = useCategoryListQuery({ type: config.categoryType });


  const {
    data: transactions = [],
    refetch: refetchTransactions,
  } = useFinancialTransactionsQuery({ type: mode });

  // Mutation
  const insertMutation = useInsertFinancialTransactionMutation({
    onSuccess: () => {
      setAmount("");
      setSelectedCategory(null);
      setNote("");
      setDate(todayStr);
      setErrors({});
    },
  });

  // Filter Active Accounts
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

  const totalBankBalance = useMemo(() => {
    return activeBankAccounts.reduce((sum, b) => sum + (b.currentBalance || 0), 0);
  }, [activeBankAccounts]);

  const totalMfsBalance = useMemo(() => {
    return activeMfsAccounts.reduce((sum, w) => sum + (w.currentBalance || 0), 0);
  }, [activeMfsAccounts]);

  // Source balance logic
  const sourceBalance = useMemo(() => {
    if (paymentMethod === "CASH") return Number(cashBalance || 0);
    if (paymentMethod === "BANK") {
      return selectedBank ? selectedBank.currentBalance : totalBankBalance;
    }
    if (paymentMethod === "MFS") {
      return selectedWallet ? selectedWallet.currentBalance : totalMfsBalance;
    }
    return 0;
  }, [paymentMethod, selectedBank, selectedWallet, cashBalance, totalBankBalance, totalMfsBalance]);

  const amountNum = Number(amount || 0);
  const afterBalance = isExpense ? sourceBalance - amountNum : sourceBalance + amountNum;
  const isOverBalance = isExpense && amountNum > 0 && sourceBalance > 0 && amountNum > sourceBalance;
  const isFutureDate = date > todayStr;

  // Categories list & frequent chips
  const categories = useMemo(() => categoryData?.categoryList || [], [categoryData]);
  const activeCategories = useMemo(() => {
    return categories.filter(
      (c) =>
        c.status.toLowerCase() === "active" &&
        c.type.toLowerCase() === config.categoryType.toLowerCase()
    );
  }, [categories, config.categoryType]);

  // Filter recent entries for this mode
  const recentTransactions = useMemo(() => {
    return (transactions || [])
      .filter((t) => String(t.type || "").toUpperCase() === mode)
      .slice(0, 6);
  }, [transactions, mode]);

  // Overall refresh handler
  const handleRefreshAll = async () => {
    await Promise.all([
      refetchCash(),
      bankQuery.refetch(),
      mfsQuery.refetch(),
      refetchCategories(),
      refetchTransactions(),
    ]);
  };

  const isRefreshing =
    isRefetchingCash ||
    bankQuery.isRefetching ||
    mfsQuery.isRefetching;

  // Switch payment method
  const handleSwitchMethod = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method === "BANK" && !selectedBank) {
      if (activeBankAccounts.length === 1) {
        setSelectedBank(activeBankAccounts[0]);
      } else {
        setIsAccountModalOpen(true);
      }
    } else if (method === "MFS" && !selectedWallet) {
      if (activeMfsAccounts.length === 1) {
        setSelectedWallet(activeMfsAccounts[0]);
      } else {
        setIsAccountModalOpen(true);
      }
    }
  };

  // Form submit validation & execution
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!amountNum || amountNum <= 0) {
      newErrors.amount = "Please enter a valid amount greater than 0";
    }
    if (!selectedCategory) {
      newErrors.category = `Please select an ${config.categoryType.toLowerCase()} category`;
    }
    if (paymentMethod === "BANK" && !selectedBank) {
      newErrors.account = "Please select a bank account";
    }
    if (paymentMethod === "MFS" && !selectedWallet) {
      newErrors.account = "Please select an MFS wallet";
    }
    if (!date) {
      newErrors.date = "Please select a date";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const when = new Date(date);
    const validWhen = isNaN(when.getTime()) ? new Date() : when;
    const yearmonth = validWhen
      .toLocaleString("en-US", { month: "short", year: "numeric" })
      .replace(" ", "-");

    const accountLabel =
      paymentMethod === "BANK"
        ? selectedBank!.bankName
        : paymentMethod === "MFS"
        ? `${selectedWallet!.method} - ${selectedWallet!.phoneNumber}`
        : "Cash";

    const accountNumber =
      paymentMethod === "BANK"
        ? selectedBank!.accountNo
        : paymentMethod === "MFS"
        ? String(selectedWallet!.id)
        : null;

    insertMutation.mutate({
      type: mode,
      amount: amountNum,
      collectionAmount: 0,
      dueAmount: 0,
      categoryId: String(selectedCategory!.categoryId),
      accountType: paymentMethod,
      account: accountLabel,
      accountNumber,
      bill_ref: `${Date.now()}${Math.floor(100 + Math.random() * 900)}`,
      refNo: "",
      head: selectedCategory!.categoryName,
      items: "",
      notes: note.trim(),
      transactionDate: validWhen.toISOString(),
      yearmonth,
    });
  };

  const HeaderIcon = config.Icon;

  return (
    <div className="flex flex-col gap-2.5 px-2.5 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageHeader
          headerTitle={config.title}
          headerDescription={config.description}
        />
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <RefreshButton onClick={handleRefreshAll} isLoading={isRefreshing} />
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 items-start">
        {/* Left Column: Form Section (8 cols on lg) */}
        <form onSubmit={handleSubmit} className="lg:col-span-8 flex flex-col gap-2.5 sm:gap-3">
          {/* Card 1: Category, Date & Amount */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-3 sm:p-3.5 flex flex-col gap-2.5 sm:gap-3">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${config.themeBg}`}
                >
                  <HeaderIcon />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-black tracking-wide uppercase">
                    {config.detailsCardTitle}
                  </h3>
                  <p className="text-[11px] text-gray-700 font-medium">{config.detailsCardSubtitle}</p>
                </div>
              </div>
            </div>

            {/* Inputs Grid: Category, Date & Amount in 1 line */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
              {/* 1. Category Box */}
              <div>
                <label className="text-xs font-semibold text-black block mb-1">
                  {config.categoryLabel} <span className="text-red-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className={`w-full h-9 flex items-center justify-between px-2.5 rounded-lg border text-left transition-all cursor-pointer bg-white ${
                    errors.category
                      ? "border-red-500 ring-1 ring-red-500"
                      : selectedCategory
                      ? "border-sky-400 bg-sky-50/50 hover:bg-sky-50 shadow-2xs"
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50/80"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FaTag
                      className={`text-xs shrink-0 ${
                        selectedCategory ? "text-[var(--color-primary)]" : "text-gray-500"
                      }`}
                    />
                    <span
                      className={`text-xs truncate ${
                        selectedCategory ? "text-black font-bold" : "text-gray-400"
                      }`}
                    >
                      {selectedCategory
                        ? selectedCategory.categoryName
                        : config.categoryPlaceholder}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary)] shrink-0 ml-1.5">
                    <span>{selectedCategory ? "Change" : "Browse"}</span>
                    <FaChevronRight className="text-[8px]" />
                  </div>
                </button>
                {errors.category && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <FaExclamationTriangle className="text-[10px] shrink-0" /> {errors.category}
                  </p>
                )}
              </div>

              {/* 2. Date Box */}
              <div>
                <label className="text-xs font-semibold text-black block mb-1">
                  {config.dateLabel} <span className="text-red-600">*</span>
                </label>
                <DatePicker
                  value={date}
                  onChange={(dateStr) => {
                    setDate(dateStr || todayStr);
                    if (errors.date) setErrors((prev) => ({ ...prev, date: "" }));
                  }}
                  displayFormat="DD MMM, YYYY"
                  isClearable={false}
                  size="md"
                  placeholder="Select date"
                  error={errors.date}
                />
              </div>

              {/* 3. Amount Box */}
              <div>
                <TextInput
                  label={`${config.amountLabel} (৳)`}
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
                  icon={<span className="text-gray-700 font-bold text-xs select-none">৳</span>}
                  inputClass="font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Payment Source / Destination Segmented 3-Col Grid */}
            <div className="flex flex-col gap-1 pt-0.5">
              <label className="text-xs font-semibold text-black block mb-1">
                {config.accountSectionLabel} <span className="text-red-600">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Cash Tab */}
                <button
                  type="button"
                  onClick={() => handleSwitchMethod("CASH")}
                  className={`flex flex-col p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    paymentMethod === "CASH"
                      ? "border-[var(--color-primary)] bg-sky-50/70 ring-1 ring-[var(--color-primary)] shadow-2xs"
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50/80 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-black flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-sky-100 text-[var(--color-primary)] flex items-center justify-center text-xs">
                        <FaWallet />
                      </div>
                      Cash Drawer
                    </span>
                    {paymentMethod === "CASH" && (
                      <FaCheckCircle className="text-[var(--color-primary)] text-xs" />
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-black truncate">
                    ৳ {formatMoney(Number(cashBalance || 0))}
                  </span>
                  <span className="text-[10px] text-gray-700 font-medium mt-0.5">Available Balance</span>
                </button>

                {/* Bank Tab */}
                <button
                  type="button"
                  onClick={() => handleSwitchMethod("BANK")}
                  className={`flex flex-col p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    paymentMethod === "BANK"
                      ? "border-[var(--color-primary)] bg-sky-50/70 ring-1 ring-[var(--color-primary)] shadow-2xs"
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50/80 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-black flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center text-xs">
                        <FaLandmark />
                      </div>
                      Bank Account
                    </span>
                    {paymentMethod === "BANK" && (
                      <FaCheckCircle className="text-[var(--color-primary)] text-xs" />
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-black truncate">
                    {selectedBank
                      ? `৳ ${formatMoney(selectedBank.currentBalance)}`
                      : `৳ ${formatMoney(totalBankBalance)}`}
                  </span>
                  <span className="text-[10px] text-[var(--color-primary)] font-bold flex items-center gap-1 mt-0.5 truncate">
                    {selectedBank ? selectedBank.bankName : "Choose account"}
                    <FaChevronRight className="text-[8px]" />
                  </span>
                </button>

                {/* MFS Tab */}
                <button
                  type="button"
                  onClick={() => handleSwitchMethod("MFS")}
                  className={`flex flex-col p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    paymentMethod === "MFS"
                      ? "border-[var(--color-primary)] bg-sky-50/70 ring-1 ring-[var(--color-primary)] shadow-2xs"
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50/80 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-black flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center text-xs">
                        <FaMobileAlt />
                      </div>
                      MFS Wallet
                    </span>
                    {paymentMethod === "MFS" && (
                      <FaCheckCircle className="text-[var(--color-primary)] text-xs" />
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-black truncate">
                    {selectedWallet
                      ? `৳ ${formatMoney(selectedWallet.currentBalance)}`
                      : `৳ ${formatMoney(totalMfsBalance)}`}
                  </span>
                  <span className="text-[10px] text-[var(--color-primary)] font-bold flex items-center gap-1 mt-0.5 truncate">
                    {selectedWallet ? selectedWallet.method : "Choose wallet"}
                    <FaChevronRight className="text-[8px]" />
                  </span>
                </button>
              </div>

              {errors.account && (
                <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
                  <FaExclamationTriangle className="text-xs shrink-0" /> {errors.account}
                </p>
              )}
            </div>

            {/* Notes Input */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-black">
                Notes & Reference <span className="text-gray-500 font-normal">(Optional)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 300))}
                rows={2}
                placeholder={
                  isExpense
                    ? "e.g. Office electricity bill for this month, paid via bank cheque/transfer"
                    : "e.g. Consulting fees from client, deposited via Bank"
                }
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all resize-none text-black placeholder:text-gray-400"
              />
              <div className="text-right text-[10px] text-gray-500 font-medium -mt-0.5">
                {note.length}/300 characters
              </div>
            </div>

            {/* Insufficient Balance Alert (Expense only) */}
            {isOverBalance && (
              <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <FaExclamationTriangle className="text-amber-500 text-sm mt-0.5 shrink-0" />
                <div className="leading-relaxed">
                  <b>Insufficient Balance Warning:</b> This expense of <b>৳ {formatMoney(amountNum)}</b> exceeds the
                  available balance in {paymentMethod} (৳ {formatMoney(sourceBalance)}).
                  The standing balance will turn negative upon recording.
                </div>
              </div>
            )}

            {/* Future Date Alert */}
            {isFutureDate && (
              <div className="p-2 rounded-xl bg-blue-50/90 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
                <FaInfoCircle className="text-blue-500 text-sm shrink-0" />
                <span>The transaction date is set to a future date.</span>
              </div>
            )}

            {/* Submit Action Bar */}
            <div className="pt-2.5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="text-xs text-black min-w-0">
                {amountNum > 0 ? (
                  <div className="leading-relaxed">
                    {config.previewVerb}{" "}
                    <b className="text-black font-bold">৳ {formatMoney(amountNum)}</b>{" "}
                    {config.previewPreposition}{" "}
                    <b className="text-[var(--color-primary)]">{paymentMethod}</b>
                    {selectedCategory && (
                      <span>
                        {" "}
                        · <b>{selectedCategory.categoryName}</b>
                      </span>
                    )}
                    <span className="text-gray-700 ml-1.5 font-medium">
                      (Balance after:{" "}
                      <b
                        className={
                          afterBalance < 0 ? "text-rose-600 font-bold" : "text-emerald-700 font-bold"
                        }
                      >
                        ৳ {formatMoney(afterBalance)}
                      </b>
                      )
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-600 font-medium">
                    Fill in the amount, select category and payment account to save.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAmount("");
                    setSelectedCategory(null);
                    setNote("");
                    setErrors({});
                  }}
                  disabled={insertMutation.isPending}
                  className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  Cancel
                </button>
                <Button
                  label={insertMutation.isPending ? "Saving..." : config.submitLabel}
                  type="submit"
                  size="sm"
                  isLoading={insertMutation.isPending}
                  disabled={insertMutation.isPending}
                  color="var(--color-primary)"
                  hoverColor="var(--color-primary-hover)"
                  buttonClass="!text-xs !py-1.5 !px-3 !rounded-lg font-semibold shadow-2xs !text-white"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Right Column: Live Summary & Balance Intelligence (4 cols on lg) */}
        <div className="lg:col-span-4 flex flex-col gap-2.5 sm:gap-3">
          {/* Card 1: LIVE BALANCES */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-3 sm:p-3.5 flex flex-col gap-2.5">
            {/* Header */}
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shrink-0">
                <FaWallet />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-black tracking-wide uppercase">
                Live Balances
              </h3>
            </div>

            {/* 3 Mini Balance Cards */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <div className="bg-gray-50/90 border border-gray-200 rounded-lg p-2 text-center flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-black uppercase tracking-wider mb-0.5">
                  CASH
                </span>
                <span
                  className="text-xs sm:text-[13px] font-bold text-black truncate max-w-full"
                  title={`৳ ${formatMoney(Number(cashBalance || 0))}`}
                >
                  ৳ {formatMoney(Number(cashBalance || 0))}
                </span>
              </div>

              <div className="bg-gray-50/90 border border-gray-200 rounded-lg p-2 text-center flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-black uppercase tracking-wider mb-0.5">
                  BANK
                </span>
                <span
                  className="text-xs sm:text-[13px] font-bold text-black truncate max-w-full"
                  title={`৳ ${formatMoney(totalBankBalance)}`}
                >
                  ৳ {formatMoney(totalBankBalance)}
                </span>
              </div>

              <div className="bg-gray-50/90 border border-gray-200 rounded-lg p-2 text-center flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-black uppercase tracking-wider mb-0.5">
                  MFS
                </span>
                <span
                  className="text-xs sm:text-[13px] font-bold text-black truncate max-w-full"
                  title={`৳ ${formatMoney(totalMfsBalance)}`}
                >
                  ৳ {formatMoney(totalMfsBalance)}
                </span>
              </div>
            </div>

            {/* Balance After Entry Row */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-black">
                Balance After Entry ({paymentMethod}):
              </span>
              <span
                className={`text-xs sm:text-sm font-bold ${
                  afterBalance < 0 ? "text-rose-600" : "text-emerald-700"
                }`}
              >
                ৳ {formatMoney(afterBalance)}
              </span>
            </div>
          </div>

          {/* Card 2: Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-3 sm:p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs shrink-0">
                  <FaHistory />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-black tracking-wide uppercase">
                    {config.recentTitle}
                  </h3>
                  <p className="text-[11px] text-gray-700 font-medium">{config.recentSubtitle}</p>
                </div>
              </div>
              <span className="text-[11px] text-black font-semibold">
                {recentTransactions.length} entries
              </span>
            </div>

            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-0.5 custom-scrollbar">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500 font-medium flex flex-col items-center gap-1.5">
                  <FaReceipt className="text-xl text-gray-400" />
                  <span>No recent {config.categoryType.toLowerCase()} transactions recorded.</span>
                </div>
              ) : (
                recentTransactions.map((r: any, idx: number) => {
                  const txDate = r.transactionDate ? String(r.transactionDate).slice(0, 10) : "";
                  const m = String(r.accountType || "Cash").toUpperCase();
                  const badgeColor =
                    m === "CASH"
                      ? "bg-sky-50 text-sky-700 border-sky-300"
                      : m === "BANK"
                      ? "bg-purple-50 text-purple-700 border-purple-300"
                      : "bg-amber-50 text-amber-700 border-amber-300";

                  return (
                    <div
                      key={r.bill_ref || idx}
                      className="flex items-center justify-between p-2 rounded-xl border border-gray-200 hover:border-gray-300 bg-gray-50/40 hover:bg-white transition-all shadow-2xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-black truncate">
                          {r.head || config.categoryType}
                        </div>
                        <div className="text-[11px] text-gray-600 font-medium flex items-center gap-2 mt-0.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}
                          >
                            {r.account || r.accountType}
                          </span>
                          <span>{txDate}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-xs font-bold ${config.amountColor}`}>
                          {config.amountPrefix} {formatMoney(Number(r.amount || 0))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account Picker Modal */}
      {isAccountModalOpen && (
        <AccountPickerModal
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          type={paymentMethod === "BANK" ? "BANK" : "MFS"}
          banks={activeBankAccounts}
          wallets={activeMfsAccounts}
          selectedBankId={selectedBank?.bankId}
          selectedWalletId={selectedWallet?.id}
          onSelectBank={(b) => {
            setSelectedBank(b);
            if (errors.account) setErrors((prev) => ({ ...prev, account: "" }));
          }}
          onSelectWallet={(w) => {
            setSelectedWallet(w);
            if (errors.account) setErrors((prev) => ({ ...prev, account: "" }));
          }}
        />
      )}

      {/* Category Picker Modal */}
      {isCategoryModalOpen && (
        <CategoryPickerModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          type={config.categoryType}
          categories={categories}
          selectedCategoryId={selectedCategory?.categoryId}
          onSelectCategory={(c) => {
            setSelectedCategory(c);
            if (errors.category) setErrors((prev) => ({ ...prev, category: "" }));
          }}
        />
      )}
    </div>
  );
};

export default FinancialEntryPage;

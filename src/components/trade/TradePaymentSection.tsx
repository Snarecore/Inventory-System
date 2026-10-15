import React, { useState } from "react";
import { FaMoneyBillWave, FaCreditCard, FaMobileAlt, FaWallet } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import { showErrorToast } from "@/utils/toast-utils";
import type { UseTradePaymentReturn, TradePaymentAccount } from "@/hooks/useTradePayment";

export interface TradePaymentSectionProps {
  grandTotal: number;
  payment: UseTradePaymentReturn;
  registeredBankAccounts: TradePaymentAccount[];
  registeredMfsAccounts: TradePaymentAccount[];
  title?: string;
  headerIcon?: React.ReactNode;
  bankLabel?: string;
  showQuickActions?: boolean;
  showCashTenderedToggle?: boolean;
  disabled?: boolean;
}

export const TradePaymentSection: React.FC<TradePaymentSectionProps> = ({
  grandTotal,
  payment,
  registeredBankAccounts,
  registeredMfsAccounts,
  title = "Payment Details",
  headerIcon,
  bankLabel = "BANK",
  showQuickActions = true,
  showCashTenderedToggle = true,
  disabled = false,
}) => {
  const [showCashGivenCalc, setShowCashGivenCalc] = useState<boolean>(false);

  const {
    cashAmount,
    bankAmount,
    mfsAmount,
    cashGiven,
    selectedBankId,
    selectedMfsId,
    numCash,
    changeReturnAmount,
    handleCashAmountChange,
    handleBankAmountChange,
    handleMfsAmountChange,
    setCashGiven,
    handleSelectBank,
    handleSelectMfs,
    handlePayFullCash,
    handlePayFullBank,
    handlePayFullMfs,
    handlePayFullCredit,
  } = payment;

  return (
    <div className="space-y-1.5">
      {/* Header and Quick Payment Presets */}
      <div className="flex items-center justify-between flex-wrap gap-1">
        <span className="text-[11px] font-bold text-gray-800 tracking-wider flex items-center gap-1.5">
          {headerIcon || <FaWallet size={11} className="text-gray-700" />}
          {title}
        </span>

        {showQuickActions && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={disabled || grandTotal <= 0}
              onClick={handlePayFullCash}
              className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cash
            </button>
            <button
              type="button"
              disabled={disabled || grandTotal <= 0}
              onClick={handlePayFullBank}
              className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100 shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {bankLabel === "CARD" ? "Card" : "Bank"}
            </button>
            <button
              type="button"
              disabled={disabled || grandTotal <= 0}
              onClick={handlePayFullMfs}
              className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-50 text-purple-800 border border-purple-300 hover:bg-purple-100 shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              MFS
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={handlePayFullCredit}
              className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Credit
            </button>
          </div>
        )}
      </div>

      {/* Payment Breakdown Cards */}
      <div className="flex flex-col gap-1.5">
        {/* 1. Cash Card */}
        <div
          className={`px-2.5 py-1 rounded-md border transition-all flex items-center justify-between gap-1.5 shadow-2xs ${
            Number(cashAmount) > 0
              ? "border-emerald-400 bg-emerald-50/30"
              : "border-gray-200 bg-gray-50/50 hover:bg-white"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <FaMoneyBillWave size={11} />
            </div>
            <span className="font-bold text-[11px] text-gray-800 tracking-wider">CASH</span>
          </div>

          <div
            className={`flex items-center h-6.5 rounded border bg-white overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-2xs ${
              Number(cashAmount) > 0
                ? "border-emerald-500 ring-1 ring-emerald-500/50"
                : "border-gray-300 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500"
            }`}
          >
            <span className="text-[11px] text-gray-600 font-bold px-1.5 bg-gray-50 h-full flex items-center border-r border-gray-200 select-none">
              ৳
            </span>
            <input
              type="number"
              step="0.01"
              placeholder="0"
              disabled={disabled}
              value={cashAmount}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => handleCashAmountChange(e.target.value)}
              className="w-full text-right px-1.5 text-xs font-bold text-black outline-none bg-transparent placeholder:text-gray-400 h-full"
            />
          </div>
        </div>

        {/* Change Calculator Toggle */}
        {showCashTenderedToggle && numCash > 0 && (
          <div className="flex items-center justify-end gap-2 text-[10px] px-1 -my-0.5">
            <button
              type="button"
              onClick={() => setShowCashGivenCalc(!showCashGivenCalc)}
              className="text-[var(--color-primary)] cursor-pointer font-bold"
            >
              {showCashGivenCalc ? "- Hide Change Calculator" : "+ Calculate Cash Change / ভাংতি"}
            </button>
          </div>
        )}

        {/* Cash Tendered & Change Return Block */}
        {showCashGivenCalc && numCash > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-emerald-50/60 px-2 py-1 rounded-md border border-emerald-200 shadow-2xs">
            <span className="text-[11px] text-gray-800 font-semibold">Cash Tendered:</span>
            <div className="flex items-center gap-1.5">
              <div className="relative w-28 sm:w-32">
                <span className="absolute left-1.5 top-0.5 text-gray-600 text-xs font-bold">৳</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5000"
                  disabled={disabled}
                  value={cashGiven || ""}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setCashGiven(e.target.value)}
                  className="w-full pl-4.5 pr-1.5 py-0.5 text-xs border border-gray-300 rounded text-right font-bold text-black bg-white outline-none focus:border-emerald-500 h-6"
                />
              </div>
              {changeReturnAmount > 0 && (
                <span className="text-[11px] text-emerald-800 font-bold whitespace-nowrap">
                  Return: ৳{formatMoney(changeReturnAmount)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 2. Card / Bank Card */}
        <div
          className={`px-2.5 py-1 rounded-md border transition-all flex items-center justify-between gap-1.5 shadow-2xs ${
            Number(bankAmount) > 0
              ? "border-sky-400 bg-sky-50/30"
              : "border-gray-200 bg-gray-50/50 hover:bg-white"
          }`}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
            <div className="w-6 h-6 rounded bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <FaCreditCard size={11} />
            </div>
            <span className="font-bold text-[11px] text-gray-800 tracking-wider shrink-0">
              {bankLabel}
            </span>
            <select
              disabled={disabled}
              value={selectedBankId}
              onChange={(e) => handleSelectBank(e.target.value)}
              className="h-6.5 w-full max-w-[130px] sm:max-w-[215px] px-1.5 text-[11px] border border-gray-300 rounded bg-white text-black font-medium focus:outline-none focus:border-sky-500 cursor-pointer truncate disabled:opacity-50"
            >
              <option value="" className="text-black">
                {registeredBankAccounts.length ? `Select ${bankLabel}...` : "No bank registered"}
              </option>
              {registeredBankAccounts.map((b) => (
                <option
                  key={b.id}
                  value={b.id}
                  className="text-black"
                >
                  {b.bankName}
                  {b.accountNo ? ` – ${b.accountNo}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div
            onClick={() => {
              if (!selectedBankId && !disabled) {
                showErrorToast("Please select a bank account first");
              }
            }}
            className={`flex items-center h-6.5 rounded border bg-white overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-2xs ${
              !selectedBankId
                ? "border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed"
                : Number(bankAmount) > 0
                ? "border-sky-500 ring-1 ring-sky-500/50"
                : "border-gray-300 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500"
            }`}
          >
            <span className="text-[11px] text-gray-600 font-bold px-1.5 bg-gray-50 h-full flex items-center border-r border-gray-200 select-none">
              ৳
            </span>
            <input
              type="number"
              step="0.01"
              placeholder="0"
              disabled={disabled || !selectedBankId}
              value={bankAmount}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => handleBankAmountChange(e.target.value)}
              className="w-full text-right px-1.5 text-xs font-bold text-black outline-none bg-transparent placeholder:text-gray-400 h-full disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* 3. MFS Card */}
        <div
          className={`px-2.5 py-1 rounded-md border transition-all flex items-center justify-between gap-1.5 shadow-2xs ${
            Number(mfsAmount) > 0
              ? "border-purple-400 bg-purple-50/30"
              : "border-gray-200 bg-gray-50/50 hover:bg-white"
          }`}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
            <div className="w-6 h-6 rounded bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <FaMobileAlt size={11} />
            </div>
            <span className="font-bold text-[11px] text-gray-800 tracking-wider shrink-0">MFS</span>
            <select
              disabled={disabled}
              value={selectedMfsId}
              onChange={(e) => handleSelectMfs(e.target.value)}
              className="h-6.5 w-full max-w-[130px] sm:max-w-[215px] px-1.5 text-[11px] border border-gray-300 rounded bg-white text-black font-medium focus:outline-none focus:border-purple-500 cursor-pointer truncate disabled:opacity-50"
            >
              <option value="" className="text-black">
                {registeredMfsAccounts.length ? "Select MFS..." : "No MFS registered"}
              </option>
              {registeredMfsAccounts.map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                  className="text-black"
                >
                  {m.mfsName}
                  {m.mfsPhone ? ` – ${m.mfsPhone}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div
            onClick={() => {
              if (!selectedMfsId && !disabled) {
                showErrorToast("Please select an MFS provider first");
              }
            }}
            className={`flex items-center h-6.5 rounded border bg-white overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-2xs ${
              !selectedMfsId
                ? "border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed"
                : Number(mfsAmount) > 0
                ? "border-purple-500 ring-1 ring-purple-500/50"
                : "border-gray-300 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500"
            }`}
          >
            <span className="text-[11px] text-gray-600 font-bold px-1.5 bg-gray-50 h-full flex items-center border-r border-gray-200 select-none">
              ৳
            </span>
            <input
              type="number"
              step="0.01"
              placeholder="0"
              disabled={disabled || !selectedMfsId}
              value={mfsAmount}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => handleMfsAmountChange(e.target.value)}
              className="w-full text-right px-1.5 text-xs font-bold text-black outline-none bg-transparent placeholder:text-gray-400 h-full disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradePaymentSection;

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
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ui-text)]">
          {headerIcon || <FaWallet size={11} className="text-[var(--ui-text)]" />}
          {title}
        </span>

        {showQuickActions && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={disabled || grandTotal <= 0}
              onClick={handlePayFullCash}
              className="px-1.5 py-0.5 text-[10px] font-bold rounded-[var(--ui-radius-sm)] bg-[var(--ui-success-light)] text-[var(--ui-success-dark)] border border-[var(--ui-success-border)] hover:bg-[var(--ui-success-border)] shadow-[var(--ui-shadow-control)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cash
            </button>
            <button
              type="button"
              disabled={disabled || grandTotal <= 0}
              onClick={handlePayFullBank}
              className="px-1.5 py-0.5 text-[10px] font-bold rounded-[var(--ui-radius-sm)] bg-[var(--primary-color-light)] text-[var(--primary-color-dark)] border border-[var(--primary-color-muted)] hover:bg-[var(--primary-color-muted)] shadow-[var(--ui-shadow-control)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {bankLabel === "CARD" ? "Card" : "Bank"}
            </button>
            <button
              type="button"
              disabled={disabled || grandTotal <= 0}
              onClick={handlePayFullMfs}
              className="px-1.5 py-0.5 text-[10px] font-bold rounded-[var(--ui-radius-sm)] bg-[var(--ui-info-light)] text-[var(--ui-info-dark)] border border-[var(--ui-info-border)] hover:bg-[var(--ui-info-border)] shadow-[var(--ui-shadow-control)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              MFS
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={handlePayFullCredit}
              className="px-1.5 py-0.5 text-[10px] font-bold rounded-[var(--ui-radius-sm)] bg-[var(--ui-danger-light)] text-[var(--ui-danger-dark)] border border-[var(--ui-danger-border)] hover:bg-[var(--ui-danger-border)] shadow-[var(--ui-shadow-control)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
          className={`px-2.5 py-1 rounded-[var(--ui-radius-sm)] border transition-all flex items-center justify-between gap-1.5 shadow-[var(--ui-shadow-control)] ${
            Number(cashAmount) > 0
              ? "border-[var(--ui-success-border)] bg-[var(--ui-success-light)]/30"
              : "border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)]"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-[var(--ui-radius-sm)] bg-[var(--ui-success-border)] text-[var(--ui-success-dark)] flex items-center justify-center shrink-0">
              <FaMoneyBillWave size={11} />
            </div>
            <span className="font-bold text-[11px] text-[var(--ui-text)] tracking-wider">CASH</span>
          </div>

          <div
            className={`flex items-center h-[var(--ui-control-h-xs)] rounded-[var(--ui-radius-sm)] border bg-[var(--ui-surface)] overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-[var(--ui-shadow-control)] ${
              Number(cashAmount) > 0
                ? "border-[var(--ui-success)] ring-1 ring-[var(--ui-success)]/50"
                : "border-[var(--ui-border-strong)] focus-within:border-[var(--ui-success)] focus-within:ring-1 focus-within:ring-[var(--ui-success)]"
            }`}
          >
            <span className="text-[11px] text-[var(--ui-text-muted)] font-bold tabular-nums px-1.5 bg-[var(--ui-surface-muted)] h-full flex items-center border-r border-[var(--ui-border)] select-none">
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
              className="h-full w-full bg-transparent px-1.5 text-right text-[length:var(--ui-font-size-xs)] font-bold tabular-nums text-[var(--ui-text)] outline-none placeholder:text-[var(--ui-text-subtle)]"
            />
          </div>
        </div>

        {/* Change Calculator Toggle */}
        {showCashTenderedToggle && numCash > 0 && (
          <div className="flex items-center justify-end gap-2 text-[10px] px-1 -my-0.5">
            <button
              type="button"
              onClick={() => setShowCashGivenCalc(!showCashGivenCalc)}
              className="text-[var(--primary-color)] cursor-pointer font-bold"
            >
              {showCashGivenCalc ? "- Hide Change Calculator" : "+ Calculate Cash Change / ভাংতি"}
            </button>
          </div>
        )}

        {/* Cash Tendered & Change Return Block */}
        {showCashGivenCalc && numCash > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-[var(--ui-success-light)]/60 px-2 py-1 rounded-[var(--ui-radius-sm)] border border-[var(--ui-success-border)] shadow-[var(--ui-shadow-control)]">
            <span className="text-[11px] text-[var(--ui-text)] font-semibold">Cash Tendered:</span>
            <div className="flex items-center gap-1.5">
              <div className="relative w-28 sm:w-32">
                <span className="absolute left-1.5 top-0.5 text-[var(--ui-text-muted)] text-[length:var(--ui-font-size-xs)] font-bold tabular-nums">৳</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5000"
                  disabled={disabled}
                  value={cashGiven || ""}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setCashGiven(e.target.value)}
                  className="w-full pl-4.5 pr-1.5 py-0.5 text-[length:var(--ui-font-size-xs)] border border-[var(--ui-border-strong)] rounded-[var(--ui-radius-sm)] text-right font-bold text-[var(--ui-text)] bg-[var(--ui-surface)] outline-none focus:border-[var(--ui-success)] h-[var(--ui-control-h-xs)]"
                />
              </div>
              {changeReturnAmount > 0 && (
                <span className="text-[11px] text-[var(--ui-success-dark)] font-bold whitespace-nowrap">
                  Return: ৳{formatMoney(changeReturnAmount)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 2. Card / Bank Card */}
        <div
          className={`px-2.5 py-1 rounded-[var(--ui-radius-sm)] border transition-all flex items-center justify-between gap-1.5 shadow-[var(--ui-shadow-control)] ${
            Number(bankAmount) > 0
              ? "border-[var(--primary-color)] bg-[var(--primary-color-light)]/30"
              : "border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)]"
          }`}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
            <div className="w-6 h-6 rounded-[var(--ui-radius-sm)] bg-[var(--primary-color-muted)] text-[var(--primary-color-dark)] flex items-center justify-center shrink-0">
              <FaCreditCard size={11} />
            </div>
            <span className="font-bold text-[11px] text-[var(--ui-text)] tracking-wider shrink-0">
              {bankLabel}
            </span>
            <select
              disabled={disabled}
              value={selectedBankId}
              onChange={(e) => handleSelectBank(e.target.value)}
              className="ui-control ui-select ui-control-xs w-full max-w-[130px] font-medium truncate sm:max-w-[215px]"
            >
              <option value="" className="text-[var(--ui-text)]">
                {registeredBankAccounts.length ? `Select ${bankLabel}...` : "No bank registered"}
              </option>
              {registeredBankAccounts.map((b) => (
                <option
                  key={b.id}
                  value={b.id}
                  className="text-[var(--ui-text)]"
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
            className={`flex items-center h-[var(--ui-control-h-xs)] rounded-[var(--ui-radius-sm)] border bg-[var(--ui-surface)] overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-[var(--ui-shadow-control)] ${
              !selectedBankId
                ? "border-[var(--ui-border)] bg-[var(--ui-surface-sunken)] opacity-60 cursor-not-allowed"
                : Number(bankAmount) > 0
                ? "border-[var(--primary-color)] ring-1 ring-[var(--primary-color)]/50"
                : "border-[var(--ui-border-strong)] focus-within:border-[var(--primary-color)] focus-within:ring-1 focus-within:ring-[var(--primary-color)]"
            }`}
          >
            <span className="text-[11px] text-[var(--ui-text-muted)] font-bold tabular-nums px-1.5 bg-[var(--ui-surface-muted)] h-full flex items-center border-r border-[var(--ui-border)] select-none">
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
              className="h-full w-full bg-transparent px-1.5 text-right text-[length:var(--ui-font-size-xs)] font-bold tabular-nums text-[var(--ui-text)] outline-none placeholder:text-[var(--ui-text-subtle)] disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* 3. MFS Card */}
        <div
          className={`px-2.5 py-1 rounded-[var(--ui-radius-sm)] border transition-all flex items-center justify-between gap-1.5 shadow-[var(--ui-shadow-control)] ${
            Number(mfsAmount) > 0
              ? "border-[var(--ui-info-border)] bg-[var(--ui-info-light)]/30"
              : "border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)]"
          }`}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
            <div className="w-6 h-6 rounded-[var(--ui-radius-sm)] bg-[var(--ui-info-border)] text-[var(--ui-info-dark)] flex items-center justify-center shrink-0">
              <FaMobileAlt size={11} />
            </div>
            <span className="font-bold text-[11px] text-[var(--ui-text)] tracking-wider shrink-0">MFS</span>
            <select
              disabled={disabled}
              value={selectedMfsId}
              onChange={(e) => handleSelectMfs(e.target.value)}
              className="ui-control ui-select ui-control-xs w-full max-w-[130px] font-medium truncate sm:max-w-[215px]"
            >
              <option value="" className="text-[var(--ui-text)]">
                {registeredMfsAccounts.length ? "Select MFS..." : "No MFS registered"}
              </option>
              {registeredMfsAccounts.map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                  className="text-[var(--ui-text)]"
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
            className={`flex items-center h-[var(--ui-control-h-xs)] rounded-[var(--ui-radius-sm)] border bg-[var(--ui-surface)] overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-[var(--ui-shadow-control)] ${
              !selectedMfsId
                ? "border-[var(--ui-border)] bg-[var(--ui-surface-sunken)] opacity-60 cursor-not-allowed"
                : Number(mfsAmount) > 0
                ? "border-[var(--ui-info)] ring-1 ring-[var(--ui-info)]/50"
                : "border-[var(--ui-border-strong)] focus-within:border-[var(--ui-info)] focus-within:ring-1 focus-within:ring-[var(--ui-info)]"
            }`}
          >
            <span className="text-[11px] text-[var(--ui-text-muted)] font-bold tabular-nums px-1.5 bg-[var(--ui-surface-muted)] h-full flex items-center border-r border-[var(--ui-border)] select-none">
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
              className="h-full w-full bg-transparent px-1.5 text-right text-[length:var(--ui-font-size-xs)] font-bold tabular-nums text-[var(--ui-text)] outline-none placeholder:text-[var(--ui-text-subtle)] disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradePaymentSection;

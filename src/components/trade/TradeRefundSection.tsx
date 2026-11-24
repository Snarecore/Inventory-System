import React from "react";
import {
  FaMoneyBillWave,
  FaCreditCard,
  FaMobileAlt,
  FaWallet,
  FaCheckCircle,
  FaFileInvoiceDollar,
} from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import type { UseTradeRefundReturn, RefundAdjustmentTarget } from "@/hooks/useTradeRefund";
import type { TradePaymentAccount } from "@/hooks/useTradePayment";

export interface TradeRefundSectionProps {
  refund?: UseTradeRefundReturn;
  adjustmentTarget?: RefundAdjustmentTarget;
  onSelectAdjustmentTarget?: (target: RefundAdjustmentTarget) => void;
  refundCash?: string | number;
  refundBank?: string | number;
  refundMfs?: string | number;
  refundDue?: string | number;
  selectedRefundBankId?: string;
  selectedRefundMfsId?: string;
  registeredBankAccounts?: TradePaymentAccount[];
  registeredMfsAccounts?: TradePaymentAccount[];
  totalRefundAllocated?: number;
  refundDifference?: number;
  refundAmount?: number;
  origDueAmount?: number;
  origCashPaid?: number;
  origPaidAmount?: number;
  title?: string;
  paidLabel?: string;
  dueLabel?: string;
  onRefundCashChange?: (v: string) => void;
  onRefundBankChange?: (v: string) => void;
  onRefundMfsChange?: (v: string) => void;
  onRefundDueChange?: (v: string) => void;
  onSelectRefundBank?: (id: string) => void;
  onSelectRefundMfs?: (id: string) => void;
}

export const TradeRefundSection: React.FC<TradeRefundSectionProps> = ({
  refund,
  refundAmount = 0,
  registeredBankAccounts = [],
  registeredMfsAccounts = [],
  title = "Refund Settlement",
  paidLabel = "Total Paid",
  dueLabel = "Outstanding",
  ...flatProps
}) => {
  const adjustmentTarget: RefundAdjustmentTarget =
    refund?.adjustmentTarget ?? flatProps.adjustmentTarget ?? "due";
  const onSelectAdjustmentTarget =
    refund?.handleSelectAdjustmentTarget ?? flatProps.onSelectAdjustmentTarget;

  const numRefundCash = Number(refund?.numRefundCash ?? flatProps.refundCash ?? 0);
  const numRefundBank = Number(refund?.numRefundBank ?? flatProps.refundBank ?? 0);
  const numRefundMfs = Number(refund?.numRefundMfs ?? flatProps.refundMfs ?? 0);
  const numRefundDue = Number(refund?.numRefundDue ?? flatProps.refundDue ?? 0);

  const selectedRefundBankId = String(refund?.selectedRefundBankId ?? flatProps.selectedRefundBankId ?? "");
  const selectedRefundMfsId = String(refund?.selectedRefundMfsId ?? flatProps.selectedRefundMfsId ?? "");

  const origDueAmount = Number(refund?.origDueAmount ?? flatProps.origDueAmount ?? 0);
  const origCashPaid = Number(refund?.origCashPaid ?? flatProps.origCashPaid ?? 0);
  const origPaidAmount = Number(refund?.origPaidAmount ?? flatProps.origPaidAmount ?? origCashPaid);
  const hasDueAndCash = origDueAmount > 0 && (origCashPaid > 0 || origPaidAmount > 0);

  const totalRefundAllocated = Number(
    refund?.totalRefundAllocated ??
      flatProps.totalRefundAllocated ??
      (numRefundCash + numRefundBank + numRefundMfs + numRefundDue)
  );
  const refundDifference = Number(
    refund?.refundDifference ??
      flatProps.refundDifference ??
      Math.max(0, refundAmount - totalRefundAllocated)
  );

  return (
    <>
      {/* Header & Status */}
      <div className="flex items-center justify-between flex-wrap gap-1">
        <span className="text-[11px] font-bold text-[var(--ui-text)] tracking-wider flex items-center gap-1.5">
          <FaWallet size={11} className="text-[var(--primary-color)]" />
          {title}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] border border-[var(--ui-border)] select-none">
          <FaWallet size={8} className="text-[var(--primary-color)]" />
          Auto-allocated
        </span>
      </div>

      {/* 2 Adjustment Options: Adjust Outstanding vs Adjust Cash */}
      {(hasDueAndCash || origDueAmount > 0) && (
        <div className="grid grid-cols-2 gap-2">
          {/* Option 1: Adjust Outstanding */}
          <button
            type="button"
            onClick={() => onSelectAdjustmentTarget?.("due")}
            className={`p-2 rounded-md border text-left transition-all cursor-pointer flex flex-col justify-between relative group ${
              adjustmentTarget === "due"
                ? "border-[#e11d48] bg-[#e11d48]/10 shadow-xs ring-2 ring-[#e11d48]"
                : "border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-surface-muted)] hover:border-[#e11d48]/50 opacity-90"
            }`}
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="text-xs font-bold text-[#e11d48] flex items-center gap-1.5">
                <FaFileInvoiceDollar size={13} />
                Adjust Outstanding
              </span>
              {adjustmentTarget === "due" && (
                <FaCheckCircle size={13} className="text-[#e11d48] shrink-0" />
              )}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10.5px] text-[var(--ui-text-muted)]">
              <span>Due:</span>
              <strong className="text-[#e11d48] font-bold">৳{formatMoney(origDueAmount)}</strong>
            </div>
          </button>

          {/* Option 2: Adjust Cash */}
          <button
            type="button"
            onClick={() => onSelectAdjustmentTarget?.("cash")}
            className={`p-2 rounded-md border text-left transition-all cursor-pointer flex flex-col justify-between relative group ${
              adjustmentTarget === "cash"
                ? "border-[#10b981] bg-[#10b981]/10 shadow-xs ring-2 ring-[#10b981]"
                : "border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-surface-muted)] hover:border-[#10b981]/50 opacity-90"
            }`}
          >
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="text-xs font-bold text-[#059669] flex items-center gap-1.5">
                <FaMoneyBillWave size={13} />
                Adjust Cash
              </span>
              {adjustmentTarget === "cash" && (
                <FaCheckCircle size={13} className="text-[#059669] shrink-0" />
              )}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10.5px] text-[var(--ui-text-muted)]">
              <span>Paid:</span>
              <strong className="text-[#059669] font-bold">৳{formatMoney(origCashPaid || origPaidAmount)}</strong>
            </div>
          </button>
        </div>
      )}

      {/* Payment Breakdown Cards */}
      <div className="flex flex-col gap-1.5">
        {/* 1. Cash Card */}
        <div
          className={`px-2.5 py-1 rounded-md border transition-all flex items-center justify-between gap-1.5 shadow-2xs select-none ${
            numRefundCash > 0
              ? "border-[var(--ui-success-border)] bg-[var(--ui-success-light)]/30"
              : "border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/40 opacity-70"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                numRefundCash > 0
                  ? "bg-[var(--ui-success-border)] text-[var(--ui-success-dark)]"
                  : "bg-[var(--ui-surface-sunken)] text-[var(--ui-text)]"
              }`}
            >
              <FaMoneyBillWave size={11} />
            </div>
            <span className="font-bold text-[11px] text-[var(--ui-text)] tracking-wider">CASH</span>
          </div>

          <div
            className={`flex items-center h-6.5 rounded border overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-2xs ${
              numRefundCash > 0
                ? "border-[var(--ui-success)] bg-[var(--ui-surface)]"
                : "border-[var(--ui-border)] bg-[var(--ui-surface-sunken)]/70"
            }`}
          >
            <span className="text-[11px] text-[var(--ui-text)] font-normal px-1.5 bg-[var(--ui-surface-muted)] h-full flex items-center border-r border-[var(--ui-border)] select-none">
              {numRefundCash > 0 ? "৳" : "—"}
            </span>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={numRefundCash > 0 ? numRefundCash.toString() : ""}
              onChange={(e) => flatProps.onRefundCashChange?.(e.target.value)}
              className="w-full text-right px-1.5 text-xs font-semibold text-[var(--ui-text)] outline-none bg-transparent h-full placeholder:text-[var(--ui-text-muted)]"
            />
          </div>
        </div>

        {/* 2. Bank Card */}
        <div
          className={`px-2.5 py-1 rounded-md border transition-all flex items-center justify-between gap-1.5 shadow-2xs select-none ${
            numRefundBank > 0
              ? "border-[var(--primary-color-muted)] bg-[var(--primary-color-light)]/30"
              : "border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/40 opacity-70"
          }`}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
            <div
              className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                numRefundBank > 0
                  ? "bg-[var(--primary-color-muted)] text-[var(--primary-color-dark)]"
                  : "bg-[var(--ui-surface-sunken)] text-[var(--ui-text)]"
              }`}
            >
              <FaCreditCard size={11} />
            </div>
            <span className="font-bold text-[11px] text-[var(--ui-text)] tracking-wider shrink-0">BANK</span>
            <select
              disabled
              value={selectedRefundBankId}
              className="h-6.5 w-full max-w-[130px] sm:max-w-[215px] px-1.5 text-[11px] border border-[var(--ui-border)] rounded bg-[var(--ui-surface-muted)] text-[var(--ui-text)] font-normal cursor-not-allowed truncate select-none"
            >
              <option value="" className="text-[var(--ui-text)] font-normal">
                {numRefundBank > 0 ? "Bank Account" : "N/A"}
              </option>
              {registeredBankAccounts.map((b) => (
                <option key={b.id} value={b.id} className="text-[var(--ui-text)]">
                  {b.bankName}
                  {b.accountNo ? ` – ${b.accountNo}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div
            className={`flex items-center h-6.5 rounded border overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-2xs ${
              numRefundBank > 0
                ? "border-[var(--primary-color)] bg-[var(--ui-surface)]"
                : "border-[var(--ui-border)] bg-[var(--ui-surface-sunken)]/70"
            }`}
          >
            <span className="text-[11px] text-[var(--ui-text)] font-normal px-1.5 bg-[var(--ui-surface-muted)] h-full flex items-center border-r border-[var(--ui-border)] select-none">
              {numRefundBank > 0 ? "৳" : "—"}
            </span>
            <input
              type="text"
              readOnly
              disabled
              tabIndex={-1}
              placeholder="N/A"
              value={numRefundBank > 0 ? numRefundBank.toString() : "N/A"}
              className="w-full text-right px-1.5 text-xs font-normal text-[var(--ui-text)] outline-none bg-transparent cursor-not-allowed select-none h-full placeholder:text-[var(--ui-text)]"
            />
          </div>
        </div>

        {/* 3. MFS Card */}
        <div
          className={`px-2.5 py-1 rounded-md border transition-all flex items-center justify-between gap-1.5 shadow-2xs select-none ${
            numRefundMfs > 0
              ? "border-[var(--ui-info-border)] bg-[var(--ui-info-light)]/30"
              : "border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/40 opacity-70"
          }`}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
            <div
              className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                numRefundMfs > 0
                  ? "bg-[var(--ui-info-border)] text-[var(--ui-info-dark)]"
                  : "bg-[var(--ui-surface-sunken)] text-[var(--ui-text)]"
              }`}
            >
              <FaMobileAlt size={11} />
            </div>
            <span className="font-bold text-[11px] text-[var(--ui-text)] tracking-wider shrink-0">MFS</span>
            <select
              disabled
              value={selectedRefundMfsId}
              className="h-6.5 w-full max-w-[130px] sm:max-w-[215px] px-1.5 text-[11px] border border-[var(--ui-border)] rounded bg-[var(--ui-surface-muted)] text-[var(--ui-text)] font-normal cursor-not-allowed truncate select-none"
            >
              <option value="" className="text-[var(--ui-text)] font-normal">
                {numRefundMfs > 0 ? "MFS Account" : "N/A"}
              </option>
              {registeredMfsAccounts.map((m) => (
                <option key={m.id} value={m.id} className="text-[var(--ui-text)]">
                  {m.mfsName}
                  {m.mfsPhone ? ` – ${m.mfsPhone}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div
            className={`flex items-center h-6.5 rounded border overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-2xs ${
              numRefundMfs > 0
                ? "border-[var(--ui-info)] bg-[var(--ui-surface)]"
                : "border-[var(--ui-border)] bg-[var(--ui-surface-sunken)]/70"
            }`}
          >
            <span className="text-[11px] text-[var(--ui-text)] font-normal px-1.5 bg-[var(--ui-surface-muted)] h-full flex items-center border-r border-[var(--ui-border)] select-none">
              {numRefundMfs > 0 ? "৳" : "—"}
            </span>
            <input
              type="text"
              readOnly
              disabled
              tabIndex={-1}
              placeholder="N/A"
              value={numRefundMfs > 0 ? numRefundMfs.toString() : "N/A"}
              className="w-full text-right px-1.5 text-xs font-normal text-[var(--ui-text)] outline-none bg-transparent cursor-not-allowed select-none h-full placeholder:text-[var(--ui-text)]"
            />
          </div>
        </div>

        {/* 4. Due / Credit Adjustment Row (if applicable) */}
        {(origDueAmount > 0 || numRefundDue > 0) && (
          <div
            className={`px-2.5 py-1 rounded-md border transition-all flex items-center justify-between gap-1.5 shadow-2xs select-none ${
              numRefundDue > 0
                ? "border-[var(--ui-danger-border)] bg-[var(--ui-danger-light)]/30"
                : "border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/40 opacity-70"
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className={`w-6 h-6 rounded flex items-center justify-center shrink-0 font-bold text-[11px] ${
                  numRefundDue > 0
                    ? "bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)]"
                    : "bg-[var(--ui-surface-sunken)] text-[var(--ui-text)]"
                }`}
              >
                ৳
              </div>
              <div>
                <span className="font-bold text-[11px] text-[var(--ui-text)] tracking-wider block leading-tight">
                  DUE ADJUST
                </span>
                <span className="text-[9.5px] text-[var(--ui-text)] font-normal block leading-none">
                  Max: ৳{formatMoney(origDueAmount)}
                </span>
              </div>
            </div>

            <div
              className={`flex items-center h-6.5 rounded border overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-2xs ${
                numRefundDue > 0
                  ? "border-[var(--ui-danger)] bg-[var(--ui-surface)]"
                  : "border-[var(--ui-border)] bg-[var(--ui-surface-sunken)]/70"
              }`}
            >
              <span className="text-[11px] text-[var(--ui-text)] font-normal px-1.5 bg-[var(--ui-surface-muted)] h-full flex items-center border-r border-[var(--ui-border)] select-none">
                {numRefundDue > 0 ? "৳" : "—"}
              </span>
              <input
                type="number"
                min={0}
                max={origDueAmount > 0 ? origDueAmount : undefined}
                placeholder="0"
                value={numRefundDue > 0 ? numRefundDue.toString() : ""}
                onChange={(e) => flatProps.onRefundDueChange?.(e.target.value)}
                className="w-full text-right px-1.5 text-xs font-semibold text-[var(--ui-text)] outline-none bg-transparent h-full placeholder:text-[var(--ui-text-muted)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Financial Settlement Summary Ribbon */}
      <div className="grid grid-cols-2 items-stretch gap-1.5 border-t border-[var(--ui-border)]/90 pt-1.5">
        {/* Total Paid Card */}
        <div className="bg-[var(--ui-success-light)]/90 px-2.5 py-1.5 rounded-[var(--ui-radius-sm)] border border-[var(--ui-success-border)]/90 flex flex-col justify-center shadow-[var(--ui-shadow-control)] min-h-[46px]">
          <span className="text-[10.5px] font-semibold text-[var(--ui-success-dark)]/85 tracking-wide truncate">
            {paidLabel}
          </span>
          <span className="text-xs sm:text-[13px] font-extrabold tabular-nums text-[var(--ui-success-dark)] truncate leading-tight mt-0.5 whitespace-nowrap">
            ৳ {formatMoney(totalRefundAllocated)}
          </span>
        </div>

        {/* Outstanding Card */}
        <div
          className={`px-2.5 py-1.5 rounded-[var(--ui-radius-sm)] border flex flex-col justify-center transition-colors shadow-[var(--ui-shadow-control)] min-h-[46px] ${
            refundDifference > 0.01
              ? "bg-[var(--ui-danger-light)]/90 border-[var(--ui-danger-border)]/90"
              : "bg-[var(--ui-surface-muted)] border-[var(--ui-border)]"
          }`}
        >
          <span
            className={`text-[10.5px] font-semibold tracking-wide truncate ${
              refundDifference > 0.01 ? "text-[var(--ui-danger-dark)]/85" : "text-[var(--ui-text-muted)]"
            }`}
          >
            {dueLabel}
          </span>
          <span
            className={`text-xs sm:text-[13px] font-extrabold tabular-nums truncate leading-tight mt-0.5 whitespace-nowrap ${
              refundDifference > 0.01 ? "text-[var(--ui-danger)]" : "text-[var(--ui-text)]"
            }`}
          >
            ৳ {formatMoney(refundDifference > 0.01 ? refundDifference : 0)}
          </span>
        </div>
      </div>
    </>
  );
};

export default TradeRefundSection;

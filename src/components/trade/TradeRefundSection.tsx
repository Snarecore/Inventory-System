import React from "react";
import { FaMoneyBillWave, FaCreditCard, FaMobileAlt, FaWallet, FaLock } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import type { UseTradeRefundReturn } from "@/hooks/useTradeRefund";
import type { TradePaymentAccount } from "@/hooks/useTradePayment";

export interface TradeRefundSectionProps {
  refund: UseTradeRefundReturn;
  refundAmount: number;
  registeredBankAccounts: TradePaymentAccount[];
  registeredMfsAccounts: TradePaymentAccount[];
  title?: string;
}

export const TradeRefundSection: React.FC<TradeRefundSectionProps> = ({
  refund,
  refundAmount,
  registeredBankAccounts,
  registeredMfsAccounts,
  title = "Refund Settlement",
}) => {
  const {
    numRefundCash,
    numRefundBank,
    numRefundMfs,
    numRefundDue,
    selectedRefundBankId,
    selectedRefundMfsId,
    origDueAmount,
    totalRefundAllocated,
    refundDifference,
  } = refund;

  return (
    <>
      {/* Header & View-Only Status */}
      <div className="flex items-center justify-between flex-wrap gap-1">
        <span className="text-[11px] font-bold text-[var(--ui-text)] tracking-wider flex items-center gap-1.5">
          <FaWallet size={11} className="text-[var(--ui-text)]" />
          {title}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] border border-[var(--ui-border)] select-none">
          <FaLock size={8} className="text-[var(--ui-text)]" />
          Auto-filled (View Only)
        </span>
      </div>

      {/* Payment Breakdown Cards - Display Only */}
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
              type="text"
              readOnly
              disabled
              tabIndex={-1}
              placeholder="N/A"
              value={numRefundCash > 0 ? numRefundCash.toString() : "N/A"}
              className="w-full text-right px-1.5 text-xs font-normal text-[var(--ui-text)] outline-none bg-transparent cursor-not-allowed select-none h-full placeholder:text-[var(--ui-text)]"
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
                type="text"
                readOnly
                disabled
                tabIndex={-1}
                placeholder="N/A"
                value={numRefundDue > 0 ? numRefundDue.toString() : "N/A"}
                className="w-full text-right px-1.5 text-xs font-normal text-[var(--ui-text)] outline-none bg-transparent cursor-not-allowed select-none h-full placeholder:text-[var(--ui-text)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Financial Settlement Summary Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 border-t border-[var(--ui-border)]/90 pt-1.5 items-center">
        {/* Total Refunded Card with status badge */}
        <div className="bg-[var(--ui-success-light)]/90 px-2.5 py-1 rounded-md border border-[var(--ui-success-border)]/90 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ui-success)] inline-block" />
            <span className="text-[10.5px] font-bold text-[var(--ui-success-dark)] tracking-wide">
              Total Refunded
            </span>
            <span className="text-[9.5px] font-semibold px-1 py-0.2 rounded bg-[var(--ui-success-border)] text-[var(--ui-success-dark)]">
              {totalRefundAllocated >= refundAmount && refundAmount > 0
                ? "SETTLED"
                : totalRefundAllocated > 0
                ? "PARTIAL"
                : "UNALLOCATED"}
            </span>
          </div>
          <span className="text-xs sm:text-[13px] font-extrabold text-[var(--ui-success-dark)]">
            ৳ {formatMoney(totalRefundAllocated)}
          </span>
        </div>

        {/* Remaining to Refund / Due Balance Card */}
        <div
          className={`px-2.5 py-1 rounded-md border flex items-center justify-between transition-colors shadow-2xs ${
            refundDifference > 0.01
              ? "bg-[var(--ui-danger-light)]/90 border-[var(--ui-danger-border)]/90"
              : "bg-[var(--ui-surface-muted)] border-[var(--ui-border)]"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full inline-block ${
                refundDifference > 0.01 ? "bg-[var(--ui-danger)]" : "bg-[var(--ui-text-subtle)]"
              }`}
            />
            <span
              className={`text-[10.5px] font-bold tracking-wide ${
                refundDifference > 0.01 ? "text-[var(--ui-danger-dark)]" : "text-[var(--ui-text)]"
              }`}
            >
              {refundDifference > 0.01 ? "Unallocated Balance" : "Due Balance"}
            </span>
            {refundDifference > 0.01 && (
              <span className="text-[9.5px] font-semibold px-1 py-0.2 rounded bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)]">
                PENDING
              </span>
            )}
          </div>
          <span
            className={`text-xs sm:text-[13px] font-extrabold ${
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

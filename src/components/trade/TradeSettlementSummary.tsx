import React from "react";
import { FaUserCircle } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";

export interface TradeSettlementSummaryProps {
  partyName?: string;
  partyPhone?: string;
  isWalkIn?: boolean;
  walkInName?: string;
  walkInPhone?: string;
  previousDue?: number | null;
  totalPaid: number;
  grandTotal: number;
  dueAmount: number;
  changeReturnAmount?: number;
  currencySymbol?: string;
  dueLabel?: string;
  className?: string;
}

export const TradeSettlementSummary: React.FC<TradeSettlementSummaryProps> = ({
  partyName,
  partyPhone,
  isWalkIn = false,
  walkInName = "",
  walkInPhone = "",
  previousDue,
  totalPaid,
  grandTotal,
  dueAmount,
  changeReturnAmount = 0,
  currencySymbol = "৳",
  dueLabel = "Short",
  className = "",
}) => {
  const effectiveName = isWalkIn
    ? walkInName.trim() || "Walk-in Customer"
    : partyName || "—";

  const effectivePhone = isWalkIn
    ? walkInPhone.trim()
    : partyPhone || "";

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Who this settlement belongs to */}
      <div className="flex items-center justify-between gap-2 border-t border-[var(--ui-border)]/90 pt-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <FaUserCircle size={12} className="shrink-0 text-[var(--ui-text-subtle)]" />
          <span className="truncate text-[11px] font-semibold text-[var(--ui-text)]">
            {effectiveName}
          </span>
          {effectivePhone && (
            <span className="truncate text-[10px] tabular-nums text-[var(--ui-text-muted)]">
              · {effectivePhone}
            </span>
          )}
          {isWalkIn && (
            <span className="shrink-0 rounded-[var(--ui-radius-sm)] bg-[var(--ui-success-border)] px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--ui-success-dark)]">
              Counter
            </span>
          )}
        </div>
        {!isWalkIn && previousDue !== undefined && previousDue !== null && previousDue > 0 && (
          <span className="shrink-0 text-[10px] font-semibold tabular-nums text-[var(--ui-danger-dark)]">
            Previous due {currencySymbol} {formatMoney(previousDue)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 items-center gap-1.5 sm:grid-cols-2">
        {/* Total Paid Card with status badge */}
        <div className="bg-[var(--ui-success-light)]/90 px-2.5 py-1 rounded-[var(--ui-radius-sm)] border border-[var(--ui-success-border)]/90 flex items-center justify-between shadow-[var(--ui-shadow-control)]">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ui-success)] inline-block" />
            <span className="text-[11px] font-bold text-[var(--ui-success-dark)] tracking-wide">
              Total Paid
            </span>
            <span className="text-[10px] font-semibold px-1 py-0.5 rounded-[var(--ui-radius-sm)] bg-[var(--ui-success-border)] text-[var(--ui-success-dark)]">
              {totalPaid >= grandTotal && grandTotal > 0 ? "PAID" : totalPaid > 0 ? "PARTIAL" : "UNPAID"}
            </span>
          </div>
          <span className="text-xs sm:text-[13px] font-extrabold tabular-nums text-[var(--ui-success-dark)]">
            {currencySymbol} {formatMoney(totalPaid)}
          </span>
        </div>

        {/* Short (unpaid remainder) / Due Balance or Change Return */}
        {changeReturnAmount > 0 ? (
          <div className="bg-[var(--primary-color-light)]/90 px-2.5 py-1 rounded-[var(--ui-radius-sm)] border border-[var(--primary-color-muted)]/90 flex items-center justify-between shadow-[var(--ui-shadow-control)]">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary-color)] inline-block" />
              <span className="text-[11px] font-bold text-[var(--primary-color-dark)] tracking-wide">
                Change / ফেরত
              </span>
            </div>
            <span className="text-xs sm:text-[13px] font-extrabold tabular-nums text-[var(--primary-color-dark)]">
              {currencySymbol} {formatMoney(changeReturnAmount)}
            </span>
          </div>
        ) : (
          <div
            className={`px-2.5 py-1 rounded-[var(--ui-radius-sm)] border flex items-center justify-between transition-colors shadow-[var(--ui-shadow-control)] ${
              dueAmount > 0
                ? "bg-[var(--ui-danger-light)]/90 border-[var(--ui-danger-border)]/90"
                : "bg-[var(--ui-surface-muted)] border-[var(--ui-border)]"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full inline-block ${
                  dueAmount > 0 ? "bg-[var(--ui-danger)]" : "bg-[var(--ui-text-subtle)]"
                }`}
              />
              <span
                className={`text-[11px] font-bold tracking-wide ${
                  dueAmount > 0 ? "text-[var(--ui-danger-dark)]" : "text-[var(--ui-text)]"
                }`}
              >
                {dueLabel}
              </span>
              {dueAmount > 0 && (
                <span className="text-[10px] font-semibold px-1 py-0.5 rounded-[var(--ui-radius-sm)] bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)]">
                  {dueLabel === "Short" ? "SHORT" : "DUE"}
                </span>
              )}
            </div>
            <span
              className={`text-xs sm:text-[13px] font-extrabold tabular-nums ${
                dueAmount > 0 ? "text-[var(--ui-danger)]" : "text-[var(--ui-text)]"
              }`}
            >
              {currencySymbol} {formatMoney(dueAmount)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeSettlementSummary;

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
  paidLabel?: string;
  dueLabel?: string;
  showPartyInfo?: boolean;
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
  grandTotal: _grandTotal,
  dueAmount,
  changeReturnAmount = 0,
  currencySymbol = "৳",
  paidLabel = "Total Paid",
  dueLabel = "Outstanding",
  showPartyInfo = true,
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
      {showPartyInfo && (
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
      )}

      <div className="grid grid-cols-2 items-stretch gap-1.5">
        {/* Total Paid / Paid Amount Card */}
        <div className="bg-[var(--ui-success-light)]/90 px-2.5 py-1.5 rounded-[var(--ui-radius-sm)] border border-[var(--ui-success-border)]/90 flex flex-col justify-center shadow-[var(--ui-shadow-control)] min-h-[46px]">
          <span className="text-[10.5px] font-semibold text-[var(--ui-success-dark)]/85 tracking-wide truncate">
            {paidLabel}
          </span>
          <span className="text-xs sm:text-[13px] font-extrabold tabular-nums text-[var(--ui-success-dark)] truncate leading-tight mt-0.5 whitespace-nowrap">
            {currencySymbol} {formatMoney(totalPaid)}
          </span>
        </div>

        {/* Change Return or Due / Outstanding Card */}
        {changeReturnAmount > 0 ? (
          <div className="bg-[var(--primary-color-light)]/90 px-2.5 py-1.5 rounded-[var(--ui-radius-sm)] border border-[var(--primary-color-muted)]/90 flex flex-col justify-center shadow-[var(--ui-shadow-control)] min-h-[46px]">
            <span className="text-[10.5px] font-semibold text-[var(--primary-color-dark)]/85 tracking-wide truncate">
              Change / ফেরত
            </span>
            <span className="text-xs sm:text-[13px] font-extrabold tabular-nums text-[var(--primary-color-dark)] truncate leading-tight mt-0.5 whitespace-nowrap">
              {currencySymbol} {formatMoney(changeReturnAmount)}
            </span>
          </div>
        ) : (
          <div
            className={`px-2.5 py-1.5 rounded-[var(--ui-radius-sm)] border flex flex-col justify-center transition-colors shadow-[var(--ui-shadow-control)] min-h-[46px] ${
              dueAmount > 0
                ? "bg-[var(--ui-danger-light)]/90 border-[var(--ui-danger-border)]/90"
                : "bg-[var(--ui-surface-muted)] border-[var(--ui-border)]"
            }`}
          >
            <span
              className={`text-[10.5px] font-semibold tracking-wide truncate ${
                dueAmount > 0 ? "text-[var(--ui-danger-dark)]/85" : "text-[var(--ui-text-muted)]"
              }`}
            >
              {dueLabel}
            </span>
            <span
              className={`text-xs sm:text-[13px] font-extrabold tabular-nums truncate leading-tight mt-0.5 whitespace-nowrap ${
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

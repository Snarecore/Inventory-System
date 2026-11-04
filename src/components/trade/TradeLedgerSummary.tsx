import React from "react";
import { formatMoney } from "@/utils/formatters";

export interface TradeLedgerSummaryProps {
  subtotal: number;
  discount: number;
  extraLabel: string;
  extraAmount: number;
  grandTotal: number;
  currencySymbol?: string;
  className?: string;
}

export const TradeLedgerSummary: React.FC<TradeLedgerSummaryProps> = ({
  subtotal,
  discount,
  extraLabel,
  extraAmount,
  grandTotal,
  currencySymbol = "৳",
  className = "",
}) => {
  return (
    <dl
      className={`rounded-[var(--ui-radius)] border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] px-3 py-2 shadow-[var(--ui-shadow-control)] ${className}`}
    >
      <div className="flex items-baseline justify-between gap-3 py-0.5">
        <dt className="text-[11px] font-medium text-[var(--ui-text-muted)]">Subtotal</dt>
        <dd className="text-xs font-semibold tabular-nums text-[var(--ui-text)]">
          {currencySymbol} {formatMoney(subtotal)}
        </dd>
      </div>

      <div className="flex items-baseline justify-between gap-3 py-0.5">
        <dt className="text-[11px] font-medium text-[var(--ui-text-muted)]">Discount</dt>
        <dd className="text-xs font-semibold tabular-nums text-[var(--ui-danger)]">
          − {currencySymbol} {formatMoney(discount)}
        </dd>
      </div>

      <div className="flex items-baseline justify-between gap-3 py-0.5">
        <dt className="text-[11px] font-medium text-[var(--ui-text-muted)]">{extraLabel}</dt>
        <dd className="text-xs font-semibold tabular-nums text-[var(--ui-text)]">
          + {currencySymbol} {formatMoney(extraAmount)}
        </dd>
      </div>

      <div className="mt-1.5 flex items-baseline justify-between gap-3 border-t border-[var(--ui-border-strong)] pt-1.5">
        <dt className="text-[11px] font-bold uppercase tracking-wider text-[var(--ui-text)]">
          Grand Total
        </dt>
        <dd className="text-sm font-extrabold tabular-nums text-[var(--primary-color)]">
          {currencySymbol} {formatMoney(grandTotal)}
        </dd>
      </div>
    </dl>
  );
};

export default TradeLedgerSummary;

import React from "react";
import { formatMoney } from "@/utils/formatters";

export interface TradeQuickAmountSectionProps {
  label?: string;
  placeholder?: string;
  amountInput: string;
  onAmountChange: (value: string) => void;
  effectiveTotalDue: number;
  allocatedAmount: number;
  allocatedPct: number;
  disabled?: boolean;
}

export const TradeQuickAmountSection: React.FC<TradeQuickAmountSectionProps> = ({
  label = "Amount",
  placeholder = "Enter amount",
  amountInput,
  onAmountChange,
  effectiveTotalDue,
  allocatedAmount,
  allocatedPct,
  disabled = false,
}) => {
  const applyQuickAmount = (fraction: number) => {
    if (effectiveTotalDue <= 0) return;
    const computed = fraction >= 1 ? effectiveTotalDue : effectiveTotalDue * fraction;
    const clamped = Math.min(Math.max(0, computed), effectiveTotalDue);
    onAmountChange(String(Number(clamped.toFixed(2))));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!raw) {
      onAmountChange("");
      return;
    }
    const val = parseFloat(raw);
    if (Number.isNaN(val)) {
      onAmountChange("");
      return;
    }
    const clamped = Math.min(Math.max(0, val), effectiveTotalDue);
    onAmountChange(String(clamped));
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[var(--ui-text)]">
          {label} <span className="text-red-500">*</span>
        </label>
        {/* Quick Amount preset chips (25%, 50%, 75%, Full Due) */}
        {effectiveTotalDue > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[var(--ui-text-muted)] hidden sm:inline mr-0.5">
              Quick:
            </span>
            <button
              type="button"
              onClick={() => applyQuickAmount(0.25)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--ui-surface-muted)] hover:bg-[var(--primary-color)] hover:text-white border border-[var(--ui-border)] transition-colors font-medium cursor-pointer"
            >
              25%
            </button>
            <button
              type="button"
              onClick={() => applyQuickAmount(0.5)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--ui-surface-muted)] hover:bg-[var(--primary-color)] hover:text-white border border-[var(--ui-border)] transition-colors font-medium cursor-pointer"
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => applyQuickAmount(0.75)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--ui-surface-muted)] hover:bg-[var(--primary-color)] hover:text-white border border-[var(--ui-border)] transition-colors font-medium cursor-pointer"
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => applyQuickAmount(1)}
              className="text-[10px] px-2 py-0.5 rounded bg-[var(--primary-color)]/10 text-[var(--primary-color)] hover:bg-[var(--primary-color)] hover:text-white border border-[var(--primary-color)]/30 transition-colors font-bold cursor-pointer"
            >
              Full Due
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--ui-text-muted)]">
          ৳
        </span>
        <input
          type="number"
          min="0"
          max={effectiveTotalDue}
          step="any"
          value={amountInput}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-7 pr-3 py-1.5 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-md focus:border-[var(--primary-color)] focus:ring-1 focus:ring-[var(--primary-color)] outline-none text-[var(--ui-text)] font-semibold"
        />
      </div>

      {/* Live Allocation Progress Meter */}
      {effectiveTotalDue > 0 && (
        <div className="space-y-0.5 pt-0.5">
          <div className="flex items-center justify-between text-[10px] text-[var(--ui-text-muted)] font-medium">
            <span>
              Allocated:{" "}
              <strong className="text-[var(--ui-text)]">
                ৳{formatMoney(allocatedAmount)}
              </strong>{" "}
              of ৳{formatMoney(effectiveTotalDue)}
            </span>
            <span
              className={
                allocatedPct === 100
                  ? "text-emerald-600 font-bold"
                  : "text-[var(--primary-color)] font-semibold"
              }
            >
              {allocatedPct}%
            </span>
          </div>
          <div className="w-full h-1 bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                allocatedPct === 100
                  ? "bg-emerald-500"
                  : "bg-[var(--primary-color)]"
              }`}
              style={{ width: `${allocatedPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeQuickAmountSection;

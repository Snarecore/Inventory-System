import React from "react";

export interface TradeQuickAmountSectionProps {
  label?: string;
  placeholder?: string;
  amountInput: string;
  onAmountChange: (value: string) => void;
  effectiveTotalDue: number;
  allocatedAmount?: number;
  allocatedPct?: number;
  disabled?: boolean;
}

export const TradeQuickAmountSection: React.FC<TradeQuickAmountSectionProps> = ({
  placeholder = "Enter amount",
  amountInput,
  onAmountChange,
  effectiveTotalDue,
  disabled = false,
}) => {
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
  );
};

export default TradeQuickAmountSection;

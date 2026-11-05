import React from "react";
import type { BillingCycle } from "@/types";

interface BillingCycleSelectorProps {
  cycles: BillingCycle[];
  selectedCycleCode: string;
  onSelectCycle: (code: string) => void;
}

export const BillingCycleSelector: React.FC<BillingCycleSelectorProps> = ({
  cycles,
  selectedCycleCode,
  onSelectCycle,
}) => {
  if (!cycles || cycles.length === 0) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-1.5 my-2">
      <span className="text-[10px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider">
        Select Billing Cycle
      </span>
      <div className="inline-flex p-1 rounded-xl bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] shadow-2xs flex-wrap justify-center gap-1">
        {cycles.map((c) => {
          const isActive = c.code === selectedCycleCode;
          const discount = Number(c.discountPct || 0);

          return (
            <button
              key={c.code}
              type="button"
              onClick={() => onSelectCycle(c.code)}
              className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-[var(--primary-color)] text-white shadow-xs"
                  : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface)]"
              }`}
            >
              <span>{c.label}</span>
              {discount > 0 && (
                <span
                  className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md transition-colors ${
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  -{discount}%
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BillingCycleSelector;

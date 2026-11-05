import React from "react";
import type { BillingCycle } from "@/types";

interface BillingCycleSelectorProps {
  cycles: BillingCycle[];
  activeCycleCode: string;
  onSelectCycle: (code: string) => void;
}

export const BillingCycleSelector: React.FC<BillingCycleSelectorProps> = ({
  cycles,
  activeCycleCode,
  onSelectCycle,
}) => {
  if (!cycles || cycles.length === 0) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
        বিলিং সাইকেল বেছে নিন (Billing Cycle)
      </span>
      <div className="inline-flex p-1 rounded-full bg-gray-100 border border-gray-200 shadow-xs flex-wrap justify-center gap-1">
        {cycles.map((c) => {
          const isActive = c.code === activeCycleCode;
          const discount = Number(c.discountPct || 0);

          return (
            <button
              key={c.code}
              type="button"
              onClick={() => onSelectCycle(c.code)}
              className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-[var(--color-primary)] text-white shadow-xs"
                  : "text-gray-700 hover:text-gray-900 hover:bg-gray-200/60"
              }`}
            >
              <span>{c.labelBn || c.label}</span>
              {discount > 0 && (
                <span
                  className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? "bg-amber-400 text-slate-900"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
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

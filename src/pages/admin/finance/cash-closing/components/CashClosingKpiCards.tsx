import React from "react";
import {
  FaMoneyBillWave,
  FaArrowDown,
  FaArrowUp,
  FaCalculator,
  FaCoins,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";

interface CashClosingKpiCardsProps {
  openingCash: number;
  todayDeposit: number;
  todayExpense: number;
  expectedCash: number;
  countedCash: number;
  differenceAmount: number;
  isClosed?: boolean;
}

export const CashClosingKpiCards: React.FC<CashClosingKpiCardsProps> = ({
  openingCash,
  todayDeposit,
  todayExpense,
  expectedCash,
  countedCash,
  differenceAmount,
  isClosed = false,
}) => {
  const isBalanced = differenceAmount === 0 && countedCash > 0;
  const isShortage = differenceAmount < 0;
  const isSurplus = differenceAmount > 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full">
      {/* 1. Opening Cash */}
      <div className="px-2.5 py-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] flex flex-col justify-between shadow-xs min-h-[58px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[var(--ui-text-muted)] truncate">
            Opening Cash
          </span>
          <div className="p-1 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
            <FaMoneyBillWave size={12} />
          </div>
        </div>
        <div className="mt-1">
          <span className="text-sm sm:text-base font-bold text-[var(--ui-text)] truncate block">
            ৳ {formatMoney(openingCash)}
          </span>
        </div>
      </div>

      {/* 2. Today's Inflow / Deposit */}
      <div className="px-2.5 py-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] flex flex-col justify-between shadow-xs min-h-[58px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[var(--ui-text-muted)] truncate">
            Today Deposit
          </span>
          <div className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <FaArrowDown size={12} />
          </div>
        </div>
        <div className="mt-1">
          <span className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 truncate block">
            + ৳ {formatMoney(todayDeposit)}
          </span>
        </div>
      </div>

      {/* 3. Today's Outflow / Expense */}
      <div className="px-2.5 py-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] flex flex-col justify-between shadow-xs min-h-[58px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[var(--ui-text-muted)] truncate">
            Today Expense
          </span>
          <div className="p-1 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
            <FaArrowUp size={12} />
          </div>
        </div>
        <div className="mt-1">
          <span className="text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400 truncate block">
            - ৳ {formatMoney(todayExpense)}
          </span>
        </div>
      </div>

      {/* 4. Expected Cash */}
      <div className="px-2.5 py-2 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/20 flex flex-col justify-between shadow-xs min-h-[58px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-sky-800 dark:text-sky-300 truncate">
            Expected Cash
          </span>
          <div className="p-1 rounded-md bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
            <FaCalculator size={12} />
          </div>
        </div>
        <div className="mt-1">
          <span className="text-sm sm:text-base font-bold text-sky-700 dark:text-sky-300 truncate block">
            ৳ {formatMoney(expectedCash)}
          </span>
        </div>
      </div>

      {/* 5. Counted Physical Cash */}
      <div className="px-2.5 py-2 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 flex flex-col justify-between shadow-xs min-h-[58px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-purple-800 dark:text-purple-300 truncate">
            Counted Cash
          </span>
          <div className="p-1 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
            <FaCoins size={12} />
          </div>
        </div>
        <div className="mt-1">
          <span className="text-sm sm:text-base font-bold text-purple-700 dark:text-purple-300 truncate block">
            ৳ {formatMoney(countedCash)}
          </span>
        </div>
      </div>

      {/* 6. Difference / Variance */}
      <div
        className={`px-2.5 py-2 rounded-xl border flex flex-col justify-between shadow-xs transition-colors min-h-[58px] ${
          isBalanced
            ? "border-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300"
            : isShortage
            ? "border-rose-300 bg-rose-50/80 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300"
            : isSurplus
            ? "border-amber-300 bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300"
            : "border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text)]"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold truncate">
            Difference
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-white/70 dark:bg-black/20">
              {isBalanced
                ? "Matched"
                : isShortage
                ? "Shortage"
                : isSurplus
                ? "Surplus"
                : isClosed
                ? "Closed"
                : "Pending"}
            </span>
            <div className="p-0.5 rounded bg-white/70 dark:bg-black/20 shrink-0">
              {isBalanced ? (
                <FaCheckCircle size={10} className="text-emerald-600" />
              ) : (
                <FaExclamationTriangle
                  size={10}
                  className={isShortage ? "text-rose-600" : "text-amber-600"}
                />
              )}
            </div>
          </div>
        </div>
        <div className="mt-1">
          <span
            className={`text-sm sm:text-base font-bold truncate block ${
              isBalanced
                ? "text-emerald-600 dark:text-emerald-400"
                : isShortage
                ? "text-rose-600 dark:text-rose-400"
                : isSurplus
                ? "text-amber-600 dark:text-amber-400"
                : "text-[var(--ui-text)]"
            }`}
          >
            {differenceAmount > 0 ? "+" : ""}
            ৳ {formatMoney(differenceAmount)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CashClosingKpiCards;

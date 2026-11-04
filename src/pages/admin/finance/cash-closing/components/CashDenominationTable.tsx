import React from "react";
import { FaCoins, FaRedo, FaPlus } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import type { DenominationItem } from "@/types";

interface CashDenominationTableProps {
  denominations: DenominationItem[];
  onChangeQuantity: (denomination: number, quantity: number) => void;
  onResetAll: () => void;
  isReadOnly?: boolean;
}

export const CashDenominationTable: React.FC<CashDenominationTableProps> = ({
  denominations,
  onChangeQuantity,
  onResetAll,
  isReadOnly = false,
}) => {
  const totalNotes = denominations.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  const totalAmount = denominations.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const getNoteBadgeStyle = (denom: number) => {
    switch (denom) {
      case 1000:
        return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900";
      case 500:
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900";
      case 200:
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900";
      case 100:
        return "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-900";
      case 50:
        return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900";
      case 20:
        return "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-900";
      case 10:
        return "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-900";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    }
  };

  const handleInputChange = (denom: number, valueStr: string) => {
    if (isReadOnly) return;
    const clean = valueStr.replace(/[^0-9]/g, "");
    const qty = clean === "" ? 0 : parseInt(clean, 10);
    onChangeQuantity(denom, isNaN(qty) ? 0 : qty);
  };

  const handleQuickAdd = (denom: number, currentQty: number, addQty: number) => {
    if (isReadOnly) return;
    onChangeQuantity(denom, Math.max(0, currentQty + addQty));
  };

  return (
    <div className="bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-2xl shadow-xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--ui-border)] flex items-center justify-between bg-[var(--ui-surface-sunken)]/40">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
            <FaCoins size={13} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--ui-text)] uppercase tracking-wider">
              Cash Denomination Counter
            </h3>
            <p className="text-[10px] text-[var(--ui-text-muted)]">
              Count each currency note and coin to calculate physical cash total
            </p>
          </div>
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={onResetAll}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium text-[var(--ui-text-muted)] border border-[var(--ui-border)] hover:bg-[var(--ui-surface-sunken)] hover:text-red-500 transition-colors cursor-pointer"
            title="Reset all count quantities to 0"
          >
            <FaRedo size={10} />
            <span>Reset Count</span>
          </button>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto overflow-y-auto max-h-[480px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--ui-border)] bg-[var(--ui-surface-sunken)]/60 text-[11px] font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
              <th className="py-1.5 px-2.5">Note / Coin</th>
              <th className="py-1.5 px-2.5 w-40 text-center">Quantity</th>
              {!isReadOnly && <th className="py-1.5 px-2 text-center w-28">Quick Add</th>}
              <th className="py-1.5 px-2.5 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ui-border)]">
            {denominations.map((item) => {
              const qty = Number(item.quantity || 0);
              const lineTotal = Number(item.amount || 0);
              const badgeStyle = getNoteBadgeStyle(item.denomination);

              return (
                <tr
                  key={item.denomination}
                  className="hover:bg-[var(--ui-surface-sunken)]/40 transition-colors"
                >
                  {/* Denomination Note Badge */}
                  <td className="py-1.5 px-2.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-xs border ${badgeStyle} shadow-2xs`}
                    >
                      ৳ {item.denomination.toLocaleString("en-IN")}
                    </span>
                  </td>

                  {/* Quantity Input */}
                  <td className="py-1.5 px-2.5">
                    <div className="flex items-center justify-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={isReadOnly}
                        value={qty === 0 ? "" : qty}
                        placeholder="0"
                        onChange={(e) => handleInputChange(item.denomination, e.target.value)}
                        className={`w-24 text-center font-bold text-xs py-0.5 px-2 rounded-md border transition-all ${
                          qty > 0
                            ? "border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/20"
                            : "border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text)]"
                        } focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-70 disabled:cursor-not-allowed`}
                      />
                    </div>
                  </td>

                  {/* Quick Add Buttons */}
                  {!isReadOnly && (
                    <td className="py-1.5 px-2 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(item.denomination, qty, 1)}
                          className="h-5 px-1.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-[10px] font-semibold text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                          title="Add 1 note"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(item.denomination, qty, 10)}
                          className="h-5 px-1.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-[10px] font-semibold text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                          title="Add 10 notes"
                        >
                          +10
                        </button>
                        {qty > 0 && (
                          <button
                            type="button"
                            onClick={() => onChangeQuantity(item.denomination, 0)}
                            className="h-5 w-5 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-[11px] font-bold text-rose-600 transition-colors cursor-pointer flex items-center justify-center"
                            title="Clear"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                  )}

                  {/* Line Total */}
                  <td className="py-1.5 px-2.5 text-right">
                    <span
                      className={`font-semibold text-xs ${
                        lineTotal > 0
                          ? "text-[var(--ui-text)]"
                          : "text-[var(--ui-text-muted)]"
                      }`}
                    >
                      ৳ {formatMoney(lineTotal)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Total */}
      <div className="px-3 py-2 bg-[var(--ui-surface-sunken)] border-t border-[var(--ui-border)] flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--ui-text-muted)]">
            Total Notes Count:
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-gray-200/70 dark:bg-gray-800 text-[var(--ui-text)]">
            {totalNotes} pcs
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--ui-text-muted)]">
            Total Physical Cash:
          </span>
          <span className="text-sm sm:text-base font-extrabold text-sky-600 dark:text-sky-400">
            ৳ {formatMoney(totalAmount)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CashDenominationTable;

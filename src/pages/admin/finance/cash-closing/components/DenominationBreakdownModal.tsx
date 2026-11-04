import React, { useEffect } from "react";
import { FiX } from "react-icons/fi";
import { FaCoins, FaCalendarAlt, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import type { CashClosingData } from "@/types";

interface DenominationBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: CashClosingData | null;
}

export const DenominationBreakdownModal: React.FC<DenominationBreakdownModalProps> = ({
  isOpen,
  onClose,
  record,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  const denominations = Array.isArray(record.denominations) ? record.denominations : [];
  const totalNotes = denominations.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  const diff = Number(record.differenceAmount || 0);
  const isBalanced = diff === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-3"
      onClick={onClose}
    >
      <div
        className="bg-[var(--ui-surface)] text-[var(--ui-text)] border border-[var(--ui-border)] rounded-2xl shadow-2xl w-[440px] max-w-[95vw] p-5 flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-labelledby="denom-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[var(--ui-border)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
              <FaCoins size={15} />
            </div>
            <div>
              <h3 id="denom-modal-title" className="text-xs font-bold uppercase tracking-wider">
                Denomination Breakdown (নোটের বিবরণ)
              </h3>
              <p className="text-[10px] text-[var(--ui-text-muted)] flex items-center gap-1 mt-0.5">
                <FaCalendarAlt size={10} /> Date: <span className="font-semibold">{record.closingDate}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--ui-text-muted)] hover:text-red-500 hover:bg-[var(--ui-surface-sunken)] transition-colors cursor-pointer"
            title="Close"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Quick Summary Pill */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-lg bg-[var(--ui-surface-sunken)]/60 border border-[var(--ui-border)]">
            <span className="text-[10px] text-[var(--ui-text-muted)] block">Expected</span>
            <span className="font-bold text-[var(--ui-text)]">৳ {formatMoney(record.expectedCash)}</span>
          </div>
          <div className="p-2 rounded-lg bg-[var(--ui-surface-sunken)]/60 border border-[var(--ui-border)]">
            <span className="text-[10px] text-[var(--ui-text-muted)] block">Counted</span>
            <span className="font-bold text-sky-600">৳ {formatMoney(record.countedCash || 0)}</span>
          </div>
          <div
            className={`p-2 rounded-lg border ${
              isBalanced
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                : diff < 0
                ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
            }`}
          >
            <span className="text-[10px] block opacity-80">Variance</span>
            <span className="font-bold">
              {diff > 0 ? "+" : ""}৳ {formatMoney(diff)}
            </span>
          </div>
        </div>

        {/* Notes Table */}
        <div className="border border-[var(--ui-border)] rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[var(--ui-surface-sunken)]/60 border-b border-[var(--ui-border)] text-[10px] font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider sticky top-0">
                <th className="py-2 px-3">Denomination</th>
                <th className="py-2 px-3 text-center">Quantity</th>
                <th className="py-2 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ui-border)]">
              {denominations.length > 0 ? (
                denominations.map((d) => (
                  <tr key={d.denomination} className="hover:bg-[var(--ui-surface-sunken)]/30">
                    <td className="py-1.5 px-3 font-semibold">৳ {d.denomination}</td>
                    <td className="py-1.5 px-3 text-center text-gray-700 dark:text-gray-300">
                      {d.quantity} pcs
                    </td>
                    <td className="py-1.5 px-3 text-right font-bold text-[var(--ui-text)]">
                      ৳ {formatMoney(d.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-xs text-[var(--ui-text-muted)]">
                    No denomination items recorded for this closing.
                  </td>
                </tr>
              )}
            </tbody>
            {denominations.length > 0 && (
              <tfoot className="border-t border-[var(--ui-border)] bg-[var(--ui-surface-sunken)]/70 font-bold">
                <tr>
                  <td className="py-2 px-3">Total Notes</td>
                  <td className="py-2 px-3 text-center text-sky-600">{totalNotes} pcs</td>
                  <td className="py-2 px-3 text-right text-sky-600">
                    ৳ {formatMoney(record.countedCash || 0)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Remarks & Reason if exists */}
        {(record.differenceReason || record.remarks) && (
          <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-[var(--ui-border)] text-xs space-y-1">
            {record.differenceReason && (
              <p className="flex items-center gap-1">
                <span className="text-[var(--ui-text-muted)] font-medium">Reason:</span>
                <span className="font-semibold text-amber-700 dark:text-amber-300">
                  {record.differenceReason}
                </span>
              </p>
            )}
            {record.remarks && (
              <p className="flex items-start gap-1">
                <span className="text-[var(--ui-text-muted)] font-medium shrink-0">Remarks:</span>
                <span className="italic text-gray-700 dark:text-gray-300">{record.remarks}</span>
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-[var(--ui-text)] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DenominationBreakdownModal;

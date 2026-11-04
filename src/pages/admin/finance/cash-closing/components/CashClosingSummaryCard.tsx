import React, { useState } from "react";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaLock,
  FaUnlock,
  FaSpinner,
  FaCalendarAlt,
  FaTag,
  FaStickyNote,
} from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import { DIFFERENCE_REASONS } from "@/types";

interface CashClosingSummaryCardProps {
  closingDate: string;
  openingCash: number;
  todayDeposit: number;
  todayExpense: number;
  expectedCash: number;
  countedCash: number;
  differenceAmount: number;
  differenceReason: string;
  setDifferenceReason: (reason: string) => void;
  remarks: string;
  setRemarks: (remarks: string) => void;
  status: string;
  onSubmitClosing: () => void;
  isSubmitting: boolean;
  onEnableEdit?: () => void;
  isReadOnly?: boolean;
}

export const CashClosingSummaryCard: React.FC<CashClosingSummaryCardProps> = ({
  closingDate,
  openingCash,
  todayDeposit,
  todayExpense,
  expectedCash,
  countedCash,
  differenceAmount,
  differenceReason,
  setDifferenceReason,
  remarks,
  setRemarks,
  status,
  onSubmitClosing,
  isSubmitting,
  onEnableEdit,
  isReadOnly = false,
}) => {
  const isClosed = status?.toLowerCase() === "closed";
  const isBalanced = differenceAmount === 0 && countedCash > 0;
  const hasDifference = differenceAmount !== 0;

  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleInitialClick = () => {
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = () => {
    setConfirmOpen(false);
    onSubmitClosing();
  };

  return (
    <div className="bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-2xl shadow-xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--ui-border)] flex items-center justify-between bg-[var(--ui-surface-sunken)]/40">
        <div className="flex items-center gap-2">
          <div
            className={`p-1 rounded-md shrink-0 ${
              isClosed
                ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {isClosed ? <FaLock size={13} /> : <FaUnlock size={13} />}
          </div>
          <div className="flex gap-2 text-[var(--ui-text)]">
            <h3 className="text-xs font-bold text-[var(--ui-text)] ">
              Settlement & Closing
            </h3>
            <p className="text-[10px] text-[var(--ui-text-muted)] flex items-center gap-1">
              <FaCalendarAlt size={10} /> Date: <span className="font-semibold">{closingDate}</span>
            </p>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            isClosed
              ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300"
              : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300"
          }`}
        >
          {isClosed ? "Closed" : "Open"}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5 flex-1 overflow-y-auto">
        {/* Breakdown Summary */}
        <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-sunken)]/40 p-2.5 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--ui-text-muted)] font-medium">Opening Cash:</span>
            <span className="font-semibold text-[var(--ui-text)]">৳ {formatMoney(openingCash)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">+ Today Deposit:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">৳ {formatMoney(todayDeposit)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-rose-600 dark:text-rose-400 font-medium">- Today Expense:</span>
            <span className="font-semibold text-rose-600 dark:text-rose-400">৳ {formatMoney(todayExpense)}</span>
          </div>
          <div className="border-t border-[var(--ui-border)] pt-1.5 flex items-center justify-between">
            <span className="font-semibold text-sky-700 dark:text-sky-300">Expected In Register:</span>
            <span className="font-bold text-sky-700 dark:text-sky-300">৳ {formatMoney(expectedCash)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-purple-700 dark:text-purple-300">Counted Physical Cash:</span>
            <span className="font-bold text-purple-700 dark:text-purple-300">৳ {formatMoney(countedCash)}</span>
          </div>
        </div>

        {/* Difference Alert Banner */}
        <div
          className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 transition-colors ${
            isBalanced
              ? "border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
              : hasDifference
              ? differenceAmount < 0
                ? "border-rose-300 bg-rose-50/70 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
                : "border-amber-300 bg-amber-50/70 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
              : "border-gray-200 bg-gray-50/70 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300"
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {isBalanced ? (
              <FaCheckCircle className="text-emerald-600 text-sm" />
            ) : (
              <FaExclamationTriangle
                className={differenceAmount < 0 ? "text-rose-600 text-sm" : "text-amber-600 text-sm"}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold">
              {isBalanced
                ? "Cash Balanced"
                : hasDifference
                ? differenceAmount < 0
                  ? `Cash Shortage of ৳ ${formatMoney(Math.abs(differenceAmount))}`
                  : `Cash Surplus of ৳ ${formatMoney(differenceAmount)}`
                : "Physical count not entered yet"}
            </p>
            <p className="text-[11px] mt-0.5 opacity-90 leading-tight">
              {isBalanced
                ? "Physical cash count matches register expectation with 100% accuracy."
                : hasDifference
                ? "Please record the variance reason and remarks before submitting closing."
                : "Enter the quantity of each denomination on the left to start."}
            </p>
          </div>
        </div>

        {/* Difference Reason & Remarks (Flex / Responsive Grid) */}
        <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-sunken)]/30 p-2.5">
          <div className={`grid gap-2.5 items-start ${hasDifference ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
            {/* Reason Select (when difference !== 0) */}
            {hasDifference && (
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--ui-text)]">
                  <FaTag size={11} className="text-amber-500" />
                  <span>Difference Reason</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <select
                  value={differenceReason}
                  disabled={isReadOnly}
                  onChange={(e) => setDifferenceReason(e.target.value)}
                  className="w-full h-9 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text)] font-medium focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs transition-all cursor-pointer truncate"
                >
                  <option value="">-- Select Reason --</option>
                  {DIFFERENCE_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Remarks Input */}
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--ui-text)]">
                <FaStickyNote size={11} className="text-sky-500" />
                <span>Closing Remarks</span>
                <span className="text-[10px] font-normal text-[var(--ui-text-muted)]">(Optional)</span>
              </label>
              <input
                type="text"
                value={remarks}
                disabled={isReadOnly}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Cash count verified by manager..."
                className="w-full h-9 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text)] focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs transition-all placeholder:text-[var(--ui-text-muted)]/70"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-3 py-2 border-t border-[var(--ui-border)] bg-[var(--ui-surface-sunken)]/60 flex items-center justify-end gap-2 mt-auto">
        {isClosed && isReadOnly ? (
          <button
            type="button"
            onClick={onEnableEdit}
            className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 text-[var(--ui-text)] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <FaUnlock size={12} />
            <span>Recount / Edit Closing</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleInitialClick}
            disabled={isSubmitting || countedCash <= 0 || (hasDifference && !differenceReason)}
            className="w-full py-2 px-4 text-xs font-semibold rounded-lg bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] text-white flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            {isSubmitting ? (
              <>
                <FaSpinner className="animate-spin text-xs" />
                <span>Saving Cash Closing...</span>
              </>
            ) : (
              <>
                <FaCheckCircle size={13} />
                <span>Submit & Close Cash</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-3">
          <div className="bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-2xl shadow-2xl w-[400px] max-w-[95vw] p-5 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <FaExclamationTriangle size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--ui-text)] leading-tight">
                  Confirm Cash Closing?
                </h4>
                <p className="text-xs text-[var(--ui-text-muted)]">
                  Date: <span className="font-semibold text-[var(--ui-text)]">{closingDate}</span>
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--ui-surface-sunken)]/60 border border-[var(--ui-border)] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[var(--ui-text-muted)]">Expected Cash:</span>
                <span className="font-semibold">৳ {formatMoney(expectedCash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ui-text-muted)]">Physical Counted:</span>
                <span className="font-bold text-sky-600">৳ {formatMoney(countedCash)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--ui-border)] pt-1.5 font-bold">
                <span>Variance:</span>
                <span className={differenceAmount === 0 ? "text-emerald-600" : differenceAmount < 0 ? "text-rose-600" : "text-amber-600"}>
                  {differenceAmount > 0 ? "+" : ""}৳ {formatMoney(differenceAmount)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[var(--ui-text-muted)]">
              Are you sure you want to finalize and lock the daily cash register for this date?
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--ui-border)] hover:bg-[var(--ui-surface-sunken)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] text-white transition-colors cursor-pointer"
              >
                Yes, Finalize Closing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashClosingSummaryCard;

import React, { useEffect, useState } from "react";
import moment from "moment";
import { FiX } from "react-icons/fi";
import {
  FaCoins,
  FaCalendarAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowDown,
  FaArrowUp,
  FaUserCheck,
  FaClock,
  FaStickyNote,
  FaTag,
  FaSpinner,
  FaCashRegister,
} from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import { fetchCashClosing } from "@/services/cash-closing-service";
import type { CashClosingData, DenominationItem } from "@/types";

interface DenominationBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: CashClosingData | null;
}

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

const getNoteBarColor = (denom: number) => {
  switch (denom) {
    case 1000:
      return "bg-rose-500";
    case 500:
      return "bg-emerald-500";
    case 200:
      return "bg-amber-500";
    case 100:
      return "bg-sky-500";
    case 50:
      return "bg-purple-500";
    case 20:
      return "bg-teal-500";
    case 10:
      return "bg-orange-500";
    default:
      return "bg-gray-500";
  }
};

export const DenominationBreakdownModal: React.FC<DenominationBreakdownModalProps> = ({
  isOpen,
  onClose,
  record,
}) => {
  const [detailData, setDetailData] = useState<CashClosingData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const targetDate = record ? (record.closingDate || (record as any).date || "") : "";

  // Auto-fetch full closing record with denominations if not already loaded
  useEffect(() => {
    if (!isOpen || !targetDate) {
      setDetailData(null);
      return;
    }

    if (Array.isArray(record?.denominations) && record.denominations.length > 0) {
      setDetailData(record);
      return;
    }

    setIsLoading(true);
    fetchCashClosing(targetDate)
      .then((data) => {
        if (data) {
          setDetailData(data);
        }
      })
      .catch((err) => {
        console.error("Error fetching closing breakdown details:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, targetDate, record]);

  if (!isOpen || !record) return null;

  const displayDate =
    targetDate && moment(targetDate).isValid()
      ? moment(targetDate).format("DD MMM, YYYY")
      : targetDate || "—";

  // Data resolution
  const activeOpeningCash = Number(detailData?.openingCash ?? record.openingCash ?? 0);
  const activeDeposit = Number(detailData?.todayDeposit ?? record.todayDeposit ?? 0);
  const activeExpense = Number(detailData?.todayExpense ?? record.todayExpense ?? 0);
  const activeExpectedCash = Number(detailData?.expectedCash ?? record.expectedCash ?? 0);
  const activeCountedCash = Number(
    detailData?.countedCash ?? (record as any).actualCash ?? record.countedCash ?? 0
  );
  const diff = Number(
    detailData?.differenceAmount ?? (record as any).difference ?? record.differenceAmount ?? 0
  );
  const isBalanced = diff === 0;

  // Denominations
  const rawDenominations: DenominationItem[] =
    detailData?.denominations || record.denominations || [];
  const displayDenominations = rawDenominations.filter((d) => Number(d.quantity) > 0);
  const totalNotes = displayDenominations.reduce(
    (acc, curr) => acc + (Number(curr.quantity) || 0),
    0
  );

  // Metadata
  const closedBy = (record as any)?.closedBy || detailData?.addedBy || "";
  const rawClosedAt = (record as any)?.closedAt || detailData?.addedDate || "";
  const diffReason = detailData?.differenceReason || record.differenceReason || "";
  const remarks = detailData?.remarks || record.remarks || "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[var(--ui-surface)] text-[var(--ui-text)] border border-[var(--ui-border)] rounded-2xl shadow-2xl w-[560px] max-w-[95vw] p-4 sm:p-5 flex flex-col gap-3.5 my-auto animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-labelledby="denom-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--ui-border)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/60 shadow-2xs">
              <FaCashRegister size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="denom-modal-title" className="text-sm font-bold tracking-tight">
                  Daily Cash Closing Details
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                    isBalanced
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300"
                  }`}
                >
                  {isBalanced ? <FaCheckCircle size={9} /> : <FaExclamationTriangle size={9} />}
                  {isBalanced ? "Balanced" : "Mismatch"}
                </span>
              </div>
              <p className="text-[11px] text-[var(--ui-text-muted)] flex items-center gap-1.5 mt-0.5">
                <FaCalendarAlt size={10} className="text-sky-500" />
                Date: <span className="font-semibold text-[var(--ui-text)]">{displayDate}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--ui-text-muted)] hover:text-red-500 hover:bg-[var(--ui-surface-sunken)] transition-colors cursor-pointer"
            title="Close"
          >
            <FiX size={17} />
          </button>
        </div>

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-sky-600">
            <FaSpinner className="animate-spin text-2xl" />
            <span className="text-xs text-[var(--ui-text-muted)]">Loading full closing breakdown...</span>
          </div>
        ) : (
          <>
            {/* Financial Ledger Flow (6 Grid Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {/* Opening Cash */}
              <div className="p-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-sunken)]/40 flex flex-col justify-between">
                <span className="text-[10px] text-[var(--ui-text-muted)] font-medium">Opening Cash</span>
                <span className="text-xs font-bold text-[var(--ui-text)] mt-0.5">
                  ৳ {formatMoney(activeOpeningCash)}
                </span>
              </div>

              {/* Deposit */}
              <div className="p-2 rounded-xl border border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col justify-between">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <FaArrowDown size={8} /> Total Deposit
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  +৳ {formatMoney(activeDeposit)}
                </span>
              </div>

              {/* Expense */}
              <div className="p-2 rounded-xl border border-rose-200/70 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 flex flex-col justify-between">
                <span className="text-[10px] text-rose-800 dark:text-rose-400 font-medium flex items-center gap-1">
                  <FaArrowUp size={8} /> Total Expense
                </span>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                  -৳ {formatMoney(activeExpense)}
                </span>
              </div>

              {/* Expected Cash */}
              <div className="p-2 rounded-xl border border-sky-200/70 dark:border-sky-900/50 bg-sky-50/40 dark:bg-sky-950/20 flex flex-col justify-between">
                <span className="text-[10px] text-sky-800 dark:text-sky-300 font-medium">Expected in Register</span>
                <span className="text-xs font-bold text-sky-700 dark:text-sky-300 mt-0.5">
                  ৳ {formatMoney(activeExpectedCash)}
                </span>
              </div>

              {/* Counted Cash */}
              <div className="p-2 rounded-xl border border-purple-200/70 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20 flex flex-col justify-between">
                <span className="text-[10px] text-purple-800 dark:text-purple-300 font-medium">Physical Counted</span>
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 mt-0.5">
                  ৳ {formatMoney(activeCountedCash)}
                </span>
              </div>

              {/* Variance */}
              <div
                className={`p-2 rounded-xl border flex flex-col justify-between ${
                  isBalanced
                    ? "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300"
                    : diff < 0
                    ? "border-rose-200 bg-rose-50/60 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300"
                    : "border-amber-200 bg-amber-50/60 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300"
                }`}
              >
                <span className="text-[10px] font-medium flex items-center gap-1">
                  {isBalanced ? <FaCheckCircle size={8} /> : <FaExclamationTriangle size={8} />}
                  Variance
                </span>
                <span className="text-xs font-bold mt-0.5">
                  {diff > 0 ? "+" : ""}৳ {formatMoney(diff)}
                </span>
              </div>
            </div>

            {/* Physical Currency Notes Table */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[var(--ui-text)]">
                  <FaCoins size={12} className="text-sky-500" />
                  <span>Physical Currency Breakdown</span>
                </div>
                {totalNotes > 0 && (
                  <span className="text-[11px] text-[var(--ui-text-muted)]">
                    Total Notes: <span className="font-bold text-[var(--ui-text)]">{totalNotes.toLocaleString("en-IN")} pcs</span>
                  </span>
                )}
              </div>

              <div className="border border-[var(--ui-border)] rounded-xl overflow-hidden max-h-[240px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-[var(--ui-surface-sunken)]/70 border-b border-[var(--ui-border)] text-xs font-bold text-black dark:text-white tracking-wider sticky top-0 backdrop-blur-xs">
                      <th className="py-2 px-3 text-black dark:text-white font-bold w-24">Note</th>
                      <th className="py-2 px-3 text-left text-black dark:text-white font-bold">Quantity & Share</th>
                      <th className="py-2 px-3 text-right text-black dark:text-white font-bold w-28">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ui-border)]">
                    {displayDenominations.length > 0 ? (
                      displayDenominations.map((d) => {
                        const sharePct =
                          activeCountedCash > 0
                            ? Math.round((Number(d.amount || 0) / activeCountedCash) * 100)
                            : 0;
                        return (
                          <tr key={d.denomination} className="hover:bg-[var(--ui-surface-sunken)]/40 transition-colors">
                            <td className="py-2 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-xs border ${getNoteBadgeStyle(
                                  d.denomination
                                )} shadow-2xs`}
                              >
                                ৳ {d.denomination.toLocaleString("en-IN")}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-semibold text-[var(--ui-text)]">
                                    {d.quantity.toLocaleString("en-IN")} pcs
                                  </span>
                                  <span className="text-[10px] text-[var(--ui-text-muted)] font-medium">
                                    {sharePct}% of cash
                                  </span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${getNoteBarColor(
                                      d.denomination
                                    )}`}
                                    style={{ width: `${Math.min(100, Math.max(3, sharePct))}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-black dark:text-white text-xs">
                              ৳ {formatMoney(d.amount)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-xs text-[var(--ui-text-muted)]">
                          No currency notes recorded for this closing.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {displayDenominations.length > 0 && (
                    <tfoot className="border-t-2 border-[var(--ui-border)] bg-[var(--ui-surface-sunken)]/70 font-bold">
                      <tr>
                        <td className="py-2 px-3 text-black dark:text-white font-bold">Total</td>
                        <td className="py-2 px-3 text-left font-bold text-sky-600 dark:text-sky-400">
                          {totalNotes.toLocaleString("en-IN")} pcs notes
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-black dark:text-white text-xs">
                          ৳ {formatMoney(activeCountedCash)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Audit & Settlement Metadata */}
            <div className="p-3 rounded-xl bg-[var(--ui-surface-sunken)]/40 border border-[var(--ui-border)] text-xs flex flex-col gap-1.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {closedBy && (
                  <div className="flex items-center gap-1.5 text-[var(--ui-text)]">
                    <FaUserCheck size={12} className="text-emerald-500 shrink-0" />
                    <span className="text-[var(--ui-text-muted)]">Closed By:</span>
                    <span className="font-semibold">{closedBy}</span>
                  </div>
                )}
                {rawClosedAt && (
                  <div className="flex items-center gap-1.5 text-[var(--ui-text)]">
                    <FaClock size={12} className="text-sky-500 shrink-0" />
                    <span className="text-[var(--ui-text-muted)]">Timestamp:</span>
                    <span className="font-semibold">
                      {moment(rawClosedAt).isValid()
                        ? moment(rawClosedAt).format("DD MMM, YYYY hh:mm A")
                        : rawClosedAt}
                    </span>
                  </div>
                )}
              </div>

              {(diffReason || remarks) && (
                <div className="pt-1.5 border-t border-[var(--ui-border)] space-y-1">
                  {diffReason && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <FaTag size={10} className="text-amber-500 shrink-0" />
                      <span className="text-[var(--ui-text-muted)] font-medium">Variance Reason:</span>
                      <span className="font-semibold text-amber-700 dark:text-amber-300">
                        {diffReason}
                      </span>
                    </div>
                  )}
                  {remarks && (
                    <div className="flex items-start gap-1.5 text-[11px]">
                      <FaStickyNote size={10} className="text-sky-500 shrink-0 mt-0.5" />
                      <span className="text-[var(--ui-text-muted)] font-medium shrink-0">Remarks:</span>
                      <span className="italic text-gray-700 dark:text-gray-300">{remarks}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end pt-1 border-t border-[var(--ui-border)]">
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

import React from "react";
import { FiClock, FiEye } from "react-icons/fi";
import { formatMoney } from "@/utils/formatters";
import type { PaymentReceiptData } from "@/types/payment.types";
import type { SupplierStatementEntry } from "../utils/supplier-payment-report-helpers";

interface SupplierStatementTableProps {
  entries: SupplierStatementEntry[];
  stats?: {
    openingBalance: number;
    totalPurchases: number;
    totalPayments: number;
    totalReturns: number;
    totalDiscounts: number;
    closingBalance: number;
  };
  onViewReceipt?: (receipt: PaymentReceiptData) => void;
  compact?: boolean;
}

export const SupplierStatementTable: React.FC<SupplierStatementTableProps> = ({
  entries,
  stats,
  onViewReceipt,
}) => {
  if (!entries || entries.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-[var(--ui-text-muted)] bg-[var(--ui-surface)] border border-dashed border-[var(--ui-border)] rounded-lg">
        No transaction records found for this supplier.
      </div>
    );
  }

  const getTypeBadge = (
    type: SupplierStatementEntry["type"],
    typeLabel: string
  ) => {
    switch (type) {
      case "OPENING_BALANCE":
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0">
            Opening
          </span>
        );
      case "PURCHASE":
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap shrink-0">
            Purchase Bill
          </span>
        );
      case "PAYMENT":
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--ui-success-light)] text-[var(--ui-success)] border border-[var(--ui-success-border)] whitespace-nowrap shrink-0">
            Payment
          </span>
        );
      case "PURCHASE_RETURN":
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--ui-danger-light)] text-[var(--ui-danger)] border border-[var(--ui-danger-border)] whitespace-nowrap shrink-0">
            Return
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--ui-surface-muted)] text-[var(--ui-text)] border border-[var(--ui-border)] whitespace-nowrap shrink-0">
            {typeLabel}
          </span>
        );
    }
  };

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] shadow-xs">
      <table className="ui-table w-full text-left border-collapse min-w-[700px]">
        <thead>
          <tr className="border-b border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/50 text-xs font-semibold text-[var(--ui-text-muted)]">
            <th className="py-2.5 px-3 text-center w-12 whitespace-nowrap">SL</th>
            <th className="py-2.5 px-3 text-left w-32 whitespace-nowrap">Date</th>
            <th className="py-2.5 px-3 text-left whitespace-nowrap">
              Description
            </th>
            <th className="py-2.5 px-3 text-right min-w-[110px] whitespace-nowrap">
              Bill / Purchase (৳)
            </th>
            <th className="py-2.5 px-3 text-right min-w-[120px] whitespace-nowrap">
              Payment / Return (৳)
            </th>
            <th className="py-2.5 px-3 text-right min-w-[120px] whitespace-nowrap">
              Running Balance (৳)
            </th>
            {onViewReceipt && (
              <th className="py-2.5 px-3 text-center w-14 whitespace-nowrap">
                Receipt
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ui-border)] text-xs text-[var(--ui-text)]">
          {entries.map((item, idx) => {
            const isOpening = item.type === "OPENING_BALANCE";
            return (
              <tr
                key={item.sl || idx}
                className={`transition-colors hover:bg-[var(--primary-color-light)]/20 ${
                  isOpening
                    ? "bg-slate-50/50 dark:bg-slate-900/20 font-medium"
                    : ""
                }`}
              >
                {/* SL */}
                <td className="py-2.5 px-3 text-center text-[var(--ui-text-muted)] tabular-nums">
                  {item.sl || idx + 1}
                </td>

                {/* Date */}
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-[var(--ui-text)] text-xs">
                      {item.dateStr}
                    </span>
                    {item.hasTime && item.timeStr && (
                      <span className="text-[10px] text-[var(--ui-text-muted)] flex items-center gap-0.5">
                        <FiClock
                          size={10}
                          className="shrink-0 text-[var(--ui-text-subtle)]"
                        />
                        <span>{item.timeStr}</span>
                      </span>
                    )}
                  </div>
                </td>

                {/* Description */}
                <td className="py-2.5 px-3 max-w-[420px]">
                  <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
                    {getTypeBadge(item.type, item.typeLabel)}
                    {item.refNo && item.refNo !== "-" && (
                      <span className="font-mono text-xs font-semibold text-[var(--primary-color)] shrink-0">
                        #{item.refNo}
                      </span>
                    )}
                    {item.paymentMode && item.paymentMode !== "-" && (
                      <span className="text-[10px] font-medium text-[var(--ui-text-muted)] bg-[var(--ui-surface-muted)] px-1.5 py-0.5 rounded border border-[var(--ui-border)] shrink-0">
                        {item.paymentMode}
                      </span>
                    )}
                    {item.note && (
                      <span
                        className="text-xs text-[var(--ui-text-muted)] truncate"
                        title={item.note}
                      >
                        {item.note}
                      </span>
                    )}
                  </div>
                </td>

                {/* Bill / Purchase (৳) */}
                <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap min-w-[110px]">
                  {item.billAmount > 0 ? (
                    <span className="font-medium text-[var(--ui-text)] text-xs">
                      ৳ {formatMoney(item.billAmount)}
                    </span>
                  ) : (
                    <span className="text-[var(--ui-text-subtle)]">-</span>
                  )}
                </td>

                {/* Payment / Return (৳) */}
                <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap min-w-[120px]">
                  {item.paymentAmount > 0 ? (
                    <span className="font-bold text-[var(--ui-success)] text-xs">
                      ৳ {formatMoney(item.paymentAmount)}
                    </span>
                  ) : (
                    <span className="text-[var(--ui-text-subtle)]">-</span>
                  )}
                </td>

                {/* Running Balance (৳) */}
                <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap min-w-[120px]">
                  <span
                    className={`font-bold text-xs ${
                      item.runningBalance > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    ৳ {formatMoney(item.runningBalance)}
                  </span>
                </td>

                {/* Receipt action */}
                {onViewReceipt && (
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    {item.receiptData ? (
                      <button
                        type="button"
                        onClick={() => onViewReceipt(item.receiptData!)}
                        className="p-1 rounded hover:bg-[var(--primary-color-light)]/40 text-[var(--color-primary)] transition-colors cursor-pointer inline-flex items-center justify-center"
                        title="View Payment Receipt"
                      >
                        <FiEye size={13} />
                      </button>
                    ) : (
                      <span className="text-[var(--ui-text-subtle)]">-</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SupplierStatementTable;

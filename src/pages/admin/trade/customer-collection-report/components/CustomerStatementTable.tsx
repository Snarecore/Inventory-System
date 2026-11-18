import React from "react";
import { FiClock, FiEye, FiPackage } from "react-icons/fi";
import { formatMoney } from "@/utils/formatters";
import type { CollectionReceiptData } from "@/pages/admin/trade/customer-collection/components/CollectionReceiptModal";
import type { CustomerStatementEntry } from "../utils/customer-collection-report-helpers";

interface CustomerStatementTableProps {
  entries: CustomerStatementEntry[];
  stats?: {
    openingBalance: number;
    totalSales: number;
    totalCollected: number;
    totalDiscount: number;
    finalBalance: number;
    entryCount: number;
  };
  onViewReceipt?: (receipt: CollectionReceiptData) => void;
  compact?: boolean;
}

export const CustomerStatementTable: React.FC<CustomerStatementTableProps> = ({
  entries,
  stats,
  onViewReceipt,
}) => {
  if (!entries || entries.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-[var(--ui-text-muted)] bg-[var(--ui-surface)] border border-dashed border-[var(--ui-border)] rounded-lg">
        No transaction records found for this customer.
      </div>
    );
  }

  const getTypeBadge = (type: CustomerStatementEntry["type"], typeLabel: string) => {
    switch (type) {
      case "OPENING":
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0">
            Opening
          </span>
        );
      case "CREDIT_SALE":
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 whitespace-nowrap shrink-0">
            Credit Sale
          </span>
        );
      case "CASH_SALE":
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 whitespace-nowrap shrink-0">
            Sale
          </span>
        );
      case "COLLECTION":
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--ui-success-light)] text-[var(--ui-success)] border border-[var(--ui-success-border)] whitespace-nowrap shrink-0">
            Collection
          </span>
        );
      case "SALES_RETURN":
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25 whitespace-nowrap shrink-0">
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
            <th className="py-2.5 px-3 text-left whitespace-nowrap">Description</th>
            <th className="py-2.5 px-3 text-right min-w-[110px] whitespace-nowrap">Sales (৳)</th>
            <th className="py-2.5 px-3 text-right min-w-[120px] whitespace-nowrap">Collection (৳)</th>
            <th className="py-2.5 px-3 text-right min-w-[120px] whitespace-nowrap">Balance (৳)</th>
            {onViewReceipt && <th className="py-2.5 px-3 text-center w-14 whitespace-nowrap">Receipt</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ui-border)] text-xs text-[var(--ui-text)]">
          {entries.map((item, idx) => {
            const isOpening = item.type === "OPENING";
            return (
              <tr
                key={item.id || idx}
                className={`transition-colors hover:bg-[var(--primary-color-light)]/20 ${
                  isOpening ? "bg-slate-50/50 dark:bg-slate-900/20 font-medium" : ""
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
                      {item.formattedDate}
                    </span>
                    {item.hasTime && item.formattedTime && (
                      <span className="text-[10px] text-[var(--ui-text-muted)] flex items-center gap-0.5">
                        <FiClock size={10} className="shrink-0 text-[var(--ui-text-subtle)]" />
                        <span>{item.formattedTime}</span>
                      </span>
                    )}
                  </div>
                </td>

                {/* Description: Strictly Single Line with Returned Product Pill */}
                <td className="py-2.5 px-3 max-w-[420px]">
                  <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
                    {getTypeBadge(item.type, item.typeLabel)}
                    {item.collectionAmount > 0 && item.type !== "COLLECTION" && item.type !== "OPENING" && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap shrink-0">
                        Customer Collection
                      </span>
                    )}
                    {item.refNo && item.refNo !== "-" && (
                      <span className="font-mono text-xs font-semibold text-[var(--primary-color)] shrink-0">
                        #{item.refNo}
                      </span>
                    )}
                    {item.voucherNos && item.voucherNos.length > 0 && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded shrink-0"
                        title={`Collection Voucher: #${item.voucherNos.join(", #")}`}
                      >
                        Voucher: #{item.voucherNos.join(", #")}
                      </span>
                    )}
                    {item.returnItemsSummary && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-1.5 py-0.5 rounded shrink-0 max-w-[260px] truncate"
                        title={`Returned Product: ${item.returnItemsSummary}`}
                      >
                        <FiPackage size={11} className="shrink-0 text-rose-500" />
                        <span className="truncate">{item.returnItemsSummary}</span>
                      </span>
                    )}
                    {item.paymentMode && item.paymentMode !== "-" && !item.returnItemsSummary && (
                      <span className="text-[10px] font-medium text-[var(--ui-text-muted)] bg-[var(--ui-surface-muted)] px-1.5 py-0.5 rounded border border-[var(--ui-border)] shrink-0">
                        {item.paymentMode}
                      </span>
                    )}
                    {item.note &&
                      !item.note.toLowerCase().includes(item.returnItemsSummary?.toLowerCase() || "___never___") &&
                      !item.note.toLowerCase().includes("voucher: #") &&
                      item.note !== `Return: ${item.returnItemsSummary}` && (
                      <span
                        className="text-xs text-[var(--ui-text-muted)] truncate"
                        title={item.note}
                      >
                        {item.note}
                      </span>
                    )}
                  </div>
                </td>

                {/* Sales (৳) */}
                <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap min-w-[110px]">
                  {item.salesAmount > 0 ? (
                    <span className="font-medium text-[var(--ui-text)] text-xs">
                      ৳ {formatMoney(item.salesAmount)}
                    </span>
                  ) : item.salesAmount < 0 ? (
                    <span
                      className="font-bold text-rose-600 dark:text-rose-400 text-xs inline-flex items-center justify-end gap-0.5 bg-rose-50/80 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200/60 dark:border-rose-900/40"
                      title="Returned product amount deducted from balance"
                    >
                      <span>-৳ {formatMoney(Math.abs(item.salesAmount))}</span>
                    </span>
                  ) : (
                    <span className="text-[var(--ui-text-subtle)]">-</span>
                  )}
                </td>

                {/* Collection (৳) */}
                <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap min-w-[120px]">
                  {item.collectionAmount > 0 ? (
                    <span className="font-bold text-[var(--ui-success)] text-xs">
                      ৳ {formatMoney(item.collectionAmount)}
                    </span>
                  ) : (
                    <span className="text-[var(--ui-text-subtle)]">-</span>
                  )}
                </td>

                {/* Balance (৳) */}
                <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap min-w-[120px]">
                  <span
                    className={`text-xs tabular-nums ${
                      item.runningBalance > 0
                        ? "font-bold text-[var(--ui-danger)]"
                        : "font-semibold text-[var(--ui-success)]"
                    }`}
                  >
                    ৳ {formatMoney(item.runningBalance)}
                  </span>
                </td>

                {/* Receipt View */}
                {onViewReceipt && (
                  <td className="py-2.5 px-3 text-center whitespace-nowrap w-14">
                    {item.receiptData && item.collectionAmount > 0 ? (
                      <button
                        type="button"
                        onClick={() => onViewReceipt(item.receiptData!)}
                        className="inline-flex items-center justify-center w-7 h-7 text-[var(--primary-color)] hover:bg-[var(--primary-color-light)] rounded-md transition-colors cursor-pointer"
                        title="View Collection Receipt"
                      >
                        <FiEye size={13} />
                      </button>
                    ) : (
                      <span className="text-[var(--ui-text-subtle)]">—</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>

        {/* Total Summary Footer Row */}
        {stats && (
          <tfoot>
            <tr className="border-t-2 border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/60 text-xs font-semibold text-[var(--ui-text)]">
              <td colSpan={3} className="py-2.5 px-3 text-right whitespace-nowrap">
                <span className="text-xs text-[var(--ui-text-muted)] mr-2">
                  Total Summary ({stats.entryCount} entries) - Closing Balance:
                </span>
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap font-bold text-[var(--ui-text)] min-w-[110px]">
                ৳ {formatMoney(stats.totalSales)}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap font-bold text-[var(--ui-success)] min-w-[120px]">
                ৳ {formatMoney(stats.totalCollected)}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap min-w-[120px]">
                <span
                  className={`font-bold tabular-nums text-xs ${
                    stats.finalBalance > 0
                      ? "text-[var(--ui-danger)]"
                      : "text-[var(--ui-success)]"
                  }`}
                >
                  ৳ {formatMoney(stats.finalBalance)}
                </span>
              </td>
              {onViewReceipt && <td className="py-2.5 px-3 w-14"></td>}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

export default CustomerStatementTable;

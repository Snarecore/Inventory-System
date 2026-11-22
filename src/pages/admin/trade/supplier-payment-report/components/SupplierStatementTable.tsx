import React, { useState } from "react";
import { FiEye, FiPackage, FiChevronDown, FiChevronRight } from "react-icons/fi";
import { formatMoney } from "@/utils/formatters";
import type { PaymentReceiptData } from "@/types/payment.types";
import type {
  PurchaseLedgerBreakdownItem,
  PurchaseLedgerStats,
} from "@/types/purchase-ledger.types";
import {
  Table,
  TableHead,
  TableTh,
  TableBody,
} from "@/components/table-components/Table";
import type { SupplierStatementEntry } from "../utils/supplier-payment-report-helpers";

interface SupplierStatementTableProps {
  entries: (PurchaseLedgerBreakdownItem | SupplierStatementEntry | any)[];
  stats?: PurchaseLedgerStats | {
    openingBalance?: number;
    totalPurchases?: number;
    totalPayments?: number;
    totalReturns?: number;
    totalDiscounts?: number;
    closingBalance?: number;
    finalBalance?: number;
    entryCount?: number;
    totalDebit?: number;
    totalCredit?: number;
  };
  onViewReceipt?: (receipt: PaymentReceiptData) => void;
  compact?: boolean;
}

export const SupplierStatementTable: React.FC<SupplierStatementTableProps> = ({
  entries,
  stats,
  onViewReceipt,
}) => {
  const [expandedProductRowIdx, setExpandedProductRowIdx] = useState<number | null>(null);

  if (!entries || entries.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-[var(--ui-text-muted)] bg-[var(--ui-surface)] border border-dashed border-[var(--ui-border)] rounded-lg">
        No transaction records found for this supplier.
      </div>
    );
  }

  const getTypeBadge = (type: string = "", typeLabel?: string) => {
    const tLower = (type || typeLabel || "").toLowerCase();

    if (tLower.includes("opening") || tLower.includes("প্রারম্ভিক")) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
          Opening Balance
        </span>
      );
    }
    if (tLower.includes("payment") || tLower.includes("paid") || tLower.includes("পরিশোধ")) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
          Payment
        </span>
      );
    }
    if (tLower.includes("return") || tLower.includes("ফেরত")) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 whitespace-nowrap">
          Return
        </span>
      );
    }
    if (tLower.includes("credit")) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30 whitespace-nowrap">
          Credit Purchase
        </span>
      );
    }
    if (tLower.includes("purchase") || tLower.includes("bill") || tLower.includes("ক্রয়")) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
          Purchase Bill
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-[var(--ui-surface-muted)] text-[var(--ui-text)] border border-[var(--ui-border)] whitespace-nowrap">
        {typeLabel || type || "-"}
      </span>
    );
  };

  const getMethodBadge = (method: string = "-") => {
    if (!method || method === "-") {
      return <span className="text-[var(--ui-text-subtle)]">-</span>;
    }
    const mLower = method.toLowerCase();
    if (mLower === "cash") {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          Cash
        </span>
      );
    }
    if (mLower === "credit") {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          Credit
        </span>
      );
    }
    if (mLower === "partial") {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
          Partial
        </span>
      );
    }
    if (mLower === "return") {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          Return
        </span>
      );
    }
    if (mLower === "bank" || mLower.includes("bank")) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          Bank
        </span>
      );
    }
    if (mLower === "mfs" || mLower.includes("bkash") || mLower.includes("nagad") || mLower.includes("rocket")) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
          {method}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-[var(--ui-surface-muted)] text-[var(--ui-text)] border border-[var(--ui-border)]">
        {method}
      </span>
    );
  };

  const totalPurchasesVal = Number(
    (stats as any)?.totalPurchases ?? (stats as any)?.totalDebit ?? 0
  );
  const totalPaidVal = Number(
    (stats as any)?.totalPaid ?? (stats as any)?.totalPayments ?? (stats as any)?.totalCredit ?? 0
  );
  const finalBalanceVal = Number(
    (stats as any)?.finalBalance ??
    (stats as any)?.closingBalance ??
    entries[entries.length - 1]?.balance ??
    entries[entries.length - 1]?.runningBalance ??
    0
  );

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] shadow-xs">
      <Table minWidth={850}>
        <TableHead>
          <TableTh align="center" width={48} className="whitespace-nowrap">
            SL
          </TableTh>
          <TableTh align="center" width={135} className="whitespace-nowrap">
            Date & Time
          </TableTh>
          <TableTh align="center" width={110} className="whitespace-nowrap">
            Type
          </TableTh>
          <TableTh align="center" width={115} className="whitespace-nowrap">
            Payment Method
          </TableTh>
          <TableTh align="left" className="whitespace-nowrap min-w-[160px]">
            Description
          </TableTh>
          <TableTh align="right" width={115} className="whitespace-nowrap">
            Purchase (৳)
          </TableTh>
          <TableTh align="right" width={115} className="whitespace-nowrap">
            Payment (৳)
          </TableTh>
          <TableTh align="right" width={115} className="whitespace-nowrap">
            Balance (৳)
          </TableTh>
          <TableTh align="center" width={70} className="whitespace-nowrap">
            Items
          </TableTh>
          {onViewReceipt && (
            <TableTh align="center" width={60} className="whitespace-nowrap">
              Receipt
            </TableTh>
          )}
        </TableHead>
        <TableBody className="text-[11px] text-[var(--ui-text)]">
          {entries.map((item: any, idx: number) => {
            const isOpening = String(item.type || item.typeLabel || "").toLowerCase().includes("opening");
            const bill = Number(item.billAmount ?? item.debit ?? 0);
            const payment = Number(item.paymentAmount ?? item.credit ?? 0);
            const balance = Number(item.balance ?? item.runningBalance ?? 0);

            const products: any[] = Array.isArray(item.products)
              ? item.products
              : Array.isArray(item.rawRecord?.items)
              ? item.rawRecord.items
              : Array.isArray(item.rawRecord?.products)
              ? item.rawRecord.products
              : [];

            const isProductExpanded = expandedProductRowIdx === idx;
            const hasProducts = products.length > 0;

            const receiptData = item.receiptData || item.rawRecord?.receiptData || item.raw?.receiptData;

            return (
              <React.Fragment key={item.id || item.sl || idx}>
                <tr
                  className={`transition-colors hover:bg-[var(--primary-color-light)]/20 ${
                    isOpening ? "bg-slate-50/50 dark:bg-slate-900/20 font-medium" : ""
                  }`}
                >
                  {/* SL */}
                  <td className="py-2 px-2.5 text-center text-[var(--ui-text-muted)] tabular-nums text-[11px]">
                    {idx + 1}
                  </td>

                  {/* Date & Time */}
                  <td className="py-2 px-2.5 text-center whitespace-nowrap">
                    <span className="font-medium text-[var(--ui-text)] text-[11px]">
                      {item.dateTimeStr || item.dateStr || item.date || "-"}
                    </span>
                  </td>

                  {/* Type */}
                  <td className="py-2 px-2.5 text-center whitespace-nowrap">
                    {getTypeBadge(item.type, item.typeLabel)}
                  </td>

                  {/* Payment Method */}
                  <td className="py-2 px-2.5 text-center whitespace-nowrap">
                    {getMethodBadge(item.paymentMethod || item.paymentMode)}
                  </td>

                  {/* Description */}
                  <td className="py-2 px-2.5 whitespace-nowrap max-w-xs truncate text-[var(--ui-text)] font-medium text-[11px]">
                    <span title={item.description}>{item.description || "-"}</span>
                  </td>

                  {/* Purchase (৳) */}
                  <td className="py-2 px-2.5 text-right tabular-nums whitespace-nowrap min-w-[95px]">
                    {bill > 0 ? (
                      <span className="font-semibold text-[var(--ui-text)] text-[11px]">
                        ৳ {formatMoney(bill)}
                      </span>
                    ) : bill < 0 ? (
                      <span className="font-semibold text-rose-600 dark:text-rose-400 text-[11px]">
                        -৳ {formatMoney(Math.abs(bill))}
                      </span>
                    ) : (
                      <span className="text-[var(--ui-text-subtle)]">-</span>
                    )}
                  </td>

                  {/* Payment (৳) */}
                  <td className="py-2 px-2.5 text-right tabular-nums whitespace-nowrap min-w-[95px]">
                    {payment > 0 ? (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">
                        ৳ {formatMoney(payment)}
                      </span>
                    ) : payment < 0 ? (
                      <span className="font-semibold text-rose-600 dark:text-rose-400 text-[11px]">
                        -৳ {formatMoney(Math.abs(payment))}
                      </span>
                    ) : (
                      <span className="text-[var(--ui-text-subtle)]">-</span>
                    )}
                  </td>

                  {/* Running Balance (৳) */}
                  <td className="py-2 px-2.5 text-right tabular-nums whitespace-nowrap min-w-[105px]">
                    <span
                      className={`text-[11px] tabular-nums font-semibold ${
                        balance > 0
                          ? "text-rose-600 dark:text-rose-400"
                          : balance < 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-[var(--ui-text-muted)]"
                      }`}
                    >
                      {balance < 0
                        ? `৳ ${formatMoney(Math.abs(balance))} (Advance)`
                        : `৳ ${formatMoney(balance)}`}
                    </span>
                  </td>

                  {/* Products Column */}
                  <td className="py-2 px-2.5 text-center whitespace-nowrap">
                    {hasProducts ? (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedProductRowIdx(isProductExpanded ? null : idx)
                        }
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--primary-color)] bg-[var(--primary-color-light)] hover:bg-[var(--primary-color)]/20 rounded transition-colors cursor-pointer"
                        title={isProductExpanded ? "Hide items" : `View ${products.length} products`}
                      >
                        <FiPackage size={11} />
                        <span>{products.length}</span>
                        {isProductExpanded ? <FiChevronDown size={10} /> : <FiChevronRight size={10} />}
                      </button>
                    ) : (
                      <span className="text-[var(--ui-text-subtle)]">-</span>
                    )}
                  </td>

                  {/* Receipt Modal Trigger */}
                  {onViewReceipt && (
                    <td className="py-2 px-2.5 text-center whitespace-nowrap w-12">
                      {receiptData ? (
                        <button
                          type="button"
                          onClick={() => onViewReceipt(receiptData)}
                          className="inline-flex items-center justify-center w-6 h-6 text-[var(--primary-color)] hover:bg-[var(--primary-color-light)] rounded-md transition-colors cursor-pointer"
                          title="View Payment Receipt"
                        >
                          <FiEye size={12} />
                        </button>
                      ) : (
                        <span className="text-[var(--ui-text-subtle)]">—</span>
                      )}
                    </td>
                  )}
                </tr>

                {/* Expanded Products Row */}
                {isProductExpanded && hasProducts && (
                  <tr className="bg-[var(--ui-surface-muted)]/30 border-b border-[var(--ui-border)]">
                    <td colSpan={onViewReceipt ? 10 : 9} className="p-2 sm:p-2.5">
                      <div className="bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg p-2 shadow-xs">
                        <div className="text-[11px] font-bold text-[var(--ui-text)] mb-1.5 flex items-center gap-1.5">
                          <FiPackage className="text-[var(--primary-color)]" size={12} />
                          <span>Product Details ({products.length} items)</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[10.5px] text-left border-collapse">
                            <thead>
                              <tr className="border-b border-[var(--ui-border)] text-[var(--ui-text-muted)] font-medium">
                                <th className="py-1 px-2 text-center w-8">#</th>
                                <th className="py-1 px-2 text-left">Product Name</th>
                                <th className="py-1 px-2 text-center">Quantity</th>
                                <th className="py-1 px-2 text-right">Unit Price</th>
                                <th className="py-1 px-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--ui-border)]">
                              {products.map((p: any, pIdx: number) => {
                                const pName = p.productName || p.name || `Product ${pIdx + 1}`;
                                const pQty = Number(p.quantity ?? p.qty ?? 1);
                                const pPrice = Number(p.price ?? p.unitPrice ?? p.purchasePrice ?? p.rate ?? 0);
                                const pTotal = Number(p.total ?? p.subtotal ?? pQty * pPrice);

                                return (
                                  <tr key={pIdx} className="hover:bg-[var(--ui-surface-muted)]/50">
                                    <td className="py-1 px-2 text-center text-[var(--ui-text-muted)]">{pIdx + 1}</td>
                                    <td className="py-1 px-2 font-medium text-[var(--ui-text)]">{pName}</td>
                                    <td className="py-1 px-2 text-center tabular-nums">{pQty} {p.unit || ""}</td>
                                    <td className="py-1 px-2 text-right tabular-nums">৳ {formatMoney(pPrice)}</td>
                                    <td className="py-1 px-2 text-right tabular-nums font-semibold text-[var(--ui-text)]">৳ {formatMoney(pTotal)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>

        {/* Total Summary Footer Row matching screenshot */}
        <tfoot>
          <tr className="border-t-2 border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/60 text-[11px] font-semibold text-[var(--ui-text)]">
            <td className="py-2 px-2.5 text-center font-bold">Total</td>
            <td className="py-2 px-2.5 text-center">-</td>
            <td className="py-2 px-2.5 text-center">-</td>
            <td className="py-2 px-2.5 text-center">-</td>
            <td className="py-2 px-2.5 text-left font-bold text-rose-600 dark:text-rose-400">
              Closing Balance: BDT {formatMoney(finalBalanceVal)}
            </td>
            <td className="py-2 px-2.5 text-right tabular-nums font-bold whitespace-nowrap min-w-[95px]">
              ৳ {formatMoney(totalPurchasesVal)}
            </td>
            <td className="py-2 px-2.5 text-right tabular-nums font-bold whitespace-nowrap text-emerald-600 dark:text-emerald-400 min-w-[95px]">
              ৳ {formatMoney(totalPaidVal)}
            </td>
            <td className="py-2 px-2.5 text-right tabular-nums font-bold whitespace-nowrap text-rose-600 dark:text-rose-400 min-w-[105px]">
              ৳ {formatMoney(finalBalanceVal)}
            </td>
            <td className="py-2 px-2.5 text-center">-</td>
            {onViewReceipt && <td className="py-2 px-2.5 text-center">-</td>}
          </tr>
        </tfoot>
      </Table>
    </div>
  );
};

export default SupplierStatementTable;

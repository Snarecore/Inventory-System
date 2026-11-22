import React, { useMemo, useState } from "react";
import { FaStore, FaFileExcel, FaFilePdf } from "react-icons/fa";
import { FiMaximize2 } from "react-icons/fi";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import { formatMoney } from "@/utils/formatters";
import type { ReportCompanyMeta } from "@/utils/trade-report-helpers";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type { PaymentReceiptData } from "@/types/payment.types";
import {
  usePurchaseLedgerQuery,
  computePurchaseLedgerStats,
  mapPurchaseLedgerToBreakdownEntries,
  hasMeaningfulLedgerEntries,
} from "@/hooks/usePurchaseLedger";
import {
  buildSupplierStatementEntries,
  exportSupplierStatementExcel,
  downloadSupplierStatementPdf,
} from "../utils/supplier-payment-report-helpers";
import SupplierStatementTable from "./SupplierStatementTable";

interface InlinePurchaseLedgerRowProps {
  supplier: any;
  startDate?: string;
  endDate?: string;
  purchasesList?: any[];
  payments?: any[];
  returnRecords?: any[];
  rawPartyData?: any;
  companyMeta: ReportCompanyMeta;
  activeVisibleColumnCount: number;
  onViewReceipt?: (receipt: PaymentReceiptData) => void;
  onOpenDrawer?: () => void;
}

export const InlinePurchaseLedgerRow: React.FC<InlinePurchaseLedgerRowProps> = ({
  supplier,
  startDate,
  endDate,
  purchasesList = [],
  payments = [],
  returnRecords = [],
  rawPartyData,
  companyMeta,
  activeVisibleColumnCount,
  onViewReceipt,
  onOpenDrawer,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const supplierId = supplier.supplierId || supplier.id;
  const supplierPhone = supplier.supplierPhone || supplier.phone;
  const supplierName = supplier.supplierName || supplier.name;

  // Live Query to /purchase-ledger with automatic supplier resolution
  const {
    data: entries = [],
    isLoading,
  } = usePurchaseLedgerQuery({
    supplierId,
    supplierPhone,
    supplierName,
    startDate,
    endDate,
    purchasesList,
    rawPartyData,
  });

  // Map to breakdown representation
  const breakdownEntries = useMemo(() => {
    if (hasMeaningfulLedgerEntries(entries)) {
      return mapPurchaseLedgerToBreakdownEntries(
        entries,
        purchasesList,
        payments,
        returnRecords
      );
    }
    // Fallback: client-side statement generator
    const fallbackStmt = buildSupplierStatementEntries(
      supplier,
      payments,
      purchasesList,
      returnRecords,
      rawPartyData,
      { startDate, endDate }
    );
    return mapPurchaseLedgerToBreakdownEntries(
      fallbackStmt.entries,
      purchasesList,
      payments,
      returnRecords
    );
  }, [entries, purchasesList, payments, returnRecords, supplier, rawPartyData, startDate, endDate]);

  const stats = useMemo(() => {
    return computePurchaseLedgerStats(breakdownEntries);
  }, [breakdownEntries]);

  const remainingDue =
    stats && (stats.finalBalance !== 0 || breakdownEntries.length > 0)
      ? Number(stats.finalBalance)
      : Number(supplier.currentDue ?? supplier.totalDue ?? 0);
  const totalPurchasesVal = Number(stats?.totalPurchases ?? stats?.totalDebit ?? 0);
  const totalPaidVal = Number(stats?.totalPaid ?? stats?.totalCredit ?? 0);
  const invoiceCount =
    breakdownEntries.filter(
      (e) =>
        e.type === "Purchase" ||
        e.type === "Credit Purchase" ||
        e.type === "Purchase Bill"
    ).length ||
    supplier.invoiceCount ||
    supplier.voucherCount ||
    (breakdownEntries.length > 1 ? breakdownEntries.length - 1 : 0);

  return (
    <tr className="bg-[var(--ui-surface-muted)]/20 border-b border-[var(--ui-border)]">
      <td colSpan={activeVisibleColumnCount} className="p-1.5 sm:p-2 text-left">
        <div className="bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl p-2.5 sm:p-3 shadow-xs flex flex-col gap-2.5">
          {/* Expanded Header Card */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[var(--ui-border)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary-color-light)] text-[var(--primary-color)] flex items-center justify-center font-bold shrink-0">
                <FaStore size={14} />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-xs text-[var(--ui-text)]">
                    {supplierName}
                  </span>
                  <span className="text-[11px] text-[var(--ui-text-muted)]">
                    (Purchase Ledger History)
                  </span>
                </div>
                <div className="text-[11px] text-[var(--ui-text-muted)] flex items-center gap-2 mt-0.5 flex-wrap">
                  {supplierPhone && (
                    <>
                      <span>Phone: {supplierPhone}</span>
                      <span className="inline-block w-px h-2.5 bg-[var(--ui-border)]" />
                    </>
                  )}
                  <span>Invoices: {invoiceCount}</span>
                  <span className="inline-block w-px h-2.5 bg-[var(--ui-border)]" />
                  <span>
                    Total Purchases:{" "}
                    <strong className="text-[var(--ui-text)] font-semibold">
                      ৳ {formatMoney(totalPurchasesVal)}
                    </strong>
                  </span>
                  <span className="inline-block w-px h-2.5 bg-[var(--ui-border)]" />
                  <span>
                    Total Paid:{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      ৳ {formatMoney(totalPaidVal)}
                    </strong>
                  </span>
                  <span className="inline-block w-px h-2.5 bg-[var(--ui-border)]" />
                  <span
                    className={
                      remainingDue > 0
                        ? "text-rose-600 dark:text-rose-400 font-bold"
                        : "text-[var(--ui-success)] font-bold"
                    }
                  >
                    Outstanding Due: ৳ {formatMoney(remainingDue)}
                    {remainingDue === 0 && (
                      <span className="ml-1 text-[10px] font-medium text-[var(--ui-text-muted)]">
                        (Fully Cleared)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={isExporting || isLoading || breakdownEntries.length === 0}
                onClick={async () => {
                  try {
                    setIsExporting(true);
                    await exportSupplierStatementExcel(
                      supplier,
                      breakdownEntries,
                      companyMeta,
                      { purchasesList, payments }
                    );
                    showSuccessToast("Purchase ledger exported to Excel successfully");
                  } catch (err: any) {
                    showErrorToast(err?.message || "Failed to export Excel");
                  } finally {
                    setIsExporting(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 transition-colors cursor-pointer disabled:opacity-50"
                title="Export This Purchase Ledger to Excel"
              >
                <FaFileExcel size={12} />
                <span>Excel</span>
              </button>

              <button
                type="button"
                disabled={isExporting || isLoading || breakdownEntries.length === 0}
                onClick={async () => {
                  try {
                    setIsExporting(true);
                    await downloadSupplierStatementPdf(
                      supplier,
                      breakdownEntries,
                      companyMeta,
                      { purchasesList, payments }
                    );
                    showSuccessToast("Purchase ledger PDF downloaded successfully");
                  } catch (err: any) {
                    showErrorToast(err?.message || "Failed to download PDF");
                  } finally {
                    setIsExporting(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
                title="Download This Purchase Ledger PDF"
              >
                <FaFilePdf size={12} />
                <span>PDF</span>
              </button>

              {onOpenDrawer && (
                <button
                  type="button"
                  onClick={onOpenDrawer}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--primary-color-light)] text-[var(--primary-color)] transition-colors cursor-pointer"
                  title="Open Full Ledger Drawer"
                >
                  <FiMaximize2 size={12} />
                  <span>Full View</span>
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="p-3">
              <TableSkeleton rows={4} cols={8} />
            </div>
          ) : (
            <SupplierStatementTable
              entries={breakdownEntries}
              stats={stats}
              onViewReceipt={onViewReceipt}
            />
          )}
        </div>
      </td>
    </tr>
  );
};

export default InlinePurchaseLedgerRow;

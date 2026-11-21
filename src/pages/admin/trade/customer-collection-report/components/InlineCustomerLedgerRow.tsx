import React, { useMemo, useState } from "react";
import { FaStore, FaFileExcel, FaFilePdf } from "react-icons/fa";
import { FiMaximize2 } from "react-icons/fi";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import { formatMoney } from "@/utils/formatters";
import type { ReportCompanyMeta } from "@/utils/trade-report-helpers";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type { CollectionReceiptData } from "@/pages/admin/trade/customer-collection/components/CollectionReceiptModal";
import {
  useCustomerLedgerQuery,
  computeCustomerLedgerStats,
  mapLedgerToBreakdownEntries,
} from "@/hooks/useCustomerLedger";
import {
  exportCustomerStatementExcel,
  downloadCustomerStatementPdf,
} from "../utils/customer-collection-report-helpers";
import CustomerStatementTable from "./CustomerStatementTable";

interface InlineCustomerLedgerRowProps {
  customer: any;
  startDate?: string;
  endDate?: string;
  salesList?: any[];
  collections?: any[];
  rawPartyData?: any;
  companyMeta: ReportCompanyMeta;
  activeVisibleColumnCount: number;
  onViewReceipt?: (receipt: CollectionReceiptData) => void;
  onOpenDrawer?: () => void;
}

export const InlineCustomerLedgerRow: React.FC<InlineCustomerLedgerRowProps> = ({
  customer,
  startDate,
  endDate,
  salesList = [],
  collections = [],
  rawPartyData,
  companyMeta,
  activeVisibleColumnCount,
  onViewReceipt,
  onOpenDrawer,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const customerId = customer.customerId || customer.id;
  const customerPhone = customer.customerPhone || customer.phone;
  const customerName = customer.customerName || customer.name;

  // Live Query to /customer-ledger with automatic customer resolution
  const {
    data: entries = [],
    isLoading,
  } = useCustomerLedgerQuery({
    customerId,
    customerPhone,
    customerName,
    startDate,
    endDate,
    salesList,
    rawPartyData,
  });

  // Map to breakdown representation matching user screenshot
  const breakdownEntries = useMemo(() => {
    return mapLedgerToBreakdownEntries(entries, salesList, collections);
  }, [entries, salesList, collections]);

  const stats = useMemo(() => {
    return computeCustomerLedgerStats(breakdownEntries);
  }, [breakdownEntries]);

  const remainingDue = Number(stats?.finalBalance ?? customer.currentDue ?? 0);
  const totalSalesVal = Number(stats?.totalSales ?? stats?.totalDebit ?? 0);
  const totalCollectedVal = Number(stats?.totalCollected ?? stats?.totalCredit ?? 0);
  const voucherCount = customer.voucherCount || stats.entryCount || entries.length;

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
                    {customerName}
                  </span>
                  <span className="text-[11px] text-[var(--ui-text-muted)]">
                    (Statement History)
                  </span>
                </div>
                <div className="text-[11px] text-[var(--ui-text-muted)] flex items-center gap-2 mt-0.5 flex-wrap">
                  {customerPhone && (
                    <>
                      <span>Phone: {customerPhone}</span>
                      <span className="inline-block w-px h-2.5 bg-[var(--ui-border)]" />
                    </>
                  )}
                  <span>Vouchers: {voucherCount}</span>
                  <span className="inline-block w-px h-2.5 bg-[var(--ui-border)]" />
                  <span>
                    Total Sales:{" "}
                    <strong className="text-[var(--ui-text)] font-semibold">
                      ৳ {formatMoney(totalSalesVal)}
                    </strong>
                  </span>
                  <span className="inline-block w-px h-2.5 bg-[var(--ui-border)]" />
                  <span>
                    Total Collected:{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      ৳ {formatMoney(totalCollectedVal)}
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
                    Remaining Due: ৳ {formatMoney(remainingDue)}
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
                    await exportCustomerStatementExcel(
                      customer,
                      breakdownEntries,
                      companyMeta,
                      { salesList, collections }
                    );
                    showSuccessToast("Customer statement exported to Excel successfully");
                  } catch (err: any) {
                    showErrorToast(err?.message || "Failed to export Excel");
                  } finally {
                    setIsExporting(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 transition-colors cursor-pointer disabled:opacity-50"
                title="Export This Customer Statement to Excel"
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
                    await downloadCustomerStatementPdf(
                      customer,
                      breakdownEntries,
                      companyMeta,
                      { salesList, collections }
                    );
                    showSuccessToast("Customer statement PDF downloaded successfully");
                  } catch (err: any) {
                    showErrorToast(err?.message || "Failed to download PDF");
                  } finally {
                    setIsExporting(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
                title="Download This Customer Statement PDF"
              >
                <FaFilePdf size={12} />
                <span>PDF</span>
              </button>

              {onOpenDrawer && (
                <button
                  type="button"
                  onClick={onOpenDrawer}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--primary-color-light)] text-[var(--primary-color)] transition-colors cursor-pointer"
                  title="Open Full Statement Drawer"
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
            <CustomerStatementTable
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

export default InlineCustomerLedgerRow;

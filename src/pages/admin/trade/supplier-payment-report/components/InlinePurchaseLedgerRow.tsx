import React, { useMemo } from "react";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import type { ReportCompanyMeta } from "@/utils/trade-report-helpers";
import type { PaymentReceiptData } from "@/types/payment.types";
import {
  usePurchaseLedgerQuery,
  computePurchaseLedgerStats,
  mapPurchaseLedgerToBreakdownEntries,
  hasMeaningfulLedgerEntries,
} from "@/hooks/usePurchaseLedger";
import { buildSupplierStatementEntries } from "../utils/supplier-payment-report-helpers";
import SupplierStatementTable from "./SupplierStatementTable";

interface InlinePurchaseLedgerRowProps {
  supplier: any;
  startDate?: string;
  endDate?: string;
  purchasesList?: any[];
  payments?: any[];
  returnRecords?: any[];
  rawPartyData?: any;
  companyMeta?: ReportCompanyMeta;
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
  activeVisibleColumnCount,
}) => {
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

  return (
    <tr className="bg-[var(--ui-surface-muted)]/20 border-b border-[var(--ui-border)]">
      <td colSpan={activeVisibleColumnCount} className="p-1.5 sm:p-2 text-left">
        <div className="bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl p-2.5 sm:p-3 shadow-xs">
          {isLoading ? (
            <div className="p-3">
              <TableSkeleton rows={4} cols={8} />
            </div>
          ) : (
            <SupplierStatementTable
              entries={breakdownEntries}
              stats={stats}
            />
          )}
        </div>
      </td>
    </tr>
  );
};

export default InlinePurchaseLedgerRow;

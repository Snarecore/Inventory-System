import React, { useMemo } from "react";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import type { ReportCompanyMeta } from "@/utils/trade-report-helpers";
import type { CollectionReceiptData } from "@/pages/admin/trade/customer-collection/components/CollectionReceiptModal";
import {
  useCustomerLedgerQuery,
  computeCustomerLedgerStats,
  mapLedgerToBreakdownEntries,
} from "@/hooks/useCustomerLedger";
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
}

export const InlineCustomerLedgerRow: React.FC<InlineCustomerLedgerRowProps> = ({
  customer,
  startDate,
  endDate,
  salesList = [],
  collections = [],
  rawPartyData,
  activeVisibleColumnCount,
  onViewReceipt,
}) => {
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

  return (
    <tr className="bg-[var(--ui-surface-muted)]/20 border-b border-[var(--ui-border)]">
      <td colSpan={activeVisibleColumnCount} className="p-1.5 sm:p-2 text-left">
        <div className="bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg p-1.5 sm:p-2 shadow-xs">
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

import React, { useState, useMemo } from "react";
import {
  FiPhone,
  FiDownload,
  FiPrinter,
  FiSearch,
  FiChevronDown,
  FiRefreshCw,
} from "react-icons/fi";
import { FaStore } from "react-icons/fa";
import DrawerModal from "@/components/modal/DrawerModal";
import Button from "@/components/button/Button";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import { formatMoney } from "@/utils/formatters";
import { useReportCompanyMeta } from "@/utils/trade-report-helpers";
import type { CollectionReceiptData } from "@/pages/admin/trade/customer-collection/components/CollectionReceiptModal";
import {
  useCustomerLedgerQuery,
  computeCustomerLedgerStats,
  mapLedgerToBreakdownEntries,
} from "@/hooks/useCustomerLedger";
import {
  type CustomerCollectionSummary,
  exportCustomerStatementExcel,
  downloadCustomerStatementPdf,
} from "../utils/customer-collection-report-helpers";
import CustomerStatementTable from "./CustomerStatementTable";

interface CustomerStatementDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomer: CustomerCollectionSummary | null;
  allCustomers: CustomerCollectionSummary[];
  onSelectCustomer: (customer: CustomerCollectionSummary) => void;
  collections?: any[];
  salesList?: any[];
  rawPartyData?: any;
  onViewReceipt?: (receipt: CollectionReceiptData) => void;
}

export const CustomerStatementDrawer: React.FC<CustomerStatementDrawerProps> = ({
  isOpen,
  onClose,
  selectedCustomer,
  allCustomers,
  onSelectCustomer,
  collections = [],
  salesList = [],
  rawPartyData,
  onViewReceipt,
}) => {
  const companyMeta = useReportCompanyMeta();

  const [searchTerm, setSearchTerm] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Live Query to POST /customer-ledger with automatic customerId resolution
  const {
    data: ledgerEntries = [],
    isLoading: isLedgerLoading,
    isFetching: isLedgerFetching,
    refetch: refetchLedger,
  } = useCustomerLedgerQuery(
    {
      customerId: selectedCustomer?.customerId,
      customerPhone: selectedCustomer?.customerPhone,
      customerName: selectedCustomer?.customerName,
      salesList,
      rawPartyData,
    },
    {
      enabled: isOpen && Boolean(selectedCustomer),
    }
  );

  // Map to breakdown representation matching user screenshot
  const breakdownEntries = useMemo(() => {
    return mapLedgerToBreakdownEntries(ledgerEntries, salesList, collections);
  }, [ledgerEntries, salesList, collections]);

  // Compute summary stats from API ledger
  const stats = useMemo(() => {
    return computeCustomerLedgerStats(breakdownEntries);
  }, [breakdownEntries]);

  // Filter entries based on search term
  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) return breakdownEntries;
    const q = searchTerm.toLowerCase();
    return breakdownEntries.filter(
      (e) =>
        (e.type && e.type.toLowerCase().includes(q)) ||
        (e.collectionMethod && e.collectionMethod.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q))
    );
  }, [breakdownEntries, searchTerm]);

  const handleExportExcel = async () => {
    if (!selectedCustomer || filteredEntries.length === 0) return;
    try {
      setIsExporting(true);
      await exportCustomerStatementExcel(selectedCustomer, filteredEntries, companyMeta, {
        salesList,
        collections,
      });
    } catch (err) {
      console.error("Failed to export customer statement to Excel:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedCustomer || filteredEntries.length === 0) return;
    try {
      setIsExporting(true);
      await downloadCustomerStatementPdf(selectedCustomer, filteredEntries, companyMeta, {
        salesList,
        collections,
      });
    } catch (err) {
      console.error("Failed to download customer statement PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !selectedCustomer) return null;

  return (
    <DrawerModal
      isOpen={isOpen}
      onClose={onClose}
      title="Customer Ledger & Statement / গ্রাহক খতিয়ান"
      icon={<FaStore className="text-[var(--primary-color)]" />}
      maxWidth="max-w-4xl sm:max-w-5xl"
    >
      <div className="flex flex-col gap-3.5 p-1 sm:p-2 text-[var(--ui-text)]">
        {/* Customer Selector Dropdown Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl shadow-xs">
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1">
              Select Customer
            </label>
            <div className="relative">
              <select
                value={selectedCustomer.customerKey}
                onChange={(e) => {
                  const target = allCustomers.find(
                    (c) => c.customerKey === e.target.value
                  );
                  if (target) onSelectCustomer(target);
                }}
                className="w-full h-10 pl-9 pr-8 text-sm font-semibold bg-[var(--ui-surface-muted)]/70 border border-[var(--ui-border)] rounded-lg text-[var(--ui-text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] appearance-none cursor-pointer"
              >
                {allCustomers.map((cust) => (
                  <option key={cust.customerKey} value={cust.customerKey}>
                    {cust.customerName} {cust.customerPhone !== "-" ? `(${cust.customerPhone})` : ""} - Due: ৳{formatMoney(cust.currentDue)}
                  </option>
                ))}
              </select>
              <FaStore
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--primary-color)] pointer-events-none"
                size={14}
              />
              <FiChevronDown
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)] pointer-events-none"
                size={16}
              />
            </div>
          </div>

          {/* Quick Customer Badges */}
          <div className="flex items-center flex-wrap gap-2 pt-1 sm:pt-4">
            {selectedCustomer.customerPhone && selectedCustomer.customerPhone !== "-" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-[var(--ui-surface-muted)] text-[var(--ui-text)] border border-[var(--ui-border)]">
                <FiPhone size={12} className="text-[var(--primary-color)]" />
                <span>{selectedCustomer.customerPhone}</span>
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border ${
                stats.finalBalance > 0
                  ? "bg-[var(--ui-danger-light)] text-[var(--ui-danger)] border-[var(--ui-danger-border)]"
                  : "bg-[var(--ui-success-light)] text-[var(--ui-success)] border-[var(--ui-success-border)]"
              }`}
            >
              <span>Current Due: ৳ {formatMoney(stats.finalBalance)}</span>
            </span>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-lg bg-[var(--ui-surface-muted)]/60 border border-[var(--ui-border)] flex flex-col">
            <span className="text-[11px] font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">
              Opening Balance
            </span>
            <span className="text-sm sm:text-base font-bold text-[var(--ui-text)] mt-0.5">
              ৳ {formatMoney(stats.openingBalance)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--ui-surface-muted)]/60 border border-[var(--ui-border)] flex flex-col">
            <span className="text-[11px] font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">
              Total Sales (BDT)
            </span>
            <span className="text-sm sm:text-base font-bold text-amber-700 dark:text-amber-400 mt-0.5">
              ৳ {formatMoney(stats.totalSales)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--ui-success-light)]/50 border border-[var(--ui-success-border)] flex flex-col">
            <span className="text-[11px] font-semibold text-[var(--ui-success)] uppercase tracking-wider">
              Total Collection (BDT)
            </span>
            <span className="text-sm sm:text-base font-bold text-[var(--ui-success)] mt-0.5">
              ৳ {formatMoney(stats.totalCollected)}
            </span>
          </div>

          <div
            className={`p-2.5 rounded-lg border flex flex-col ${
              stats.finalBalance > 0
                ? "bg-[var(--ui-danger-light)]/50 border-[var(--ui-danger-border)]"
                : "bg-[var(--ui-success-light)]/50 border-[var(--ui-success-border)]"
            }`}
          >
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                stats.finalBalance > 0
                  ? "text-[var(--ui-danger)]"
                  : "text-[var(--ui-success)]"
              }`}
            >
              Closing Balance
            </span>
            <span
              className={`text-sm sm:text-base font-extrabold mt-0.5 ${
                stats.finalBalance > 0
                  ? "text-[var(--ui-danger)]"
                  : "text-[var(--ui-success)]"
              }`}
            >
              ৳ {formatMoney(stats.finalBalance)}
            </span>
          </div>
        </div>

        {/* Toolbar: Search, Refresh & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-[var(--ui-border)]">
          <div className="relative flex-1 max-w-sm">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)] pointer-events-none"
              size={13}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search type, method, description..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg text-[var(--ui-text)] placeholder:text-[var(--ui-text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => refetchLedger()}
              disabled={isLedgerLoading || isLedgerFetching}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-surface-muted)] text-[var(--ui-text)] transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Customer Ledger"
            >
              <FiRefreshCw
                size={12}
                className={isLedgerFetching ? "animate-spin text-[var(--primary-color)]" : ""}
              />
              <span>Refresh</span>
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 text-xs h-8"
              title="Print Statement"
            >
              <FiPrinter size={12} />
              <span>Print</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={isExporting || filteredEntries.length === 0}
              className="inline-flex items-center gap-1 text-xs h-8 text-[var(--ui-success)] border-[var(--ui-success-border)] hover:bg-[var(--ui-success-light)]"
              title="Export to Excel"
            >
              <FiDownload size={12} />
              <span>Excel</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isExporting || filteredEntries.length === 0}
              className="inline-flex items-center gap-1 text-xs h-8"
              title="Download Statement PDF"
            >
              <FiDownload size={12} />
              <span>PDF</span>
            </Button>
          </div>
        </div>

        {/* Statement Timeline Table */}
        {isLedgerLoading ? (
          <div className="p-4">
            <TableSkeleton rows={6} cols={8} />
          </div>
        ) : (
          <CustomerStatementTable
            entries={filteredEntries}
            stats={stats}
            onViewReceipt={onViewReceipt}
          />
        )}
      </div>
    </DrawerModal>
  );
};

export default CustomerStatementDrawer;

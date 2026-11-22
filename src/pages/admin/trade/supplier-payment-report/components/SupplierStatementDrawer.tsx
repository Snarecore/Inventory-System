import React, { useState, useMemo } from "react";
import {
  FiPhone,
  FiDownload,
  FiPrinter,
  FiSearch,
  FiChevronDown,
  FiRefreshCw,
} from "react-icons/fi";
import { FaStore, FaFileExcel, FaFilePdf } from "react-icons/fa";
import DrawerModal from "@/components/modal/DrawerModal";
import Button from "@/components/button/Button";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import { formatMoney } from "@/utils/formatters";
import { useReportCompanyMeta } from "@/utils/trade-report-helpers";
import type { PaymentReceiptData } from "@/types/payment.types";
import {
  usePurchaseLedgerQuery,
  computePurchaseLedgerStats,
  mapPurchaseLedgerToBreakdownEntries,
  hasMeaningfulLedgerEntries,
} from "@/hooks/usePurchaseLedger";
import {
  type SupplierPaymentSummary,
  type NormalizedPaymentRecord,
  buildSupplierStatementEntries,
  exportSupplierStatementExcel,
  downloadSupplierStatementPdf,
} from "../utils/supplier-payment-report-helpers";
import SupplierStatementTable from "./SupplierStatementTable";

interface SupplierStatementDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSupplier: SupplierPaymentSummary | any | null;
  allSuppliers?: (SupplierPaymentSummary | any)[];
  onSelectSupplier?: (supplier: SupplierPaymentSummary | any) => void;
  payments?: NormalizedPaymentRecord[];
  purchasesList?: any[];
  returnRecords?: any[];
  rawPartyData?: any;
  onViewReceipt?: (receipt: PaymentReceiptData) => void;
}

export const SupplierStatementDrawer: React.FC<
  SupplierStatementDrawerProps
> = ({
  isOpen,
  onClose,
  selectedSupplier,
  allSuppliers = [],
  onSelectSupplier,
  payments = [],
  purchasesList = [],
  returnRecords = [],
  rawPartyData,
  onViewReceipt,
}) => {
  const companyMeta = useReportCompanyMeta();
  const [searchTerm, setSearchTerm] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Live Query to POST /purchase-ledger with automatic supplierId resolution
  const {
    data: ledgerEntries = [],
    isLoading: isLedgerLoading,
    isFetching: isLedgerFetching,
    refetch: refetchLedger,
  } = usePurchaseLedgerQuery(
    {
      supplierId: selectedSupplier?.supplierId,
      supplierPhone: selectedSupplier?.supplierPhone,
      supplierName: selectedSupplier?.supplierName,
      purchasesList,
      rawPartyData,
    },
    {
      enabled: isOpen && Boolean(selectedSupplier),
    }
  );

  // Map to breakdown representation
  const breakdownEntries = useMemo(() => {
    if (hasMeaningfulLedgerEntries(ledgerEntries)) {
      return mapPurchaseLedgerToBreakdownEntries(
        ledgerEntries,
        purchasesList,
        payments,
        returnRecords
      );
    }
    if (!selectedSupplier) return [];
    // Fallback: client-side statement generator
    const fallbackStmt = buildSupplierStatementEntries(
      selectedSupplier,
      payments,
      purchasesList,
      returnRecords,
      rawPartyData
    );
    return mapPurchaseLedgerToBreakdownEntries(
      fallbackStmt.entries,
      purchasesList,
      payments,
      returnRecords
    );
  }, [
    ledgerEntries,
    selectedSupplier,
    payments,
    purchasesList,
    returnRecords,
    rawPartyData,
  ]);

  // Compute summary stats from API ledger
  const stats = useMemo(() => {
    return computePurchaseLedgerStats(breakdownEntries);
  }, [breakdownEntries]);

  // Filter entries based on search term
  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) return breakdownEntries;
    const q = searchTerm.toLowerCase();
    return breakdownEntries.filter(
      (e) =>
        (e.type && e.type.toLowerCase().includes(q)) ||
        (e.paymentMethod && e.paymentMethod.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q))
    );
  }, [breakdownEntries, searchTerm]);

  const handleExportExcel = async () => {
    if (!selectedSupplier || filteredEntries.length === 0) return;
    try {
      setIsExporting(true);
      await exportSupplierStatementExcel(
        selectedSupplier,
        filteredEntries,
        companyMeta,
        { purchasesList, payments }
      );
    } catch (err) {
      console.error("Failed to export supplier statement to Excel:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedSupplier || filteredEntries.length === 0) return;
    try {
      setIsExporting(true);
      await downloadSupplierStatementPdf(
        selectedSupplier,
        filteredEntries,
        companyMeta,
        { purchasesList, payments }
      );
    } catch (err) {
      console.error("Failed to download supplier statement PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !selectedSupplier) return null;

  return (
    <DrawerModal
      isOpen={isOpen}
      onClose={onClose}
      title="Supplier Ledger & Statement / সরবরাহকারী খতিয়ান"
      icon={<FaStore className="text-[var(--primary-color)]" />}
      maxWidth="max-w-4xl sm:max-w-5xl"
    >
      <div className="flex flex-col gap-3.5 p-1 sm:p-2 text-[var(--ui-text)]">
        {/* Supplier Selector Dropdown Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl shadow-xs">
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider mb-1">
              Select Supplier
            </label>
            <div className="relative">
              {allSuppliers && allSuppliers.length > 0 && onSelectSupplier ? (
                <select
                  value={selectedSupplier.supplierKey || selectedSupplier.supplierId}
                  onChange={(e) => {
                    const target = allSuppliers.find(
                      (s) => (s.supplierKey || s.supplierId) === e.target.value
                    );
                    if (target) onSelectSupplier(target);
                  }}
                  className="w-full h-10 pl-9 pr-8 text-sm font-semibold bg-[var(--ui-surface-muted)]/70 border border-[var(--ui-border)] rounded-lg text-[var(--ui-text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] appearance-none cursor-pointer"
                >
                  {allSuppliers.map((supp) => (
                    <option key={supp.supplierKey || supp.supplierId} value={supp.supplierKey || supp.supplierId}>
                      {supp.supplierName} {supp.supplierPhone && supp.supplierPhone !== "-" ? `(${supp.supplierPhone})` : ""} - Due: ৳{formatMoney(supp.currentDue ?? supp.totalDue ?? 0)}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="h-10 pl-9 pr-3 flex items-center text-sm font-semibold bg-[var(--ui-surface-muted)]/70 border border-[var(--ui-border)] rounded-lg text-[var(--ui-text)]">
                  {selectedSupplier.supplierName}
                </div>
              )}
              <FaStore
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--primary-color)] pointer-events-none"
                size={14}
              />
              {allSuppliers && allSuppliers.length > 0 && (
                <FiChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)] pointer-events-none"
                  size={16}
                />
              )}
            </div>
          </div>

          {/* Quick Supplier Badges */}
          <div className="flex items-center flex-wrap gap-2 pt-1 sm:pt-4">
            {selectedSupplier.supplierPhone && selectedSupplier.supplierPhone !== "-" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-[var(--ui-surface-muted)] text-[var(--ui-text)] border border-[var(--ui-border)]">
                <FiPhone size={12} className="text-[var(--primary-color)]" />
                <span>{selectedSupplier.supplierPhone}</span>
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
              Total Purchases (BDT)
            </span>
            <span className="text-sm sm:text-base font-bold text-amber-700 dark:text-amber-400 mt-0.5">
              ৳ {formatMoney(stats.totalPurchases)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--ui-success-light)]/50 border border-[var(--ui-success-border)] flex flex-col">
            <span className="text-[11px] font-semibold text-[var(--ui-success)] uppercase tracking-wider">
              Total Paid (BDT)
            </span>
            <span className="text-sm sm:text-base font-bold text-[var(--ui-success)] mt-0.5">
              ৳ {formatMoney(stats.totalPaid)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--ui-danger-light)]/50 border border-[var(--ui-danger-border)] flex flex-col">
            <span className="text-[11px] font-semibold text-[var(--ui-danger)] uppercase tracking-wider">
              Net Payable / Due
            </span>
            <span className="text-sm sm:text-base font-bold text-[var(--ui-danger)] mt-0.5">
              ৳ {formatMoney(stats.finalBalance)}
            </span>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <FiSearch
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)]"
            />
            <input
              type="text"
              placeholder="Search description, voucher, invoice, payment method..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8.5 pl-8.5 pr-3 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg text-[var(--ui-text)] placeholder-[var(--ui-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] shadow-2xs font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchLedger()}
              disabled={isLedgerFetching}
              className="h-8 text-xs font-semibold"
              title="Refresh Purchase Ledger"
            >
              <FiRefreshCw
                size={12}
                className={isLedgerFetching ? "animate-spin" : ""}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={isExporting || isLedgerLoading || filteredEntries.length === 0}
              className="h-8 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
            >
              <FaFileExcel size={12} />
              <span>Excel</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isExporting || isLedgerLoading || filteredEntries.length === 0}
              className="h-8 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-300 dark:border-rose-800"
            >
              <FaFilePdf size={12} />
              <span>PDF</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={filteredEntries.length === 0}
              className="h-8 text-xs font-semibold"
            >
              <FiPrinter size={12} />
              <span className="hidden sm:inline">Print</span>
            </Button>
          </div>
        </div>

        {/* Ledger Entries Table */}
        {isLedgerLoading ? (
          <div className="p-3">
            <TableSkeleton rows={5} cols={8} />
          </div>
        ) : (
          <SupplierStatementTable
            entries={filteredEntries}
            stats={stats}
            onViewReceipt={onViewReceipt}
          />
        )}
      </div>
    </DrawerModal>
  );
};

export default SupplierStatementDrawer;

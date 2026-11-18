import React, { useState, useMemo } from "react";
import {
  FiUser,
  FiPhone,
  FiDownload,
  FiPrinter,
  FiSearch,
} from "react-icons/fi";
import {
  FaTruckLoading,
  FaFileInvoiceDollar,
  FaHandHoldingUsd,
  FaUndoAlt,
  FaBalanceScale,
} from "react-icons/fa";
import DrawerModal from "@/components/modal/DrawerModal";
import Button from "@/components/button/Button";
import { formatMoney } from "@/utils/formatters";
import { useReportCompanyMeta } from "@/utils/trade-report-helpers";
import type { PaymentReceiptData } from "@/types/payment.types";
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
  selectedSupplier: SupplierPaymentSummary | null;
  payments: NormalizedPaymentRecord[];
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
  payments,
  purchasesList = [],
  returnRecords = [],
  rawPartyData,
  onViewReceipt,
}) => {
  const companyMeta = useReportCompanyMeta();
  const [searchTerm, setSearchTerm] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const statementResult = useMemo(() => {
    if (!selectedSupplier) return null;

    return buildSupplierStatementEntries(
      selectedSupplier,
      payments,
      purchasesList,
      returnRecords,
      rawPartyData
    );
  }, [
    selectedSupplier,
    payments,
    purchasesList,
    returnRecords,
    rawPartyData,
  ]);

  const filteredEntries = useMemo(() => {
    if (!statementResult?.entries) return [];
    if (!searchTerm.trim()) return statementResult.entries;

    const q = searchTerm.toLowerCase();
    return statementResult.entries.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.refNo.toLowerCase().includes(q) ||
        e.typeLabel.toLowerCase().includes(q) ||
        (e.paymentMode && e.paymentMode.toLowerCase().includes(q))
    );
  }, [statementResult, searchTerm]);

  const handleExportExcel = async () => {
    if (!statementResult || filteredEntries.length === 0) return;
    try {
      setIsExporting(true);
      await exportSupplierStatementExcel(
        { ...statementResult, entries: filteredEntries },
        companyMeta
      );
    } catch (err) {
      console.error("Failed to export supplier statement to Excel:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!statementResult || filteredEntries.length === 0) return;
    try {
      setIsExporting(true);
      await downloadSupplierStatementPdf(
        { ...statementResult, entries: filteredEntries },
        companyMeta
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

  if (!isOpen || !selectedSupplier || !statementResult) return null;

  return (
    <DrawerModal
      isOpen={isOpen}
      onClose={onClose}
      title="Supplier Statement & Ledger"
      icon={<FaTruckLoading className="text-[var(--primary-color)]" />}
      maxWidth="max-w-4xl sm:max-w-5xl"
    >
      <div className="flex flex-col gap-3.5 p-1 sm:p-2 text-[var(--ui-text)]">
        {/* Supplier Profile Info Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl shadow-xs">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-[var(--ui-text)] truncate">
                {selectedSupplier.supplierName}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--ui-text-muted)] mt-1">
              <span className="inline-flex items-center gap-1">
                <FiPhone size={12} className="text-[var(--color-primary)]" />
                {selectedSupplier.supplierPhone || "No Phone"}
              </span>
              <span className="inline-flex items-center gap-1">
                <FiUser size={12} className="text-[var(--color-primary)]" />
                ID: {selectedSupplier.supplierId || "N/A"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Button
              onClick={handleExportExcel}
              disabled={isExporting || filteredEntries.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--ui-surface)] border border-[var(--ui-border)] text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] cursor-pointer"
            >
              <FiDownload size={13} className="text-emerald-600" />
              <span>Excel</span>
            </Button>

            <Button
              onClick={handleDownloadPdf}
              disabled={isExporting || filteredEntries.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--ui-surface)] border border-[var(--ui-border)] text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] cursor-pointer"
            >
              <FiDownload size={13} className="text-rose-600" />
              <span>PDF</span>
            </Button>

            <Button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--primary-color)] text-white hover:opacity-90 cursor-pointer"
            >
              <FiPrinter size={13} />
              <span>Print</span>
            </Button>
          </div>
        </div>

        {/* 4 Mini Stat Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)]">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--ui-text-muted)]">
              <FaFileInvoiceDollar size={12} className="text-[var(--color-primary)]" />
              <span>Total Purchases</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-[var(--ui-text)] mt-1">
              ৳ {formatMoney(statementResult.totalPurchases)}
            </div>
          </div>

          <div className="p-2.5 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)]">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--ui-text-muted)]">
              <FaHandHoldingUsd size={12} className="text-emerald-600" />
              <span>Total Paid</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              ৳ {formatMoney(statementResult.totalPayments)}
            </div>
          </div>

          <div className="p-2.5 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)]">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--ui-text-muted)]">
              <FaUndoAlt size={12} className="text-amber-600" />
              <span>Total Returns</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-amber-600 dark:text-amber-400 mt-1">
              ৳ {formatMoney(statementResult.totalReturns)}
            </div>
          </div>

          <div className="p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-900/10">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-700 dark:text-rose-400">
              <FaBalanceScale size={12} />
              <span>Closing Net Due</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400 mt-1">
              ৳ {formatMoney(statementResult.closingBalance)}
            </div>
          </div>
        </div>

        {/* Search within ledger */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ledger entries by voucher, bill, or description..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            <FiSearch
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)]"
            />
          </div>
        </div>

        {/* Ledger Table */}
        <SupplierStatementTable
          entries={filteredEntries}
          stats={{
            openingBalance: statementResult.openingBalance,
            totalPurchases: statementResult.totalPurchases,
            totalPayments: statementResult.totalPayments,
            totalReturns: statementResult.totalReturns,
            totalDiscounts: statementResult.totalDiscounts,
            closingBalance: statementResult.closingBalance,
          }}
          onViewReceipt={onViewReceipt}
        />
      </div>
    </DrawerModal>
  );
};

export default SupplierStatementDrawer;

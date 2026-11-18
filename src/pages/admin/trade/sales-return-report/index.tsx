import React, { useMemo, useState } from "react";
import { FaUndoAlt, FaBoxes, FaUserFriends } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import TradeReturnStats from "@/components/trade/TradeReturnStats";
import SalesReturnInvoiceModal from "@/pages/admin/trade/sales-return/components/SalesReturnInvoiceModal";
import { useSalesAndReturnsQuery } from "@/pages/admin/trade/sales/hooks/useSalesQueries";
import { useReportDateRange } from "@/utils/trade-report-helpers";
import type { SalesReturnItem } from "@/types";
import SalesReturnVouchersTable from "./components/SalesReturnVouchersTable";
import ProductReturnReportTable from "./components/ProductReturnReportTable";
import CustomerReturnReportTable from "./components/CustomerReturnReportTable";
import {
  type SalesReturnReportTab,
  extractNormalizedSalesReturns,
  computeSalesReturnKpis,
} from "./utils/sales-return-report-helpers";

const SalesReturnReportPage: React.FC = () => {
  const { startDate, endDate, datePickerProps } = useReportDateRange("all");
  const [activeTab, setActiveTab] = useState<SalesReturnReportTab>("returns");

  // Single return voucher preview modal state (reuses existing SalesReturnInvoiceModal)
  const [selectedReturn, setSelectedReturn] = useState<SalesReturnItem | null>(
    null
  );
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isAutoPrint, setIsAutoPrint] = useState(false);

  const {
    data: unifiedRecords = [],
    isLoading: isQueryLoading,
    isFetching,
    refetch,
  } = useSalesAndReturnsQuery();

  const returnRecords = useMemo(
    () => extractNormalizedSalesReturns(unifiedRecords, startDate, endDate),
    [unifiedRecords, startDate, endDate]
  );

  const isLoading = isQueryLoading || isFetching;
  const kpis = useMemo(
    () => computeSalesReturnKpis(returnRecords),
    [returnRecords]
  );

  const handleView = (item: SalesReturnItem) => {
    setSelectedReturn(item);
    setIsAutoPrint(false);
    setIsVoucherModalOpen(true);
  };

  const handlePrint = (item: SalesReturnItem) => {
    setSelectedReturn(item);
    setIsAutoPrint(true);
    setIsVoucherModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <PageHeader
          headerTitle="Sales Return Report"
          headerDescription="Returned sales vouchers, cash refunds, due adjustments, and product return analytics"
        />

        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 self-start md:self-auto shrink-0">
          <RefreshButton onClick={() => refetch()} isLoading={isLoading} />
        </div>
      </div>

      <TradeReturnStats
        totalCount={kpis.totalCount}
        totalRefundAmount={kpis.totalRefundAmount}
        totalCashRefund={kpis.totalCashRefund}
        totalCreditAdjust={kpis.totalCreditAdjust}
      />

      <div className="flex items-center gap-1.5 border-b border-[var(--ui-border)]/90 -my-0.5">
        <button
          type="button"
          onClick={() => setActiveTab("returns")}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "returns"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]/50 rounded-t-md"
              : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] rounded-t-md"
          }`}
        >
          <FaUndoAlt size={11} />
          <span>Return Vouchers ({returnRecords.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("products")}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "products"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]/50 rounded-t-md"
              : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] rounded-t-md"
          }`}
        >
          <FaBoxes size={11} />
          <span>Product-Wise Returns</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("customers")}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "customers"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]/50 rounded-t-md"
              : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] rounded-t-md"
          }`}
        >
          <FaUserFriends size={11} />
          <span>Customer-Wise Returns</span>
        </button>
      </div>

      <div className="w-full">
        {activeTab === "returns" && (
          <SalesReturnVouchersTable
            records={returnRecords}
            isLoading={isLoading}
            {...datePickerProps}
            onView={handleView}
            onPrint={handlePrint}
          />
        )}

        {activeTab === "products" && (
          <ProductReturnReportTable
            records={returnRecords}
            isLoading={isLoading}
            {...datePickerProps}
          />
        )}

        {activeTab === "customers" && (
          <CustomerReturnReportTable
            records={returnRecords}
            isLoading={isLoading}
            onView={handleView}
            onPrint={handlePrint}
            {...datePickerProps}
          />
        )}
      </div>

      <SalesReturnInvoiceModal
        isOpen={isVoucherModalOpen}
        onClose={() => {
          setIsVoucherModalOpen(false);
          setSelectedReturn(null);
          setIsAutoPrint(false);
        }}
        returnData={selectedReturn}
        autoPrint={isAutoPrint}
      />
    </div>
  );
};

export default SalesReturnReportPage;

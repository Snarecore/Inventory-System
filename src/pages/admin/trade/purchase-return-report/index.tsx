import React, { useMemo, useState } from "react";
import { FaUndoAlt, FaBoxes, FaTruckLoading } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import TradeReturnStats from "@/components/trade/TradeReturnStats";
import PurchaseReturnInvoiceModal from "@/pages/admin/trade/purchase-return/components/PurchaseReturnInvoiceModal";
import { usePurchaseAndReturnsQuery } from "@/pages/admin/trade/purchases/hooks/usePurchaseQueries";
import { useReportDateRange } from "@/utils/trade-report-helpers";
import type { PurchaseReturnItem } from "@/types";
import PurchaseReturnVouchersTable from "./components/PurchaseReturnVouchersTable";
import ProductPurchaseReturnReportTable from "./components/ProductPurchaseReturnReportTable";
import SupplierReturnReportTable from "./components/SupplierReturnReportTable";
import {
  type PurchaseReturnReportTab,
  extractNormalizedPurchaseReturns,
  computePurchaseReturnKpis,
} from "./utils/purchase-return-report-helpers";

const PurchaseReturnReportPage: React.FC = () => {
  const { startDate, endDate, datePickerProps } = useReportDateRange("all");
  const [activeTab, setActiveTab] = useState<PurchaseReturnReportTab>("returns");

  // Single return voucher preview modal state (reuses existing PurchaseReturnInvoiceModal)
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturnItem | null>(
    null
  );
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isAutoPrint, setIsAutoPrint] = useState(false);

  const {
    data: unifiedRecords = [],
    isLoading: isQueryLoading,
    isFetching,
    refetch,
  } = usePurchaseAndReturnsQuery();

  const returnRecords = useMemo(
    () => extractNormalizedPurchaseReturns(unifiedRecords, startDate, endDate),
    [unifiedRecords, startDate, endDate]
  );

  const isLoading = isQueryLoading || isFetching;
  const kpis = useMemo(
    () => computePurchaseReturnKpis(returnRecords),
    [returnRecords]
  );

  const handleView = (item: PurchaseReturnItem) => {
    setSelectedReturn(item);
    setIsAutoPrint(false);
    setIsVoucherModalOpen(true);
  };

  const handlePrint = (item: PurchaseReturnItem) => {
    setSelectedReturn(item);
    setIsAutoPrint(true);
    setIsVoucherModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <PageHeader
          headerTitle="Purchase Return Report"
          headerDescription="Returned purchase vouchers, cash refunds, payable adjustments, and product return analytics"
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
          onClick={() => setActiveTab("suppliers")}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "suppliers"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]/50 rounded-t-md"
              : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] rounded-t-md"
          }`}
        >
          <FaTruckLoading size={11} />
          <span>Supplier-Wise Returns</span>
        </button>
      </div>

      <div className="w-full">
        {activeTab === "returns" && (
          <PurchaseReturnVouchersTable
            records={returnRecords}
            isLoading={isLoading}
            {...datePickerProps}
            onView={handleView}
            onPrint={handlePrint}
          />
        )}

        {activeTab === "products" && (
          <ProductPurchaseReturnReportTable
            records={returnRecords}
            isLoading={isLoading}
            {...datePickerProps}
          />
        )}

        {activeTab === "suppliers" && (
          <SupplierReturnReportTable
            records={returnRecords}
            isLoading={isLoading}
            {...datePickerProps}
            onView={handleView}
            onPrint={handlePrint}
          />
        )}
      </div>

      <PurchaseReturnInvoiceModal
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

export default PurchaseReturnReportPage;

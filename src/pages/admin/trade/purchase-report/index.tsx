import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FaShoppingBag, FaBoxes, FaTruck } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import DateRangePicker from "@/components/date-range-picker/DateRangePicker";
import TradeInvoiceStats from "@/components/trade/TradeInvoiceStats";
import PurchaseInvoiceModal from "@/pages/admin/trade/purchases/components/PurchaseInvoiceModal";
import PurchaseReportTable from "./components/PurchaseReportTable";
import ProductPurchaseReportTable from "./components/ProductPurchaseReportTable";
import SupplierPurchaseReportTable from "./components/SupplierPurchaseReportTable";
import { purchaseListQueryKey } from "@/config/query-key";
import {
  fetchPurchasesList,
  fetchPurchaseAndReturnList,
  normalizePurchaseRecord,
  isPurchaseReturnRecord,
} from "@/pages/admin/trade/purchases/hooks/usePurchaseQueries";
import {
  useReportDateRange,
  computeTradeKpiTotals,
  filterAndNormalizeReportTransactions,
} from "@/utils/trade-report-helpers";
import type { PurchaseReportTab } from "./utils/purchase-report-helpers";
import type { PurchaseItem } from "@/types";

const PurchaseReportPage: React.FC = () => {
  const { dateRange, setDateRange, startDate, endDate, handleDateChange } =
    useReportDateRange();

  const [activeTab, setActiveTab] = useState<PurchaseReportTab>("invoices");

  // Single purchase invoice modal state
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseItem | null>(
    null
  );
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [isAutoPrint, setIsAutoPrint] = useState<boolean>(false);

  // Fetch Purchase Report transactions using authoritative purchase queries
  const {
    data: liveReportData,
    isLoading: isLiveLoading,
    isFetching,
    refetch,
  } = useQuery<PurchaseItem[]>({
    queryKey: [purchaseListQueryKey, "report", startDate, endDate],
    queryFn: async () => {
      let purchases = await fetchPurchasesList();

      // Fallback to combined purchase/return endpoint if purchase list is empty
      if (purchases.length === 0) {
        const combined = await fetchPurchaseAndReturnList();
        purchases = (Array.isArray(combined) ? combined : [])
          .filter(
            (item: any) =>
              !item?.isReturnRecord &&
              !isPurchaseReturnRecord(item) &&
              (Boolean(item?.invoiceNo) ||
                Boolean(item?.purchaseInvoiceNo) ||
                (item?.orderNo && !item?.returnNo))
          )
          .map(normalizePurchaseRecord);
      }

      return filterAndNormalizeReportTransactions(purchases, {
        startDate,
        endDate,
        domain: "purchase",
        orderPrefix: "PO",
      });
    },
    staleTime: 0,
  });

  const transactions: PurchaseItem[] = Array.isArray(liveReportData)
    ? liveReportData
    : [];
  const isLoading = isLiveLoading || isFetching;

  const { totalAmount, totalPaid, totalDue } = computeTradeKpiTotals(
    transactions,
    "purchase"
  );

  const handleView = (item: PurchaseItem) => {
    setSelectedPurchase(item);
    setIsAutoPrint(false);
    setIsInvoiceModalOpen(true);
  };

  const handlePrint = (item: PurchaseItem) => {
    setSelectedPurchase(item);
    setIsAutoPrint(true);
    setIsInvoiceModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 max-w-[1600px] mx-auto w-full">
      {/* ── Top Header & Global Actions ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <PageHeader
          headerTitle="Purchase Report"
          headerDescription="Purchase transactions, supplier payments, and procurement summary"
        />

        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 self-start md:self-auto shrink-0">
          <div className="w-36 sm:w-40 shrink-0">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              selectedPreset={dateRange}
              onPresetChange={(r) => setDateRange(r)}
              onChange={handleDateChange}
              align="right"
              size="sm"
            />
          </div>

          <RefreshButton onClick={() => refetch()} isLoading={isLoading} />
        </div>
      </div>

      {/* ── KPI Cards (Authentic Cash-Boi TradeInvoiceStats) ── */}
      <TradeInvoiceStats
        type="purchase"
        totalCount={transactions.length}
        totalAmount={totalAmount}
        totalPaid={totalPaid}
        totalDue={totalDue}
      />

      {/* ── Unified Tab Switcher ── */}
      <div className="flex items-center gap-1.5 border-b border-[var(--ui-border)]/90 -my-0.5">
        <button
          type="button"
          onClick={() => setActiveTab("invoices")}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "invoices"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]/50 rounded-t-md"
              : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] rounded-t-md"
          }`}
        >
          <FaShoppingBag size={11} />
          <span>Purchase Invoices ({transactions.length})</span>
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
          <span>Product-Wise Purchases</span>
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
          <FaTruck size={11} />
          <span>Supplier-Wise Purchases</span>
        </button>
      </div>

      {/* ── Active Report View ── */}
      <div className="w-full">
        {activeTab === "invoices" && (
          <PurchaseReportTable
            transactions={transactions}
            isLoading={isLoading}
            startDate={startDate}
            endDate={endDate}
            onView={handleView}
            onPrint={handlePrint}
          />
        )}

        {activeTab === "products" && (
          <ProductPurchaseReportTable
            transactions={transactions}
            isLoading={isLoading}
            startDate={startDate}
            endDate={endDate}
          />
        )}

        {activeTab === "suppliers" && (
          <SupplierPurchaseReportTable
            transactions={transactions}
            isLoading={isLoading}
            startDate={startDate}
            endDate={endDate}
          />
        )}
      </div>

      {/* ── Single Purchase Invoice Preview / Print Modal ── */}
      <PurchaseInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedPurchase(null);
          setIsAutoPrint(false);
        }}
        purchase={selectedPurchase}
        autoPrint={isAutoPrint}
      />
    </div>
  );
};

export default PurchaseReportPage;

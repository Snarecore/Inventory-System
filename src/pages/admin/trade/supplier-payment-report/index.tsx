import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FaHandHoldingUsd,
  FaMoneyBillWave,
  FaUniversity,
  FaPercent,
  FaExclamationCircle,
  FaReceipt,
  FaTruckLoading,
} from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import StatsCards, { type StatCardItem } from "@/components/common/StatsCards";
import { formatMoney } from "@/utils/formatters";
import { usePaymentReportQuery } from "@/hooks/usePaymentReport";
import { usePurchasesDueQuery } from "@/hooks/usePurchasesDue";
import {
  usePurchasesQuery,
  usePurchaseAndReturnsQuery,
} from "@/pages/admin/trade/purchases/hooks/usePurchaseQueries";
import PaymentReceiptModal from "@/pages/admin/trade/supplier-payment/components/PaymentReceiptModal";
import { partyListQueryKey } from "@/config/query-key";
import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import { useReportDateRange } from "@/utils/trade-report-helpers";
import type { PaymentReceiptData } from "@/types/payment.types";
import PaymentHistoryReportTable from "./components/PaymentHistoryReportTable";
import SupplierPaymentSummaryTable from "./components/SupplierPaymentSummaryTable";
import SupplierDueReportTable from "./components/SupplierDueReportTable";
import {
  type PaymentReportTab,
  normalizePaymentReportRecords,
  normalizeSupplierDueRows,
  computeSupplierPaymentReportKpis,
} from "./utils/supplier-payment-report-helpers";
import { extractNormalizedPurchaseReturns } from "../purchase-return-report/utils/purchase-return-report-helpers";

const SupplierPaymentReportPage: React.FC = () => {
  const { startDate, endDate, datePickerProps } = useReportDateRange();
  const [activeTab, setActiveTab] = useState<PaymentReportTab>("vouchers");

  const [receiptData, setReceiptData] = useState<PaymentReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // 1. Live Payment Report Query
  const {
    data: rawPayments = [],
    isLoading: isPaymentLoading,
    isFetching: isPaymentFetching,
    refetch: refetchPayments,
  } = usePaymentReportQuery({
    startDate,
    endDate,
  });

  // 2. Live Supplier Dues Query
  const {
    data: rawSuppliersDue = [],
    isLoading: isDueLoading,
    isFetching: isDueFetching,
    refetch: refetchDue,
  } = usePurchasesDueQuery();

  // 3. Party Master List Query for Addresses
  const { data: rawPartyData } = useQuery({
    queryKey: [partyListQueryKey],
    queryFn: async () =>
      postData({
        url: apiConfig.party.partyListUrl,
        body: { accessUser: buildAccessUser() },
      }),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  // 4. Purchases and Returns Queries for Ledger & Invoices
  const { data: purchasesList = [], refetch: refetchPurchases } = usePurchasesQuery({
    staleTime: 0,
  });

  const { data: unifiedPurchaseRecords = [], refetch: refetchUnified } =
    usePurchaseAndReturnsQuery();

  const returnRecords = useMemo(
    () => extractNormalizedPurchaseReturns(unifiedPurchaseRecords),
    [unifiedPurchaseRecords]
  );

  const payments = useMemo(
    () => normalizePaymentReportRecords(rawPayments, startDate, endDate),
    [rawPayments, startDate, endDate]
  );

  const dueRows = useMemo(
    () => normalizeSupplierDueRows(rawSuppliersDue, rawPartyData, purchasesList),
    [rawSuppliersDue, rawPartyData, purchasesList]
  );

  const kpis = useMemo(
    () => computeSupplierPaymentReportKpis(payments, dueRows),
    [payments, dueRows]
  );

  const isLoading =
    isPaymentLoading || isPaymentFetching || isDueLoading || isDueFetching;

  const kpiCards: StatCardItem[] = [
    {
      title: "Total Paid",
      value: `৳ ${formatMoney(kpis.totalPaid)}`,
      icon: FaHandHoldingUsd,
      color: "text-[var(--ui-success)]",
      bg: "bg-[var(--ui-success-light)]/60 border-[var(--ui-success-border)]",
      iconBg: "bg-[var(--ui-success-border)] text-[var(--ui-success)]",
    },
    {
      title: "Cash Paid",
      value: `৳ ${formatMoney(kpis.cashPaid)}`,
      icon: FaMoneyBillWave,
      color: "text-[var(--primary-color)]",
      bg: "bg-[var(--primary-color-light)]/60 border-[var(--primary-color-muted)]",
      iconBg: "bg-[var(--primary-color-muted)] text-[var(--primary-color)]",
    },
    {
      title: "Bank / MFS Paid",
      value: `৳ ${formatMoney(kpis.digitalPaid)}`,
      icon: FaUniversity,
      color: "text-[var(--ui-info)]",
      bg: "bg-[var(--ui-info-light)]/60 border-[var(--ui-info-border)]",
      iconBg: "bg-[var(--ui-info-border)] text-[var(--ui-info)]",
    },
    {
      title: "Payment Discount",
      value: `৳ ${formatMoney(kpis.totalDiscount)}`,
      icon: FaPercent,
      color: "text-amber-600",
      bg: "bg-[var(--ui-warning-border)]/35 border-[var(--ui-warning-border)]",
      iconBg: "bg-[var(--ui-warning-border)] text-[var(--ui-warning-dark)]",
    },
    {
      title: "Total Payable Due",
      value: `৳ ${formatMoney(kpis.totalOutstandingDue)}`,
      icon: FaExclamationCircle,
      color: "text-[var(--ui-danger)]",
      bg: "bg-[var(--ui-danger-light)]/60 border-[var(--ui-danger-border)]",
      iconBg: "bg-[var(--ui-danger-border)] text-[var(--ui-danger)]",
    },
  ];

  const handleRefresh = () => {
    refetchPayments();
    refetchDue();
    refetchPurchases();
    refetchUnified();
  };

  const handleViewReceipt = (receipt: PaymentReceiptData) => {
    setReceiptData(receipt);
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <PageHeader
          headerTitle="Supplier Payment Report"
          headerDescription="Payment disbursement vouchers, supplier settlement history, and outstanding payable report"
        />

        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 self-start md:self-auto shrink-0">
          <RefreshButton onClick={handleRefresh} isLoading={isLoading} />
        </div>
      </div>

      <StatsCards cards={kpiCards} />

      <div className="flex items-center gap-1.5 border-b border-[var(--ui-border)]/90 -my-0.5">
        <button
          type="button"
          onClick={() => setActiveTab("vouchers")}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "vouchers"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]/50 rounded-t-md"
              : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] rounded-t-md"
          }`}
        >
          <FaReceipt size={11} />
          <span>Payment History ({payments.length})</span>
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
          <span>Supplier-Wise Summary</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("dues")}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "dues"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]/50 rounded-t-md"
              : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] rounded-t-md"
          }`}
        >
          <FaExclamationCircle size={11} />
          <span>Outstanding Dues ({dueRows.length})</span>
        </button>
      </div>

      <div className="w-full">
        {activeTab === "vouchers" && (
          <PaymentHistoryReportTable
            records={payments}
            isLoading={isLoading}
            {...datePickerProps}
            onViewReceipt={handleViewReceipt}
          />
        )}

        {activeTab === "suppliers" && (
          <SupplierPaymentSummaryTable
            payments={payments}
            dueRows={dueRows}
            purchasesList={purchasesList}
            returnRecords={returnRecords}
            rawPartyData={rawPartyData}
            isLoading={isLoading}
            onViewReceipt={handleViewReceipt}
            {...datePickerProps}
          />
        )}

        {activeTab === "dues" && (
          <SupplierDueReportTable
            dueRows={dueRows}
            payments={payments}
            purchasesList={purchasesList}
            returnRecords={returnRecords}
            rawPartyData={rawPartyData}
            isLoading={isLoading}
            onViewReceipt={handleViewReceipt}
            startDate={startDate}
            endDate={endDate}
          />
        )}
      </div>

      <PaymentReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receiptData={receiptData}
      />
    </div>
  );
};

export default SupplierPaymentReportPage;

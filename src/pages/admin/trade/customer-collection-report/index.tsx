import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FaHandHoldingUsd,
  FaMoneyBillWave,
  FaPercent,
  FaExclamationCircle,
  FaReceipt,
  FaUserFriends,
} from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import StatsCards, { type StatCardItem } from "@/components/common/StatsCards";
import { formatMoney } from "@/utils/formatters";
import { useCollectionReportQuery } from "@/hooks/useCollectionReport";
import { useCustomersDueQuery } from "@/hooks/useCustomersDue";
import { useSalesQuery } from "@/pages/admin/trade/sales/hooks/useSalesQueries";
import CollectionReceiptModal, {
  type CollectionReceiptData,
} from "@/pages/admin/trade/customer-collection/components/CollectionReceiptModal";
import { partyListQueryKey } from "@/config/query-key";
import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import { useReportDateRange } from "@/utils/trade-report-helpers";
import CollectionHistoryReportTable from "./components/CollectionHistoryReportTable";
import CustomerCollectionSummaryTable from "./components/CustomerCollectionSummaryTable";
import CustomerDueReportTable from "./components/CustomerDueReportTable";
import {
  type CollectionReportTab,
  normalizeCollectionReportRecords,
  normalizeCustomerDueRows,
  computeCollectionReportKpis,
} from "./utils/customer-collection-report-helpers";

const CustomerCollectionReportPage: React.FC = () => {
  const { startDate, endDate, datePickerProps } = useReportDateRange();
  const [activeTab, setActiveTab] = useState<CollectionReportTab>("vouchers");

  const [receiptData, setReceiptData] = useState<CollectionReceiptData | null>(
    null
  );
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // 1. Live Collection Report Query
  const {
    data: rawCollections = [],
    isLoading: isCollectionLoading,
    isFetching: isCollectionFetching,
    refetch: refetchCollections,
  } = useCollectionReportQuery({
    startDate,
    endDate,
  });

  // 2. Live Customers Due Query + enrichment sources
  const {
    data: rawCustomersDue = [],
    isLoading: isDueLoading,
    isFetching: isDueFetching,
    refetch: refetchDue,
  } = useCustomersDueQuery();

  const { data: rawPartyData } = useQuery({
    queryKey: [partyListQueryKey],
    queryFn: async () =>
      postData({
        url: apiConfig.party.partyListUrl,
        body: { accessUser: buildAccessUser() },
      }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: salesList = [], refetch: refetchSales } = useSalesQuery({
    staleTime: 0,
  });

  const collections = useMemo(
    () => normalizeCollectionReportRecords(rawCollections, startDate, endDate),
    [rawCollections, startDate, endDate]
  );

  const dueRows = useMemo(
    () => normalizeCustomerDueRows(rawCustomersDue, rawPartyData, salesList),
    [rawCustomersDue, rawPartyData, salesList]
  );

  const kpis = useMemo(
    () => computeCollectionReportKpis(collections, dueRows),
    [collections, dueRows]
  );

  const isLoading =
    isCollectionLoading || isCollectionFetching || isDueLoading || isDueFetching;

  const kpiCards: StatCardItem[] = [
    {
      title: "Total Collected",
      value: `৳ ${formatMoney(kpis.totalCollected)}`,
      icon: FaHandHoldingUsd,
      color: "text-[var(--ui-success)]",
      bg: "bg-[var(--ui-success-light)]/60 border-[var(--ui-success-border)]",
      iconBg: "bg-[var(--ui-success-border)] text-[var(--ui-success)]",
    },
    {
      title: "Cash vs Bank / MFS",
      value: `৳ ${formatMoney(kpis.cashCollected)} / ৳ ${formatMoney(kpis.digitalCollected)}`,
      icon: FaMoneyBillWave,
      color: "text-[var(--primary-color)]",
      bg: "bg-[var(--primary-color-light)]/60 border-[var(--primary-color-muted)]",
      iconBg: "bg-[var(--primary-color-muted)] text-[var(--primary-color)]",
    },
    {
      title: "Collection Discount",
      value: `৳ ${formatMoney(kpis.totalDiscount)}`,
      icon: FaPercent,
      color: "text-amber-600",
      bg: "bg-[var(--ui-warning-border)]/35 border-[var(--ui-warning-border)]",
      iconBg: "bg-[var(--ui-warning-border)] text-[var(--ui-warning-dark)]",
    },
    {
      title: "Total Receivable Due",
      value: `৳ ${formatMoney(kpis.totalOutstandingDue)}`,
      icon: FaExclamationCircle,
      color: "text-[var(--ui-danger)]",
      bg: "bg-[var(--ui-danger-light)]/60 border-[var(--ui-danger-border)]",
      iconBg: "bg-[var(--ui-danger-border)] text-[var(--ui-danger)]",
    },
  ];

  const handleRefresh = () => {
    refetchCollections();
    refetchDue();
    refetchSales();
  };

  const handleViewReceipt = (receipt: CollectionReceiptData) => {
    setReceiptData(receipt);
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <PageHeader
          headerTitle="Customer Collection Report"
          headerDescription="Collection vouchers, customer payment recovery breakdown, and outstanding receivable report"
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
          <span>Collection History ({collections.length})</span>
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
          <span>Customer-Wise Summary</span>
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
          <CollectionHistoryReportTable
            records={collections}
            isLoading={isCollectionLoading || isCollectionFetching}
            {...datePickerProps}
            onViewReceipt={handleViewReceipt}
          />
        )}

        {activeTab === "customers" && (
          <CustomerCollectionSummaryTable
            collections={collections}
            dueRows={dueRows}
            salesList={salesList}
            rawPartyData={rawPartyData}
            isLoading={isLoading}
            onViewReceipt={handleViewReceipt}
            {...datePickerProps}
          />
        )}

        {activeTab === "dues" && (
          <CustomerDueReportTable
            dueRows={dueRows}
            collections={collections}
            salesList={salesList}
            rawPartyData={rawPartyData}
            isLoading={isDueLoading || isDueFetching}
            onViewReceipt={handleViewReceipt}
            {...datePickerProps}
          />
        )}
      </div>

      <CollectionReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setReceiptData(null);
        }}
        receiptData={receiptData}
      />
    </div>
  );
};

export default CustomerCollectionReportPage;

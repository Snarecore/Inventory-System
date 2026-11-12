import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FaShoppingCart,
  FaBoxes,
  FaUserFriends,
} from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import TradeInvoiceStats from "@/components/trade/TradeInvoiceStats";
import SalesReportTable from "./components/SalesReportTable";
import ProductSalesReportTable from "./components/ProductSalesReportTable";
import CustomerSalesReportTable from "./components/CustomerSalesReportTable";
import SaleInvoiceModal from "@/pages/admin/trade/sales/components/SaleInvoiceModal";
import apiConfig from "@/config/api.json";
import { salesTransactionReportQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import { fetchSalesList, normalizeSaleRecord } from "@/pages/admin/trade/sales/hooks/useSalesQueries";
import {
  useReportDateRange,
  computeTradeKpiTotals,
  filterAndNormalizeReportTransactions,
} from "@/utils/trade-report-helpers";
import type { ReportTab } from "./utils/sales-report-helpers";
import type { SaleItem } from "@/types";

const SalesReportPage: React.FC = () => {
  const { startDate, endDate, datePickerProps } = useReportDateRange();

  // Active report tab
  const [activeTab, setActiveTab] = useState<ReportTab>("invoices");

  // Single invoice modal state
  const [selectedInvoice, setSelectedInvoice] = useState<SaleItem | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [isAutoPrint, setIsAutoPrint] = useState<boolean>(false);

  // Fetch Sales Report transactions from live API
  const {
    data: liveReportData,
    isLoading: isLiveLoading,
    isFetching,
    refetch,
  } = useQuery<SaleItem[]>({
    queryKey: [salesTransactionReportQueryKey, startDate, endDate],
    queryFn: async () => {
      const accessUser = buildAccessUser();
      const endpoint = apiConfig.sales.salesTransactionReportUrl;

      let rawList: any[] = [];
      try {
        const res: any = await postData({
          url: endpoint,
          body: {
            accessUser,
            startDate,
            endDate,
            fromDate: startDate,
            toDate: endDate,
          },
        });

        const list =
          res?.saleTransactionReport ||
          res?.transactionList ||
          res?.saleList ||
          res?.sales ||
          res?.data;

        if (Array.isArray(list) && list.length > 0) {
          rawList = list;
        }
      } catch (err) {
        console.warn("Failed fetching from get-sale-transaction-report, trying get-sale-list fallback:", err);
      }

      // Fallback to fetchSalesList if report returned no data or failed
      if (rawList.length === 0) {
        const allSales = await fetchSalesList();
        rawList = allSales;
      }

      const normalized = (Array.isArray(rawList) ? rawList : []).map(normalizeSaleRecord);

      return filterAndNormalizeReportTransactions(normalized, {
        startDate,
        endDate,
        domain: "sale",
        orderPrefix: "SO",
      });
    },
    staleTime: 0,
  });

  // Effective transactions data (pure live API)
  const transactions: SaleItem[] = Array.isArray(liveReportData) ? liveReportData : [];
  const isLoading = isLiveLoading || isFetching;

  const {
    totalAmount: totalSalesVolume,
    totalPaid: totalCollected,
    totalDue,
  } = computeTradeKpiTotals(transactions, "sale");

  const handleView = (item: SaleItem) => {
    setSelectedInvoice(item);
    setIsAutoPrint(false);
    setIsInvoiceModalOpen(true);
  };

  const handlePrint = (item: SaleItem) => {
    setSelectedInvoice(item);
    setIsAutoPrint(true);
    setIsInvoiceModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 max-w-[1600px] mx-auto w-full">
      {/* ── Top Header & Global Actions ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <PageHeader
          headerTitle="Sales Register"
          headerDescription="Sales transactions, collections, and financial summary"
        />

        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 self-start md:self-auto shrink-0">
          {/* Refresh (Far Right) */}
          <RefreshButton
            onClick={() => refetch()}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* ── KPI Cards (Authentic Cash-Boi TradeInvoiceStats) ── */}
      <TradeInvoiceStats
        type="sale"
        totalCount={transactions.length}
        totalAmount={totalSalesVolume}
        totalPaid={totalCollected}
        totalDue={totalDue}
      />

      {/* ── Unified Tab Switcher (Matches Sales & Purchases Page Design) ── */}
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
          <FaShoppingCart size={11} />
          <span>Sales Invoices ({transactions.length})</span>
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
          <span>Product-Wise Sales</span>
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
          <span>Customer-Wise Sales</span>
        </button>
      </div>

      {/* ── Active Report View ── */}
      <div className="w-full">
        {activeTab === "invoices" && (
          <SalesReportTable
            transactions={transactions}
            isLoading={isLoading}
            {...datePickerProps}
            onView={handleView}
            onPrint={handlePrint}
          />
        )}

        {activeTab === "products" && (
          <ProductSalesReportTable
            transactions={transactions}
            isLoading={isLoading}
            {...datePickerProps}
          />
        )}

        {activeTab === "customers" && (
          <CustomerSalesReportTable
            transactions={transactions}
            isLoading={isLoading}
            {...datePickerProps}
          />
        )}
      </div>

      {/* ── Single Invoice Modal Preview ── */}
      <SaleInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedInvoice(null);
          setIsAutoPrint(false);
        }}
        sale={selectedInvoice}
        autoPrint={isAutoPrint}
      />
    </div>
  );
};

export default SalesReportPage;

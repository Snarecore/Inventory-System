import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import {
  FaChartBar,
  FaCalendarAlt,
  FaFileAlt,
  FaPrint,
  FaDatabase,
  FaListAlt,
  FaBoxes,
  FaUserFriends,
  FaMoneyCheckAlt,
  FaChartPie,
} from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import DateRangePicker from "@/components/date-range-picker/DateRangePicker";
import SalesReportStats from "./components/SalesReportStats";
import SalesReportCharts from "./components/SalesReportCharts";
import SalesReportTable from "./components/SalesReportTable";
import ProductSalesReportTable from "./components/ProductSalesReportTable";
import CustomerSalesReportTable from "./components/CustomerSalesReportTable";
import PaymentChannelReportTable from "./components/PaymentChannelReportTable";
import PrintableSalesReportModal from "./components/PrintableSalesReportModal";
import SaleInvoiceModal from "@/pages/admin/trade/sales/components/SaleInvoiceModal";
import apiConfig from "@/config/api.json";
import { salesTransactionReportQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import {
  mockSalesReportTransactions,
  filterMockSalesByDateRange,
} from "./data/mockSalesReportData";
import type { SaleItem } from "@/types";

type ReportTab = "invoices" | "products" | "customers" | "channels";

const SalesReportPage: React.FC = () => {
  // Date range filters
  const [dateRange, setDateRange] = useState<string>("thisMonth");
  const [customStartDate, setCustomStartDate] = useState<string>(() =>
    moment().startOf("month").format("YYYY-MM-DD")
  );
  const [customEndDate, setCustomEndDate] = useState<string>(() =>
    moment().endOf("month").format("YYYY-MM-DD")
  );

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<ReportTab>("invoices");

  // Show / Hide visual charts
  const [showCharts, setShowCharts] = useState<boolean>(true);

  // Data Mode toggle: "mock" or "live"
  // Defaulting to "mock" for design & testing as requested by the user
  const [useMockData, setUseMockData] = useState<boolean>(true);

  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState<SaleItem | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState<boolean>(false);

  // Compute startDate and endDate formatted as YYYY-MM-DD for /get-sale-transaction-report
  const { startDate, endDate } = useMemo(() => {
    let start = moment().startOf("month").format("YYYY-MM-DD");
    let end = moment().endOf("month").format("YYYY-MM-DD");

    if (dateRange === "today") {
      start = moment().format("YYYY-MM-DD");
      end = moment().format("YYYY-MM-DD");
    } else if (dateRange === "yesterday") {
      start = moment().subtract(1, "day").format("YYYY-MM-DD");
      end = moment().subtract(1, "day").format("YYYY-MM-DD");
    } else if (dateRange === "last7days") {
      start = moment().subtract(7, "days").format("YYYY-MM-DD");
      end = moment().format("YYYY-MM-DD");
    } else if (dateRange === "thisMonth") {
      start = moment().startOf("month").format("YYYY-MM-DD");
      end = moment().endOf("month").format("YYYY-MM-DD");
    } else if (dateRange === "lastMonth") {
      start = moment().subtract(1, "month").startOf("month").format("YYYY-MM-DD");
      end = moment().subtract(1, "month").endOf("month").format("YYYY-MM-DD");
    } else if (dateRange === "custom" && customStartDate && customEndDate) {
      start = customStartDate;
      end = customEndDate;
    }

    return { startDate: start, endDate: end };
  }, [dateRange, customStartDate, customEndDate]);

  // Fetch /get-sale-transaction-report from live API
  const {
    data: liveReportData,
    isLoading: isLiveLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [salesTransactionReportQueryKey, startDate, endDate],
    queryFn: async () => {
      const accessUser = buildAccessUser();
      const endpoint =
        apiConfig.sales?.salesTransactionReportUrl || "get-sale-transaction-report";

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
        res?.data ||
        [];

      return Array.isArray(list) ? list : [];
    },
    enabled: !useMockData,
    staleTime: 60 * 1000,
  });

  // Effective transactions data based on mode
  const transactions: SaleItem[] = useMemo(() => {
    if (useMockData) {
      return filterMockSalesByDateRange(
        mockSalesReportTransactions,
        startDate,
        endDate
      );
    }
    if (Array.isArray(liveReportData) && liveReportData.length > 0) {
      return liveReportData;
    }
    return [];
  }, [useMockData, liveReportData, startDate, endDate]);

  const isLoading = !useMockData && isLiveLoading;

  // Calculate Aggregates
  const stats = useMemo(() => {
    let totalSalesVolume = 0;
    let totalCollected = 0;
    let totalDue = 0;
    let cashCollected = 0;
    let mfsCollected = 0;
    let bankCollected = 0;
    let totalDiscount = 0;
    let totalQuantitySold = 0;
    let unpaidCount = 0;

    transactions.forEach((t: any) => {
      const gt = Number(t.grandTotal ?? t.grand_total ?? t.totalAmount ?? 0);
      const paid = Number(t.paidAmount ?? t.paid_amount ?? 0);
      const due = Number(t.dueAmount ?? t.due_amount ?? Math.max(0, gt - paid));
      const disc = Number(t.discount ?? 0);

      totalSalesVolume += gt;
      totalCollected += paid;
      totalDue += due;
      totalDiscount += disc;

      if (due > 0) {
        unpaidCount += 1;
      }

      const pType = String(t.paymentType || t.payment_type || "CASH").toUpperCase();
      if (pType === "CASH") {
        cashCollected += paid;
      } else if (pType === "MFS" || pType === "BKASH" || pType === "NAGAD") {
        mfsCollected += paid;
      } else if (pType === "BANK" || pType === "CARD") {
        bankCollected += paid;
      }

      // Quantity count from lines
      const details =
        t.salesDetails ||
        t.saleDetails ||
        t.details ||
        t.items ||
        t.productsList ||
        [];
      if (Array.isArray(details)) {
        details.forEach((item: any) => {
          totalQuantitySold += Number(item.quantity ?? item.qty ?? 1);
        });
      }
    });

    return {
      totalSalesVolume,
      totalCollected,
      totalDue,
      totalInvoices: transactions.length,
      cashCollected,
      mfsCollected,
      bankCollected,
      totalDiscount,
      totalQuantitySold,
      unpaidCount,
    };
  }, [transactions]);

  const handleView = (item: SaleItem) => {
    setSelectedInvoice(item);
    setIsInvoiceModalOpen(true);
  };

  const handlePrint = (item: SaleItem) => {
    setSelectedInvoice(item);
    setIsInvoiceModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-3 px-3 py-2 sm:px-4 sm:py-3 max-w-[1600px] mx-auto w-full">
      {/* Page Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <PageHeader
          headerTitle="Sales Report & Analytics"
          headerDescription="Audit breakdown of all sales revenue, payment channels, customers, and receivable collections"
        />

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Mock vs Live Data Toggle */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg p-1 shadow-2xs text-xs">
            <button
              type="button"
              onClick={() => setUseMockData(true)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                useMockData
                  ? "bg-[#009fe3] text-white shadow-2xs"
                  : "text-gray-600 hover:text-black"
              }`}
            >
              <FaDatabase size={11} />
              <span>Mock Data</span>
            </button>
            <button
              type="button"
              onClick={() => setUseMockData(false)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                !useMockData
                  ? "bg-[#009fe3] text-white shadow-2xs"
                  : "text-gray-600 hover:text-black"
              }`}
            >
              <span>Live API</span>
            </button>
          </div>

          {/* Date Range Picker */}
          <DateRangePicker
            startDate={customStartDate}
            endDate={customEndDate}
            selectedPreset={dateRange}
            onPresetChange={(r) => setDateRange(r)}
            onChange={({ startDate: s, endDate: e, label }) => {
              if (s) setCustomStartDate(s);
              if (e) setCustomEndDate(e);
              if (label) setDateRange(label);
            }}
            size="sm"
          />

          {/* Print Summary Report */}
          <button
            type="button"
            onClick={() => setIsPrintSummaryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <FaPrint className="text-gray-500" size={12} />
            <span className="hidden sm:inline">Print Report</span>
          </button>

          {/* Refresh */}
          <RefreshButton
            onClick={() => {
              if (!useMockData) refetch();
            }}
            isLoading={isLoading || isFetching}
          />
        </div>
      </div>

      {/* Date Period & Mock Mode Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-gray-600 bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <FaCalendarAlt className="text-[#009fe3] text-xs" />
          <span>Active Report Window:</span>
          <span className="font-bold text-gray-900">
            {moment(startDate).format("DD MMM, YYYY")} -{" "}
            {moment(endDate).format("DD MMM, YYYY")}
          </span>
          <span className="text-gray-400 font-normal">
            ({transactions.length} transactions recorded)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {useMockData ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              UI Prototype Mode (Mock Data Active)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Connected to Production API
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowCharts(!showCharts)}
            className="text-[11px] font-semibold text-[#009fe3] hover:underline cursor-pointer ml-1"
          >
            {showCharts ? "Hide Visual Charts" : "Show Visual Charts"}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <SalesReportStats
        totalSalesVolume={stats.totalSalesVolume}
        totalCollected={stats.totalCollected}
        totalDue={stats.totalDue}
        totalInvoices={stats.totalInvoices}
        cashCollected={stats.cashCollected}
        mfsCollected={stats.mfsCollected}
        bankCollected={stats.bankCollected}
        totalDiscount={stats.totalDiscount}
        totalQuantitySold={stats.totalQuantitySold}
        unpaidCount={stats.unpaidCount}
      />

      {/* Visual Analytics Charts (Trend & Channel Mix) */}
      {showCharts && <SalesReportCharts transactions={transactions} />}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 border-b border-gray-200 pb-1 mt-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("invoices")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "invoices"
              ? "bg-[#009fe3] text-white shadow-2xs"
              : "text-gray-600 hover:text-black hover:bg-gray-100"
          }`}
        >
          <FaListAlt size={13} />
          <span>Invoices Audit List ({transactions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("products")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "products"
              ? "bg-[#009fe3] text-white shadow-2xs"
              : "text-gray-600 hover:text-black hover:bg-gray-100"
          }`}
        >
          <FaBoxes size={13} />
          <span>Product-Wise Sales Summary</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("customers")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "customers"
              ? "bg-[#009fe3] text-white shadow-2xs"
              : "text-gray-600 hover:text-black hover:bg-gray-100"
          }`}
        >
          <FaUserFriends size={13} />
          <span>Customer-Wise Sales Analysis</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("channels")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "channels"
              ? "bg-[#009fe3] text-white shadow-2xs"
              : "text-gray-600 hover:text-black hover:bg-gray-100"
          }`}
        >
          <FaMoneyCheckAlt size={13} />
          <span>Payment Channel Reconciliation</span>
        </button>
      </div>

      {/* Active Tab Content */}
      <div className="w-full">
        {activeTab === "invoices" && (
          <SalesReportTable
            transactions={transactions}
            isLoading={isLoading}
            onView={handleView}
            onPrint={handlePrint}
          />
        )}

        {activeTab === "products" && (
          <ProductSalesReportTable transactions={transactions} />
        )}

        {activeTab === "customers" && (
          <CustomerSalesReportTable transactions={transactions} />
        )}

        {activeTab === "channels" && (
          <PaymentChannelReportTable transactions={transactions} />
        )}
      </div>

      {/* Single Printable / Viewable Invoice Modal */}
      <SaleInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedInvoice(null);
        }}
        sale={selectedInvoice}
      />

      {/* Printable Period Sales Summary Report Sheet */}
      <PrintableSalesReportModal
        isOpen={isPrintSummaryOpen}
        onClose={() => setIsPrintSummaryOpen(false)}
        startDate={startDate}
        endDate={endDate}
        transactions={transactions}
        stats={stats}
      />
    </div>
  );
};

export default SalesReportPage;

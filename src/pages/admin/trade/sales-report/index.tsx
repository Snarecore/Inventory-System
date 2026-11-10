import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import {
  FaFilePdf,
  FaFileExcel,
  FaShoppingCart,
  FaBoxes,
  FaUserFriends,
} from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
import DateRangePicker from "@/components/date-range-picker/DateRangePicker";
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
import { useBusinessProfileQuery } from "@/hooks/useBusinessProfile";
import { getFileViewUrl } from "@/services/file-upload-service";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import { getUserInfo } from "@/utils/auth-storage";
import {
  exportTabReportToExcel,
  downloadTabReportPdf,
  type ReportTab,
} from "./utils/sales-report-helpers";
import type { SaleItem } from "@/types";

const SalesReportPage: React.FC = () => {
  // Date range filters
  const [dateRange, setDateRange] = useState<string>("this_month");
  const [customStartDate, setCustomStartDate] = useState<string>(() =>
    moment().startOf("month").format("YYYY-MM-DD")
  );
  const [customEndDate, setCustomEndDate] = useState<string>(() =>
    moment().endOf("month").format("YYYY-MM-DD")
  );

  // Active report tab
  const [activeTab, setActiveTab] = useState<ReportTab>("invoices");

  // Single invoice modal state
  const [selectedInvoice, setSelectedInvoice] = useState<SaleItem | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [isAutoPrint, setIsAutoPrint] = useState<boolean>(false);

  // Business Profile & User info for reports
  const { data: businessProfile } = useBusinessProfileQuery();
  const userInfo = getUserInfo();

  // Compute startDate and endDate formatted as YYYY-MM-DD
  const { startDate, endDate } = useMemo(() => {
    let start = moment().startOf("month").format("YYYY-MM-DD");
    let end = moment().endOf("month").format("YYYY-MM-DD");

    if (dateRange === "today") {
      start = moment().format("YYYY-MM-DD");
      end = moment().format("YYYY-MM-DD");
    } else if (dateRange === "yesterday") {
      start = moment().subtract(1, "day").format("YYYY-MM-DD");
      end = moment().subtract(1, "day").format("YYYY-MM-DD");
    } else if (dateRange === "this_week" || dateRange === "last7days") {
      start = moment().startOf("week").format("YYYY-MM-DD");
      end = moment().endOf("week").format("YYYY-MM-DD");
    } else if (dateRange === "this_month" || dateRange === "thisMonth") {
      start = moment().startOf("month").format("YYYY-MM-DD");
      end = moment().endOf("month").format("YYYY-MM-DD");
    } else if (dateRange === "last_month" || dateRange === "lastMonth") {
      start = moment().subtract(1, "month").startOf("month").format("YYYY-MM-DD");
      end = moment().subtract(1, "month").endOf("month").format("YYYY-MM-DD");
    } else if (dateRange === "30_days") {
      start = moment().subtract(30, "days").format("YYYY-MM-DD");
      end = moment().format("YYYY-MM-DD");
    } else if (dateRange === "this_year") {
      start = moment().startOf("year").format("YYYY-MM-DD");
      end = moment().endOf("year").format("YYYY-MM-DD");
    } else if (dateRange === "all") {
      start = "";
      end = "";
    } else if (dateRange === "custom" && customStartDate && customEndDate) {
      start = customStartDate;
      end = customEndDate;
    }

    return { startDate: start, endDate: end };
  }, [dateRange, customStartDate, customEndDate]);

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

      // Normalize and filter by date range
      const normalized = (Array.isArray(rawList) ? rawList : []).map(normalizeSaleRecord);

      if (!startDate || !endDate) {
        return normalized.map((item, idx) => ({
          ...item,
          orderNo:
            item.orderNo ||
            (item.invoiceNo ? item.invoiceNo.replace("INV-", "SO-") : `SO-${1000 + (item.id || idx)}`),
        }));
      }

      const start = moment(startDate).startOf("day");
      const end = moment(endDate).endOf("day");

      return normalized
        .filter((item: any) => {
          const dStr = item.salesDate || item.saleDate || item.date || item.createdAt;
          if (!dStr) return true;
          const d = moment(dStr);
          return d.isBetween(start, end, undefined, "[]");
        })
        .map((item, idx) => ({
          ...item,
          orderNo:
            item.orderNo ||
            (item.invoiceNo ? item.invoiceNo.replace("INV-", "SO-") : `SO-${1000 + (item.id || idx)}`),
        }));
    },
    staleTime: 0,
  });

  // Effective transactions data (pure live API)
  const transactions: SaleItem[] = useMemo(() => {
    return Array.isArray(liveReportData) ? liveReportData : [];
  }, [liveReportData]);

  const isLoading = isLiveLoading || isFetching;

  // Calculate Financial Aggregates
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
    setIsAutoPrint(false);
    setIsInvoiceModalOpen(true);
  };

  const handlePrint = (item: SaleItem) => {
    setSelectedInvoice(item);
    setIsAutoPrint(true);
    setIsInvoiceModalOpen(true);
  };

  const getCompanyMeta = () => {
    const logoKey = businessProfile?.businessLogo || businessProfile?.businessLogoRefNo || "";
    const businessLogoUrl =
      businessProfile?.businessLogoUrl || (logoKey ? getFileViewUrl(logoKey) : "");

    return {
      businessName: businessProfile?.businessName || userInfo?.orgName || "Cash Boi Trade Ltd",
      businessAddress: businessProfile?.address || "",
      businessLogoUrl,
      startDate,
      endDate,
    };
  };

  // Direct Designed Excel Export for active tab
  const handleExportExcel = async () => {
    if (!transactions || transactions.length === 0) {
      showErrorToast("No sales records available to export");
      return;
    }
    try {
      const count = await exportTabReportToExcel(activeTab, transactions, getCompanyMeta());
      showSuccessToast(`Successfully exported ${count} records to Excel!`);
    } catch (e: any) {
      showErrorToast(e?.message || "Export failed");
    }
  };

  // Direct Landscape PDF / Save as PDF Print for active tab
  const handleDownloadPdf = () => {
    if (!transactions || transactions.length === 0) {
      showErrorToast("No sales records available to download PDF");
      return;
    }
    downloadTabReportPdf(activeTab, transactions, stats, getCompanyMeta());
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 max-w-[1600px] mx-auto w-full">
      {/* ── Top Header & Global Actions ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <PageHeader
          headerTitle="Sales Report"
          headerDescription="Sales transactions, collections, and financial summary"
        />

        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 self-start md:self-auto shrink-0">
          {/* Date Range Picker */}
          <div className="w-36 sm:w-40 shrink-0">
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
          </div>

          {/* Export Designed Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="h-8 rounded-md text-xs font-semibold px-3 whitespace-nowrap shrink-0 flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 transition-colors shadow-2xs cursor-pointer"
            title="Download Designed Excel Report"
          >
            <FaFileExcel className="text-emerald-600 dark:text-emerald-400 text-xs" />
            <span>Export Excel</span>
          </button>

          {/* Download PDF Report */}
          <Button
            label="Download PDF"
            size="sm"
            onClick={handleDownloadPdf}
            color="var(--primary-color)"
            hoverColor="var(--primary-color-hover)"
            className="h-8 rounded-md text-xs font-medium px-3 whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-2xs cursor-pointer !text-white"
            icon={<FaFilePdf className="text-white text-xs" />}
          />

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
        totalCount={stats.totalInvoices}
        totalAmount={stats.totalSalesVolume}
        totalPaid={stats.totalCollected}
        totalDue={stats.totalDue}
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
            onView={handleView}
            onPrint={handlePrint}
          />
        )}

        {activeTab === "products" && (
          <ProductSalesReportTable
            transactions={transactions}
            isLoading={isLoading}
          />
        )}

        {activeTab === "customers" && (
          <CustomerSalesReportTable
            transactions={transactions}
            isLoading={isLoading}
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

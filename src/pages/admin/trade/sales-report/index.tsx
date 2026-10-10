import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import { FaChartBar, FaCalendarAlt, FaFileAlt } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import DateRangePicker from "@/components/date-range-picker/DateRangePicker";
import SalesReportStats from "./components/SalesReportStats";
import SalesReportTable from "./components/SalesReportTable";
import SaleInvoiceModal from "@/pages/admin/trade/sales/components/SaleInvoiceModal";
import apiConfig from "@/config/api.json";
import { salesTransactionReportQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import type { SaleItem } from "@/types";

const SalesReportPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<string>("thisMonth");
  const [customStartDate, setCustomStartDate] = useState<string>(() =>
    moment().startOf("month").format("YYYY-MM-DD")
  );
  const [customEndDate, setCustomEndDate] = useState<string>(() =>
    moment().endOf("month").format("YYYY-MM-DD")
  );

  const [selectedInvoice, setSelectedInvoice] = useState<SaleItem | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);

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

  // Fetch /get-sale-transaction-report
  const {
    data: reportData,
    isLoading,
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
    staleTime: 60 * 1000,
  });

  const transactions: SaleItem[] = useMemo(() => {
    if (Array.isArray(reportData)) return reportData;
    return [];
  }, [reportData]);

  // Calculate Aggregates
  const stats = useMemo(() => {
    let totalSalesVolume = 0;
    let totalCollected = 0;
    let totalDue = 0;

    transactions.forEach((t: any) => {
      const gt = Number(t.grandTotal ?? t.grand_total ?? t.totalAmount ?? 0);
      const paid = Number(t.paidAmount ?? t.paid_amount ?? 0);
      const due = Number(t.dueAmount ?? t.due_amount ?? Math.max(0, gt - paid));

      totalSalesVolume += gt;
      totalCollected += paid;
      totalDue += due;
    });

    return {
      totalSalesVolume,
      totalCollected,
      totalDue,
      totalInvoices: transactions.length,
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
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageHeader
          headerTitle="Sales Report"
          headerDescription="Comprehensive audit breakdown of all sales revenue, payment channels, and receivable collections"
        />

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
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
          <RefreshButton onClick={() => refetch()} isLoading={isLoading || isFetching} />
        </div>
      </div>

      {/* Date Range Badge */}
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-2xs">
        <FaCalendarAlt className="text-primary text-xs" />
        <span>Report Period:</span>
        <span className="font-bold text-gray-900">
          {moment(startDate).format("DD MMM, YYYY")} - {moment(endDate).format("DD MMM, YYYY")}
        </span>
      </div>


      {/* KPI Cards */}
      <SalesReportStats
        totalSalesVolume={stats.totalSalesVolume}
        totalCollected={stats.totalCollected}
        totalDue={stats.totalDue}
        totalInvoices={stats.totalInvoices}
      />

      {/* Transactions Table */}
      <SalesReportTable
        transactions={transactions}
        isLoading={isLoading}
        onView={handleView}
        onPrint={handlePrint}
      />

      {/* Printable Invoice Modal */}
      <SaleInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedInvoice(null);
        }}
        sale={selectedInvoice}
      />
    </div>
  );
};

export default SalesReportPage;

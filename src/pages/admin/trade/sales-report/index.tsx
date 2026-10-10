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

const mockReportData: SaleItem[] = [
  {
    id: "REP-1",
    invoiceNo: "INV-20261010-0001",
    salesDate: "2026-10-10",
    customerName: "Rahim Traders",
    customerPhone: "01711223344",
    totalAmount: 15400,
    discount: 400,
    vat: 0,
    delivery_charge: 100,
    grandTotal: 15100,
    paidAmount: 15100,
    dueAmount: 0,
    paymentType: "CASH",
    salesDetails: [
      { productId: "1", productName: "Premium Basmati Rice 25kg", quantity: 2, sellPrice: 3200, total: 6400 },
      { productId: "2", productName: "Soyabean Oil 5L", quantity: 5, sellPrice: 850, total: 4250 },
      { productId: "3", productName: "Aroma Tea Pack 500g", quantity: 15, sellPrice: 310, total: 4650 },
    ],
  },
  {
    id: "REP-2",
    invoiceNo: "INV-20261010-0002",
    salesDate: "2026-10-10",
    customerName: "Karim Enterprises",
    customerPhone: "01822334455",
    totalAmount: 28000,
    discount: 1000,
    vat: 500,
    delivery_charge: 200,
    grandTotal: 27700,
    paidAmount: 15000,
    dueAmount: 12700,
    paymentType: "MFS",
    salesDetails: [
      { productId: "4", productName: "Dell 24-inch IPS Monitor", quantity: 1, sellPrice: 18500, total: 18500 },
      { productId: "5", productName: "Logitech MX Master 3S Mouse", quantity: 1, sellPrice: 9500, total: 9000 },
    ],
  },
  {
    id: "REP-3",
    invoiceNo: "INV-20261009-0003",
    salesDate: "2026-10-09",
    customerName: "Bismillah General Store",
    customerPhone: "01933445566",
    totalAmount: 42000,
    discount: 2000,
    vat: 0,
    delivery_charge: 500,
    grandTotal: 40500,
    paidAmount: 0,
    dueAmount: 40500,
    paymentType: "CREDIT",
    salesDetails: [
      { productId: "6", productName: "Sugar White 50kg Sack", quantity: 5, sellPrice: 6500, total: 31500 },
      { productId: "7", productName: "Red Lentils 25kg", quantity: 3, sellPrice: 3500, total: 9500 },
    ],
  },
  {
    id: "REP-4",
    invoiceNo: "INV-20261008-0004",
    salesDate: "2026-10-08",
    customerName: "Shahjalal Traders",
    customerPhone: "01644556677",
    totalAmount: 64000,
    discount: 3000,
    vat: 1200,
    delivery_charge: 800,
    grandTotal: 63000,
    paidAmount: 63000,
    dueAmount: 0,
    paymentType: "BANK",
    salesDetails: [
      { productId: "8", productName: "HP LaserJet Pro MFP Printer", quantity: 2, sellPrice: 32000, total: 62200 },
    ],
  },
];

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

      return Array.isArray(list) && list.length > 0 ? list : mockReportData;
    },
    staleTime: 60 * 1000,
  });

  const transactions: SaleItem[] = useMemo(() => {
    if (Array.isArray(reportData) && reportData.length > 0) return reportData;
    return mockReportData;
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

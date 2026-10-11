import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import { FaChartArea, FaChartPie } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import moment from "moment";
import type { SaleItem } from "@/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SalesReportChartsProps {
  transactions: SaleItem[];
}

export const SalesReportCharts: React.FC<SalesReportChartsProps> = ({
  transactions,
}) => {
  // Aggregate daily data for trend chart
  const { trendLabels, trendSales, trendCollections } = useMemo(() => {
    const dateMap: Record<
      string,
      { sales: number; collections: number; dateMoment: moment.Moment }
    > = {};

    transactions.forEach((t: any) => {
      const dStr = t.salesDate || t.saleDate || t.date;
      const key = dStr ? moment(dStr).format("YYYY-MM-DD") : "Unknown";
      const gt = Number(t.grandTotal ?? t.grand_total ?? t.totalAmount ?? 0);
      const paid = Number(t.paidAmount ?? t.paid_amount ?? 0);

      if (!dateMap[key]) {
        dateMap[key] = {
          sales: 0,
          collections: 0,
          dateMoment: moment(key),
        };
      }
      dateMap[key].sales += gt;
      dateMap[key].collections += paid;
    });

    const sortedKeys = Object.keys(dateMap).sort((a, b) => {
      return moment(a).diff(moment(b));
    });

    return {
      trendLabels: sortedKeys.map((k) =>
        k === "Unknown" ? "Unknown" : moment(k).format("DD MMM")
      ),
      trendSales: sortedKeys.map((k) => dateMap[k].sales),
      trendCollections: sortedKeys.map((k) => dateMap[k].collections),
    };
  }, [transactions]);

  // Aggregate Payment Method breakdown
  const paymentBreakdown = useMemo(() => {
    let cash = 0;
    let mfs = 0;
    let bank = 0;
    let credit = 0;

    transactions.forEach((t: any) => {
      const p = String(t.paymentType || t.payment_type || "CASH").toUpperCase();
      const gt = Number(t.grandTotal ?? t.grand_total ?? t.totalAmount ?? 0);

      if (p === "CASH") cash += gt;
      else if (p === "MFS" || p === "BKASH" || p === "NAGAD") mfs += gt;
      else if (p === "BANK" || p === "CARD") bank += gt;
      else if (p === "CREDIT") credit += gt;
      else cash += gt;
    });

    const total = cash + mfs + bank + credit || 1;

    return {
      cash,
      mfs,
      bank,
      credit,
      total,
    };
  }, [transactions]);

  // Trend Line Chart Configuration
  const lineChartData = {
    labels: trendLabels.length > 0 ? trendLabels : ["No Data"],
    datasets: [
      {
        label: "Sales Volume",
        data: trendSales.length > 0 ? trendSales : [0],
        borderColor: "#009fe3",
        backgroundColor: "rgba(0, 159, 227, 0.12)",
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 3.5,
        pointBackgroundColor: "#009fe3",
      },
      {
        label: "Collected",
        data: trendCollections.length > 0 ? trendCollections : [0],
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.08)",
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 3.5,
        pointBackgroundColor: "#10b981",
      },
    ],
  };

  const lineChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        align: "end" as const,
        labels: {
          boxWidth: 12,
          font: { size: 11, weight: "bold" },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) =>
            `${context.dataset.label}: ৳ ${formatMoney(context.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0, 0, 0, 0.04)" },
        ticks: {
          font: { size: 10 },
          callback: (value: any) => {
            const num = Number(value);
            if (num >= 1000) return `৳${(num / 1000).toFixed(0)}k`;
            return `৳${num}`;
          },
        },
      },
    },
  };

  // Payment Doughnut Chart Configuration
  const doughnutData = {
    labels: ["Cash", "MFS (bKash/Nagad)", "Bank/Card", "Credit/Due"],
    datasets: [
      {
        data: [
          paymentBreakdown.cash,
          paymentBreakdown.mfs,
          paymentBreakdown.bank,
          paymentBreakdown.credit,
        ],
        backgroundColor: ["#10b981", "#a855f7", "#3b82f6", "#f43f5e"],
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  };

  const doughnutOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const val = context.parsed;
            const pct = Math.round((val / paymentBreakdown.total) * 100);
            return `${context.label}: ৳ ${formatMoney(val)} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 w-full">
      {/* Trend Chart (2 cols) */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-3.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-50 text-[#009fe3]">
              <FaChartArea size={14} />
            </span>
            <div>
              <h3 className="text-xs font-bold text-gray-900">
                Daily Sales & Collection Trajectory
              </h3>
              <p className="text-[10px] text-gray-500">
                Revenue generated vs cash/digital realization over time
              </p>
            </div>
          </div>
        </div>

        <div className="h-56 w-full relative">
          <Line data={lineChartData} options={lineChartOptions} />
        </div>
      </div>

      {/* Payment Channels Doughnut (1 col) */}
      <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <FaChartPie size={14} />
            </span>
            <div>
              <h3 className="text-xs font-bold text-gray-900">
                Payment Channel Mix
              </h3>
              <p className="text-[10px] text-gray-500">
                Cash vs Mobile Money vs Bank vs Credit
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center flex-1">
          <div className="h-40 w-40 relative flex items-center justify-center">
            <Doughnut data={doughnutData} options={doughnutOptions} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-gray-400 uppercase">
                Total
              </span>
              <span className="text-xs font-black text-gray-800">
                ৳{formatMoney(paymentBreakdown.total)}
              </span>
            </div>
          </div>

          {/* Custom Legend */}
          <div className="w-full grid grid-cols-2 gap-2 mt-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="text-gray-600">Cash:</span>
              <span className="font-bold text-gray-900 ml-auto">
                ৳{formatMoney(paymentBreakdown.cash)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"></span>
              <span className="text-gray-600">MFS:</span>
              <span className="font-bold text-gray-900 ml-auto">
                ৳{formatMoney(paymentBreakdown.mfs)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
              <span className="text-gray-600">Bank:</span>
              <span className="font-bold text-gray-900 ml-auto">
                ৳{formatMoney(paymentBreakdown.bank)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
              <span className="text-gray-600">Credit:</span>
              <span className="font-bold text-gray-900 ml-auto">
                ৳{formatMoney(paymentBreakdown.credit)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesReportCharts;

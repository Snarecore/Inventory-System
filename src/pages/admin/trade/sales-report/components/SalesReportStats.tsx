import React from "react";
import { FaChartLine, FaMoneyBillWave, FaHandHoldingUsd, FaReceipt } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";

interface SalesReportStatsProps {
  totalSalesVolume: number;
  totalCollected: number;
  totalDue: number;
  totalInvoices: number;
}

export const SalesReportStats: React.FC<SalesReportStatsProps> = ({
  totalSalesVolume,
  totalCollected,
  totalDue,
  totalInvoices,
}) => {
  const cards = [
    {
      title: "Total Sales Volume",
      value: `৳ ${formatMoney(totalSalesVolume)}`,
      icon: FaChartLine,
      color: "text-blue-600",
      bg: "bg-blue-50/70 border-blue-200",
      iconBg: "bg-blue-100 text-blue-600",
    },
    {
      title: "Total Collections",
      value: `৳ ${formatMoney(totalCollected)}`,
      icon: FaMoneyBillWave,
      color: "text-emerald-600",
      bg: "bg-emerald-50/70 border-emerald-200",
      iconBg: "bg-emerald-100 text-emerald-600",
    },
    {
      title: "Outstanding Receivables",
      value: `৳ ${formatMoney(totalDue)}`,
      icon: FaHandHoldingUsd,
      color: "text-rose-600",
      bg: "bg-rose-50/70 border-rose-200",
      iconBg: "bg-rose-100 text-rose-600",
    },
    {
      title: "Invoices & Average",
      value: `${totalInvoices} (৳ ${formatMoney(totalInvoices > 0 ? totalSalesVolume / totalInvoices : 0)})`,
      icon: FaReceipt,
      color: "text-purple-600",
      bg: "bg-purple-50/70 border-purple-200",
      iconBg: "bg-purple-100 text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 w-full">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 shadow-xs ${c.bg}`}
          >
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block truncate">
                {c.title}
              </span>
              <span className={`text-sm sm:text-base font-black truncate mt-0.5 block ${c.color}`}>
                {c.value}
              </span>
            </div>
            <div className={`p-2 rounded-lg shrink-0 ${c.iconBg}`}>
              <Icon size={15} />
            </div>
          </div>
        );
      })}
    </div>
  );

};

export default SalesReportStats;

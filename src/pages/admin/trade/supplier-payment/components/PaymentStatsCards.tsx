import React from "react";
import { FaExclamationCircle, FaTruck, FaCoins, FaChartLine } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import TradeStatsCards from "@/components/trade/TradeStatsCards";

export interface PaymentStatsCardsProps {
  totalDue: number;
  totalSuppliers: number;
  avgDue: number;
  maxDue: number;
}

export const PaymentStatsCards: React.FC<PaymentStatsCardsProps> = ({
  totalDue,
  totalSuppliers,
  avgDue,
  maxDue,
}) => {
  const cards = [
    {
      title: "Total Outstanding Due",
      value: `৳ ${formatMoney(totalDue)}`,
      icon: FaExclamationCircle,
      color: "text-rose-600",
      bg: "bg-rose-50/60 border-rose-300 hover:border-rose-400",
      iconBg: "bg-rose-100 text-rose-600",
    },
    {
      title: "Due Suppliers",
      value: `${totalSuppliers} Parties`,
      icon: FaTruck,
      color: "text-blue-600",
      bg: "bg-blue-50/60 border-blue-300 hover:border-blue-400",
      iconBg: "bg-blue-100 text-blue-600",
    },
    {
      title: "Average Due / Supplier",
      value: `৳ ${formatMoney(avgDue)}`,
      icon: FaCoins,
      color: "text-amber-600",
      bg: "bg-amber-50/60 border-amber-300 hover:border-amber-400",
      iconBg: "bg-amber-100 text-amber-600",
    },
    {
      title: "Highest Single Due",
      value: `৳ ${formatMoney(maxDue)}`,
      icon: FaChartLine,
      color: "text-purple-600",
      bg: "bg-purple-50/60 border-purple-300 hover:border-purple-400",
      iconBg: "bg-purple-100 text-purple-600",
    },
  ];

  return <TradeStatsCards cards={cards} />;
};

export default PaymentStatsCards;

import React from "react";
import { FaExclamationCircle, FaUsers, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import TradeStatsCards from "@/components/trade/TradeStatsCards";

export interface CollectionStatsCardsProps {
  totalDue: number;
  totalCustomers: number;
  highDueCount: number;
  highDueAmount: number;
  medLowDueCount: number;
  medLowDueAmount: number;
}

export const CollectionStatsCards: React.FC<CollectionStatsCardsProps> = ({
  totalDue,
  totalCustomers,
  highDueCount,
  highDueAmount,
  medLowDueCount,
  medLowDueAmount,
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
      title: "Due Customers",
      value: `${totalCustomers} Parties`,
      icon: FaUsers,
      color: "text-blue-600",
      bg: "bg-blue-50/60 border-blue-300 hover:border-blue-400",
      iconBg: "bg-blue-100 text-blue-600",
    },
    {
      title: "High Risk (> ৳10k)",
      value: `৳ ${formatMoney(highDueAmount)} (${highDueCount})`,
      icon: FaExclamationTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50/60 border-amber-300 hover:border-amber-400",
      iconBg: "bg-amber-100 text-amber-600",
    },
    {
      title: "Regular Due (< ৳10k)",
      value: `৳ ${formatMoney(medLowDueAmount)} (${medLowDueCount})`,
      icon: FaCheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50/60 border-emerald-300 hover:border-emerald-400",
      iconBg: "bg-emerald-100 text-emerald-600",
    },
  ];

  return <TradeStatsCards cards={cards} />;
};

export default CollectionStatsCards;

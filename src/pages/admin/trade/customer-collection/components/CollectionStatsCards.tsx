import React from "react";
import { FaExclamationCircle, FaUsers, FaCoins, FaChartLine } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import TradeStatsCards from "@/components/trade/TradeStatsCards";

export interface CollectionStatsCardsProps {
  totalDue: number;
  totalCustomers: number;
  avgDue: number;
  maxDue: number;
}

export const CollectionStatsCards: React.FC<CollectionStatsCardsProps> = ({
  totalDue,
  totalCustomers,
  avgDue,
  maxDue,
}) => {
  const cards = [
    {
      title: "Total Outstanding Due",
      value: `৳ ${formatMoney(totalDue)}`,
      icon: FaExclamationCircle,
      color: "text-[var(--ui-danger)]",
      bg: "bg-[var(--ui-danger-light)]/60 border-[var(--ui-danger-border)] hover:border-[var(--ui-danger-border)]",
      iconBg: "bg-[var(--ui-danger-border)] text-[var(--ui-danger)]",
    },
    {
      title: "Due Customers",
      value: `${totalCustomers} Parties`,
      icon: FaUsers,
      color: "text-[var(--primary-color)]",
      bg: "bg-[var(--primary-color-light)]/60 border-[var(--primary-color-muted)] hover:border-[var(--primary-color-muted)]",
      iconBg: "bg-[var(--primary-color-muted)] text-[var(--primary-color)]",
    },
    {
      title: "Average Due / Party",
      value: `৳ ${formatMoney(avgDue)}`,
      icon: FaCoins,
      color: "text-[var(--ui-warning)]",
      bg: "bg-[var(--ui-warning-light)]/60 border-[var(--ui-warning-border)] hover:border-[var(--ui-warning-border)]",
      iconBg: "bg-[var(--ui-warning-border)] text-[var(--ui-warning)]",
    },
    {
      title: "Highest Single Due",
      value: `৳ ${formatMoney(maxDue)}`,
      icon: FaChartLine,
      color: "text-[var(--ui-info)]",
      bg: "bg-[var(--ui-info-light)]/60 border-[var(--ui-info-border)] hover:border-[var(--ui-info-border)]",
      iconBg: "bg-[var(--ui-info-border)] text-[var(--ui-info)]",
    },
  ];

  return <TradeStatsCards cards={cards} />;
};

export default CollectionStatsCards;

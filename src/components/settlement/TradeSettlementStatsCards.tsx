import React from "react";
import { FaExclamationCircle, FaUsers, FaTruck, FaCoins, FaChartLine } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import TradeStatsCards from "@/components/trade/TradeStatsCards";

export interface TradeSettlementStatsCardsProps {
  partyType: "customer" | "supplier";
  totalDue: number;
  totalParties: number;
  avgDue: number;
  maxDue: number;
}

export const TradeSettlementStatsCards: React.FC<TradeSettlementStatsCardsProps> = ({
  partyType,
  totalDue,
  totalParties,
  avgDue,
  maxDue,
}) => {
  const isCustomer = partyType === "customer";
  const partyLabel = isCustomer ? "Customers" : "Suppliers";
  const PartyIcon = isCustomer ? FaUsers : FaTruck;

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
      title: `Due ${partyLabel}`,
      value: `${totalParties} Parties`,
      icon: PartyIcon,
      color: "text-[var(--primary-color)]",
      bg: "bg-[var(--primary-color-light)]/60 border-[var(--primary-color-muted)] hover:border-[var(--primary-color-muted)]",
      iconBg: "bg-[var(--primary-color-muted)] text-[var(--primary-color)]",
    },
    {
      title: `Average Due / ${isCustomer ? "Party" : "Supplier"}`,
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

export default TradeSettlementStatsCards;

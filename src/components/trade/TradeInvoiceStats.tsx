import React from "react";
import { FaShoppingCart, FaShoppingBag, FaMoneyBillWave, FaExclamationCircle, FaReceipt } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import TradeStatsCards from "@/components/trade/TradeStatsCards";

export interface TradeInvoiceStatsProps {
  type?: "sale" | "purchase";
  totalCount: number;
  totalAmount: number;
  totalPaid: number;
  totalDue: number;
}

export const TradeInvoiceStats: React.FC<TradeInvoiceStatsProps> = ({
  type = "sale",
  totalCount,
  totalAmount,
  totalPaid,
  totalDue,
}) => {
  const isSale = type === "sale";
  const cards = [
    {
      title: isSale ? "Total Sales" : "Total Purchases",
      value: `৳ ${formatMoney(totalAmount)}`,
      icon: isSale ? FaShoppingCart : FaShoppingBag,
      color: "text-[var(--primary-color)]",
      bg: "bg-[var(--primary-color-light)]/60 border-[var(--primary-color-muted)] hover:border-[var(--primary-color-muted)]",
      iconBg: "bg-[var(--primary-color-muted)] text-[var(--primary-color)]",
    },
    {
      title: "Total Paid",
      value: `৳ ${formatMoney(totalPaid)}`,
      icon: FaMoneyBillWave,
      color: "text-[var(--ui-success)]",
      bg: "bg-[var(--ui-success-light)]/60 border-[var(--ui-success-border)] hover:border-[var(--ui-success-border)]",
      iconBg: "bg-[var(--ui-success-border)] text-[var(--ui-success)]",
    },
    {
      title: "Total Credit",
      value: `৳ ${formatMoney(totalDue)}`,
      icon: FaExclamationCircle,
      color: "text-[var(--ui-danger)]",
      bg: "bg-[var(--ui-danger-light)]/60 border-[var(--ui-danger-border)] hover:border-[var(--ui-danger-border)]",
      iconBg: "bg-[var(--ui-danger-border)] text-[var(--ui-danger)]",
    },
    {
      title: isSale ? "Avg. Sale Value" : "Avg. Purchase Value",
      value: `৳ ${formatMoney(totalCount > 0 ? totalAmount / totalCount : 0)}`,
      icon: FaReceipt,
      color: "text-[var(--ui-info)]",
      bg: "bg-[var(--ui-info-light)]/60 border-[var(--ui-info-border)] hover:border-[var(--ui-info-border)]",
      iconBg: "bg-[var(--ui-info-border)] text-[var(--ui-info)]",
    },
  ];

  return <TradeStatsCards cards={cards} />;
};

export default TradeInvoiceStats;

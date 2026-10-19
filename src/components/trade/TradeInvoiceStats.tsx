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
      color: "text-blue-600",
      bg: "bg-blue-50/60 border-blue-300 hover:border-blue-400",
      iconBg: "bg-blue-100 text-blue-600",
    },
    {
      title: "Total Paid",
      value: `৳ ${formatMoney(totalPaid)}`,
      icon: FaMoneyBillWave,
      color: "text-emerald-600",
      bg: "bg-emerald-50/60 border-emerald-300 hover:border-emerald-400",
      iconBg: "bg-emerald-100 text-emerald-600",
    },
    {
      title: "Total Credit",
      value: `৳ ${formatMoney(totalDue)}`,
      icon: FaExclamationCircle,
      color: "text-rose-600",
      bg: "bg-rose-50/60 border-rose-300 hover:border-rose-400",
      iconBg: "bg-rose-100 text-rose-600",
    },
    {
      title: isSale ? "Avg. Sale Value" : "Avg. Purchase Value",
      value: `৳ ${formatMoney(totalCount > 0 ? totalAmount / totalCount : 0)}`,
      icon: FaReceipt,
      color: "text-purple-600",
      bg: "bg-purple-50/60 border-purple-300 hover:border-purple-400",
      iconBg: "bg-purple-100 text-purple-600",
    },
  ];

  return <TradeStatsCards cards={cards} />;
};

export default TradeInvoiceStats;

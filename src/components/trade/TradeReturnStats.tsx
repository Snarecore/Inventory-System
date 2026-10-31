import React from "react";
import { FaUndoAlt, FaMoneyBillWave, FaExclamationCircle, FaReceipt } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import TradeStatsCards from "@/components/trade/TradeStatsCards";

export interface TradeReturnStatsProps {
  totalCount: number;
  totalRefundAmount: number;
  totalCashRefund: number;
  totalCreditAdjust: number;
}

export const TradeReturnStats: React.FC<TradeReturnStatsProps> = ({
  totalCount,
  totalRefundAmount,
  totalCashRefund,
  totalCreditAdjust,
}) => {
  const cards = [
    {
      title: "Total Returns",
      value: `৳ ${formatMoney(totalRefundAmount)}`,
      icon: FaUndoAlt,
      color: "text-[var(--primary-color)]",
      bg: "bg-[var(--primary-color-light)]/60 border-[var(--primary-color-muted)] hover:border-[var(--primary-color-muted)]",
      iconBg: "bg-[var(--primary-color-muted)] text-[var(--primary-color)]",
    },
    {
      title: "Cash Refunded",
      value: `৳ ${formatMoney(totalCashRefund)}`,
      icon: FaMoneyBillWave,
      color: "text-[var(--ui-success)]",
      bg: "bg-[var(--ui-success-light)]/60 border-[var(--ui-success-border)] hover:border-[var(--ui-success-border)]",
      iconBg: "bg-[var(--ui-success-border)] text-[var(--ui-success)]",
    },
    {
      title: "Credit / Due Adjusted",
      value: `৳ ${formatMoney(totalCreditAdjust)}`,
      icon: FaExclamationCircle,
      color: "text-[var(--ui-danger)]",
      bg: "bg-[var(--ui-danger-light)]/60 border-[var(--ui-danger-border)] hover:border-[var(--ui-danger-border)]",
      iconBg: "bg-[var(--ui-danger-border)] text-[var(--ui-danger)]",
    },
    {
      title: "Avg. Return Value",
      value: `৳ ${formatMoney(totalCount > 0 ? totalRefundAmount / totalCount : 0)}`,
      icon: FaReceipt,
      color: "text-[var(--ui-info)]",
      bg: "bg-[var(--ui-info-light)]/60 border-[var(--ui-info-border)] hover:border-[var(--ui-info-border)]",
      iconBg: "bg-[var(--ui-info-border)] text-[var(--ui-info)]",
    },
  ];

  return <TradeStatsCards cards={cards} />;
};

export default TradeReturnStats;

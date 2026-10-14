import React from "react";
import { FaUndoAlt, FaMoneyBillWave, FaExclamationCircle, FaReceipt } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";

interface PurchaseReturnStatsProps {
  totalCount: number;
  totalRefundAmount: number;
  totalCashRefund: number;
  totalCreditAdjust: number;
}

const PurchaseReturnStats: React.FC<PurchaseReturnStatsProps> = ({
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
      color: "text-blue-600",
      bg: "bg-blue-50/60 border-blue-300 hover:border-blue-400",
      iconBg: "bg-blue-100 text-blue-600",
    },
    {
      title: "Cash Refunded",
      value: `৳ ${formatMoney(totalCashRefund)}`,
      icon: FaMoneyBillWave,
      color: "text-emerald-600",
      bg: "bg-emerald-50/60 border-emerald-300 hover:border-emerald-400",
      iconBg: "bg-emerald-100 text-emerald-600",
    },
    {
      title: "Credit / Due Adjusted",
      value: `৳ ${formatMoney(totalCreditAdjust)}`,
      icon: FaExclamationCircle,
      color: "text-rose-600",
      bg: "bg-rose-50/60 border-rose-300 hover:border-rose-400",
      iconBg: "bg-rose-100 text-rose-600",
    },
    {
      title: "Avg. Return Value",
      value: `৳ ${formatMoney(totalCount > 0 ? totalRefundAmount / totalCount : 0)}`,
      icon: FaReceipt,
      color: "text-purple-600",
      bg: "bg-purple-50/60 border-purple-300 hover:border-purple-400",
      iconBg: "bg-purple-100 text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all shadow-xs ${card.bg}`}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-black tracking-wider truncate">
                {card.title}
              </span>
              <span className={`text-base sm:text-lg font-bold truncate mt-0.5 ${card.color}`}>
                {card.value}
              </span>
            </div>
            <div className={`p-2 rounded-lg shrink-0 ${card.iconBg}`}>
              <Icon size={16} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PurchaseReturnStats;

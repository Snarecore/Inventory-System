import React from "react";
import { FaShoppingBag, FaMoneyBillWave, FaExclamationCircle, FaReceipt } from "react-icons/fa";

interface PurchaseStatsProps {
  totalCount: number;
  totalAmount: number;
  totalPaid: number;
  totalDue: number;
}

const PurchaseStats: React.FC<PurchaseStatsProps> = ({
  totalCount,
  totalAmount,
  totalPaid,
  totalDue,
}) => {
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const cards = [
    {
      title: "Total Purchases",
      value: `৳ ${formatMoney(totalAmount)}`,
      icon: FaShoppingBag,
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-100",
      iconBg: "bg-blue-100 text-blue-600",
    },
    {
      title: "Total Paid",
      value: `৳ ${formatMoney(totalPaid)}`,
      icon: FaMoneyBillWave,
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-100",
      iconBg: "bg-emerald-100 text-emerald-600",
    },
    {
      title: "Total Due / Credit",
      value: `৳ ${formatMoney(totalDue)}`,
      icon: FaExclamationCircle,
      color: "text-rose-600",
      bg: "bg-rose-50 border-rose-100",
      iconBg: "bg-rose-100 text-rose-600",
    },
    {
      title: "Avg. Purchase Value",
      value: `৳ ${formatMoney(totalCount > 0 ? totalAmount / totalCount : 0)}`,
      icon: FaReceipt,
      color: "text-purple-600",
      bg: "bg-purple-50 border-purple-100",
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
            className={`p-2.5 sm:p-3 rounded-lg border bg-white shadow-xs flex items-center justify-between gap-2.5 transition-all hover:shadow-sm ${card.bg}`}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider truncate">
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

export default PurchaseStats;

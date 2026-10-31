import React from "react";
import { FaExclamationCircle, FaMoneyBillWave, FaReceipt, FaShoppingCart } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";

export interface SaleStatsProps {
  totalCount: number;
  totalAmount: number;
  totalPaid: number;
  totalDue: number;
}

export const SaleStats: React.FC<SaleStatsProps> = (props) => {
  const cards = [
    {
      title: "Total Sales",
      value: props.totalAmount,
      icon: FaShoppingCart,
      accent: "text-[var(--primary-color-dark)]",
      iconStyle: "bg-[var(--primary-color-light)] text-[var(--primary-color-dark)]",
    },
    {
      title: "Total Paid",
      value: props.totalPaid,
      icon: FaMoneyBillWave,
      accent: "text-[var(--ui-success-dark)]",
      iconStyle: "bg-[var(--ui-success-light)] text-[var(--ui-success-dark)]",
    },
    {
      title: "Outstanding Credit",
      value: props.totalDue,
      icon: FaExclamationCircle,
      accent: "text-[var(--ui-danger-dark)]",
      iconStyle: "bg-[var(--ui-danger-light)] text-[var(--ui-danger-dark)]",
    },
    {
      title: "Average Sale",
      value: props.totalCount ? props.totalAmount / props.totalCount : 0,
      icon: FaReceipt,
      accent: "text-[var(--ui-info-dark)]",
      iconStyle: "bg-[var(--ui-info-light)] text-[var(--ui-info-dark)]",
    },
  ];

  return (
    <div className="grid w-full grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-3.5 shadow-sm transition hover:border-[var(--ui-border-strong)] hover:shadow-md sm:p-4"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-[var(--ui-text-muted)] sm:text-sm">{card.title}</p>
              <p className={`mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl ${card.accent}`}>
                ৳ {formatMoney(card.value)}
              </p>
            </div>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.iconStyle}`}>
              <Icon size={17} />
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default SaleStats;

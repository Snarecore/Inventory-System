import React from "react";
import { useTranslation } from "react-i18next";
import {
  FaWallet,
  FaCoins,
  FaHourglassHalf,
  FaChartLine,
  FaUserFriends,
  FaShoppingBag,
} from "react-icons/fa";
import type { ReferralSummary, WalletBalance } from "@/types/referral.types";
import { formatTaka } from "@/services/referral-service";

interface ReferralStatCardsProps {
  summary: ReferralSummary | null;
  balance: WalletBalance | null;
  onOpenWithdraw: () => void;
}

export const ReferralStatCards: React.FC<ReferralStatCardsProps> = ({
  summary,
  balance,
  onOpenWithdraw,
}) => {
  const { t } = useTranslation();

  const availablePoisha =
    balance?.availablePoisha ?? summary?.wallet?.availablePoisha ?? 0;
  const spendablePoisha =
    balance?.spendablePoisha ?? (availablePoisha + (summary?.wallet?.heldPoisha ?? 0));
  const heldPoisha = balance?.heldPoisha ?? summary?.wallet?.heldPoisha ?? 0;

  const totalEarnedPoisha = summary?.commission?.totalEarnedPoisha ?? 0;
  const totalRegistrations = summary?.registrations?.total ?? 0;
  const totalPurchases = summary?.purchases?.totalCount ?? 0;

  const cards = [
    {
      id: "available",
      title: "Available to Withdraw",
      value: formatTaka(availablePoisha),
      icon: FaWallet,
      iconColor: "text-[var(--color-primary)] bg-[var(--primary-color-light)]",
      valueColor: "text-[var(--ui-text)]",
      actionText: t("Request Payout"),
      onAction: onOpenWithdraw,
    },
    {
      id: "spendable",
      title: "Spendable on Packages",
      value: formatTaka(spendablePoisha),
      icon: FaCoins,
      iconColor: "text-[var(--color-primary)] bg-[var(--primary-color-light)]",
      valueColor: "text-[var(--color-primary)]",
    },
    {
      id: "held",
      title: "Held Balance",
      value: formatTaka(heldPoisha),
      icon: FaHourglassHalf,
      iconColor: "text-amber-600 bg-amber-50",
      valueColor: "text-amber-700",
      subNote: summary?.config?.holdDays != null ? `${summary.config.holdDays}d hold` : undefined,
    },
    {
      id: "lifetime",
      title: "Lifetime Earned",
      value: formatTaka(totalEarnedPoisha),
      icon: FaChartLine,
      iconColor: "text-blue-600 bg-blue-50",
      valueColor: "text-[var(--ui-text)]",
    },
    {
      id: "registrations",
      title: "Total Registrations",
      value: totalRegistrations,
      icon: FaUserFriends,
      iconColor: "text-purple-600 bg-purple-50",
      valueColor: "text-[var(--ui-text)]",
    },
    {
      id: "sales",
      title: "Successful Sales",
      value: totalPurchases,
      icon: FaShoppingBag,
      iconColor: "text-teal-600 bg-teal-50",
      valueColor: "text-[var(--ui-text)]",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 w-full">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="p-2 sm:p-2.5 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] shadow-xs flex items-center justify-between gap-1.5 transition-all hover:border-[var(--color-primary)]/40"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[10.5px] font-semibold text-[var(--ui-text-muted)] truncate">
                {t(card.title)}
              </span>
              <span
                className={`text-xs sm:text-sm font-bold truncate mt-0.5 font-mono ${card.valueColor}`}
              >
                {card.value}
              </span>
              {card.actionText && card.onAction ? (
                <button
                  type="button"
                  onClick={card.onAction}
                  className="text-[9.5px] text-[var(--color-primary)] hover:underline text-left mt-0.5 font-medium cursor-pointer"
                >
                  {card.actionText} →
                </button>
              ) : card.subNote ? (
                <span className="text-[9.5px] text-[var(--ui-text-muted)] opacity-80 mt-0.5">
                  {card.subNote}
                </span>
              ) : null}
            </div>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${card.iconColor}`}
            >
              <Icon size={12} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

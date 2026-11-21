import React from "react";
import { useTranslation } from "react-i18next";
import type { IconType } from "react-icons";

export interface StatCardItem {
  title: string;
  value: string | number;
  icon: IconType;
  color?: string;
  bg?: string;
  iconBg?: string;
}

export interface StatsCardsProps {
  cards: StatCardItem[];
  className?: string;
  gridClassName?: string;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  cards,
  className = "",
  gridClassName,
}) => {
  const { t } = useTranslation();

  const defaultGrid =
    cards.length === 5
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      : cards.length === 6
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
      : cards.length === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4";

  const effectiveGrid = gridClassName || defaultGrid;

  return (
    <div className={`grid ${effectiveGrid} gap-2.5 w-full ${className}`.trim()}>
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all shadow-xs ${
              card.bg || "bg-[var(--ui-surface-muted)]/60 border-[var(--ui-border-strong)] hover:border-[var(--ui-border-strong)]"
            }`}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[var(--ui-text)] truncate">
                {t(card.title)}
              </span>
              <span
                className={`text-base sm:text-lg font-bold truncate mt-0.5 ${
                  card.color || "text-[var(--ui-text)]"
                }`}
              >
                {card.value}
              </span>
            </div>
            <div
              className={`p-2 rounded-lg shrink-0 ${
                card.iconBg || "bg-[var(--ui-surface-sunken)] text-[var(--ui-text-muted)]"
              }`}
            >
              <Icon size={16} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Aliases for backwards compatibility with legacy Trade imports
export type TradeStatCardItem = StatCardItem;
export type TradeStatsCardsProps = StatsCardsProps;
export const TradeStatsCards = StatsCards;

export default StatsCards;

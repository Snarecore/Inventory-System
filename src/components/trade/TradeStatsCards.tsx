import React from "react";
import type { IconType } from "react-icons";

export interface TradeStatCardItem {
  title: string;
  value: string | number;
  icon: IconType;
  color?: string;
  bg?: string;
  iconBg?: string;
}

export interface TradeStatsCardsProps {
  cards: TradeStatCardItem[];
}

export const TradeStatsCards: React.FC<TradeStatsCardsProps> = ({ cards }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all shadow-xs ${
              card.bg || "bg-gray-50/60 border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-black truncate">
                {card.title}
              </span>
              <span
                className={`text-base sm:text-lg font-bold truncate mt-0.5 ${
                  card.color || "text-gray-900"
                }`}
              >
                {card.value}
              </span>
            </div>
            <div
              className={`p-2 rounded-lg shrink-0 ${
                card.iconBg || "bg-gray-100 text-gray-600"
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

export default TradeStatsCards;

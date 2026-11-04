import React from "react";
import TradeSettlementStatsCards from "@/components/settlement/TradeSettlementStatsCards";

export interface CollectionStatsCardsProps {
  totalDue: number;
  totalCustomers: number;
  avgDue: number;
  maxDue: number;
}

export const CollectionStatsCards: React.FC<CollectionStatsCardsProps> = ({
  totalDue,
  totalCustomers,
  avgDue,
  maxDue,
}) => {
  return (
    <TradeSettlementStatsCards
      partyType="customer"
      totalDue={totalDue}
      totalParties={totalCustomers}
      avgDue={avgDue}
      maxDue={maxDue}
    />
  );
};

export default CollectionStatsCards;

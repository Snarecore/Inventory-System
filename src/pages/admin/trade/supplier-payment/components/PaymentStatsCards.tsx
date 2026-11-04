import React from "react";
import TradeSettlementStatsCards from "@/components/settlement/TradeSettlementStatsCards";

export interface PaymentStatsCardsProps {
  totalDue: number;
  totalSuppliers: number;
  avgDue: number;
  maxDue: number;
}

export const PaymentStatsCards: React.FC<PaymentStatsCardsProps> = ({
  totalDue,
  totalSuppliers,
  avgDue,
  maxDue,
}) => {
  return (
    <TradeSettlementStatsCards
      partyType="supplier"
      totalDue={totalDue}
      totalParties={totalSuppliers}
      avgDue={avgDue}
      maxDue={maxDue}
    />
  );
};

export default PaymentStatsCards;

import React from "react";
import TradeInvoiceStats from "@/components/trade/TradeInvoiceStats";

export interface PurchaseStatsProps {
  totalCount: number;
  totalAmount: number;
  totalPaid: number;
  totalDue: number;
}

export const PurchaseStats: React.FC<PurchaseStatsProps> = (props) => {
  return <TradeInvoiceStats type="purchase" {...props} />;
};

export default PurchaseStats;

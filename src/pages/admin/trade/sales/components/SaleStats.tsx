import React from "react";
import TradeInvoiceStats from "@/components/trade/TradeInvoiceStats";

export interface SaleStatsProps {
  totalCount: number;
  totalAmount: number;
  totalPaid: number;
  totalDue: number;
}

export const SaleStats: React.FC<SaleStatsProps> = (props) => {
  return <TradeInvoiceStats type="sale" {...props} />;
};

export default SaleStats;

import React from "react";
import { FaHandHoldingUsd } from "react-icons/fa";
import type { CustomerDueItem } from "@/types/collection.types";
import { TradePartyDueTable } from "@/components/settlement/TradePartyDueTable";

interface CustomerDueTableProps {
  customers: CustomerDueItem[];
  isLoading?: boolean;
  isFetching?: boolean;
  onRefresh?: () => void;
  onCollect: (customer: CustomerDueItem) => void;
}

export const CustomerDueTable: React.FC<CustomerDueTableProps> = ({
  customers,
  isLoading = false,
  onCollect,
}) => {
  return (
    <TradePartyDueTable
      parties={customers}
      partyType="customer"
      isLoading={isLoading}
      onAction={onCollect}
      actionLabel="Collect"
      actionIcon={<FaHandHoldingUsd size={12} />}
      storageKey="customer_dues_columns"
      showIdColumn={false}
      excelFileName="Customer_Dues.xlsx"
    />
  );
};

export default CustomerDueTable;

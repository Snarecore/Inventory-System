import React from "react";
import { FaMoneyBillWave } from "react-icons/fa";
import type { SupplierDueItem } from "@/types/payment.types";
import { TradePartyDueTable } from "@/components/settlement/TradePartyDueTable";

interface SupplierDueTableProps {
  suppliers: SupplierDueItem[];
  isLoading?: boolean;
  isFetching?: boolean;
  onRefresh?: () => void;
  onPay: (supplier: SupplierDueItem) => void;
}

export const SupplierDueTable: React.FC<SupplierDueTableProps> = ({
  suppliers,
  isLoading = false,
  onPay,
}) => {
  return (
    <TradePartyDueTable
      parties={suppliers}
      partyType="supplier"
      isLoading={isLoading}
      onAction={onPay}
      actionLabel="Pay Now"
      actionIcon={<FaMoneyBillWave size={12} />}
      storageKey="supplier_dues_columns"
      showIdColumn={true}
      excelFileName="Supplier_Dues.xlsx"
    />
  );
};

export default SupplierDueTable;

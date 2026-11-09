import React from "react";
import TradeDueInvoiceAllocationTable, {
  type TradeDueInvoiceAllocationTableProps,
} from "@/components/settlement/TradeDueInvoiceAllocationTable";

export type DuePurchaseInvoiceAllocationTableProps = Omit<TradeDueInvoiceAllocationTableProps, "partyType">;

export const DuePurchaseInvoiceAllocationTable: React.FC<DuePurchaseInvoiceAllocationTableProps> = (props) => {
  return <TradeDueInvoiceAllocationTable {...props} partyType="supplier" />;
};

export default DuePurchaseInvoiceAllocationTable;

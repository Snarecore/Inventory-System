import React from "react";
import TradeDueInvoiceAllocationTable, {
  type TradeDueInvoiceAllocationTableProps,
} from "@/components/settlement/TradeDueInvoiceAllocationTable";

export type DueInvoiceAllocationTableProps = Omit<TradeDueInvoiceAllocationTableProps, "partyType">;

export const DueInvoiceAllocationTable: React.FC<DueInvoiceAllocationTableProps> = (props) => {
  return <TradeDueInvoiceAllocationTable {...props} partyType="customer" />;
};

export default DueInvoiceAllocationTable;

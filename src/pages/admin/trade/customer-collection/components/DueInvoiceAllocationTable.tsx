import React from "react";
import TradeDueInvoiceAllocationTable from "@/components/settlement/TradeDueInvoiceAllocationTable";
import type { InvoiceDueItem, CollectionAllocation } from "@/types/collection.types";
import type { TenderBreakdown } from "@/hooks/useMultiTenderSettlement";

export type { TenderBreakdown };

export interface DueInvoiceAllocationTableProps {
  invoices: InvoiceDueItem[];
  isLoading: boolean;
  selectedInvoiceNos: Set<string>;
  onToggleInvoice: (invoiceNo: string) => void;
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
  allocations: CollectionAllocation[];
  isManualMode: boolean;
  onToggleManualMode: () => void;
  tenderBreakdown?: TenderBreakdown;
}

export const DueInvoiceAllocationTable: React.FC<DueInvoiceAllocationTableProps> = (props) => {
  return <TradeDueInvoiceAllocationTable {...props} partyType="customer" />;
};

export default DueInvoiceAllocationTable;

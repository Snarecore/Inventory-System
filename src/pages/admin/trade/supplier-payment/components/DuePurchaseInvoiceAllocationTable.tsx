import React from "react";
import TradeDueInvoiceAllocationTable from "@/components/settlement/TradeDueInvoiceAllocationTable";
import type { PurchaseInvoiceDueItem, PaymentAllocation } from "@/types/payment.types";
import type { TenderBreakdown } from "@/hooks/useMultiTenderSettlement";

export type { TenderBreakdown };

export interface DuePurchaseInvoiceAllocationTableProps {
  invoices: PurchaseInvoiceDueItem[];
  isLoading: boolean;
  selectedInvoiceNos: Set<string>;
  onToggleInvoice: (invoiceNo: string) => void;
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
  allocations: PaymentAllocation[];
  isManualMode: boolean;
  onToggleManualMode: () => void;
  tenderBreakdown?: TenderBreakdown;
}

export const DuePurchaseInvoiceAllocationTable: React.FC<DuePurchaseInvoiceAllocationTableProps> = (props) => {
  return <TradeDueInvoiceAllocationTable {...props} partyType="supplier" />;
};

export default DuePurchaseInvoiceAllocationTable;

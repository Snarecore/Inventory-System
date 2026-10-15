import React from "react";
import type { SalesReturnItem } from "@/types";
import TradeInvoiceModal from "@/components/invoice/TradeInvoiceModal";
import { normalizeSalesReturnInvoice } from "@/components/invoice/trade-invoice-adapters";

export interface SalesReturnInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnData: SalesReturnItem | null;
  autoPrint?: boolean;
}

export const SalesReturnInvoiceModal: React.FC<SalesReturnInvoiceModalProps> = ({
  isOpen,
  onClose,
  returnData,
  autoPrint = false,
}) => {
  if (!isOpen || !returnData) return null;

  const invoiceData = normalizeSalesReturnInvoice(returnData);

  return (
    <TradeInvoiceModal
      isOpen={isOpen}
      onClose={onClose}
      invoice={invoiceData}
      autoPrint={autoPrint}
    />
  );
};

export default SalesReturnInvoiceModal;

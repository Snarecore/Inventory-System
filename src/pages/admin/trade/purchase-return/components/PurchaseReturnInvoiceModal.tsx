import React from "react";
import type { PurchaseReturnItem } from "@/types";
import TradeInvoiceModal from "@/components/invoice/TradeInvoiceModal";
import { normalizePurchaseReturnInvoice } from "@/components/invoice/trade-invoice-adapters";

export interface PurchaseReturnInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnData: PurchaseReturnItem | null;
  autoPrint?: boolean;
}

export const PurchaseReturnInvoiceModal: React.FC<PurchaseReturnInvoiceModalProps> = ({
  isOpen,
  onClose,
  returnData,
  autoPrint = false,
}) => {
  if (!isOpen || !returnData) return null;

  const invoiceData = normalizePurchaseReturnInvoice(returnData);

  return (
    <TradeInvoiceModal
      isOpen={isOpen}
      onClose={onClose}
      invoice={invoiceData}
      autoPrint={autoPrint}
    />
  );
};

export default PurchaseReturnInvoiceModal;

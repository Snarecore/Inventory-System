import React from "react";
import type { PurchaseItem } from "@/types";
import TradeInvoiceModal from "@/components/invoice/TradeInvoiceModal";
import { normalizePurchaseInvoice } from "@/components/invoice/trade-invoice-adapters";

export interface PurchaseInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: PurchaseItem | null;
  autoPrint?: boolean;
}

export const PurchaseInvoiceModal: React.FC<PurchaseInvoiceModalProps> = ({
  isOpen,
  onClose,
  purchase,
  autoPrint = false,
}) => {
  if (!isOpen || !purchase) return null;

  const invoiceData = normalizePurchaseInvoice(purchase);

  return (
    <TradeInvoiceModal
      isOpen={isOpen}
      onClose={onClose}
      invoice={invoiceData}
      autoPrint={autoPrint}
    />
  );
};

export default PurchaseInvoiceModal;

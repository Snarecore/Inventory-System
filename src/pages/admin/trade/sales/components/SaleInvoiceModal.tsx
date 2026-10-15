import React from "react";
import type { SaleItem } from "@/types";
import TradeInvoiceModal from "@/components/invoice/TradeInvoiceModal";
import { normalizeSaleInvoice } from "@/components/invoice/trade-invoice-adapters";

export interface SaleInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleItem | null;
  autoPrint?: boolean;
}

export const SaleInvoiceModal: React.FC<SaleInvoiceModalProps> = ({
  isOpen,
  onClose,
  sale,
  autoPrint = false,
}) => {
  if (!isOpen || !sale) return null;

  const invoiceData = normalizeSaleInvoice(sale);

  return (
    <TradeInvoiceModal
      isOpen={isOpen}
      onClose={onClose}
      invoice={invoiceData}
      autoPrint={autoPrint}
    />
  );
};

export default SaleInvoiceModal;

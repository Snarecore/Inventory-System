import React, { useMemo } from "react";
import { usePurchasesInvoicesDueQuery } from "@/hooks/usePurchasesInvoicesDue";
import { usePaymentMutation } from "@/hooks/usePaymentMutation";
import { sortPurchaseInvoicesFIFO } from "@/services/payment-service";
import type { PaymentReceiptData, SupplierDueItem } from "@/types/payment.types";
import TradeAddSettlementModal from "@/components/settlement/TradeAddSettlementModal";

export interface AddPaymentModalProps {
  isOpen: boolean;
  supplier: SupplierDueItem | null;
  onClose: () => void;
  onSuccess?: (receiptData: PaymentReceiptData) => void;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  supplier,
  onClose,
  onSuccess,
}) => {
  const supplierId = supplier?.supplierId ? String(supplier.supplierId) : "";
  const { data: rawInvoices = [], isLoading: isInvoicesLoading } =
    usePurchasesInvoicesDueQuery(supplierId, {
      enabled: Boolean(isOpen && supplierId),
    });

  const invoices = useMemo(() => {
    return sortPurchaseInvoicesFIFO(rawInvoices);
  }, [rawInvoices]);

  const paymentMutation = usePaymentMutation();

  const handleSettlementSubmit = async (data: {
    settlementDate: string;
    finalPaymentMode: string;
    remark: string;
    allocations: any[];
    selectedBank: any;
    selectedMfs: any;
    numericTotalPaid: number;
    numericCash: number;
    numericBank: number;
    numericMfs: number;
    numericDiscount: number;
    totalSettleAmount: number;
  }) => {
    if (!supplier) return;

    const remainingTotalDue = Math.max(
      0,
      Number(supplier.totalDue || 0) - data.totalSettleAmount
    );

    const result = await paymentMutation.mutateAsync({
      supplierId: supplier.supplierId || supplier.id,
      supplierName: supplier.supplierName || supplier.name || "Supplier",
      supplierPhone: supplier.supplierPhone || supplier.phone || "",
      paymentDate: data.settlementDate,
      paymentMode: data.finalPaymentMode,
      remark: data.remark,
      allocations: data.allocations,
      selectedBank: data.selectedBank,
      selectedMfs: data.selectedMfs,
      totalPaid: data.numericTotalPaid,
      totalDiscount: data.numericDiscount,
      remainingTotalDue,
      cashAmount: data.numericCash,
      bankAmount: data.numericBank,
      mfsAmount: data.numericMfs,
    });

    onClose();

    if (onSuccess && result?.success) {
      const receiptData: PaymentReceiptData = {
        receiptNo: `PAY-${Date.now().toString().slice(-6)}`,
        paymentDate: data.settlementDate,
        supplierName: supplier.supplierName || supplier.name || "Supplier",
        supplierPhone: supplier.supplierPhone || supplier.phone || "",
        supplierId: supplier.supplierId || supplier.id,
        totalAmount: data.numericTotalPaid,
        totalDiscount: data.numericDiscount,
        paymentMode: data.finalPaymentMode,
        cashAmount: data.numericCash,
        bankAmount: data.numericBank,
        mfsAmount: data.numericMfs,
        bankDetails: data.selectedBank
          ? {
              bankName: data.selectedBank.bankName,
              accountNumber: data.selectedBank.accountNo,
              accountHolderName: data.selectedBank.bankAccountName,
            }
          : null,
        mfsDetails: data.selectedMfs
          ? {
              mfsName: data.selectedMfs.mfsName,
              mfsPhone: data.selectedMfs.mfsPhone,
            }
          : null,
        remark: data.remark.trim(),
        allocations: data.allocations.map((a: any) => ({
          invoiceNo: a.invoiceNo,
          paidAmount: a.allocatedPaid ?? a.allocatedAmount ?? a.paidAmount ?? 0,
          discountAmount: a.allocatedDiscount ?? 0,
          dueAmount: a.remainingDue ?? a.dueAmount ?? 0,
        })),
      };

      onSuccess(receiptData);
    }
  };

  return (
    <TradeAddSettlementModal
      isOpen={isOpen}
      partyType="supplier"
      party={supplier}
      invoices={invoices}
      isInvoicesLoading={isInvoicesLoading}
      isSubmitting={paymentMutation.isPending}
      onClose={onClose}
      onSubmit={handleSettlementSubmit}
    />
  );
};

export default AddPaymentModal;

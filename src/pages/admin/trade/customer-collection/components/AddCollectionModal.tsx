import React, { useMemo } from "react";
import { useCustomerInvoicesDueQuery } from "@/hooks/useCustomerInvoicesDue";
import { useCollectionMutation } from "@/hooks/useCollectionMutation";
import { sortInvoicesFIFO } from "@/services/collection-service";
import type { CollectionReceiptData } from "./CollectionReceiptModal";
import type { CustomerDueItem } from "@/types/collection.types";
import TradeAddSettlementModal from "@/components/settlement/TradeAddSettlementModal";
import { usePermission } from "@/hooks/usePermission";
import { showErrorToast } from "@/utils/toast-utils";

export interface AddCollectionModalProps {
  isOpen: boolean;
  customer: CustomerDueItem | null;
  onClose: () => void;
  onSuccess?: (receiptData: CollectionReceiptData) => void;
}

export const AddCollectionModal: React.FC<AddCollectionModalProps> = ({
  isOpen,
  customer,
  onClose,
  onSuccess,
}) => {
  const { canCreate } = usePermission();
  const customerId = customer?.customerId ? String(customer.customerId) : "";
  const { data: rawInvoices = [], isLoading: isInvoicesLoading } =
    useCustomerInvoicesDueQuery(customerId, {
      enabled: Boolean(isOpen && customerId),
    });

  const invoices = useMemo(() => {
    return sortInvoicesFIFO(rawInvoices);
  }, [rawInvoices]);

  const collectionMutation = useCollectionMutation();

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
    if (!customer) return;

    if (!canCreate("customer_collection")) {
      showErrorToast("You do not have permission to record customer collection.");
      return;
    }

    const result = await collectionMutation.mutateAsync({
      customerId: customer.customerId,
      customerName: customer.customerName,
      customerPhone: customer.customerPhone,
      collectionDate: data.settlementDate,
      paymentMode: data.finalPaymentMode,
      remark: data.remark,
      allocations: data.allocations,
      selectedBank: data.selectedBank,
      selectedMfs: data.selectedMfs,
      totalPaid: data.numericTotalPaid,
      cashPaid: data.numericCash,
      bankPaid: data.numericBank,
      mfsPaid: data.numericMfs,
      discount: data.numericDiscount,
      totalSettled: data.totalSettleAmount,
    });

    onClose();

    if (onSuccess && result) {
      onSuccess({
        receiptNo: result.collectionNo,
        collectionDate: data.settlementDate,
        customerName: customer.customerName,
        customerPhone: customer.customerPhone,
        customerId: customer.customerId || (customer as any).id || "",
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
        remark: data.remark,
        allocations: data.allocations
          .filter((a: any) => (a.allocatedPaid ?? a.allocatedAmount ?? 0) > 0 || (a.allocatedDiscount ?? 0) > 0)
          .map((a: any) => ({
            invoiceNo: a.invoiceNo,
            paidAmount: a.allocatedPaid ?? a.allocatedAmount ?? a.paidAmount ?? 0,
            discountAmount: a.allocatedDiscount ?? 0,
            dueAmount: a.remainingDue ?? a.dueAmount ?? 0,
          })),
        customerAddress: customer.customerAddress,
        totalCollected: data.numericTotalPaid,
        discount: data.numericDiscount,
        totalSettled: data.totalSettleAmount,
        previousDue: Number(customer.totalDue || 0),
        remainingDue: Math.max(0, Number(customer.totalDue || 0) - data.totalSettleAmount),
        rawResult: result,
      } as any);
    }
  };

  return (
    <TradeAddSettlementModal
      isOpen={isOpen}
      partyType="customer"
      party={customer}
      invoices={invoices}
      isInvoicesLoading={isInvoicesLoading}
      isSubmitting={collectionMutation.isPending}
      onClose={onClose}
      onSubmit={handleSettlementSubmit}
    />
  );
};

export default AddCollectionModal;

import React, { useMemo } from "react";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import TextInput from "@/components/form/TextInput";
import { useCustomerInvoicesDueQuery } from "@/hooks/useCustomerInvoicesDue";
import { useCollectionMutation } from "@/hooks/useCollectionMutation";
import { sortInvoicesFIFO } from "@/services/collection-service";
import DueInvoiceAllocationTable from "./DueInvoiceAllocationTable";
import type { CollectionReceiptData } from "./CollectionReceiptModal";
import { formatMoney } from "@/utils/formatters";
import { showErrorToast } from "@/utils/toast-utils";
import type { CustomerDueItem } from "@/types/collection.types";
import { useMultiTenderSettlement } from "@/hooks/useMultiTenderSettlement";
import { MultiTenderFormSection } from "@/components/settlement/MultiTenderFormSection";

interface AddCollectionModalProps {
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
  const customerId = customer?.customerId ? String(customer.customerId) : "";
  const { data: rawInvoices = [], isLoading: isInvoicesLoading } =
    useCustomerInvoicesDueQuery(customerId, {
      enabled: Boolean(isOpen && customerId),
    });

  const invoices = useMemo(() => {
    return sortInvoicesFIFO(rawInvoices);
  }, [rawInvoices]);

  const settlement = useMultiTenderSettlement({
    isOpen,
    totalDue: Number(customer?.totalDue || 0),
    entityId: customer?.customerId || customer?.id,
    invoices,
  });

  const {
    settlementDate: collectionDate,
    remark,
    setRemark,
    isManualMode,
    selectedInvoiceNos,
    selectedBankObj,
    selectedMfsObj,
    numericCash,
    numericBank,
    numericMfs,
    numericTotalPaid,
    numericDiscount,
    totalSettleAmount,
    effectiveMaxDue,
    finalPaymentMode,
    tenderBreakdown,
    allocations,
    remainingTotalDue,
    handleToggleInvoice,
    handleToggleSelectAll,
    handleToggleManualMode,
    isAllSelected,
    validateSettlement,
  } = settlement;

  const collectionMutation = useCollectionMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (collectionMutation.isPending) return;

    if (!customer) {
      showErrorToast("No customer selected");
      return;
    }

    const validation = validateSettlement();
    if (!validation.isValid) {
      showErrorToast(validation.error || "Validation error");
      return;
    }

    try {
      const result = await collectionMutation.mutateAsync({
        customerId: customer.customerId,
        customerName: customer.customerName,
        customerPhone: customer.customerPhone,
        collectionDate,
        paymentMode: finalPaymentMode,
        remark,
        allocations,
        selectedBank: selectedBankObj,
        selectedMfs: selectedMfsObj,
        totalCollected: numericTotalPaid,
        totalDiscount: numericDiscount,
        remainingTotalDue,
        cashAmount: numericCash,
        bankAmount: numericBank,
        mfsAmount: numericMfs,
      });

      if (result.success) {
        const receiptData: CollectionReceiptData = {
          receiptNo: `REC-${Date.now().toString().slice(-6)}`,
          collectionDate,
          customerName: customer.customerName,
          customerPhone: customer.customerPhone,
          customerId: customer.customerId,
          totalAmount: numericTotalPaid,
          totalDiscount: numericDiscount,
          paymentMode: finalPaymentMode,
          cashAmount: numericCash,
          bankAmount: numericBank,
          mfsAmount: numericMfs,
          bankDetails: selectedBankObj
            ? {
                bankName: selectedBankObj.bankName,
                accountNumber: selectedBankObj.accountNo,
                accountHolderName: selectedBankObj.bankAccountName,
              }
            : null,
          mfsDetails: selectedMfsObj
            ? {
                mfsName: selectedMfsObj.mfsName,
                mfsPhone: selectedMfsObj.mfsPhone,
              }
            : null,
          remark: remark.trim(),
          allocations: allocations.map((a) => ({
            invoiceNo: a.invoiceNo,
            paidAmount: a.allocatedPaid ?? a.allocatedAmount ?? a.paidAmount ?? 0,
            discountAmount: a.allocatedDiscount ?? 0,
            dueAmount: a.remainingDue ?? a.dueAmount ?? 0,
          })),
        };

        onSuccess?.(receiptData);
        onClose();
      }
    } catch (err: any) {
      console.error("Collection submission failed:", err);
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <Modal
      isOpen={isOpen}
      title="Customer Collection"
      onClose={onClose}
      width="w-full max-w-[700px]"
      className="!pt-2 !pb-2.5 sm:!pt-2 sm:!pb-3"
      headerClassName="!pb-1"
      bodyClassName="!mt-1.5"
    >
      <form onSubmit={handleSubmit} className="space-y-1.5">
        {/* Customer Info Strip */}
        <div className="flex items-center justify-between gap-2.5 py-1 px-2.5 bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] rounded-lg text-xs whitespace-nowrap">
          {/* Customer Name & Phone */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-[var(--ui-text)] truncate">{customer.customerName}</span>
            {customer.customerPhone && (
              <span className="text-[var(--ui-text-muted)] text-[11px] truncate">
                ({customer.customerPhone})
              </span>
            )}
          </div>

          {/* Total Due */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[var(--ui-text-muted)] text-[11px] font-medium">Total Due:</span>
            <span className="text-sm font-bold text-[var(--ui-danger)]">
              ৳ {formatMoney(effectiveMaxDue)}
            </span>
          </div>
        </div>

        {/* Multi-Tender Form Section */}
        <MultiTenderFormSection settlement={settlement} dateLabel="Date" />

        {/* Due Invoices Table */}
        <DueInvoiceAllocationTable
          invoices={invoices}
          isLoading={isInvoicesLoading}
          selectedInvoiceNos={selectedInvoiceNos}
          onToggleInvoice={handleToggleInvoice}
          onToggleSelectAll={handleToggleSelectAll}
          isAllSelected={isAllSelected}
          allocations={allocations}
          isManualMode={isManualMode}
          onToggleManualMode={handleToggleManualMode}
          tenderBreakdown={tenderBreakdown}
        />

        {/* Remark & Action Buttons in One Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 pt-1 border-t border-[var(--ui-border)]">
          {/* Remark Input */}
          <div className="flex-1 min-w-0">
            <TextInput
              label="Remark / Notes"
              value={remark}
              onChange={(val) => setRemark(val)}
              placeholder="e.g. Paid in cash, cheque reference..."
              wrapperClass="!h-8 bg-[var(--ui-surface)] !border-[var(--ui-border)]"
              inputClass="font-semibold text-[var(--ui-text)]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              label="Cancel"
              onClick={onClose}
              type="button"
              disabled={collectionMutation.isPending}
              color="#6b7280"
              hoverColor="#4b5563"
              buttonClass="!text-xs !py-0 !px-3.5 h-8 font-semibold whitespace-nowrap"
            />
            <Button
              label={
                collectionMutation.isPending
                  ? "Saving..."
                  : numericDiscount > 0
                  ? `Confirm Collection (৳ ${formatMoney(numericTotalPaid)} + ৳ ${formatMoney(numericDiscount)} Disc)`
                  : `Confirm Collection (৳ ${formatMoney(numericTotalPaid)})`
              }
              type="submit"
              disabled={
                collectionMutation.isPending ||
                (numericTotalPaid <= 0 && numericDiscount <= 0) ||
                (effectiveMaxDue >= 0 && totalSettleAmount > effectiveMaxDue)
              }
              isLoading={collectionMutation.isPending}
              color="var(--primary-color)"
              hoverColor="var(--primary-color-hover)"
              buttonClass="!text-xs !py-0 !px-4 h-8 font-bold whitespace-nowrap"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AddCollectionModal;

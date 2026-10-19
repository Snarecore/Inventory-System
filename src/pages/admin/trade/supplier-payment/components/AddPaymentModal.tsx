import React, { useMemo } from "react";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import { usePurchasesInvoicesDueQuery } from "@/hooks/usePurchasesInvoicesDue";
import { usePaymentMutation } from "@/hooks/usePaymentMutation";
import { sortPurchaseInvoicesFIFO } from "@/services/payment-service";
import DuePurchaseInvoiceAllocationTable from "./DuePurchaseInvoiceAllocationTable";
import type { PaymentReceiptData, SupplierDueItem } from "@/types/payment.types";
import { formatMoney } from "@/utils/formatters";
import { showErrorToast } from "@/utils/toast-utils";
import { useMultiTenderSettlement } from "@/hooks/useMultiTenderSettlement";
import { MultiTenderFormSection } from "@/components/settlement/MultiTenderFormSection";

interface AddPaymentModalProps {
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

  const settlement = useMultiTenderSettlement({
    isOpen,
    totalDue: Number(supplier?.totalDue || 0),
    entityId: supplier?.supplierId || supplier?.id,
    invoices,
  });

  const {
    settlementDate: paymentDate,
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

  const paymentMutation = usePaymentMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentMutation.isPending) return;

    if (!supplier) {
      showErrorToast("No supplier selected");
      return;
    }

    const validation = validateSettlement();
    if (!validation.isValid) {
      showErrorToast(validation.error || "Validation error");
      return;
    }

    try {
      const result = await paymentMutation.mutateAsync({
        supplierId: supplier.supplierId || supplier.id,
        supplierName: supplier.supplierName || supplier.name || "Supplier",
        supplierPhone: supplier.supplierPhone || supplier.phone || "",
        paymentDate,
        paymentMode: finalPaymentMode,
        remark,
        allocations,
        selectedBank: selectedBankObj,
        selectedMfs: selectedMfsObj,
        totalPaid: numericTotalPaid,
        totalDiscount: numericDiscount,
        remainingTotalDue,
        cashAmount: numericCash,
        bankAmount: numericBank,
        mfsAmount: numericMfs,
      });

      if (result.success) {
        const receiptData: PaymentReceiptData = {
          receiptNo: `PAY-${Date.now().toString().slice(-6)}`,
          paymentDate,
          supplierName: supplier.supplierName || supplier.name || "Supplier",
          supplierPhone: supplier.supplierPhone || supplier.phone || "",
          supplierId: supplier.supplierId || supplier.id,
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
      console.error("Supplier payment submission failed:", err);
    }
  };

  if (!isOpen || !supplier) return null;

  return (
    <Modal
      isOpen={isOpen}
      title="Supplier Payment"
      onClose={onClose}
      width="w-full max-w-[730px]"
      className="!pt-2 !pb-2.5 sm:!pt-2 sm:!pb-3"
      headerClassName="!pb-1"
      bodyClassName="!mt-1.5"
    >
      <form onSubmit={handleSubmit} className="space-y-1.5">
        {/* Supplier Info Strip */}
        <div className="flex items-center justify-between gap-2.5 py-1 px-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs whitespace-nowrap">
          {/* Supplier Name & Phone */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-black truncate">{supplier.supplierName}</span>
            {supplier.supplierPhone && (
              <span className="text-gray-500 text-[11px] truncate">
                ({supplier.supplierPhone})
              </span>
            )}
          </div>

          {/* Total Due */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-gray-500 text-[11px] font-medium">Total Due:</span>
            <span className="text-sm font-bold text-rose-600">
              ৳ {formatMoney(effectiveMaxDue)}
            </span>
          </div>
        </div>

        {/* Payment Amount, Discount, Payment Method & Date in ONE line */}
        <MultiTenderFormSection settlement={settlement} dateLabel="Date" />

        {/* Due Purchase Invoices Table */}
        <DuePurchaseInvoiceAllocationTable
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 pt-1 border-t border-gray-100">
          {/* Remark Input */}
          <div className="flex-1 min-w-0">
            <label className="text-xs font-bold text-black block mb-0.5">
              Remark / Notes
            </label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. Paid in cash, cheque reference..."
              className="w-full h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg text-black font-semibold placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              label="Cancel"
              onClick={onClose}
              type="button"
              disabled={paymentMutation.isPending}
              color="#6b7280"
              hoverColor="#4b5563"
              buttonClass="!text-xs !py-0 !px-3.5 h-8 font-semibold whitespace-nowrap"
            />
            <Button
              label={
                paymentMutation.isPending
                  ? "Saving..."
                  : numericDiscount > 0
                  ? `Confirm Payment (৳ ${formatMoney(numericTotalPaid)} + ৳ ${formatMoney(numericDiscount)} Disc)`
                  : `Confirm Payment (৳ ${formatMoney(numericTotalPaid)})`
              }
              type="submit"
              disabled={
                paymentMutation.isPending ||
                (numericTotalPaid <= 0 && numericDiscount <= 0) ||
                (effectiveMaxDue >= 0 && totalSettleAmount > effectiveMaxDue)
              }
              isLoading={paymentMutation.isPending}
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

export default AddPaymentModal;

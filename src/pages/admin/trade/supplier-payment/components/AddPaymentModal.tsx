import React, { useState, useEffect } from "react";
import moment from "moment";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import DatePicker from "@/components/common/DatePicker";
import { usePurchasesInvoicesDueQuery as useSupplierInvoicesDueQuery } from "@/hooks/usePurchasesInvoicesDue";
import { useFinancialAccounts } from "@/hooks/useFinancialAccounts";
import { usePaymentMutation } from "@/hooks/usePaymentMutation";
import { sortInvoicesFIFO } from "@/services/collection-service";
import DuePurchaseInvoiceAllocationTable from "./DuePurchaseInvoiceAllocationTable";
import type { PaymentReceiptData } from "./PaymentReceiptModal";
import { formatMoney } from "@/utils/formatters";
import { showErrorToast, showSuccessToast } from "@/utils/toast-utils";
import type { SupplierDueItem } from "@/types/payment.types";
import { usePermission } from "@/hooks/usePermission";
import { computeFIFOAllocations } from "@/components/settlement/settlement-utils";
import TradePartyInfoStrip from "@/components/settlement/TradePartyInfoStrip";
import TradeQuickAmountSection from "@/components/settlement/TradeQuickAmountSection";
import TradePaymentTenderSection from "@/components/settlement/TradePaymentTenderSection";

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
  const { canCreate } = usePermission();
  const supplierId = supplier?.supplierId ? String(supplier.supplierId) : "";

  // 1. Fetch Invoices Due for Supplier
  const { data: rawInvoices = [], isLoading: isInvoicesLoading } =
    useSupplierInvoicesDueQuery(supplierId, {
      enabled: Boolean(isOpen && supplierId),
    });

  const invoices = sortInvoicesFIFO(rawInvoices);

  // 2. Fetch Bank & MFS Accounts
  const {
    registeredBankAccounts,
    registeredMfsAccounts,
    isLoading: isAccountsLoading,
  } = useFinancialAccounts();

  // 3. Payment Mutation
  const paymentMutation = usePaymentMutation();

  // 4. Form States
  const [amountInput, setAmountInput] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<"Cash" | "Bank" | "MFS">("Cash");
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [selectedMfsId, setSelectedMfsId] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(
    moment().format("YYYY-MM-DD")
  );
  const [remark, setRemark] = useState<string>("");
  const [selectedInvoiceNos, setSelectedInvoiceNos] = useState<Set<string>>(() => new Set());

  // Reset state on modal open
  useEffect(() => {
    if (isOpen && supplier) {
      setAmountInput("");
      setPaymentMode("Cash");
      setPaymentDate(moment().format("YYYY-MM-DD"));
      setRemark("");
      setSelectedInvoiceNos(new Set());
    }
  }, [isOpen, supplier?.supplierId]);

  // Set default bank if not selected
  useEffect(() => {
    if (!selectedBankId && registeredBankAccounts.length > 0) {
      setSelectedBankId(
        String(registeredBankAccounts[0].id || registeredBankAccounts[0].bankId || "")
      );
    }
  }, [registeredBankAccounts, selectedBankId]);

  // Set default MFS if not selected
  useEffect(() => {
    if (!selectedMfsId && registeredMfsAccounts.length > 0) {
      setSelectedMfsId(
        String(registeredMfsAccounts[0].id || registeredMfsAccounts[0].mfsId || "")
      );
    }
  }, [registeredMfsAccounts, selectedMfsId]);

  // Derived Account Objects
  const selectedBankObj =
    registeredBankAccounts.find(
      (b) => String(b.id || b.bankId) === String(selectedBankId)
    ) || null;

  const selectedMfsObj =
    registeredMfsAccounts.find(
      (m) => String(m.id || m.mfsId) === String(selectedMfsId)
    ) || null;

  // Derived Dues & Selection Calculations (Pure, no useMemo overhead)
  const totalDueFromInvoices =
    invoices.length > 0
      ? invoices.reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0)
      : Number(supplier?.totalDue || 0);

  const hasManualSelection = selectedInvoiceNos.size > 0;
  const selectedInvoicesDue = hasManualSelection
    ? invoices
        .filter((inv) => selectedInvoiceNos.has(inv.invoiceNo))
        .reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0)
    : 0;

  const effectiveTotalDue = hasManualSelection ? selectedInvoicesDue : totalDueFromInvoices;
  const effectiveInvoices = hasManualSelection
    ? invoices.filter((inv) => selectedInvoiceNos.has(inv.invoiceNo))
    : invoices;

  const enteredAmount = Math.max(0, parseFloat(amountInput) || 0);

  // FIFO Allocation Engine
  const allocations = computeFIFOAllocations(effectiveInvoices, enteredAmount);

  const allocatedAmount = Number(
    allocations.reduce((sum, a) => sum + (a.allocatedAmount || 0), 0).toFixed(2)
  );

  const remainingDue = Math.max(0, Number((effectiveTotalDue - allocatedAmount).toFixed(2)));

  const allocatedPct =
    effectiveTotalDue > 0
      ? Math.min(100, Math.round((allocatedAmount / effectiveTotalDue) * 100))
      : 0;

  const isAllSelected = invoices.length > 0 && selectedInvoiceNos.size === invoices.length;

  // Toggle invoice checkbox selection
  const handleToggleInvoice = (invoiceNo: string) => {
    setSelectedInvoiceNos((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceNo)) next.delete(invoiceNo);
      else next.add(invoiceNo);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedInvoiceNos(new Set());
    } else {
      setSelectedInvoiceNos(new Set(invoices.map((inv) => inv.invoiceNo)));
    }
  };

  // Form Submission Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMutation.isPending) return;

    if (!supplier) {
      showErrorToast("No supplier selected");
      return;
    }

    if (!canCreate("supplier_payment")) {
      showErrorToast("You do not have permission to record supplier payment.");
      return;
    }

    if (!allocatedAmount || allocatedAmount <= 0) {
      showErrorToast("Please enter a valid payment amount");
      return;
    }

    if (allocatedAmount > effectiveTotalDue) {
      showErrorToast(
        hasManualSelection
          ? "Payment amount cannot be greater than the selected bills' due"
          : "Payment amount cannot be greater than total due"
      );
      return;
    }

    if (paymentMode === "Bank" && !selectedBankObj) {
      showErrorToast("Please select a valid bank account");
      return;
    }

    if (paymentMode === "MFS" && !selectedMfsObj) {
      showErrorToast("Please select a valid MFS account");
      return;
    }

    const activeAllocations = allocations.filter((a) => (a.allocatedAmount || 0) > 0);
    if (invoices.length > 0 && activeAllocations.length === 0) {
      showErrorToast("No due purchase invoices were allocated with this amount");
      return;
    }

    const numCash = paymentMode === "Cash" ? allocatedAmount : 0;
    const numBank = paymentMode === "Bank" ? allocatedAmount : 0;
    const numMfs = paymentMode === "MFS" ? allocatedAmount : 0;

    try {
      const result = await paymentMutation.mutateAsync({
        supplierId: supplier.supplierId || supplier.id || "",
        supplierName: supplier.supplierName || "Supplier",
        supplierPhone: supplier.supplierPhone || "",
        paymentDate,
        paymentMode,
        remark: remark.trim(),
        allocations: activeAllocations,
        selectedBank: selectedBankObj,
        selectedMfs: selectedMfsObj,
        totalPaid: allocatedAmount,
        totalDiscount: 0,
        remainingTotalDue: remainingDue,
        cashAmount: numCash,
        bankAmount: numBank,
        mfsAmount: numMfs,
      });

      if (result.success) {
        showSuccessToast(result.msg || "Payment recorded successfully!");

        if (onSuccess) {
          const receiptData: PaymentReceiptData = {
            receiptNo: `PAY-${Date.now().toString().slice(-6)}`,
            paymentDate,
            supplierName: supplier.supplierName || "Supplier",
            supplierPhone: supplier.supplierPhone || "",
            supplierId: supplier.supplierId || supplier.id || "",
            totalAmount: allocatedAmount,
            totalDiscount: 0,
            paymentMode,
            cashAmount: numCash,
            bankAmount: numBank,
            mfsAmount: numMfs,
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
            allocations: activeAllocations.map((a) => ({
              invoiceNo: a.invoiceNo,
              paidAmount: a.allocatedAmount || 0,
              dueAmount: a.dueAmount || 0,
            })),
          };

          onSuccess(receiptData);
        }

        onClose();
      }
    } catch (err: any) {
      console.error("Payment submission failed:", err);
      showErrorToast(err?.message || "Failed to submit supplier payment");
    }
  };

  if (!isOpen || !supplier) return null;

  return (
    <Modal
      isOpen={isOpen}
      title="Supplier Due Payment"
      onClose={onClose}
      width="w-full max-w-[740px]"
      className="!pt-2 !pb-2.5 sm:!pt-2.5 sm:!pb-3.5"
      headerClassName="!pb-1.5"
      bodyClassName="!mt-1"
    >
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Supplier Information Strip */}
        <TradePartyInfoStrip
          name={supplier.supplierName}
          phone={supplier.supplierPhone}
          totalDue={effectiveTotalDue}
          partyType="supplier"
        />

        {/* Amount Input & Quick Chips & Progress Meter */}
        <TradeQuickAmountSection
          label="Payment Amount"
          placeholder="Enter payment amount (e.g. 500)"
          amountInput={amountInput}
          onAmountChange={setAmountInput}
          effectiveTotalDue={effectiveTotalDue}
          allocatedAmount={allocatedAmount}
          allocatedPct={allocatedPct}
        />

        {/* Due Purchase Bills Allocation Table */}
        <DuePurchaseInvoiceAllocationTable
          invoices={invoices}
          isLoading={isInvoicesLoading}
          selectedInvoiceNos={selectedInvoiceNos}
          onToggleInvoice={handleToggleInvoice}
          onToggleSelectAll={handleToggleSelectAll}
          isAllSelected={isAllSelected}
          allocations={allocations}
        />

        {/* Payment Tender Selector (Cash, Bank, MFS) */}
        <TradePaymentTenderSection
          paymentMode={paymentMode}
          onPaymentModeChange={setPaymentMode}
          bankAccounts={registeredBankAccounts}
          selectedBankId={selectedBankId}
          onBankChange={setSelectedBankId}
          mfsAccounts={registeredMfsAccounts}
          selectedMfsId={selectedMfsId}
          onMfsChange={setSelectedMfsId}
          isAccountsLoading={isAccountsLoading}
        />

        {/* Date and Remark Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
          <div>
            <label className="text-[11px] font-semibold text-[var(--ui-text)] mb-0.5 block">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <DatePicker
              value={paymentDate}
              onChange={(date: string) => setPaymentDate(date)}
              className="w-full text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[var(--ui-text)] mb-0.5 block">
              Remark / Note (Optional)
            </label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. Supplier payment via bank transfer"
              className="w-full px-2.5 py-1.5 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-md focus:border-[var(--primary-color)] focus:ring-1 focus:ring-[var(--primary-color)] outline-none text-[var(--ui-text)]"
            />
          </div>
        </div>

        {/* Summary Footer & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--ui-border)] mt-2">
          <div className="flex items-center gap-3 text-xs">
            <div>
              <span className="text-[10px] text-[var(--ui-text-muted)] block">Remaining Due</span>
              <span className="font-bold text-[var(--ui-text)]">৳{formatMoney(remainingDue)}</span>
            </div>
            <div className="h-6 w-px bg-[var(--ui-border)]" />
            <div>
              <span className="text-[10px] text-[var(--ui-text-muted)] block">Paying Now</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                ৳{formatMoney(allocatedAmount)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={paymentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={paymentMutation.isPending || allocatedAmount <= 0}
              className="bg-[var(--primary-color)] text-white hover:opacity-90"
            >
              {paymentMutation.isPending
                ? "Recording..."
                : `Pay ৳${formatMoney(allocatedAmount)}`}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AddPaymentModal;

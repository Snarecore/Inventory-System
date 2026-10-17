import React, { useState, useMemo, useEffect } from "react";
import { RiArrowDropDownLine } from "react-icons/ri";
import moment from "moment";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import { useCustomerInvoicesDueQuery } from "@/hooks/useCustomerInvoicesDue";
import { useFinancialAccounts } from "@/hooks/useFinancialAccounts";
import { useCollectionMutation } from "@/hooks/useCollectionMutation";
import {
  allocateCollectionFIFO,
  allocateCollectionManual,
} from "@/services/collection-service";
import DueInvoiceAllocationTable from "./DueInvoiceAllocationTable";
import type { CollectionReceiptData } from "./CollectionReceiptModal";
import { formatMoney } from "@/utils/formatters";
import { showErrorToast } from "@/utils/toast-utils";
import type { CustomerDueItem } from "@/types/collection.types";

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
  const { data: invoices = [], isLoading: isInvoicesLoading } =
    useCustomerInvoicesDueQuery(customerId);

  const { registeredBankAccounts, isLoading: isBankLoading } = useFinancialAccounts();
  const collectionMutation = useCollectionMutation();

  // Form States
  const [amountInput, setAmountInput] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<"Cash" | "Bank">("Cash");
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [collectionDate, setCollectionDate] = useState<string>(
    moment().format("YYYY-MM-DD")
  );
  const [remark, setRemark] = useState<string>("");
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [selectedInvoiceNos, setSelectedInvoiceNos] = useState<Set<string>>(
    () => new Set()
  );

  const customerTotalDue = useMemo(() => {
    if (invoices.length > 0) {
      return invoices.reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0);
    }
    return Number(customer?.totalDue || 0);
  }, [invoices, customer]);

  const selectedInvoicesDue = useMemo(() => {
    return invoices
      .filter((inv) => selectedInvoiceNos.has(inv.invoiceNo))
      .reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0);
  }, [invoices, selectedInvoiceNos]);

  const effectiveMaxDue = isManualMode && selectedInvoiceNos.size > 0
    ? selectedInvoicesDue
    : customerTotalDue;

  // Sync state on open
  useEffect(() => {
    if (isOpen && customer) {
      setAmountInput(String(customer.totalDue || ""));
      setPaymentMode("Cash");
      setSelectedBankId("");
      setCollectionDate(moment().format("YYYY-MM-DD"));
      setRemark("");
      setIsManualMode(false);
      setSelectedInvoiceNos(new Set());
    }
  }, [isOpen, customer]);

  // Set default bank
  useEffect(() => {
    if (registeredBankAccounts.length > 0 && !selectedBankId) {
      const firstBank = registeredBankAccounts[0];
      setSelectedBankId(String(firstBank.id || firstBank.bankId || ""));
    }
  }, [registeredBankAccounts, selectedBankId]);

  const numericAmount = Math.max(0, parseFloat(amountInput) || 0);

  const { allocations, allocatedTotal, remainingDue } = useMemo(() => {
    if (invoices.length === 0) {
      return {
        allocations: [],
        allocatedTotal: Math.min(numericAmount, customerTotalDue),
        remainingDue: Math.max(0, customerTotalDue - numericAmount),
      };
    }

    if (isManualMode && selectedInvoiceNos.size > 0) {
      return allocateCollectionManual(invoices, selectedInvoiceNos, numericAmount);
    }

    return allocateCollectionFIFO(invoices, numericAmount);
  }, [invoices, numericAmount, customerTotalDue, isManualMode, selectedInvoiceNos]);

  const handleToggleInvoice = (invNo: string) => {
    setSelectedInvoiceNos((prev) => {
      const next = new Set(prev);
      if (next.has(invNo)) next.delete(invNo);
      else next.add(invNo);
      return next;
    });
  };

  const isAllSelected = useMemo(() => {
    return (
      invoices.length > 0 &&
      invoices.every((inv) => selectedInvoiceNos.has(inv.invoiceNo))
    );
  }, [invoices, selectedInvoiceNos]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedInvoiceNos(new Set());
    } else {
      const next = new Set<string>();
      invoices.forEach((inv) => next.add(inv.invoiceNo));
      setSelectedInvoiceNos(next);
    }
  };

  const handleToggleManualMode = () => {
    setIsManualMode((prev) => {
      const next = !prev;
      if (next && selectedInvoiceNos.size === 0) {
        const initialSet = new Set<string>();
        invoices.forEach((i) => initialSet.add(i.invoiceNo));
        setSelectedInvoiceNos(initialSet);
      }
      return next;
    });
  };

  const handleQuickPercent = (pct: number) => {
    const target = effectiveMaxDue > 0 ? effectiveMaxDue : customerTotalDue;
    setAmountInput(String(Math.round(target * pct)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customer) {
      showErrorToast("No customer selected");
      return;
    }

    if (numericAmount <= 0) {
      showErrorToast("Please enter a valid amount greater than 0");
      return;
    }

    if (isManualMode && selectedInvoiceNos.size === 0) {
      showErrorToast("Please select at least one invoice in manual mode");
      return;
    }

    if (numericAmount > effectiveMaxDue && effectiveMaxDue > 0) {
      showErrorToast(
        `Collection amount cannot exceed due of ৳ ${formatMoney(effectiveMaxDue)}`
      );
      return;
    }

    let selectedBankObj = null;
    if (paymentMode === "Bank") {
      if (!selectedBankId) {
        showErrorToast("Please select a bank account");
        return;
      }
      selectedBankObj = registeredBankAccounts.find(
        (b) => String(b.id || b.bankId) === String(selectedBankId)
      );
    }

    try {
      const result = await collectionMutation.mutateAsync({
        customerId: customer.customerId,
        customerName: customer.customerName,
        customerPhone: customer.customerPhone,
        collectionDate,
        paymentMode,
        remark,
        allocations,
        selectedBank: selectedBankObj,
        totalCollected: allocatedTotal || numericAmount,
        remainingTotalDue: remainingDue,
      });

      if (result.success) {
        const receiptData: CollectionReceiptData = {
          receiptNo: `REC-${Date.now().toString().slice(-6)}`,
          collectionDate,
          customerName: customer.customerName,
          customerPhone: customer.customerPhone,
          customerId: customer.customerId,
          totalAmount: allocatedTotal || numericAmount,
          paymentMode,
          bankDetails: selectedBankObj
            ? {
                bankName: selectedBankObj.bankName,
                accountNumber: selectedBankObj.accountNo,
                accountHolderName: selectedBankObj.bankAccountName,
              }
            : null,
          remark: remark.trim(),
          allocations: allocations.map((a) => ({
            invoiceNo: a.invoiceNo,
            paidAmount: a.paidAmount,
            dueAmount: a.dueAmount,
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
      title="Customer Collection (বকেয়া আদায়)"
      onClose={onClose}
      width="w-full max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Customer Info Strip - Cash-Boi styled */}
        <div className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
          <div>
            <span className="font-semibold text-black block">{customer.customerName}</span>
            <span className="text-gray-500 text-[11px]">
              Phone: {customer.customerPhone || "-"} | ID: {customer.customerId}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-gray-500 uppercase font-medium">Total Due</span>
            <span className="text-sm font-bold text-rose-600 font-mono block">
              ৳ {formatMoney(effectiveMaxDue)}
            </span>
          </div>
        </div>

        {/* Amount Input with Quick Buttons */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-700">
              Collection Amount (৳) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleQuickPercent(1)}
                className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
              >
                100% Full
              </button>
              <button
                type="button"
                onClick={() => handleQuickPercent(0.5)}
                className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => handleQuickPercent(0.25)}
                className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
              >
                25%
              </button>
            </div>
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder="0.00"
            className="w-full h-9 px-2.5 text-xs bg-white border border-gray-200 rounded-lg text-black font-semibold font-mono focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)]"
            required
          />
        </div>

        {/* 2 Fields: Payment Mode & Collection Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
          {/* Payment Mode */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Payment Mode <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as "Cash" | "Bank")}
                className="w-full h-9 px-2.5 pr-8 text-xs bg-white border border-gray-200 rounded-lg text-black focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] appearance-none cursor-pointer"
              >
                <option value="Cash">Cash Drawer</option>
                <option value="Bank">Bank Account</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <RiArrowDropDownLine className="text-xl" />
              </div>
            </div>
          </div>

          {/* Collection Date */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
              className="w-full h-9 px-2.5 text-xs bg-white border border-gray-200 rounded-lg text-black focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)]"
              required
            />
          </div>
        </div>

        {/* Bank Account Dropdown if Bank */}
        {paymentMode === "Bank" && (
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Select Bank Account <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                disabled={isBankLoading}
                className="w-full h-9 px-2.5 pr-8 text-xs bg-white border border-gray-200 rounded-lg text-black focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] appearance-none cursor-pointer"
                required
              >
                {registeredBankAccounts.length === 0 ? (
                  <option value="">No bank accounts registered</option>
                ) : (
                  registeredBankAccounts.map((b) => (
                    <option key={String(b.id || b.bankId)} value={String(b.id || b.bankId)}>
                      {b.bankName} - {b.accountNo} ({b.bankAccountName || "Main"})
                    </option>
                  ))
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <RiArrowDropDownLine className="text-xl" />
              </div>
            </div>
          </div>
        )}

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
        />

        {/* Remark */}
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1">
            Remark / Notes
          </label>
          <input
            type="text"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="e.g. Paid in cash, cheque reference..."
            className="w-full h-9 px-2.5 text-xs bg-white border border-gray-200 rounded-lg text-black focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)]"
          />
        </div>

        {/* Action Buttons Matching PartyModal */}
        <div className="flex justify-end items-center gap-2 mt-1 pt-2.5 border-t border-gray-100">
          <Button
            label="Cancel"
            onClick={onClose}
            type="button"
            disabled={collectionMutation.isPending}
            color="#6b7280"
            hoverColor="#4b5563"
            buttonClass="!text-xs !py-1.5 !px-3.5"
          />
          <Button
            label={
              collectionMutation.isPending
                ? "Saving..."
                : `Confirm Collection (৳ ${formatMoney(numericAmount)})`
            }
            type="submit"
            disabled={collectionMutation.isPending || numericAmount <= 0}
            isLoading={collectionMutation.isPending}
            color="var(--primary-color)"
            hoverColor="var(--primary-color-hover)"
            buttonClass="!text-xs !py-1.5 !px-4 font-bold"
          />
        </div>
      </form>
    </Modal>
  );
};

export default AddCollectionModal;

import React, { useState, useMemo, useEffect } from "react";
import { RiArrowDropDownLine } from "react-icons/ri";
import { FaMoneyBillWave, FaCreditCard, FaMobileAlt } from "react-icons/fa";
import moment from "moment";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import DatePicker from "@/components/common/DatePicker";
import { useCustomerInvoicesDueQuery } from "@/hooks/useCustomerInvoicesDue";
import { useFinancialAccounts } from "@/hooks/useFinancialAccounts";
import { useCollectionMutation } from "@/hooks/useCollectionMutation";
import {
  allocateCollectionFIFO,
  allocateCollectionManual,
  sortInvoicesFIFO,
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
  const { data: rawInvoices = [], isLoading: isInvoicesLoading } =
    useCustomerInvoicesDueQuery(customerId);

  const invoices = useMemo(() => {
    return sortInvoicesFIFO(rawInvoices);
  }, [rawInvoices]);

  const { registeredBankAccounts, registeredMfsAccounts, isLoading: isAccountsLoading } = useFinancialAccounts();
  const collectionMutation = useCollectionMutation();

  // Form States
  const [amountInput, setAmountInput] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<"Cash" | "Bank" | "MFS">("Cash");
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [selectedMfsId, setSelectedMfsId] = useState<string>("");
  const [collectionDate, setCollectionDate] = useState<string>(
    moment().format("YYYY-MM-DD")
  );
  const [remark, setRemark] = useState<string>("");
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [selectedInvoiceNos, setSelectedInvoiceNos] = useState<Set<string>>(
    () => new Set()
  );

  const customerTotalDue = invoices.length > 0
    ? invoices.reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0)
    : Number(customer?.totalDue || 0);

  const selectedInvoicesDue = invoices
    .filter((inv) => selectedInvoiceNos.has(inv.invoiceNo))
    .reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0);

  const effectiveMaxDue = isManualMode && selectedInvoiceNos.size > 0
    ? selectedInvoicesDue
    : customerTotalDue;

  // Sync state on open
  useEffect(() => {
    if (isOpen && customer) {
      setAmountInput(String(customer.totalDue || ""));
      setPaymentMode("Cash");
      setSelectedBankId("");
      setSelectedMfsId("");
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

  // Set default MFS
  useEffect(() => {
    if (registeredMfsAccounts.length > 0 && !selectedMfsId) {
      const firstMfs = registeredMfsAccounts[0];
      setSelectedMfsId(String(firstMfs.id || firstMfs.mfsId || ""));
    }
  }, [registeredMfsAccounts, selectedMfsId]);

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

  const isAllSelected =
    invoices.length > 0 &&
    invoices.every((inv) => selectedInvoiceNos.has(inv.invoiceNo));

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

  // Strictly prevent typing or pasting an amount higher than the effective due amount
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (rawValue === "") {
      setAmountInput("");
      return;
    }
    const val = parseFloat(rawValue);
    if (isNaN(val)) {
      setAmountInput("");
      return;
    }
    if (val < 0) {
      setAmountInput("0");
      return;
    }
    if (effectiveMaxDue >= 0 && val > effectiveMaxDue) {
      setAmountInput(String(effectiveMaxDue));
      return;
    }
    setAmountInput(rawValue);
  };

  // Auto-clamp entered amount if user switches selection mode or unchecks invoices
  useEffect(() => {
    if (amountInput !== "") {
      const val = parseFloat(amountInput);
      if (!isNaN(val) && effectiveMaxDue >= 0 && val > effectiveMaxDue) {
        setAmountInput(effectiveMaxDue > 0 ? String(effectiveMaxDue) : "0");
      }
    }
  }, [effectiveMaxDue]);

  const handleQuickPercent = (pct: number) => {
    const target = effectiveMaxDue > 0 ? effectiveMaxDue : customerTotalDue;
    if (pct === 1) {
      setAmountInput(String(target));
    } else {
      const calculated = Number((target * pct).toFixed(2));
      setAmountInput(String(Math.min(target, calculated)));
    }
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

    let selectedMfsObj = null;
    if (paymentMode === "MFS") {
      if (!selectedMfsId) {
        showErrorToast("Please select an MFS account");
        return;
      }
      selectedMfsObj = registeredMfsAccounts.find(
        (m) => String(m.id || m.mfsId) === String(selectedMfsId)
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
        selectedMfs: selectedMfsObj,
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
          mfsDetails: selectedMfsObj
            ? {
                mfsName: selectedMfsObj.mfsName,
                mfsPhone: selectedMfsObj.mfsPhone,
              }
            : null,
          remark: remark.trim(),
          allocations: allocations.map((a) => ({
            invoiceNo: a.invoiceNo,
            paidAmount: a.allocatedAmount ?? a.paidAmount,
            dueAmount: a.remainingDue ?? a.dueAmount,
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
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Customer Info Strip */}
        <div className="flex items-center justify-between gap-2.5 py-1.5 px-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs whitespace-nowrap">
          {/* Customer Name & Phone */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-black truncate">{customer.customerName}</span>
            {customer.customerPhone && (
              <span className="text-gray-500 text-[11px] truncate">
                ({customer.customerPhone})
              </span>
            )}
          </div>

          {/* Total Due */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-gray-500 text-[11px] font-medium uppercase">Total Due:</span>
            <span className="text-sm font-bold text-rose-600 font-mono">
              ৳ {formatMoney(effectiveMaxDue)}
            </span>
          </div>
        </div>

        {/* Collection Amount, Payment Method & Date in ONE line */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-2.5 items-end">
            {/* Collection Amount (Smaller box) */}
            <div className="sm:col-span-4">
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-xs font-bold text-black whitespace-nowrap">
                  Amount (৳) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(1)}
                    className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-gray-100 hover:bg-gray-200 text-black cursor-pointer"
                    title="100% of Due"
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(0.5)}
                    className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-gray-100 hover:bg-gray-200 text-black cursor-pointer"
                    title="50% of Due"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(0.25)}
                    className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-gray-100 hover:bg-gray-200 text-black cursor-pointer"
                    title="25% of Due"
                  >
                    25%
                  </button>
                </div>
              </div>
              <input
                type="number"
                min="0"
                max={effectiveMaxDue > 0 ? effectiveMaxDue : 0}
                step="0.01"
                value={amountInput}
                onChange={handleAmountChange}
                placeholder="0.00"
                className="w-full h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg text-black font-bold focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)]"
                required
              />
            </div>

            {/* Payment Mode (Cash, Bank, MFS) */}
            <div className="sm:col-span-5">
              <label className="text-xs font-bold text-black block mb-0.5">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-1 h-8">
                {/* 1. Cash */}
                <button
                  type="button"
                  onClick={() => setPaymentMode("Cash")}
                  className={`h-full px-2 rounded-lg border font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMode === "Cash"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500 shadow-2xs font-bold"
                      : "border-gray-200 bg-gray-50/70 hover:bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <FaMoneyBillWave
                    size={11}
                    className={paymentMode === "Cash" ? "text-emerald-600 shrink-0" : "text-emerald-500 shrink-0"}
                  />
                  <span>Cash</span>
                </button>

                {/* 2. Bank */}
                <button
                  type="button"
                  onClick={() => setPaymentMode("Bank")}
                  className={`h-full px-2 rounded-lg border font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMode === "Bank"
                      ? "border-sky-500 bg-sky-50 text-sky-900 ring-1 ring-sky-500 shadow-2xs font-bold"
                      : "border-gray-200 bg-gray-50/70 hover:bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <FaCreditCard
                    size={11}
                    className={paymentMode === "Bank" ? "text-sky-600 shrink-0" : "text-sky-500 shrink-0"}
                  />
                  <span>Bank</span>
                </button>

                {/* 3. MFS */}
                <button
                  type="button"
                  onClick={() => setPaymentMode("MFS")}
                  className={`h-full px-2 rounded-lg border font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMode === "MFS"
                      ? "border-purple-500 bg-purple-50 text-purple-900 ring-1 ring-purple-500 shadow-2xs font-bold"
                      : "border-gray-200 bg-gray-50/70 hover:bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <FaMobileAlt
                    size={11}
                    className={paymentMode === "MFS" ? "text-purple-600 shrink-0" : "text-purple-500 shrink-0"}
                  />
                  <span>MFS</span>
                </button>
              </div>
            </div>

            {/* Date Picker (Placed beside Payment Method) */}
            <div className="sm:col-span-3">
              <label className="text-xs font-bold text-black block mb-0.5">
                Date <span className="text-red-500">*</span>
              </label>
              <DatePicker
                value={collectionDate}
                onChange={(dateStr) => setCollectionDate(dateStr || moment().format("YYYY-MM-DD"))}
                size="sm"
                align="right"
                isClearable={false}
                displayFormat="DD MMM, YYYY"
                placeholder="Select date"
                inputClassName="border-gray-200 hover:border-gray-300 font-bold text-black"
              />
            </div>
          </div>

          {/* Dynamic Bank Account Selector (if Bank mode selected) */}
          {paymentMode === "Bank" && (
            <div className="px-2.5 py-1 rounded-md border border-sky-200 bg-sky-50/50 flex items-center gap-2">
              <label className="text-[11px] font-semibold text-sky-950 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <FaCreditCard size={11} className="text-sky-600" />
                Select Bank Account <span className="text-red-500">*</span>:
              </label>
              <div className="relative flex-1">
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  disabled={isAccountsLoading}
                  className="w-full h-7 px-2 pr-7 text-xs bg-white border border-sky-300 rounded text-black focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 appearance-none cursor-pointer"
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
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-sky-600">
                  <RiArrowDropDownLine className="text-lg" />
                </div>
              </div>
            </div>
          )}

          {/* Dynamic MFS Account Selector (if MFS mode selected) */}
          {paymentMode === "MFS" && (
            <div className="px-2.5 py-1 rounded-md border border-purple-200 bg-purple-50/50 flex items-center gap-2">
              <label className="text-[11px] font-semibold text-purple-950 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <FaMobileAlt size={11} className="text-purple-600" />
                Select MFS Account <span className="text-red-500">*</span>:
              </label>
              <div className="relative flex-1">
                <select
                  value={selectedMfsId}
                  onChange={(e) => setSelectedMfsId(e.target.value)}
                  disabled={isAccountsLoading}
                  className="w-full h-7 px-2 pr-7 text-xs bg-white border border-purple-300 rounded text-black focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 appearance-none cursor-pointer"
                  required
                >
                  {registeredMfsAccounts.length === 0 ? (
                    <option value="">No MFS accounts registered</option>
                  ) : (
                    registeredMfsAccounts.map((m) => (
                      <option key={String(m.id || m.mfsId)} value={String(m.id || m.mfsId)}>
                        {m.mfsName} {m.mfsPhone ? `- ${m.mfsPhone}` : ""}
                      </option>
                    ))
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-purple-600">
                  <RiArrowDropDownLine className="text-lg" />
                </div>
              </div>
            </div>
          )}
        </div>

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
          <label className="text-xs font-bold text-black block mb-1">
            Remark / Notes
          </label>
          <input
            type="text"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="e.g. Paid in cash, cheque reference..."
            className="w-full h-9 px-2.5 text-xs bg-white border border-gray-200 rounded-lg text-black font-semibold placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)]"
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
            disabled={
              collectionMutation.isPending ||
              numericAmount <= 0 ||
              (effectiveMaxDue >= 0 && numericAmount > effectiveMaxDue)
            }
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

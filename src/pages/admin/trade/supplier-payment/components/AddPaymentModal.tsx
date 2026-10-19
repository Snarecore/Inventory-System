import React, { useState, useMemo, useEffect } from "react";
import { RiArrowDropDownLine } from "react-icons/ri";
import { FaMoneyBillWave, FaCreditCard, FaMobileAlt } from "react-icons/fa";
import moment from "moment";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import DatePicker from "@/components/common/DatePicker";
import { usePurchasesInvoicesDueQuery } from "@/hooks/usePurchasesInvoicesDue";
import { useFinancialAccounts } from "@/hooks/useFinancialAccounts";
import { usePaymentMutation } from "@/hooks/usePaymentMutation";
import {
  allocatePaymentFIFO,
  allocatePaymentManual,
  sortPurchaseInvoicesFIFO,
} from "@/services/payment-service";
import DuePurchaseInvoiceAllocationTable from "./DuePurchaseInvoiceAllocationTable";
import type { PaymentReceiptData, SupplierDueItem } from "@/types/payment.types";
import { formatMoney } from "@/utils/formatters";
import { showErrorToast } from "@/utils/toast-utils";

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

  const { registeredBankAccounts, registeredMfsAccounts, isLoading: isAccountsLoading } = useFinancialAccounts();
  const paymentMutation = usePaymentMutation();

  // Form States (Multi-Tender State Memory for Cash, Bank, and MFS)
  const [cashAmountInput, setCashAmountInput] = useState<string>("");
  const [bankAmountInput, setBankAmountInput] = useState<string>("");
  const [mfsAmountInput, setMfsAmountInput] = useState<string>("");
  const [discountInput, setDiscountInput] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<"Cash" | "Bank" | "MFS">("Cash");
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [selectedMfsId, setSelectedMfsId] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(
    moment().format("YYYY-MM-DD")
  );
  const [remark, setRemark] = useState<string>("");
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [selectedInvoiceNos, setSelectedInvoiceNos] = useState<Set<string>>(
    () => new Set()
  );

  const supplierTotalDue = invoices.length > 0
    ? invoices.reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0)
    : Number(supplier?.totalDue || 0);

  const selectedInvoicesDue = invoices
    .filter((inv) => selectedInvoiceNos.has(inv.invoiceNo))
    .reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0);

  const effectiveMaxDue = isManualMode && selectedInvoiceNos.size > 0
    ? selectedInvoicesDue
    : supplierTotalDue;

  // Sync state on open
  useEffect(() => {
    if (isOpen && supplier) {
      setCashAmountInput(String(supplier.totalDue || ""));
      setBankAmountInput("");
      setMfsAmountInput("");
      setDiscountInput("");
      setPaymentMode("Cash");
      setSelectedBankId("");
      setSelectedMfsId("");
      setPaymentDate(moment().format("YYYY-MM-DD"));
      setRemark("");
      setIsManualMode(false);
      setSelectedInvoiceNos(new Set());
    }
  }, [isOpen, supplier]);

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

  const selectedBankObj = useMemo(() => {
    return registeredBankAccounts.find(
      (b) => String(b.id || b.bankId) === String(selectedBankId)
    ) || null;
  }, [registeredBankAccounts, selectedBankId]);

  const selectedMfsObj = useMemo(() => {
    return registeredMfsAccounts.find(
      (m) => String(m.id || m.mfsId) === String(selectedMfsId)
    ) || null;
  }, [registeredMfsAccounts, selectedMfsId]);

  const numericCash = Math.max(0, parseFloat(cashAmountInput) || 0);
  const numericBank = Math.max(0, parseFloat(bankAmountInput) || 0);
  const numericMfs = Math.max(0, parseFloat(mfsAmountInput) || 0);
  const numericTotalPaid = Number((numericCash + numericBank + numericMfs).toFixed(2));
  const numericDiscount = Math.max(0, parseFloat(discountInput) || 0);
  const totalSettleAmount = Number((numericTotalPaid + numericDiscount).toFixed(2));

  // Current active mode's amount value bound to the single Amount input
  const currentAmountValue =
    paymentMode === "Cash"
      ? cashAmountInput
      : paymentMode === "Bank"
      ? bankAmountInput
      : mfsAmountInput;

  const { allocations, allocatedTotal, remainingTotalDue } = useMemo(() => {
    if (invoices.length === 0) {
      return {
        allocations: [],
        allocatedTotal: Math.min(totalSettleAmount, supplierTotalDue),
        remainingTotalDue: Math.max(0, Number((supplierTotalDue - totalSettleAmount).toFixed(2))),
      };
    }

    if (isManualMode && selectedInvoiceNos.size > 0) {
      return allocatePaymentManual(invoices, numericTotalPaid, selectedInvoiceNos, numericDiscount);
    }

    return allocatePaymentFIFO(invoices, numericTotalPaid, numericDiscount);
  }, [invoices, numericTotalPaid, numericDiscount, totalSettleAmount, supplierTotalDue, isManualMode, selectedInvoiceNos]);

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

  const handlePaymentModeChange = (newMode: "Cash" | "Bank" | "MFS") => {
    setPaymentMode(newMode);
  };

  // Strictly prevent typing or pasting an amount higher than the effective due minus discount and other tenders
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value;
    if (rawValue === "") {
      if (paymentMode === "Cash") setCashAmountInput("");
      else if (paymentMode === "Bank") setBankAmountInput("");
      else setMfsAmountInput("");
      return;
    }
    // If field was "0" and user typed a digit (e.g. "05"), strip leading zeros unless decimal "0."
    if (rawValue.length > 1 && rawValue.startsWith("0") && !rawValue.startsWith("0.")) {
      rawValue = rawValue.replace(/^0+/, "") || "0";
    }
    const val = parseFloat(rawValue);
    if (isNaN(val)) {
      if (paymentMode === "Cash") setCashAmountInput("");
      else if (paymentMode === "Bank") setBankAmountInput("");
      else setMfsAmountInput("");
      return;
    }
    if (val < 0) {
      if (paymentMode === "Cash") setCashAmountInput("0");
      else if (paymentMode === "Bank") setBankAmountInput("0");
      else setMfsAmountInput("0");
      return;
    }

    const otherPaid =
      paymentMode === "Cash"
        ? numericBank + numericMfs
        : paymentMode === "Bank"
        ? numericCash + numericMfs
        : numericCash + numericBank;

    const maxAllowed = Math.max(
      0,
      Number((effectiveMaxDue - numericDiscount - otherPaid).toFixed(2))
    );

    if (effectiveMaxDue >= 0 && val > maxAllowed) {
      const clamped = String(maxAllowed);
      if (paymentMode === "Cash") setCashAmountInput(clamped);
      else if (paymentMode === "Bank") setBankAmountInput(clamped);
      else setMfsAmountInput(clamped);
      return;
    }

    if (paymentMode === "Cash") setCashAmountInput(rawValue);
    else if (paymentMode === "Bank") setBankAmountInput(rawValue);
    else setMfsAmountInput(rawValue);
  };

  // Dedicated discount handler (key: totalDiscount)
  // If discount + total paid exceeds total due, auto-clamps discount
  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (rawValue === "") {
      setDiscountInput("");
      return;
    }
    const val = parseFloat(rawValue);
    if (isNaN(val)) {
      setDiscountInput("");
      return;
    }
    if (val < 0) {
      setDiscountInput("0");
      return;
    }

    const maxDiscountAllowed = Math.max(
      0,
      Number((effectiveMaxDue - numericTotalPaid).toFixed(2))
    );

    if (val > maxDiscountAllowed) {
      setDiscountInput(String(maxDiscountAllowed));
      return;
    }

    setDiscountInput(rawValue);
  };

  const tenderBreakdown = useMemo(() => {
    return {
      cash: numericCash,
      bank: numericBank,
      mfs: numericMfs,
      bankName: selectedBankObj?.bankName,
      mfsName: selectedMfsObj?.mfsName,
    };
  }, [numericCash, numericBank, numericMfs, selectedBankObj, selectedMfsObj]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentMutation.isPending) return;

    if (!supplier) {
      showErrorToast("No supplier selected");
      return;
    }

    if (numericTotalPaid <= 0 && numericDiscount <= 0) {
      showErrorToast("Please enter a valid amount or discount greater than 0");
      return;
    }

    if (isManualMode && selectedInvoiceNos.size === 0) {
      showErrorToast("Please select at least one invoice in manual mode");
      return;
    }

    if (totalSettleAmount > effectiveMaxDue && effectiveMaxDue > 0) {
      showErrorToast(
        `Total payment + discount cannot exceed due of ৳ ${formatMoney(effectiveMaxDue)}`
      );
      return;
    }

    if (numericBank > 0 && !selectedBankId) {
      showErrorToast("Please select a bank account for the bank payment");
      return;
    }

    if (numericMfs > 0 && !selectedMfsId) {
      showErrorToast("Please select an MFS account for the MFS payment");
      return;
    }

    const activeModes: string[] = [];
    if (numericCash > 0) activeModes.push("Cash");
    if (numericBank > 0) activeModes.push("Bank");
    if (numericMfs > 0) activeModes.push("MFS");
    const finalPaymentMode = activeModes.join(" + ") || paymentMode;

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
        <div className="space-y-1">
          <div className="grid grid-cols-1 sm:grid-cols-[1.1fr_1.1fr_1.7fr_1.1fr] gap-1.5 sm:gap-2 items-end">
            {/* Payment Amount */}
            <div>
              <label className="text-xs font-bold text-black whitespace-nowrap block mb-0.5">
                Amount (৳) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max={Math.max(
                  0,
                  Number(
                    (
                      effectiveMaxDue -
                      numericDiscount -
                      (paymentMode === "Cash"
                        ? numericBank + numericMfs
                        : paymentMode === "Bank"
                        ? numericCash + numericMfs
                        : numericCash + numericBank)
                    ).toFixed(2)
                  )
                )}
                step="0.01"
                value={currentAmountValue}
                onChange={handleAmountChange}
                onWheel={(e) => e.currentTarget.blur()}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
                className="w-full h-8 px-2 text-xs bg-white border border-gray-200 rounded-lg text-black font-bold focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                required={numericDiscount <= 0 && numericTotalPaid <= 0}
              />
            </div>

            {/* Total Discount (key: totalDiscount) */}
            <div>
              <label className="text-xs font-bold text-black whitespace-nowrap block mb-0.5" title="Discount / ছাড়">
                Discount (৳)
              </label>
              <input
                type="number"
                name="totalDiscount"
                min="0"
                max={effectiveMaxDue > 0 ? effectiveMaxDue : 0}
                step="0.01"
                value={discountInput}
                onChange={handleDiscountChange}
                onWheel={(e) => e.currentTarget.blur()}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
                className="w-full h-8 px-2 text-xs bg-white border border-gray-200 rounded-lg text-black font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Payment Mode (Cash, Bank, MFS) */}
            <div>
              <label className="text-xs font-bold text-black whitespace-nowrap block mb-0.5">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-1 h-8">
                {/* 1. Cash */}
                <button
                  type="button"
                  onClick={() => handlePaymentModeChange("Cash")}
                  className={`h-8 py-0 px-2 rounded-lg border font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer box-border leading-none whitespace-nowrap shrink-0 ${
                    paymentMode === "Cash"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-xs"
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
                  onClick={() => handlePaymentModeChange("Bank")}
                  className={`h-8 py-0 px-2 rounded-lg border font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer box-border leading-none whitespace-nowrap shrink-0 ${
                    paymentMode === "Bank"
                      ? "border-sky-500 bg-sky-50 text-sky-900 font-bold shadow-xs"
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
                  onClick={() => handlePaymentModeChange("MFS")}
                  className={`h-8 py-0 px-2 rounded-lg border font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer box-border leading-none whitespace-nowrap shrink-0 ${
                    paymentMode === "MFS"
                      ? "border-purple-500 bg-purple-50 text-purple-900 font-bold shadow-xs"
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

            {/* Date Picker */}
            <div>
              <label className="text-xs font-bold text-black block mb-0.5">
                Date <span className="text-red-500">*</span>
              </label>
              <DatePicker
                value={paymentDate}
                onChange={(dateStr) => setPaymentDate(dateStr || moment().format("YYYY-MM-DD"))}
                size="sm"
                align="right"
                isClearable={false}
                displayFormat="DD MMM, YYYY"
                placeholder="Select date"
                inputClassName="border-gray-200 hover:border-gray-300 font-bold text-black"
              />
            </div>
          </div>

          {/* Dynamic Bank / MFS Account Selectors */}
          {(paymentMode === "Bank" || numericBank > 0 || paymentMode === "MFS" || numericMfs > 0) && (
            <div
              className={
                (paymentMode === "Bank" || numericBank > 0) && (paymentMode === "MFS" || numericMfs > 0)
                  ? "grid grid-cols-1 sm:grid-cols-2 gap-1.5"
                  : "space-y-1.5"
              }
            >
              {/* Bank Account Selector */}
              {(paymentMode === "Bank" || numericBank > 0) && (
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
                      required={numericBank > 0}
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

              {/* MFS Account Selector */}
              {(paymentMode === "MFS" || numericMfs > 0) && (
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
                      required={numericMfs > 0}
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
          )}

        </div>

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

          {/* Action Buttons Matching PartyModal */}
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

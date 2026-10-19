import React from "react";
import moment from "moment";
import { RiArrowDropDownLine } from "react-icons/ri";
import { FaMoneyBillWave, FaCreditCard, FaMobileAlt } from "react-icons/fa";
import DatePicker from "@/components/common/DatePicker";
import type { useMultiTenderSettlement } from "@/hooks/useMultiTenderSettlement";

export interface MultiTenderFormSectionProps {
  settlement: ReturnType<typeof useMultiTenderSettlement>;
  dateLabel?: string;
}

export const MultiTenderFormSection: React.FC<MultiTenderFormSectionProps> = ({
  settlement,
  dateLabel = "Date",
}) => {
  const {
    currentAmountValue,
    handleAmountChange,
    effectiveMaxDue,
    numericDiscount,
    numericCash,
    numericBank,
    numericMfs,
    numericTotalPaid,
    discountInput,
    handleDiscountChange,
    paymentMode,
    handlePaymentModeChange,
    settlementDate,
    setSettlementDate,
    selectedBankId,
    setSelectedBankId,
    selectedMfsId,
    setSelectedMfsId,
    registeredBankAccounts,
    registeredMfsAccounts,
    isAccountsLoading,
  } = settlement;

  const otherPaid =
    paymentMode === "Cash"
      ? numericBank + numericMfs
      : paymentMode === "Bank"
      ? numericCash + numericMfs
      : numericCash + numericBank;

  const maxAllowedAmount = Math.max(
    0,
    Number((effectiveMaxDue - numericDiscount - otherPaid).toFixed(2))
  );

  return (
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
            max={maxAllowedAmount}
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

        {/* Total Discount */}
        <div>
          <label
            className="text-xs font-bold text-black whitespace-nowrap block mb-0.5"
            title="Discount / ছাড়"
          >
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
                className={
                  paymentMode === "Cash" ? "text-emerald-600 shrink-0" : "text-emerald-500 shrink-0"
                }
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
                className={
                  paymentMode === "Bank" ? "text-sky-600 shrink-0" : "text-sky-500 shrink-0"
                }
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
                className={
                  paymentMode === "MFS" ? "text-purple-600 shrink-0" : "text-purple-500 shrink-0"
                }
              />
              <span>MFS</span>
            </button>
          </div>
        </div>

        {/* Date Picker */}
        <div>
          <label className="text-xs font-bold text-black block mb-0.5">
            {dateLabel} <span className="text-red-500">*</span>
          </label>
          <DatePicker
            value={settlementDate}
            onChange={(dateStr) => setSettlementDate(dateStr || moment().format("YYYY-MM-DD"))}
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
  );
};

export default MultiTenderFormSection;

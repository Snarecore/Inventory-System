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
          <label className="text-xs font-bold text-[var(--ui-text)] whitespace-nowrap block mb-0.5">
            Amount (৳) <span className="text-[var(--ui-danger)]">*</span>
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
            className="w-full h-8 px-2 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg text-[var(--ui-text)] font-bold focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            required={numericDiscount <= 0 && numericTotalPaid <= 0}
          />
        </div>

        {/* Total Discount */}
        <div>
          <label
            className="text-xs font-bold text-[var(--ui-text)] whitespace-nowrap block mb-0.5"
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
            className="w-full h-8 px-2 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg text-[var(--ui-text)] font-bold focus:outline-none focus:ring-1 focus:ring-[var(--ui-warning)] focus:border-[var(--ui-warning)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Payment Mode (Cash, Bank, MFS) */}
        <div>
          <label className="text-xs font-bold text-[var(--ui-text)] whitespace-nowrap block mb-0.5">
            Payment Mode <span className="text-[var(--ui-danger)]">*</span>
          </label>
          <div className="grid grid-cols-3 gap-1 h-8">
            {/* 1. Cash */}
            <button
              type="button"
              onClick={() => handlePaymentModeChange("Cash")}
              className={`h-8 py-0 px-2 rounded-lg border font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer box-border leading-none whitespace-nowrap shrink-0 ${
                paymentMode === "Cash"
                  ? "border-[var(--ui-success)] bg-[var(--ui-success-light)] text-[var(--ui-success-dark)] font-bold shadow-xs"
                  : "border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/70 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] hover:border-[var(--ui-border-strong)]"
              }`}
            >
              <FaMoneyBillWave
                size={11}
                className={
                  paymentMode === "Cash" ? "text-[var(--ui-success)] shrink-0" : "text-[var(--ui-success)] shrink-0"
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
                  ? "border-[var(--primary-color)] bg-[var(--primary-color-light)] text-[var(--primary-color-dark)] font-bold shadow-xs"
                  : "border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/70 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] hover:border-[var(--ui-border-strong)]"
              }`}
            >
              <FaCreditCard
                size={11}
                className={
                  paymentMode === "Bank" ? "text-[var(--primary-color)] shrink-0" : "text-[var(--primary-color)] shrink-0"
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
                  ? "border-[var(--ui-info)] bg-[var(--ui-info-light)] text-[var(--ui-info-dark)] font-bold shadow-xs"
                  : "border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/70 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] hover:border-[var(--ui-border-strong)]"
              }`}
            >
              <FaMobileAlt
                size={11}
                className={
                  paymentMode === "MFS" ? "text-[var(--ui-info)] shrink-0" : "text-[var(--ui-info)] shrink-0"
                }
              />
              <span>MFS</span>
            </button>
          </div>
        </div>

        {/* Date Picker */}
        <div>
          <label className="text-xs font-bold text-[var(--ui-text)] block mb-0.5">
            {dateLabel} <span className="text-[var(--ui-danger)]">*</span>
          </label>
          <DatePicker
            value={settlementDate}
            onChange={(dateStr) => setSettlementDate(dateStr || moment().format("YYYY-MM-DD"))}
            size="sm"
            align="right"
            isClearable={false}
            displayFormat="DD MMM, YYYY"
            placeholder="Select date"
            inputClassName="border-[var(--ui-border)] hover:border-[var(--ui-border-strong)] font-bold text-[var(--ui-text)]"
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
            <div className="px-2.5 py-1 rounded-md border border-[var(--primary-color-muted)] bg-[var(--primary-color-light)]/50 flex items-center gap-2">
              <label className="text-[11px] font-semibold text-[var(--primary-color-dark)] flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <FaCreditCard size={11} className="text-[var(--primary-color)]" />
                Select Bank Account <span className="text-[var(--ui-danger)]">*</span>:
              </label>
              <div className="relative flex-1">
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  disabled={isAccountsLoading}
                  className="w-full h-7 px-2 pr-7 text-xs bg-[var(--ui-surface)] border border-[var(--primary-color-muted)] rounded text-[var(--ui-text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] appearance-none cursor-pointer"
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
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-[var(--primary-color)]">
                  <RiArrowDropDownLine className="text-lg" />
                </div>
              </div>
            </div>
          )}

          {/* MFS Account Selector */}
          {(paymentMode === "MFS" || numericMfs > 0) && (
            <div className="px-2.5 py-1 rounded-md border border-[var(--ui-info-border)] bg-[var(--ui-info-light)]/50 flex items-center gap-2">
              <label className="text-[11px] font-semibold text-[var(--ui-info-dark)] flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <FaMobileAlt size={11} className="text-[var(--ui-info)]" />
                Select MFS Account <span className="text-[var(--ui-danger)]">*</span>:
              </label>
              <div className="relative flex-1">
                <select
                  value={selectedMfsId}
                  onChange={(e) => setSelectedMfsId(e.target.value)}
                  disabled={isAccountsLoading}
                  className="w-full h-7 px-2 pr-7 text-xs bg-[var(--ui-surface)] border border-[var(--ui-info-border)] rounded text-[var(--ui-text)] focus:outline-none focus:ring-1 focus:ring-[var(--ui-info)] focus:border-[var(--ui-info)] appearance-none cursor-pointer"
                  required={numericMfs > 0}
                >
                  {registeredMfsAccounts.length === 0 ? (
                    <option value="">No MFS accounts registered</option>
                  ) : (
                    registeredMfsAccounts.map((m) => {
                      const displayName = m.mfsName || (m.method ? `${m.method}${m.name ? ` (${m.name})` : ""}` : m.name || "MFS");
                      const phone = m.mfsPhone || m.phoneNumber || "";
                      return (
                        <option key={String(m.id || m.mfsId)} value={String(m.id || m.mfsId)}>
                          {displayName} {phone ? `- ${phone}` : ""}
                        </option>
                      );
                    })
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-[var(--ui-info)]">
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

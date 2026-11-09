import React from "react";
import { FaMoneyBillWave, FaCreditCard, FaMobileAlt } from "react-icons/fa";
import { RiArrowDropDownLine } from "react-icons/ri";
import { formatMoney } from "@/utils/formatters";

export interface TradePaymentTenderSectionProps {
  paymentMode: "Cash" | "Bank" | "MFS";
  onPaymentModeChange: (mode: "Cash" | "Bank" | "MFS") => void;
  bankAccounts: any[];
  selectedBankId: string;
  onBankChange: (bankId: string) => void;
  mfsAccounts: any[];
  selectedMfsId: string;
  onMfsChange: (mfsId: string) => void;
  isAccountsLoading?: boolean;
}

export const TradePaymentTenderSection: React.FC<TradePaymentTenderSectionProps> = ({
  paymentMode,
  onPaymentModeChange,
  bankAccounts,
  selectedBankId,
  onBankChange,
  mfsAccounts,
  selectedMfsId,
  onMfsChange,
  isAccountsLoading = false,
}) => {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-[var(--ui-text)]">
        Payment Tender <span className="text-red-500">*</span>
      </label>

      {/* Tender Mode Selector Buttons */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => onPaymentModeChange("Cash")}
          className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            paymentMode === "Cash"
              ? "bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-sm"
              : "bg-[var(--ui-surface)] border-[var(--ui-border)] text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)]"
          }`}
        >
          <FaMoneyBillWave size={12} />
          <span>Cash</span>
        </button>

        <button
          type="button"
          onClick={() => onPaymentModeChange("Bank")}
          className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            paymentMode === "Bank"
              ? "bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-sm"
              : "bg-[var(--ui-surface)] border-[var(--ui-border)] text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)]"
          }`}
        >
          <FaCreditCard size={12} />
          <span>Bank</span>
        </button>

        <button
          type="button"
          onClick={() => onPaymentModeChange("MFS")}
          className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            paymentMode === "MFS"
              ? "bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-sm"
              : "bg-[var(--ui-surface)] border-[var(--ui-border)] text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)]"
          }`}
        >
          <FaMobileAlt size={12} />
          <span>MFS</span>
        </button>
      </div>

      {/* Conditional Bank Selector */}
      {paymentMode === "Bank" && (
        <div className="space-y-1 pt-1 bg-[var(--ui-surface-muted)]/50 p-2 rounded-lg border border-[var(--ui-border)]">
          <label className="text-[11px] font-semibold text-[var(--ui-text)] flex items-center justify-between">
            <span>
              Select Bank Account <span className="text-red-500">*</span>
            </span>
            {isAccountsLoading && (
              <span className="text-[10px] text-[var(--ui-text-muted)] animate-pulse">
                Loading accounts...
              </span>
            )}
          </label>
          <div className="relative">
            <select
              value={selectedBankId}
              onChange={(e) => onBankChange(e.target.value)}
              className="w-full appearance-none px-2.5 py-1.5 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-md focus:border-[var(--primary-color)] focus:ring-1 focus:ring-[var(--primary-color)] outline-none text-[var(--ui-text)] pr-8 cursor-pointer"
            >
              <option value="" disabled>
                {bankAccounts.length === 0
                  ? "-- No bank accounts registered --"
                  : "-- Choose bank account --"}
              </option>
              {bankAccounts.map((b) => {
                const bId = String(b.id || b.bankId);
                const bal = b.openingBalance != null ? ` | Bal: ৳${formatMoney(b.openingBalance)}` : "";
                return (
                  <option key={bId} value={bId}>
                    {b.bankName} - {b.accountNo} ({b.branchName || "Main Branch"}){bal}
                  </option>
                );
              })}
            </select>
            <RiArrowDropDownLine
              size={20}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)] pointer-events-none"
            />
          </div>
          {bankAccounts.length === 0 && !isAccountsLoading && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              No registered bank accounts found. Please add a bank account in Financial Accounts first.
            </p>
          )}
        </div>
      )}

      {/* Conditional MFS Selector */}
      {paymentMode === "MFS" && (
        <div className="space-y-1 pt-1 bg-[var(--ui-surface-muted)]/50 p-2 rounded-lg border border-[var(--ui-border)]">
          <label className="text-[11px] font-semibold text-[var(--ui-text)] flex items-center justify-between">
            <span>
              Select MFS Account <span className="text-red-500">*</span>
            </span>
            {isAccountsLoading && (
              <span className="text-[10px] text-[var(--ui-text-muted)] animate-pulse">
                Loading accounts...
              </span>
            )}
          </label>
          <div className="relative">
            <select
              value={selectedMfsId}
              onChange={(e) => onMfsChange(e.target.value)}
              className="w-full appearance-none px-2.5 py-1.5 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-md focus:border-[var(--primary-color)] focus:ring-1 focus:ring-[var(--primary-color)] outline-none text-[var(--ui-text)] pr-8 cursor-pointer"
            >
              <option value="" disabled>
                {mfsAccounts.length === 0
                  ? "-- No MFS accounts registered --"
                  : "-- Choose MFS account --"}
              </option>
              {mfsAccounts.map((m) => {
                const mId = String(m.id || m.mfsId);
                const bal = m.openingBalance != null ? ` | Bal: ৳${formatMoney(m.openingBalance)}` : "";
                return (
                  <option key={mId} value={mId}>
                    {m.mfsName || m.name} - {m.mfsPhone || m.phoneNumber} ({m.mfsType || m.method || "Wallet"}){bal}
                  </option>
                );
              })}
            </select>
            <RiArrowDropDownLine
              size={20}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)] pointer-events-none"
            />
          </div>
          {mfsAccounts.length === 0 && !isAccountsLoading && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              No registered MFS accounts found. Please add an MFS account in Financial Accounts first.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TradePaymentTenderSection;

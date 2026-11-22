import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FaTimes, FaCreditCard, FaCheckCircle, FaSpinner } from "react-icons/fa";
import type { PayoutAccount } from "@/types/referral.types";
import { useSavePayoutAccountMutation } from "@/hooks/useReferralQueries";
import toast from "react-hot-toast";

interface PayoutAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number | string;
  currentAccount?: PayoutAccount | null;
}

export const PayoutAccountModal: React.FC<PayoutAccountModalProps> = ({
  isOpen,
  onClose,
  userId,
  currentAccount,
}) => {
  const { t } = useTranslation();
  const [method, setMethod] = useState<"BKASH" | "NAGAD">("BKASH");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useSavePayoutAccountMutation();

  useEffect(() => {
    if (isOpen) {
      if (currentAccount?.method === "NAGAD" || currentAccount?.method === "BKASH") {
        setMethod(currentAccount.method);
      }
      setAccountName(currentAccount?.accountName || "");
      setAccountNumber("");
      setError(null);
    }
  }, [isOpen, currentAccount]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanNumber = accountNumber.trim().replace(/[^0-9]/g, "");
    if (!cleanNumber || cleanNumber.length !== 11 || !cleanNumber.startsWith("01")) {
      setError("Please provide a valid 11-digit mobile number (e.g. 01XXXXXXXXX)");
      return;
    }

    try {
      await saveMutation.mutateAsync({
        userId: Number(userId),
        method,
        accountNumber: cleanNumber,
        accountName: accountName.trim() || undefined,
      });

      toast.success(t("Save Account") || "Account saved successfully");
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save payout account");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-[var(--ui-border)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/30">
          <div className="flex items-center gap-2">
            <FaCreditCard className="text-[var(--color-primary)]" size={13} />
            <h3 className="font-bold text-xs sm:text-sm text-[var(--ui-text)]">
              {t("Setup Payout Account")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] p-1 rounded-md transition cursor-pointer"
          >
            <FaTimes size={13} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* Current Saved Account (if any) */}
          {currentAccount?.accountNumberMasked && (
            <div className="p-2.5 rounded-lg bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[var(--ui-text-muted)] block">Current Account</span>
                <span className="font-semibold text-[var(--ui-text)]">
                  {currentAccount.method}: {currentAccount.accountNumberMasked}
                </span>
              </div>
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <FaCheckCircle size={9} /> Verified
              </span>
            </div>
          )}

          {/* Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-[var(--ui-text)] mb-1">
              Select Payout Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod("BKASH")}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  method === "BKASH"
                    ? "border-pink-500 bg-pink-50 text-pink-700 shadow-xs"
                    : "border-[var(--ui-border)] bg-white text-[var(--ui-text-muted)] hover:border-gray-300"
                }`}
              >
                <span>bKash</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod("NAGAD")}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  method === "NAGAD"
                    ? "border-orange-500 bg-orange-50 text-orange-700 shadow-xs"
                    : "border-[var(--ui-border)] bg-white text-[var(--ui-text-muted)] hover:border-gray-300"
                }`}
              >
                <span>Nagad</span>
              </button>
            </div>
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-xs font-semibold text-[var(--ui-text)] mb-1">
              {t("Account Number")} *
            </label>
            <input
              type="text"
              required
              maxLength={11}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full text-xs rounded-lg border border-gray-300 focus:border-[var(--primary-color)] focus:ring-1 focus:ring-[var(--primary-color)] px-3 py-2 transition font-mono"
            />
          </div>

          {/* Account Holder Name */}
          <div>
            <label className="block text-xs font-semibold text-[var(--ui-text)] mb-1">
              {t("Account Name (Optional)")}
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Account holder name"
              className="w-full text-xs rounded-lg border border-gray-300 focus:border-[var(--primary-color)] focus:ring-1 focus:ring-[var(--primary-color)] px-3 py-2 transition"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--ui-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[var(--ui-border)] text-xs font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-surface-sunken)] transition cursor-pointer"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-4 py-1.5 rounded-lg bg-[var(--primary-color)] hover:brightness-110 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saveMutation.isPending && <FaSpinner className="animate-spin" size={11} />}
              <span>{t("Save Account")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

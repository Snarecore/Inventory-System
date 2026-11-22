import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FaTimes,
  FaWallet,
  FaSpinner,
  FaExclamationTriangle,
  FaCreditCard,
} from "react-icons/fa";
import type { ReferralConfig, PayoutAccount, WalletBalance } from "@/types/referral.types";
import { useRequestWithdrawalMutation } from "@/hooks/useReferralQueries";
import { formatTaka, poishaToTaka, takaToPoisha } from "@/services/referral-service";
import toast from "react-hot-toast";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number | string;
  balance: WalletBalance | null;
  config: ReferralConfig | null;
  payoutAccount: PayoutAccount | null;
  onOpenPayoutAccount: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  userId,
  balance,
  config,
  payoutAccount,
  onOpenPayoutAccount,
}) => {
  const { t } = useTranslation();
  const [amountTaka, setAmountTaka] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const withdrawMutation = useRequestWithdrawalMutation();

  if (!isOpen) return null;

  const availablePoisha = balance?.availablePoisha ?? 0;
  const availableTaka = poishaToTaka(availablePoisha);
  const minWithdrawalPoisha = config?.minWithdrawalPoisha ?? 0;
  const minWithdrawalTaka = poishaToTaka(minWithdrawalPoisha);
  const isWithdrawalsEnabled = Boolean(config?.withdrawalsEnabled);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isWithdrawalsEnabled) {
      setError(t("Withdrawals are currently disabled by system"));
      return;
    }

    if (!payoutAccount?.accountNumberMasked && !payoutAccount?.method) {
      setError("Please set up a payout account first before requesting withdrawals.");
      return;
    }

    const numTaka = parseFloat(amountTaka);
    if (isNaN(numTaka) || numTaka <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    if (numTaka < minWithdrawalTaka) {
      setError(`Minimum withdrawal amount is ${formatTaka(minWithdrawalPoisha)}.`);
      return;
    }

    if (numTaka > availableTaka) {
      setError(`Requested amount exceeds available balance (${formatTaka(availablePoisha)}).`);
      return;
    }

    const amountPoisha = takaToPoisha(numTaka);

    try {
      await withdrawMutation.mutateAsync({
        userId: Number(userId),
        amountPoisha,
      });

      toast.success(t("Confirm Withdrawal") || "Withdrawal requested successfully!");
      setAmountTaka("");
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to submit withdrawal request");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-[var(--ui-border)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/30">
          <div className="flex items-center gap-2">
            <FaWallet className="text-[var(--color-primary)]" size={13} />
            <h3 className="font-bold text-xs sm:text-sm text-[var(--ui-text)]">
              {t("Request Withdrawal")}
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
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <FaExclamationTriangle className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Balance & Account Status Card */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-[var(--ui-surface-muted)] border border-[var(--ui-border)]">
              <span className="text-[10px] text-[var(--ui-text-muted)] block">
                {t("Available to Withdraw")}
              </span>
              <span className="text-sm font-bold font-mono text-emerald-700">
                {formatTaka(availablePoisha)}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--ui-surface-muted)] border border-[var(--ui-border)]">
              <span className="text-[10px] text-[var(--ui-text-muted)] block">
                {t("Minimum Withdrawal")}
              </span>
              <span className="text-sm font-bold font-mono text-[var(--ui-text)]">
                {formatTaka(minWithdrawalPoisha)}
              </span>
            </div>
          </div>

          {/* Destination Payout Account */}
          <div className="p-2.5 rounded-lg bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaCreditCard className="text-[var(--ui-text-muted)]" size={12} />
              <div>
                <span className="text-[10px] text-[var(--ui-text-muted)] block">Payout Destination</span>
                <span className="text-xs font-semibold text-[var(--ui-text)]">
                  {payoutAccount?.accountNumberMasked
                    ? `${payoutAccount.method}: ${payoutAccount.accountNumberMasked}`
                    : "No payout account added"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPayoutAccount();
              }}
              className="text-xs text-[var(--color-primary)] hover:underline font-semibold cursor-pointer"
            >
              Change
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[var(--ui-text)]">
                {t("Withdrawal Amount (BDT)")} *
              </label>
              {availableTaka > 0 && (
                <button
                  type="button"
                  onClick={() => setAmountTaka(String(availableTaka))}
                  className="text-[11px] text-[var(--color-primary)] hover:underline font-medium cursor-pointer"
                >
                  Withdraw All ({availableTaka} ৳)
                </button>
              )}
            </div>
            <input
              type="number"
              step="any"
              min={minWithdrawalTaka}
              max={availableTaka}
              required
              value={amountTaka}
              onChange={(e) => setAmountTaka(e.target.value)}
              placeholder={`Min. ${minWithdrawalTaka}`}
              className="w-full text-xs rounded-lg border border-gray-300 focus:border-[var(--primary-color)] focus:ring-1 focus:ring-[var(--primary-color)] px-3 py-2 transition font-mono font-bold"
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
              disabled={withdrawMutation.isPending || availableTaka < minWithdrawalTaka}
              className="px-4 py-1.5 rounded-lg bg-[var(--primary-color)] hover:brightness-110 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {withdrawMutation.isPending && <FaSpinner className="animate-spin" size={11} />}
              <span>{t("Confirm Withdrawal")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

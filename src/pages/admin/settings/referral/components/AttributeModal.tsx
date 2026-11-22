import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FaTimes, FaUserPlus, FaSpinner, FaCheckCircle } from "react-icons/fa";
import { useAttributeReferrerMutation } from "@/hooks/useReferralQueries";
import toast from "react-hot-toast";

interface AttributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number | string;
  currentReferredBy?: string | null;
}

export const AttributeModal: React.FC<AttributeModalProps> = ({
  isOpen,
  onClose,
  userId,
  currentReferredBy,
}) => {
  const { t } = useTranslation();
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const attributeMutation = useAttributeReferrerMutation();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = referralCode.trim().toUpperCase();
    if (!cleanCode) {
      setError("Please provide a valid referral code.");
      return;
    }

    try {
      await attributeMutation.mutateAsync({
        userId: Number(userId),
        referralCode: cleanCode,
      });

      toast.success(t("Connect") || "Referrer linked successfully!");
      setReferralCode("");
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to attribute referrer code");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-[var(--ui-border)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/30">
          <div className="flex items-center gap-2">
            <FaUserPlus className="text-[var(--color-primary)]" size={13} />
            <h3 className="font-bold text-xs sm:text-sm text-[var(--ui-text)]">
              {t("Link Referrer Code")}
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

          {currentReferredBy ? (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <FaCheckCircle className="text-emerald-600 shrink-0" />
              <span>
                Already linked to referrer: <strong className="font-mono">{currentReferredBy}</strong>
              </span>
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-semibold text-[var(--ui-text)] mb-1">
              {t("Referral Code")} *
            </label>
            <input
              type="text"
              required
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="e.g. SHAU6846"
              className="w-full text-xs rounded-lg border border-gray-300 focus:border-[var(--primary-color)] focus:ring-1 focus:ring-[var(--primary-color)] px-3 py-2 transition font-mono tracking-wider font-bold"
            />
            <p className="text-[10px] text-[var(--ui-text-muted)] mt-1">
              Enter the referral code of the affiliate partner who invited you to Cash Boi.
            </p>
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
              disabled={attributeMutation.isPending}
              className="px-4 py-1.5 rounded-lg bg-[var(--primary-color)] hover:brightness-110 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {attributeMutation.isPending && <FaSpinner className="animate-spin" size={11} />}
              <span>{t("Connect")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

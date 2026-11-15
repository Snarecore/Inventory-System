import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FiLock, FiAlertCircle } from "react-icons/fi";
import { usePinVerification } from "@/hooks/usePinVerification";

export interface PinVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => void | Promise<void>;
  title?: string;
  subtitle?: string;
  confirmText?: string;
  cancelText?: string;
  phone?: string;
  token?: string;
  pinLength?: number;
}

export const PinVerificationModal: React.FC<PinVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Enter Security PIN",
  subtitle = "Please enter your 4-digit PIN to authorize this action.",
  confirmText = "Verify",
  cancelText = "Cancel",
  phone,
  token,
  pinLength = 4,
}) => {
  const { t } = useTranslation();

  const {
    pin,
    pinDigits,
    isComplete,
    isVerifying,
    error,
    focusedIndex,
    inputRefs,
    setFocusedIndex,
    handleDigitChange,
    handleKeyDown,
    handlePaste,
    resetPin,
    verifyPin,
  } = usePinVerification({
    pinLength,
    phone,
    token,
    onSuccess: async (verifiedPin) => {
      await onSuccess(verifiedPin);
      onClose();
    },
    autoResetOnError: true,
    showToasts: true,
  });

  // Reset and auto-focus first box whenever modal opens
  useEffect(() => {
    if (isOpen) {
      resetPin();
    }
  }, [isOpen, resetPin]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isComplete || isVerifying) return;
    await verifyPin();
  };

  return (
    <div
      className="ui-modal-backdrop fixed inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--ui-text)_72%,transparent)] bg-opacity-50 z-[9999] p-2"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-modal-title"
    >
      <div className="ui-modal-panel bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl shadow-xl w-full max-w-[420px] p-6 sm:p-8 relative transition-all">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center">
          <div className="bg-[var(--primary-color)]/10 text-[var(--primary-color)] p-3 rounded-full mb-3">
            <FiLock className="text-2xl" />
          </div>
          <h2 id="pin-modal-title" className="text-lg font-bold text-[var(--ui-text)]">
            {t(title)}
          </h2>
          <p className="text-xs text-[var(--ui-text-muted)] mt-1.5 max-w-xs">
            {t(subtitle)}
          </p>
        </div>

        {/* PIN Inputs Form */}
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col items-center">
          <div className="flex justify-center items-center gap-3" onPaste={handlePaste}>
            {pinDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs[idx] = { current: el };
                }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                disabled={isVerifying}
                autoComplete="one-time-code"
                onFocus={() => setFocusedIndex(idx)}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                aria-label={`PIN digit ${idx + 1}`}
                className={`w-12 h-12 text-center text-xl font-bold rounded-lg border bg-[var(--ui-surface)] text-[var(--ui-text)] transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  focusedIndex === idx
                    ? "border-[var(--primary-color)] ring-2 ring-[var(--primary-color)]/20 shadow-sm"
                    : "border-[var(--ui-border)] hover:border-[var(--ui-border-strong)]"
                } ${error ? "!border-[var(--ui-danger)]" : ""} disabled:opacity-50`}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-1.5 mt-3 text-xs text-[var(--ui-danger)] animate-fadeIn">
              <FiAlertCircle className="shrink-0" />
              <span>{t(error)}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 mt-7 w-full">
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className="px-5 py-2.5 text-xs font-semibold text-[var(--ui-text-muted)] bg-[var(--ui-surface)] border border-[var(--ui-border-strong)] rounded-lg hover:bg-[var(--ui-surface-muted)] transition shadow-2xs disabled:opacity-50 min-w-[95px] cursor-pointer"
            >
              {t(cancelText)}
            </button>

            <button
              type="submit"
              disabled={!isComplete || isVerifying}
              className="px-6 py-2.5 text-xs font-bold text-white bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] rounded-lg transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-w-[110px]"
            >
              {isVerifying ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>{t("Verifying...")}</span>
                </>
              ) : (
                <span>{t(confirmText)}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PinVerificationModal;

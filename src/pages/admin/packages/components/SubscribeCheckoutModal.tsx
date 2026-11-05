import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FaShieldAlt,
  FaLock,
  FaSpinner,
  FaCheckCircle,
  FaPaperPlane,
  FaRedo,
} from "react-icons/fa";
import Modal from "@/components/modal/Modal";
import type { PricedPackage, BillingCycle, PaymentInitiatePayload } from "@/types";
import { useInitiatePackagePaymentMutation } from "@/hooks/usePackageQueries";
import {
  formatPackageMoney,
  normalizeBdMobile,
  isEmailAddress,
  formatDateForPayment,
} from "../utils/package-formatters";
import {
  isTestMobile,
  TEST_OTP_CODE,
  generateRandomOtp,
  digestSha256,
  encryptOtpMessage,
} from "../utils/package-otp";
import {
  checkAppUserExists,
  sendPackageOtp,
} from "@/services/package-service";

interface SubscribeCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: PricedPackage | null;
  cycle: BillingCycle | null;
  initialPhone?: string;
  initialName?: string;
  initialEmail?: string;
  userId?: string | number;
}

interface CheckoutFormProps {
  pkg: PricedPackage;
  cycle: BillingCycle;
  initialPhone: string;
  initialName: string;
  initialEmail: string;
  userId: string | number;
  onClose: () => void;
}

const CheckoutFormContent: React.FC<CheckoutFormProps> = ({
  pkg,
  cycle,
  initialPhone,
  initialName,
  initialEmail,
  userId,
  onClose,
}) => {
  const [fullName, setFullName] = useState(initialName);
  const [mobile, setMobile] = useState(initialPhone);
  const [email, setEmail] = useState(initialEmail);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const isInitialTest = isTestMobile(normalizeBdMobile(initialPhone));

  // OTP State
  const [isCheckingMobile, setIsCheckingMobile] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(isInitialTest);
  const [otpSent, setOtpSent] = useState(isInitialTest);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", ""]);
  const [generatedOtpHash, setGeneratedOtpHash] = useState("");
  const [isOtpVerified, setIsOtpVerified] = useState(isInitialTest);
  const [otpMessage, setOtpMessage] = useState<string | null>(
    isInitialTest ? `Developer test mode active (Code: ${TEST_OTP_CODE})` : null
  );
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const initiatePaymentMutation = useInitiatePackagePaymentMutation();
  const totalAmount = pkg.total ?? 0;
  const cycleMonths = cycle.months || 1;

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Initial check for existing account if initial phone is provided
  useEffect(() => {
    const cleanPhone = normalizeBdMobile(initialPhone);
    if (!cleanPhone || isTestMobile(cleanPhone)) return;

    let isMounted = true;
    (async () => {
      try {
        setIsCheckingMobile(true);
        const res = await checkAppUserExists(cleanPhone);
        if (!isMounted) return;
        if (res && res.exists) {
          setIsExistingUser(true);
          setIsOtpVerified(true);
          setOtpSent(true);
          setOtpMessage("Registered CashBoi account verified. Proceed without OTP.");
        }
      } catch {
        // Fallback to manual OTP
      } finally {
        if (isMounted) setIsCheckingMobile(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [initialPhone]);

  // Check mobile status on input change
  const evaluateMobile = useCallback(async (phone: string) => {
    const cleanPhone = normalizeBdMobile(phone);
    if (!cleanPhone) {
      setIsExistingUser(false);
      setIsOtpVerified(false);
      setOtpSent(false);
      setOtpMessage(null);
      return;
    }

    if (isTestMobile(cleanPhone)) {
      setIsExistingUser(true);
      setIsOtpVerified(true);
      setOtpSent(true);
      setOtpMessage(`Developer test mode active (Code: ${TEST_OTP_CODE})`);
      return;
    }

    try {
      setIsCheckingMobile(true);
      const res = await checkAppUserExists(cleanPhone);
      if (res && res.exists) {
        setIsExistingUser(true);
        setIsOtpVerified(true);
        setOtpSent(true);
        setOtpMessage("Registered CashBoi account verified. Proceed without OTP.");
      } else {
        setIsExistingUser(false);
        setIsOtpVerified(false);
        setOtpSent(false);
        setOtpMessage(null);
      }
    } catch {
      setIsExistingUser(false);
      setIsOtpVerified(false);
    } finally {
      setIsCheckingMobile(false);
    }
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMobile(val);
    setValidationError(null);
    setIsOtpVerified(false);
    setOtpSent(false);
    setOtpDigits(["", "", "", ""]);

    const clean = normalizeBdMobile(val);
    if (clean.length === 11) {
      evaluateMobile(clean);
    }
  };

  // Send OTP handler
  const handleSendOtp = async () => {
    const cleanPhone = normalizeBdMobile(mobile);
    if (!cleanPhone) {
      setValidationError("Please enter a valid 11-digit Bangladeshi mobile number (01XXXXXXXXX).");
      return;
    }

    try {
      setIsSendingOtp(true);
      setValidationError(null);
      setOtpMessage(null);

      const otpCode = generateRandomOtp();
      const hash = await digestSha256(otpCode);
      const encryptedMessage = await encryptOtpMessage(otpCode);

      const response = await sendPackageOtp({
        phoneNumber: cleanPhone,
        encryptedMessage,
        encrypted: true,
        accountType: "BUSINESS",
      });

      if (response && response.success) {
        setOtpSent(true);
        setGeneratedOtpHash(hash);
        setOtpDigits(["", "", "", ""]);
        setIsOtpVerified(false);
        setResendCooldown(60);
        setOtpMessage(`4-digit verification code sent to ${cleanPhone}.`);
        setTimeout(() => otpRefs[0].current?.focus(), 150);
      } else {
        setValidationError(response?.meaning || response?.message || "Failed to send OTP SMS. Please try again.");
      }
    } catch (err: any) {
      setValidationError(err?.message || "Failed to communicate with OTP service.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // OTP digit entry handler with auto-focus advance and backspace
  const handleOtpDigitChange = async (index: number, val: string) => {
    const char = val.slice(-1).replace(/\D/g, "");
    const updated = [...otpDigits];
    updated[index] = char;
    setOtpDigits(updated);

    if (char && index < otpRefs.length - 1) {
      otpRefs[index + 1].current?.focus();
    }

    const currentEntered = updated.join("");
    if (currentEntered.length === 4) {
      if (isTestMobile(normalizeBdMobile(mobile)) && currentEntered === TEST_OTP_CODE) {
        setIsOtpVerified(true);
        setOtpMessage("Mobile number verified successfully!");
        setValidationError(null);
        return;
      }

      if (generatedOtpHash) {
        const inputHash = await digestSha256(currentEntered);
        if (inputHash === generatedOtpHash) {
          setIsOtpVerified(true);
          setOtpMessage("Mobile number verified successfully!");
          setValidationError(null);
        } else {
          setIsOtpVerified(false);
          setValidationError("Incorrect OTP code. Please check your SMS and try again.");
        }
      }
    } else {
      setIsOtpVerified(false);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (paste.length > 0) {
      const updated = ["", "", "", ""];
      for (let i = 0; i < paste.length; i++) {
        updated[i] = paste[i];
      }
      setOtpDigits(updated);
      const nextFocus = Math.min(paste.length, 3);
      otpRefs[nextFocus].current?.focus();

      if (paste.length === 4) {
        handleOtpDigitChange(3, paste[3]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanPhone = normalizeBdMobile(mobile);
    if (!cleanPhone) {
      setValidationError("Mobile number is required to proceed (01XXXXXXXXX).");
      return;
    }

    if (!isOtpVerified) {
      setValidationError("Please complete mobile number OTP verification before proceeding to payment.");
      return;
    }

    const cleanEmail = email.trim();
    if (!isEmailAddress(cleanEmail)) {
      setValidationError("Please enter a valid email address (e.g. name@example.com).");
      return;
    }

    if (!fullName.trim()) {
      setValidationError("Please enter your name or business name.");
      return;
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + cycleMonths);

    const payload: PaymentInitiatePayload = {
      customerOrderId: `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      customerId: cleanPhone,
      packageId: pkg.id,
      totalAmount,
      customerName: fullName.trim(),
      customerEmail: cleanEmail,
      customerPhone: cleanPhone,
      productName: `BUSINESS|${pkg.name}|${cycle.label}`,
      cycleCode: cycle.code,
      accountType: "BUSINESS",
      requestAgent: "WEB",
      startDate: formatDateForPayment(startDate),
      endDate: formatDateForPayment(endDate),
      ...(userId ? { userId: String(userId) } : {}),
      ...(pkg.code ? { productCode: pkg.code } : {}),
    };

    try {
      setIsRedirecting(true);
      const res = await initiatePaymentMutation.mutateAsync(payload);
      const redirectUrl =
        res.redirectURL || res.RedirectURL || res.redirectUrl || res.checkoutUrl || res.url;

      if (redirectUrl) {
        window.location.replace(redirectUrl);
      } else {
        setValidationError(
          res.ErrorMessage || res.errorMessage || res.message || "Payment gateway redirect URL not received."
        );
        setIsRedirecting(false);
      }
    } catch (err: any) {
      setValidationError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to initiate payment gateway. Please try again."
      );
      setIsRedirecting(false);
    }
  };

  if (isRedirecting) {
    return (
      <div className="py-10 px-4 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-[var(--primary-color-light)] text-[var(--primary-color)] flex items-center justify-center animate-spin">
          <FaSpinner size={24} />
        </div>
        <h3 className="text-sm font-bold text-[var(--ui-text)]">
          Redirecting to Payment Gateway...
        </h3>
        <p className="text-xs text-[var(--ui-text-muted)] max-w-xs">
          Please wait while we transfer you to the secure checkout page. Do not refresh or close this window.
        </p>
      </div>
    );
  }

  const cleanPhone = normalizeBdMobile(mobile);
  const canSendOtp = cleanPhone.length === 11 && !isExistingUser && !isOtpVerified && !isSendingOtp;

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
      {/* Plan Summary Card */}
      <div className="p-3 rounded-xl bg-[var(--ui-surface-muted)] border border-[var(--ui-border)]">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary-color)]">
              Selected Plan
            </span>
            <h4 className="text-sm font-bold text-[var(--ui-text)] mt-0.5">
              {pkg.name}
            </h4>
            <p className="text-[11px] text-[var(--ui-text-muted)]">
              Billing Cycle: <span className="font-semibold text-[var(--ui-text)]">{cycle.label}</span> ({cycleMonths} Month{cycleMonths > 1 ? "s" : ""})
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[var(--ui-text-muted)] block">Total Payable</span>
            <div className="text-lg font-black text-[var(--ui-text)]">
              {formatPackageMoney(totalAmount)}
            </div>
            {pkg.originalTotal && pkg.originalTotal > totalAmount ? (
              <span className="text-[10px] text-rose-500 line-through">
                {formatPackageMoney(pkg.originalTotal)}
              </span>
            ) : null}
          </div>
        </div>

        {pkg.totalSave && pkg.totalSave > 0 ? (
          <div className="mt-2 pt-2 border-t border-[var(--ui-border)] flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="inline-flex items-center gap-1 text-[11px]">
              <FaCheckCircle size={11} /> Multi-Month Savings:
            </span>
            <span>{formatPackageMoney(pkg.totalSave)}</span>
          </div>
        ) : null}
      </div>

      {/* Validation Alert */}
      {validationError && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-medium">
          {validationError}
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-[var(--ui-text)] mb-1">
            Customer / Organization Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. John Doe / Star Enterprises"
            className="w-full px-3 py-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] text-xs text-[var(--ui-text)] focus:outline-none focus:border-[var(--primary-color)] transition-colors"
          />
        </div>

        {/* Mobile Number & OTP Section */}
        <div>
          <label className="block text-xs font-semibold text-[var(--ui-text)] mb-1">
            Mobile Number (Verification Required) <span className="text-rose-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="tel"
              required
              value={mobile}
              onChange={handlePhoneChange}
              placeholder="01XXXXXXXXX"
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] text-xs text-[var(--ui-text)] focus:outline-none focus:border-[var(--primary-color)] transition-colors"
            />
            {canSendOtp && (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSendingOtp || resendCooldown > 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-[var(--primary-color)] hover:brightness-110 text-white transition shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isSendingOtp ? (
                  <>
                    <FaSpinner className="animate-spin" size={11} />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <FaPaperPlane size={11} />
                    <span>{otpSent ? "Resend" : "Send OTP"}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* OTP Status Messages */}
          <div className="mt-1 flex items-center justify-between text-[11px]">
            {isCheckingMobile ? (
              <span className="text-[var(--ui-text-muted)] inline-flex items-center gap-1">
                <FaSpinner className="animate-spin" size={10} /> Checking account...
              </span>
            ) : isOtpVerified ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                <FaCheckCircle size={11} /> {otpMessage || "Mobile number verified."}
              </span>
            ) : otpMessage ? (
              <span className="text-[var(--ui-text-muted)]">{otpMessage}</span>
            ) : (
              <span className="text-[var(--ui-text-muted)]">11-digit Bangladeshi mobile number</span>
            )}

            {resendCooldown > 0 && !isOtpVerified && (
              <span className="text-[var(--ui-text-muted)] font-mono">
                Resend in {resendCooldown}s
              </span>
            )}
          </div>

          {/* 4-Box OTP Input */}
          {otpSent && !isOtpVerified && (
            <div className="mt-2.5 p-3 rounded-xl bg-[var(--ui-surface-muted)]/70 border border-[var(--ui-border)] animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[var(--ui-text)]">
                  Enter 4-Digit OTP Code
                </span>
                <span className="text-[10px] text-[var(--ui-text-muted)]">
                  Sent to {cleanPhone}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2.5 my-1" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={otpRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-11 text-center text-lg font-black rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text)] focus:outline-none focus:border-[var(--primary-color)] shadow-2xs transition-all"
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--ui-text-muted)]">
                <span>Didn't receive code?</span>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={resendCooldown > 0 || isSendingOtp}
                  className="font-bold text-[var(--primary-color)] hover:underline inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                >
                  <FaRedo size={10} />
                  <span>{resendCooldown > 0 ? `Wait ${resendCooldown}s` : "Resend Code"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ui-text)] mb-1">
            Email Address <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@business.com"
            className="w-full px-3 py-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] text-xs text-[var(--ui-text)] focus:outline-none focus:border-[var(--primary-color)] transition-colors"
          />
          <p className="text-[10px] text-[var(--ui-text-muted)] mt-0.5">For payment receipt and tax invoice</p>
        </div>
      </div>

      {/* Security Note */}
      <div className="p-2.5 rounded-lg bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] flex items-center gap-2 text-[11px] text-[var(--ui-text-muted)]">
        <FaShieldAlt className="text-emerald-500 shrink-0" size={13} />
        <span>
          Secured Checkout with OTP validation & PCI-DSS Compliant Payment Gateway.
        </span>
      </div>

      {/* Footer Buttons */}
      <div className="pt-2.5 border-t border-[var(--ui-border)] flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={initiatePaymentMutation.isPending}
          className="px-3.5 py-2 rounded-lg text-xs font-semibold text-[var(--ui-text-muted)] hover:bg-[var(--ui-surface-muted)] transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isOtpVerified || initiatePaymentMutation.isPending}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold bg-[var(--primary-color)] hover:brightness-110 text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
        >
          {initiatePaymentMutation.isPending ? (
            <>
              <FaSpinner className="animate-spin" size={12} />
              <span>Processing...</span>
            </>
          ) : !isOtpVerified ? (
            <>
              <FaLock size={11} />
              <span>Verify Phone to Pay ({formatPackageMoney(totalAmount)})</span>
            </>
          ) : (
            <>
              <FaCheckCircle size={11} />
              <span>Proceed to Payment ({formatPackageMoney(totalAmount)})</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export const SubscribeCheckoutModal: React.FC<SubscribeCheckoutModalProps> = ({
  isOpen,
  onClose,
  pkg,
  cycle,
  initialPhone = "",
  initialName = "",
  initialEmail = "",
  userId = "",
}) => {
  if (!isOpen || !pkg || !cycle) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Subscription Checkout & Payment"
      size="lg"
    >
      <CheckoutFormContent
        key={`${pkg.id}_${cycle.code}`}
        pkg={pkg}
        cycle={cycle}
        initialPhone={initialPhone}
        initialName={initialName}
        initialEmail={initialEmail}
        userId={userId}
        onClose={onClose}
      />
    </Modal>
  );
};

export default SubscribeCheckoutModal;

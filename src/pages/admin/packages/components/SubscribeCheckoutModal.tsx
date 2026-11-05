import React, { useState } from "react";
import {
  FaSpinner,
  FaCheckCircle,
} from "react-icons/fa";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import type { PricedPackage, BillingCycle, PaymentInitiatePayload } from "@/types";
import { useInitiatePackagePaymentMutation } from "@/hooks/usePackageQueries";
import { useUserProfileQuery } from "@/hooks/useUserProfile";
import {
  formatPackageMoney,
  normalizeBdMobile,
  isEmailAddress,
  formatDateForPayment,
} from "../utils/package-formatters";
import { getUserInfo, getStoredUser } from "@/utils/auth-storage";

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
  const userInfo = getUserInfo();
  const storedUser = getStoredUser();

  const rawLoginPhone =
    (userInfo as any)?.phone ||
    userInfo?.phoneNumber ||
    (storedUser as any)?.phone ||
    (storedUser as any)?.phoneNumber ||
    initialPhone ||
    "";

  const rawLoginName =
    userInfo?.fullName ||
    (userInfo as any)?.businessName ||
    storedUser?.name ||
    initialName ||
    "";

  const sanitizeEmail = (val?: string | null): string => {
    const s = String(val ?? "").trim();
    return isEmailAddress(s) ? s : "";
  };

  const { data: profile } = useUserProfileQuery();

  const profileMobile = profile?.phoneNumber ? normalizeBdMobile(profile.phoneNumber) : "";
  const profileEmail = profile?.email ? sanitizeEmail(profile.email) : "";
  const profileFullName = profile?.fullName?.trim() || "";

  const initialResolvedEmail =
    profileEmail ||
    sanitizeEmail(storedUser?.email) ||
    sanitizeEmail(rawLoginPhone) ||
    sanitizeEmail(initialEmail);

  const initialResolvedName = profileFullName || rawLoginName || "";
  const initialResolvedMobile = normalizeBdMobile(rawLoginPhone) || profileMobile || "";

  const [fullName, setFullName] = useState(initialResolvedName);
  const [mobile, setMobile] = useState(initialResolvedMobile);
  const [email, setEmail] = useState(initialResolvedEmail);
  const [isNameLocked, setIsNameLocked] = useState(Boolean(initialResolvedName));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const initiatePaymentMutation = useInitiatePackagePaymentMutation();
  const totalAmount = pkg.total ?? 0;
  const cycleMonths = cycle.months || 1;

  const [prevProfile, setPrevProfile] = useState(profile);
  if (profile && profile !== prevProfile) {
    setPrevProfile(profile);
    if (profile.fullName && !fullName) {
      setFullName(profile.fullName);
      setIsNameLocked(true);
    }
    if (profile.phoneNumber && !mobile) {
      setMobile(normalizeBdMobile(profile.phoneNumber));
    }
    const verifiedEmail = sanitizeEmail(profile.email);
    if (verifiedEmail && !email) {
      setEmail(verifiedEmail);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanPhone = normalizeBdMobile(mobile);
    if (!cleanPhone) {
      setValidationError("A valid 11-digit Bangladeshi mobile number (01XXXXXXXXX) is required.");
      return;
    }

    const cleanEmail = email.trim();
    if (!isEmailAddress(cleanEmail)) {
      setValidationError("Please enter a valid email address (e.g. name@example.com).");
      return;
    }

    if (!fullName.trim()) {
      setValidationError("Please enter customer or organization name.");
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

      {/* Form Fields - Single-row 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[var(--ui-text)] mb-1">
            Customer / Org Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={fullName}
            readOnly={isNameLocked}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. John Doe / Star Enterprises"
            className={`w-full px-3 py-2 rounded-lg border border-[var(--ui-border)] text-xs text-[var(--ui-text)] focus:outline-none transition-colors ${
              isNameLocked
                ? "bg-[var(--ui-surface-muted)] cursor-not-allowed opacity-90"
                : "bg-[var(--ui-surface)] focus:border-[var(--primary-color)]"
            }`}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ui-text)] mb-1">
            Mobile Number <span className="text-rose-500">*</span>
          </label>
          <input
            type="tel"
            required
            value={mobile}
            onChange={(e) => {
              setMobile(e.target.value);
              setValidationError(null);
            }}
            placeholder="01XXXXXXXXX"
            className="w-full px-3 py-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] text-xs text-[var(--ui-text)] focus:outline-none focus:border-[var(--primary-color)] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ui-text)] mb-1">
            Email Address <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setValidationError(null);
            }}
            placeholder="name@business.com"
            className="w-full px-3 py-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] text-xs text-[var(--ui-text)] focus:outline-none focus:border-[var(--primary-color)] transition-colors"
          />
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="pt-2.5 border-t border-[var(--ui-border)] flex items-center justify-end gap-2">
        <Button
          label="Cancel"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={initiatePaymentMutation.isPending}
          buttonClass="!bg-[var(--ui-surface)] hover:!bg-[var(--ui-surface-sunken)] !border-[var(--ui-border)] !text-[var(--ui-text)] font-medium !rounded-lg !py-1.5 !px-3.5 text-xs cursor-pointer"
        />
        <Button
          label={
            initiatePaymentMutation.isPending
              ? "Redirecting..."
              : `Proceed to Payment (${formatPackageMoney(totalAmount)})`
          }
          type="submit"
          size="sm"
          color="var(--primary-color)"
          hoverColor="var(--primary-color-hover)"
          isLoading={initiatePaymentMutation.isPending}
          disabled={initiatePaymentMutation.isPending}
          buttonClass="font-semibold !rounded-lg !py-1.5 !px-4 text-xs text-white cursor-pointer shadow-xs"
        />
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
      size="xl"
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

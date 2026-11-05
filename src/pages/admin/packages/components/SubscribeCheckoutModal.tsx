import React, { useState } from "react";
import { FaShieldAlt, FaLock, FaSpinner, FaCheckCircle } from "react-icons/fa";
import Modal from "@/components/modal/Modal";
import { PricedPackage, BillingCycle, PaymentInitiatePayload } from "@/types";
import { useInitiatePackagePaymentMutation } from "@/hooks/usePackageQueries";
import {
  formatPackageMoney,
  normalizeBdMobile,
  isEmailAddress,
  formatDateForPayment,
} from "../utils/package-formatters";

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

  const initiatePaymentMutation = useInitiatePackagePaymentMutation();
  const totalAmount = pkg.total ?? 0;
  const cycleMonths = cycle.months || 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanPhone = normalizeBdMobile(mobile);
    if (!cleanPhone) {
      setValidationError(
        mobile.trim()
          ? `"${mobile}" একটি সঠিক মোবাইল নম্বর নয়। অনুগ্রহ করে ০১XXXXXXXXX ফরম্যাটে দিন।`
          : "পেমেন্টের জন্য মোবাইল নম্বর প্রদান করা আবশ্যক (০১XXXXXXXXX)।"
      );
      return;
    }

    const cleanEmail = email.trim();
    if (!isEmailAddress(cleanEmail)) {
      setValidationError("অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা দিন (যেমন: info@example.com)।");
      return;
    }

    if (!fullName.trim()) {
      setValidationError("অনুগ্রহ করে আপনার নাম অথবা প্রতিষ্ঠানের নাম লিখুন।");
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
      productName: `BUSINESS|${pkg.name}|${cycle.labelBn}`,
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
          res.ErrorMessage || res.errorMessage || res.message || "পেমেন্ট গেটওয়ে URL পাওয়া যায়নি।"
        );
        setIsRedirecting(false);
      }
    } catch (err: any) {
      setValidationError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "পেমেন্ট শুরু করতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।"
      );
      setIsRedirecting(false);
    }
  };

  if (isRedirecting) {
    return (
      <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 animate-spin">
          <FaSpinner className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
          পেমেন্ট গেটওয়েতে রিডাইরেক্ট করা হচ্ছে...
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          অনুগ্রহ করে অপেক্ষা করুন। আপনাকে নিরাপদ পেমেন্ট পেজে নিয়ে যাওয়া হচ্ছে। পেজ রিফ্রেশ করবেন না।
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      {/* Order Summary Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-slate-800 dark:to-slate-800/60 border border-blue-100/60 dark:border-slate-700">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              নির্বাচিত প্যাকেজ
            </span>
            <h4 className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">
              {pkg.nameBn || pkg.name}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              মেয়াদ: <span className="font-semibold text-slate-700 dark:text-slate-200">{cycle.labelBn}</span> ({cycleMonths} মাস)
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">পরিশোধযোগ্য মূল্য</span>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatPackageMoney(totalAmount, true)}
            </div>
            {pkg.originalTotal && pkg.originalTotal > totalAmount ? (
              <span className="text-xs text-rose-500 line-through">
                {formatPackageMoney(pkg.originalTotal, true)}
              </span>
            ) : null}
          </div>
        </div>

        {pkg.totalSave && pkg.totalSave > 0 ? (
          <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="inline-flex items-center gap-1">
              <FaCheckCircle className="w-3.5 h-3.5" /> মোট সাশ্রয়:
            </span>
            <span>{formatPackageMoney(pkg.totalSave, true)}</span>
          </div>
        ) : null}
      </div>

      {/* Validation Alert */}
      {validationError && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          {validationError}
        </div>
      )}

      {/* Customer Form */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            গ্রাহক / প্রতিষ্ঠানের নাম <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="যেমন: মোঃ করিম / মেসার্স স্টার এন্টারপ্রাইজ"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              মোবাইল নম্বর <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="০১XXXXXXXXX"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <p className="text-[11px] text-slate-400 mt-0.5">১১ ডিজিটের স্থানীয় নম্বর (যেমন: 017xxxxxxxx)</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ইমেইল ঠিকানা <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@business.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <p className="text-[11px] text-slate-400 mt-0.5">পেমেন্ট রসিদ এবং ইনভয়েস পাঠানো হবে</p>
          </div>
        </div>
      </div>

      {/* Secure Payment Footer Note */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
        <FaShieldAlt className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          নিরাপদ পেমেন্ট গেটওয়ে। বিকাশ, নগদ, রকেট এবং সকল প্রধান ব্যাংকের কার্ড দ্বারা সরাসরি পেমেন্ট করতে পারবেন।
        </span>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={initiatePaymentMutation.isPending}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          বাতিল
        </button>
        <button
          type="submit"
          disabled={initiatePaymentMutation.isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 transition disabled:opacity-50 cursor-pointer"
        >
          {initiatePaymentMutation.isPending ? (
            <>
              <FaSpinner className="w-4 h-4 animate-spin" />
              <span>প্রক্রিয়াধীন...</span>
            </>
          ) : (
            <>
              <FaLock className="w-3.5 h-3.5" />
              <span>পেমেন্ট করুন ({formatPackageMoney(totalAmount, true)})</span>
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
      title="সাবস্ক্রিপশন কনফার্মেশন ও পেমেন্ট"
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

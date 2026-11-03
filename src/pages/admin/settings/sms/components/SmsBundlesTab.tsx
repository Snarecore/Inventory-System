import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FaCoins,
  FaFire,
  FaShieldAlt,
  FaCreditCard,
  FaExternalLinkAlt,
  FaRedo,
  FaTimesCircle,
  FaSpinner,
  FaGlobe,
  FaCheckDouble,
  FaCrown,
  FaBolt,
  FaGem,
  FaPaperPlane,
} from "react-icons/fa";
import { useSmsBundles, usePurchaseSmsBundle } from "@/hooks/useSms";
import { getUserInfo, getStoredUser } from "@/utils/auth-storage";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import TextInput from "@/components/form/TextInput";
import type { SmsBundleItem } from "@/types";

interface TierConfig {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  iconBg: string;
  badge: string;
  badgeClass: string;
}

const getTierConfig = (smsCount: number, isPopular?: boolean): TierConfig => {
  if (smsCount >= 10000) {
    return {
      icon: FaGem,
      iconColor: "text-purple-600 dark:text-purple-400",
      iconBg: "bg-purple-500/10 border-purple-500/20",
      badge: "Enterprise",
      badgeClass:
        "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    };
  }
  if (smsCount >= 5000) {
    return {
      icon: FaCrown,
      iconColor: "text-indigo-600 dark:text-indigo-400",
      iconBg: "bg-indigo-500/10 border-indigo-500/20",
      badge: "Corporate",
      badgeClass:
        "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    };
  }
  if (isPopular || smsCount >= 1000) {
    return {
      icon: FaFire,
      iconColor: "text-rose-600 dark:text-rose-400",
      iconBg: "bg-rose-500/10 border-rose-500/20",
      badge: "Most Popular",
      badgeClass: "bg-[var(--primary-color)] text-white shadow-xs border-transparent",
    };
  }
  if (smsCount >= 500) {
    return {
      icon: FaBolt,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-500/10 border-amber-500/20",
      badge: "Growth",
      badgeClass:
        "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    };
  }
  return {
    icon: FaPaperPlane,
    iconColor: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-500/10 border-sky-500/20",
    badge: "Starter",
    badgeClass:
      "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  };
};

const calculateSavings = (pricePerSms: number, baseRate = 0.5): number => {
  if (pricePerSms >= baseRate) return 0;
  return Math.round(((baseRate - pricePerSms) / baseRate) * 100);
};

export const SmsBundlesTab: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: bundles = [], isLoading, error, refetch } = useSmsBundles();
  const purchaseMutation = usePurchaseSmsBundle();

  const [selectedBundle, setSelectedBundle] = useState<SmsBundleItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const userInfo = getUserInfo();
  const storedUser = getStoredUser();

  const [customerName, setCustomerName] = useState<string>(
    userInfo?.fullName ?? ""
  );
  const [customerPhone, setCustomerPhone] = useState<string>(
    userInfo?.phone ?? ""
  );
  const [customerEmail, setCustomerEmail] = useState<string>(
    storedUser?.email && storedUser.email.includes("@") ? storedUser.email : ""
  );

  const paymentStatus = (searchParams.get("payment_status") ?? "").toLowerCase();
  const isReturnSuccess = paymentStatus === "success" || paymentStatus === "completed";
  const isReturnFailed = ["failed", "error", "cancel", "cancelled"].includes(paymentStatus);

  const handleDismissPaymentStatus = () => {
    searchParams.delete("payment_status");
    searchParams.delete("status");
    searchParams.delete("eps_status");
    searchParams.delete("transactionId");
    setSearchParams(searchParams, { replace: true });
  };

  const handleOpenPurchase = (bundle: SmsBundleItem) => {
    setSelectedBundle(bundle);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!purchaseMutation.isPending) {
      setIsModalOpen(false);
      setSelectedBundle(null);
    }
  };

  const handleConfirmPurchase = () => {
    if (!selectedBundle || purchaseMutation.isPending) return;

    const phone = customerPhone.trim();
    const email = customerEmail.trim();

    purchaseMutation.mutate({
      bundleId: selectedBundle.id,
      userId: Number(storedUser?.id ?? 1),
      customerName: customerName.trim(),
      customerPhone: phone,
      customerEmail: email ? email : `${phone}@cashboi.app`,
      businessCode: userInfo?.businessCode ?? phone,
      requestAgent: "WEB",
    });
  };

  return (
    <div className="space-y-3 sm:space-y-3.5">
      {/* Payment Gateway Return Alerts */}
      {isReturnSuccess && (
        <div className="bg-[var(--ui-success-light)] border border-[var(--ui-success-border)] p-2.5 sm:p-3 rounded-xl shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FaCheckDouble className="text-[var(--ui-success)] text-base shrink-0" />
            <div>
              <div className="text-xs font-bold text-[var(--ui-success-dark)]">
                Payment Completed Successfully!
              </div>
              <div className="text-[11px] text-[var(--ui-success-dark)]/85">
                Your SMS bundle has been activated and added to your balance.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismissPaymentStatus}
            className="text-xs text-[var(--ui-success-dark)] hover:underline font-semibold px-2 py-1 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {isReturnFailed && (
        <div className="bg-[var(--ui-danger-light)] border border-[var(--ui-danger-border)] p-2.5 sm:p-3 rounded-xl shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FaTimesCircle className="text-[var(--ui-danger)] text-base shrink-0" />
            <div>
              <div className="text-xs font-bold text-[var(--ui-danger-dark)]">
                Payment Incomplete or Cancelled
              </div>
              <div className="text-[11px] text-[var(--ui-danger-dark)]/85">
                Transaction was not completed. You can try again at any time.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismissPaymentStatus}
            className="text-xs text-[var(--ui-danger-dark)] hover:underline font-semibold px-2 py-1 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}


      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-72 ui-card animate-pulse p-3.5 space-y-3 rounded-xl border border-[var(--ui-border)]"
            >
              <div className="h-4 bg-[var(--ui-surface-sunken)] rounded w-1/2" />
              <div className="h-12 bg-[var(--ui-surface-muted)] rounded-lg" />
              <div className="h-8 bg-[var(--ui-surface-sunken)] rounded" />
              <div className="h-16 bg-[var(--ui-surface-muted)] rounded" />
              <div className="h-8 bg-[var(--ui-surface-sunken)] rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {/* Error State with Retry */}
      {error && (
        <div className="p-6 ui-card text-center space-y-2.5 rounded-2xl border border-[var(--ui-border)]">
          <FaTimesCircle className="text-[var(--ui-danger)] text-2xl mx-auto" />
          <div className="text-xs font-bold text-[var(--ui-text)]">
            Failed to load SMS packages
          </div>
          <p className="text-[11px] text-[var(--ui-text-muted)] max-w-md mx-auto">
            Unable to connect to the bundle service. Please check your network and retry.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 mx-auto text-xs py-1.5"
          >
            <FaRedo size={10} /> Retry
          </Button>
        </div>
      )}

      {/* Rich Pricing Cards Grid */}
      {!isLoading && !error && bundles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3 items-stretch">
          {bundles.map((bundle) => {
            const isPopular = Boolean(bundle.popular);
            const tier = getTierConfig(bundle.smsCount, isPopular);
            const savings = calculateSavings(bundle.pricePerSms);
            const TierIcon = tier.icon;

            return (
              <div
                key={bundle.id}
                className={`ui-card group rounded-xl p-3 sm:p-3.5 flex flex-col justify-between relative transition-all duration-200 ${
                  isPopular
                    ? "border-2 border-[var(--primary-color)] shadow-[0_4px_20px_rgb(var(--primary-rgb,14,165,233)/0.12)] bg-gradient-to-b from-[var(--primary-color)]/[0.04] to-[var(--ui-surface)] hover:border-[var(--primary-color)] hover:shadow-md"
                    : "border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:border-[var(--primary-color)] hover:shadow-xs"
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-1.5 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${tier.iconBg} ${tier.iconColor}`}
                      >
                        <TierIcon size={13} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[var(--ui-text)] leading-tight">
                          {bundle.name}
                        </h3>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${tier.badgeClass}`}
                    >
                      {tier.badge}
                    </span>
                  </div>

                  {/* Credits & Rate Metric Box */}
                  <div className="p-2.5 rounded-lg bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] mb-2.5">
                    <div className="text-[9px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider">
                      SMS Credits
                    </div>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl font-black text-[var(--ui-text)] tabular-nums tracking-tight">
                        {bundle.smsCount.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[11px] font-bold text-[var(--primary-color)]">
                        SMS
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1.5 mt-1.5 border-t border-[var(--ui-border)]">
                      <span className="text-[10px] text-[var(--ui-text-muted)]">Unit Rate</span>
                      <span className="font-bold text-[var(--ui-text)] text-xs tabular-nums">
                        ৳{bundle.pricePerSms.toFixed(2)}{" "}
                        <span className="text-[9px] font-normal text-[var(--ui-text-muted)]">
                          / SMS
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Total Price & Savings Tag */}
                  <div className="flex items-baseline justify-between mb-2.5 px-0.5">
                    <div>
                      <span className="text-[10px] font-medium text-[var(--ui-text-muted)] block">
                        Package Total
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-xs font-bold text-[var(--primary-color)]">৳</span>
                        <span className="text-xl font-black text-[var(--ui-text)] tabular-nums tracking-tight">
                          {bundle.price.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                    {savings > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        Save {savings}%
                      </span>
                    )}
                  </div>

                  {/* Feature Checklist with Distinct Micro-Icons */}
                  <div className="space-y-1.5 text-xs pb-2.5 border-t border-[var(--ui-border)] pt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                        <FaShieldAlt size={9} />
                      </div>
                      <span className="text-[11px] text-[var(--ui-text)]">
                        Masking: <strong className="font-semibold">Cash Boi</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <FaGlobe size={9} />
                      </div>
                      <span className="text-[11px] text-[var(--ui-text-muted)]">
                        Bangla & English (Unicode)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <FaCheckDouble size={9} />
                      </div>
                      <span className="text-[11px] text-[var(--ui-text-muted)]">
                        Instant Delivery Reports
                      </span>
                    </div>
                  </div>
                </div>

                {/* Purchase Action Button */}
                <div className="pt-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenPurchase(bundle)}
                    disabled={purchaseMutation.isPending}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed ${
                      isPopular
                        ? "bg-[var(--primary-color)] text-white hover:bg-[var(--primary-color-hover)] shadow-xs"
                        : "bg-[var(--ui-surface-muted)] text-[var(--ui-text)] group-hover:border-[var(--primary-color)] group-hover:text-[var(--primary-color)] hover:bg-[var(--ui-surface-sunken)] border border-[var(--ui-border)]"
                    }`}
                  >
                    <FaCoins
                      size={11}
                      className={isPopular ? "text-white" : "text-[var(--primary-color)]"}
                    />
                    <span>Recharge Package</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Channels Strip */}
      <div className="ui-card p-2.5 rounded-xl border border-[var(--ui-border)] hover:border-[var(--primary-color)]/60 transition-colors flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ui-text)]">
          <FaCreditCard className="text-[var(--primary-color)]" size={12} />
          <span>Supported Payment Channels:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { name: "bKash", color: "bg-[#e2136e]" },
            { name: "Nagad", color: "bg-[#f7941d]" },
            { name: "Rocket", color: "bg-[#8c3494]" },
            { name: "Upay", color: "bg-[#005baa]" },
            { name: "Visa / MasterCard", color: "bg-slate-700" },
            { name: "Internet Banking", color: "bg-emerald-600" },
          ].map((m) => (
            <span
              key={m.name}
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] text-[var(--ui-text)]"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${m.color}`} />
              {m.name}
            </span>
          ))}
        </div>
      </div>

      {/* Order Confirmation Modal */}
      {isModalOpen && selectedBundle && (
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title="Confirm SMS Bundle Order"
          maxWidth="max-w-md"
        >
          {purchaseMutation.isPending ? (
            <div className="py-7 px-4 text-center space-y-3">
              <FaSpinner className="animate-spin text-3xl text-[var(--primary-color)] mx-auto" />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[var(--ui-text)]">
                  Redirecting to EPS Payment Gateway...
                </h3>
                <p className="text-[11px] text-[var(--ui-text-muted)] mt-1">
                  Please wait. Do not refresh or close this tab.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5 text-xs">
              {/* Selected Bundle Summary */}
              <div className="bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] p-3.5 rounded-[var(--ui-radius-md)] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[var(--ui-text)] text-sm">
                      {selectedBundle.name}
                    </span>
                  </div>
                  <span className="text-base font-extrabold text-[var(--primary-color)] tabular-nums">
                    ৳ {selectedBundle.price.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[var(--ui-text-muted)] pt-1.5 border-t border-[var(--ui-border)]">
                  <span>{selectedBundle.smsCount.toLocaleString("en-IN")} Credits</span>
                  <span className="text-[var(--ui-success-dark)] font-semibold">Instant Top-up</span>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-2.5">
                <TextInput
                  label="Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your Name"
                />
                <TextInput
                  label="Phone Number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                />
                <div>
                  <TextInput
                    label="Email (Optional)"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                  {customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim()) && (
                    <span className="text-[10px] text-[var(--ui-danger)] mt-0.5 block">
                      Please enter a valid email format (e.g. name@example.com) or leave blank.
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-[var(--ui-text-muted)] bg-[var(--ui-surface-muted)] p-2 rounded border border-[var(--ui-border)]">
                You will be redirected to the secure EPS payment gateway to complete checkout with bKash, Nagad or Card.
              </p>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--ui-border)]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseModal}
                  disabled={purchaseMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleConfirmPurchase}
                  disabled={
                    purchaseMutation.isPending ||
                    !customerPhone.trim() ||
                    (Boolean(customerEmail.trim()) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim()))
                  }
                  className="flex items-center gap-1.5"
                >
                  <FaExternalLinkAlt size={10} />
                  {purchaseMutation.isPending ? "Processing..." : "Proceed to Payment"}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default SmsBundlesTab;

import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FaCoins,
  FaCheckCircle,
  FaFire,
  FaShieldAlt,
  FaCreditCard,
  FaExternalLinkAlt,
  FaRedo,
  FaTimesCircle,
  FaSpinner,
} from "react-icons/fa";
import { useSmsBundles, usePurchaseSmsBundle } from "@/hooks/useSms";
import { getUserInfo, getStoredUser } from "@/utils/auth-storage";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import TextInput from "@/components/form/TextInput";
import type { SmsBundleItem } from "@/types";

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
    <div className="space-y-5">
      {/* Payment Gateway Return Alerts */}
      {isReturnSuccess && (
        <div className="bg-[var(--ui-success-light)] border border-[var(--ui-success-border)] p-3.5 rounded-[var(--ui-radius-lg)] shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FaCheckCircle className="text-[var(--ui-success)] text-lg shrink-0" />
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
            className="text-xs text-[var(--ui-success-dark)] hover:underline font-semibold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {isReturnFailed && (
        <div className="bg-[var(--ui-danger-light)] border border-[var(--ui-danger-border)] p-3.5 rounded-[var(--ui-radius-lg)] shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FaTimesCircle className="text-[var(--ui-danger)] text-lg shrink-0" />
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
            className="text-xs text-[var(--ui-danger-dark)] hover:underline font-semibold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[var(--primary-color)] via-[var(--primary-color-hover)] to-[var(--ui-accent-2)] text-white p-4 sm:p-5 rounded-[var(--ui-radius-lg)] shadow-[var(--ui-shadow-card)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold backdrop-blur-xs mb-1.5">
            <FaCoins size={10} /> Official SMS Bundles
          </span>
          <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
            Choose an SMS Package
          </h2>
          <p className="text-xs text-white/85 mt-0.5 max-w-xl">
            Recharge your SMS balance instantly with 12 months validity via bKash, Nagad, Rocket or Card.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-[var(--ui-radius-md)] backdrop-blur-xs shrink-0 border border-white/20">
          <FaShieldAlt size={18} className="text-white/90" />
          <div className="text-left">
            <div className="text-[11px] font-bold">EPS Gateway</div>
            <div className="text-[10px] text-white/80">Instant Top-up</div>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-64 ui-card animate-pulse p-4 space-y-3"
            >
              <div className="h-4 bg-[var(--ui-surface-sunken)] rounded w-1/2 mx-auto" />
              <div className="h-7 bg-[var(--ui-surface-sunken)] rounded w-3/4 mx-auto" />
              <div className="h-12 bg-[var(--ui-surface-muted)] rounded" />
              <div className="h-9 bg-[var(--ui-surface-sunken)] rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error State with Retry */}
      {error && (
        <div className="p-5 ui-card text-center space-y-2.5">
          <FaTimesCircle className="text-[var(--ui-danger)] text-2xl mx-auto" />
          <div className="text-xs font-bold text-[var(--ui-text)]">
            Failed to load SMS bundles
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

      {/* Pricing Cards Grid */}
      {!isLoading && !error && bundles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 items-stretch">
          {bundles.map((bundle) => {
            const isPopular = Boolean(bundle.popular);
            return (
              <div
                key={bundle.id}
                className={`relative ui-card p-4 flex flex-col justify-between transition-all duration-200 ${
                  isPopular
                    ? "border-[var(--primary-color)] ring-2 ring-[var(--primary-color)]/20 shadow-md"
                    : "hover:border-[var(--primary-color)]/50"
                }`}
              >
                {/* Popular Tag */}
                {isPopular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[var(--primary-color)] text-white text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                    <FaFire size={9} /> Popular
                  </div>
                )}

                <div>
                  {/* Card Title */}
                  <div className="text-center pt-0.5 pb-2.5 border-b border-[var(--ui-border)]">
                    <h3 className="text-sm font-bold text-[var(--ui-text)]">
                      {bundle.name}
                    </h3>
                    {bundle.bundleCode && (
                      <span className="text-[10px] font-semibold text-[var(--ui-text-muted)] bg-[var(--ui-surface-muted)] px-1.5 py-0.5 rounded mt-0.5 inline-block">
                        {bundle.bundleCode}
                      </span>
                    )}
                  </div>

                  {/* SMS Count */}
                  <div className="text-center my-3.5">
                    <div className="text-2xl font-extrabold text-[var(--primary-color)] tabular-nums">
                      {bundle.smsCount.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] font-semibold text-[var(--ui-text-muted)]">
                      SMS Credits
                    </div>
                  </div>

                  {/* Price breakdown */}
                  <div className="bg-[var(--ui-surface-muted)] p-2 rounded-[var(--ui-radius-sm)] text-center space-y-0.5 mb-3.5">
                    <div className="text-base font-extrabold text-[var(--ui-text)] tabular-nums">
                      ৳ {bundle.price.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] font-medium text-[var(--ui-text-muted)]">
                      ৳ {bundle.pricePerSms.toFixed(2)} / SMS
                    </div>
                  </div>

                  {/* Feature checklist */}
                  <ul className="text-[10.5px] text-[var(--ui-text-muted)] space-y-1.5 mb-4">
                    <li className="flex items-center gap-1.5">
                      <FaCheckCircle size={10} className="text-[var(--ui-success)] shrink-0" />
                      <span>{bundle.validityLabel}</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <FaCheckCircle size={10} className="text-[var(--ui-success)] shrink-0" />
                      <span>Cash Boi Sender ID</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <FaCheckCircle size={10} className="text-[var(--ui-success)] shrink-0" />
                      <span>Unicode & GSM-7 Support</span>
                    </li>
                  </ul>
                </div>

                {/* Purchase Button */}
                <Button
                  type="button"
                  variant={isPopular ? "primary" : "secondary"}
                  onClick={() => handleOpenPurchase(bundle)}
                  disabled={purchaseMutation.isPending}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold"
                >
                  <FaCoins size={10} />
                  Buy Bundle
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Channels Strip */}
      <div className="ui-card p-3 rounded-[var(--ui-radius-lg)] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-semibold text-[var(--ui-text)]">
          <FaCreditCard className="text-[var(--primary-color)]" />
          Supported Payment Methods:
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {["bKash", "Nagad", "Rocket", "Upay", "Visa / MasterCard", "Internet Banking"].map((m) => (
            <span
              key={m}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] text-[var(--ui-text-muted)]"
            >
              {m}
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
              <div className="bg-[var(--primary-color-light)] border border-[var(--primary-color-muted)] p-3 rounded-[var(--ui-radius-md)] flex items-center justify-between">
                <div>
                  <div className="font-bold text-[var(--primary-color-dark)] text-xs">
                    {selectedBundle.name} ({selectedBundle.bundleCode})
                  </div>
                  <div className="text-[11px] text-[var(--ui-text-muted)] mt-0.5">
                    {selectedBundle.smsCount.toLocaleString("en-IN")} SMS • {selectedBundle.validityLabel}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-extrabold text-[var(--primary-color)] tabular-nums">
                    ৳ {selectedBundle.price.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[9px] text-[var(--ui-success-dark)] font-semibold">
                    Instant Activation
                  </div>
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

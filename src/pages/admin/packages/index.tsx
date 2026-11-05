import React, { useState, useMemo } from "react";
import { FaRedo, FaExclamationTriangle } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import { usePricingQuery, useUserSubscriptionQuery } from "@/hooks/usePackageQueries";
import { getUserInfo, getStoredUser } from "@/utils/auth-storage";
import { PricedPackage } from "@/types";
import { PackagesHero } from "./components/PackagesHero";
import { BillingCycleSelector } from "./components/BillingCycleSelector";
import { PackageCard } from "./components/PackageCard";
import { FeatureComparisonTable } from "./components/FeatureComparisonTable";
import { SubscribeCheckoutModal } from "./components/SubscribeCheckoutModal";

const EMPTY_PACKAGES: PricedPackage[] = [];

const PackagesPage: React.FC = () => {
  const userInfo = getUserInfo();
  const storedUser = getStoredUser();
  const userId = (userInfo as any)?.userId ?? storedUser?.id ?? userInfo?.businessCode ?? "";

  const { data: pricingData, isLoading, isError, refetch } = usePricingQuery("BUSINESS");
  const { data: subscription } = useUserSubscriptionQuery(userId);

  const cycles = pricingData?.cycles;
  const rawPackages = pricingData?.packages;
  const featureGroups = pricingData?.featureGroups;

  const defaultCycleCode = useMemo(() => {
    if (!cycles || cycles.length === 0) return "";
    const sixMonth = cycles.find((c) => c.months === 6 || String(c.code).includes("6"));
    return sixMonth?.code ?? cycles[0].code;
  }, [cycles]);

  const defaultPackageId = useMemo(() => {
    if (!rawPackages || rawPackages.length === 0) return null;
    const featured = rawPackages.find((p) => p.featured);
    return featured?.id ?? rawPackages[0].id;
  }, [rawPackages]);

  const [userSelectedCycleCode, setUserSelectedCycleCode] = useState<string>("");
  const [userSelectedPackageId, setUserSelectedPackageId] = useState<string | number | null>(null);

  const activeCycleCode = userSelectedCycleCode || defaultCycleCode;
  const activePackageId = userSelectedPackageId ?? defaultPackageId;

  // Modal checkout state
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutPackage, setCheckoutPackage] = useState<PricedPackage | null>(null);

  const activeCycle = useMemo(() => {
    if (!cycles || cycles.length === 0) return undefined;
    return cycles.find((c) => c.code === activeCycleCode) ?? cycles[0];
  }, [cycles, activeCycleCode]);

  // Derive package prices for the active cycle
  const pricedPackages: PricedPackage[] = useMemo(() => {
    if (!rawPackages || rawPackages.length === 0) return EMPTY_PACKAGES;
    const months = activeCycle?.months ?? 1;

    return rawPackages.map((p) => {
      if (p.customPricing) {
        return { ...p, total: null, perMonth: null, discountPct: 0 };
      }

      const prices = p.prices || [];
      const priceEntry = prices.find(
        (pr) => pr.cycleCode === activeCycle?.code || pr.billingCycle === activeCycle?.code
      );

      if (priceEntry && priceEntry.finalPrice != null) {
        const total = Number(priceEntry.finalPrice);
        const originalTotal = Number(
          priceEntry.baseMonthlyPrice != null
            ? priceEntry.baseMonthlyPrice
            : p.monthlyPrice != null
            ? p.monthlyPrice * months
            : 0
        );
        const perMonth = months > 0 ? total / months : total;
        const originalPerMonth = months > 0 ? originalTotal / months : originalTotal;
        const savePerMonth = originalPerMonth > perMonth ? originalPerMonth - perMonth : 0;
        const totalSave = originalTotal > total ? originalTotal - total : 0;
        return {
          ...p,
          total,
          perMonth,
          originalTotal,
          originalPerMonth,
          savePerMonth,
          totalSave,
          discountPct: Number(priceEntry.discountPct || 0),
        };
      }

      if (p.monthlyPrice != null) {
        const total = p.monthlyPrice * months;
        return {
          ...p,
          total,
          perMonth: p.monthlyPrice,
          originalTotal: total,
          originalPerMonth: p.monthlyPrice,
          savePerMonth: 0,
          totalSave: 0,
          discountPct: 0,
        };
      }

      return { ...p, total: null, perMonth: null, discountPct: 0 };
    });
  }, [rawPackages, activeCycle]);

  const handleSelectPackageForCheckout = (pkg: PricedPackage) => {
    setCheckoutPackage(pkg);
    setCheckoutModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          headerTitle="Subscription Packages"
          headerDescription="Choose the right business plan and billing cycle to scale your operations"
        />
      </div>

      {/* Hero / Overview Description Banner */}
      <PackagesHero subscription={subscription} />

      {/* Billing Cycle Selector - Positioned between Description Banner and Cards */}
      {pricingData && cycles && cycles.length > 0 && (
        <div className="flex items-center justify-center my-0.5">
          <BillingCycleSelector
            cycles={cycles}
            selectedCycleCode={activeCycleCode}
            onSelectCycle={setUserSelectedCycleCode}
          />
        </div>
      )}

      {/* Loading State */}
      {isLoading && !pricingData && (
        <div className="p-12 flex flex-col items-center justify-center bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-full border-3 border-[var(--primary-color)] border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-[var(--ui-text-muted)]">
            Loading subscription packages and pricing plans...
          </p>
        </div>
      )}

      {/* Error State */}
      {isError && !pricingData && (
        <div className="p-8 text-center bg-[var(--ui-surface)] rounded-xl border border-rose-500/20 shadow-xs space-y-3 max-w-md mx-auto">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center text-xl">
            <FaExclamationTriangle />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--ui-text)]">
              Unable to Load Pricing Plans
            </h3>
            <p className="text-xs text-[var(--ui-text-muted)] mt-1">
              Failed to connect to the pricing service. Please check your network connection or try again.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-[var(--primary-color)] hover:brightness-110 text-white transition shadow-xs cursor-pointer"
          >
            <FaRedo className="w-3 h-3" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Pricing Content */}
      {pricingData && cycles && cycles.length > 0 && (
        <>
          {/* Packages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 items-stretch">
            {pricedPackages.map((pkg, idx) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                index={idx}
                cycle={activeCycle}
                isSelected={pkg.id === activePackageId}
                subscription={subscription}
                onSelect={() => setUserSelectedPackageId(pkg.id)}
                onAction={() => handleSelectPackageForCheckout(pkg)}
              />
            ))}
          </div>

          {/* Full Feature Comparison Table */}
          {featureGroups && featureGroups.length > 0 && (
            <FeatureComparisonTable
              packages={pricedPackages}
              featureGroups={featureGroups}
              cycle={activeCycle}
              subscription={subscription}
              onSelectPackage={handleSelectPackageForCheckout}
            />
          )}
        </>
      )}

      {/* Checkout Modal */}
      <SubscribeCheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        pkg={checkoutPackage}
        cycle={activeCycle ?? null}
        initialPhone={userInfo?.phone || userInfo?.phoneNumber || ""}
        initialName={userInfo?.fullName || userInfo?.businessName || storedUser?.name || ""}
        initialEmail={storedUser?.email || ""}
        userId={userId}
      />
    </div>
  );
};

export default PackagesPage;

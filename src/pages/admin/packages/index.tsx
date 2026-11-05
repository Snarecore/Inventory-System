import React, { useState, useMemo } from "react";
import { FaRedo, FaExclamationTriangle } from "react-icons/fa";
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
    <div className="min-h-screen pb-16 bg-slate-50/50 dark:bg-slate-950 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8 pt-4">
        {/* Hero Section */}
        <PackagesHero subscription={subscription} />

        {/* Loading State */}
        {isLoading && !pricingData && (
          <div className="p-16 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
            <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">
              প্যাকেজ ও মূল্য তালিকা লোড হচ্ছে...
            </p>
          </div>
        )}

        {/* Error State */}
        {isError && !pricingData && (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/40 shadow-sm space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-500 flex items-center justify-center text-2xl">
              <FaExclamationTriangle />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                মূল্য তালিকা লোড করা যায়নি
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি। অনুগ্রহ করে আপনার ইন্টারনেট চেক করুন অথবা পুনরায় চেষ্টা করুন।
              </p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white transition shadow-sm cursor-pointer"
            >
              <FaRedo className="w-3.5 h-3.5" />
              <span>পুনরায় চেষ্টা করুন</span>
            </button>
          </div>
        )}

        {/* Pricing Content */}
        {pricingData && cycles && cycles.length > 0 && (
          <>
            {/* Billing Cycle Selector Tabs */}
            <BillingCycleSelector
              cycles={cycles}
              selectedCycleCode={activeCycleCode}
              onSelectCycle={setUserSelectedCycleCode}
            />

            {/* Packages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
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
    </div>
  );
};

export default PackagesPage;

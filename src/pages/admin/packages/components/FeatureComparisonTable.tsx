import React from "react";
import { FaCheck, FaTimes, FaPhoneAlt, FaExternalLinkAlt, FaLock } from "react-icons/fa";
import { FeatureGroup, PricedPackage, BillingCycle, UserSubscription } from "@/types";
import { translateFeatureValue } from "../utils/package-formatters";

interface FeatureComparisonTableProps {
  packages: PricedPackage[];
  featureGroups: FeatureGroup[];
  cycle: BillingCycle | undefined;
  subscription: UserSubscription | null | undefined;
  onSelectPackage: (pkg: PricedPackage) => void;
  lang?: "bn" | "en";
}

export const FeatureComparisonTable: React.FC<FeatureComparisonTableProps> = ({
  packages,
  featureGroups,
  cycle,
  subscription,
  onSelectPackage,
  lang = "bn",
}) => {
  const isPremium = Boolean(subscription?.packageStatus && subscription.packageStatus !== "FREE");
  const currentPackageId = subscription?.packageId ?? null;
  const currentIndex = currentPackageId != null ? packages.findIndex((pkg) => pkg.id === currentPackageId) : -1;

  const getCtaState = (pkg: PricedPackage, idx: number) => {
    const locked = isPremium && currentIndex !== -1 && idx < currentIndex && pkg.code !== "CUSTOM";
    const isRenew =
      isPremium &&
      pkg.id === currentPackageId &&
      Boolean(cycle?.code) &&
      cycle?.code === subscription?.cycleCode;
    const isUpgrade = isPremium && !locked && !isRenew && pkg.code !== "CUSTOM";
    return { locked, isRenew, isUpgrade };
  };

  return (
    <div className="mt-12 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-100 dark:shadow-none overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {lang === "bn" ? "ফিচার তুলনা করুন" : "Compare Features"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === "bn"
              ? "আপনার ব্যবসার জন্য উপযুক্ত প্ল্যানটি নির্বাচন করতে ফিচারের বিবরণ দেখুন"
              : "Review feature breakdown to choose the plan that best fits your business"}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-900 text-white dark:bg-slate-950">
              <th className="py-4 px-6 font-semibold text-sm tracking-wider uppercase text-slate-200 w-1/3">
                {lang === "bn" ? "ফিচার সমূহ" : "Features"}
              </th>
              {packages.map((pkg) => (
                <th
                  key={pkg.id}
                  className="py-4 px-4 text-center font-bold text-sm tracking-wider uppercase"
                >
                  <span className={pkg.featured ? "text-amber-400" : "text-white"}>
                    {lang === "bn" && pkg.nameBn ? pkg.nameBn : pkg.name}
                  </span>
                  {pkg.featured && (
                    <span className="block text-[10px] text-amber-300 font-normal lowercase tracking-normal">
                      ({lang === "bn" ? "জনপ্রিয়" : "popular"})
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {featureGroups.map((group) => (
              <React.Fragment key={group.category}>
                <tr className="bg-slate-50/90 dark:bg-slate-800/60">
                  <td
                    colSpan={packages.length + 1}
                    className="py-3 px-6 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider"
                  >
                    {lang === "bn" && group.categoryBn ? group.categoryBn : group.category}
                  </td>
                </tr>
                {group.items.map((row) => (
                  <tr
                    key={row.feature}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3.5 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                      {lang === "bn" && row.featureBn ? row.featureBn : row.feature}
                    </td>
                    {row.values.map((val, i) => (
                      <td key={i} className="py-3.5 px-4 text-center">
                        {val === "Y" ? (
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                            <FaCheck className="w-3.5 h-3.5" />
                          </div>
                        ) : val === "N" ? (
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400">
                            <FaTimes className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                            {translateFeatureValue(val, lang === "bn")}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-t-2 border-slate-200 dark:border-slate-800">
              <td className="py-5 px-6 font-semibold text-sm text-slate-600 dark:text-slate-300">
                {lang === "bn" ? "প্যাকেজ অ্যাকশন" : "Plan Action"}
              </td>
              {packages.map((pkg, idx) => {
                const { locked, isRenew, isUpgrade } = getCtaState(pkg, idx);

                if (pkg.total === null) {
                  return (
                    <td key={pkg.id} className="py-5 px-3 text-center">
                      <a
                        href="tel:+8801988000800"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <FaPhoneAlt className="w-3 h-3 text-teal-600" />
                        <span>01988-000800</span>
                      </a>
                    </td>
                  );
                }

                if (pkg.total === 0) {
                  return (
                    <td key={pkg.id} className="py-5 px-3 text-center">
                      {locked ? (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                        >
                          <FaLock className="w-3 h-3" />
                          <span>{lang === "bn" ? "অ্যাকটিভ" : "Active"}</span>
                        </button>
                      ) : (
                        <a
                          href="https://play.google.com/store/apps/details?id=com.webnstech.cashboi&hl=en"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
                        >
                          <FaExternalLinkAlt className="w-3 h-3" />
                          <span>{lang === "bn" ? "ফ্রি শুরু করুন" : "Start Free"}</span>
                        </a>
                      )}
                    </td>
                  );
                }

                const buttonText = isRenew
                  ? lang === "bn"
                    ? "রিনিউ করুন"
                    : "Renew"
                  : isUpgrade
                  ? lang === "bn"
                    ? "আপগ্রেড করুন"
                    : "Upgrade"
                  : lang === "bn"
                  ? "সাবস্ক্রাইব"
                  : "Subscribe";

                return (
                  <td key={pkg.id} className="py-5 px-3 text-center">
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => !locked && onSelectPackage(pkg)}
                      className={`inline-flex items-center justify-center px-4 py-2 text-xs font-bold rounded-xl transition ${
                        locked
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                          : pkg.featured
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20"
                          : "bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white shadow-sm"
                      }`}
                    >
                      {locked ? <FaLock className="w-3 h-3 mr-1.5" /> : null}
                      <span>{buttonText}</span>
                    </button>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

import React from "react";
import { FaCheck, FaTimes, FaPhoneAlt, FaExternalLinkAlt, FaLock } from "react-icons/fa";
import type { FeatureGroup, PricedPackage, BillingCycle, UserSubscription } from "@/types";
import { translateFeatureValue } from "../utils/package-formatters";

interface FeatureComparisonTableProps {
  packages: PricedPackage[];
  featureGroups: FeatureGroup[];
  cycle: BillingCycle | undefined;
  subscription: UserSubscription | null | undefined;
  onSelectPackage: (pkg: PricedPackage) => void;
}

export const FeatureComparisonTable: React.FC<FeatureComparisonTableProps> = ({
  packages,
  featureGroups,
  cycle,
  subscription,
  onSelectPackage,
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
    <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] shadow-xs overflow-hidden transition-colors mt-4">
      {/* Table Section Header */}
      <div className="px-4 py-3 border-b border-[var(--ui-border)] bg-[var(--ui-surface)] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[var(--ui-text)]">
            Feature Comparison Matrix
          </h3>
          <p className="text-[11px] text-[var(--ui-text-muted)] mt-0.5">
            Compare all modules, capacity limits, and capabilities across plans
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[650px]">
          <thead>
            <tr className="bg-[var(--ui-surface-muted)] border-b border-[var(--ui-border)]">
              <th className="py-2.5 px-3.5 text-xs font-bold text-[var(--ui-text)] uppercase tracking-wider w-2/5">
                Features & Capabilities
              </th>
              {packages.map((pkg) => (
                <th
                  key={pkg.id}
                  className="py-2.5 px-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--ui-text)]"
                >
                  <span className={pkg.featured ? "text-[var(--primary-color)]" : ""}>
                    {pkg.name}
                  </span>
                  {pkg.featured && (
                    <span className="block text-[9px] text-[var(--primary-color)] font-medium lowercase tracking-normal">
                      (popular)
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ui-border)]">
            {featureGroups.map((group) => (
              <React.Fragment key={group.category}>
                <tr className="bg-[var(--ui-surface-sunken)] border-y border-[var(--ui-border)]">
                  <td
                    colSpan={packages.length + 1}
                    className="py-1.5 px-3.5 text-[11px] font-bold text-[var(--primary-color)] uppercase tracking-wider"
                  >
                    {group.category}
                  </td>
                </tr>
                {group.items.map((row) => (
                  <tr
                    key={row.feature}
                    className="hover:bg-[var(--ui-surface-muted)]/50 transition-colors"
                  >
                    <td className="py-2 px-3.5 text-xs font-medium text-[var(--ui-text)]">
                      {row.feature}
                    </td>
                    {row.values.map((val, i) => (
                      <td key={i} className="py-2 px-3 text-center">
                        {val === "Y" ? (
                          <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <FaCheck size={11} />
                          </div>
                        ) : val === "N" ? (
                          <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/10 text-rose-500 dark:text-rose-400">
                            <FaTimes size={11} />
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-[var(--ui-text)]">
                            {translateFeatureValue(val, false)}
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
            <tr className="bg-[var(--ui-surface-muted)] border-t border-[var(--ui-border)]">
              <td className="py-3 px-3.5 text-xs font-semibold text-[var(--ui-text-muted)]">
                Plan Action
              </td>
              {packages.map((pkg, idx) => {
                const { locked, isRenew, isUpgrade } = getCtaState(pkg, idx);

                if (pkg.total === null) {
                  return (
                    <td key={pkg.id} className="py-3 px-2 text-center">
                      <a
                        href="tel:+8801988000800"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text)] hover:bg-[var(--ui-surface-sunken)] transition cursor-pointer"
                      >
                        <FaPhoneAlt size={10} className="text-sky-500" />
                        <span>Sales</span>
                      </a>
                    </td>
                  );
                }

                if (pkg.total === 0) {
                  return (
                    <td key={pkg.id} className="py-3 px-2 text-center">
                      {locked ? (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--ui-surface-muted)] text-[var(--ui-text-subtle)] border border-[var(--ui-border)] cursor-not-allowed"
                        >
                          <FaLock size={10} />
                          <span>Active</span>
                        </button>
                      ) : (
                        <a
                          href="https://play.google.com/store/apps/details?id=com.webnstech.cashboi&hl=en"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition cursor-pointer"
                        >
                          <FaExternalLinkAlt size={10} />
                          <span>Start Free</span>
                        </a>
                      )}
                    </td>
                  );
                }

                const buttonText = isRenew
                  ? "Renew"
                  : isUpgrade
                  ? "Upgrade"
                  : "Subscribe";

                return (
                  <td key={pkg.id} className="py-3 px-2 text-center">
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => !locked && onSelectPackage(pkg)}
                      className={`inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-2xs ${
                        locked
                          ? "bg-[var(--ui-surface-muted)] text-[var(--ui-text-subtle)] border border-[var(--ui-border)] cursor-not-allowed"
                          : pkg.featured
                          ? "bg-[var(--primary-color)] hover:brightness-110 text-white"
                          : "bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white"
                      }`}
                    >
                      {locked && <FaLock size={10} className="mr-1" />}
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

export default FeatureComparisonTable;

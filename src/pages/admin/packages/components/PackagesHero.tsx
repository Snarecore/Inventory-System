import React from "react";
import { FaCrown, FaShieldAlt } from "react-icons/fa";
import type { UserSubscription } from "@/types";

interface PackagesHeroProps {
  subscription?: UserSubscription | null;
  currentPlanName?: string | null;
}

export const PackagesHero: React.FC<PackagesHeroProps> = ({ subscription, currentPlanName }) => {
  const effectivePlanName =
    currentPlanName ??
    (subscription?.packageName
      ? subscription.packageName
      : subscription?.packageStatus && subscription.packageStatus !== "FREE"
      ? subscription.packageStatus
      : null);

  return (
    <div className="p-3 sm:p-3.5 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--primary-color-light)] text-[var(--primary-color)] flex items-center justify-center shrink-0 border border-[var(--primary-color-muted)] mt-0.5">
          <FaCrown size={14} />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-[var(--ui-text)]">
              CashBoi Subscription & Business Plans
            </h4>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Auto-Activation
            </span>
          </div>
          <p className="text-[11px] text-[var(--ui-text-muted)] mt-1 max-w-2xl leading-relaxed">
            Select the plan that aligns with your operational scale. Multi-month billing cycles provide significant cost savings and unlock premium capabilities.
          </p>
        </div>
      </div>

      {effectivePlanName && (
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] text-[11px] self-start sm:self-auto shrink-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <FaShieldAlt size={13} />
          </div>
          <div>
            <span className="text-[10px] text-[var(--ui-text-muted)] block font-semibold uppercase tracking-wider">
              Current Plan
            </span>
            <span className="font-bold text-[var(--ui-text)] text-xs">
              {effectivePlanName}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackagesHero;

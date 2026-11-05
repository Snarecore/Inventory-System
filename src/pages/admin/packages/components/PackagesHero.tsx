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
    <div className="px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-[var(--primary-color-light)] text-[var(--primary-color)] flex items-center justify-center shrink-0 border border-[var(--primary-color-muted)]">
          <FaCrown size={13} />
        </div>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h4 className="text-xs font-bold text-[var(--ui-text)] whitespace-nowrap">
            CashBoi Subscription & Business Plans
          </h4>
          <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
            Auto-Activation
          </span>
          <span className="text-[var(--ui-border)] hidden lg:inline">|</span>
          <p className="text-[11px] text-[var(--ui-text-muted)] truncate hidden md:inline">
            Select the plan that aligns with your scale. Multi-month cycles provide significant cost savings.
          </p>
        </div>
      </div>

      {effectivePlanName && (
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] text-[11px] shrink-0 self-start sm:self-auto">
          <div className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <FaShieldAlt size={11} />
          </div>
          <span className="text-[10px] text-[var(--ui-text-muted)] font-medium">Current:</span>
          <span className="font-bold text-[var(--ui-text)] text-xs">{effectivePlanName}</span>
        </div>
      )}
    </div>
  );
};

export default PackagesHero;

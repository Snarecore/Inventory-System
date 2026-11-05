import React from "react";
import {
  FaWallet,
  FaLandmark,
  FaCrown,
  FaPhoneAlt,
  FaCheck,
  FaLock,
} from "react-icons/fa";
import { Sparkles } from "lucide-react";
import type { PricedPackage, BillingCycle, UserSubscription } from "@/types";
import { formatPackageMoney } from "../utils/package-formatters";

interface PackageCardProps {
  pkg: PricedPackage;
  index?: number;
  cycle?: BillingCycle;
  isSelected?: boolean;
  onSelect?: () => void;
  subscription?: UserSubscription | null;
  ctaState?: {
    locked: boolean;
    isRenew: boolean;
    isUpgrade: boolean;
    isCurrent: boolean;
  };
  onAction: (pkg: PricedPackage) => void;
}

const PackageIcon: React.FC<{ code: string }> = ({ code }) => {
  const upper = String(code || "").toUpperCase();
  if (upper === "FREE") return <FaWallet size={14} />;
  if (upper === "BASIC") return <FaLandmark size={14} />;
  if (upper === "PREMIUM") return <FaCrown size={14} />;
  return <FaPhoneAlt size={14} />;
};

export const PackageCard: React.FC<PackageCardProps> = ({
  pkg,
  index,
  cycle,
  isSelected,
  onSelect,
  subscription,
  ctaState,
  onAction,
}) => {
  const isCustom = pkg.code === "CUSTOM" || pkg.total === null;
  const isFree = pkg.code === "FREE" || pkg.total === 0;
  const months = cycle?.months ?? 1;

  const isPremium = Boolean(subscription?.packageStatus && subscription.packageStatus !== "FREE");
  const currentPackageId = subscription?.packageId ?? null;
  const isCurrent = currentPackageId != null && currentPackageId === pkg.id;
  const isRenew =
    ctaState?.isRenew ??
    (isPremium &&
      isCurrent &&
      Boolean(cycle?.code) &&
      cycle?.code === subscription?.cycleCode);
  const locked =
    ctaState?.locked ??
    (isPremium &&
      index !== undefined &&
      !isCurrent &&
      pkg.code !== "CUSTOM" &&
      isFree);
  const isUpgrade =
    ctaState?.isUpgrade ?? (isPremium && !locked && !isRenew && pkg.code !== "CUSTOM" && !isCurrent);

  // English button labels
  let ctaLabel = "Subscribe";
  if (isCustom) ctaLabel = "+88 01988-000800";
  else if (isCurrent && !isRenew) ctaLabel = "Current Plan";
  else if (isRenew) ctaLabel = "Renew Plan";
  else if (isUpgrade) ctaLabel = "Upgrade Plan";
  else if (isFree) ctaLabel = isCurrent ? "Current Plan" : "Start Free";
  else if (locked) ctaLabel = "Locked";

  return (
    <div
      onClick={onSelect}
      className={`ui-card group rounded-xl p-3.5 sm:p-4 flex flex-col justify-between relative transition-all duration-200 cursor-pointer ${
        isSelected
          ? "border-2 border-[var(--primary-color)] shadow-md bg-gradient-to-b from-[var(--primary-color)]/[0.03] to-[var(--ui-surface)]"
          : "border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:border-[var(--primary-color)] shadow-2xs"
      }`}
    >
      {/* Popular Badge */}
      {pkg.featured && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[var(--primary-color)] text-white text-[9px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1 z-10">
          <Sparkles size={10} className="w-2.5 h-2.5" />
          <span>Most Popular</span>
        </div>
      )}

      {/* Top right discount badge */}
      {pkg.discountPct > 0 && (
        <div
          className={`absolute top-3 right-3 px-1.5 py-0.5 rounded-md text-[9px] font-black shadow-2xs ${
            pkg.discountPct >= 40
              ? "bg-rose-500 text-white"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
          }`}
        >
          -{pkg.discountPct}% OFF
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
              pkg.featured
                ? "bg-[var(--primary-color-light)] text-[var(--primary-color)] border-[var(--primary-color-muted)]"
                : "bg-[var(--ui-surface-muted)] text-[var(--ui-text)] border-[var(--ui-border)]"
            }`}
          >
            <PackageIcon code={pkg.code} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--ui-text)] leading-tight">
              {pkg.name}
            </h3>
            {pkg.tagline ? (
              <p className="text-[10px] text-[var(--ui-text-muted)] leading-tight mt-0.5">
                {pkg.tagline}
              </p>
            ) : null}
          </div>
        </div>

        {/* Price Metric Box */}
        <div className="p-2.5 rounded-lg bg-[var(--ui-surface-muted)] border border-[var(--ui-border)]">
          {isCustom ? (
            <div>
              <span className="text-[9px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider block">
                Enterprise Plan
              </span>
              <div className="text-sm font-bold text-[var(--ui-text)] mt-0.5">
                Contact Sales
              </div>
              <p className="text-[10px] text-[var(--ui-text-muted)] mt-1">
                Customized for high-volume enterprise organizations
              </p>
            </div>
          ) : isFree ? (
            <div>
              <span className="text-[9px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider block">
                Starter Access
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  Free
                </span>
                <span className="text-[10px] text-[var(--ui-text-muted)] font-normal">
                  / lifetime
                </span>
              </div>
              <p className="text-[10px] text-[var(--ui-text-muted)] mt-1">
                Essential tools to manage your everyday finances
              </p>
            </div>
          ) : (
            <div>
              <span className="text-[9px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider block">
                Subscription Price
              </span>
              <div className="flex items-baseline gap-1 mt-0.5 flex-wrap">
                {pkg.discountPct > 0 && pkg.originalTotal && pkg.originalTotal > (pkg.total ?? 0) && (
                  <span className="text-xs text-rose-500 line-through font-semibold">
                    {formatPackageMoney(pkg.originalTotal)}
                  </span>
                )}
                <span className="text-2xl font-black text-[var(--ui-text)] tabular-nums tracking-tight">
                  {formatPackageMoney(pkg.total)}
                </span>
                <span className="text-[10px] text-[var(--ui-text-muted)] font-normal">
                  {months === 1 ? "/ mo" : `/ ${cycle?.label ?? `${months} mo`}`}
                </span>
              </div>

              {months > 1 && pkg.perMonth !== null && (
                <div className="flex items-center justify-between text-[10px] pt-1.5 mt-1.5 border-t border-[var(--ui-border)] text-[var(--ui-text-muted)]">
                  <span>
                    {formatPackageMoney(pkg.perMonth)} / month
                  </span>
                  {pkg.savePerMonth && pkg.savePerMonth > 0 ? (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Save {formatPackageMoney(pkg.savePerMonth)}/mo
                    </span>
                  ) : null}
                </div>
              )}

              {pkg.totalSave && pkg.totalSave > 0 ? (
                <div className="mt-1.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 text-center">
                  Total Savings: {formatPackageMoney(pkg.totalSave)}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Action CTA Button */}
      <div className="mt-3.5 pt-2.5 border-t border-[var(--ui-border)]">
        {isCustom ? (
          <a
            href="tel:+8801988000800"
            className="w-full py-2 px-3 rounded-lg text-xs font-bold text-center block bg-[var(--ui-surface-muted)] text-[var(--ui-text)] hover:bg-[var(--ui-surface-sunken)] border border-[var(--ui-border)] transition-colors cursor-pointer"
          >
            {ctaLabel}
          </a>
        ) : isFree && !isCurrent ? (
          <a
            href="https://play.google.com/store/apps/details?id=com.webnstech.cashboi&hl=en"
            target="_blank"
            rel="noreferrer"
            className="w-full py-2 px-3 rounded-lg text-xs font-bold text-center block bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs cursor-pointer"
          >
            {ctaLabel}
          </a>
        ) : (
          <button
            type="button"
            disabled={locked || (isCurrent && !isRenew)}
            onClick={(e) => {
              e.stopPropagation();
              if (!locked && (!isCurrent || isRenew)) {
                onAction(pkg);
              }
            }}
            className={`w-full py-2 px-3 rounded-lg text-xs font-bold text-center transition-all duration-200 cursor-pointer shadow-xs ${
              locked
                ? "bg-[var(--ui-surface-muted)] text-[var(--ui-text-subtle)] cursor-not-allowed border border-[var(--ui-border)]"
                : isCurrent && !isRenew
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default"
                : pkg.featured
                ? "bg-[var(--primary-color)] text-white hover:brightness-110"
                : "bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600"
            }`}
          >
            {isCurrent && !isRenew ? (
              <span className="inline-flex items-center gap-1">
                <FaCheck size={10} /> {ctaLabel}
              </span>
            ) : locked ? (
              <span className="inline-flex items-center gap-1">
                <FaLock size={10} /> {ctaLabel}
              </span>
            ) : (
              ctaLabel
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default PackageCard;

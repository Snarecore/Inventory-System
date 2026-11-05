import React from "react";
import {
  FaWallet,
  FaLandmark,
  FaCrown,
  FaPhoneAlt,
  FaCheck,
  FaLock,
} from "react-icons/fa";
import type { PricedPackage, BillingCycle, UserSubscription, FeatureGroup } from "@/types";
import { formatPackageMoney } from "../utils/package-formatters";
import { extractPackageHighlights } from "../utils/package-highlights";

interface PackageCardProps {
  pkg: PricedPackage;
  index?: number;
  cycle?: BillingCycle;
  isSelected?: boolean;
  onSelect?: () => void;
  subscription?: UserSubscription | null;
  featureGroups?: FeatureGroup[] | null;
  highlights?: string[];
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
  index = 0,
  cycle,
  isSelected,
  onSelect,
  subscription,
  featureGroups,
  highlights,
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

  const cardHighlights =
    highlights && highlights.length > 0
      ? highlights
      : extractPackageHighlights(pkg, index, featureGroups);

  return (
    <div
      onClick={onSelect}
      className={`ui-card group rounded-xl p-3 sm:p-3.5 flex flex-col justify-between relative transition-all duration-200 cursor-pointer ${
        isSelected
          ? "border-2 border-[var(--primary-color)] shadow-md bg-[var(--primary-color)]/[0.02]"
          : "border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:border-[var(--primary-color)]/60 hover:shadow-xs"
      }`}
    >
      {/* Header section */}
      <div>
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--ui-border)]/60">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                pkg.featured
                  ? "bg-[var(--primary-color-light)] text-[var(--primary-color)] border-[var(--primary-color-muted)]"
                  : "bg-[var(--ui-surface-muted)] text-[var(--ui-text)] border-[var(--ui-border)]"
              }`}
            >
              <PackageIcon code={pkg.code} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-[var(--ui-text)] truncate">
                  {pkg.name}
                </h3>
                {pkg.featured && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-[var(--primary-color)] text-white">
                    Popular
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[var(--ui-text-muted)] block truncate">
                {pkg.code === "FREE"
                  ? "Starter Plan"
                  : pkg.code === "BASIC"
                  ? "Growing Business"
                  : pkg.code === "PREMIUM"
                  ? "Professional Scale"
                  : "Enterprise Scale"}
              </span>
            </div>
          </div>

          {pkg.discountPct > 0 && (
            <span className="shrink-0 text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              -{pkg.discountPct}%
            </span>
          )}
        </div>

        {/* Price Metric Box - strictly aligned height across all 4 cards */}
        <div className="my-2.5 p-2.5 rounded-lg bg-[var(--ui-surface-muted)]/60 border border-[var(--ui-border)] flex flex-col justify-between h-[106px]">
          {/* Row 1: Plan type label & strikethrough price */}
          <div className="flex items-center justify-between text-[10px] leading-none">
            <span className="font-bold text-[var(--ui-text-muted)] uppercase tracking-wider">
              {isCustom ? "Enterprise" : isFree ? "Starter" : "Subscription"}
            </span>
            {pkg.discountPct > 0 && pkg.originalTotal && pkg.originalTotal > (pkg.total ?? 0) ? (
              <span className="text-rose-500 line-through font-semibold">
                {formatPackageMoney(pkg.originalTotal)}
              </span>
            ) : null}
          </div>

          {/* Row 2: Main Price */}
          <div className="flex items-baseline gap-1 my-0.5">
            {isCustom ? (
              <span className="text-base font-bold text-[var(--ui-text)]">
                Contact Sales
              </span>
            ) : isFree ? (
              <>
                <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  Free
                </span>
                <span className="text-[10px] text-[var(--ui-text-muted)]">
                  / lifetime
                </span>
              </>
            ) : (
              <>
                <span className="text-xl font-extrabold text-[var(--ui-text)] tabular-nums tracking-tight">
                  {formatPackageMoney(pkg.total)}
                </span>
                <span className="text-[10px] text-[var(--ui-text-muted)] font-normal">
                  {months === 1 ? "/ mo" : `/ ${cycle?.label ?? `${months} mo`}`}
                </span>
              </>
            )}
          </div>

          {/* Row 3: Monthly rate or subtext */}
          <div className="text-[10px] text-[var(--ui-text-muted)] flex items-center justify-between leading-tight">
            {isCustom ? (
              <span>Customized enterprise setup</span>
            ) : isFree ? (
              <span>Free forever · No credit card</span>
            ) : months > 1 && pkg.perMonth !== null ? (
              <>
                <span>{formatPackageMoney(pkg.perMonth)} / mo</span>
                {pkg.savePerMonth && pkg.savePerMonth > 0 ? (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    Save {formatPackageMoney(pkg.savePerMonth)}/mo
                  </span>
                ) : null}
              </>
            ) : (
              <span>Billed monthly</span>
            )}
          </div>

          {/* Row 4: Total Savings or status badge */}
          <div className="pt-1 border-t border-[var(--ui-border)]/50 text-[9px] text-center font-semibold leading-tight">
            {pkg.totalSave && pkg.totalSave > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                Total Savings: {formatPackageMoney(pkg.totalSave)}
              </span>
            ) : isFree ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                All core modules included
              </span>
            ) : isCustom ? (
              <span className="text-[var(--primary-color)]">
                Dedicated SLA & Support
              </span>
            ) : (
              <span className="text-[var(--ui-text-muted)]">
                Standard plan benefits
              </span>
            )}
          </div>
        </div>

        {/* Feature Checklist - Single-line concise bullets */}
        <div className="pb-2">
          <span className="text-[9px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider mb-2 block">
            Plan Highlights
          </span>
          <ul className="space-y-1.5">
            {cardHighlights.map((feat, i) => (
              <li key={i} className="flex items-center gap-1.5 text-[11px] text-[var(--ui-text)]">
                <span
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                    pkg.featured
                      ? "bg-[var(--primary-color)]/10 text-[var(--primary-color)]"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  <FaCheck size={8} />
                </span>
                <span className="truncate leading-none font-medium" title={feat}>
                  {feat}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Action CTA Button */}
      <div className="pt-2 border-t border-[var(--ui-border)]/60">
        {isCustom ? (
          <a
            href="tel:+8801988000800"
            className="w-full py-2 px-3 rounded-lg text-xs font-bold text-center block bg-[var(--ui-surface-muted)] hover:bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] border border-[var(--ui-border)] transition-colors cursor-pointer"
          >
            {ctaLabel}
          </a>
        ) : isFree && !isCurrent ? (
          <a
            href="https://play.google.com/store/apps/details?id=com.webnstech.cashboi&hl=en"
            target="_blank"
            rel="noreferrer"
            className="w-full py-2 px-3 rounded-lg text-xs font-bold text-center block bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs cursor-pointer"
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
            className={`w-full py-2 px-3 rounded-lg text-xs font-bold text-center transition-all cursor-pointer shadow-2xs ${
              locked
                ? "bg-[var(--ui-surface-muted)] text-[var(--ui-text-subtle)] cursor-not-allowed border border-[var(--ui-border)]"
                : isCurrent && !isRenew
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default"
                : pkg.featured
                ? "bg-[var(--primary-color)] text-white hover:brightness-110 shadow-xs"
                : "bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600"
            }`}
          >
            {isCurrent && !isRenew ? (
              <span className="inline-flex items-center gap-1 justify-center">
                <FaCheck size={10} /> {ctaLabel}
              </span>
            ) : locked ? (
              <span className="inline-flex items-center gap-1 justify-center">
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

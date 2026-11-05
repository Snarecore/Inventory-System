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

const PACKAGE_HIGHLIGHTS: Record<string, string[]> = {
  FREE: [
    "Up to 60 sales invoices / month",
    "1 Bank & 1 MFS Account",
    "Daily Cash Book & PDF Reports",
    "Income & Expense Tracking",
    "Community & Standard Support",
  ],
  BASIC: [
    "Up to 400 sales invoices / month",
    "Multiple Bank & MFS Accounts",
    "Automatic Cloud Data Backup",
    "Stock & Inventory Management",
    "Regular Support & Online Training",
  ],
  PREMIUM: [
    "Up to 1,000 sales invoices / month",
    "Up to 3 Branches & 5 Users",
    "Full Web Version & POS System",
    "Customer CRM & Order Tracking",
    "Excel Export & Priority 24/7 Support",
  ],
  CUSTOM: [
    "Unlimited Invoices & Branches",
    "Complete HR, Payroll & Attendance",
    "Advanced Analytical & MIS Reports",
    "Centralized Multi-Branch Sync",
    "Dedicated Account Manager",
  ],
};

const DEFAULT_TAGLINES: Record<string, string> = {
  FREE: "Essential financial tracking for small businesses",
  BASIC: "Advanced control for growing retail operations",
  PREMIUM: "Complete powerhouse for high-volume stores",
  CUSTOM: "Bespoke solution for enterprise organizations",
};

const PackageIcon: React.FC<{ code: string }> = ({ code }) => {
  const upper = String(code || "").toUpperCase();
  if (upper === "FREE") return <FaWallet size={15} />;
  if (upper === "BASIC") return <FaLandmark size={15} />;
  if (upper === "PREMIUM") return <FaCrown size={15} />;
  return <FaPhoneAlt size={15} />;
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

  const highlights = PACKAGE_HIGHLIGHTS[pkg.code] || [
    "Core accounting & sales management",
    "Standard customer records",
    "PDF statements and summaries",
    "Reliable cloud infrastructure",
  ];

  return (
    <div
      onClick={onSelect}
      className={`ui-card group rounded-xl p-4 flex flex-col justify-between relative transition-all duration-200 cursor-pointer ${
        isSelected
          ? "border-2 border-[var(--primary-color)] shadow-md bg-gradient-to-b from-[var(--primary-color)]/[0.04] to-[var(--ui-surface)]"
          : "border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:border-[var(--primary-color)]/60 hover:shadow-md"
      }`}
    >
      {/* Popular Badge */}
      {pkg.featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[var(--primary-color)] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 z-10">
          <Sparkles size={11} className="w-3 h-3 text-amber-300" />
          <span>Most Popular</span>
        </div>
      )}

      {/* Top right discount badge */}
      {pkg.discountPct > 0 && (
        <div className="absolute top-3.5 right-3.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-2xs border bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25">
          -{pkg.discountPct}% OFF
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
              pkg.featured
                ? "bg-[var(--primary-color-light)] text-[var(--primary-color)] border-[var(--primary-color-muted)]"
                : "bg-[var(--ui-surface-muted)] text-[var(--ui-text)] border-[var(--ui-border)]"
            }`}
          >
            <PackageIcon code={pkg.code} />
          </div>
          <div className="pr-12">
            <h3 className="text-sm font-bold text-[var(--ui-text)] leading-tight">
              {pkg.name}
            </h3>
            <p className="text-[11px] text-[var(--ui-text-muted)] leading-tight mt-0.5 truncate">
              {pkg.tagline || DEFAULT_TAGLINES[pkg.code] || "Tailored business plan"}
            </p>
          </div>
        </div>

        {/* Price Metric Box */}
        <div className="mt-3 p-3 rounded-xl bg-[var(--ui-surface-muted)]/60 border border-[var(--ui-border)] flex flex-col justify-center min-h-[95px]">
          {isCustom ? (
            <div>
              <span className="text-[10px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider block">
                Enterprise Plan
              </span>
              <div className="text-xl font-bold text-[var(--ui-text)] mt-1">
                Contact Sales
              </div>
              <p className="text-[11px] text-[var(--ui-text-muted)] mt-0.5">
                Custom setup tailored for large organizations
              </p>
            </div>
          ) : isFree ? (
            <div>
              <span className="text-[10px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider block">
                Starter Access
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  Free
                </span>
                <span className="text-xs text-[var(--ui-text-muted)] font-normal">
                  / lifetime
                </span>
              </div>
              <p className="text-[11px] text-[var(--ui-text-muted)] mt-0.5">
                Free forever with essential accounting tools
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider">
                  Subscription Price
                </span>
                {pkg.discountPct > 0 && pkg.originalTotal && pkg.originalTotal > (pkg.total ?? 0) && (
                  <span className="text-xs text-rose-500 line-through font-semibold">
                    {formatPackageMoney(pkg.originalTotal)}
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-[var(--ui-text)] tabular-nums tracking-tight">
                  {formatPackageMoney(pkg.total)}
                </span>
                <span className="text-xs text-[var(--ui-text-muted)] font-normal">
                  {months === 1 ? "/ mo" : `/ ${cycle?.label ?? `${months} mo`}`}
                </span>
              </div>

              {months > 1 && pkg.perMonth !== null && (
                <div className="flex items-center justify-between text-[11px] pt-1.5 mt-1.5 border-t border-[var(--ui-border)] text-[var(--ui-text-muted)]">
                  <span>
                    <strong>{formatPackageMoney(pkg.perMonth)}</strong> / month
                  </span>
                  {pkg.savePerMonth && pkg.savePerMonth > 0 ? (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                      Save {formatPackageMoney(pkg.savePerMonth)}/mo
                    </span>
                  ) : null}
                </div>
              )}

              {pkg.totalSave && pkg.totalSave > 0 ? (
                <div className="mt-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 text-center">
                  Total Savings: {formatPackageMoney(pkg.totalSave)}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Feature Checklist */}
        <div className="my-3 pt-2.5 border-t border-[var(--ui-border)]/70 flex-1">
          <span className="text-[10px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider mb-2 block">
            Plan Highlights
          </span>
          <ul className="space-y-1.5">
            {highlights.map((feat, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    pkg.featured
                      ? "bg-[var(--primary-color)]/10 text-[var(--primary-color)]"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  <FaCheck size={9} />
                </span>
                <span className="leading-tight text-[11px] text-[var(--ui-text)] font-medium">
                  {feat}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Action CTA Button */}
      <div className="pt-2.5 border-t border-[var(--ui-border)]">
        {isCustom ? (
          <a
            href="tel:+8801988000800"
            className="w-full py-2.5 px-3 rounded-lg text-xs font-bold text-center block bg-[var(--ui-surface-muted)] hover:bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] border border-[var(--ui-border)] transition-all shadow-2xs hover:shadow-xs cursor-pointer"
          >
            {ctaLabel}
          </a>
        ) : isFree && !isCurrent ? (
          <a
            href="https://play.google.com/store/apps/details?id=com.webnstech.cashboi&hl=en"
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 px-3 rounded-lg text-xs font-bold text-center block bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-2xs hover:shadow-xs cursor-pointer"
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
            className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold text-center transition-all duration-200 cursor-pointer shadow-2xs ${
              locked
                ? "bg-[var(--ui-surface-muted)] text-[var(--ui-text-subtle)] cursor-not-allowed border border-[var(--ui-border)]"
                : isCurrent && !isRenew
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default"
                : pkg.featured
                ? "bg-[var(--primary-color)] text-white hover:brightness-110 shadow-sm"
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

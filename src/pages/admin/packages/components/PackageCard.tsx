import React from "react";
import {
  FaWallet,
  FaLandmark,
  FaCrown,
  FaPhoneAlt,
  FaCheck,
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
  if (upper === "FREE") return <FaWallet size={16} />;
  if (upper === "BASIC") return <FaLandmark size={16} />;
  if (upper === "PREMIUM") return <FaCrown size={16} />;
  return <FaPhoneAlt size={16} />;
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


  // Determine button label
  let ctaLabel = "সাবস্ক্রাইব করুন";
  if (isCustom) ctaLabel = "+88 01988-000800";
  else if (isCurrent && !isRenew) ctaLabel = "বর্তমান প্ল্যান";
  else if (isRenew) ctaLabel = "রিনিউ করুন";
  else if (isUpgrade) ctaLabel = "আপগ্রেড করুন";
  else if (isFree) ctaLabel = isCurrent ? "বর্তমান প্ল্যান" : "ফ্রি শুরু করুন";
  else if (locked) ctaLabel = "লকড";

  return (
    <div
      onClick={onSelect}
      className={`relative rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 cursor-pointer border ${
        isSelected
          ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 shadow-lg bg-white"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
      } ${pkg.featured ? "border-emerald-500 shadow-sm" : ""}`}
    >
      {/* Popular Ribbon */}
      {pkg.featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-xs flex items-center gap-1">
          <Sparkles size={11} className="w-3 h-3" />
          <span>সবচেয়ে জনপ্রিয় • POPULAR</span>
        </div>
      )}

      {/* Top right discount badge */}
      {pkg.discountPct > 0 && (
        <div
          className={`absolute top-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-extrabold shadow-2xs ${
            pkg.discountPct >= 40
              ? "bg-rose-500 text-white"
              : "bg-amber-400 text-slate-900"
          }`}
        >
          -{pkg.discountPct}% ছাড়
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              pkg.featured
                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                : "bg-gray-50 text-gray-700 border-gray-200"
            }`}
          >
            <PackageIcon code={pkg.code} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">{pkg.nameBn || pkg.name}</h3>
            {pkg.taglineBn || pkg.tagline ? (
              <p className="text-[11px] text-gray-500 leading-tight">
                {pkg.taglineBn || pkg.tagline}
              </p>
            ) : null}
          </div>
        </div>

        {/* Price Section */}
        <div className="pt-2 border-t border-gray-100 flex flex-col gap-1">
          {isCustom ? (
            <div className="text-base font-bold text-gray-900">যোগাযোগ করুন</div>
          ) : isFree ? (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-600">ফ্রি</span>
              <span className="text-xs text-gray-500">/আজীবন</span>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                {pkg.discountPct > 0 && pkg.originalTotal && pkg.originalTotal > (pkg.total ?? 0) && (
                  <span className="text-xs text-rose-500 line-through font-semibold">
                    {formatPackageMoney(pkg.originalTotal)}
                  </span>
                )}
                <span className="text-2xl font-black text-gray-900">
                  {formatPackageMoney(pkg.total)}
                </span>
                <span className="text-xs text-gray-500">
                  {months === 1 ? "/মাস" : `/${cycle?.labelBn ?? `${months} মাস`}`}
                </span>
              </div>

              {months > 1 && pkg.perMonth !== null && (
                <div className="text-[11px] text-gray-600 mt-0.5 font-medium">
                  {formatPackageMoney(pkg.perMonth)} প্রতি মাসে
                  {pkg.savePerMonth && pkg.savePerMonth > 0 ? (
                    <span className="text-emerald-600 font-bold ml-1">
                      (সাশ্রয় {formatPackageMoney(pkg.savePerMonth)}/মাস)
                    </span>
                  ) : null}
                </div>
              )}

              {pkg.totalSave && pkg.totalSave > 0 ? (
                <div className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  মোট সাশ্রয় {formatPackageMoney(pkg.totalSave)}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        {isCustom ? (
          <a
            href="tel:+8801988000800"
            className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-center block bg-gray-900 text-white hover:bg-black transition-colors"
          >
            {ctaLabel}
          </a>
        ) : isFree && !isCurrent ? (
          <a
            href="https://play.google.com/store/apps/details?id=com.webnstech.cashboi&hl=en"
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-center block bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
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
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold text-center transition-all duration-200 cursor-pointer shadow-xs ${
              locked
                ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                : isCurrent && !isRenew
                ? "bg-emerald-50 text-emerald-700 border border-emerald-300 cursor-default"
                : pkg.featured
                ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] ring-2 ring-[var(--color-primary)]/20"
                : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
          >
            {isCurrent && !isRenew && <FaCheck className="inline mr-1" size={10} />}
            {ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default PackageCard;

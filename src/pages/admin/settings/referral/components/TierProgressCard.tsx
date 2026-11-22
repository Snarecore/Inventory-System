import React from "react";
import { useTranslation } from "react-i18next";
import {
  FaTrophy,
  FaCheckCircle,
  FaFire,
  FaLayerGroup,
} from "react-icons/fa";
import type { ReferralSummary } from "@/types/referral.types";
import { formatTaka } from "@/services/referral-service";

interface TierProgressCardProps {
  summary: ReferralSummary | null;
}

export const TierProgressCard: React.FC<TierProgressCardProps> = ({ summary }) => {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";

  const tierStanding = summary?.tierStanding;
  const currentTier = tierStanding?.tier || summary?.referrer?.tier || "";
  const currentTierLabel = isBn
    ? tierStanding?.tierLabelBn || tierStanding?.tierLabel || summary?.referrer?.tierLabel || currentTier
    : tierStanding?.tierLabel || summary?.referrer?.tierLabel || currentTier;

  const salesThisMonth = tierStanding?.salesThisMonth ?? 0;
  const salesToNextTier = tierStanding?.salesToNextTier ?? 0;
  const progressPct = Math.min(100, Math.max(0, tierStanding?.progressPct ?? 0));
  const nextTierLabel = isBn
    ? tierStanding?.nextTierLabelBn || tierStanding?.nextTier || ""
    : tierStanding?.nextTier || "";

  const ladder =
    tierStanding?.ladder && tierStanding.ladder.length > 0
      ? tierStanding.ladder
      : summary?.config?.tiers || [];

  const purchaseSequences = summary?.purchases?.bySequence || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 w-full">
      {/* ── Left 2 Cols: Tier Progression & Ladder ── */}
      <div className="lg:col-span-2 bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] shadow-xs p-2.5 sm:p-3 flex flex-col justify-between gap-2.5">
        <div>
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xs">
                <FaTrophy size={11} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[var(--ui-text)]">
                  {t("Tier Overview")}
                </h3>
                <p className="text-[10px] text-[var(--ui-text-muted)]">
                  {t("Current Tier")}: <span className="font-semibold text-[var(--ui-text)]">{currentTierLabel || "—"}</span>
                </p>
              </div>
            </div>

            {currentTierLabel && (
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-100 text-amber-900 flex items-center gap-1 border border-amber-200">
                <FaFire size={9} className="text-amber-600" />
                <span>{currentTierLabel}</span>
              </span>
            )}
          </div>

          {/* Progress Bar & Next Tier Target */}
          {nextTierLabel ? (
            <div className="bg-[var(--ui-surface-muted)]/40 rounded-lg p-2 border border-[var(--ui-border)] mb-2">
              <div className="flex justify-between items-center text-[10.5px] mb-1">
                <span className="text-[var(--ui-text-muted)]">
                  {t("Monthly Sales")}: <strong className="text-[var(--ui-text)] font-mono">{salesThisMonth}</strong>
                </span>
                <span className="font-semibold text-[var(--color-primary)]">
                  {t("Required for Next Tier")} ({nextTierLabel}): <span className="font-mono">{salesToNextTier}</span>
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[var(--primary-color)] h-full transition-all duration-500 rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="bg-[var(--ui-surface-muted)] rounded-lg p-1.5 border border-[var(--ui-border)] text-[var(--ui-text)] text-[10.5px] font-medium flex items-center gap-1.5 mb-2">
              <FaCheckCircle className="text-[var(--color-primary)]" size={11} />
              <span>Highest Tier Active</span>
            </div>
          )}

          {/* Tier Ladder Chips */}
          <div>
            <span className="text-[10px] font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider block mb-1">
              Affiliate Ladder
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {ladder.map((step) => {
                const isCurrent = step.tier === currentTier;
                const label = isBn ? step.labelBn || step.label : step.label || step.tier;
                const minSales = step.minSales ?? (step as any).minMonthlySales ?? 0;
                return (
                  <div
                    key={step.tier}
                    className={`p-1.5 rounded-lg border text-[11px] transition-all ${
                      isCurrent
                        ? "border-[var(--color-primary)] bg-[var(--primary-color-light)] font-bold text-[var(--color-primary)]"
                        : "border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/30 text-[var(--ui-text-muted)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold truncate text-[11px]">{label}</span>
                      {isCurrent && <FaCheckCircle size={9} className="text-[var(--color-primary)] shrink-0" />}
                    </div>
                    <div className="text-[9.5px] mt-0.5 text-[var(--ui-text)] font-mono">
                      {minSales}+ sales/mo
                    </div>
                    <div className="text-[9.5px] opacity-80 font-mono mt-0.2">
                      {step.firstSalePct}% 1st / {step.renewalPct}% ren
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Col: Purchase Sequence Rates ── */}
      <div className="bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] shadow-xs p-2.5 sm:p-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
              <FaLayerGroup size={11} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--ui-text)]">
                {t("Purchase Sequence Rates")}
              </h3>
              <p className="text-[10px] text-[var(--ui-text-muted)]">
                Order activity & commission by purchase sequence
              </p>
            </div>
          </div>

          <div className="space-y-1">
            {purchaseSequences.length > 0 ? (
              purchaseSequences.map((seq, idx) => {
                const label = seq.label || `#${seq.sequence || idx + 1} Purchase`;
                const count = seq.purchaseCount ?? (seq as any).count ?? 0;
                const comm = seq.commissionPoisha ? formatTaka(seq.commissionPoisha) : null;
                return (
                  <div
                    key={seq.sequence || idx}
                    className="flex items-center justify-between px-2 py-1 rounded-lg bg-[var(--ui-surface-muted)]/40 border border-[var(--ui-border)] text-[11px]"
                  >
                    <span className="text-[var(--ui-text)] font-medium capitalize truncate max-w-[150px]">
                      {label}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {comm && (
                        <span className="font-mono font-bold text-[var(--color-primary)]">
                          {comm}
                        </span>
                      )}
                      <span className="text-[9.5px] text-[var(--ui-text-muted)] font-mono">
                        ({count} orders)
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-[11px] text-[var(--ui-text-muted)]">
                Standard renewal rates apply.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

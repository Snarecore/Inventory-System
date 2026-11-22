import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FaCopy,
  FaCheck,
  FaShareAlt,
  FaWallet,
  FaCreditCard,
  FaUserPlus,
  FaMagic,
  FaSpinner,
  FaAward,
  FaLink,
} from "react-icons/fa";
import type { ReferralSummary } from "@/types/referral.types";
import toast from "react-hot-toast";

interface ReferralHeaderProps {
  summary: ReferralSummary | null;
  onOpenWithdraw: () => void;
  onOpenPayoutAccount: () => void;
  onOpenAttribute: () => void;
  onGenerateCode: () => void;
  isGeneratingCode: boolean;
}

export const ReferralHeader: React.FC<ReferralHeaderProps> = ({
  summary,
  onOpenWithdraw,
  onOpenPayoutAccount,
  onOpenAttribute,
  onGenerateCode,
  isGeneratingCode,
}) => {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const referralCode =
    summary?.share?.referralCode ||
    summary?.referrer?.referralCode ||
    "";
  const referralLink =
    summary?.share?.referralLink ||
    (referralCode ? `https://cashboi.app/r/${referralCode}` : "");

  const tier = summary?.referrer?.tier || summary?.tierStanding?.tier || "";
  const tierLabel = isBn
    ? summary?.tierStanding?.tierLabelBn || summary?.referrer?.tierLabel || tier
    : summary?.tierStanding?.tierLabel || summary?.referrer?.tierLabel || tier;

  const firstSalePct = summary?.referrer?.firstSalePct ?? summary?.tierStanding?.firstSalePct;
  const renewalPct = summary?.referrer?.renewalPct ?? summary?.tierStanding?.renewalPct;
  const payoutAccount = summary?.payoutAccount;

  const handleCopyCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      toast.success(t("Copy Code") || "Copied code");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleCopyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      toast.success(t("Copy Link") || "Copied link");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleNativeShare = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Cash Boi Referral",
          text: `Cash Boi - Referral Code: ${referralCode}`,
          url: referralLink,
        });
      } catch {
        // Dismissed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] px-3 py-2 shadow-xs">
      <div className="flex flex-wrap xl:flex-nowrap items-center justify-between gap-2.5">
        {/* ── All Details in One Unified Single Row ── */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {/* 1. Referral Code Chip */}
          <div className="inline-flex items-center gap-1.5 bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] rounded-lg px-2.5 py-1">
            <span className="text-[11px] font-medium text-[var(--ui-text-muted)]">
              {t("Referral Code")}:
            </span>

            {referralCode ? (
              <>
                <span className="font-mono font-bold text-xs text-[var(--color-primary)] tracking-wide">
                  {referralCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  title={t("Copy Code")}
                  className="text-[var(--ui-text-muted)] hover:text-[var(--color-primary)] transition p-0.5 cursor-pointer"
                >
                  {copiedCode ? <FaCheck size={10} className="text-emerald-600" /> : <FaCopy size={10} />}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onGenerateCode}
                disabled={isGeneratingCode}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--primary-color)] hover:brightness-110 text-white text-[11px] font-semibold rounded-md shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isGeneratingCode ? <FaSpinner className="animate-spin" size={10} /> : <FaMagic size={10} />}
                <span>{t("Generate Code")}</span>
              </button>
            )}
          </div>

          {/* 2. Referral Link Input Pill with integrated Copy & Share */}
          {referralLink && (
            <div className="inline-flex items-center bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] rounded-lg px-2 py-1 gap-1.5 max-w-[280px] sm:max-w-[340px]">
              <FaLink size={9.5} className="text-[var(--ui-text-muted)] shrink-0" />
              <span className="truncate select-all font-mono text-[11px] text-[var(--ui-text)]">
                {referralLink}
              </span>
              <div className="flex items-center gap-0.5 shrink-0 border-l border-[var(--ui-border)] pl-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  title={t("Copy Link")}
                  className="text-[var(--ui-text-muted)] hover:text-[var(--color-primary)] transition p-0.5 cursor-pointer"
                >
                  {copiedLink ? <FaCheck size={10} className="text-emerald-600" /> : <FaCopy size={10} />}
                </button>
                <button
                  type="button"
                  onClick={handleNativeShare}
                  title={t("Share")}
                  className="text-[var(--ui-text-muted)] hover:text-[var(--color-primary)] transition p-0.5 cursor-pointer"
                >
                  <FaShareAlt size={10} />
                </button>
              </div>
            </div>
          )}

          {/* 3. Tier & Commission Badge */}
          {tier && (
            <div className="inline-flex items-center gap-1.5 bg-[var(--primary-color-light)] text-[var(--color-primary)] border border-[var(--primary-color)]/20 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shadow-2xs">
              <FaAward size={11} className="text-[var(--color-primary)] shrink-0" />
              <span>{tierLabel}</span>
              {firstSalePct != null && (
                <span className="text-[10px] opacity-80 border-l border-[var(--color-primary)]/30 pl-1.5 font-normal">
                  {firstSalePct}% {t("First Sale")} {renewalPct != null ? `| ${renewalPct}% ${t("Renewal")}` : ""}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Right Actions in the Same Row ── */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenWithdraw}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--primary-color)] hover:brightness-110 text-white text-[11.5px] font-semibold rounded-lg shadow-xs transition cursor-pointer"
          >
            <FaWallet size={11} />
            <span>{t("Request Payout")}</span>
          </button>

          <button
            type="button"
            onClick={onOpenPayoutAccount}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-[var(--ui-border)] bg-white hover:bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] text-[11.5px] font-semibold rounded-lg shadow-xs transition cursor-pointer"
          >
            <FaCreditCard size={11} className="text-[var(--ui-text-muted)]" />
            <span>{t("Payout Account")}</span>
          </button>

          <button
            type="button"
            onClick={onOpenAttribute}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11.5px] text-[var(--ui-text-muted)] hover:text-[var(--color-primary)] transition cursor-pointer"
            title={t("Attribute Referrer")}
          >
            <FaUserPlus size={11} />
            <span className="hidden 2xl:inline">{t("Attribute Referrer")}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

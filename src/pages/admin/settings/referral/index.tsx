import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FaTrophy,
  FaCoins,
  FaReceipt,
  FaWallet,
  FaBook,
  FaLock,
  FaArrowRight,
} from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import { getUserInfo, getStoredUser } from "@/utils/auth-storage";
import {
  useReferralSummaryQuery,
  useReferralBalanceQuery,
  useReferralConfigQuery,
  useGenerateReferralCodeMutation,
} from "@/hooks/useReferralQueries";
import { ReferralHeader } from "./components/ReferralHeader";
import { ReferralStatCards } from "./components/ReferralStatCards";
import { TierProgressCard } from "./components/TierProgressCard";
import { EarningsTab } from "./components/EarningsTab";
import { TransactionsTab } from "./components/TransactionsTab";
import { WithdrawalsTab } from "./components/WithdrawalsTab";
import { ProgramRulesTab } from "./components/ProgramRulesTab";
import { PayoutAccountModal } from "./components/PayoutAccountModal";
import { WithdrawModal } from "./components/WithdrawModal";
import { AttributeModal } from "./components/AttributeModal";
import toast from "react-hot-toast";

type ActiveTab = "overview" | "earnings" | "transactions" | "withdrawals" | "rules";

const ReferralDashboard: React.FC = () => {
  const { t } = useTranslation();
  const userInfo = getUserInfo();
  const storedUser = getStoredUser();

  // Resolved active user id
  const rawUserId =
    userInfo?.userId ??
    (userInfo as any)?.id ??
    storedUser?.id ??
    "";
  const [activeUserId] = useState<number | string>(rawUserId);

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  const [hasAttemptedAutoGenerate, setHasAttemptedAutoGenerate] = useState(false);

  // Queries
  const {
    data: summary,
    error: summaryError,
    refetch: refetchSummary,
    isFetching: isSummaryFetching,
  } = useReferralSummaryQuery(activeUserId);

  const {
    data: balance,
    refetch: refetchBalance,
  } = useReferralBalanceQuery(activeUserId);

  const {
    data: config,
  } = useReferralConfigQuery();

  const generateCodeMutation = useGenerateReferralCodeMutation();

  // Check if referral code is generated, if not generate it automatically
  useEffect(() => {
    if (activeUserId && summary && !hasAttemptedAutoGenerate) {
      const code = summary?.share?.referralCode || summary?.referrer?.referralCode;
      if (!code) {
        setHasAttemptedAutoGenerate(true);
        generateCodeMutation.mutate(activeUserId, {
          onSuccess: (data) => {
            if (data?.referralCode) {
              toast.success(`${t("Referral Code")}: ${data.referralCode}`);
              refetchSummary();
            }
          },
          onError: () => {
            // Ignore error here if user needs premium
          },
        });
      }
    }
  }, [summary, activeUserId, hasAttemptedAutoGenerate, t]);

  const handleManualGenerateCode = async () => {
    try {
      const res = await generateCodeMutation.mutateAsync(activeUserId);
      if (res?.referralCode) {
        toast.success(`${t("Referral Code")}: ${res.referralCode}`);
        refetchSummary();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate referral code");
    }
  };

  const handleRefreshAll = () => {
    refetchSummary();
    refetchBalance();
    toast.success(t("Refresh") || "Refreshed");
  };

  // Check if error is due to Premium Subscription Requirement
  const isPremiumRequired =
    summaryError?.message?.includes("PREMIUM_REQUIRED") ||
    summaryError?.message?.includes("paid packages") ||
    (summaryError as any)?.errorCode === "PREMIUM_REQUIRED";

  const tabs = [
    { id: "overview", label: t("Tier Overview"), icon: FaTrophy },
    { id: "earnings", label: t("Commission Earnings"), icon: FaCoins },
    { id: "transactions", label: t("Wallet Statement"), icon: FaReceipt },
    { id: "withdrawals", label: t("Payout History"), icon: FaWallet },
    { id: "rules", label: t("Program Rules"), icon: FaBook },
  ];

  return (
    <div className="flex flex-col gap-2 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader
          headerTitle="Referral & Affiliate Profile"
          headerDescription="Share Cash-Boi with other businesses and earn continuous recurring commission."
        />
        <div className="flex items-center gap-1.5">
          {activeUserId ? (
            <div className="flex items-center gap-1 bg-[var(--ui-surface-muted)] px-2 py-0.5 rounded-lg border border-[var(--ui-border)] text-[11px] text-[var(--ui-text-muted)]">
              <span>{t("User ID")}:</span>
              <span className="font-mono font-bold text-[var(--ui-text)]">{activeUserId}</span>
            </div>
          ) : null}
          <RefreshButton
            onClick={handleRefreshAll}
            isRefreshing={isSummaryFetching}
            label={t("Refresh")}
          />
        </div>
      </div>

      {/* ── Premium Required Notice ── */}
      {isPremiumRequired && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-200/70 text-amber-800 flex items-center justify-center shrink-0 text-xs mt-0.5">
              <FaLock />
            </div>
            <div>
              <h3 className="font-bold text-xs text-amber-950">
                {t("Paid Package Required")}
              </h3>
              <p className="text-amber-800 text-[11px] mt-0.5">
                {t("You need an active paid package to participate in the referral program and earn commissions.")}
              </p>
            </div>
          </div>
          <Link
            to="/admin/packages"
            className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <span>{t("View Packages")}</span>
            <FaArrowRight size={10} />
          </Link>
        </div>
      )}

      {/* ── Main Referral Card (Code, Link, Actions) ── */}
      <ReferralHeader
        summary={summary || null}
        onOpenWithdraw={() => setIsWithdrawModalOpen(true)}
        onOpenPayoutAccount={() => setIsPayoutModalOpen(true)}
        onOpenAttribute={() => setIsAttributeModalOpen(true)}
        onGenerateCode={handleManualGenerateCode}
        isGeneratingCode={generateCodeMutation.isPending}
      />

      {/* ── Quick Stats Grid ── */}
      <ReferralStatCards
        summary={summary || null}
        balance={balance || null}
        onOpenWithdraw={() => setIsWithdrawModalOpen(true)}
      />

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-1 border-b border-[var(--ui-border)] pb-0.5 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[11.5px] font-semibold rounded-t-lg transition-all cursor-pointer border-b-2 -mb-[3px] whitespace-nowrap ${
                isActive
                  ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]"
                  : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-sunken)]"
              }`}
            >
              <Icon size={11} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content Panels ── */}
      <div>
        {activeTab === "overview" && (
          <TierProgressCard summary={summary || null} />
        )}

        {activeTab === "earnings" && (
          <EarningsTab userId={activeUserId} />
        )}

        {activeTab === "transactions" && (
          <TransactionsTab userId={activeUserId} />
        )}

        {activeTab === "withdrawals" && (
          <WithdrawalsTab
            userId={activeUserId}
            onOpenWithdraw={() => setIsWithdrawModalOpen(true)}
          />
        )}

        {activeTab === "rules" && (
          <ProgramRulesTab config={config || summary?.config || null} />
        )}
      </div>

      {/* ── Modals ── */}
      <PayoutAccountModal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        userId={activeUserId}
        currentAccount={summary?.payoutAccount}
      />

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        userId={activeUserId}
        balance={balance || null}
        config={config || summary?.config || null}
        payoutAccount={summary?.payoutAccount || null}
        onOpenPayoutAccount={() => setIsPayoutModalOpen(true)}
      />

      <AttributeModal
        isOpen={isAttributeModalOpen}
        onClose={() => setIsAttributeModalOpen(false)}
        userId={activeUserId}
        currentReferredBy={summary?.referrer?.referralCode}
      />
    </div>
  );
};

export default ReferralDashboard;

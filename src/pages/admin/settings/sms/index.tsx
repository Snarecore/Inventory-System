import React, { useState } from "react";
import { FaPaperPlane, FaCoins } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import SendSmsTab from "./components/SendSmsTab";
import SmsBundlesTab from "./components/SmsBundlesTab";
import { useSmsBalance } from "@/hooks/useSms";

const TABS: { id: SmsTabKey; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "send", label: "Send SMS", icon: FaPaperPlane },
  { id: "bundles", label: "SMS Bundles", icon: FaCoins },
];

export const SmsSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SmsTabKey>("send");
  const { data: balanceData } = useSmsBalance();

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto w-full p-2 sm:p-4">
      {/* Page Header with Real-time Balance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader
          headerTitle="SMS Services & Bundles"
          headerDescription="Send branded messages and recharge SMS balance"
        />

        {/* Quick status pills */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {balanceData && (
            <div className="flex items-center gap-1.5 bg-[var(--ui-success-light)] border border-[var(--ui-success-border)] px-3 py-1.5 rounded-full text-xs text-[var(--ui-success-dark)] shadow-[var(--ui-shadow-control)]">
              <FaCoins size={11} className="text-[var(--ui-success)]" />
              <span>Balance:</span>
              <strong className="font-extrabold tabular-nums">
                {balanceData.smsBalance.toLocaleString("en-IN")} SMS
              </strong>
            </div>
          )}
          <div className="flex items-center gap-2 bg-[var(--ui-surface)] border border-[var(--ui-border)] px-3 py-1.5 rounded-full text-xs shadow-[var(--ui-shadow-control)]">
            <span className="w-2 h-2 rounded-full bg-[var(--ui-success)] animate-pulse" />
            <span className="text-[var(--ui-text-muted)]">Sender ID:</span>
            <strong className="text-[var(--ui-text)]">Cash Boi</strong>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="border-b border-[var(--ui-border)] flex items-center gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === id
                ? "border-[var(--primary-color)] text-[var(--primary-color)]"
                : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
            }`}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "send" && <SendSmsTab />}
        {activeTab === "bundles" && <SmsBundlesTab />}
      </div>
    </div>
  );
};

export default SmsSettingsPage;

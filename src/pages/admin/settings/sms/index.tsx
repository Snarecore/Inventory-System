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

        {/* Real-time SMS Balance Metric Badge */}
        {balanceData && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--ui-surface)] border border-[var(--ui-border)] shadow-xs hover:border-[var(--primary-color)]/60 transition-colors self-start sm:self-auto">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <FaCoins size={13} />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-black text-[var(--ui-text)] tabular-nums tracking-tight">
                {balanceData.smsBalance.toLocaleString("en-IN")}
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Credits
              </span>
            </div>
          </div>
        )}
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

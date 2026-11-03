import React from "react";
import { useNavigate } from "react-router-dom";
import { FaPaperPlane, FaCoins, FaShieldAlt } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import { Button } from "@/components/common";
import SmsBundlesTab from "./components/SmsBundlesTab";

export const SmsSettingsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          headerTitle="SMS Bundles"
          headerDescription="Recharge your SMS balance and explore bundle packages"
        />

        <div className="flex items-center gap-2">
          <Button
            label="Go to SMS"
            onClick={() => navigate("/admin/sms")}
            color="#009fe3"
            hoverColor="#0085be"
            icon={<FaPaperPlane className="text-white text-xs" />}
          />
        </div>
      </div>

      {/* Meaningful Description Banner between PageHeader and Cards */}
      <div className="p-3 sm:p-3.5 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary-color-light)] text-[var(--primary-color)] flex items-center justify-center shrink-0 border border-[var(--primary-color-muted)] mt-0.5">
            <FaCoins size={15} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-xs font-bold text-[var(--ui-text)]">
                Official SMS Packages & Instant Recharge
              </h4>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Instant Auto-Activation
              </span>
            </div>
            <p className="text-[11px] text-[var(--ui-text-muted)] mt-1 max-w-2xl leading-relaxed">
              Recharge SMS credits to send automated invoices, payment confirmations, due reminders, and promotional alerts to your customers and suppliers. Credits are added instantly to your balance upon checkout via MFS or Cards.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] text-[11px] self-start sm:self-auto shrink-0">
          <FaShieldAlt className="text-sky-500 shrink-0" size={14} />
          <div>
            <div className="font-bold text-[var(--ui-text)] text-[11px]">EPS Payment Gateway</div>
            <div className="text-[10px] text-[var(--ui-text-muted)]">PCI-DSS Compliant & Secured</div>
          </div>
        </div>
      </div>

      {/* SMS Bundles & Recharge Section */}
      <div>
        <SmsBundlesTab />
      </div>
    </div>
  );
};

export default SmsSettingsPage;

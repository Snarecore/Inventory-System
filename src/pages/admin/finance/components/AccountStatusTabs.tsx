import React from "react";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";

interface AccountStatusTabsProps {
  currentStatus: string;
  onChangeStatus: (status: string) => void;
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  allLabel?: string;
  className?: string;
}

/**
 * Senior Developer Standard: Shared Financial Status Filter Tabs
 * Consolidates status filter buttons for Bank, MFS, and Ledger accounts.
 */
export const AccountStatusTabs: React.FC<AccountStatusTabsProps> = ({
  currentStatus,
  onChangeStatus,
  totalCount,
  activeCount,
  inactiveCount,
  allLabel = "All Accounts",
  className = "",
}) => {
  const tabs = [
    { label: allLabel, value: "", count: totalCount, icon: null, text: "", badge: "" },
    {
      label: "Active",
      value: "Active",
      count: activeCount,
      icon: FaCheckCircle,
      text: "text-emerald-600",
      badge: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Inactive",
      value: "Inactive",
      count: inactiveCount,
      icon: FaTimesCircle,
      text: "text-rose-600",
      badge: "bg-rose-100 text-rose-700",
    },
  ];

  return (
    <div className={`inline-flex items-center rounded-lg border border-gray-200 p-0.5 bg-gray-50 h-8 ${className}`}>
      {tabs.map((tab) => {
        const active = currentStatus === tab.value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChangeStatus(tab.value)}
            className={`h-7 px-3 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              active
                ? `bg-white shadow-xs ${tab.text || "text-[var(--color-primary)]"}`
                : "text-gray-600 hover:text-black"
            }`}
          >
            {Icon && <Icon size={11} className={active ? tab.text : "text-gray-400"} />}
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                active ? tab.badge || "bg-sky-100 text-sky-700" : "bg-gray-200/70 text-gray-600"
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default AccountStatusTabs;

import React from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/page-header/PageHeader";
import { Button, RefreshButton } from "@/components/common";
import TradeStatsCards from "@/components/trade/TradeStatsCards";
import BankTable from "./components/BankTable";
import { useBankInfoListQuery } from "@/hooks/useBankQueries";
import { formatMoney } from "@/utils/formatters";
import { FaPlus, FaLandmark, FaWallet, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

export const BankPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, refetch, isRefetching } = useBankInfoListQuery({
    refetchOnMount: "always",
  });
  const accounts = data?.bankAccounts || [];

  // Single pass calculation without memo
  let active = 0, inactive = 0, total = 0;
  for (const b of accounts) {
    const st = (b.status || "").toLowerCase();
    if (st === "active") active++;
    else if (st === "inactive") inactive++;
    total += Number(b.currentBalance || 0);
  }

  const statCards = [
    { title: "Total Accounts", value: accounts.length, icon: FaLandmark, color: "text-gray-900", bg: "bg-white border-gray-200", iconBg: "bg-blue-50 text-[var(--color-primary)]" },
    { title: "Active Accounts", value: active, icon: FaCheckCircle, color: "text-emerald-600", bg: "bg-white border-gray-200", iconBg: "bg-emerald-50 text-emerald-600" },
    { title: "Inactive Accounts", value: inactive, icon: FaTimesCircle, color: "text-rose-600", bg: "bg-white border-gray-200", iconBg: "bg-rose-50 text-rose-600" },
    { title: "Total Balance", value: `৳ ${formatMoney(total)}`, icon: FaWallet, color: "text-gray-900", bg: "bg-white border-gray-200", iconBg: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="flex flex-col gap-3 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader headerTitle="Bank Accounts" headerDescription="Manage registered bank accounts and opening balances" />
        <div className="flex items-center gap-2">
          <RefreshButton onClick={() => refetch()} isLoading={isLoading || isRefetching} />
          <Button
            label="Add Bank Account"
            onClick={() => navigate("/admin/create-bank")}
            color="var(--color-primary)"
            hoverColor="var(--color-primary-hover)"
            icon={<FaPlus className="text-white text-xs" />}
          />
        </div>
      </div>
      <TradeStatsCards cards={statCards} />
      <BankTable bankAccounts={accounts} isLoading={isLoading} onAddNew={() => navigate("/admin/create-bank")} />
    </div>
  );
};

export default BankPage;

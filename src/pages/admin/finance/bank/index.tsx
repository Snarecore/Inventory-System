import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/page-header/PageHeader";
import { Button, RefreshButton, StatsCards } from "@/components/common";
import BankTable from "./components/BankTable";
import { useBankInfoListQuery } from "@/hooks/useBankQueries";
import { formatMoney } from "@/utils/formatters";
import { calculateAccountMetrics } from "../utils/finance-metrics";
import { FaPlus, FaLandmark, FaWallet, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

export const BankPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, refetch, isRefetching } = useBankInfoListQuery();
  const accounts = data?.bankAccounts || [];

  const { active, inactive, totalBalance } = useMemo(
    () => calculateAccountMetrics(accounts),
    [accounts]
  );

  const statCards = [
    {
      title: "Total Accounts",
      value: accounts.length,
      icon: FaLandmark,
      color: "text-blue-600",
      bg: "bg-blue-50/60 border-blue-300 hover:border-blue-400",
      iconBg: "bg-blue-100 text-blue-600",
    },
    {
      title: "Active Accounts",
      value: active,
      icon: FaCheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50/60 border-emerald-300 hover:border-emerald-400",
      iconBg: "bg-emerald-100 text-emerald-600",
    },
    {
      title: "Inactive Accounts",
      value: inactive,
      icon: FaTimesCircle,
      color: "text-rose-600",
      bg: "bg-rose-50/60 border-rose-300 hover:border-rose-400",
      iconBg: "bg-rose-100 text-rose-600",
    },
    {
      title: "Total Balance",
      value: `৳ ${formatMoney(totalBalance)}`,
      icon: FaWallet,
      color: "text-purple-600",
      bg: "bg-purple-50/60 border-purple-300 hover:border-purple-400",
      iconBg: "bg-purple-100 text-purple-600",
    },
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
      <StatsCards cards={statCards} />
      <BankTable bankAccounts={accounts} isLoading={isLoading} onAddNew={() => navigate("/admin/create-bank")} />
    </div>
  );
};

export default BankPage;

import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/page-header/PageHeader";
import { Button, RefreshButton } from "@/components/common";
import TradeStatsCards from "@/components/trade/TradeStatsCards";
import MfsTable from "./components/MfsTable";
import { useMfsUserListQuery } from "@/hooks/useMfsQueries";
import { formatMoney } from "@/utils/formatters";
import { FaPlus, FaMobileAlt, FaWallet, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

export const MfsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, refetch, isRefetching } = useMfsUserListQuery();
  const accounts = data?.mfsUsers || [];

  // Single pass calculation without useMemo
  let active = 0;
  let inactive = 0;
  let totalBalance = 0;

  for (const m of accounts) {
    const st = (m.status || "").toLowerCase();
    if (st === "active") active++;
    else if (st === "inactive") inactive++;
    totalBalance += Number(m.currentBalance || 0);
  }

  const statCards = [
    {
      title: "Total Wallets",
      value: accounts.length,
      icon: FaMobileAlt,
      color: "text-gray-900",
      bg: "bg-white border-gray-200",
      iconBg: "bg-blue-50 text-[var(--color-primary)]",
    },
    {
      title: "Active Wallets",
      value: active,
      icon: FaCheckCircle,
      color: "text-emerald-600",
      bg: "bg-white border-gray-200",
      iconBg: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Inactive Wallets",
      value: inactive,
      icon: FaTimesCircle,
      color: "text-rose-600",
      bg: "bg-white border-gray-200",
      iconBg: "bg-rose-50 text-rose-600",
    },
    {
      title: "Total Balance",
      value: `৳ ${formatMoney(totalBalance)}`,
      icon: FaWallet,
      color: "text-gray-900",
      bg: "bg-white border-gray-200",
      iconBg: "bg-amber-50 text-amber-600",
    },
  ];

  const handleAddNew = useCallback(() => {
    navigate("/admin/create-mfs");
  }, [navigate]);

  return (
    <div className="flex flex-col gap-3 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          headerTitle="MFS Wallets"
          headerDescription="Manage registered Mobile Financial Services (bKash, Nagad, Rocket, Upay)"
        />
        <div className="flex items-center gap-2">
          <RefreshButton onClick={() => refetch()} isLoading={isLoading || isRefetching} />
          <Button
            label="Add MFS Account"
            onClick={handleAddNew}
            color="var(--color-primary)"
            hoverColor="var(--color-primary-hover)"
            icon={<FaPlus className="text-white text-xs" />}
          />
        </div>
      </div>

      <TradeStatsCards cards={statCards} />
      <MfsTable
        mfsAccounts={accounts}
        isLoading={isLoading}
        onAddNew={handleAddNew}
      />
    </div>
  );
};

export default MfsPage;

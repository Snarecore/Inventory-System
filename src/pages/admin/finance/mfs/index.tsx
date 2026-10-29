import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/page-header/PageHeader";
import { Button, RefreshButton, StatsCards } from "@/components/common";
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

  // Cards design styled identically to Sales (SaleStats / TradeInvoiceStats)
  const statCards = [
    {
      title: "Total Wallets",
      value: accounts.length,
      icon: FaMobileAlt,
      color: "text-blue-600",
      bg: "bg-blue-50/60 border-blue-300 hover:border-blue-400",
      iconBg: "bg-blue-100 text-blue-600",
    },
    {
      title: "Active Wallets",
      value: active,
      icon: FaCheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50/60 border-emerald-300 hover:border-emerald-400",
      iconBg: "bg-emerald-100 text-emerald-600",
    },
    {
      title: "Inactive Wallets",
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

  const handleAddNew = useCallback(() => {
    navigate("/admin/create-mfs");
  }, [navigate]);

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageHeader
          headerTitle="MFS Wallets"
          headerDescription="Manage registered Mobile Financial Services (bKash, Nagad, Rocket, Upay)"
        />
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <RefreshButton onClick={() => refetch()} isLoading={isLoading || isRefetching} />
          <Button
            label="Add MFS Account"
            onClick={handleAddNew}
            color="var(--primary-color)"
            hoverColor="var(--primary-color-hover)"
            icon={<FaPlus className="text-white text-xs" />}
          />
        </div>
      </div>

      <StatsCards cards={statCards} />
      <MfsTable
        mfsAccounts={accounts}
        isLoading={isLoading}
        onAddNew={handleAddNew}
      />
    </div>
  );
};

export default MfsPage;

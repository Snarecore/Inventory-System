import React, { useMemo } from 'react';
import { KpiCardsGrid } from './components/KpiCardsGrid';
import { SaleAnalysisChart } from './components/SaleAnalysisChart';
import { ProfitLossChart } from './components/ProfitLossChart';
import { AssetAnalysisChart } from './components/AssetAnalysisChart';
import { TopCustomersWidget } from './components/TopCustomersWidget';
import { TopSaleItemsWidget } from './components/TopSaleItemsWidget';
import { mockKpiData } from './data/mockDashboardData';
import { useCashBalanceQuery } from '@/hooks/useCashBalance';
import { useFinancialAccounts } from '@/hooks/useFinancialAccounts';
import PageHeader from '@/components/page-header/PageHeader';
import { RefreshButton } from '@/components/common';

const AdminDashboard: React.FC = () => {
  const {
    data: liveCashBalance,
    refetch: refetchCash,
    isRefetching: isRefetchingCash,
  } = useCashBalanceQuery({
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const {
    registeredBankAccounts,
    registeredMfsAccounts,
    bankQuery,
    mfsQuery,
  } = useFinancialAccounts({
    bankOptions: {
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
    },
    mfsOptions: {
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
    },
  });

  const isRefreshing = isRefetchingCash || bankQuery.isRefetching || mfsQuery.isRefetching;

  const handleRefresh = async () => {
    await Promise.all([
      refetchCash(),
      bankQuery.refetch(),
      mfsQuery.refetch(),
    ]);
  };

  const kpiData = useMemo(() => {
    // Following cash-boi-v2: Only active bank accounts count toward standing bank balance
    const liveBank = registeredBankAccounts
      .filter((b) => String(b.status || '').toLowerCase() === 'active')
      .reduce(
        (sum, b) => sum + (Number(b.currentBalance ?? b.balance ?? 0) || 0),
        0
      );

    // Following cash-boi-v2: Only active MFS wallets count toward standing MFS balance
    const liveMfs = registeredMfsAccounts
      .filter((m) => String(m.status || '').toLowerCase() === 'active')
      .reduce(
        (sum, m) => sum + (Number(m.currentBalance ?? m.balance ?? 0) || 0),
        0
      );

    return {
      ...mockKpiData,
      cashBalance: typeof liveCashBalance === 'number' ? liveCashBalance : mockKpiData.cashBalance,
      bankBalance: bankQuery.isSuccess
        ? liveBank
        : registeredBankAccounts.length > 0
        ? liveBank
        : mockKpiData.bankBalance,
      mfsBalance: mfsQuery.isSuccess
        ? liveMfs
        : registeredMfsAccounts.length > 0
        ? liveMfs
        : (mockKpiData.mfsBalance ?? 0),
    };
  }, [
    liveCashBalance,
    registeredBankAccounts,
    registeredMfsAccounts,
    bankQuery.isSuccess,
    mfsQuery.isSuccess,
  ]);

  return (
    <div className="flex flex-col gap-4 sm:gap-4.5 p-4 sm:p-5 bg-[#f8fafc]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          headerTitle="Dashboard"
          headerDescription="Overview of business performance and standing balances"
        />
        <RefreshButton
          onClick={handleRefresh}
          isLoading={isRefreshing}
        />
      </div>
      <KpiCardsGrid data={kpiData} />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-4.5 items-stretch">
        <div className="col-span-12 lg:col-span-8 flex flex-col h-full">
          <SaleAnalysisChart />
        </div>
        <div className="col-span-12 lg:col-span-4 flex flex-col h-full">
          <AssetAnalysisChart />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-4.5 items-stretch">
        <div className="col-span-12 lg:col-span-8 flex flex-col h-full">
          <ProfitLossChart />
        </div>
        <div className="col-span-12 lg:col-span-4 flex flex-col h-full">
          <TopSaleItemsWidget />
        </div>
      </div>

      <div className="w-full">
        <TopCustomersWidget />
      </div>
    </div>
  );
};

export default AdminDashboard;
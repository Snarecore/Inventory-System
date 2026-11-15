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

    // Following cash-boi-v2: Only active MFS accounts count toward standing MFS balance
    const liveMfs = registeredMfsAccounts
      .filter((m) => String(m.status || '').toLowerCase() === 'active')
      .reduce(
        (sum, m) => sum + (Number(m.currentBalance ?? m.openingBalance ?? 0) || 0),
        0
      );

    const computedCash = typeof liveCashBalance === 'number' ? liveCashBalance : mockKpiData.cashBalance;
    const computedBank = bankQuery.isSuccess
      ? liveBank
      : registeredBankAccounts.length > 0
      ? liveBank
      : mockKpiData.bankBalance;
    const computedMfs = mfsQuery.isSuccess
      ? liveMfs
      : registeredMfsAccounts.length > 0
      ? liveMfs
      : (mockKpiData.mfsBalance ?? 0);

    return {
      ...mockKpiData,
      cashBalance: computedCash,
      bankBalance: computedBank,
      mfsBalance: computedMfs,
      totalBalance: computedCash + computedBank + computedMfs,
    };
  }, [
    liveCashBalance,
    registeredBankAccounts,
    registeredMfsAccounts,
    bankQuery.isSuccess,
    mfsQuery.isSuccess,
  ]);

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
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
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 items-stretch">
        <div className="col-span-12 lg:col-span-8 flex flex-col h-full">
          <SaleAnalysisChart />
        </div>
        <div className="col-span-12 lg:col-span-4 flex flex-col h-full">
          <AssetAnalysisChart />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 items-stretch">
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
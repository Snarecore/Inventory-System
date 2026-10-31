import React from 'react';
import { KpiCardsGrid } from './components/KpiCardsGrid';
import { SaleAnalysisChart } from './components/SaleAnalysisChart';
import { ProfitLossChart } from './components/ProfitLossChart';
import { AssetAnalysisChart } from './components/AssetAnalysisChart';
import { TopCustomersWidget } from './components/TopCustomersWidget';
import { TopSaleItemsWidget } from './components/TopSaleItemsWidget';
import { useAdminDashboardData } from './hooks/useAdminDashboardData';

const AdminDashboard: React.FC = () => {
  const dashboard = useAdminDashboardData();
  const updatedLabel = dashboard.updatedAt
    ? `Data refreshed ${new Date(dashboard.updatedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    : 'Loading live data';

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 sm:gap-4.5 p-4 sm:p-5">
      <div className="premium-panel flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ui-text-subtle)]">
            Dashboard
          </p>
          <h1 className="mt-1 text-xl font-bold text-[var(--ui-text)] sm:text-2xl">
            Business overview
          </h1>
        </div>
        <div className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--ui-text-muted)]">
          {updatedLabel}
        </div>
      </div>

      {dashboard.hasError && (
        <div role="status" className="rounded-xl border border-[var(--ui-warning)]/30 bg-[var(--ui-warning-light)] px-4 py-3 text-sm text-[var(--ui-text)]">
          Some dashboard data could not be loaded. Values shown below reflect the data that is available.
        </div>
      )}

      <KpiCardsGrid data={dashboard.kpis} isLoading={dashboard.isLoading} />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-4.5 items-stretch">
        <div className="col-span-12 lg:col-span-8 flex flex-col h-full">
          <SaleAnalysisChart sales={dashboard.sales} />
        </div>
        <div className="col-span-12 lg:col-span-4 flex flex-col h-full">
          <AssetAnalysisChart data={dashboard.assets} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-4.5 items-stretch">
        <div className="col-span-12 lg:col-span-8 flex flex-col h-full">
          <ProfitLossChart sales={dashboard.sales} expenses={dashboard.expenses} />
        </div>
        <div className="col-span-12 lg:col-span-4 flex flex-col h-full">
          <TopSaleItemsWidget items={dashboard.topSaleItems} />
        </div>
      </div>

      <div className="w-full">
        <TopCustomersWidget customers={dashboard.topCustomers} />
      </div>
    </div>
  );
};

export default AdminDashboard;

import React from 'react';
import { KpiCardsGrid } from './components/KpiCardsGrid';
import { SaleAnalysisChart } from './components/SaleAnalysisChart';
import { ProfitLossChart } from './components/ProfitLossChart';
import { AssetAnalysisChart } from './components/AssetAnalysisChart';
import { TopCustomersWidget } from './components/TopCustomersWidget';
import { TopSaleItemsWidget } from './components/TopSaleItemsWidget';
import { mockKpiData } from './data/mockDashboardData';

const AdminDashboard: React.FC = () => {
  return (
    <div className="flex flex-col gap-4 sm:gap-4.5 p-4 sm:p-5 bg-[#f8fafc]">
      <KpiCardsGrid data={mockKpiData} />
      
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

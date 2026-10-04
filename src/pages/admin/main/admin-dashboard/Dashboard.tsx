import React from 'react';
import Footer from '@/components/admin/Footer';
import { KpiCardsGrid } from './components/KpiCardsGrid';
import { SaleAnalysisChart } from './components/SaleAnalysisChart';
import { ProfitLossChart } from './components/ProfitLossChart';
import { AssetAnalysisChart } from './components/AssetAnalysisChart';
import { TopCustomersWidget } from './components/TopCustomersWidget';
import { TopSaleItemsWidget } from './components/TopSaleItemsWidget';
import { mockKpiData } from './data/mockDashboardData';

const AdminDashboard: React.FC = () => {
  return (
    <>
      <div className="flex flex-col gap-8 min-h-screen p-6 bg-[#f8fafc]">
        <KpiCardsGrid data={mockKpiData} />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="col-span-12 lg:col-span-8 flex flex-col h-full">
            <SaleAnalysisChart />
          </div>
          <div className="col-span-12 lg:col-span-4 flex flex-col h-full">
            <AssetAnalysisChart />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
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

      <Footer />
    </>
  );
};

export default AdminDashboard;

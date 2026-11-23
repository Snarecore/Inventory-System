import dashboardData from './dashboardMockData.json';
import {
  DashboardKpiData,
  SalesDataPoint,
  SalesTimeframe,
  MonthlyProfitLoss,
  TopCustomer,
  TopSaleItem,
  AssetAnalysisData,
} from '../types/dashboard.types';

export const mockKpiData: DashboardKpiData = dashboardData.kpiData as DashboardKpiData;

export const mockSalesData: Record<
  SalesTimeframe,
  { points: SalesDataPoint[]; summary: { total: number; average: number } }
> = dashboardData.salesAnalysis as Record<
  SalesTimeframe,
  { points: SalesDataPoint[]; summary: { total: number; average: number } }
>;

export const mockProfitLossData: MonthlyProfitLoss[] =
  dashboardData.profitLoss as MonthlyProfitLoss[];

export const mockTopCustomers: TopCustomer[] =
  dashboardData.topCustomers as TopCustomer[];

export const mockTopSaleItems: TopSaleItem[] =
  dashboardData.topSaleItems as TopSaleItem[];

export const mockAssetAnalysis: AssetAnalysisData =
  dashboardData.assetAnalysis as AssetAnalysisData;

export default dashboardData;

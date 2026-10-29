export interface DashboardKpiData {
  todaysSale: number;
  todaysExpense: number;
  totalReceivable: number;
  totalPayable: number;
  cashBalance: number;
  bankBalance: number;
  mfsBalance?: number;
}

export type SalesTimeframe = 'daily' | 'weekly' | 'monthly';

export interface SalesDataPoint {
  label: string;
  sales: number;
  orders: number;
}

export interface WeeklyBreakdown {
  week: string;
  income: number;
  expense: number;
  netProfit: number;
}

export interface MonthlyProfitLoss {
  month: string;
  income: number;
  expense: number;
  netProfit: number;
  weeks: WeeklyBreakdown[];
}

export interface TopCustomer {
  id: string;
  name: string;
  phone: string;
  totalPurchases: number;
  ordersCount: number;
  avatarColor: string;
}

export interface TopSaleItem {
  id: string;
  name: string;
  category: string;
  soldQuantity: number;
  totalRevenue: number;
  percentage: number;
}

export interface AssetCategory {
  category: string;
  amount: number;
  color: string;
  percentage: number;
}

export interface AssetAnalysisData {
  totalAsset: number;
  breakdown: AssetCategory[];
}

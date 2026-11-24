export interface DashboardKpiData {
  todaysSale: number;
  todaysPurchase?: number;
  todaysExpense?: number;
  customerDue: number;
  supplierDue: number;
  denaPawnaDena?: number;
  denaPawnaPawna?: number;
  denaPawnaPabo?: number;
  denaPawnaDibo?: number;
  totalReceivable: number;
  totalPayable: number;
  cashBalance: number;
  bankBalance: number;
  mfsBalance?: number;
  totalBalance?: number;
}

export type SalesTimeframe = 'daily' | 'weekly' | 'monthly';

export interface SalesDataPoint {
  label: string;
  sales: number;
  orders: number;
}

export interface SalesAnalysisSummary {
  total: number;
  average: number;
}

export interface SalesTimeframeData {
  summary: SalesAnalysisSummary;
  points: SalesDataPoint[];
}

export type SalesAnalysisData = Record<SalesTimeframe, SalesTimeframeData>;

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
  avatarColor?: string;
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
  color?: string;
  percentage?: number;
}

export interface AssetAnalysisData {
  totalAsset: number;
  breakdown: AssetCategory[];
}

export interface UserDashboardData {
  kpiData: DashboardKpiData;
  salesAnalysis: Record<SalesTimeframe, SalesTimeframeData>;
  assetAnalysis: AssetAnalysisData;
  profitLoss: MonthlyProfitLoss[];
  topCustomers: TopCustomer[];
  topSaleItems: TopSaleItem[];
}

export interface UserDashboardApiResponse {
  status: string;
  msg?: string;
  message?: string;
  data: UserDashboardData;
}


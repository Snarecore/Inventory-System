import moment from 'moment';
import apiConfig from '@/config/api.json';
import { postData } from '@/services/api-service';
import { buildAccessUser } from '@/utils/access-user';
import type {
  UserDashboardApiResponse,
  UserDashboardData,
  DashboardKpiData,
  SalesAnalysisData,
  SalesTimeframe,
  AssetAnalysisData,
  MonthlyProfitLoss,
  TopCustomer,
  TopSaleItem,
} from '@/pages/admin/main/admin-dashboard/types/dashboard.types';

export const emptyDashboardData: UserDashboardData = {
  kpiData: {
    todaysSale: 0,
    todaysPurchase: 0,
    todaysExpense: 0,
    customerDue: 0,
    supplierDue: 0,
    denaPawnaDena: 0,
    denaPawnaPawna: 0,
    denaPawnaPabo: 0,
    denaPawnaDibo: 0,
    totalReceivable: 0,
    totalPayable: 0,
    cashBalance: 0,
    bankBalance: 0,
    mfsBalance: 0,
    totalBalance: 0,
  },
  salesAnalysis: {
    daily: { summary: { total: 0, average: 0 }, points: [] },
    weekly: { summary: { total: 0, average: 0 }, points: [] },
    monthly: { summary: { total: 0, average: 0 }, points: [] },
  },
  assetAnalysis: {
    totalAsset: 0,
    breakdown: [
      { category: 'Bank Balance', amount: 0, color: '#28c76f' },
      { category: 'Stock / Inventory', amount: 0, color: '#009fe3' },
      { category: 'Accounts Receivable', amount: 0, color: '#1b2850' },
      { category: 'Cash in Hand', amount: 0, color: '#ff9f43' },
      { category: 'MFS Balance', amount: 0, color: '#7367f0' },
    ],
  },
  profitLoss: [],
  topCustomers: [],
  topSaleItems: [],
};

/**
 * Normalizes raw API response into a strictly typed and null-safe UserDashboardData.
 */
export const normalizeUserDashboardData = (raw: any): UserDashboardData => {
  const root = raw?.data || raw || {};

  // 1. KPI Data
  const rawKpi = root.kpiData || {};
  const kpiData: DashboardKpiData = {
    todaysSale: Number(rawKpi.todaysSale ?? 0),
    todaysPurchase: Number(rawKpi.todaysPurchase ?? rawKpi.todaysExpense ?? 0),
    todaysExpense: Number(rawKpi.todaysExpense ?? rawKpi.todaysPurchase ?? 0),
    customerDue: Number(rawKpi.customerDue ?? 0),
    supplierDue: Number(rawKpi.supplierDue ?? 0),
    denaPawnaDena: Number(rawKpi.denaPawnaDena ?? 0),
    denaPawnaPawna: Number(rawKpi.denaPawnaPawna ?? 0),
    denaPawnaPabo: Number(rawKpi.denaPawnaPabo ?? rawKpi.denaPawnaDena ?? 0),
    denaPawnaDibo: Number(rawKpi.denaPawnaDibo ?? rawKpi.denaPawnaPawna ?? 0),
    totalReceivable: Number(
      rawKpi.totalReceivable ??
        (Number(rawKpi.customerDue ?? 0) + Number(rawKpi.denaPawnaPawna ?? 0))
    ),
    totalPayable: Number(
      rawKpi.totalPayable ??
        (Number(rawKpi.supplierDue ?? 0) + Number(rawKpi.denaPawnaDena ?? 0))
    ),
    cashBalance: Number(rawKpi.cashBalance ?? 0),
    bankBalance: Number(rawKpi.bankBalance ?? 0),
    mfsBalance: Number(rawKpi.mfsBalance ?? 0),
    totalBalance: Number(
      rawKpi.totalBalance ??
        (Number(rawKpi.cashBalance ?? 0) +
          Number(rawKpi.bankBalance ?? 0) +
          Number(rawKpi.mfsBalance ?? 0))
    ),
  };

  // 2. Sales Analysis
  const rawSales = root.salesAnalysis || {};
  const normalizeTimeframe = (tfData: any) => ({
    summary: {
      total: Number(tfData?.summary?.total ?? 0),
      average: Number(tfData?.summary?.average ?? 0),
    },
    points: Array.isArray(tfData?.points)
      ? tfData.points.map((p: any) => ({
          label: String(p?.label || ''),
          sales: Number(p?.sales ?? 0),
          orders: Number(p?.orders ?? 0),
        }))
      : [],
  });

  const timeframes: SalesTimeframe[] = ['daily', 'weekly', 'monthly'];
  const salesAnalysis: SalesAnalysisData = {} as SalesAnalysisData;
  timeframes.forEach((tf) => {
    salesAnalysis[tf] = normalizeTimeframe(rawSales[tf]);
  });

  // 3. Asset Analysis
  const rawAsset = root.assetAnalysis || {};
  const assetAnalysis: AssetAnalysisData = {
    totalAsset: Number(rawAsset.totalAsset ?? 0),
    breakdown: Array.isArray(rawAsset.breakdown)
      ? rawAsset.breakdown.map((item: any) => ({
          category: String(item?.category || ''),
          amount: Number(item?.amount ?? 0),
          color: item?.color ? String(item.color) : undefined,
          percentage: item?.percentage !== undefined ? Number(item.percentage) : undefined,
        }))
      : [],
  };

  // 4. Profit & Loss
  const rawPL = Array.isArray(root.profitLoss) ? root.profitLoss : [];
  const profitLoss: MonthlyProfitLoss[] = rawPL.map((m: any) => {
    const inc = Number(m?.income ?? 0);
    const exp = Number(m?.expense ?? 0);
    return {
      month: String(m?.month || ''),
      income: inc,
      expense: exp,
      netProfit: Number(m?.netProfit ?? inc - exp),
      weeks: Array.isArray(m?.weeks)
        ? m.weeks.map((w: any) => {
            const wInc = Number(w?.income ?? 0);
            const wExp = Number(w?.expense ?? 0);
            return {
              week: String(w?.week || ''),
              income: wInc,
              expense: wExp,
              netProfit: Number(w?.netProfit ?? wInc - wExp),
            };
          })
        : [],
    };
  });

  // 5. Top Customers
  const rawCust = Array.isArray(root.topCustomers) ? root.topCustomers : [];
  const topCustomers: TopCustomer[] = rawCust.map((c: any) => ({
    id: String(c?.id ?? ''),
    name: String(c?.name || 'Customer'),
    phone: String(c?.phone || ''),
    totalPurchases: Number(c?.totalPurchases ?? 0),
    ordersCount: Number(c?.ordersCount ?? 0),
    avatarColor: c?.avatarColor ? String(c.avatarColor) : undefined,
  }));

  // 6. Top Sale Items
  const rawItems = Array.isArray(root.topSaleItems) ? root.topSaleItems : [];
  const topSaleItems: TopSaleItem[] = rawItems.map((item: any) => ({
    id: String(item?.id ?? ''),
    name: String(item?.name || 'Item'),
    category: String(item?.category || 'General'),
    soldQuantity: Number(item?.soldQuantity ?? 0),
    totalRevenue: Number(item?.totalRevenue ?? 0),
    percentage: Number(item?.percentage ?? 0),
  }));

  return {
    kpiData,
    salesAnalysis,
    assetAnalysis,
    profitLoss,
    topCustomers,
    topSaleItems,
  };
};

/**
 * Fetches user dashboard statistics and metrics from the "get-user-dashboard" endpoint.
 */
export const fetchUserDashboard = async (
  dateRange?: { fromDate?: string; toDate?: string }
): Promise<UserDashboardData> => {
  const accessUser = buildAccessUser();
  const endpoint = apiConfig.dashboard?.getUserDashboardUrl || 'get-user-dashboard';

  const fromDate =
    dateRange?.fromDate || moment().startOf('year').format('DD-MM-YYYY');
  const toDate =
    dateRange?.toDate || moment().format('DD-MM-YYYY');

  try {
    const res: any = await postData<UserDashboardApiResponse>({
      url: endpoint,
      body: {
        accessUser,
        fromDate,
        toDate,
      },
    });

    console.log('[get-user-dashboard] API response:', res);

    if (
      res &&
      !res.error &&
      String(res.status).toLowerCase() !== 'error' &&
      (res.data || res.kpiData)
    ) {
      return normalizeUserDashboardData(res);
    }
    console.warn('API returned non-success for get-user-dashboard:', res?.msg || res?.message);
  } catch (error) {
    console.warn('Failed to fetch live get-user-dashboard:', error);
  }

  // Fallback to empty clean structure so no mock data is displayed
  return emptyDashboardData;
};

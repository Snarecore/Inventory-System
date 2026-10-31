import {
  DashboardKpiData,
  SalesDataPoint,
  SalesTimeframe,
  MonthlyProfitLoss,
  TopCustomer,
  TopSaleItem,
  AssetAnalysisData,
} from '../types/dashboard.types';

export const mockKpiData: DashboardKpiData = {
  todaysSale: 148500,
  todaysExpense: 32400,
  totalReceivable: 485000,
  totalPayable: 215000,
  cashBalance: 96450,
  bankBalance: 782000,
};

export const mockSalesData: Record<SalesTimeframe, { points: SalesDataPoint[]; summary: { total: number; average: number } }> = {
  daily: {
    points: [
      { label: '08:00 AM', sales: 12000, orders: 4 },
      { label: '10:00 AM', sales: 28500, orders: 9 },
      { label: '12:00 PM', sales: 42000, orders: 15 },
      { label: '02:00 PM', sales: 18400, orders: 6 },
      { label: '04:00 PM', sales: 34600, orders: 11 },
      { label: '06:00 PM', sales: 51200, orders: 18 },
      { label: '08:00 PM', sales: 24800, orders: 8 },
      { label: '10:00 PM', sales: 9000, orders: 3 },
    ],
    summary: { total: 220500, average: 27562 },
  },
  weekly: {
    points: [
      { label: 'Saturday', sales: 165000, orders: 45 },
      { label: 'Sunday', sales: 198000, orders: 54 },
      { label: 'Monday', sales: 142000, orders: 38 },
      { label: 'Tuesday', sales: 187500, orders: 49 },
      { label: 'Wednesday', sales: 210000, orders: 58 },
      { label: 'Thursday', sales: 245000, orders: 67 },
      { label: 'Friday', sales: 135000, orders: 32 },
    ],
    summary: { total: 1282500, average: 183214 },
  },
  monthly: {
    points: [
      { label: 'Week 1', sales: 850000, orders: 230 },
      { label: 'Week 2', sales: 1120000, orders: 310 },
      { label: 'Week 3', sales: 980000, orders: 275 },
      { label: 'Week 4', sales: 1450000, orders: 390 },
    ],
    summary: { total: 4400000, average: 1100000 },
  },
};

export const mockProfitLossData: MonthlyProfitLoss[] = [
  {
    month: 'Oct 2025',
    income: 420000,
    expense: 290000,
    netProfit: 130000,
    weeks: [
      { week: 'Week 1', income: 95000, expense: 68000, netProfit: 27000 },
      { week: 'Week 2', income: 110000, expense: 74000, netProfit: 36000 },
      { week: 'Week 3', income: 105000, expense: 71000, netProfit: 34000 },
      { week: 'Week 4', income: 110000, expense: 77000, netProfit: 33000 },
    ],
  },
  {
    month: 'Nov 2025',
    income: 480000,
    expense: 390000,
    netProfit: 90000,
    weeks: [
      { week: 'Week 1', income: 130000, expense: 85000, netProfit: 45000 },
      { week: 'Week 2', income: 140000, expense: 95000, netProfit: 45000 },
      { week: 'Week 3', income: 90000, expense: 115000, netProfit: -25000 },
      { week: 'Week 4', income: 120000, expense: 95000, netProfit: 25000 },
    ],
  },
  {
    month: 'Dec 2025',
    income: 630000,
    expense: 395000,
    netProfit: 235000,
    weeks: [
      { week: 'Week 1', income: 140000, expense: 89000, netProfit: 51000 },
      { week: 'Week 2', income: 165000, expense: 102000, netProfit: 63000 },
      { week: 'Week 3', income: 155000, expense: 98000, netProfit: 57000 },
      { week: 'Week 4', income: 170000, expense: 106000, netProfit: 64000 },
    ],
  },
  {
    month: 'Jan 2026',
    income: 340000,
    expense: 420000,
    netProfit: -80000,
    weeks: [
      { week: 'Week 1', income: 70000, expense: 95000, netProfit: -25000 },
      { week: 'Week 2', income: 85000, expense: 110000, netProfit: -25000 },
      { week: 'Week 3', income: 95000, expense: 105000, netProfit: -10000 },
      { week: 'Week 4', income: 90000, expense: 110000, netProfit: -20000 },
    ],
  },
  {
    month: 'Feb 2026',
    income: 580000,
    expense: 340000,
    netProfit: 240000,
    weeks: [
      { week: 'Week 1', income: 130000, expense: 78000, netProfit: 52000 },
      { week: 'Week 2', income: 145000, expense: 85000, netProfit: 60000 },
      { week: 'Week 3', income: 145000, expense: 84000, netProfit: 61000 },
      { week: 'Week 4', income: 160000, expense: 93000, netProfit: 67000 },
    ],
  },
  {
    month: 'Mar 2026',
    income: 720000,
    expense: 410000,
    netProfit: 310000,
    weeks: [
      { week: 'Week 1', income: 160000, expense: 92000, netProfit: 68000 },
      { week: 'Week 2', income: 185000, expense: 104000, netProfit: 81000 },
      { week: 'Week 3', income: 180000, expense: 102000, netProfit: 78000 },
      { week: 'Week 4', income: 195000, expense: 112000, netProfit: 83000 },
    ],
  },
];

export const mockTopCustomers: TopCustomer[] = [
  {
    id: 'CUST-001',
    name: 'Rahim Trading Corp',
    phone: '01711-234567',
    totalPurchases: 345000,
    ordersCount: 28,
    avatarColor: 'bg-[#009fe3]',
  },
  {
    id: 'CUST-002',
    name: 'Karim & Brothers Ltd',
    phone: '01819-876543',
    totalPurchases: 298000,
    ordersCount: 22,
    avatarColor: 'bg-[#28c76f]',
  },
  {
    id: 'CUST-003',
    name: 'Bengal Enterprise',
    phone: '01912-345678',
    totalPurchases: 245000,
    ordersCount: 19,
    avatarColor: 'bg-[#1b2850]',
  },
  {
    id: 'CUST-004',
    name: 'Al-Madina General Store',
    phone: '01678-901234',
    totalPurchases: 189000,
    ordersCount: 15,
    avatarColor: 'bg-[#ff9f43]',
  },
  {
    id: 'CUST-005',
    name: 'Green Valley Retailers',
    phone: '01552-112233',
    totalPurchases: 142000,
    ordersCount: 12,
    avatarColor: 'bg-[#7367f0]',
  },
];

export const mockTopSaleItems: TopSaleItem[] = [
  {
    id: 'ITEM-001',
    name: 'Standard Basmati Rice (25kg)',
    category: 'Grocery & Food',
    soldQuantity: 420,
    totalRevenue: 630000,
    percentage: 85,
  },
  {
    id: 'ITEM-002',
    name: 'Fresh Soyabean Oil (5L)',
    category: 'Oils & Fats',
    soldQuantity: 360,
    totalRevenue: 306000,
    percentage: 72,
  },
  {
    id: 'ITEM-003',
    name: 'Premium Wheat Flour (50kg)',
    category: 'Grains & Flours',
    soldQuantity: 280,
    totalRevenue: 448000,
    percentage: 58,
  },
  {
    id: 'ITEM-004',
    name: 'Refined White Sugar (50kg)',
    category: 'Commodities',
    soldQuantity: 215,
    totalRevenue: 279500,
    percentage: 45,
  },
  {
    id: 'ITEM-005',
    name: 'Aroma Ceylon Tea (500g)',
    category: 'Beverages',
    soldQuantity: 190,
    totalRevenue: 104500,
    percentage: 38,
  },
];

export const mockAssetAnalysis: AssetAnalysisData = {
  totalAsset: 3850000,
  breakdown: [
    {
      category: 'Bank Balance',
      amount: 1450000,
      color: '#28c76f',
      percentage: 37.6,
    },
    {
      category: 'Stock / Inventory',
      amount: 1200000,
      color: '#009fe3',
      percentage: 31.2,
    },
    {
      category: 'Accounts Receivable',
      amount: 850000,
      color: '#1b2850',
      percentage: 22.1,
    },
    {
      category: 'Cash in Hand',
      amount: 350000,
      color: '#ff9f43',
      percentage: 9.1,
    },
  ],
};

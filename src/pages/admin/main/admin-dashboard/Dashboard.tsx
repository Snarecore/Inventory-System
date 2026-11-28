import React, { useMemo, useState, useCallback } from 'react';
import moment from 'moment';
import { KpiCardsGrid } from './components/KpiCardsGrid';
import { SaleAnalysisChart } from './components/SaleAnalysisChart';
import { ProfitLossChart } from './components/ProfitLossChart';
import { AssetAnalysisChart } from './components/AssetAnalysisChart';
import { TopCustomersWidget } from './components/TopCustomersWidget';
import { TopSaleItemsWidget } from './components/TopSaleItemsWidget';
import { useUserDashboardQuery } from '@/hooks/useUserDashboard';
import { useCashBalanceQuery } from '@/hooks/useCashBalance';
import { useFinancialAccounts } from '@/hooks/useFinancialAccounts';
import { useSalesQuery } from '@/pages/admin/trade/sales/hooks/useSalesQueries';
import { usePurchasesQuery } from '@/pages/admin/trade/purchases/hooks/usePurchaseQueries';
import { useCustomersDueQuery } from '@/hooks/useCustomersDue';
import { usePurchasesDueQuery } from '@/hooks/usePurchasesDue';
import { useKhatabookDashboardQuery } from '@/hooks/useKhatabook';
import { useTradeProducts } from '@/hooks/useTradeProducts';
import PageHeader from '@/components/page-header/PageHeader';
import { RefreshButton } from '@/components/common';
import DateRangePicker from '@/components/date-range-picker/DateRangePicker';

const DATE_PARSE_FORMATS = [
  'DD MMM, YYYY',
  'DD MMM YYYY',
  'DD-MM-YYYY',
  'DD/MM/YYYY',
  'YYYY-MM-DD',
  'YYYY/MM/DD',
];

const parseRawDate = (rawDate: unknown): moment.Moment | null => {
  if (!rawDate) return null;
  const d = String(rawDate).trim();
  if (!d) return null;
  const mCustom = moment(d, DATE_PARSE_FORMATS, true);
  if (mCustom.isValid()) return mCustom;
  const m = moment(d);
  return m.isValid() ? m : null;
};

const AdminDashboard: React.FC = () => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<string>('all');

  const apiDateRange = useMemo(() => {
    if (!startDate && !endDate) return undefined;
    return {
      fromDate: startDate ? moment(startDate, 'YYYY-MM-DD').format('DD-MM-YYYY') : undefined,
      toDate: endDate ? moment(endDate, 'YYYY-MM-DD').format('DD-MM-YYYY') : undefined,
    };
  }, [startDate, endDate]);

  const hasDateFilter = Boolean(startDate || endDate);

  const isDateInSelectedRange = useCallback(
    (rawDate: unknown, fallbackToToday = true): boolean => {
      const parsed = parseRawDate(rawDate);
      if (!parsed) return false;
      if (!startDate && !endDate) {
        return fallbackToToday ? parsed.isSame(moment(), 'day') : true;
      }
      if (startDate && parsed.isBefore(moment(startDate, 'YYYY-MM-DD'), 'day')) {
        return false;
      }
      if (endDate && parsed.isAfter(moment(endDate, 'YYYY-MM-DD'), 'day')) {
        return false;
      }
      return true;
    },
    [startDate, endDate]
  );

  // 0. Primary Live Dashboard Query ("get-user-dashboard")
  const {
    data: userDashboard,
    refetch: refetchUserDashboard,
    isRefetching: isRefetchingDashboard,
  } = useUserDashboardQuery(apiDateRange);

  // 1. Live Cash Balance Query
  const {
    data: liveCashBalance,
    refetch: refetchCash,
    isRefetching: isRefetchingCash,
  } = useCashBalanceQuery();

  // 2. Financial Accounts Query (Bank & MFS Wallets)
  const {
    registeredBankAccounts,
    registeredMfsAccounts,
    bankQuery,
    mfsQuery,
  } = useFinancialAccounts();

  // 3. Sales Query (for Today's Sale)
  const {
    data: salesList = [],
    refetch: refetchSales,
    isRefetching: isRefetchingSales,
  } = useSalesQuery();

  // 4. Purchases Query (for Today's Purchase)
  const {
    data: purchaseList = [],
    refetch: refetchPurchases,
    isRefetching: isRefetchingPurchases,
  } = usePurchasesQuery();

  // 5. Customers Due Query (for Total Receivable)
  const {
    data: customersDue = [],
    refetch: refetchCustomersDue,
    isRefetching: isRefetchingDue,
  } = useCustomersDueQuery();

  // 6. Purchases Due Query (for Total Payable)
  const {
    data: purchasesDue = [],
    refetch: refetchPurchasesDue,
    isRefetching: isRefetchingPurchasesDue,
  } = usePurchasesDueQuery();

  // 7. Khatabook Dashboard Query (for person ledger dues)
  const {
    kpi: khatabookKpi,
    refetch: refetchKhatabook,
    isFetching: isFetchingKhatabook,
  } = useKhatabookDashboardQuery();

  // 8. Trade Products Query (for live stock / inventory valuation)
  const {
    allProducts = [],
    refetch: refetchProducts,
  } = useTradeProducts();

  const isRefreshing =
    isRefetchingDashboard ||
    isRefetchingCash ||
    bankQuery.isRefetching ||
    mfsQuery.isRefetching ||
    isRefetchingSales ||
    isRefetchingPurchases ||
    isRefetchingDue ||
    isRefetchingPurchasesDue ||
    isFetchingKhatabook;

  const handleRefresh = async () => {
    await Promise.all([
      refetchUserDashboard(),
      refetchCash(),
      bankQuery.refetch(),
      mfsQuery.refetch(),
      refetchSales(),
      refetchPurchases(),
      refetchCustomersDue(),
      refetchPurchasesDue(),
      refetchKhatabook(),
      refetchProducts(),
    ]);
  };

  const kpiData = useMemo(() => {
    // 1. Active Bank Accounts total balance
    const liveBank = registeredBankAccounts
      .filter((b) => {
        const s = String(b.status || '').toLowerCase().trim();
        return s === 'active' || s === '1' || s === 'y' || s === 'true' || !s;
      })
      .reduce(
        (sum, b) => sum + (Number(b.currentBalance ?? b.openingBalance ?? 0) || 0),
        0
      );

    // 2. Active MFS Accounts total balance
    const liveMfs = registeredMfsAccounts
      .filter((m) => {
        const s = String(m.status || '').toLowerCase().trim();
        return s === 'active' || s === '1' || s === 'y' || s === 'true' || !s;
      })
      .reduce(
        (sum, m) => sum + (Number(m.currentBalance ?? m.openingBalance ?? 0) || 0),
        0
      );

    const computedCash = typeof liveCashBalance === 'number' ? liveCashBalance : 0;
    const computedBank = bankQuery.isSuccess
      ? liveBank
      : registeredBankAccounts.length > 0
      ? liveBank
      : 0;
    const computedMfs = mfsQuery.isSuccess
      ? liveMfs
      : registeredMfsAccounts.length > 0
      ? liveMfs
      : 0;

    // 3. Sale total (for selected date range, or today by default)
    const todaysSale = (salesList || []).reduce((sum, s) => {
      if (s.isReturnRecord) return sum;
      const date = s.salesDate || s.saleDate || s.sales_date || s.date || s.createdAt || s.createdDate;
      if (isDateInSelectedRange(date, true)) {
        return sum + (Number(s.grandTotal ?? s.totalAmount ?? s.paidAmount ?? 0) || 0);
      }
      return sum;
    }, 0);

    // 4. Purchase total (for selected date range, or today by default)
    const todaysPurchase = (purchaseList || []).reduce((sum, p) => {
      if (p.isReturnRecord) return sum;
      const date =
        p.purchaseDate ||
        (p as any).purchasesDate ||
        (p as any).purchase_date ||
        (p as any).date ||
        p.createdAt ||
        (p as any).createdDate;
      if (isDateInSelectedRange(date, true)) {
        return sum + (Number(p.grandTotal ?? p.totalAmount ?? p.paidAmount ?? 0) || 0);
      }
      return sum;
    }, 0);

    // 5. Customer Due: Outstanding dues from trade customers
    const customerDue = (customersDue || []).reduce(
      (sum, c) => sum + (Number(c.totalDue ?? c.dueAmount ?? 0) || 0),
      0
    );

    // 6. Supplier Due: Outstanding dues to trade suppliers
    const supplierDue = (purchasesDue || []).reduce(
      (sum, s) => sum + (Number(s.totalDue ?? s.dueAmount ?? 0) || 0),
      0
    );

    // 7. Dena Pawna: Outstanding ledger dues matching Mobile App
    const denaPawnaDena = Number(khatabookKpi?.totalDena ?? 0);
    const denaPawnaPawna = Number(khatabookKpi?.totalPawna ?? 0);

    // 8. Overall Total Receivable & Total Payable
    const totalReceivable = customerDue + denaPawnaPawna;
    const totalPayable = supplierDue + denaPawnaDena;

    return {
      todaysSale,
      todaysPurchase,
      todaysExpense: todaysPurchase,
      customerDue,
      supplierDue,
      denaPawnaDena,
      denaPawnaPawna,
      denaPawnaPabo: denaPawnaDena,
      denaPawnaDibo: denaPawnaPawna,
      totalReceivable,
      totalPayable,
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
    salesList,
    purchaseList,
    customersDue,
    purchasesDue,
    khatabookKpi?.totalDena,
    khatabookKpi?.totalPawna,
    khatabookKpi?.totalPabo,
    khatabookKpi?.totalDibo,
    isDateInSelectedRange,
  ]);

  // Merge live transactional queries with endpoint structure so newly recorded sales and live balances immediately reflect!
  const activeKpiData = useMemo(() => {
    const base = userDashboard?.kpiData;

    const liveSale = Number(kpiData.todaysSale || 0);
    const liveExpense = Number(kpiData.todaysExpense ?? kpiData.todaysPurchase ?? 0);
    const liveCustomerDue = Number(kpiData.customerDue || 0);
    const liveSupplierDue = Number(kpiData.supplierDue || 0);
    const liveDena = Number(kpiData.denaPawnaDena || 0);
    const livePawna = Number(kpiData.denaPawnaPawna || 0);
    const liveCash = Number(kpiData.cashBalance || 0);
    const liveBank = Number(kpiData.bankBalance || 0);
    const liveMfs = Number(kpiData.mfsBalance || 0);

    const finalTodaysSale = liveSale > 0 ? liveSale : (Number(base?.todaysSale) || 0);
    const finalTodaysExpense = liveExpense > 0 ? liveExpense : (Number(base?.todaysExpense ?? base?.todaysPurchase) || 0);
    const finalCustomerDue = liveCustomerDue > 0 ? liveCustomerDue : (Number(base?.customerDue) || 0);
    const finalSupplierDue = liveSupplierDue > 0 ? liveSupplierDue : (Number(base?.supplierDue) || 0);
    const finalDena = liveDena > 0 ? liveDena : (Number(base?.denaPawnaDena ?? base?.denaPawnaPabo) || 0);
    const finalPawna = livePawna > 0 ? livePawna : (Number(base?.denaPawnaPawna ?? base?.denaPawnaDibo) || 0);

    const backendCash = typeof liveCashBalance === 'number'
      ? liveCashBalance
      : (Number(base?.cashBalance) || 0);
    const backendBank = Number(base?.bankBalance) || 0;
    const backendMfs = Number(base?.mfsBalance) || 0;

    const finalCash = backendCash;
    const finalBank = liveBank > 0 ? liveBank : (backendBank !== 0 ? backendBank : liveBank);
    const finalMfs = liveMfs > 0 ? liveMfs : (backendMfs !== 0 ? backendMfs : liveMfs);

    const finalTotalBalance = finalCash + finalBank + finalMfs;
    const finalTotalReceivable = finalCustomerDue + finalPawna;
    const finalTotalPayable = finalSupplierDue + finalDena;

    return {
      todaysSale: finalTodaysSale,
      todaysPurchase: finalTodaysExpense,
      todaysExpense: finalTodaysExpense,
      customerDue: finalCustomerDue,
      supplierDue: finalSupplierDue,
      denaPawnaDena: finalDena,
      denaPawnaPawna: finalPawna,
      denaPawnaPabo: finalDena,
      denaPawnaDibo: finalPawna,
      totalReceivable: finalTotalReceivable,
      totalPayable: finalTotalPayable,
      cashBalance: finalCash,
      bankBalance: finalBank,
      mfsBalance: finalMfs,
      totalBalance: finalTotalBalance,
    };
  }, [userDashboard?.kpiData, kpiData]);

  // Active sales analysis: dynamically includes today's sales or selected range sales in daily analysis
  const activeSalesAnalysis = useMemo(() => {
    const base = userDashboard?.salesAnalysis;

    const filteredSales = (salesList || []).filter((s) => {
      if (s.isReturnRecord) return false;
      const date = s.salesDate || s.saleDate || s.sales_date || s.date || s.createdAt || s.createdDate;
      return isDateInSelectedRange(date, true);
    });

    let dailyData = base?.daily;
    const hasApiDaily = Boolean(base?.daily?.points?.length);

    if ((!hasDateFilter || !hasApiDaily) && filteredSales.length > 0) {
      const filteredTotal = filteredSales.reduce(
        (sum, s) => sum + (Number(s.grandTotal ?? s.totalAmount ?? s.paidAmount ?? 0) || 0),
        0
      );

      const points = filteredSales.map((s, idx) => {
        const timeStr = s.createdAt || s.salesDate || s.createdDate || s.date;
        const m = moment(timeStr);
        const label = hasDateFilter && m.isValid()
          ? m.format('DD MMM')
          : m.isValid()
          ? m.format('hh:mm A')
          : `Order #${s.orderNo || s.orderId || s.id || idx + 1}`;
        const amount = Number(s.grandTotal ?? s.totalAmount ?? s.paidAmount ?? 0) || 0;
        return {
          label,
          sales: amount,
          orders: 1,
        };
      });

      dailyData = {
        summary: {
          total: filteredTotal,
          average: Math.round(filteredTotal / filteredSales.length),
        },
        points,
      };
    }

    return {
      daily: dailyData || base?.daily || { summary: { total: 0, average: 0 }, points: [] },
      weekly: base?.weekly || { summary: { total: 0, average: 0 }, points: [] },
      monthly: base?.monthly || { summary: { total: 0, average: 0 }, points: [] },
    };
  }, [userDashboard?.salesAnalysis, salesList, isDateInSelectedRange, hasDateFilter]);

  // Live stock valuation computed from all products in catalog
  const liveStockValuation = useMemo(() => {
    return (allProducts || []).reduce((sum, p) => {
      const qty = Number(p.quantity ?? 0);
      const price = Number(p.buyPrice ?? p.purchasePrice ?? 0);
      return sum + qty * price;
    }, 0);
  }, [allProducts]);

  // Active asset analysis: strictly these 5 categories from the get-user-dashboard specification
  const activeAssetAnalysis = useMemo(() => {
    const base = userDashboard?.assetAnalysis;
    const baseBreakdown = Array.isArray(base?.breakdown) ? base.breakdown : [];

    const findAmount = (matchers: string[], fallback: number): number => {
      const found = baseBreakdown.find((item) => {
        const cat = String(item?.category || '').toLowerCase();
        return matchers.some((m) => cat.includes(m));
      });
      if (found && typeof found.amount === 'number' && found.amount > 0) {
        return found.amount;
      }
      return fallback;
    };

    // 1. Bank Balance
    const bankAmt = activeKpiData.bankBalance > 0
      ? activeKpiData.bankBalance
      : findAmount(['bank'], 0);

    // 2. Stock / Inventory
    const apiStock = findAmount(['stock', 'inventory'], 0);
    const stockAmt = liveStockValuation > 0
      ? liveStockValuation
      : apiStock > 0 && apiStock !== 13636046
      ? apiStock
      : 0;

    // 3. Accounts Receivable
    const receivableAmt = activeKpiData.customerDue > 0
      ? activeKpiData.customerDue
      : findAmount(['receivable', 'customer due'], 0);

    // 4. Cash in Hand
    const cashAmt = activeKpiData.cashBalance > 0
      ? activeKpiData.cashBalance
      : findAmount(['cash in hand', 'cash'], 0);

    // 5. MFS Balance
    const mfsAmt = activeKpiData.mfsBalance > 0
      ? activeKpiData.mfsBalance
      : findAmount(['mfs'], 0);

    const exact5Breakdown = [
      {
        category: 'Bank Balance',
        amount: bankAmt,
        color: '#28c76f',
      },
      {
        category: 'Stock / Inventory',
        amount: stockAmt,
        color: '#009fe3',
      },
      {
        category: 'Accounts Receivable',
        amount: receivableAmt,
        color: '#1b2850',
      },
      {
        category: 'Cash in Hand',
        amount: cashAmt,
        color: '#ff9f43',
      },
      {
        category: 'MFS Balance',
        amount: mfsAmt,
        color: '#7367f0',
      },
    ];

    const totalAsset = exact5Breakdown.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const breakdownWithPct = exact5Breakdown.map((item) => ({
      ...item,
      percentage: totalAsset > 0 ? Number(((item.amount / totalAsset) * 100).toFixed(1)) : 0,
    }));

    return {
      totalAsset,
      breakdown: breakdownWithPct,
    };
  }, [userDashboard?.assetAnalysis, activeKpiData, liveStockValuation]);

  // Active top customers: aggregates from live salesList if available
  const activeTopCustomers = useMemo(() => {
    const base = userDashboard?.topCustomers || [];
    if (!Array.isArray(salesList) || salesList.length === 0) {
      return base;
    }

    const customerMap = new Map<string, { id: string; name: string; phone: string; totalPurchases: number; ordersCount: number }>();

    salesList.forEach((s) => {
      if (s.isReturnRecord) return;
      if (hasDateFilter) {
        const date = s.salesDate || s.saleDate || s.sales_date || s.date || s.createdAt || s.createdDate;
        if (!isDateInSelectedRange(date, false)) return;
      }
      const custName = String(s.customerName || s.customer?.name || s.name || '').trim();
      const custPhone = String(s.customerPhone || s.customer?.phone || s.phone || '').trim();
      const custId = String(s.customerId || s.customer?.id || s.id || custPhone || custName);
      if (!custName && !custPhone) return;

      const amount = Number(s.grandTotal ?? s.totalAmount ?? s.paidAmount ?? 0) || 0;
      const existing = customerMap.get(custId) || {
        id: custId,
        name: custName || 'Customer',
        phone: custPhone,
        totalPurchases: 0,
        ordersCount: 0,
      };

      existing.totalPurchases += amount;
      existing.ordersCount += 1;
      customerMap.set(custId, existing);
    });

    if (customerMap.size === 0) return base;

    const liveCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.totalPurchases - a.totalPurchases)
      .slice(0, 5)
      .map((c, idx) => ({
        ...c,
        avatarColor: idx === 0 ? 'bg-[#009fe3]' : idx === 1 ? 'bg-[#28c76f]' : idx === 2 ? 'bg-[#1b2850]' : idx === 3 ? 'bg-[#ff9f43]' : 'bg-[#7367f0]',
      }));

    return liveCustomers.length > 0 ? liveCustomers : base;
  }, [userDashboard?.topCustomers, salesList, hasDateFilter, isDateInSelectedRange]);

  // Active top sale items: aggregates from live salesList if available
  const activeTopSaleItems = useMemo(() => {
    const base = userDashboard?.topSaleItems || [];
    if (!Array.isArray(salesList) || salesList.length === 0) {
      return base;
    }

    const itemMap = new Map<string, { id: string; name: string; category: string; soldQuantity: number; totalRevenue: number }>();

    salesList.forEach((s) => {
      if (s.isReturnRecord) return;
      if (hasDateFilter) {
        const date = s.salesDate || s.saleDate || s.sales_date || s.date || s.createdAt || s.createdDate;
        if (!isDateInSelectedRange(date, false)) return;
      }
      const details = Array.isArray(s.salesDetails)
        ? s.salesDetails
        : Array.isArray(s.saleDetails)
        ? s.saleDetails
        : Array.isArray(s.details)
        ? s.details
        : [];

      details.forEach((d: any) => {
        const itemId = String(d.productId || d.id || d.product_id || d.name || '');
        const name = String(d.productName || d.name || d.product_name || 'Product');
        const category = String(d.categoryName || d.category || 'General');
        const qty = Number(d.quantity ?? d.qty ?? 1) || 0;
        const total = Number(d.totalAmount ?? d.total ?? d.subTotal ?? (qty * (Number(d.unitPrice ?? d.price) || 0))) || 0;

        const existing = itemMap.get(itemId) || {
          id: itemId,
          name,
          category,
          soldQuantity: 0,
          totalRevenue: 0,
        };

        existing.soldQuantity += qty;
        existing.totalRevenue += total;
        itemMap.set(itemId, existing);
      });
    });

    if (itemMap.size === 0) return base;

    const liveItems = Array.from(itemMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 7);

    const maxRev = liveItems[0]?.totalRevenue || 1;
    const itemsWithPct = liveItems.map((item) => ({
      ...item,
      percentage: Math.round((item.totalRevenue / maxRev) * 100),
    }));

    return itemsWithPct.length > 0 ? itemsWithPct : base;
  }, [userDashboard?.topSaleItems, salesList, hasDateFilter, isDateInSelectedRange]);

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          headerTitle="Dashboard"
          headerDescription="Overview of business performance and standing balances"
        />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="w-36 sm:w-40 shrink-0 z-40">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              selectedPreset={datePreset}
              onPresetChange={setDatePreset}
              onChange={(range) => {
                setStartDate(range.startDate);
                setEndDate(range.endDate);
              }}
              align="right"
              size="sm"
              placeholder="Select date range..."
              inputClassName="!h-8 !rounded-lg !py-0"
            />
          </div>
          <RefreshButton
            onClick={handleRefresh}
            isLoading={isRefreshing}
          />
        </div>
      </div>
      <KpiCardsGrid data={activeKpiData} />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 items-stretch">
        <div className="col-span-12 lg:col-span-8 flex flex-col h-full">
          <SaleAnalysisChart data={activeSalesAnalysis} />
        </div>
        <div className="col-span-12 lg:col-span-4 flex flex-col h-full">
          <AssetAnalysisChart data={activeAssetAnalysis} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 items-stretch">
        <div className="col-span-12 lg:col-span-8 flex flex-col h-full">
          <ProfitLossChart data={userDashboard?.profitLoss} />
        </div>
        <div className="col-span-12 lg:col-span-4 flex flex-col h-full">
          <TopSaleItemsWidget data={activeTopSaleItems} />
        </div>
      </div>

      <div className="w-full">
        <TopCustomersWidget data={activeTopCustomers} />
      </div>
    </div>
  );
};

export default AdminDashboard;
import React, { useMemo } from 'react';
import moment from 'moment';
import { KpiCardsGrid } from './components/KpiCardsGrid';
import { SaleAnalysisChart } from './components/SaleAnalysisChart';
import { ProfitLossChart } from './components/ProfitLossChart';
import { AssetAnalysisChart } from './components/AssetAnalysisChart';
import { TopCustomersWidget } from './components/TopCustomersWidget';
import { TopSaleItemsWidget } from './components/TopSaleItemsWidget';
import { useCashBalanceQuery } from '@/hooks/useCashBalance';
import { useFinancialAccounts } from '@/hooks/useFinancialAccounts';
import { useSalesQuery } from '@/pages/admin/trade/sales/hooks/useSalesQueries';
import { usePurchasesQuery } from '@/pages/admin/trade/purchases/hooks/usePurchaseQueries';
import { useCustomersDueQuery } from '@/hooks/useCustomersDue';
import { usePurchasesDueQuery } from '@/hooks/usePurchasesDue';
import { useKhatabookDashboardQuery } from '@/hooks/useKhatabook';
import PageHeader from '@/components/page-header/PageHeader';
import { RefreshButton } from '@/components/common';

const AdminDashboard: React.FC = () => {
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

  const isRefreshing =
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
      refetchCash(),
      bankQuery.refetch(),
      mfsQuery.refetch(),
      refetchSales(),
      refetchPurchases(),
      refetchCustomersDue(),
      refetchPurchasesDue(),
      refetchKhatabook(),
    ]);
  };

  const kpiData = useMemo(() => {
    const isDateToday = (rawDate: any): boolean => {
      if (!rawDate) return false;
      const d = String(rawDate).trim();
      if (!d) return false;
      const todayIso = moment().format('YYYY-MM-DD');
      if (d.startsWith(todayIso)) return true;
      const m = moment(d);
      if (m.isValid() && m.isSame(moment(), 'day')) return true;
      const mCustom = moment(d, ['DD-MM-YYYY', 'DD/MM/YYYY', 'YYYY/MM/DD'], true);
      if (mCustom.isValid() && mCustom.isSame(moment(), 'day')) return true;
      return false;
    };

    // 1. Active Bank Accounts total balance
    const liveBank = registeredBankAccounts
      .filter((b) => String(b.status || '').toLowerCase() === 'active')
      .reduce(
        (sum, b) => sum + (Number(b.currentBalance ?? b.openingBalance ?? 0) || 0),
        0
      );

    // 2. Active MFS Accounts total balance
    const liveMfs = registeredMfsAccounts
      .filter((m) => String(m.status || '').toLowerCase() === 'active')
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

    // 3. Today's Sale: Sum of completed sales created/recorded today
    const todaysSale = (salesList || []).reduce((sum, s) => {
      if (s.isReturnRecord) return sum;
      const date = s.salesDate || s.saleDate || s.sales_date || s.date || s.createdAt || s.createdDate;
      if (isDateToday(date)) {
        return sum + (Number(s.grandTotal ?? s.totalAmount ?? s.paidAmount ?? 0) || 0);
      }
      return sum;
    }, 0);

    // 4. Today's Purchase: Sum of purchases created/recorded today
    const todaysPurchase = (purchaseList || []).reduce((sum, p) => {
      if (p.isReturnRecord) return sum;
      const date =
        p.purchaseDate ||
        (p as any).purchasesDate ||
        (p as any).purchase_date ||
        (p as any).date ||
        p.createdAt ||
        (p as any).createdDate;
      if (isDateToday(date)) {
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
    // Mobile App "দেনা" (Dena) = 2.69 Cr
    // Mobile App "পাওনা" (Pawna) = 3.63 Cr
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
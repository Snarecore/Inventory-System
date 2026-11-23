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
import { useFinancialTransactionsQuery } from '@/hooks/useFinanceQueries';
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

  // 4. Financial Transactions Query (for Today's Expense)
  const {
    data: expenses = [],
    refetch: refetchExpenses,
    isRefetching: isRefetchingExpenses,
  } = useFinancialTransactionsQuery({
    type: "EXPENSE",
  });

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
    isRefetchingExpenses ||
    isRefetchingDue ||
    isRefetchingPurchasesDue ||
    isFetchingKhatabook;

  const handleRefresh = async () => {
    await Promise.all([
      refetchCash(),
      bankQuery.refetch(),
      mfsQuery.refetch(),
      refetchSales(),
      refetchExpenses(),
      refetchCustomersDue(),
      refetchPurchasesDue(),
      refetchKhatabook(),
    ]);
  };

  const kpiData = useMemo(() => {
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

    // 3. Today's Sale: Sum of completed sales created today
    const todaysSale = (salesList || []).reduce((sum, s) => {
      if (s.isReturnRecord) return sum;
      const date = s.salesDate || s.saleDate || s.sales_date || s.date || s.createdAt || s.createdDate;
      if (date && moment(date).isSame(moment(), 'day')) {
        return sum + (Number(s.grandTotal ?? s.totalAmount ?? s.paidAmount ?? 0) || 0);
      }
      return sum;
    }, 0);

    // 4. Today's Expense: Sum of financial expense entries recorded today
    const todaysExpense = (expenses || []).reduce((sum, e) => {
      const date = e.transactionDate || e.date || e.createdAt || e.createdDate;
      if (date && moment(date).isSame(moment(), 'day')) {
        return sum + (Number(e.amount ?? 0) || 0);
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
      todaysExpense,
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
    expenses,
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
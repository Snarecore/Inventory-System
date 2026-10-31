import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import apiConfig from "@/config/api.json";
import {
  financialTransactionQueryKey,
  productListQueryKey,
} from "@/config/query-key";
import { useCashBalanceQuery } from "@/hooks/useCashBalance";
import { useCustomersDueQuery } from "@/hooks/useCustomersDue";
import { useFinancialAccounts } from "@/hooks/useFinancialAccounts";
import { usePurchasesDueQuery } from "@/hooks/usePurchasesDue";
import { useSalesQuery } from "@/pages/admin/trade/sales/hooks/useSalesQueries";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type { ProductItem, SaleItem } from "@/types";
import type {
  AssetAnalysisData,
  DashboardKpiData,
  TopCustomer,
  TopSaleItem,
} from "../types/dashboard.types";

type DashboardExpense = {
  amount: number;
  date: string;
};

const EMPTY_SALES: SaleItem[] = [];
const EMPTY_EXPENSES: DashboardExpense[] = [];
const EMPTY_PRODUCTS: ProductItem[] = [];

const asNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const firstArray = (raw: any, keys: string[]): any[] => {
  if (Array.isArray(raw)) return raw;
  for (const key of keys) {
    if (Array.isArray(raw?.[key])) return raw[key];
    if (Array.isArray(raw?.data?.[key])) return raw.data[key];
  }
  return Array.isArray(raw?.data) ? raw.data : [];
};

const getSaleDate = (sale: SaleItem) =>
  sale.salesDate || sale.saleDate || sale.sales_date || sale.date || sale.createdAt || sale.created_at;

const getExpenseDate = (expense: any) =>
  String(expense.transactionDate || expense.date || expense.createdAt || expense.created_at || "");

const getExpenseAmount = (expense: any) =>
  asNumber(expense.amount ?? expense.transactionAmount ?? expense.expenseAmount ?? expense.totalAmount);

const getExpenses = async (): Promise<DashboardExpense[]> => {
  const response: any = await postData({
    url: apiConfig.finance.getFinancialTransactionUrl,
    body: { accessUser: buildAccessUser() },
  });

  if (
    response?.error ||
    String(response?.status || "").toLowerCase() === "error"
  ) {
    throw new Error(response?.msg || response?.message || "Could not load financial transactions");
  }

  return firstArray(response, [
    "financialTransactionList",
    "financialTransactions",
    "transactionList",
    "transactions",
  ])
    .filter((item) =>
      String(item.type || item.transactionType || item.transaction_type || "")
        .toLowerCase()
        .includes("expense")
    )
    .map((item) => ({
      amount: getExpenseAmount(item),
      date: getExpenseDate(item),
    }));
};

const getProducts = async (): Promise<ProductItem[]> => {
  const response: any = await postData({
    url: apiConfig.productList.productListUrl,
    body: { accessUser: buildAccessUser() },
  });

  if (
    response?.error ||
    String(response?.status || "").toLowerCase() === "error"
  ) {
    throw new Error(response?.msg || response?.message || "Could not load inventory");
  }

  return firstArray(response, ["productsList", "productList"])
    .filter((product) => {
      const deleted = String(product.isDeleted || product.is_deleted || "").toUpperCase();
      return !["Y", "YES", "TRUE", "1"].includes(deleted);
    });
};

const isSameDay = (value: string | undefined, date: moment.Moment) =>
  Boolean(value && moment(value).isValid() && moment(value).isSame(date, "day"));

export const useAdminDashboardData = () => {
  const salesQuery = useSalesQuery();
  const customerDueQuery = useCustomersDueQuery();
  const supplierDueQuery = usePurchasesDueQuery();
  const cashQuery = useCashBalanceQuery();
  const accounts = useFinancialAccounts();
  const expensesQuery = useQuery({
    queryKey: [financialTransactionQueryKey],
    queryFn: getExpenses,
    staleTime: 60 * 1000,
  });
  const productsQuery = useQuery({
    queryKey: [productListQueryKey, "dashboard"],
    queryFn: getProducts,
    staleTime: 60 * 1000,
  });

  const sales = salesQuery.data || EMPTY_SALES;
  const expenses = expensesQuery.data || EMPTY_EXPENSES;
  const products = productsQuery.data || EMPTY_PRODUCTS;

  const kpis = useMemo<DashboardKpiData>(() => {
    const today = moment();
    return {
      todaysSale: sales.reduce(
        (sum, sale) =>
          sum + (isSameDay(getSaleDate(sale), today) ? asNumber(sale.grandTotal) : 0),
        0
      ),
      todaysExpense: expenses.reduce(
        (sum, expense) =>
          sum + (isSameDay(expense.date, today) ? expense.amount : 0),
        0
      ),
      totalReceivable: (customerDueQuery.data || []).reduce(
        (sum, customer) => sum + asNumber(customer.totalDue),
        0
      ),
      totalPayable: (supplierDueQuery.data || []).reduce(
        (sum, supplier) => sum + asNumber(supplier.totalDue),
        0
      ),
      cashBalance: cashQuery.data || 0,
      bankBalance: accounts.registeredBankAccounts
        .filter((account) => String(account.status || "").toLowerCase() === "active")
        .reduce((sum, account) => sum + asNumber(account.currentBalance ?? account.balance), 0),
    };
  }, [
    accounts.registeredBankAccounts,
    cashQuery.data,
    customerDueQuery.data,
    expenses,
    sales,
    supplierDueQuery.data,
  ]);

  const assets = useMemo<AssetAnalysisData>(() => {
    const stockValue = products.reduce(
      (sum, product) =>
        sum +
        asNumber(product.quantity ?? product.stock) *
          asNumber(product.buy_price ?? product.buyPrice),
      0
    );
    const breakdown = [
      { category: "Bank Balance", amount: kpis.bankBalance, color: "#28c76f", percentage: 0 },
      { category: "Stock / Inventory", amount: stockValue, color: "#009fe3", percentage: 0 },
      {
        category: "Accounts Receivable",
        amount: kpis.totalReceivable,
        color: "#1b2850",
        percentage: 0,
      },
      { category: "Cash in Hand", amount: kpis.cashBalance, color: "#ff9f43", percentage: 0 },
    ];
    const totalAsset = breakdown.reduce((sum, item) => sum + item.amount, 0);

    return {
      totalAsset,
      breakdown: breakdown.map((item) => ({
        ...item,
        percentage: totalAsset > 0 ? (item.amount / totalAsset) * 100 : 0,
      })),
    };
  }, [kpis, products]);

  const topCustomers = useMemo<TopCustomer[]>(() => {
    const customers = new Map<string, TopCustomer>();
    sales.forEach((sale) => {
      const name = String(sale.customerName || sale.customer_name || "Customer");
      const id = String(sale.customerId || sale.customer_id || name);
      const current = customers.get(id) || {
        id,
        name,
        phone: String(sale.customerPhone || sale.customer_phone || ""),
        totalPurchases: 0,
        ordersCount: 0,
        avatarColor: "",
      };
      current.totalPurchases += asNumber(sale.grandTotal);
      current.ordersCount += 1;
      customers.set(id, current);
    });
    return [...customers.values()]
      .sort((a, b) => b.totalPurchases - a.totalPurchases)
      .slice(0, 5);
  }, [sales]);

  const topSaleItems = useMemo<TopSaleItem[]>(() => {
    const items = new Map<string, TopSaleItem>();
    const inventoryById = new Map(
      products.map((product) => [
        String(product.id || product.productId || ""),
        product,
      ])
    );
    sales.forEach((sale) => {
      const details = sale.salesDetails || sale.saleDetails || sale.details || [];
      details.forEach((detail: any) => {
        const id = String(
          detail.productId ||
            detail.product_id ||
            detail.productName ||
            detail.name ||
            detail.productCode ||
            detail.pcode ||
            "unknown"
        );
        const product = inventoryById.get(id);
        const name = String(
          detail.productName || detail.name || product?.productName || product?.name || "Product"
        );
        const current = items.get(id) || {
          id,
          name,
          category: String(
            detail.categoryName ||
              detail.category ||
              product?.categoryName ||
              product?.category ||
              ""
          ),
          soldQuantity: 0,
          totalRevenue: 0,
          percentage: 0,
        };
        const quantity = asNumber(detail.quantity ?? detail.qty);
        current.soldQuantity += quantity;
        current.totalRevenue += asNumber(
          detail.total ?? quantity * asNumber(detail.sellPrice ?? detail.sell_price ?? detail.unitPrice)
        );
        items.set(id, current);
      });
    });

    const ranked = [...items.values()]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
    const topRevenue = ranked[0]?.totalRevenue || 0;
    return ranked.map((item) => ({
      ...item,
      percentage: topRevenue > 0 ? (item.totalRevenue / topRevenue) * 100 : 0,
    }));
  }, [products, sales]);

  const isLoading =
    salesQuery.isLoading ||
    customerDueQuery.isLoading ||
    supplierDueQuery.isLoading ||
    cashQuery.isLoading ||
    accounts.isLoading ||
    expensesQuery.isLoading ||
    productsQuery.isLoading;
  const hasError = expensesQuery.isError || productsQuery.isError;
  const updatedAt = Math.max(
    salesQuery.dataUpdatedAt,
    customerDueQuery.dataUpdatedAt,
    supplierDueQuery.dataUpdatedAt,
    cashQuery.dataUpdatedAt,
    accounts.bankQuery.dataUpdatedAt,
    expensesQuery.dataUpdatedAt,
    productsQuery.dataUpdatedAt
  );

  const isRefreshing =
    salesQuery.isRefetching ||
    customerDueQuery.isRefetching ||
    supplierDueQuery.isRefetching ||
    cashQuery.isRefetching ||
    accounts.bankQuery.isRefetching ||
    expensesQuery.isRefetching ||
    productsQuery.isRefetching;

  const refresh = useCallback(async () => {
    await Promise.all([
      salesQuery.refetch(),
      customerDueQuery.refetch(),
      supplierDueQuery.refetch(),
      cashQuery.refetch(),
      accounts.bankQuery.refetch(),
      expensesQuery.refetch(),
      productsQuery.refetch(),
    ]);
  }, [
    accounts.bankQuery,
    cashQuery,
    customerDueQuery,
    expensesQuery,
    productsQuery,
    salesQuery,
    supplierDueQuery,
  ]);

  return {
    assets,
    expenses,
    hasError,
    isLoading,
    isRefreshing,
    kpis,
    products,
    refresh,
    sales,
    topCustomers,
    topSaleItems,
    updatedAt,
  };
};

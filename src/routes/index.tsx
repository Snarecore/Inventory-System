import React, { Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import AdminLayout from '@/layouts/AdminLayout'
import { Login } from '@/pages/frontend/Login'
import { NotFound } from '@/pages/frontend/NotFound'
import { isSessionValid } from '@/utils/auth-storage'

// Lazy loaded Admin Pages
const Dashboard = React.lazy(() => import('@/pages/admin/main/admin-dashboard/Dashboard'))
const Products = React.lazy(() => import('@/pages/admin/inventory/product'))
const CreateProduct = React.lazy(() => import('@/pages/admin/inventory/create-product'))
const ProductDetails = React.lazy(() => import('@/pages/admin/inventory/product/components/ProductDetails'))
const ProductCategory = React.lazy(() => import('@/pages/admin/inventory/category/product-category'))
const Orders = React.lazy(() => import('@/pages/admin/orders'))
const Admins = React.lazy(() => import('@/pages/admin/people/admin'))
const Users = React.lazy(() => import('@/pages/admin/people/user'))
const Vendors = React.lazy(() => import('@/pages/admin/people/vendor'))
const Parties = React.lazy(() => import('@/pages/admin/people/parties'))
const EmployeeEntry = React.lazy(() => import('@/pages/admin/people/employee-entry'))
const EmployeeList = React.lazy(() => import('@/pages/admin/people/employee/EmployeeList'))
const RolesAndPermissions = React.lazy(() => import('@/pages/admin/roles/RolesAndPermissions'))
const HeroSlider = React.lazy(() => import('@/pages/admin/settings/home/hero-slider'))
const HomePageCms = React.lazy(() => import('@/pages/admin/settings/home/page-cms'))
const HeaderFooterCms = React.lazy(() => import('@/pages/admin/settings/header-footer-cms'))
const ContactMessage = React.lazy(() => import('@/pages/admin/settings/contact/contact-message'))
const ContactPageCms = React.lazy(() => import('@/pages/admin/settings/contact/contact-page-cms'))
const ShopPageCms = React.lazy(() => import('@/pages/admin/settings/shop-page-cms'))
const SocialLinks = React.lazy(() => import('@/pages/admin/settings/social-links'))
const AppearanceSettings = React.lazy(() => import('@/pages/admin/settings/appearance'))
const SmsSettings = React.lazy(() => import('@/pages/admin/settings/sms'))
const SendSmsPage = React.lazy(() => import('@/pages/admin/sms'))
const PrivacyPolicy = React.lazy(() => import('@/pages/admin/settings/policy/privacy'))
const TermsConditions = React.lazy(() => import('@/pages/admin/settings/policy/terms-condition'))
const ExchangePolicy = React.lazy(() => import('@/pages/admin/settings/policy/exchange-return/ExchangeForm'))
const Chat = React.lazy(() => import('@/pages/admin/chat'))
const PageMeta = React.lazy(() => import('@/pages/admin/seo'))
const Purchases = React.lazy(() => import('@/pages/admin/trade/purchases'))
const CreatePurchase = React.lazy(() => import('@/pages/admin/trade/create-purchase'))
const Sales = React.lazy(() => import('@/pages/admin/trade/sales'))
const CreateSale = React.lazy(() => import('@/pages/admin/trade/create-sale'))
const SalesReport = React.lazy(() => import('@/pages/admin/trade/sales-report'))
const PurchaseReport = React.lazy(() => import('@/pages/admin/trade/purchase-report'))
const CreateSalesReturn = React.lazy(() => import('@/pages/admin/trade/create-sales-return'))
const CreatePurchaseReturn = React.lazy(() => import('@/pages/admin/trade/purchase-return/CreatePurchaseReturnPage'))
const CustomerCollection = React.lazy(() => import('@/pages/admin/trade/customer-collection'))
const SupplierPayment = React.lazy(() => import('@/pages/admin/trade/supplier-payment'))
const Company = React.lazy(() => import('@/pages/admin/company'))
const Profile = React.lazy(() => import('@/pages/admin/profile'))
const FinancialCategory = React.lazy(() => import('@/pages/admin/finance/category'))
const BankPage = React.lazy(() => import('@/pages/admin/finance/bank'))
const CreateBankPage = React.lazy(() => import('@/pages/admin/finance/bank/create-bank'))
const MfsPage = React.lazy(() => import('@/pages/admin/finance/mfs'))
const CreateMfsPage = React.lazy(() => import('@/pages/admin/finance/mfs/create-mfs'))
const ExpensePage = React.lazy(() => import('@/pages/admin/finance/expense'))
const IncomePage = React.lazy(() => import('@/pages/admin/finance/income'))
const FundTransferPage = React.lazy(() => import('@/pages/admin/finance/fund-transfer'))
const KhatabookPage = React.lazy(() => import('@/pages/admin/khatabook'))
const StockAdjustmentPage = React.lazy(() => import('@/pages/admin/inventory/stock-adjustment'))
const InventoryReport = React.lazy(() => import('@/pages/admin/inventory/inventory-report'))
const CashClosingPage = React.lazy(() => import('@/pages/admin/finance/cash-closing'))
const CashClosingReport = React.lazy(() => import('@/pages/admin/finance/cash-closing-report'))
const OpeningCashBalancePage = React.lazy(() => import('@/pages/admin/finance/opening-cash-balance'))
const PackagesPage = React.lazy(() => import('@/pages/admin/packages'))
const BranchList = React.lazy(() => import('@/pages/admin/branch/BranchList'))
const AddBranch = React.lazy(() => import('@/pages/admin/branch/AddBranch'))


import { usePermission } from '@/hooks/usePermission'
import type { CrudAction } from '@/utils/permission-utils'

const withSuspense = (Component: React.ComponentType) => (
  <Suspense
    fallback={
      <div className="flex h-64 w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    }
  >
    <Component />
  </Suspense>
);

const PermissionGuardedRoute: React.FC<{
  module: string;
  action?: CrudAction;
  children: React.ReactNode;
}> = ({ module, action = "read", children }) => {
  const { can, isAdmin } = usePermission();
  if (isAdmin || can(action, module)) {
    return <>{children}</>;
  }
  return <Navigate to="/admin" replace />;
};

const withPermission = (
  Component: React.ComponentType,
  module: string,
  action: CrudAction = "read"
) => (
  <PermissionGuardedRoute module={module} action={action}>
    {withSuspense(Component)}
  </PermissionGuardedRoute>
);

const RequireAuth = () => {
  const location = useLocation()

  if (!isSessionValid()) {
    const requestedUrl = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/?redirect=${encodeURIComponent(requestedUrl)}`} replace />
  }

  return <Outlet />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Login />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/404',
    element: <Navigate to="/admin/404" replace />,
  },
  {
    element: <RequireAuth />,
    children: [
  {
    path: '/customers',
    element: <Navigate to="/admin/parties?type=CUSTOMER" replace />,
  },
  {
    path: '/suppliers',
    element: <Navigate to="/admin/parties?type=SUPPLIER" replace />,
  },
  {
    path: '/parties',
    element: <Navigate to="/admin/parties" replace />,
  },
  {
    path: '/khatabook',
    element: <Navigate to="/admin/khatabook" replace />,
  },
  {
    path: '/ledger',
    element: <Navigate to="/admin/khatabook" replace />,
  },
  {
    path: '/packages',
    element: <Navigate to="/admin/packages" replace />,
  },
  {
    path: '/branches',
    element: <Navigate to="/admin/branches" replace />,
  },
  {
    path: '/branches/add',
    element: <Navigate to="/admin/branches/add" replace />,
  },
  {
    path: '/roles',
    element: <Navigate to="/admin/roles" replace />,
  },
  {
    path: '/pricing',
    element: <Navigate to="/admin/packages" replace />,
  },
  {
    path: '/subscription',
    element: <Navigate to="/admin/packages" replace />,
  },
  {
    path: '/inventory',
    element: <Navigate to="/admin/inventory/adjustment" replace />,
  },
  {
    path: '/inventory/overview',
    element: <Navigate to="/admin/inventory/adjustment" replace />,
  },
  {
    path: '/inventory/adjustment',
    element: <Navigate to="/admin/inventory/adjustment" replace />,
  },
  {
    path: '/stock-adjustment',
    element: <Navigate to="/admin/inventory/adjustment" replace />,
  },
  {
    path: '/purchases',
    element: <Navigate to="/admin/purchases" replace />,
  },
  {
    path: '/sales',
    element: <Navigate to="/admin/sales" replace />,
  },
  {
    path: '/sales/invoices',
    element: <Navigate to="/admin/sales" replace />,
  },
  {
    path: '/sales/create',
    element: <Navigate to="/admin/create-sale" replace />,
  },
  {
    path: '/reports',
    element: <Navigate to="/admin/reports/sales" replace />,
  },
  {
    path: '/reports/sales',
    element: <Navigate to="/admin/reports/sales" replace />,
  },
  {
    path: '/sales/reports',
    element: <Navigate to="/admin/reports/sales" replace />,
  },
  {
    path: '/reports/purchase',
    element: <Navigate to="/admin/reports/purchase" replace />,
  },
  {
    path: '/purchase/reports',
    element: <Navigate to="/admin/reports/purchase" replace />,
  },
  {
    path: '/purchases/reports',
    element: <Navigate to="/admin/reports/purchase" replace />,
  },
  {
    path: '/reports/cash-closing',
    element: <Navigate to="/admin/reports/cash-closing" replace />,
  },
  {
    path: '/cash-closing-report',
    element: <Navigate to="/admin/reports/cash-closing" replace />,
  },
  {
    path: '/reports/inventory',
    element: <Navigate to="/admin/reports/inventory" replace />,
  },
  {
    path: '/reports/products',
    element: <Navigate to="/admin/reports/inventory" replace />,
  },
  {
    path: '/inventory-report',
    element: <Navigate to="/admin/reports/inventory" replace />,
  },
  {
    path: '/product-report',
    element: <Navigate to="/admin/reports/inventory" replace />,
  },
  {
    path: '/sales/collection',
    element: <Navigate to="/admin/customer-collection" replace />,
  },
  {
    path: '/customer-collection',
    element: <Navigate to="/admin/customer-collection" replace />,
  },
  {
    path: '/collection',
    element: <Navigate to="/admin/customer-collection" replace />,
  },
  {
    path: '/sales/quotations',
    element: <Navigate to="/admin/sales" replace />,
  },
  {
    path: '/sales/orders',
    element: <Navigate to="/admin/sales" replace />,
  },
  {
    path: '/sales/delivery-challans',
    element: <Navigate to="/admin/sales" replace />,
  },
  {
    path: '/sales/returns',
    element: <Navigate to="/admin/sales-return" replace />,
  },
  {
    path: '/sales/payments',
    element: <Navigate to="/admin/parties?type=CUSTOMER" replace />,
  },
  {
    path: '/purchase/orders',
    element: <Navigate to="/admin/purchases" replace />,
  },
  {
    path: '/purchase/invoices',
    element: <Navigate to="/admin/purchases" replace />,
  },
  {
    path: '/purchase/requisitions',
    element: <Navigate to="/admin/purchases" replace />,
  },
  {
    path: '/purchase/returns',
    element: <Navigate to="/admin/purchase-return" replace />,
  },
  {
    path: '/purchases/returns',
    element: <Navigate to="/admin/purchase-return" replace />,
  },
  {
    path: '/purchase/payments',
    element: <Navigate to="/admin/supplier-payment" replace />,
  },
  {
    path: '/purchases/payments',
    element: <Navigate to="/admin/supplier-payment" replace />,
  },
  {
    path: '/supplier-payment',
    element: <Navigate to="/admin/supplier-payment" replace />,
  },
  {
    path: '/payment',
    element: <Navigate to="/admin/supplier-payment" replace />,
  },
  {
    path: '/expenses/categories',
    element: <Navigate to="/admin/financial-categories" replace />,
  },
  {
    path: '/expense',
    element: <Navigate to="/admin/expense" replace />,
  },
  {
    path: '/expenses',
    element: <Navigate to="/admin/expense" replace />,
  },
  {
    path: '/expenses/entry',
    element: <Navigate to="/admin/expense" replace />,
  },
  {
    path: '/income',
    element: <Navigate to="/admin/income" replace />,
  },
  {
    path: '/incomes',
    element: <Navigate to="/admin/income" replace />,
  },
  {
    path: '/fund-transfer',
    element: <Navigate to="/admin/fund-transfer" replace />,
  },
  {
    path: '/finance/categories',
    element: <Navigate to="/admin/financial-categories" replace />,
  },
  {
    path: '/category',
    element: <Navigate to="/admin/financial-categories" replace />,
  },
  {
    path: '/banks',
    element: <Navigate to="/admin/banks" replace />,
  },
  {
    path: '/bank-accounts',
    element: <Navigate to="/admin/banks" replace />,
  },
  {
    path: '/create-bank',
    element: <Navigate to="/admin/create-bank" replace />,
  },
  {
    path: '/add-bank',
    element: <Navigate to="/admin/create-bank" replace />,
  },
  {
    path: '/accounts/cash-bank',
    element: <Navigate to="/admin/banks" replace />,
  },
  {
    path: '/accounts/opening-cash-balance',
    element: <Navigate to="/admin/opening-cash-balance" replace />,
  },
  {
    path: '/accounts/chart-of-accounts',
    element: <Navigate to="/admin/banks" replace />,
  },
  {
    path: '/mfs',
    element: <Navigate to="/admin/mfs" replace />,
  },
  {
    path: '/mfs-list',
    element: <Navigate to="/admin/mfs" replace />,
  },
  {
    path: '/create-mfs',
    element: <Navigate to="/admin/create-mfs" replace />,
  },
  {
    path: '/add-mfs',
    element: <Navigate to="/admin/create-mfs" replace />,
  },
  {
    path: '/company',
    element: <Navigate to="/admin/company" replace />,
  },
  {
    path: '/profile',
    element: <Navigate to="/admin/profile" replace />,
  },
  {
    path: '/my-profile',
    element: <Navigate to="/admin/profile" replace />,
  },
  {
    path: '/business-profile',
    element: <Navigate to="/admin/company" replace />,
  },
  {
    path: '/administration',
    element: <Navigate to="/admin/company" replace />,
  },
  {
    path: '/settings',
    element: <Navigate to="/admin/company" replace />,
  },
  {
    path: '/settings/business-profile',
    element: <Navigate to="/admin/company" replace />,
  },
  {
    path: '/settings/sms',
    element: <Navigate to="/admin/settings/sms" replace />,
  },
  {
    path: '/settings/roles',
    element: <Navigate to="/admin/settings/roles" replace />,
  },

  // Admin Protected / Management Routes
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: withSuspense(Dashboard),
      },
      {
        path: 'dashboard',
        element: <Navigate to="/admin" replace />,
      },
      {
        path: 'products',
        element: withPermission(Products, 'product'),
      },
      {
        path: 'create-product',
        element: withPermission(CreateProduct, 'product', 'create'),
      },
      {
        path: 'edit-product/:id',
        element: withPermission(CreateProduct, 'product', 'update'),
      },
      {
        path: 'products/:id',
        element: withPermission(ProductDetails, 'product'),
      },
      {
        path: 'inventory',
        element: <Navigate to="/admin/inventory/adjustment" replace />,
      },
      {
        path: 'inventory/overview',
        element: <Navigate to="/admin/inventory/adjustment" replace />,
      },
      {
        path: 'inventory/adjustment',
        element: withPermission(StockAdjustmentPage, 'stock_adjustment'),
      },
      {
        path: 'stock-adjustment',
        element: withPermission(StockAdjustmentPage, 'stock_adjustment'),
      },
      {
        path: 'product-category',
        element: withPermission(ProductCategory, 'category_product'),
      },
      {
        path: 'product-categories',
        element: withPermission(ProductCategory, 'category_product'),
      },
      {
        path: 'orders',
        element: withSuspense(Orders),
      },
      {
        path: 'admins',
        element: withPermission(Admins, 'administration'),
      },
      {
        path: 'users',
        element: withPermission(Users, 'administration'),
      },
      {
        path: 'vendors',
        element: withPermission(Vendors, 'parties'),
      },
      {
        path: 'parties',
        element: withPermission(Parties, 'parties'),
      },
      {
        path: 'employee-entry',
        element: withPermission(EmployeeEntry, 'employee', 'create'),
      },
      {
        path: 'employees',
        element: withPermission(EmployeeList, 'employee'),
      },
      {
        path: 'roles',
        element: withPermission(RolesAndPermissions, 'role_management'),
      },
      {
        path: 'purchases',
        element: withPermission(Purchases, 'purchase'),
      },
      {
        path: 'create-purchase',
        element: withPermission(CreatePurchase, 'purchase', 'create'),
      },
      {
        path: 'edit-purchase/:id',
        element: withPermission(CreatePurchase, 'purchase', 'update'),
      },
      {
        path: 'sales',
        element: withPermission(Sales, 'sales'),
      },
      {
        path: 'create-sale',
        element: withPermission(CreateSale, 'sales', 'create'),
      },
      {
        path: 'edit-sale/:id',
        element: withPermission(CreateSale, 'sales', 'update'),
      },
      {
        path: 'sales-report',
        element: withPermission(SalesReport, 'reports'),
      },
      {
        path: 'reports/sales',
        element: withPermission(SalesReport, 'reports'),
      },
      {
        path: 'purchase-report',
        element: withPermission(PurchaseReport, 'reports'),
      },
      {
        path: 'reports/purchase',
        element: withPermission(PurchaseReport, 'reports'),
      },
      {
        path: 'cash-closing-report',
        element: withPermission(CashClosingReport, 'reports'),
      },
      {
        path: 'reports/cash-closing',
        element: withPermission(CashClosingReport, 'reports'),
      },
      {
        path: 'inventory-report',
        element: withPermission(InventoryReport, 'reports'),
      },
      {
        path: 'product-report',
        element: withPermission(InventoryReport, 'reports'),
      },
      {
        path: 'reports/inventory',
        element: withPermission(InventoryReport, 'reports'),
      },
      {
        path: 'sales-return',
        element: withPermission(Sales, 'sales_return'),
      },
      {
        path: 'sales-return-sales',
        element: <Navigate to="/admin/sales" replace />,
      },
      {
        path: 'create-sales-return',
        element: withPermission(CreateSalesReturn, 'sales_return', 'create'),
      },
      {
        path: 'purchase-return',
        element: withPermission(Purchases, 'purchase_return'),
      },
      {
        path: 'purchase-return-purchases',
        element: <Navigate to="/admin/purchases" replace />,
      },
      {
        path: 'create-purchase-return',
        element: withPermission(CreatePurchaseReturn, 'purchase_return', 'create'),
      },
      {
        path: 'customer-collection',
        element: withPermission(CustomerCollection, 'customer_collection'),
      },
      {
        path: 'collection',
        element: <Navigate to="/admin/customer-collection" replace />,
      },
      {
        path: 'supplier-payment',
        element: withPermission(SupplierPayment, 'supplier_payment'),
      },
      {
        path: 'payment',
        element: <Navigate to="/admin/supplier-payment" replace />,
      },
      {
        path: 'financial-categories',
        element: withPermission(FinancialCategory, 'category_finance'),
      },
      {
        path: 'categories',
        element: withPermission(FinancialCategory, 'category_finance'),
      },
      {
        path: 'expense-categories',
        element: withPermission(FinancialCategory, 'category_finance'),
      },
      {
        path: 'expense',
        element: withPermission(ExpensePage, 'expense'),
      },
      {
        path: 'expenses',
        element: <Navigate to="/admin/expense" replace />,
      },
      {
        path: 'income',
        element: withPermission(IncomePage, 'income'),
      },
      {
        path: 'incomes',
        element: <Navigate to="/admin/income" replace />,
      },
      {
        path: 'fund-transfer',
        element: withPermission(FundTransferPage, 'fund_transfer'),
      },
      {
        path: 'khatabook',
        element: withPermission(KhatabookPage, 'khatabook'),
      },
      {
        path: 'cash-closing',
        element: withPermission(CashClosingPage, 'cash_closing'),
      },
      {
        path: 'daily-cash-closing',
        element: withPermission(CashClosingPage, 'cash_closing'),
      },
      {
        path: 'opening-cash-balance',
        element: withPermission(OpeningCashBalancePage, 'opening_cash'),
      },
      {
        path: 'ledger',
        element: <Navigate to="/admin/khatabook" replace />,
      },
      {
        path: 'khata',
        element: <Navigate to="/admin/khatabook" replace />,
      },
      {
        path: 'banks',
        element: withPermission(BankPage, 'bank'),
      },
      {
        path: 'bank-accounts',
        element: withPermission(BankPage, 'bank'),
      },
      {
        path: 'cash-bank',
        element: withPermission(BankPage, 'bank'),
      },
      {
        path: 'create-bank',
        element: withPermission(CreateBankPage, 'bank', 'create'),
      },
      {
        path: 'banks/create',
        element: withPermission(CreateBankPage, 'bank', 'create'),
      },
      {
        path: 'add-bank',
        element: withPermission(CreateBankPage, 'bank', 'create'),
      },
      {
        path: 'edit-bank/:id',
        element: withPermission(CreateBankPage, 'bank', 'update'),
      },
      {
        path: 'banks/edit/:id',
        element: withPermission(CreateBankPage, 'bank', 'update'),
      },
      {
        path: 'mfs',
        element: withPermission(MfsPage, 'mfs'),
      },
      {
        path: 'mfs-list',
        element: withPermission(MfsPage, 'mfs'),
      },
      {
        path: 'create-mfs',
        element: withPermission(CreateMfsPage, 'mfs', 'create'),
      },
      {
        path: 'add-mfs',
        element: withPermission(CreateMfsPage, 'mfs', 'create'),
      },
      {
        path: 'edit-mfs/:id',
        element: withPermission(CreateMfsPage, 'mfs', 'update'),
      },
      {
        path: 'mfs/edit/:id',
        element: withPermission(CreateMfsPage, 'mfs', 'update'),
      },
      {
        path: 'customers',
        element: <Navigate to="/admin/parties?type=CUSTOMER" replace />,
      },
      {
        path: 'suppliers',
        element: <Navigate to="/admin/parties?type=SUPPLIER" replace />,
      },
      {
        path: 'hero-slider',
        element: withSuspense(HeroSlider),
      },
      {
        path: 'home-page-cms',
        element: withPermission(HomePageCms, 'website_cms', 'update'),
      },
      {
        path: 'header-footer-cms',
        element: withPermission(HeaderFooterCms, 'website_cms', 'update'),
      },
      {
        path: 'contact-message',
        element: withSuspense(ContactMessage),
      },
      {
        path: 'contact-page-cms',
        element: withPermission(ContactPageCms, 'website_cms', 'update'),
      },
      {
        path: 'shop-page-cms',
        element: withPermission(ShopPageCms, 'website_cms', 'update'),
      },
      {
        path: 'social-link',
        element: withSuspense(SocialLinks),
      },
      {
        path: 'settings/appearance',
        element: withPermission(AppearanceSettings, 'appearance', 'update'),
      },
      {
        path: 'settings/sms',
        element: withPermission(SmsSettings, 'sms'),
      },
      {
        path: 'settings/roles',
        element: withPermission(RolesAndPermissions, 'role_management'),
      },
      {
        path: 'sms',
        element: withPermission(SendSmsPage, 'sms'),
      },
      {
        path: 'sms/send',
        element: withPermission(SendSmsPage, 'sms', 'create'),
      },
      {
        path: 'privacy-policy',
        element: withSuspense(PrivacyPolicy),
      },
      {
        path: 'terms-conditions',
        element: withSuspense(TermsConditions),
      },
      {
        path: 'exchange-policy',
        element: withSuspense(ExchangePolicy),
      },
      {
        path: 'chat',
        element: withSuspense(Chat),
      },
      {
        path: 'page-meta',
        element: withSuspense(PageMeta),
      },
      {
        path: 'company',
        element: withPermission(Company, 'business_profile', 'update'),
      },
      {
        path: 'branches',
        element: withPermission(BranchList, 'branch_management'),
      },
      {
        path: 'branches/add',
        element: withPermission(AddBranch, 'branch_management', 'create'),
      },
      {
        path: 'branches/edit/:id',
        element: withPermission(AddBranch, 'branch_management', 'update'),
      },
      {
        path: 'packages',
        element: withPermission(PackagesPage, 'subscription_packages'),
      },
      {
        path: 'pricing',
        element: <Navigate to="/admin/packages" replace />,
      },
      {
        path: 'subscription',
        element: <Navigate to="/admin/packages" replace />,
      },
      {
        path: 'profile',
        element: withSuspense(Profile),
      },
      {
        path: 'my-profile',
        element: <Navigate to="/admin/profile" replace />,
      },
      {
        path: 'user-profile',
        element: <Navigate to="/admin/profile" replace />,
      },
      {
        path: 'business-profile',
        element: <Navigate to="/admin/company" replace />,
      },
      {
        path: 'administration',
        element: <Navigate to="/admin/company" replace />,
      },
      {
        path: '404',
        element: <NotFound returnTo="/admin" returnLabel="Back to Dashboard" />,
      },
      {
        path: 'not-found',
        element: <Navigate to="/admin/404" replace />,
      },
      {
        path: '*',
        element: <Navigate to="/admin/404" replace />,
      },
    ],
  },

  // Fallback route
  {
    path: '*',
    element: <Navigate to="/admin/404" replace />,
  },
    ],
  },
])

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
const MainCategory = React.lazy(() => import('@/pages/admin/inventory/category/main-category'))
const FirstCategory = React.lazy(() => import('@/pages/admin/inventory/category/first-category'))
const SecondCategory = React.lazy(() => import('@/pages/admin/inventory/category/second-category'))
const ThirdCategory = React.lazy(() => import('@/pages/admin/inventory/category/third-category'))
const Orders = React.lazy(() => import('@/pages/admin/orders'))
const Admins = React.lazy(() => import('@/pages/admin/people/admin'))
const Users = React.lazy(() => import('@/pages/admin/people/user'))
const Vendors = React.lazy(() => import('@/pages/admin/people/vendor'))
const Parties = React.lazy(() => import('@/pages/admin/people/parties'))
const EmployeeEntry = React.lazy(() => import('@/pages/admin/people/employee-entry'))
const HeroSlider = React.lazy(() => import('@/pages/admin/settings/home/hero-slider'))
const HomePageCms = React.lazy(() => import('@/pages/admin/settings/home/page-cms'))
const HeaderFooterCms = React.lazy(() => import('@/pages/admin/settings/header-footer-cms'))
const ContactMessage = React.lazy(() => import('@/pages/admin/settings/contact/contact-message'))
const ContactPageCms = React.lazy(() => import('@/pages/admin/settings/contact/contact-page-cms'))
const ShopPageCms = React.lazy(() => import('@/pages/admin/settings/shop-page-cms'))
const SocialLinks = React.lazy(() => import('@/pages/admin/settings/social-links'))
const AppearanceSettings = React.lazy(() => import('@/pages/admin/settings/appearance'))
const PrivacyPolicy = React.lazy(() => import('@/pages/admin/settings/policy/privacy'))
const TermsConditions = React.lazy(() => import('@/pages/admin/settings/policy/terms-condition'))
const ExchangePolicy = React.lazy(() => import('@/pages/admin/settings/policy/exchange-return/ExchangeForm'))
const Chat = React.lazy(() => import('@/pages/admin/chat'))
const PageMeta = React.lazy(() => import('@/pages/admin/seo'))
const Blogs = React.lazy(() => import('@/pages/admin/blog'))
const BlogCreation = React.lazy(() => import('@/pages/admin/blog-creation'))
const Purchases = React.lazy(() => import('@/pages/admin/trade/purchases'))
const CreatePurchase = React.lazy(() => import('@/pages/admin/trade/create-purchase'))
const Sales = React.lazy(() => import('@/pages/admin/trade/sales'))
const CreateSale = React.lazy(() => import('@/pages/admin/trade/create-sale'))
const SalesReport = React.lazy(() => import('@/pages/admin/trade/sales-report'))
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
        element: withSuspense(Products),
      },
      {
        path: 'create-product',
        element: withSuspense(CreateProduct),
      },
      {
        path: 'edit-product/:id',
        element: withSuspense(CreateProduct),
      },
      {
        path: 'products/:id',
        element: withSuspense(ProductDetails),
      },
      {
        path: 'main-category',
        element: withSuspense(MainCategory),
      },
      {
        path: 'product-category',
        element: withSuspense(MainCategory),
      },
      {
        path: 'product-categories',
        element: withSuspense(MainCategory),
      },
      {
        path: 'first-category',
        element: withSuspense(FirstCategory),
      },
      {
        path: 'second-category',
        element: withSuspense(SecondCategory),
      },
      {
        path: 'third-category',
        element: withSuspense(ThirdCategory),
      },
      {
        path: 'orders',
        element: withSuspense(Orders),
      },
      {
        path: 'admins',
        element: withSuspense(Admins),
      },
      {
        path: 'users',
        element: withSuspense(Users),
      },
      {
        path: 'vendors',
        element: withSuspense(Vendors),
      },
      {
        path: 'parties',
        element: withSuspense(Parties),
      },
      {
        path: 'employee-entry',
        element: withSuspense(EmployeeEntry),
      },
      {
        path: 'purchases',
        element: withSuspense(Purchases),
      },
      {
        path: 'create-purchase',
        element: withSuspense(CreatePurchase),
      },
      {
        path: 'edit-purchase/:id',
        element: withSuspense(CreatePurchase),
      },
      {
        path: 'sales',
        element: withSuspense(Sales),
      },
      {
        path: 'create-sale',
        element: withSuspense(CreateSale),
      },
      {
        path: 'edit-sale/:id',
        element: withSuspense(CreateSale),
      },
      {
        path: 'sales-report',
        element: withSuspense(SalesReport),
      },
      {
        path: 'reports/sales',
        element: withSuspense(SalesReport),
      },
      {
        path: 'sales-return',
        element: withSuspense(Sales),
      },
      {
        path: 'sales-return-sales',
        element: <Navigate to="/admin/sales" replace />,
      },
      {
        path: 'create-sales-return',
        element: withSuspense(CreateSalesReturn),
      },
      {
        path: 'purchase-return',
        element: withSuspense(Purchases),
      },
      {
        path: 'purchase-return-purchases',
        element: <Navigate to="/admin/purchases" replace />,
      },
      {
        path: 'create-purchase-return',
        element: withSuspense(CreatePurchaseReturn),
      },
      {
        path: 'customer-collection',
        element: withSuspense(CustomerCollection),
      },
      {
        path: 'collection',
        element: <Navigate to="/admin/customer-collection" replace />,
      },
      {
        path: 'supplier-payment',
        element: withSuspense(SupplierPayment),
      },
      {
        path: 'payment',
        element: <Navigate to="/admin/supplier-payment" replace />,
      },
      {
        path: 'financial-categories',
        element: withSuspense(FinancialCategory),
      },
      {
        path: 'categories',
        element: withSuspense(FinancialCategory),
      },
      {
        path: 'expense-categories',
        element: withSuspense(FinancialCategory),
      },
      {
        path: 'expense',
        element: withSuspense(ExpensePage),
      },
      {
        path: 'expenses',
        element: <Navigate to="/admin/expense" replace />,
      },
      {
        path: 'income',
        element: withSuspense(IncomePage),
      },
      {
        path: 'incomes',
        element: <Navigate to="/admin/income" replace />,
      },
      {
        path: 'fund-transfer',
        element: withSuspense(FundTransferPage),
      },
      {
        path: 'khatabook',
        element: withSuspense(KhatabookPage),
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
        element: withSuspense(BankPage),
      },
      {
        path: 'bank-accounts',
        element: withSuspense(BankPage),
      },
      {
        path: 'cash-bank',
        element: withSuspense(BankPage),
      },
      {
        path: 'create-bank',
        element: withSuspense(CreateBankPage),
      },
      {
        path: 'banks/create',
        element: withSuspense(CreateBankPage),
      },
      {
        path: 'add-bank',
        element: withSuspense(CreateBankPage),
      },
      {
        path: 'edit-bank/:id',
        element: withSuspense(CreateBankPage),
      },
      {
        path: 'banks/edit/:id',
        element: withSuspense(CreateBankPage),
      },
      {
        path: 'mfs',
        element: withSuspense(MfsPage),
      },
      {
        path: 'mfs-list',
        element: withSuspense(MfsPage),
      },
      {
        path: 'create-mfs',
        element: withSuspense(CreateMfsPage),
      },
      {
        path: 'add-mfs',
        element: withSuspense(CreateMfsPage),
      },
      {
        path: 'edit-mfs/:id',
        element: withSuspense(CreateMfsPage),
      },
      {
        path: 'mfs/edit/:id',
        element: withSuspense(CreateMfsPage),
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
        element: withSuspense(HomePageCms),
      },
      {
        path: 'header-footer-cms',
        element: withSuspense(HeaderFooterCms),
      },
      {
        path: 'contact-message',
        element: withSuspense(ContactMessage),
      },
      {
        path: 'contact-page-cms',
        element: withSuspense(ContactPageCms),
      },
      {
        path: 'shop-page-cms',
        element: withSuspense(ShopPageCms),
      },
      {
        path: 'social-link',
        element: withSuspense(SocialLinks),
      },
      {
        path: 'settings/appearance',
        element: withSuspense(AppearanceSettings),
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
        path: 'blogs',
        element: withSuspense(Blogs),
      },
      {
        path: 'create-blog',
        element: withSuspense(BlogCreation),
      },
      {
        path: 'company',
        element: withSuspense(Company),
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

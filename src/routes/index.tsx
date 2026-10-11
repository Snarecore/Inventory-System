import React, { Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import AdminLayout from '@/layouts/AdminLayout'
import { Home } from '@/pages/frontend/Home'
import { Login } from '@/pages/frontend/Login'
import { NotFound } from '@/pages/frontend/NotFound'

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
const HeroSlider = React.lazy(() => import('@/pages/admin/settings/home/hero-slider'))
const HomePageCms = React.lazy(() => import('@/pages/admin/settings/home/page-cms'))
const HeaderFooterCms = React.lazy(() => import('@/pages/admin/settings/header-footer-cms'))
const ContactMessage = React.lazy(() => import('@/pages/admin/settings/contact/contact-message'))
const ContactPageCms = React.lazy(() => import('@/pages/admin/settings/contact/contact-page-cms'))
const ShopPageCms = React.lazy(() => import('@/pages/admin/settings/shop-page-cms'))
const SocialLinks = React.lazy(() => import('@/pages/admin/settings/social-links'))
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
const SalesReturn = React.lazy(() => import('@/pages/admin/trade/sales-return'))
const CreateSalesReturn = React.lazy(() => import('@/pages/admin/trade/create-sales-return'))


const LoadingFallback = () => (
  <div className="flex h-64 w-full items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
  </div>
)

const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<LoadingFallback />}>
    <Component />
  </Suspense>
)

export const router = createBrowserRouter([
  // Public Frontend Routes
  {
    path: '/login',
    element: <Login />,
  },
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
    path: '/sales/reports',
    element: <Navigate to="/admin/sales-report" replace />,
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
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: '404',
        element: <NotFound />,
      },
    ],
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
        path: 'sales-return',
        element: withSuspense(SalesReturn),
      },
      {
        path: 'create-sales-return',
        element: withSuspense(CreateSalesReturn),
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
    ],
  },

  // Fallback route
  {
    path: '*',
    element: <Navigate to="/404" replace />,
  },
])



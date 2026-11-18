import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import {
  Home,
  ArrowLeft,
  RefreshCw,
  ShoppingBag,
  Package,
  BookOpen,
  LayoutDashboard,
  Compass,
  ShieldCheck,
} from 'lucide-react';

interface NotFoundProps {
  returnTo?: string;
  returnLabel?: string;
  showQuickLinks?: boolean;
}

export const NotFound: React.FC<NotFoundProps> = ({
  returnTo = '/admin',
  returnLabel = 'ড্যাশবোর্ডে ফিরে যান',
  showQuickLinks = true,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const quickLinks = [
    {
      title: 'ড্যাশবোর্ড',
      subtitle: 'ব্যবসার সার্বিক চিত্র ও রিপোর্ট',
      path: '/admin',
      icon: <LayoutDashboard className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      bg: 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/40',
    },
    {
      title: 'বিক্রয় ও অর্ডার',
      subtitle: 'বিক্রয় তালিকা ও নতুন ইনভয়েস',
      path: '/admin/sales',
      icon: <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      bg: 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40',
    },
    {
      title: 'পণ্য ও ইনভেন্টরি',
      subtitle: 'স্টক আপডেট ও পণ্য তালিকা',
      path: '/admin/products',
      icon: <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      bg: 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/40',
    },
    {
      title: 'খতিয়ান ও হিসাব',
      subtitle: 'কাস্টমার বকেয়া ও কালেকশন',
      path: '/admin/khatabook',
      icon: <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      bg: 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40',
    },
  ];

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[75vh] w-full py-12 px-4 select-none overflow-hidden text-center">
      {/* Decorative Ambient Background Gradients */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[var(--primary-color,#01306B)]/5 dark:bg-[var(--primary-color,#01306B)]/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#009fe3]/8 dark:bg-[#009fe3]/15 blur-3xl"
      />

      <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto space-y-6">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900/50 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>Error 404 • পৃষ্ঠাটি খুঁজে পাওয়া যায়নি</span>
        </div>

        {/* Artistic 404 Display */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 my-2">
          <span className="text-7xl sm:text-9xl font-black tracking-tight text-[var(--ui-text,#0f172a)] dark:text-white drop-shadow-xs">
            4
          </span>
          <div className="relative flex items-center justify-center w-16 h-16 sm:w-24 sm:h-24 rounded-3xl bg-linear-to-tr from-[var(--primary-color,#01306B)] to-[#009fe3] text-white shadow-lg shadow-blue-500/20 transform hover:scale-105 transition-transform duration-300">
            <Compass className="w-9 h-9 sm:w-14 sm:h-14 animate-[spin_12s_linear_infinite]" />
            <div className="absolute inset-0 rounded-3xl ring-2 ring-white/20" />
          </div>
          <span className="text-7xl sm:text-9xl font-black tracking-tight text-[var(--ui-text,#0f172a)] dark:text-white drop-shadow-xs">
            4
          </span>
        </div>

        {/* Headline & Description */}
        <div className="space-y-3 px-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--ui-text,#0f172a)] dark:text-white tracking-tight">
            আপনি যে পৃষ্ঠাটি খুঁজছেন তা পাওয়া যায়নি
          </h1>
          <p className="text-sm sm:text-base text-[var(--ui-text-muted,#475569)] dark:text-[var(--ui-text-subtle,#94a3b8)] max-w-lg mx-auto leading-relaxed">
            লিঙ্কটিতে কোনো ভুল থাকতে পারে অথবা পৃষ্ঠাটি অন্য কোনো ঠিকানায় সরানো হয়েছে। নিচের বাটন চেপে দ্রুত সঠিক ঠিকানায় ফিরে যান।
          </p>

          {/* Requested Path Badge */}
          {location?.pathname && location.pathname !== '/admin/404' && (
            <div className="pt-1">
              <span className="inline-block text-xs font-mono px-2.5 py-1 rounded-md bg-[var(--ui-surface-sunken,#eef2f7)] dark:bg-slate-800 text-[var(--ui-text-muted,#475569)] dark:text-slate-300 border border-[var(--ui-border,#e2e8f0)] dark:border-slate-700">
                অনুরোধকৃত পথ: {location.pathname}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to={returnTo}>
            <Button
              variant="primary"
              size="md"
              icon={<Home className="w-4 h-4" />}
              className="shadow-sm font-medium"
            >
              {returnLabel}
            </Button>
          </Link>

          <Button
            variant="secondary"
            size="md"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate(-1)}
            className="shadow-sm font-medium"
          >
            পূর্ববর্তী পৃষ্ঠা
          </Button>

          <Button
            variant="ghost"
            size="md"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={() => window.location.reload()}
            className="text-[var(--ui-text-muted,#475569)] hover:text-[var(--ui-text,#0f172a)]"
          >
            রিলোড দিন
          </Button>
        </div>

        {/* Quick Navigation Cards */}
        {showQuickLinks && (
          <div className="w-full pt-8 mt-4 border-t border-[var(--ui-border,#e2e8f0)] dark:border-slate-800">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--ui-text-subtle,#94a3b8)] mb-4">
              দ্রুত প্রয়োজনীয় পেজে যান
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {quickLinks.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${item.bg}`}
                >
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 shadow-2xs group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-[var(--ui-text,#0f172a)] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </div>
                    <div className="text-xs text-[var(--ui-text-muted,#475569)] dark:text-[var(--ui-text-subtle,#94a3b8)] truncate">
                      {item.subtitle}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Support hint */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--ui-text-subtle,#94a3b8)] pt-4">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>CashBoi সিকিউর ম্যানেজমেন্ট সিস্টেম • কোনো প্রশ্ন থাকলে সাপোর্টে যোগাযোগ করুন</span>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

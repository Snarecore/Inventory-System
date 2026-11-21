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
    <div className="relative flex flex-col items-center justify-center min-h-[60vh] w-full py-4 sm:py-6 px-3 sm:px-4 select-none overflow-hidden text-center">
      {/* Decorative Ambient Background Gradients */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[var(--primary-color,#01306B)]/5 dark:bg-[var(--primary-color,#01306B)]/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-[#009fe3]/8 dark:bg-[#009fe3]/15 blur-3xl"
      />

      <div className="relative z-10 flex flex-col items-center max-w-xl mx-auto space-y-3 sm:space-y-3.5">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900/50 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span>Error 404 • পৃষ্ঠাটি খুঁজে পাওয়া যায়নি</span>
        </div>

        {/* Artistic 404 Display */}
        <div className="flex items-center justify-center gap-2.5 sm:gap-3 my-0.5">
          <span className="text-6xl sm:text-7xl font-black tracking-tight text-[var(--ui-text,#0f172a)] dark:text-white drop-shadow-xs leading-none">
            4
          </span>
          <div className="relative flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-linear-to-tr from-[var(--primary-color,#01306B)] to-[#009fe3] text-white shadow-md shadow-blue-500/20 transform hover:scale-105 transition-transform duration-300">
            <Compass className="w-7 h-7 sm:w-9 sm:h-9 animate-[spin_12s_linear_infinite]" />
            <div className="absolute inset-0 rounded-2xl ring-2 ring-white/20" />
          </div>
          <span className="text-6xl sm:text-7xl font-black tracking-tight text-[var(--ui-text,#0f172a)] dark:text-white drop-shadow-xs leading-none">
            4
          </span>
        </div>

        {/* Headline & Description */}
        <div className="space-y-1.5 px-2">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--ui-text,#0f172a)] dark:text-white tracking-tight">
            আপনি যে পৃষ্ঠাটি খুঁজছেন তা পাওয়া যায়নি
          </h1>
          <p className="text-xs sm:text-sm text-[var(--ui-text-muted,#475569)] dark:text-[var(--ui-text-subtle,#94a3b8)] max-w-md mx-auto leading-normal">
            লিঙ্কটিতে কোনো ভুল থাকতে পারে অথবা পৃষ্ঠাটি অন্য কোনো ঠিকানায় সরানো হয়েছে। নিচের বাটন চেপে দ্রুত সঠিক ঠিকানায় ফিরে যান।
          </p>

          {/* Requested Path Badge */}
          {location?.pathname && location.pathname !== '/admin/404' && (
            <div className="pt-0.5">
              <span className="inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--ui-surface-sunken,#eef2f7)] dark:bg-slate-800 text-[var(--ui-text-muted,#475569)] dark:text-slate-300 border border-[var(--ui-border,#e2e8f0)] dark:border-slate-700">
                অনুরোধকৃত পথ: {location.pathname}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <Link to={returnTo}>
            <Button
              variant="primary"
              size="sm"
              icon={<Home className="w-3.5 h-3.5" />}
              className="shadow-xs font-semibold text-xs py-1.5 px-3.5"
            >
              {returnLabel}
            </Button>
          </Link>

          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={() => navigate(-1)}
            className="shadow-xs font-semibold text-xs py-1.5 px-3.5"
          >
            পূর্ববর্তী পৃষ্ঠা
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => window.location.reload()}
            className="text-xs py-1.5 px-2.5 text-[var(--ui-text-muted,#475569)] hover:text-[var(--ui-text,#0f172a)]"
          >
            রিলোড দিন
          </Button>
        </div>

        {/* Quick Navigation Cards */}
        {showQuickLinks && (
          <div className="w-full pt-3 mt-1 border-t border-[var(--ui-border,#e2e8f0)] dark:border-slate-800">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ui-text-subtle,#94a3b8)] mb-2">
              দ্রুত প্রয়োজনীয় পেজে যান
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {quickLinks.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border ${item.bg}`}
                >
                  <div className="p-1.5 rounded-md bg-white dark:bg-slate-900 shadow-2xs shrink-0">
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[var(--ui-text,#0f172a)] dark:text-white">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-[var(--ui-text-muted,#475569)] dark:text-[var(--ui-text-subtle,#94a3b8)] truncate">
                      {item.subtitle}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Support hint */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--ui-text-subtle,#94a3b8)] pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>CashBoi সিকিউর ম্যানেজমেন্ট সিস্টেম • কোনো প্রশ্ন থাকলে সাপোর্টে যোগাযোগ করুন</span>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

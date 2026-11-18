import React, { useEffect, useState } from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { HiOutlineRefresh, HiOutlineHome, HiOutlineExclamationCircle } from 'react-icons/hi';
import { NotFound } from '@/pages/frontend/NotFound';

export const RouteErrorBoundary: React.FC = () => {
  const error: any = useRouteError();
  const navigate = useNavigate();
  const [isReloading, setIsReloading] = useState(false);

  const is404 = isRouteErrorResponse(error) && error.status === 404;

  const errorMessage =
    isRouteErrorResponse(error)
      ? `${error.status} ${error.statusText}`
      : error?.message || 'Unexpected application error';

  const isDynamicImportError =
    !is404 &&
    (errorMessage.includes('Failed to fetch dynamically imported module') ||
      errorMessage.includes('Importing a module script failed') ||
      errorMessage.includes('error loading dynamically imported module') ||
      error?.name === 'ChunkLoadError');

  useEffect(() => {
    // If it's a dynamic module import error and we haven't tried auto-reload yet
    if (isDynamicImportError) {
      const reloadKey = `route_error_reload_${window.location.pathname}`;
      const hasReloaded = sessionStorage.getItem(reloadKey);
      if (!hasReloaded) {
        try {
          sessionStorage.setItem(reloadKey, 'true');
        } catch {
          // ignore
        }
        setIsReloading(true);
        const timer = setTimeout(() => {
          window.location.reload();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isDynamicImportError]);

  const handleReload = () => {
    try {
      sessionStorage.removeItem(`route_error_reload_${window.location.pathname}`);
      sessionStorage.removeItem(`lazy_retry_${window.location.pathname}`);
    } catch {
      // ignore
    }
    window.location.reload();
  };

  if (is404) {
    return <NotFound returnTo="/admin" returnLabel="ড্যাশবোর্ডে ফিরে যান" />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-6">
      <div className="p-4 rounded-3xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
        <HiOutlineExclamationCircle className="h-16 w-16" />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl font-bold text-[var(--ui-text,#1e293b)] dark:text-white">
          {isDynamicImportError ? 'আপডেট লোড করতে সমস্যা হয়েছে' : 'একটি ত্রুটি ঘটেছে'}
        </h1>
        <p className="text-sm text-[var(--ui-text-muted,#64748b)] dark:text-[var(--ui-text-subtle,#94a3b8)]">
          {isDynamicImportError
            ? isReloading
              ? 'নতুন ভার্সন লোড করা হচ্ছে, অনুগ্রহ করে একটু অপেক্ষা করুন...'
              : 'অ্যাপ্লিকেশনটি আপডেট হয়েছে অথবা নেটওয়ার্কের কারণে পেজটি সরাসরি লোড করা সম্ভব হয়নি। অনুগ্রহ করে রিফ্রেশ করুন।'
            : errorMessage}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleReload}
          variant="primary"
          icon={<HiOutlineRefresh className={`h-4 w-4 ${isReloading ? 'animate-spin' : ''}`} />}
        >
          {isReloading ? 'রিলোড হচ্ছে...' : 'পৃষ্ঠা রিলোড করুন'}
        </Button>
        <Button
          onClick={() => navigate('/admin')}
          variant="secondary"
          icon={<HiOutlineHome className="h-4 w-4" />}
        >
          ড্যাশবোর্ড
        </Button>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  FaExclamationTriangle,
  FaFilePdf,
  FaFileExcel,
} from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import {
  FinancialBookType,
  BOOK_TITLES,
  fetchFinancialBookHtml,
  buildFinancialBookUrl,
  downloadFinancialBookFile,
} from "@/services/financial-book-service";
import { getActiveBranchId } from "@/utils/auth-storage";
import { getActiveBranch } from "@/utils/branch-storage";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";

interface FinancialBookPageProps {
  defaultType?: FinancialBookType;
}

const FinancialBookPage: React.FC<FinancialBookPageProps> = ({ defaultType }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Automatically connect with top navbar language (i18n.language)
  const lang: "bn" | "en" = i18n.language?.toLowerCase().startsWith("en") ? "en" : "bn";

  // Determine initial book type from path or prop
  const getInitialType = (): FinancialBookType => {
    if (defaultType) return defaultType;
    const path = location.pathname.toLowerCase();
    if (path.includes("bank-book")) return "bank";
    if (path.includes("mfs-book") || path.includes("mfs")) return "mfs";
    return "cash";
  };

  const [bookType, setBookType] = useState<FinancialBookType>(getInitialType);
  const [navUrl, setNavUrl] = useState<string | null>(null);

  // Download loading states
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState<boolean>(false);

  // Dynamic iframe height to avoid inner scrollbar
  const [iframeHeight, setIframeHeight] = useState<number | null>(null);

  // Synchronize when route changes
  useEffect(() => {
    const nextType = getInitialType();
    if (nextType !== bookType) {
      setBookType(nextType);
      setNavUrl(null);
    }
  }, [location.pathname, defaultType]);

  const activeBranchId = getActiveBranchId();
  const activeBranch = getActiveBranch();


  // Fetch report HTML via query - automatically refetches when top navbar language or branch changes
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["financial-book", bookType, activeBranchId, lang, navUrl],
    queryFn: async () => {
      return await fetchFinancialBookHtml(
        bookType,
        { lang, size: 20 },
        navUrl || undefined
      );
    },
    staleTime: 60 * 1000,
  });

  // Handle postMessage navigation & height requests from sandboxed iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "CASH_BOI_REPORT_NAVIGATE" && event.data.url) {
        setNavUrl(event.data.url);
      }

      if (event.data && event.data.type === "CASH_BOI_REPORT_HEIGHT" && typeof event.data.height === "number") {
        setIframeHeight(Math.max(event.data.height + 30, 600));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      await downloadFinancialBookFile(
        bookType,
        "pdf",
        { lang, branchId: activeBranchId ? Number(activeBranchId) : undefined },
        navUrl || undefined
      );
      showSuccessToast(lang === "bn" ? "PDF সফলভাবে ডাউনলোড হয়েছে" : "PDF downloaded successfully");
    } catch (err: any) {
      console.error("PDF download failed:", err);
      showErrorToast(err?.message || (lang === "bn" ? "PDF ডাউনলোড করতে সমস্যা হয়েছে।" : "Failed to download PDF."));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadCsv = async () => {
    try {
      setIsDownloadingCsv(true);
      await downloadFinancialBookFile(
        bookType,
        "csv",
        { branchId: activeBranchId ? Number(activeBranchId) : undefined },
        navUrl || undefined
      );
      showSuccessToast(lang === "bn" ? "Excel (CSV) সফলভাবে ডাউনলোড হয়েছে" : "Excel (CSV) downloaded successfully");
    } catch (err: any) {
      console.error("CSV download failed:", err);
      showErrorToast(err?.message || (lang === "bn" ? "CSV/Excel ডাউনলোড করতে সমস্যা হয়েছে।" : "Failed to download CSV/Excel."));
    } finally {
      setIsDownloadingCsv(false);
    }
  };

  const currentTitle = BOOK_TITLES[bookType];
  const isBusy = isLoading || isFetching;

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1700px] mx-auto w-full">
      {/* Header Bar - Borderless */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-1">
        {/* Left: Title without description & branch indicator */}
        <div>
          <PageHeader headerTitle={currentTitle.en} />
          {activeBranch && (
            <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--ui-success)]"></span>
              <span>{t("Branch") || "বর্তমান ব্রাঞ্চ"}: <strong>{activeBranch.name}</strong></span>
              {activeBranch.code && (
                <span className="text-[var(--text-muted)]">({activeBranch.code})</span>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center flex-wrap gap-1.5 self-start sm:self-auto">
            {/* PDF Export */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium border border-rose-200 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors disabled:opacity-50 cursor-pointer"
              title="PDF ডাউনলোড করুন"
            >
              {isDownloadingPdf ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></span>
                  <span>{lang === "bn" ? "PDF তৈরি হচ্ছে..." : "Generating PDF..."}</span>
                </>
              ) : (
                <>
                  <FaFilePdf className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </>
              )}
            </button>

            {/* Excel / CSV Export */}
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={isDownloadingCsv}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50 cursor-pointer"
              title="Excel (CSV) ডাউনলোড করুন"
            >
              {isDownloadingCsv ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                  <span>{lang === "bn" ? "ডাউনলোড হচ্ছে..." : "Downloading..."}</span>
                </>
              ) : (
                <>
                  <FaFileExcel className="w-3.5 h-3.5" />
                  <span>Excel (CSV)</span>
                </>
              )}
            </button>

            {/* Refresh */}
            <RefreshButton
              onClick={() => refetch()}
              isLoading={isBusy}
            />
          </div>
        </div>

      {/* Report Content Container - Borderless and clean without scrollbar */}
      <div className="relative w-full overflow-hidden bg-transparent border-0 shadow-none">
        {/* Loading Spinner Overlay */}
        {isBusy && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--card-bg)]/80 backdrop-blur-xs min-h-[400px]">
            <div className="w-10 h-10 border-4 border-solid border-[var(--primary-color)] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-sm text-[var(--text-secondary)] font-medium">
              {t(currentTitle.en)} লোড হচ্ছে...
            </p>
          </div>
        )}

        {/* Error Fallback */}
        {error ? (
          <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
            <FaExclamationTriangle className="w-12 h-12 text-[var(--ui-danger)] mb-3" />
            <h3 className="text-base font-semibold text-[var(--text-color)]">
              রিপোর্ট লোড করতে সমস্যা হয়েছে
            </h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-md mt-1 mb-4">
              {(error as Error)?.message || "দয়া করে ইন্টারনেট সংযোগ ও ব্রাঞ্চ সিলেক্ট করে পুনরায় চেষ্টা করুন।"}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-4 py-2 bg-[var(--primary-color)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              পুনরায় চেষ্টা করুন
            </button>
          </div>
        ) : data?.html ? (
          <iframe
            ref={iframeRef}
            srcDoc={data.html}
            title={t(currentTitle.en)}
            style={{
              height: iframeHeight ? `${iframeHeight}px` : "900px",
              minHeight: "750px",
              border: "none",
              outline: "none",
            }}
            scrolling="no"
            className="w-full border-0 block bg-transparent"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : null}
      </div>
    </div>
  );
};

export default FinancialBookPage;

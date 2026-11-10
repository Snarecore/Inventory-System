import React, { useState } from "react";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";

interface ReportExportButtonsProps {
  onExportExcel: () => Promise<string | void>;
  onDownloadPdf: () => Promise<string | void>;
}

/**
 * Shared Excel & Direct PDF Export toolbar action buttons with unified busy guard & toasts
 */
export const ReportExportButtons: React.FC<ReportExportButtonsProps> = ({
  onExportExcel,
  onDownloadPdf,
}) => {
  const [busyType, setBusyType] = useState<"excel" | "pdf" | null>(null);

  const runExport = async (
    type: "excel" | "pdf",
    action: () => Promise<string | void>,
    fallbackError: string
  ) => {
    if (busyType) return;
    setBusyType(type);
    try {
      const successMsg = await action();
      if (successMsg) {
        showSuccessToast(successMsg);
      }
    } catch (e: any) {
      showErrorToast(e?.message || fallbackError);
    } finally {
      setBusyType(null);
    }
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
      <button
        type="button"
        onClick={() => runExport("excel", onExportExcel, "Excel export failed")}
        disabled={busyType !== null}
        title="Download Excel Report"
        className="flex items-center justify-center gap-1.5 px-3 h-8 text-[11px] sm:text-xs font-semibold text-[var(--ui-success-dark)] bg-[var(--ui-success-light)] hover:bg-[var(--ui-success-border)] border border-[var(--ui-success-border)] rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
      >
        <FaFileExcel className="text-[var(--ui-success)] shrink-0" size={12} />
        <span>{busyType === "excel" ? "Exporting..." : "Excel"}</span>
      </button>

      <button
        type="button"
        onClick={() => runExport("pdf", onDownloadPdf, "PDF download failed")}
        disabled={busyType !== null}
        title="Download PDF Report"
        className="flex items-center justify-center gap-1.5 px-3 h-8 text-[11px] sm:text-xs font-semibold text-white bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
      >
        <FaFilePdf className="text-white shrink-0" size={12} />
        <span>{busyType === "pdf" ? "Downloading..." : "Download PDF"}</span>
      </button>
    </div>
  );
};

export default ReportExportButtons;

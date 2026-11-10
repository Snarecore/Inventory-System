import React, { useState } from "react";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";

interface ReportExportButtonsProps {
  onExportExcel: () => Promise<void>;
  onDownloadPdf: () => Promise<void>;
}

export const ReportExportButtons: React.FC<ReportExportButtonsProps> = ({
  onExportExcel,
  onDownloadPdf,
}) => {
  const [busyType, setBusyType] = useState<"excel" | "pdf" | null>(null);

  const handleExcel = async () => {
    if (busyType) return;
    setBusyType("excel");
    try {
      await onExportExcel();
    } finally {
      setBusyType(null);
    }
  };

  const handlePdf = async () => {
    if (busyType) return;
    setBusyType("pdf");
    try {
      await onDownloadPdf();
    } finally {
      setBusyType(null);
    }
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
      <button
        type="button"
        onClick={handleExcel}
        disabled={busyType !== null}
        title="Download Excel Report"
        className="flex items-center justify-center gap-1.5 px-3 h-8 text-[11px] sm:text-xs font-semibold text-[var(--ui-success-dark)] bg-[var(--ui-success-light)] hover:bg-[var(--ui-success-border)] border border-[var(--ui-success-border)] rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
      >
        <FaFileExcel className="text-[var(--ui-success)] shrink-0" size={12} />
        <span>{busyType === "excel" ? "Exporting..." : "Excel"}</span>
      </button>

      <button
        type="button"
        onClick={handlePdf}
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

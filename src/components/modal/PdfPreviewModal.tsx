import React, { useEffect, useRef, useState } from "react";
import {
  FaFilePdf,
  FaDownload,
  FaPrint,
  FaExternalLinkAlt,
  FaTimes,
  FaSpinner,
  FaInfoCircle,
} from "react-icons/fa";
import {
  usePdfPreview,
  closePdfPreview,
  downloadPdfFromPreview,
} from "@/services/pdf-preview-service";

export const PdfPreviewModal: React.FC = () => {
  const { isOpen, data } = usePdfPreview();
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reset loading state whenever modal opens or new blobUrl arrives
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
    }
  }, [isOpen, data?.blobUrl]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closePdfPreview();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !data) return null;

  const fileSizeStr = data.blob
    ? data.blob.size > 1024 * 1024
      ? `${(data.blob.size / (1024 * 1024)).toFixed(2)} MB`
      : `${(data.blob.size / 1024).toFixed(1)} KB`
    : null;

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch (err) {
        console.warn("Direct iframe print failed, falling back to window.open:", err);
      }
    }
    if (data.blobUrl) {
      const win = window.open(data.blobUrl, "_blank");
      win?.focus();
    }
  };

  const handleOpenInNewTab = () => {
    if (data.blobUrl) {
      window.open(data.blobUrl, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 md:p-6"
      onClick={closePdfPreview}
      role="dialog"
      aria-modal="true"
      aria-label={data.title || "PDF Report Preview"}
    >
      <div
        className="w-full max-w-5xl h-[92vh] max-h-[92vh] flex flex-col bg-[var(--ui-surface,#ffffff)] dark:bg-[#1e293b] rounded-2xl shadow-2xl border border-[var(--ui-border,#e2e8f0)] dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-[var(--ui-border,#e2e8f0)] dark:border-slate-700 flex items-center justify-between gap-2 sm:gap-4 shrink-0 bg-[var(--ui-surface,#ffffff)] dark:bg-[#1e293b]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
              <FaFilePdf size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-[var(--ui-text,#0f172a)] dark:text-slate-100 truncate flex items-center gap-2">
                <span>{data.title || "PDF Report Preview"}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                  Preview
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-[var(--ui-text-muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5 truncate mt-0.5">
                <span className="truncate max-w-[200px] sm:max-w-xs">{data.fileName}</span>
                {fileSizeStr && (
                  <>
                    <span>•</span>
                    <span className="font-medium text-slate-500 dark:text-slate-400">{fileSizeStr}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {data.blobUrl && (
              <button
                type="button"
                onClick={handleOpenInNewTab}
                title="Open PDF in new browser tab"
                className="hidden sm:inline-flex items-center gap-1 px-2.5 h-8 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <FaExternalLinkAlt size={11} />
                <span>New Tab</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              title="Print PDF report"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <FaPrint size={12} />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={downloadPdfFromPreview}
              title="Download PDF report to computer"
              className="flex items-center gap-1.5 px-3 sm:px-4 h-8 text-xs font-semibold text-white bg-[var(--primary-color,#2563eb)] hover:bg-[var(--primary-color-hover,#1d4ed8)] rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <FaDownload size={11} />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={closePdfPreview}
              title="Close Preview (Esc)"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer ml-1"
            >
              <FaTimes size={15} />
            </button>
          </div>
        </div>

        {/* Modal Body / PDF Viewer */}
        <div className="flex-1 min-h-0 bg-slate-100 dark:bg-slate-900/60 p-1 sm:p-2.5 relative flex flex-col">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-xs">
              <FaSpinner className="animate-spin text-3xl text-[var(--primary-color,#2563eb)]" />
              <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                Rendering PDF Preview...
              </p>
            </div>
          )}

          {data.blobUrl ? (
            <iframe
              ref={iframeRef}
              src={`${data.blobUrl}#toolbar=1&view=FitH`}
              title={data.title || "PDF Preview"}
              onLoad={() => setIsLoading(false)}
              className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-inner"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Could not load PDF preview for this document.
              </p>
              <button
                type="button"
                onClick={downloadPdfFromPreview}
                className="mt-3 px-4 py-2 bg-[var(--primary-color)] text-white text-xs font-semibold rounded-lg"
              >
                Download PDF Directly
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-3.5 sm:px-6 py-2.5 sm:py-3 border-t border-[var(--ui-border,#e2e8f0)] dark:border-slate-700 flex items-center justify-between gap-3 shrink-0 bg-[var(--ui-surface,#ffffff)] dark:bg-[#1e293b]">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
            <FaInfoCircle className="text-blue-500 shrink-0" size={13} />
            <span className="truncate">
              Please review the document above. Click Download PDF when you are ready.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={closePdfPreview}
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={downloadPdfFromPreview}
              className="flex items-center gap-1.5 px-4 sm:px-5 py-1.5 sm:py-2 text-xs font-semibold text-white bg-[var(--primary-color,#2563eb)] hover:bg-[var(--primary-color-hover,#1d4ed8)] rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <FaDownload size={11} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfPreviewModal;

import React from "react";
import { FaFileExcel } from "react-icons/fa";

export interface ExcelExportButtonProps {
  onClick: () => void | Promise<void>;
  label?: string;
  title?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export const ExcelExportButton: React.FC<ExcelExportButtonProps> = ({
  onClick,
  label = "Export",
  title = "Export to Excel",
  disabled = false,
  isLoading = false,
  className = "",
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      title={title}
      className={`flex items-center justify-center gap-1.5 px-3 h-8 text-[11px] sm:text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap ${className}`}
    >
      <FaFileExcel className="text-emerald-600 shrink-0" size={12} />
      <span>{label}</span>
    </button>
  );
};

export default ExcelExportButton;

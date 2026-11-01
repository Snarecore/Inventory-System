import React from "react";
import { FaCalculator } from "react-icons/fa";

export interface TradeFormHeaderProps {
  title: string;
  invoiceNo?: string;
  invoiceBadgeFallback?: string;
  icon?: React.ReactNode;
  onReset: () => void;
  onCancel: () => void;
  extraActions?: React.ReactNode;
  className?: string;
}

export const TradeFormHeader: React.FC<TradeFormHeaderProps> = ({
  title,
  invoiceNo,
  invoiceBadgeFallback = "INV",
  icon = <FaCalculator className="text-[var(--primary-color)] shrink-0" size={18} />,
  onReset,
  onCancel,
  extraActions,
  className = "",
}) => {
  return (
    <div
      className={`sticky top-0 z-30 bg-[var(--ui-surface-sunken,#F6F6F6)] -mt-1.5 sm:-mt-2 py-2 sm:py-2.5 border-b border-[var(--ui-border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${className}`}
    >
      {/* Left Side: Title & Invoice Badge */}
      <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
        <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-2.5 min-w-0">
          <h1 className="text-sm sm:text-base lg:text-lg font-bold text-[var(--primary-color)] flex items-center gap-1.5 shrink-0 select-none">
            {icon}
            <span className="truncate">{title}</span>
          </h1>
          <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-[var(--primary-color-light)] text-[var(--primary-color)] font-normal w-fit">
            {invoiceNo || invoiceBadgeFallback}
          </span>
        </div>

        {/* Quick Reset & Cancel for Mobile */}
        <div className="flex sm:hidden items-center gap-1 shrink-0">
          {extraActions}
          <button
            type="button"
            onClick={onReset}
            className="ui-btn ui-btn-ghost h-[var(--ui-control-h-xs)] px-2.5 text-[length:var(--ui-font-size-xs)] font-normal cursor-pointer"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="ui-btn ui-btn-ghost h-[var(--ui-control-h-xs)] px-2.5 text-[length:var(--ui-font-size-xs)] font-normal cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Desktop Action Controls */}
      <div className="hidden sm:flex items-center gap-2">
        {extraActions}
        <button
          type="button"
          onClick={onReset}
          className="ui-btn ui-btn-secondary h-[var(--ui-control-h-xs)] px-3 text-[length:var(--ui-font-size-xs)] font-normal cursor-pointer"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="ui-btn ui-btn-secondary h-[var(--ui-control-h-xs)] px-3 text-[length:var(--ui-font-size-xs)] font-normal cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default TradeFormHeader;

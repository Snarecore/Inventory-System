import React from "react";
import DrawerModal from "@/components/modal/DrawerModal";
import type { StockAdjustmentReportItem } from "@/types";
import { formatMoney } from "@/utils/formatters";
import {
  FaBoxes,
  FaArrowDown,
  FaArrowUp,
  FaInfoCircle,
} from "react-icons/fa";

interface StockAdjustmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  adjustment: StockAdjustmentReportItem | null;
}

const formatUnit = (unit?: string) => {
  const raw = String(unit || "").trim();
  if (!raw || raw.toLowerCase().includes("dozen") || raw.toLowerCase() === "units" || raw.toLowerCase() === "unit") {
    return "Pcs";
  }
  return raw;
};

export const StockAdjustmentDetailsModal: React.FC<StockAdjustmentDetailsModalProps> = ({
  isOpen,
  onClose,
  adjustment,
}) => {
  if (!adjustment) return null;

  const isOut = adjustment.adjustmentType === "OUT";
  const totalValue = adjustment.adjustmentQty * adjustment.price;

  return (
    <DrawerModal
      isOpen={isOpen}
      onClose={onClose}
      title="Stock Adjustment Details"
      maxWidth="max-w-[360px] sm:max-w-[400px]"
      footerButtons={
        <div className="flex items-center justify-end w-full">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 text-xs font-medium rounded-md border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3.5 text-left text-xs">
        {/* Header Summary Banner */}
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
            isOut
              ? "bg-[var(--ui-danger-light)]/60 border-[var(--ui-danger-border)] text-[var(--ui-danger-dark)]"
              : "bg-[var(--ui-success-light)]/60 border-[var(--ui-success-border)] text-[var(--ui-success-dark)]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                isOut
                  ? "bg-[var(--ui-danger-border)] text-[var(--ui-danger)]"
                  : "bg-[var(--ui-success-border)] text-[var(--ui-success)]"
              }`}
            >
              {isOut ? <FaArrowUp size={14} /> : <FaArrowDown size={14} />}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm">
                {isOut ? "Stock Out (-)" : "Stock In (+)"}
              </span>
              <span className="text-[11px] opacity-80 font-medium">
                {adjustment.adjustmentNo}
              </span>
            </div>
          </div>
          <span className="font-bold text-base">
            {isOut ? "-" : "+"} {adjustment.adjustmentQty} {formatUnit(adjustment.packSize)}
          </span>
        </div>

        {/* Product Information Card */}
        <div className="p-3 bg-[var(--ui-surface-sunken)]/60 border border-[var(--ui-border)] rounded-xl flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[var(--ui-text-muted)] text-[11px] font-semibold uppercase tracking-wider">
            <FaBoxes size={12} className="text-[var(--primary-color)]" />
            Product Information
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-[var(--ui-text)]">
              {adjustment.productName}
            </span>
            {adjustment.productId && (
              <span className="text-[11px] text-[var(--ui-text-muted)] font-mono">
                Code / SKU: {adjustment.productId}
              </span>
            )}
          </div>
        </div>

        {/* Quantities & Price Breakdown Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-[var(--ui-text-muted)] font-semibold uppercase">
              Previous Stock
            </span>
            <span className="text-sm font-bold text-[var(--ui-text)] mt-0.5">
              {adjustment.previousQty}
            </span>
          </div>

          <div
            className={`p-2.5 border rounded-xl flex flex-col items-center justify-center text-center ${
              isOut
                ? "bg-[var(--ui-danger-light)]/40 border-[var(--ui-danger-border)]"
                : "bg-[var(--ui-success-light)]/40 border-[var(--ui-success-border)]"
            }`}
          >
            <span className="text-[10px] text-[var(--ui-text-muted)] font-semibold uppercase">
              Adjustment
            </span>
            <span
              className={`text-sm font-bold mt-0.5 ${
                isOut ? "text-[var(--ui-danger)]" : "text-[var(--ui-success)]"
              }`}
            >
              {isOut ? "-" : "+"} {adjustment.adjustmentQty}
            </span>
          </div>

          <div className="p-2.5 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-[var(--ui-text-muted)] font-semibold uppercase">
              New Stock
            </span>
            <span className="text-sm font-bold text-[var(--primary-color)] mt-0.5">
              {adjustment.newQty}
            </span>
          </div>
        </div>

        {/* Price & Value Details */}
        <div className="p-3 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--ui-text-muted)]">Unit Price:</span>
            <span className="font-semibold text-[var(--ui-text)]">
              ৳ {formatMoney(adjustment.price)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--ui-text-muted)]">Pack / Unit:</span>
            <span className="font-semibold text-[var(--ui-text)]">
              {formatUnit(adjustment.packSize)}
            </span>
          </div>
          <div className="h-px bg-[var(--ui-border)] my-0.5" />
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[var(--ui-text)]">Total Value Impact:</span>
            <span className={isOut ? "text-[var(--ui-danger)]" : "text-[var(--ui-success)]"}>
              {isOut ? "-" : "+"} ৳ {formatMoney(totalValue)}
            </span>
          </div>
        </div>

        {/* Remarks / Reason */}
        {adjustment.remarks && (
          <div className="p-3 bg-[var(--ui-surface-sunken)]/60 border border-[var(--ui-border)] rounded-xl flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--ui-text)]">
              <FaInfoCircle className="text-[var(--primary-color)] text-xs" />
              <span>Remarks / Reason</span>
            </div>
            <p className="text-xs text-[var(--ui-text-muted)] leading-relaxed italic">
              "{adjustment.remarks}"
            </p>
          </div>
        )}
      </div>
    </DrawerModal>
  );
};

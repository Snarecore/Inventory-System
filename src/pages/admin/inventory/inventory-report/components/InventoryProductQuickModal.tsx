import React from "react";
import {
  FaBarcode,
  FaBoxes,
  FaChartLine,
  FaCheckCircle,
  FaExclamationTriangle,
  FaLayerGroup,
  FaMoneyBillWave,
  FaTag,
  FaTimesCircle,
} from "react-icons/fa";
import DrawerModal from "@/components/modal/DrawerModal";
import { formatMoney } from "@/utils/formatters";
import type { ProductItem } from "@/types";
import { extractInventoryProductMetrics } from "../utils/inventory-report-helpers";

interface InventoryProductQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductItem | null;
}

export const InventoryProductQuickModal: React.FC<
  InventoryProductQuickModalProps
> = ({ isOpen, onClose, product }) => {
  if (!product) return null;

  const m = extractInventoryProductMetrics(product);
  const unitProfit = m.sellPrice - m.buyPrice;
  const costRatioPct =
    m.retailValue > 0
      ? Math.min(100, Math.max(0, (m.costValue / m.retailValue) * 100))
      : 100;
  const profitRatioPct = Math.max(0, 100 - costRatioPct);
  const thresholdTarget = m.lowThreshold > 0 ? m.lowThreshold : 5;
  const stockHealthPct =
    m.quantity <= 0
      ? 0
      : Math.min(100, Math.round((m.quantity / (thresholdTarget * 2)) * 100));

  const stockStyle =
    m.stockState === "OUT"
      ? {
          banner:
            "bg-[var(--ui-danger-light)]/70 border-[var(--ui-danger-border)] text-[var(--ui-danger-dark)]",
          bar: "bg-[var(--ui-danger)]",
          pill: "bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)]",
          label: "Out of Stock",
          icon: <FaTimesCircle size={11} className="text-[var(--ui-danger)]" />,
        }
      : m.stockState === "LOW"
      ? {
          banner:
            "bg-[var(--ui-warning-light)]/70 border-[var(--ui-warning-border)] text-[var(--ui-warning-dark)]",
          bar: "bg-[var(--ui-warning)]",
          pill: "bg-[var(--ui-warning-border)] text-[var(--ui-warning-dark)]",
          label: "Low Stock",
          icon: (
            <FaExclamationTriangle
              size={11}
              className="text-[var(--ui-warning)]"
            />
          ),
        }
      : {
          banner:
            "bg-[var(--ui-success-light)]/70 border-[var(--ui-success-border)] text-[var(--ui-success-dark)]",
          bar: "bg-[var(--ui-success)]",
          pill: "bg-[var(--ui-success-border)] text-[var(--ui-success-dark)]",
          label: "Healthy Stock",
          icon: (
            <FaCheckCircle size={11} className="text-[var(--ui-success)]" />
          ),
        };

  return (
    <DrawerModal
      isOpen={isOpen}
      onClose={onClose}
      title="Product Valuation Snapshot"
      icon={<FaBoxes size={13} />}
      maxWidth="max-w-[360px] sm:max-w-[400px]"
      className="!bg-[var(--ui-surface)] !border-[var(--ui-border)]"
      headerClassName="!px-3.5 !py-2.5 !bg-[var(--ui-surface)] !border-[var(--ui-border)] [&_h2]:!text-[var(--ui-text)] [&_h2]:!text-[13px]"
      bodyClassName="!p-2.5 sm:!p-3 !space-y-2"
    >
      <div className="flex flex-col gap-2 text-left text-xs">
        {/* ── Product Identity Card ── */}
        <div className="p-2.5 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/60 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-[var(--ui-text)] leading-tight break-words min-w-0">
              {m.name}
            </h3>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${stockStyle.pill}`}
            >
              {stockStyle.icon}
              <span>{stockStyle.label}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-[var(--ui-text-muted)]">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--ui-surface)] border border-[var(--ui-border)] text-[var(--ui-text)] font-medium">
              <FaLayerGroup
                size={9}
                className="text-[var(--primary-color)]"
              />
              {m.category}
            </span>

            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold border ${
                m.isActive
                  ? "bg-[var(--ui-success-light)] text-[var(--ui-success-dark)] border-[var(--ui-success-border)]"
                  : "bg-[var(--ui-surface-sunken)] text-[var(--ui-text-muted)] border-[var(--ui-border-strong)]"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  m.isActive
                    ? "bg-[var(--ui-success)]"
                    : "bg-[var(--ui-text-subtle)]"
                }`}
              />
              {m.isActive ? "Active" : "Inactive"}
            </span>

            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--ui-surface)] border border-[var(--ui-border)] text-[var(--ui-text)] font-medium">
              <FaTag size={9} className="text-[var(--ui-text-subtle)]" />
              {m.code}
            </span>

            {m.barcode !== "-" && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--ui-surface)] border border-[var(--ui-border)] text-[var(--ui-text)] font-medium">
                <FaBarcode
                  size={10}
                  className="text-[var(--ui-text-subtle)]"
                />
                {m.barcode}
              </span>
            )}
          </div>
        </div>

        {/* ── Live Stock & Unit Breakdown Bar ── */}
        <div
          className={`p-2.5 rounded-lg border flex flex-col gap-1.5 ${stockStyle.banner}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80 block leading-none">
                Available Stock
              </span>
              <span className="text-base font-extrabold tracking-tight tabular-nums mt-0.5 block">
                {m.displayStock}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80 block leading-none">
                Min Alert
              </span>
              <span className="text-xs font-bold tabular-nums mt-0.5 block">
                {m.lowThreshold} {m.unit}
              </span>
            </div>
          </div>

          {m.hasSecondaryUnit && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] opacity-90 font-medium">
              <span>Primary: {m.primaryStockDisplay}</span>
              <span>Secondary: {m.secondaryStockDisplay}</span>
              {m.packingLevels &&
                m.packingLevels.toLowerCase() !== m.primaryUnit.toLowerCase() && (
                  <span>({m.packingLevels})</span>
                )}
            </div>
          )}

          <div className="w-full h-1 rounded-full bg-white/70 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${stockStyle.bar}`}
              style={{ width: `${stockHealthPct}%` }}
            />
          </div>
        </div>

        {/* ── Compact 2x2 Divided Unit Pricing & Margin Card ── */}
        <div className="grid grid-cols-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] overflow-hidden">
          <div className="px-3 py-2 border-r border-b border-[var(--ui-border)] flex flex-col gap-0.5">
            <span className="text-[10px] text-[var(--ui-text-muted)] font-semibold uppercase tracking-wider">
              Unit Buy Price
            </span>
            <span className="text-[13px] font-bold text-[var(--ui-text)] tabular-nums">
              ৳ {formatMoney(m.buyPrice)}
            </span>
          </div>

          <div className="px-3 py-2 border-b border-[var(--ui-border)] flex flex-col gap-0.5">
            <span className="text-[10px] text-[var(--ui-text-muted)] font-semibold uppercase tracking-wider">
              Unit Sell Price
            </span>
            <span className="text-[13px] font-bold text-[var(--primary-color)] tabular-nums">
              ৳ {formatMoney(m.sellPrice)}
            </span>
          </div>

          <div className="px-3 py-2 border-r border-[var(--ui-border)] flex flex-col gap-0.5">
            <span className="text-[10px] text-[var(--ui-text-muted)] font-semibold uppercase tracking-wider">
              Unit Profit
            </span>
            <span
              className={`text-[13px] font-bold tabular-nums ${
                unitProfit >= 0
                  ? "text-[var(--ui-success)]"
                  : "text-[var(--ui-danger)]"
              }`}
            >
              {unitProfit >= 0 ? "+" : ""}৳ {formatMoney(unitProfit)}
            </span>
          </div>

          <div className="px-3 py-2 flex flex-col gap-0.5">
            <span className="text-[10px] text-[var(--ui-text-muted)] font-semibold uppercase tracking-wider">
              Gross Margin
            </span>
            <span
              className={`text-[13px] font-bold tabular-nums ${
                m.marginPct >= 0
                  ? "text-[var(--ui-success)]"
                  : "text-[var(--ui-danger)]"
              }`}
            >
              {m.marginPct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* ── Financial Valuation Breakdown Card ── */}
        <div className="p-2.5 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-[var(--ui-text)] uppercase tracking-wider">
              <FaMoneyBillWave
                className="text-[var(--primary-color)]"
                size={11}
              />
              <span>Inventory Valuation</span>
            </div>
            <FaChartLine className="text-[var(--ui-success)]" size={11} />
          </div>

          {m.retailValue > 0 && (
            <div className="flex flex-col gap-1">
              <div className="w-full h-1.5 rounded-full bg-[var(--ui-success-light)] overflow-hidden flex">
                <div
                  className="h-full bg-[var(--primary-color)]"
                  style={{ width: `${costRatioPct}%` }}
                />
                {m.potentialProfit > 0 && (
                  <div className="h-full bg-[var(--ui-success)] flex-1" />
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] text-[var(--ui-text-muted)]">
                <span>Cost Basis ({costRatioPct.toFixed(0)}%)</span>
                <span className="text-[var(--ui-success)] font-semibold">
                  Profit Margin ({profitRatioPct.toFixed(0)}%)
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1 pt-1 border-t border-[var(--ui-border)]/70">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--ui-text-muted)]">
                Stock Cost Value
              </span>
              <span className="font-bold text-[var(--primary-color)] tabular-nums">
                ৳ {formatMoney(m.costValue)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--ui-text-muted)]">
                Potential Retail Value
              </span>
              <span className="font-bold text-[var(--ui-text)] tabular-nums">
                ৳ {formatMoney(m.retailValue)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-[var(--ui-border)]/80">
              <span className="text-[var(--ui-text)]">Est. Total Profit</span>
              <span
                className={`text-[13px] tabular-nums ${
                  m.potentialProfit >= 0
                    ? "text-[var(--ui-success)]"
                    : "text-[var(--ui-danger)]"
                }`}
              >
                {m.potentialProfit >= 0 ? "+" : ""}৳{" "}
                {formatMoney(m.potentialProfit)}
              </span>
            </div>
          </div>

          {m.shortfallQty > 0 && (
            <div className="px-2.5 py-1.5 rounded-md bg-[var(--ui-danger-light)]/70 border border-[var(--ui-danger-border)] flex items-center justify-between text-[11px]">
              <span className="text-[var(--ui-danger-dark)] font-semibold">
                Restock Need (+{m.shortfallQty} {m.unit})
              </span>
              <span className="font-bold text-[var(--ui-danger)] tabular-nums">
                ৳ {formatMoney(m.restockCost)}
              </span>
            </div>
          )}
        </div>
      </div>
    </DrawerModal>
  );
};

export default InventoryProductQuickModal;

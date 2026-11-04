import React from "react";
import { FaTrash } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import TextInput from "@/components/form/TextInput";

export interface TradeLineItemsTableProps {
  title?: string;
  subtotal: number;
  lineItems: any[];
  priceHeader?: string;
  priceField?: "sellPrice" | "buyPrice";
  onUpdatePrice: (index: number, newPrice: string) => void;
  onUpdateQuantity: (index: number, newQuantity: string) => void;
  onRequestDelete: (index: number) => void;
  emptyMessage?: string;
}

export const TradeLineItemsTable: React.FC<TradeLineItemsTableProps> = ({
  title = "Items List",
  subtotal,
  lineItems,
  priceHeader = "Price (৳)",
  priceField = "sellPrice",
  onUpdatePrice,
  onUpdateQuantity,
  onRequestDelete,
  emptyMessage = "No items added yet. Search and add products above.",
}) => {
  return (
    <div className="ui-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--ui-border)] px-2.5 py-2">
        <h2 className="text-[13px] font-semibold text-[var(--ui-text)]">
          {title} ({lineItems.length})
        </h2>
        <span className="text-[11px] text-[var(--ui-text-muted)]">
          Subtotal <span className="ml-1 text-[13px] font-bold tabular-nums text-[var(--ui-text)]">৳ {formatMoney(subtotal)}</span>
        </span>
      </div>

      <div
        className="w-full overflow-auto"
        style={{
          // header (cell padding + one text line) + exactly five body rows
          maxHeight:
            "calc(var(--ui-table-row-h) * 5 + var(--ui-table-cell-py) * 2 + 1rem)",
        }}
      >
        <table className="ui-table w-full min-w-[720px] text-left border-collapse">
          <thead>
            <tr className="text-[11px] font-semibold [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-[var(--table-header-bg,var(--primary-color))] [&>th]:text-[var(--table-header-text,var(--ui-on-accent,#ffffff))] [&>th]:shadow-[inset_0_-1px_0_var(--ui-border)]">
              <th className="text-center w-10 whitespace-nowrap">SL</th>
              <th className="w-full min-w-[180px]">Product</th>
              <th className="text-center w-16 whitespace-nowrap">Unit</th>
              <th className="text-center w-20 whitespace-nowrap">Stock</th>
              <th className="text-right w-28 min-w-[100px] whitespace-nowrap">{priceHeader}</th>
              <th className="text-center w-28 min-w-[110px] whitespace-nowrap">Quantity</th>
              <th className="text-right w-28 min-w-[100px] whitespace-nowrap">Total (৳)</th>
              <th className="text-center w-10 whitespace-nowrap"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ui-border)]">
            {lineItems.length > 0 ? (
              lineItems.map((item, idx) => {
                const currentPrice = item[priceField] ?? "0";
                return (
                  <tr key={idx} className="hover:bg-[var(--ui-surface-muted)]/70 transition-colors">
                    {/* SL */}
                    <td className="text-center text-[11px] tabular-nums text-[var(--ui-text-muted)] whitespace-nowrap">
                      {idx + 1}
                    </td>

                    <td className="w-full max-w-0">
                      <div className="flex min-w-0 items-baseline gap-1.5">
                        <span
                          className="truncate font-semibold text-[var(--ui-text)]"
                          title={item.productName}
                        >
                          {item.productName}
                        </span>
                        {item.productCode && (
                          <span
                            className="shrink-0 text-[10px] tabular-nums text-[var(--ui-text-subtle)]"
                            title={`Code: ${item.productCode}`}
                          >
                            {item.productCode}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Unit */}
                    <td className="text-center whitespace-nowrap">
                      <span className="text-[var(--ui-text)] font-semibold bg-[var(--ui-surface-sunken)] px-1.5 py-0.5 rounded-[var(--ui-radius-sm)] text-[11px]">
                        {item.unit || "pcs"}
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="text-center whitespace-nowrap">
                      <span className="text-[var(--ui-text)] font-semibold bg-[var(--ui-surface-sunken)] px-2 py-0.5 rounded-[var(--ui-radius-sm)] text-[11px]">
                        {Number(item.stock) || 0}
                      </span>
                    </td>

                    {/* Price (Right Aligned Money Input, No Wheel/Spinners) */}
                    <td className="text-right whitespace-nowrap">
                      <TextInput
                        type="number"
                        step="0.01"
                        value={currentPrice}
                        placeholder="0"
                        icon={<span className="text-[var(--ui-text)] font-bold text-[11px]">৳</span>}
                        onChange={(val) => onUpdatePrice(idx, val)}
                        wrapperClass="ui-control-xs !px-1.5 focus-within:!border-[var(--primary-color)]"
                        inputClass="text-right font-bold tabular-nums text-[var(--ui-text)]"
                      />
                    </td>

                    {/* Quantity (Stepper) */}
                    <td className="text-center whitespace-nowrap">
                      <div className="inline-flex items-center border border-[var(--ui-border-strong)] rounded-[var(--ui-radius-sm)] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            const q = Math.max(1, (Number(item.quantity) || 1) - 1);
                            onUpdateQuantity(idx, String(q));
                          }}
                          className="px-1.5 py-1 bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] text-[var(--ui-text)] font-bold text-xs cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          placeholder="1"
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) => onUpdateQuantity(idx, e.target.value)}
                          className="w-12 border-x border-[var(--ui-border-strong)] py-1 text-center text-[length:var(--ui-font-size-xs)] font-bold tabular-nums text-[var(--ui-text)] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const q = (Number(item.quantity) || 0) + 1;
                            onUpdateQuantity(idx, String(q));
                          }}
                          className="px-1.5 py-1 bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] text-[var(--ui-text)] font-bold text-xs cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Total */}
                    <td className="text-right font-bold tabular-nums text-[var(--ui-text)] whitespace-nowrap">
                      ৳ {formatMoney(item.total)}
                    </td>

                    {/* Delete Action */}
                    <td className="text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onRequestDelete(idx)}
                        className="p-1 text-[var(--ui-danger)] hover:bg-[var(--ui-danger-light)] rounded-[var(--ui-radius-sm)] transition-colors cursor-pointer"
                        title="Remove Item"
                      >
                        <FaTrash size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center">
                  <span
                    aria-hidden="true"
                    className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ui-surface-sunken)] text-[var(--ui-text-subtle)]"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="20" r="1.4" />
                      <circle cx="18" cy="20" r="1.4" />
                      <path d="M2 3h2.6l2.2 11.3a1.6 1.6 0 0 0 1.6 1.3h8.9a1.6 1.6 0 0 0 1.6-1.3L20 7H6" />
                    </svg>
                  </span>
                  <span className="block text-[13px] font-medium text-[var(--ui-text-muted)]">
                    {emptyMessage}
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TradeLineItemsTable;

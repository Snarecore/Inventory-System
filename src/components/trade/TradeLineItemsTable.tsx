import React from "react";
import { FaTrash } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";

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
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="p-2.5 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-xs font-bold text-black tracking-wider">
          {title} ({lineItems.length})
        </h2>
        <span className="text-[11px] text-black font-medium">
          Subtotal: <span className="font-bold text-black">৳ {formatMoney(subtotal)}</span>
        </span>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full min-w-[720px] text-xs text-left border-collapse">
          <thead>
            <tr className="bg-[#41bef3] border-b border-gray-200 text-[11px] font-semibold text-black shadow-md">
              <th className="py-2 px-2 text-center w-10 whitespace-nowrap">SL</th>
              <th className="py-2 px-3 w-auto min-w-[200px]">Product</th>
              <th className="py-2 px-2 text-center w-16 whitespace-nowrap">Unit</th>
              <th className="py-2 px-2 text-center w-20 whitespace-nowrap">Stock</th>
              <th className="py-2 px-2 text-right w-28 min-w-[100px] whitespace-nowrap">{priceHeader}</th>
              <th className="py-2 px-2 text-center w-28 min-w-[110px] whitespace-nowrap">Quantity</th>
              <th className="py-2 px-3 text-right w-28 min-w-[100px] whitespace-nowrap">Total (৳)</th>
              <th className="py-2 px-2 text-center w-10 whitespace-nowrap"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lineItems.length > 0 ? (
              lineItems.map((item, idx) => {
                const currentPrice = item[priceField] ?? "0";
                return (
                  <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                    {/* SL */}
                    <td className="py-2 px-2 text-center text-gray-700 text-[11px] whitespace-nowrap">
                      {idx + 1}
                    </td>

                    {/* Product Name & Code */}
                    <td className="py-2 px-3">
                      <span className="font-semibold text-black block">{item.productName}</span>
                      {item.productCode && (
                        <span className="text-[10px] text-black">Code: {item.productCode}</span>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <span className="text-black font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                        {item.unit || "pcs"}
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <span className="text-gray-700 font-semibold bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                        {Number(item.stock) || 0}
                      </span>
                    </td>

                    {/* Price (Right Aligned Money Input, No Wheel/Spinners) */}
                    <td className="py-2 px-2 text-right whitespace-nowrap">
                      <div className="relative inline-block w-full">
                        <span className="absolute left-1.5 top-1.5 text-black font-bold text-[11px]">৳</span>
                        <input
                          type="number"
                          step="0.01"
                          value={currentPrice}
                          placeholder="0"
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) => onUpdatePrice(idx, e.target.value)}
                          className="w-full pl-5 pr-1.5 py-1 text-xs border border-gray-300 rounded text-right font-bold text-black focus:outline-none focus:border-[var(--color-primary)]"
                        />
                      </div>
                    </td>

                    {/* Quantity (Stepper) */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <div className="inline-flex items-center border border-gray-300 rounded overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            const q = Math.max(1, (Number(item.quantity) || 1) - 1);
                            onUpdateQuantity(idx, String(q));
                          }}
                          className="px-1.5 py-1 bg-gray-100 hover:bg-gray-200 text-black font-bold text-xs cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          placeholder="1"
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) => onUpdateQuantity(idx, e.target.value)}
                          className="w-12 py-1 text-xs text-center font-bold text-black focus:outline-none border-x border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const q = (Number(item.quantity) || 0) + 1;
                            onUpdateQuantity(idx, String(q));
                          }}
                          className="px-1.5 py-1 bg-gray-100 hover:bg-gray-200 text-black font-bold text-xs cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Total */}
                    <td className="py-2 px-3 text-right font-bold text-black whitespace-nowrap">
                      ৳ {formatMoney(item.total)}
                    </td>

                    {/* Delete Action */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onRequestDelete(idx)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
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
                <td colSpan={8} className="py-8 text-center text-gray-400">
                  {emptyMessage}
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

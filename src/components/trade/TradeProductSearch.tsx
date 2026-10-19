import React from "react";
import { FaSearch, FaBarcode, FaCheck, FaPlus, FaTimes } from "react-icons/fa";
import type { ProductItem } from "@/types";
import { formatMoney } from "@/utils/formatters";
import { showErrorToast } from "@/utils/toast-utils";
import type { UseTradeProductSearchReturn } from "@/hooks/useTradeProductSearch";

export interface TradeProductSearchProps {
  search: UseTradeProductSearchReturn;
  lineItems: any[];
  mode?: "sale" | "purchase";
  isProductAlreadyInList: (product: ProductItem) => boolean;
  onToggleProduct: (product: ProductItem) => void;
  onUpdateLineItem?: (index: number, field: string, val: string) => void;
  showBarcodeScanner?: boolean;
  addBtnText?: string;
  placeholder?: string;
}

export const TradeProductSearch: React.FC<TradeProductSearchProps> = ({
  search,
  lineItems,
  mode = "sale",
  isProductAlreadyInList,
  onToggleProduct,
  onUpdateLineItem,
  showBarcodeScanner,
  addBtnText,
  placeholder,
}) => {
  const {
    searchQuery,
    setSearchQuery,
    barcodeInput,
    isDropdownOpen,
    setIsDropdownOpen,
    searchRef,
    filteredProducts,
    handleBarcodeChange,
    handleBarcodeScan,
    handleBarcodePaste,
    handleKeyDownSearch,
  } = search;

  const shouldShowBarcode = showBarcodeScanner ?? (mode === "sale");
  const defaultPlaceholder =
    placeholder ||
    (mode === "sale"
      ? "Search product name, code to add..."
      : "Search product name, code, or scan barcode to add...");
  const defaultAddText =
    addBtnText || (mode === "purchase" ? "Add Your Product" : "Add Product");

  return (
    <div
      className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs relative"
      ref={searchRef}
    >
      <div className="flex items-center gap-2">
        {/* Barcode Quick Scan */}
        {shouldShowBarcode && (
          <div className="relative w-44 sm:w-56 shrink-0 hidden sm:block">
            <FaBarcode className="absolute left-2.5 top-2.5 text-gray-400 text-xs" />
            <input
              type="text"
              placeholder="Scan barcode..."
              value={barcodeInput}
              onChange={(e) => handleBarcodeChange(e.target.value)}
              onKeyDown={handleBarcodeScan}
              onPaste={handleBarcodePaste}
              className="w-full pl-7 pr-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-medium text-black h-9 bg-gray-50/50"
            />
          </div>
        )}

        {/* Search Product Input */}
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-2.5 text-gray-400 text-xs" />
          <input
            type="text"
            placeholder={defaultPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            onKeyDown={handleKeyDownSearch}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[var(--primary-color)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 bg-gray-50/40 focus:bg-white font-medium text-black placeholder:text-gray-400 placeholder:text-xs h-9 transition-all"
          />
        </div>

        {/* Dynamic Action Button */}
        {isDropdownOpen ? (
          <button
            type="button"
            onClick={() => {
              setIsDropdownOpen(false);
              setSearchQuery("");
            }}
            className="px-3 sm:px-3.5 h-9 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer bg-gray-100 hover:bg-gray-200 text-black border border-gray-300"
          >
            <FaTimes size={11} className="text-gray-600" />
            <span>Cancel</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsDropdownOpen(true)}
            className="px-3 sm:px-3.5 h-9 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] text-white"
          >
            <FaPlus size={10} className="text-white" />
            <span className="hidden sm:inline">{defaultAddText}</span>
            <span className="sm:hidden">Add</span>
          </button>
        )}
      </div>

      {/* Product Dropdown */}
      {isDropdownOpen && (
        <div className="absolute left-2.5 right-2.5 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-72 overflow-y-auto z-20 divide-y divide-gray-100">
          {/* Header */}
          <div className="px-3 py-1.5 bg-slate-50 border-b border-gray-200 flex items-center justify-between text-[10px] font-semibold text-gray-500 uppercase tracking-wider sticky top-0 z-10">
            <span>Select Product</span>
            <div className="flex items-center gap-6 pr-2">
              <span>Stock</span>
              <span>{mode === "purchase" ? "Buy Rate" : "Sale Rate"}</span>
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            filteredProducts.map((p) => {
              const prodKey = String(p.id ?? p.pcode ?? "");
              const isAlreadyInList = isProductAlreadyInList(p);
              const pCodeStr = String(p.pcode || "").toLowerCase();
              const existingIndex = lineItems.findIndex(
                (item) =>
                  (p.id && String(item.productId) === String(p.id)) ||
                  (pCodeStr && String(item.productCode).toLowerCase() === pCodeStr)
              );
              const cartItem = existingIndex > -1 ? lineItems[existingIndex] : null;
              const cartQty = Number(cartItem?.quantity || 0);
              const totalStock = Number(p.quantity ?? 0);
              const remainingStock = Math.max(0, totalStock - cartQty);
              const isOutOfStock = mode === "sale" && totalStock <= 0;
              const defaultPrice = Number(
                mode === "purchase" ? p.buyPrice ?? 0 : p.sellPrice ?? 0
              );
              const prodName = p.name || "Product";
              const prodCode = p.pcode || "N/A";
              const prodUnit = (p as any).secondary_unit || (p as any).secondaryUnit || p.unit || "pcs";
              const priceFieldName =
                mode === "purchase" ? "buyPrice" : "sellPrice";

              return (
                <div
                  key={prodKey}
                  onClick={() => {
                    if (isOutOfStock && !isAlreadyInList) {
                      showErrorToast(
                        `"${prodName}" is out of stock (Stock: 0)`
                      );
                      return;
                    }
                    onToggleProduct(p);
                  }}
                  className={`p-2 sm:p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors select-none cursor-pointer ${
                    isOutOfStock && !isAlreadyInList
                      ? "opacity-60 bg-gray-50/90 cursor-not-allowed border-l-4 border-l-rose-300"
                      : isAlreadyInList
                      ? "bg-sky-50/70 hover:bg-sky-100/70 border-l-4 border-l-[var(--color-primary)]"
                      : "hover:bg-gray-50 border-l-4 border-l-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Checkbox box */}
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                        isOutOfStock && !isAlreadyInList
                          ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
                          : isAlreadyInList
                          ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                          : "border-gray-300 bg-white hover:border-[var(--color-primary)]"
                      }`}
                      title={
                        isAlreadyInList
                          ? "Click to remove from list"
                          : "Click to add to list"
                      }
                    >
                      {isAlreadyInList && <FaCheck size={9} />}
                      {isOutOfStock && !isAlreadyInList && (
                        <span className="text-[10px] text-rose-500 font-bold">
                          ✕
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`font-bold truncate ${
                            isOutOfStock && !isAlreadyInList
                              ? "text-gray-500 line-through decoration-rose-400"
                              : isAlreadyInList
                              ? "text-[var(--color-primary)]"
                              : "text-black"
                          }`}
                        >
                          {prodName}
                        </span>
                        {isAlreadyInList && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded font-semibold whitespace-nowrap">
                            Added in list
                          </span>
                        )}
                        {isOutOfStock && !isAlreadyInList && (
                          <span className="text-[10px] bg-rose-100 text-rose-700 border border-rose-300 px-1.5 py-0.2 rounded font-bold whitespace-nowrap">
                            Stock Out / স্টক নেই
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500">
                        Code:{" "}
                        <span className="text-black font-medium">
                          {prodCode}
                        </span>{" "}
                        | Unit:{" "}
                        <span className="text-black font-medium">
                          {prodUnit}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Stock & Rate Badges */}
                  <div
                    className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-start sm:self-center"
                    onClick={(e) => {
                      if (isAlreadyInList) e.stopPropagation();
                    }}
                  >
                    {/* Current / Available Stock */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        Stock:
                      </span>
                      <span className="text-xs font-bold text-gray-900">
                        {mode === "sale" ? (
                          totalStock <= 0 ? (
                            <span className="text-rose-600">0</span>
                          ) : (
                            <>
                              {remainingStock}{" "}
                              <span className="text-[10px] font-normal text-gray-600">
                                {prodUnit}
                              </span>
                            </>
                          )
                        ) : (
                          <>
                            {totalStock}{" "}
                            <span className="text-[10px] font-normal text-gray-600">
                              {prodUnit}
                            </span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Rate & Cart Qty */}
                    {isAlreadyInList &&
                    existingIndex !== -1 &&
                    onUpdateLineItem ? (
                      <div className="flex items-center gap-2">
                        {/* Editable Qty */}
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-300 shadow-2xs">
                          <span className="text-[10px] font-bold text-sky-800">
                            Qty:
                          </span>
                          <input
                            type="number"
                            min="1"
                            max={
                              mode === "sale" && totalStock > 0
                                ? totalStock
                                : undefined
                            }
                            step="1"
                            value={lineItems[existingIndex].quantity}
                            placeholder="1"
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => {
                              onUpdateLineItem(
                                existingIndex,
                                "quantity",
                                e.target.value
                              );
                            }}
                            className="w-12 sm:w-14 px-1 py-0.5 text-xs font-bold text-sky-950 bg-white border border-sky-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 text-center"
                            title={`Edit Quantity${
                              mode === "sale" ? ` (Max: ${totalStock})` : ""
                            }`}
                          />
                          <span className="text-[10px] text-sky-700 font-medium">
                            {prodUnit}
                          </span>
                        </div>

                        {/* Editable Rate */}
                        <div
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-md shadow-2xs ${
                            mode === "purchase"
                              ? "bg-amber-50 border border-amber-300"
                              : "bg-emerald-50 border border-emerald-300"
                          }`}
                        >
                          <span
                            className={`text-[10px] font-bold ${
                              mode === "purchase"
                                ? "text-amber-800"
                                : "text-emerald-800"
                            }`}
                          >
                            Rate: ৳
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={lineItems[existingIndex][priceFieldName]}
                            placeholder="0"
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => {
                              onUpdateLineItem(
                                existingIndex,
                                priceFieldName,
                                e.target.value
                              );
                            }}
                            className={`w-16 sm:w-20 px-1 py-0.5 text-xs font-bold bg-white rounded focus:outline-none focus:ring-1 text-right ${
                              mode === "purchase"
                                ? "text-amber-950 border border-amber-300 focus:ring-amber-500"
                                : "text-emerald-950 border border-emerald-300 focus:ring-emerald-500"
                            }`}
                            title={`Edit ${
                              mode === "purchase" ? "Buy" : "Sale"
                            } Price`}
                          />
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${
                          mode === "purchase"
                            ? "bg-amber-50 border border-amber-200"
                            : "bg-emerald-50 border border-emerald-200"
                        }`}
                      >
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider ${
                            mode === "purchase"
                              ? "text-amber-800"
                              : "text-emerald-800"
                          }`}
                        >
                          {mode === "purchase" ? "Buy Rate:" : "Sale Rate:"}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            mode === "purchase"
                              ? "text-amber-950"
                              : "text-emerald-950"
                          }`}
                        >
                          ৳ {formatMoney(defaultPrice)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-gray-400 text-xs">
              No products found matching query.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TradeProductSearch;

import React from "react";
import { FaSearch, FaBarcode, FaCheck, FaPlus, FaTimes } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import TextInput from "@/components/form/TextInput";
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
  const { t } = useTranslation();
  const {
    searchQuery,
    setSearchQuery,
    isDropdownOpen,
    setIsDropdownOpen,
    searchRef,
    filteredProducts,
    handleUnifiedChange,
    handleUnifiedKeyDown,
    handleUnifiedPaste,
  } = search;

  const shouldShowBarcode = showBarcodeScanner ?? (mode === "sale");
  const defaultPlaceholder =
    placeholder ||
    (shouldShowBarcode
      ? "Scan barcode or search product name / code…"
      : "Search product name or code…");
  const defaultAddText =
    addBtnText || (mode === "purchase" ? "Add Your Product" : "Add Product");

  return (
    <div
      className="bg-[var(--ui-surface)] p-2.5 rounded-[var(--ui-radius-lg)] border border-[var(--ui-border)] shadow-[var(--ui-shadow-control)] relative"
      ref={searchRef}
    >
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <TextInput
            icon={
              shouldShowBarcode ? (
                <FaBarcode className="text-[var(--ui-text-subtle)] text-xs" />
              ) : (
                <FaSearch className="text-[var(--ui-text-subtle)] text-xs" />
              )
            }
            placeholder={t(defaultPlaceholder)}
            value={searchQuery}
            onChange={(val) => handleUnifiedChange(val)}
            onKeyDown={handleUnifiedKeyDown}
            onPaste={handleUnifiedPaste}
            autoFocus
            wrapperClass="ui-control-sm !border-[var(--primary-color)] bg-[var(--ui-surface-muted)]/40 focus-within:bg-[var(--ui-surface)]"
            inputClass="font-medium text-[var(--ui-text)]"
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
            className="px-3 sm:px-3.5 h-[var(--ui-control-h-sm)] rounded-[var(--ui-radius)] text-[length:var(--ui-font-size-sm)] font-semibold flex items-center gap-1.5 transition-all shadow-[var(--ui-shadow-control)] shrink-0 cursor-pointer bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] text-[var(--ui-text)] border border-[var(--ui-border-strong)]"
          >
            <FaCheck size={11} className="text-emerald-600 dark:text-emerald-400" />
            <span>{t("Okay")}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsDropdownOpen(true)}
            className="px-3 sm:px-3.5 h-[var(--ui-control-h-sm)] rounded-[var(--ui-radius)] text-[length:var(--ui-font-size-sm)] font-bold flex items-center gap-1.5 transition-all shadow-[var(--ui-shadow-control)] shrink-0 cursor-pointer bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] text-white"
          >
            <FaPlus size={10} className="text-white" />
            <span className="hidden sm:inline">{t(defaultAddText)}</span>
            <span className="sm:hidden">{t("Add")}</span>
          </button>
        )}
      </div>

      {/* Product Dropdown */}
      {isDropdownOpen && (
        <div className="absolute left-2.5 right-2.5 mt-1 bg-[var(--ui-surface)] rounded-[var(--ui-radius)] shadow-[var(--ui-shadow-popover)] border border-[var(--ui-border)] max-h-80 sm:max-h-96 overflow-y-auto z-20 divide-y divide-[var(--ui-border)]">
          {/* Header */}
          <div className="px-3 py-1.5 bg-[var(--ui-surface-muted)] border-b border-[var(--ui-border)] flex items-center justify-between text-[10px] font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider sticky top-0 z-10">
            <span>Select Product ({filteredProducts.length})</span>
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
                  className={`px-3 py-1.5 sm:py-2 flex items-center justify-between gap-2 text-xs transition-colors select-none cursor-pointer ${
                    isOutOfStock && !isAlreadyInList
                      ? "opacity-60 bg-[var(--ui-surface-muted)]/90 cursor-not-allowed border-l-4 border-l-rose-300"
                      : isAlreadyInList
                      ? "bg-[var(--primary-color-light)]/70 hover:bg-[var(--primary-color-muted)]/70 border-l-4 border-l-[var(--color-primary)]"
                      : "hover:bg-[var(--ui-surface-muted)] border-l-4 border-l-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Checkbox box */}
                    <div
                      className={`w-4 h-4 rounded-[var(--ui-radius-sm)] border flex items-center justify-center transition-colors shrink-0 ${
                        isOutOfStock && !isAlreadyInList
                          ? "border-[var(--ui-border-strong)] bg-[var(--ui-surface-sunken)] text-[var(--ui-text-subtle)] cursor-not-allowed"
                          : isAlreadyInList
                          ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                          : "border-[var(--ui-border-strong)] bg-[var(--ui-surface)] hover:border-[var(--color-primary)]"
                      }`}
                      title={
                        isAlreadyInList
                          ? "Click to remove from list"
                          : "Click to add to list"
                      }
                    >
                      {isAlreadyInList && <FaCheck size={9} />}
                      {isOutOfStock && !isAlreadyInList && (
                        <span className="text-[10px] text-[var(--ui-danger)] font-bold">
                          ✕
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                      <span
                        className={`font-bold text-xs truncate max-w-[200px] sm:max-w-sm ${
                          isOutOfStock && !isAlreadyInList
                            ? "text-[var(--ui-text-muted)] line-through decoration-rose-400"
                            : isAlreadyInList
                            ? "text-[var(--color-primary)]"
                            : "text-[var(--ui-text)]"
                        }`}
                      >
                        {prodName}
                      </span>
                      <span className="text-[11px] text-[var(--ui-text-muted)] whitespace-nowrap shrink-0 flex items-center gap-1.5">
                        <span className="text-[var(--ui-text-subtle)]">|</span>
                        <span>
                          Code: <span className="text-[var(--ui-text)] font-medium">{prodCode}</span>
                        </span>
                        <span className="text-[var(--ui-text-subtle)]">|</span>
                        <span>
                          Unit: <span className="text-[var(--ui-text)] font-medium">{prodUnit}</span>
                        </span>
                      </span>
                      {isAlreadyInList && (
                        <span className="text-[10px] bg-[var(--ui-success-border)] text-[var(--ui-success-dark)] border border-[var(--ui-success-border)] px-1.5 py-0.5 rounded-[var(--ui-radius-sm)] font-semibold whitespace-nowrap shrink-0">
                          Added in list
                        </span>
                      )}
                      {isOutOfStock && !isAlreadyInList && (
                        <span className="text-[10px] bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)] border border-[var(--ui-danger-border)] px-1.5 py-0.5 rounded-[var(--ui-radius-sm)] font-bold whitespace-nowrap shrink-0">
                          Stock Out
                        </span>
                      )}
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
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ui-radius-sm)] bg-[var(--ui-surface-sunken)] border border-[var(--ui-border)]">
                      <span className="text-[10px] font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider">
                        Stock:
                      </span>
                      <span className="text-xs font-bold text-[var(--ui-text)]">
                        {mode === "sale" ? (
                          totalStock <= 0 ? (
                            <span className="text-[var(--ui-danger)]">0</span>
                          ) : (
                            <>
                              {remainingStock}{" "}
                              <span className="text-[10px] font-normal text-[var(--ui-text-muted)]">
                                {prodUnit}
                              </span>
                            </>
                          )
                        ) : (
                          <>
                            {totalStock}{" "}
                            <span className="text-[10px] font-normal text-[var(--ui-text-muted)]">
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
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-[var(--ui-radius-sm)] bg-[var(--primary-color-light)] border border-[var(--primary-color-muted)] shadow-[var(--ui-shadow-control)]">
                          <span className="text-[10px] font-bold text-[var(--primary-color-dark)]">
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
                            className="w-12 sm:w-14 px-1 py-0.5 text-xs font-bold text-[var(--primary-color-dark)] bg-[var(--ui-surface)] border border-[var(--primary-color-muted)] rounded-[var(--ui-radius-sm)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] text-center"
                            title={`Edit Quantity${
                              mode === "sale" ? ` (Max: ${totalStock})` : ""
                            }`}
                          />
                          <span className="text-[10px] text-[var(--primary-color-dark)] font-medium">
                            {prodUnit}
                          </span>
                        </div>

                        {/* Editable Rate */}
                        <div
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-[var(--ui-radius-sm)] shadow-[var(--ui-shadow-control)] ${
                            mode === "purchase"
                              ? "bg-[var(--ui-warning-light)] border border-[var(--ui-warning-border)]"
                              : "bg-[var(--ui-success-light)] border border-[var(--ui-success-border)]"
                          }`}
                        >
                          <span
                            className={`text-[10px] font-bold ${
                              mode === "purchase"
                                ? "text-[var(--ui-warning-dark)]"
                                : "text-[var(--ui-success-dark)]"
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
                            className={`w-16 sm:w-20 px-1 py-0.5 text-xs font-bold bg-[var(--ui-surface)] rounded-[var(--ui-radius-sm)] focus:outline-none focus:ring-1 text-right ${
                              mode === "purchase"
                                ? "text-[var(--ui-warning-dark)] border border-[var(--ui-warning-border)] focus:ring-[var(--ui-warning)]"
                                : "text-[var(--ui-success-dark)] border border-[var(--ui-success-border)] focus:ring-[var(--ui-success)]"
                            }`}
                            title={`Edit ${
                              mode === "purchase" ? "Buy" : "Sale"
                            } Price`}
                          />
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ui-radius-sm)] ${
                          mode === "purchase"
                            ? "bg-[var(--ui-warning-light)] border border-[var(--ui-warning-border)]"
                            : "bg-[var(--ui-success-light)] border border-[var(--ui-success-border)]"
                        }`}
                      >
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider ${
                            mode === "purchase"
                              ? "text-[var(--ui-warning-dark)]"
                              : "text-[var(--ui-success-dark)]"
                          }`}
                        >
                          {mode === "purchase" ? "Buy Rate:" : "Sale Rate:"}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            mode === "purchase"
                              ? "text-[var(--ui-warning-dark)]"
                              : "text-[var(--ui-success-dark)]"
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
            <div className="p-4 text-center text-[var(--ui-text-subtle)] text-xs">
              No products found matching query.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TradeProductSearch;

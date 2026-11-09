import React, { useState, useEffect } from "react";
import DrawerModal from "@/components/modal/DrawerModal";
import DatePicker from "@/components/common/DatePicker";
import TextInput from "@/components/form/TextInput";
import { useSaveStockAdjustmentMutation } from "@/hooks/useStockAdjustment";
import type {
  ProductItem,
  SaveStockAdjustmentPayload,
  StockAdjustmentType,
} from "@/types";
import {
  FaSearch,
  FaTimes,
  FaPlus,
  FaMinus,
  FaExclamationTriangle,
  FaSpinner,
} from "react-icons/fa";
import { usePermission } from "@/hooks/usePermission";

interface StockAdjustmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductItem[];
  onSuccess?: () => void;
}

interface ProductAdjustmentState {
  qty: string;
  type: StockAdjustmentType;
}

const formatUnit = (rawUnit?: string) => {
  const raw = String(rawUnit || "").trim();
  if (!raw || raw.toLowerCase().includes("dozen") || raw.toLowerCase() === "units" || raw.toLowerCase() === "unit") {
    return "Pcs";
  }
  return raw;
};

export const StockAdjustmentDrawer: React.FC<StockAdjustmentDrawerProps> = ({
  isOpen,
  onClose,
  products,
  onSuccess,
}) => {
  const { canCreate } = usePermission();
  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  // Per-product adjustment map: productId -> { qty, type }
  const [adjustments, setAdjustments] = useState<Record<number, ProductAdjustmentState>>({});

  // Date & General Remarks
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [remarks, setRemarks] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset state when drawer opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setAdjustments({});
      setDate(new Date().toISOString().split("T")[0]);
      setRemarks("");
      setSubmitError(null);
    }
  }, [isOpen]);

  const saveMutation = useSaveStockAdjustmentMutation({
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  // Filter products by search query (name or pcode or id)
  const q = searchQuery.trim().toLowerCase();
  const filteredProducts = (products || []).filter((p) => {
    if (!q) return true;
    const name = String(p.name || "").toLowerCase();
    const pcode = String(p.pcode || p.productCode || "").toLowerCase();
    const id = String(p.id || "");
    return name.includes(q) || pcode.includes(q) || id.includes(q);
  });

  // Handle quantity change for a product
  const handleQtyChange = (productId: number, val: string) => {
    setAdjustments((prev) => {
      const current = prev[productId] || { qty: "", type: "IN" };
      return {
        ...prev,
        [productId]: {
          ...current,
          qty: val,
        },
      };
    });
    setSubmitError(null);
  };

  // Stepper increment / decrement
  const handleStep = (productId: number, delta: number) => {
    setAdjustments((prev) => {
      const current = prev[productId] || { qty: "", type: "IN" };
      const currentNum = Number(current.qty) || 0;
      const nextNum = Math.max(0, currentNum + delta);
      return {
        ...prev,
        [productId]: {
          ...current,
          qty: nextNum === 0 ? "" : String(nextNum),
        },
      };
    });
    setSubmitError(null);
  };

  // Handle IN / OUT toggle for a product
  const handleToggleType = (productId: number, newType: StockAdjustmentType) => {
    setAdjustments((prev) => {
      const current = prev[productId] || { qty: "", type: "IN" };
      return {
        ...prev,
        [productId]: {
          ...current,
          type: newType,
        },
      };
    });
  };

  // Count of items selected for adjustment
  const selectedCount = Object.values(adjustments).filter((a) => Number(a.qty) > 0).length;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!canCreate("stock_adjustment")) {
      setSubmitError("You do not have permission to record stock adjustments.");
      return;
    }

    // Collect all products where qty > 0
    const itemsToSave: {
      productId: number;
      adjustmentQty: number;
      adjustmentType: "IN" | "OUT";
      price: number;
      remarks: string;
    }[] = [];

    (products || []).forEach((p) => {
      const adj = adjustments[Number(p.id)];
      if (!adj) return;
      const q = Number(adj.qty) || 0;
      if (q > 0) {
        const price = Number(
          p.purchasePrice ?? p.buyPrice ?? p.price ?? p.sellPrice ?? 0
        );
        itemsToSave.push({
          productId: Number(p.id),
          adjustmentQty: q,
          adjustmentType: adj.type,
          price,
          remarks: remarks.trim(),
        });
      }
    });

    if (itemsToSave.length === 0) {
      setSubmitError("Please enter quantity for at least one product");
      return;
    }

    const payload: SaveStockAdjustmentPayload = {
      adjustmentType: "IN",
      date,
      note: remarks.trim(),
      remarks: remarks.trim(),
      items: itemsToSave,
    };

    saveMutation.mutate(payload);
  };

  return (
    <DrawerModal
      isOpen={isOpen}
      onClose={onClose}
      title="Stock Adjustment"
      maxWidth="max-w-[420px] sm:max-w-[450px]"
      onSubmit={handleSubmit}
      footerButtons={
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="text-[11px] text-[var(--ui-text-muted)] font-medium truncate">
            {selectedCount > 0 ? (
              <span>
                <strong className="text-[var(--primary-color)]">
                  {selectedCount}
                </strong>{" "}
                product{selectedCount > 1 ? "s" : ""} selected
              </span>
            ) : (
              <span>No products adjusted yet</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saveMutation.isPending}
              className="h-8 px-3 text-xs font-medium rounded-md border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending || selectedCount === 0 || !canCreate("stock_adjustment")}
              className="h-8 px-4 text-xs font-semibold rounded-md bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-none"
            >
              {saveMutation.isPending ? (
                <>
                  <FaSpinner className="animate-spin -ml-0.5 text-white" size={13} />
                  <span>Saving...</span>
                </>
              ) : (
                <span>
                  {selectedCount > 0
                    ? `Save Adjustment (${selectedCount})`
                    : "Save Adjustment"}
                </span>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-2.5 text-left text-xs pb-1">
        {/* 1. SEARCH BAR & DATE PICKER SIDE-BY-SIDE AT THE TOP */}
        <div className="grid grid-cols-[1fr_135px] sm:grid-cols-[1fr_145px] gap-2 items-center w-full">
          {/* Search Input */}
          <div className="relative flex items-center w-full">
            <FaSearch
              size={11}
              className="absolute left-2.5 text-[var(--ui-text-subtle)] pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-7 pr-6 text-xs bg-[var(--ui-surface)] text-[var(--ui-text)] border border-[var(--ui-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] placeholder:text-[var(--ui-text-subtle)] shadow-xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-[var(--ui-text-subtle)] hover:text-[var(--ui-text)] p-0.5 cursor-pointer"
              >
                <FaTimes size={10} />
              </button>
            )}
          </div>

          {/* Date Picker using project's DatePicker */}
          <div className="w-full">
            <DatePicker
              value={date}
              onChange={(dateStr) =>
                setDate(dateStr || new Date().toISOString().split("T")[0])
              }
              size="sm"
              isClearable={false}
              placeholder="Select Date"
              align="right"
            />
          </div>
        </div>

        {/* Error message if user tries to submit without selecting any quantity */}
        {submitError && (
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-[var(--ui-danger-light)] text-[var(--ui-danger)] text-xs border border-[var(--ui-danger-border)]">
            <FaExclamationTriangle size={12} className="shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* 2. PRODUCT ADJUSTMENT LIST */}
        <div className="flex flex-col gap-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-0.5 custom-scrollbar">
          {filteredProducts.length === 0 ? (
            <div className="py-10 text-center text-xs text-[var(--ui-text-subtle)] flex flex-col items-center gap-1">
              <span>No matching products found.</span>
              <span className="text-[10px] text-[var(--ui-text-muted)]">
                Try searching with another product name or P-Code.
              </span>
            </div>
          ) : (
            filteredProducts.map((p, index) => {
              const productId = Number(p.id);
              const adj = adjustments[productId] || { qty: "", type: "IN" };
              const numQty = Number(adj.qty) || 0;
              const hasQty = numQty > 0;
              const isOut = adj.type === "OUT";
              const currentStock = Number(p.quantity ?? p.stock ?? 0);
              const pcode = p.pcode || p.productCode || String(p.id);
              const unit = formatUnit(p.unit || p.secondary_unit);

              return (
                <div
                  key={productId}
                  className={`p-2.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                    hasQty
                      ? "bg-[var(--ui-surface)] border-[var(--primary-color-muted)] shadow-xs"
                      : "bg-[var(--ui-surface)]/80 hover:bg-[var(--ui-surface)] border-[var(--ui-border)]"
                  }`}
                >
                  {/* Main Product Row: Index | P-Code - Name & Stock Badge | [IN] [OUT] | [ Qty ] */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Left: Serial Index (1., 2., 3... in solid black font) */}
                    <span className="text-xs font-bold text-black dark:text-white w-5 text-center shrink-0">
                      {index + 1}.
                    </span>

                    {/* Middle-Left: P-Code - Name (Line 1) & Stock Badge (Line 2) */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-bold text-xs text-[var(--ui-text)] truncate" title={`${pcode} - ${p.name}`}>
                        {pcode} - {p.name}
                      </span>
                      <div className="flex items-center mt-0.5">
                        <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--primary-color-light)] text-[var(--primary-color)] w-fit">
                          Stock: {currentStock} {unit}
                        </span>
                      </div>
                    </div>

                    {/* Middle-Right: IN / OUT Segmented Toggle */}
                    <div className="flex items-center bg-[var(--ui-surface-sunken)] p-0.5 rounded-lg border border-[var(--ui-border)] shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleType(productId, "IN")}
                        className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                          !isOut
                            ? "bg-[var(--ui-success)] text-white shadow-xs"
                            : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
                        }`}
                      >
                        IN
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleType(productId, "OUT")}
                        className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                          isOut
                            ? "bg-[var(--ui-danger)] text-white shadow-xs"
                            : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
                        }`}
                      >
                        OUT
                      </button>
                    </div>

                    {/* Right: Quantity Input Box with Steppers */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStep(productId, -1)}
                        className="w-6 h-7 flex items-center justify-center rounded bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] text-[var(--ui-text)] transition-colors cursor-pointer"
                        title="Decrease"
                      >
                        <FaMinus size={8} />
                      </button>

                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={adj.qty}
                        onChange={(e) => handleQtyChange(productId, e.target.value)}
                        className={`w-12 h-7 text-center text-xs font-bold rounded-lg border focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] transition-all ${
                          hasQty
                            ? "bg-[var(--primary-color-light)]/40 border-[var(--primary-color-muted)] text-[var(--primary-color)]"
                            : "bg-[var(--ui-surface)] border-[var(--ui-border)] text-[var(--ui-text)]"
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => handleStep(productId, 1)}
                        className="w-6 h-7 flex items-center justify-center rounded bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] text-[var(--ui-text)] transition-colors cursor-pointer"
                        title="Increase"
                      >
                        <FaPlus size={8} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 3. REMARKS / NOTE AT BOTTOM */}
        <div className="pt-2 border-t border-[var(--ui-border)]">
          <TextInput
            label="Remarks / Note"
            name="remarks"
            value={remarks}
            onChange={(val) =>
              setRemarks(typeof val === "string" ? val : (val as any)?.target?.value ?? "")
            }
            placeholder="Remarks / Note (মন্তব্য)..."
            size="sm"
          />
        </div>
      </div>
    </DrawerModal>
  );
};

export default StockAdjustmentDrawer;

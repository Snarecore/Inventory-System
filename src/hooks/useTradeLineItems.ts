import { useState, useMemo, useEffect, useCallback } from "react";
import { showErrorToast, showDeleteToast } from "@/utils/toast-utils";
import type { ProductItem } from "@/types";

export interface TradeLineItem {
  id?: string | number;
  detailId?: string | number;
  saleDetailId?: string | number;
  purchaseDetailId?: string | number;
  productId: string | number;
  productCode: string;
  productName: string;
  unit: string;
  sellPrice?: string;
  buyPrice?: string | number;
  quantity: string;
  discount?: string;
  vat?: string;
  total: number;
  stock?: number | string;
  returnedQty?: number;
  originalQty?: number;
}

export interface UseTradeLineItemsOptions {
  mode: "sale" | "purchase";
  allProducts: ProductItem[];
  initialItems?: TradeLineItem[];
}

const computeItemTotal = (
  mode: "sale" | "purchase",
  p: number,
  q: number,
  v: number,
  d: number = 0
) => {
  const base = p * q;
  if (mode === "purchase") {
    const vatAmt = (base * v) / 100;
    return Math.round((base + vatAmt) * 100) / 100;
  }
  return Math.max(0, base + v - d);
};

export const useTradeLineItems = ({
  mode,
  allProducts,
  initialItems = [],
}: UseTradeLineItemsOptions) => {
  const [lineItems, setLineItems] = useState<TradeLineItem[]>(initialItems);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemIndexToDelete, setItemIndexToDelete] = useState<number | null>(null);

  const priceField = mode === "sale" ? "sellPrice" : "buyPrice";

  // Check if a product is already in line items
  const isProductAlreadyInList = useCallback(
    (p: ProductItem) => {
      const pId = String(p.id ?? "");
      const pCode = (p.pcode || p.productCode || "").trim().toLowerCase();

      return lineItems.some((item) => {
        if (pId && item.productId && String(item.productId) === pId) return true;
        if (pCode && item.productCode && item.productCode.trim().toLowerCase() === pCode) return true;
        return false;
      });
    },
    [lineItems]
  );

  // Toggle adding or removing a product from list
  const handleToggleProductInList = useCallback(
    (p: ProductItem) => {
      const pId = String(p.id ?? "");
      const pCode = p.pcode || p.productCode || "";
      const pName = p.name || "Product";
      const unit = (p as any).secondary_unit || (p as any).secondaryUnit || p.unit || "pcs";
      const sellPrice = Number(p.sellPrice ?? 0);
      const buyPrice = Number(p.buyPrice ?? 0);
      const stock = Number(p.quantity ?? 0);

      const isAlreadyIn = isProductAlreadyInList(p);

      if (isAlreadyIn) {
        setLineItems((prev) =>
          prev.filter((item) => {
            if (pId && item.productId && String(item.productId) === pId) return false;
            if (pCode && item.productCode && item.productCode.trim().toLowerCase() === pCode.trim().toLowerCase()) return false;
            return true;
          })
        );
        showDeleteToast(`"${pName}" removed from list!`);
      } else {
        if (mode === "sale" && stock <= 0) {
          showErrorToast(`"${pName}" is out of stock (Stock: 0)`);
          return;
        }

        const defaultPrice = mode === "sale" ? sellPrice : buyPrice;
        const newLine: TradeLineItem = {
          productId: pId,
          productCode: pCode,
          productName: pName,
          unit,
          sellPrice: String(sellPrice),
          buyPrice: mode === "purchase" ? (buyPrice > 0 ? String(buyPrice) : "") : buyPrice,
          quantity: "1",
          discount: "",
          vat: "",
          total: defaultPrice,
          stock,
        };
        setLineItems((prev) => [...prev, newLine]);
      }
    },
    [isProductAlreadyInList, mode]
  );

  // Add product or increment existing quantity
  const handleAddProduct = useCallback(
    (p: ProductItem) => {
      const pId = String(p.id ?? "");
      const pCode = (p.pcode || p.productCode || "").trim();
      const pName = p.name || "Product";
      const unit = (p as any).secondary_unit || (p as any).secondaryUnit || p.unit || "pcs";
      const sellPrice = Number(p.sellPrice ?? 0);
      const buyPrice = Number(p.buyPrice ?? 0);
      const stock = Number(p.quantity ?? 0);

      if (mode === "sale" && stock <= 0) {
        showErrorToast(`"${pName}" is out of stock (Stock: 0)`);
        return;
      }

      const existingIndex = lineItems.findIndex(
        (item) =>
          (pId && String(item.productId) === pId) ||
          (pCode && item.productCode.toLowerCase() === pCode.toLowerCase())
      );

      if (existingIndex > -1) {
        const curQty = Number(lineItems[existingIndex].quantity) || 1;
        const newQty = curQty + 1;

        if (mode === "sale" && stock > 0 && newQty > stock) {
          showErrorToast(`Stock limit reached (${stock} ${unit}) for "${pName}"`);
          return;
        }

        const unitPrice =
          mode === "sale"
            ? Number(lineItems[existingIndex].sellPrice) || sellPrice
            : Number(lineItems[existingIndex].buyPrice) || buyPrice;

        const disc = Number(lineItems[existingIndex].discount) || 0;
        const vat = Number(lineItems[existingIndex].vat) || 0;
        const total = computeItemTotal(mode, unitPrice, newQty, vat, disc);

        setLineItems((prev) => {
          const updated = [...prev];
          if (!updated[existingIndex]) return prev;
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: String(newQty),
            total,
          };
          return updated;
        });
      } else {
        const defaultPrice = mode === "sale" ? sellPrice : buyPrice;
        const newLine: TradeLineItem = {
          productId: pId,
          productCode: pCode,
          productName: pName,
          unit,
          sellPrice: String(sellPrice),
          buyPrice: mode === "purchase" ? (buyPrice > 0 ? String(buyPrice) : "") : buyPrice,
          quantity: "1",
          discount: "",
          vat: "",
          total: defaultPrice,
          stock,
        };
        setLineItems((prev) => [...prev, newLine]);
      }
    },
    [lineItems, mode]
  );

  // Update specific field on line item
  const handleUpdateLineItem = useCallback(
    (index: number, field: keyof TradeLineItem, val: string | number) => {
      setLineItems((prev) => {
        if (!prev[index]) return prev;
        const updated = [...prev];
        const target = { ...updated[index], [field]: String(val) };

        let q = Number(field === "quantity" ? val : target.quantity) || 0;
        const itemStock = Number(target.stock ?? 0);

        if (mode === "sale" && field === "quantity" && itemStock > 0 && q > itemStock) {
          showErrorToast(`Quantity cannot exceed available stock (${itemStock})`);
          q = itemStock;
          target.quantity = String(itemStock);
        }

        const p =
          mode === "sale"
            ? Number(field === "sellPrice" ? val : target.sellPrice) || 0
            : Number(field === "buyPrice" ? val : target.buyPrice) || 0;

        const d = Number(field === "discount" ? val : target.discount) || 0;
        const v = Number(field === "vat" ? val : target.vat) || 0;

        target.total = computeItemTotal(mode, p, q, v, d);

        updated[index] = target;
        return updated;
      });
    },
    [mode]
  );

  const handleUpdatePrice = useCallback(
    (idx: number, val: string) => handleUpdateLineItem(idx, priceField, val),
    [handleUpdateLineItem, priceField]
  );

  const handleUpdateQuantity = useCallback(
    (idx: number, val: string) => handleUpdateLineItem(idx, "quantity", val),
    [handleUpdateLineItem]
  );

  const handleRequestDelete = useCallback((idx: number) => {
    setItemIndexToDelete(idx);
    setIsDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (itemIndexToDelete !== null && itemIndexToDelete >= 0) {
      setLineItems((prev) => prev.filter((_, idx) => idx !== itemIndexToDelete));
      setItemIndexToDelete(null);
      setIsDeleteModalOpen(false);
      showDeleteToast("Item removed from list");
    }
  }, [itemIndexToDelete]);

  const handleCloseDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setItemIndexToDelete(null);
  }, []);

  // Sync live stock from allProducts
  useEffect(() => {
    if (allProducts.length > 0 && lineItems.length > 0) {
      setLineItems((prev) => {
        let hasChanges = false;
        const nextLines = prev.map((item) => {
          const pId = String(item.productId || "").trim();
          const pCode = String(item.productCode || "").trim();
          const matched = allProducts.find(
            (p) =>
              (pId && String(p.id ?? p.productId ?? "").trim() === pId) ||
              (pCode && String(p.pcode ?? p.productCode ?? "").trim().toLowerCase() === pCode.toLowerCase())
          );
          if (matched) {
            const liveStock = Number(matched.quantity ?? matched.stock ?? 0);
            if (item.stock !== liveStock) {
              hasChanges = true;
              return { ...item, stock: liveStock };
            }
          }
          return item;
        });
        return hasChanges ? nextLines : prev;
      });
    }
  }, [allProducts, lineItems.length]);

  const rawSubtotal = useMemo(() => {
    if (mode === "purchase") {
      return lineItems.reduce((sum, item) => {
        const p = Number(item.buyPrice) || 0;
        const q = Number(item.quantity) || 0;
        return sum + p * q;
      }, 0);
    }
    return lineItems.reduce((acc, item) => acc + (Number(item.total) || 0), 0);
  }, [lineItems, mode]);

  const lineVatTotal = useMemo(() => {
    if (mode === "purchase") {
      return lineItems.reduce((sum, item) => {
        const p = Number(item.buyPrice) || 0;
        const q = Number(item.quantity) || 0;
        const v = Number(item.vat) || 0;
        return sum + (p * q * v) / 100;
      }, 0);
    }
    return 0;
  }, [lineItems, mode]);

  return {
    lineItems,
    setLineItems,
    rawSubtotal,
    lineVatTotal,
    isProductAlreadyInList,
    handleToggleProductInList,
    handleAddProduct,
    handleUpdateLineItem,
    handleUpdatePrice,
    handleUpdateQuantity,
    handleRequestDelete,
    handleConfirmDelete,
    isDeleteModalOpen,
    handleCloseDeleteModal,
    itemIndexToDelete,
  };
};

export default useTradeLineItems;

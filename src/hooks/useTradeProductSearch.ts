import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { ProductItem } from "@/types";
import { showErrorToast } from "@/utils/toast-utils";

export interface UseTradeProductSearchOptions {
  allProducts: ProductItem[];
  mode?: "sale" | "purchase";
  onAddProduct: (product: ProductItem) => void;
  onToggleProduct?: (product: ProductItem) => void;
  maxResults?: number;
}

export const useTradeProductSearch = ({
  allProducts,
  mode = "sale",
  onAddProduct,
  onToggleProduct,
  maxResults = 10,
}: UseTradeProductSearchOptions) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [barcodeInput, setBarcodeInput] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered Products for Search Dropdown (Instant O(N) in-memory filter)
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return allProducts.slice(0, maxResults);
    const q = searchQuery.toLowerCase().trim();
    return allProducts
      .filter((p) => {
        const name = (p.name || "").toLowerCase();
        const code = (p.productCode || p.pcode || "").toLowerCase();
        const barcode = (p.barcode || "").toLowerCase();
        return name.includes(q) || code.includes(q) || barcode.includes(q);
      })
      .slice(0, maxResults);
  }, [allProducts, searchQuery, maxResults]);

  // Find Product STRICTLY By barcode or pcode
  const findProductByBarcode = useCallback(
    (query: string): ProductItem | undefined => {
      const code = query.trim().toLowerCase();
      if (!code) return undefined;

      return allProducts.find((p) => {
        const barcode = String(p.barcode || "").trim().toLowerCase();
        const pcode = String(p.pcode || p.productCode || "").trim().toLowerCase();
        return Boolean((barcode && barcode === code) || (pcode && pcode === code));
      });
    },
    [allProducts]
  );

  // Process barcode match
  const processBarcodeMatch = useCallback(
    (codeToSearch: string) => {
      const trimmed = codeToSearch.trim();
      if (!trimmed) return false;

      const found = findProductByBarcode(trimmed);
      if (found) {
        const stock = Number(found.quantity ?? found.stock ?? 0);
        if (mode === "sale" && stock <= 0) {
          showErrorToast(`Product "${found.name || "Product"}" is out of stock (Stock: 0)`);
          setBarcodeInput("");
          return true;
        }
        onAddProduct(found);
        setBarcodeInput("");
        return true;
      }
      return false;
    },
    [findProductByBarcode, mode, onAddProduct]
  );

  // Barcode Input Change Handler (Auto-detects exact barcode or pcode match)
  const handleBarcodeChange = useCallback(
    (val: string) => {
      setBarcodeInput(val);
      const trimmed = val.trim();
      if (!trimmed) return;

      const matched = allProducts.find((p) => {
        const barcode = String(p.barcode || "").trim().toLowerCase();
        const pcode = String(p.productCode || p.pcode || "").trim().toLowerCase();
        return Boolean(
          (barcode && barcode === trimmed.toLowerCase()) ||
          (pcode && pcode === trimmed.toLowerCase())
        );
      });

      if (matched) {
        const stock = Number(matched.quantity ?? matched.stock ?? 0);
        if (mode === "sale" && stock <= 0) {
          showErrorToast(`Product "${matched.name || "Product"}" is out of stock (Stock: 0)`);
          setBarcodeInput("");
          return;
        }
        onAddProduct(matched);
        setBarcodeInput("");
      }
    },
    [allProducts, mode, onAddProduct]
  );

  // Barcode Scanning Handler (On Enter key)
  const handleBarcodeScan = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const code = barcodeInput.trim();
        if (!code) return;

        const success = processBarcodeMatch(code);
        if (!success) {
          showErrorToast(`Product with barcode "${barcodeInput}" not found`);
        }
      }
    },
    [barcodeInput, processBarcodeMatch]
  );

  // Barcode Paste Handler (Paste full barcode)
  const handleBarcodePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData("text").trim();
      if (!pasted) return;
      const success = processBarcodeMatch(pasted);
      if (success) {
        e.preventDefault();
      }
    },
    [processBarcodeMatch]
  );

  // Handle Key Down on Product Search (Enter key adds if 1 match)
  const handleKeyDownSearch = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const toggleFn = onToggleProduct || onAddProduct;
        if (filteredProducts.length === 1) {
          toggleFn(filteredProducts[0]);
          return;
        }
        const q = searchQuery.toLowerCase().trim();
        if (!q) return;
        const immediateMatches = allProducts.filter((p) => {
          const name = (p.name || p.productName || "").toLowerCase();
          const pcode = (p.pcode || p.productCode || "").toLowerCase();
          const barcode = (p.barcode || "").toLowerCase();
          return name.includes(q) || pcode.includes(q) || barcode.includes(q);
        });
        if (immediateMatches.length === 1) {
          toggleFn(immediateMatches[0]);
        }
      }
    },
    [filteredProducts, searchQuery, allProducts, onToggleProduct, onAddProduct]
  );

  const resetSearch = useCallback(() => {
    setSearchQuery("");
    setBarcodeInput("");
    setIsDropdownOpen(false);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    barcodeInput,
    setBarcodeInput,
    isDropdownOpen,
    setIsDropdownOpen,
    searchRef,
    filteredProducts,
    handleBarcodeChange,
    handleBarcodeScan,
    handleBarcodePaste,
    handleKeyDownSearch,
    resetSearch,
  };
};

export type UseTradeProductSearchReturn = ReturnType<typeof useTradeProductSearch>;

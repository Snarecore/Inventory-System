import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { ProductItem } from "@/types";
import { showErrorToast } from "@/utils/toast-utils";
import { useDebounce } from "@/hooks/useDebounce";

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
  maxResults,
}: UseTradeProductSearchOptions) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearch = useDebounce(searchQuery, 150);
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
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return typeof maxResults === "number" && maxResults > 0
        ? allProducts.slice(0, maxResults)
        : allProducts;
    }
    const matched = allProducts.filter((p) => {
      const name = String(p.name || p.productName || (p as any).product_name || "").toLowerCase();
      const code = String(p.productCode || p.pcode || (p as any).product_code || "").toLowerCase();
      const barcode = String(p.barcode || "").toLowerCase();
      const sku = String((p as any).sku || "").toLowerCase();
      const category = String(p.category || (p as any).categoryName || "").toLowerCase();
      return (
        name.includes(q) ||
        code.includes(q) ||
        barcode.includes(q) ||
        sku.includes(q) ||
        category.includes(q)
      );
    });
    return typeof maxResults === "number" && maxResults > 0
      ? matched.slice(0, maxResults)
      : matched;
  }, [allProducts, searchQuery, maxResults]);

  // Find Product STRICTLY By barcode or pcode
  const findProductByBarcode = useCallback(
    (query: string): ProductItem | undefined => {
      const code = query.trim().toLowerCase();
      if (!code) return undefined;

      return allProducts.find((p) => {
        const barcode = String(p.barcode || "").trim().toLowerCase();
        const pcode = String(p.pcode || p.productCode || (p as any).product_code || "").trim().toLowerCase();
        return Boolean((barcode && barcode === code) || (pcode && pcode === code));
      });
    },
    [allProducts]
  );

  // Find Product strictly by exact name
  const findProductByName = useCallback(
    (query: string): ProductItem | undefined => {
      const name = query.trim().toLowerCase();
      if (!name) return undefined;

      return allProducts.find((p) => {
        const pName = String(p.name || p.productName || (p as any).product_name || "").trim().toLowerCase();
        return pName === name;
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


  /* ------------------------------------------------------------------
     Unified field: one input that serves both a barcode scanner and
     manual product search.

     A scanner types the whole code in milliseconds and usually sends
     Enter, so every keystroke is first tested for an exact barcode /
     product-code match. On a hit the product is added and the field
     clears, exactly as the dedicated barcode box behaved. Anything that
     is not an exact code simply drives the normal search dropdown.
     ------------------------------------------------------------------ */
  const handleUnifiedChange = useCallback(
    (val: string) => {
      const trimmed = val.trim();

      // Exact code -> add immediately and clear (scanner path).
      if (trimmed && findProductByBarcode(trimmed)) {
        const added = processBarcodeMatch(trimmed);
        if (added) {
          setSearchQuery("");
          setIsDropdownOpen(false);
          return;
        }
      }

      setSearchQuery(val);

      // Auto-open dropdown when user types so matching products appear immediately!
      if (trimmed.length > 0) {
        setIsDropdownOpen(true);
      }
    },
    [findProductByBarcode, processBarcodeMatch]
  );

  const handleUnifiedKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      e.preventDefault();

      const q = searchQuery.trim().toLowerCase();
      if (!q) return;

      // 1. Exact barcode or product code match
      if (findProductByBarcode(q)) {
        if (processBarcodeMatch(q)) {
          setSearchQuery("");
          setIsDropdownOpen(false);
          return;
        }
      }

      // 2. Exact product name match
      const exactNameMatch = findProductByName(q);
      if (exactNameMatch) {
        const stock = Number(exactNameMatch.quantity ?? exactNameMatch.stock ?? 0);
        if (mode === "sale" && stock <= 0) {
          showErrorToast(`Product "${exactNameMatch.name || "Product"}" is out of stock (Stock: 0)`);
          return;
        }
        onAddProduct(exactNameMatch);
        setSearchQuery("");
        setIsDropdownOpen(false);
        return;
      }

      // 3. Matched product from filtered products list
      if (filteredProducts.length > 0) {
        const target = filteredProducts[0];
        const stock = Number(target.quantity ?? target.stock ?? 0);
        if (mode === "sale" && stock <= 0) {
          showErrorToast(`Product "${target.name || "Product"}" is out of stock (Stock: 0)`);
          return;
        }
        onAddProduct(target);
        setSearchQuery("");
        setIsDropdownOpen(false);
        return;
      }

      showErrorToast(`Product "${searchQuery}" not found`);
    },
    [
      searchQuery,
      findProductByBarcode,
      findProductByName,
      processBarcodeMatch,
      filteredProducts,
      mode,
      onAddProduct,
    ]
  );

  const handleUnifiedPaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData("text").trim();
      if (!pasted) return;
      if (findProductByBarcode(pasted) && processBarcodeMatch(pasted)) {
        e.preventDefault();
        setSearchQuery("");
        setIsDropdownOpen(false);
        return;
      }
      setSearchQuery(pasted);
      setIsDropdownOpen(true);
    },
    [findProductByBarcode, processBarcodeMatch]
  );
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
    handleUnifiedChange,
    handleUnifiedKeyDown,
    handleUnifiedPaste,
    resetSearch,
  };
};

export type UseTradeProductSearchReturn = ReturnType<typeof useTradeProductSearch>;

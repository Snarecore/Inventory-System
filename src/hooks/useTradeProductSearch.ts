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
    if (!debouncedSearch.trim()) {
      return typeof maxResults === "number" && maxResults > 0
        ? allProducts.slice(0, maxResults)
        : allProducts;
    }
    const q = debouncedSearch.toLowerCase().trim();
    const matched = allProducts.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const code = (p.productCode || p.pcode || "").toLowerCase();
      const barcode = (p.barcode || "").toLowerCase();
      return name.includes(q) || code.includes(q) || barcode.includes(q);
    });
    return typeof maxResults === "number" && maxResults > 0
      ? matched.slice(0, maxResults)
      : matched;
  }, [allProducts, debouncedSearch, maxResults]);

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

      // Otherwise just update the query. The list is deliberately NOT opened
      // here -- focusing or typing in the field should not drop a panel over
      // the screen. Only the "Add Product" button opens it; if it is already
      // open, typing filters it live.
      setSearchQuery(val);
    },
    [findProductByBarcode, processBarcodeMatch]
  );

  const handleUnifiedKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      const code = searchQuery.trim();
      if (!code) return;

      // Prefer an exact code match, then fall back to search behaviour so a
      // typed partial name still resolves the way it always did.
      if (findProductByBarcode(code)) {
        e.preventDefault();
        if (processBarcodeMatch(code)) {
          setSearchQuery("");
          setIsDropdownOpen(false);
          return;
        }
      }
      handleKeyDownSearch(e);
    },
    [searchQuery, findProductByBarcode, processBarcodeMatch, handleKeyDownSearch]
  );

  const handleUnifiedPaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData("text").trim();
      if (!pasted) return;
      if (findProductByBarcode(pasted) && processBarcodeMatch(pasted)) {
        e.preventDefault();
        setSearchQuery("");
        setIsDropdownOpen(false);
      }
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

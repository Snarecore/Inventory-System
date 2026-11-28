import { useMemo } from "react";
import { useProductListQuery } from "@/hooks/useProductQueries";
import type { ProductItem } from "@/types";

/**
 * Shared hook to fetch, filter and normalize the product list for Trade forms (Sale, Purchase, Returns).
 */
export const useTradeProducts = () => {
  const { data: rawProductData, isLoading, refetch } = useProductListQuery({
    refetchOnMount: "always",
  });

  const allProducts: ProductItem[] = useMemo(() => {
    if (!rawProductData) return [];
    const response =
      typeof rawProductData === "object" && rawProductData !== null
        ? (rawProductData as Record<string, unknown>)
        : undefined;
    const list: any[] = Array.isArray(rawProductData)
      ? rawProductData
      : (response?.productList || response?.productsList || response?.data || []) as any[];

    return list
      .filter((p: any) => String(p.isDeleted || "").trim().toUpperCase() !== "Y")
      .map((p: any) => ({
        ...p,
        id: p.id ?? p.pcode,
        name: p.name || p.productName || p.product_name || "Product",
        productCode: p.pcode || p.productCode || p.product_code || "",
        pcode: p.pcode || p.productCode || p.product_code || "",
        buyPrice: Number(p.buyPrice ?? p.buy_price ?? 0),
        sellPrice: Number(p.sellPrice ?? p.sell_price ?? 0),
        quantity: Number(p.quantity ?? p.stock ?? p.qty ?? 0),
        unit: p.secondary_unit || p.secondaryUnit || p.unit || "pcs",
      }));
  }, [rawProductData]);

  return { allProducts, isLoading, refetch };
};

export default useTradeProducts;

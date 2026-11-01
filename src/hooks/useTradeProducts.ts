import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { productListQueryKey } from "@/config/query-key";
import apiConfig from "@/config/api.json";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import type { ProductItem } from "@/types";

/**
 * Shared hook to fetch, filter and normalize the product list for Trade forms (Sale, Purchase, Returns).
 */
export const useTradeProducts = () => {
  const productListUrl = apiConfig.productList.productListUrl;

  const { data: rawProductData, isLoading, refetch } = useQuery({
    queryKey: [productListQueryKey],
    queryFn: async () => {
      try {
        const res = await postData<any>({
          url: productListUrl,
          body: { accessUser: buildAccessUser() },
        });
        return res;
      } catch {
        return null;
      }
    },
    staleTime: 60 * 1000,
  });

  const allProducts: ProductItem[] = useMemo(() => {
    if (!rawProductData) return [];
    const list: any[] = Array.isArray(rawProductData)
      ? rawProductData
      : rawProductData.productList || rawProductData.productsList || rawProductData.data || [];

    return list
      .filter((p: any) => String(p.isDeleted || "").trim().toUpperCase() !== "Y")
      .map((p: any) => ({
        ...p,
        id: p.id ?? p.pcode,
        name: p.name || "Product",
        productCode: p.pcode || "",
        pcode: p.pcode || "",
        buyPrice: Number(p.buyPrice ?? 0),
        sellPrice: Number(p.sellPrice ?? 0),
        quantity: Number(p.quantity ?? 0),
        unit: p.secondary_unit || p.secondaryUnit || p.unit || "pcs",
      }));
  }, [rawProductData]);

  return { allProducts, isLoading, refetch };
};

export default useTradeProducts;

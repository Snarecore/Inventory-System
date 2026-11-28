import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import {
  productCategoriesListQueryKey,
  productListQueryKey,
  productQueryKey,
  productUnitsListQueryKey,
} from "@/config/query-key";
import {
  fetchProductCategories,
  fetchProductList,
  fetchProductUnits,
  saveProduct,
} from "@/services/product-service";
import { showErrorToast, showSuccessToast } from "@/utils/toast-utils";

export const useProductListQuery = (
  options?: Omit<UseQueryOptions<unknown, Error>, "queryKey" | "queryFn">
) =>
  useQuery({
    queryKey: [productListQueryKey],
    queryFn: fetchProductList,
    refetchOnWindowFocus: false,
    ...options,
  });

export const useProductCategoriesQuery = (
  options?: Omit<UseQueryOptions<unknown, Error>, "queryKey" | "queryFn">
) =>
  useQuery({
    queryKey: [productCategoriesListQueryKey],
    queryFn: fetchProductCategories,
    refetchOnWindowFocus: false,
    ...options,
  });

export const useProductUnitsQuery = (
  options?: Omit<UseQueryOptions<unknown, Error>, "queryKey" | "queryFn">
) =>
  useQuery({
    queryKey: [productUnitsListQueryKey],
    queryFn: fetchProductUnits,
    refetchOnWindowFocus: false,
    ...options,
  });

export const useSaveProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveProduct,
    onSuccess: (response: unknown) => {
      const result =
        response && typeof response === "object"
          ? (response as { msg?: string; message?: string })
          : undefined;
      showSuccessToast(result?.msg || result?.message || "Product saved successfully");
      queryClient.invalidateQueries({ queryKey: [productListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [productQueryKey] });
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to save product");
    },
  });
};

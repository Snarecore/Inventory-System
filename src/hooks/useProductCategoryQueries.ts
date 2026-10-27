import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productCategoryListQueryKey } from "@/config/query-key";
import {
  fetchProductCategoryList,
  insertProductCategory,
  updateProductCategory,
  updateProductCategoryStatus,
  deleteProductCategory,
} from "@/services/product-category-service";
import type {
  ProductCategoryListResponse,
  InsertProductCategoryPayload,
  UpdateProductCategoryPayload,
  UpdateProductCategoryStatusPayload,
  DeleteProductCategoryPayload,
} from "@/types";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";

/**
 * Hook to fetch the product categories list
 */
export const useProductCategoryListQuery = () => {
  return useQuery<ProductCategoryListResponse>({
    queryKey: [productCategoryListQueryKey],
    queryFn: () => fetchProductCategoryList(),
    staleTime: 1000 * 60 * 3, // 3 minutes cache
  });
};

/**
 * Hook to insert a new product category
 */
export const useInsertProductCategoryMutation = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: InsertProductCategoryPayload) => insertProductCategory(payload),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: [productCategoryListQueryKey] });
      showSuccessToast(res?.msg || `Category "${vars.name}" created successfully`);
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to create category");
    },
  });
};

/**
 * Hook to update an existing product category
 */
export const useUpdateProductCategoryMutation = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProductCategoryPayload) => updateProductCategory(payload),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: [productCategoryListQueryKey] });
      showSuccessToast(res?.msg || `Category "${vars.name}" updated successfully`);
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to update category");
    },
  });
};

/**
 * Hook to update product category status (Active / Inactive)
 */
export const useUpdateProductCategoryStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProductCategoryStatusPayload) => updateProductCategoryStatus(payload),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: [productCategoryListQueryKey] });
      showSuccessToast(res?.msg || `Category status changed to ${vars.status}`);
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to update status");
    },
  });
};

/**
 * Hook to delete a product category
 */
export const useDeleteProductCategoryMutation = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DeleteProductCategoryPayload) => deleteProductCategory(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [productCategoryListQueryKey] });
      showSuccessToast(res?.msg || "Category deleted successfully");
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to delete category");
    },
  });
};

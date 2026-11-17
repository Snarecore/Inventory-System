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
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to insert a new product category
 * Performs 1 authoritative GET fetch on create to guarantee valid database ID, sequence & sync
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
 * Hook to update an existing product category (direct cache update, no get API call)
 */
export const useUpdateProductCategoryMutation = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProductCategoryPayload) => updateProductCategory(payload),
    onSuccess: (res, vars) => {
      // Direct cache update: update item in cache directly without calling get API
      queryClient.setQueriesData<ProductCategoryListResponse>(
        { queryKey: [productCategoryListQueryKey] },
        (oldData) => {
          if (!oldData || !Array.isArray(oldData.categoryList)) return oldData;
          return {
            ...oldData,
            categoryList: oldData.categoryList.map((item) =>
              item.id === vars.id
                ? {
                    ...item,
                    name: vars.name,
                    description: vars.description !== undefined ? vars.description : item.description,
                    status: vars.status || item.status,
                    sortOrder: vars.sortOrder !== undefined ? vars.sortOrder : item.sortOrder,
                  }
                : item
            ),
          };
        }
      );
      showSuccessToast(res?.msg || `Category "${vars.name}" updated successfully`);
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to update category");
    },
  });
};

/**
 * Hook to update product category status (direct cache update, no get API call)
 */
export const useUpdateProductCategoryStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProductCategoryStatusPayload) => updateProductCategoryStatus(payload),
    onSuccess: (res, vars) => {
      // Direct cache update: update status in cache directly without calling get API
      queryClient.setQueriesData<ProductCategoryListResponse>(
        { queryKey: [productCategoryListQueryKey] },
        (oldData) => {
          if (!oldData || !Array.isArray(oldData.categoryList)) return oldData;
          return {
            ...oldData,
            categoryList: oldData.categoryList.map((item) =>
              item.id === vars.id ? { ...item, status: vars.status } : item
            ),
          };
        }
      );
      showSuccessToast(res?.msg || `Category status changed to ${vars.status}`);
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to update status");
    },
  });
};

/**
 * Hook to delete a product category (direct cache update, no get API call)
 */
export const useDeleteProductCategoryMutation = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DeleteProductCategoryPayload) => deleteProductCategory(payload),
    onSuccess: (res, vars) => {
      // Direct cache update: remove item from cache directly without calling get API
      queryClient.setQueriesData<ProductCategoryListResponse>(
        { queryKey: [productCategoryListQueryKey] },
        (oldData) => {
          if (!oldData || !Array.isArray(oldData.categoryList)) return oldData;
          return {
            ...oldData,
            categoryList: oldData.categoryList.filter((item) => item.id !== vars.id),
          };
        }
      );
      showSuccessToast(res?.msg || "Category deleted successfully");
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to delete category");
    },
  });
};

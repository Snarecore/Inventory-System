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
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
      queryClient.invalidateQueries({
        queryKey: [productCategoryListQueryKey],
        exact: true,
        refetchType: "active",
      });
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
 * Updates cache directly via setQueryData (no get API refetch needed)
 */
export const useUpdateProductCategoryMutation = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProductCategoryPayload) => updateProductCategory(payload),
    onSuccess: (res, vars) => {
      // Direct cache update: instantly updates the table without re-fetching get-product-categories-list
      queryClient.setQueryData<ProductCategoryListResponse>(
        [productCategoryListQueryKey],
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
 * Hook to update product category status (Active / Inactive)
 * Updates cache directly via setQueryData (no get API refetch needed)
 */
export const useUpdateProductCategoryStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProductCategoryStatusPayload) => updateProductCategoryStatus(payload),
    onSuccess: (res, vars) => {
      // Direct cache update: instantly updates status badge without calling get-product-categories-list
      queryClient.setQueryData<ProductCategoryListResponse>(
        [productCategoryListQueryKey],
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
 * Hook to delete a product category
 * Updates cache directly via setQueryData (no get API refetch needed)
 */
export const useDeleteProductCategoryMutation = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DeleteProductCategoryPayload) => deleteProductCategory(payload),
    onSuccess: (res, vars) => {
      // Direct cache update: removes row immediately without calling get-product-categories-list
      queryClient.setQueryData<ProductCategoryListResponse>(
        [productCategoryListQueryKey],
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

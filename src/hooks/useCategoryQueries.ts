import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryListQueryKey } from "@/config/query-key";
import {
  fetchCategoryList,
  insertCategory,
  updateCategory,
  updateCategoryStatus,
  type FetchCategoryListParams,
} from "@/services/category-service";
import type {
  CategoryListResponse,
  InsertCategoryPayload,
  UpdateCategoryPayload,
  UpdateCategoryStatusPayload,
} from "@/types";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";

/**
 * Hook to fetch the category list with optional filters
 */
export const useCategoryListQuery = (params?: FetchCategoryListParams) => {
  return useQuery<CategoryListResponse>({
    queryKey: [categoryListQueryKey, params?.type, params?.startDate, params?.endDate],
    queryFn: () => fetchCategoryList(params),
    staleTime: 1000 * 60 * 3, // 3 minutes cache
  });
};

/**
 * Hook to insert a new financial category
 * Performs 1 authoritative GET fetch on create to guarantee valid database ID & sync
 */
export const useInsertCategoryMutation = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: InsertCategoryPayload) => insertCategory(payload),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: [categoryListQueryKey] });
      showSuccessToast(res?.msg || `"${vars.categoryName}" category added successfully`);
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to save category");
    },
  });
};

/**
 * Hook to update an existing financial category (direct cache update, no get API call)
 */
export const useUpdateCategoryMutation = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCategoryPayload) => updateCategory(payload),
    onSuccess: (res, vars) => {
      // Direct cache update: update item in cache directly without calling get API
      queryClient.setQueriesData<CategoryListResponse>(
        { queryKey: [categoryListQueryKey] },
        (oldData) => {
          if (!oldData || !Array.isArray(oldData.categoryList)) return oldData;
          return {
            ...oldData,
            categoryList: oldData.categoryList.map((item) =>
              item.categoryId === vars.categoryId
                ? {
                    ...item,
                    categoryName: vars.categoryName,
                    type: vars.categoryType || item.type,
                    openingBalance:
                      vars.openingBalance !== undefined ? vars.openingBalance : item.openingBalance,
                  }
                : item
            ),
          };
        }
      );
      showSuccessToast(res?.msg || `"${vars.categoryName}" category updated successfully`);
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to update category");
    },
  });
};

/**
 * Hook to toggle category status (direct cache update, no get API call)
 */
export const useUpdateCategoryStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCategoryStatusPayload) => updateCategoryStatus(payload),
    onSuccess: (res, vars) => {
      // Direct cache update: update status in cache directly without calling get API
      queryClient.setQueriesData<CategoryListResponse>(
        { queryKey: [categoryListQueryKey] },
        (oldData) => {
          if (!oldData || !Array.isArray(oldData.categoryList)) return oldData;
          return {
            ...oldData,
            categoryList: oldData.categoryList.map((item) =>
              item.categoryId === vars.categoryId ? { ...item, status: vars.status } : item
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

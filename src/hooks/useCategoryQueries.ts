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
 * Hook to update an existing financial category
 */
export const useUpdateCategoryMutation = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCategoryPayload) => updateCategory(payload),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: [categoryListQueryKey] });
      showSuccessToast(res?.msg || `"${vars.categoryName}" category updated successfully`);
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to update category");
    },
  });
};

/**
 * Hook to toggle category status (Active / Inactive)
 */
export const useUpdateCategoryStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCategoryStatusPayload) => updateCategoryStatus(payload),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: [categoryListQueryKey] });
      showSuccessToast(res?.msg || `Category status changed to ${vars.status}`);
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to update status");
    },
  });
};

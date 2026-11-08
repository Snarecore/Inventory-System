import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { branchListQueryKey } from "@/config/query-key";
import {
  getBranchList,
  insertBranch,
  updateBranch,
  toggleBranchStatus,
} from "@/services/branch-service";
import type { BranchItem, BranchFormData } from "@/types/branch.types";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";

export interface BranchMutationCallbacks<TData = any, TVariables = any> {
  onSuccess?: (data: TData, variables: TVariables, context?: unknown) => void;
  onError?: (error: Error, variables: TVariables, context?: unknown) => void;
  onSettled?: (
    data: TData | undefined,
    error: Error | null,
    variables: TVariables,
    context?: unknown
  ) => void;
}

/**
 * Hook to fetch all branches for the organization.
 */
export const useBranchListQuery = (
  options?: Omit<UseQueryOptions<BranchItem[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<BranchItem[], Error>({
    queryKey: [branchListQueryKey],
    queryFn: getBranchList,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: "always",
    ...options,
  });
};

/**
 * Hook to insert a new branch.
 */
export const useInsertBranchMutation = (callbacks?: BranchMutationCallbacks) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, Partial<BranchFormData>>({
    mutationFn: (form) => insertBranch(form),
    onSuccess: (data, variables, context) => {
      showSuccessToast("Branch created successfully!");
      queryClient.invalidateQueries({ queryKey: [branchListQueryKey] });
      callbacks?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      showErrorToast(error?.message || "Failed to create branch");
      callbacks?.onError?.(error, variables, context);
    },
    onSettled: callbacks?.onSettled,
  });
};

/**
 * Hook to update an existing branch.
 */
export const useUpdateBranchMutation = (callbacks?: BranchMutationCallbacks) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, Partial<BranchItem> & { id: number; orgId?: number }>({
    mutationFn: (form) => updateBranch(form),
    onSuccess: (data, variables, context) => {
      showSuccessToast("Branch updated successfully!");
      queryClient.invalidateQueries({ queryKey: [branchListQueryKey] });
      callbacks?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      showErrorToast(error?.message || "Failed to update branch");
      callbacks?.onError?.(error, variables, context);
    },
    onSettled: callbacks?.onSettled,
  });
};

/**
 * Hook to toggle active/inactive status of a branch.
 */
export const useToggleBranchStatusMutation = (callbacks?: BranchMutationCallbacks) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, BranchItem>({
    mutationFn: (branch) => toggleBranchStatus(branch),
    onSuccess: (data, branch, context) => {
      showSuccessToast(
        branch.active ? "Branch deactivated successfully" : "Branch reactivated successfully"
      );
      queryClient.invalidateQueries({ queryKey: [branchListQueryKey] });
      callbacks?.onSuccess?.(data, branch, context);
    },
    onError: (error, variables, context) => {
      showErrorToast(error?.message || "Failed to update branch status");
      callbacks?.onError?.(error, variables, context);
    },
    onSettled: callbacks?.onSettled,
  });
};

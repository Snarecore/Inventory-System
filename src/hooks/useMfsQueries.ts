import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { mfsUserListQueryKey } from "@/config/query-key";
import {
  fetchMfsUserList,
  insertMfsUser,
  updateMfsUser,
  updateMfsUserStatus,
} from "@/services/mfs-service";
import type {
  MfsUserItem,
  MfsUserListResponse,
  InsertMfsUserPayload,
  UpdateMfsUserPayload,
  UpdateMfsUserStatusPayload,
  MfsActionResponse,
} from "@/types";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";

export interface MfsMutationContext {
  previousMfsData?: MfsUserListResponse;
}

export interface MutationCallbacks<TData = MfsActionResponse, TVariables = unknown, TContext = MfsMutationContext> {
  onSuccess?: (data: TData, variables: TVariables, context?: TContext) => void;
  onError?: (error: Error, variables: TVariables, context?: TContext) => void;
  onSettled?: (
    data: TData | undefined,
    error: Error | null,
    variables: TVariables,
    context?: TContext
  ) => void;
}

/**
 * Hook to fetch registered MFS accounts
 */
export const useMfsUserListQuery = (
  options?: Omit<UseQueryOptions<MfsUserListResponse, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<MfsUserListResponse, Error>({
    queryKey: [mfsUserListQueryKey],
    queryFn: fetchMfsUserList,
    refetchOnWindowFocus: false,
    ...options,
  });
};

/**
 * Hook to insert a new MFS account
 * Merges success response into cache directly to save bandwidth on mobile networks
 */
export const useInsertMfsUserMutation = (
  options?: MutationCallbacks<MfsActionResponse, InsertMfsUserPayload, MfsMutationContext>
) => {
  const queryClient = useQueryClient();

  return useMutation<MfsActionResponse, Error, InsertMfsUserPayload, MfsMutationContext>({
    mutationFn: insertMfsUser,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [mfsUserListQueryKey] });
      const previousMfsData = queryClient.getQueryData<MfsUserListResponse>([mfsUserListQueryKey]);
      return { previousMfsData };
    },
    onSuccess: (data, variables, context) => {
      // Direct cache reconciliation on success without waiting for full refetch
      queryClient.setQueryData<MfsUserListResponse>([mfsUserListQueryKey], (old) => {
        if (!old) return old;
        const currentList = Array.isArray(old.mfsUsers) ? old.mfsUsers : [];
        const newMfs: MfsUserItem = {
          id: data?.id || Date.now(),
          name: variables.name,
          phoneNumber: variables.phoneNumber,
          method: variables.method,
          openingBalance: Number(variables.openingBalance || 0),
          currentBalance: Number(variables.openingBalance || 0),
          status: variables.status || "Active",
        };
        return {
          ...old,
          mfsUsers: [newMfs, ...currentList],
        };
      });

      showSuccessToast(data?.msg || "MFS account created successfully!");
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (context?.previousMfsData) {
        queryClient.setQueryData<MfsUserListResponse>([mfsUserListQueryKey], context.previousMfsData);
      }
      showErrorToast(error?.message || "Failed to create MFS account");
      options?.onError?.(error, variables, context);
    },
    onSettled: async (data, error, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: [mfsUserListQueryKey],
        refetchType: "all",
      });
      options?.onSettled?.(data, error, variables, context);
    },
  });
};

/**
 * Hook to update an existing MFS account
 */
export const useUpdateMfsUserMutation = (
  options?: MutationCallbacks<MfsActionResponse, UpdateMfsUserPayload, MfsMutationContext>
) => {
  const queryClient = useQueryClient();

  return useMutation<MfsActionResponse, Error, UpdateMfsUserPayload, MfsMutationContext>({
    mutationFn: updateMfsUser,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: [mfsUserListQueryKey] });
      const previousMfsData = queryClient.getQueryData<MfsUserListResponse>([mfsUserListQueryKey]);

      // Optimistic cache update immediately on action
      queryClient.setQueryData<MfsUserListResponse>([mfsUserListQueryKey], (old) => {
        if (!old) return old;
        const currentList = Array.isArray(old.mfsUsers) ? old.mfsUsers : [];
        const updatedList = currentList.map((mfs) => {
          if (
            String(mfs.id) === String(variables.id) ||
            Number(mfs.id) === Number(variables.id)
          ) {
            const nextBal = Number(variables.currentBalance ?? variables.openingBalance ?? 0);
            return {
              ...mfs,
              name: variables.name,
              phoneNumber: variables.phoneNumber,
              method: variables.method,
              openingBalance: Number(variables.openingBalance || 0),
              currentBalance: nextBal,
              balance: nextBal,
              status: variables.status || "Active",
            };
          }
          return mfs;
        });
        return {
          ...old,
          mfsUsers: updatedList,
        };
      });

      return { previousMfsData };
    },
    onSuccess: (data, variables, context) => {
      showSuccessToast(data?.msg || "MFS account updated successfully!");
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Rollback to prior snapshot on network or backend error
      if (context?.previousMfsData) {
        queryClient.setQueryData<MfsUserListResponse>([mfsUserListQueryKey], context.previousMfsData);
      }
      showErrorToast(error?.message || "Failed to update MFS account");
      options?.onError?.(error, variables, context);
    },
    onSettled: async (data, error, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: [mfsUserListQueryKey],
        refetchType: "all",
      });
      options?.onSettled?.(data, error, variables, context);
    },
  });
};

/**
 * Hook to update MFS account status with instant optimistic toggle & rollback
 */
export const useUpdateMfsUserStatusMutation = (
  options?: MutationCallbacks<MfsActionResponse, UpdateMfsUserStatusPayload, MfsMutationContext>
) => {
  const queryClient = useQueryClient();

  return useMutation<MfsActionResponse, Error, UpdateMfsUserStatusPayload, MfsMutationContext>({
    mutationFn: updateMfsUserStatus,
    onMutate: async (variables) => {
      // 1. Cancel ongoing refetches so they don't overwrite optimistic toggle
      await queryClient.cancelQueries({ queryKey: [mfsUserListQueryKey] });

      // 2. Snapshot previous state for rollback
      const previousMfsData = queryClient.getQueryData<MfsUserListResponse>([mfsUserListQueryKey]);

      // 3. Immediately flip status in cache (<16ms feedback)
      queryClient.setQueryData<MfsUserListResponse>([mfsUserListQueryKey], (old) => {
        if (!old) return old;
        const currentList = Array.isArray(old.mfsUsers) ? old.mfsUsers : [];
        const updatedList = currentList.map((mfs) => {
          if (
            String(mfs.id) === String(variables.id) ||
            Number(mfs.id) === Number(variables.id)
          ) {
            return {
              ...mfs,
              status: variables.status,
            };
          }
          return mfs;
        });
        return {
          ...old,
          mfsUsers: updatedList,
        };
      });

      return { previousMfsData };
    },
    onSuccess: (data, variables, context) => {
      showSuccessToast(data?.msg || `MFS account status updated to ${variables.status}`);
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // 4. Rollback to prior snapshot on failure
      if (context?.previousMfsData) {
        queryClient.setQueryData<MfsUserListResponse>([mfsUserListQueryKey], context.previousMfsData);
      }
      showErrorToast(error?.message || "Failed to update MFS account status");
      options?.onError?.(error, variables, context);
    },
    onSettled: async (data, error, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: [mfsUserListQueryKey],
        refetchType: "all",
      });
      options?.onSettled?.(data, error, variables, context);
    },
  });
};

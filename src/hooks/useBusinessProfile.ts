import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBusinessProfile,
  saveBusinessProfile,
  getBusinessTypes,
} from "@/services/business-service";
import { businessProfileQueryKey, businessTypesQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type {
  BusinessProfileData,
  BusinessProfileSavePayload,
  BusinessTypeItem,
} from "@/types/business.types";

/**
 * Hook to fetch the current business profile.
 */
export function useBusinessProfileQuery(
  orgIdParam?: number | string,
  branchIdParam?: number | string
) {
  const accessUser = buildAccessUser();
  const orgId = orgIdParam ?? accessUser.orgId;
  const branchId = branchIdParam ?? accessUser.branchId;

  return useQuery<BusinessProfileData | null, Error>({
    queryKey: [businessProfileQueryKey, orgId, branchId],
    queryFn: () => getBusinessProfile(orgId, branchId),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: Boolean(orgId && branchId),
  });
}

/**
 * Hook to fetch official business types.
 */
export function useBusinessTypesQuery() {
  return useQuery<BusinessTypeItem[], Error>({
    queryKey: [businessTypesQueryKey],
    queryFn: getBusinessTypes,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to save / update business profile.
 */
export function useSaveBusinessProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BusinessProfileSavePayload) => saveBusinessProfile(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [businessProfileQueryKey] });
      showSuccessToast(res?.msg || "Business profile updated successfully");
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to update business profile");
    },
  });
}

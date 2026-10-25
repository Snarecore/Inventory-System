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
export function useBusinessProfileQuery(orgIdParam?: number | string, branchIdParam?: number | string) {
  const accessUser = buildAccessUser();
  const orgId = orgIdParam ?? accessUser.orgId;
  const branchId = branchIdParam ?? accessUser.branchId;

  return useQuery<BusinessProfileData | null, Error>({
    queryKey: [businessProfileQueryKey, orgId, branchId],
    queryFn: async () => {
      const res = await getBusinessProfile(orgId, branchId);
      return res?.data ?? null;
    },
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
    queryFn: async () => {
      return await getBusinessTypes();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to save / update business profile.
 */
export function useSaveBusinessProfileMutation() {
  const queryClient = useQueryClient();
  const accessUser = buildAccessUser();
  const orgId = accessUser.orgId;
  const branchId = accessUser.branchId;

  return useMutation({
    mutationFn: async (payload: BusinessProfileSavePayload) => {
      return await saveBusinessProfile(payload);
    },
    onSuccess: (response, variables) => {
      showSuccessToast(response?.msg || "ব্যবসার প্রোফাইল সফলভাবে সংরক্ষিত হয়েছে");

      // Optimistically update query cache
      queryClient.setQueryData(
        [businessProfileQueryKey, orgId, branchId],
        (oldData: BusinessProfileData | null | undefined) => {
          const apiBase = (import.meta.env.VITE_API_BASE_URL as string)?.replace(/\/+$/, "") || "";
          const logoGuid = variables.businessLogo || variables.businessLogoRefNo || oldData?.businessLogo || oldData?.businessLogoRefNo || "";
          const computedLogoUrl =
            response.data?.businessLogoUrl ||
            variables.businessLogoUrl ||
            (logoGuid ? (logoGuid.startsWith("http") ? logoGuid : `${apiBase}/files/file/${logoGuid}`) : "");

          if (!oldData) {
            return response.data
              ? { ...response.data, businessLogoUrl: computedLogoUrl }
              : null;
          }

          return {
            ...oldData,
            ...variables,
            businessLogo: logoGuid,
            businessLogoRefNo: logoGuid,
            businessLogoUrl: computedLogoUrl,
          };
        }
      );

      // Invalidate to refresh latest server state
      queryClient.invalidateQueries({
        queryKey: [businessProfileQueryKey],
        exact: false,
      });
    },
    onError: (error: any) => {
      showErrorToast(error?.message || "ব্যবসার প্রোফাইল সংরক্ষণ করা যায়নি");
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInvoiceProfileSetup,
  getInvoiceProfileSetupByPhone,
  saveInvoiceProfileSetup,
} from "@/services/invoice-profile-service";
import { invoiceProfileSetupQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type {
  InvoiceProfileSetupData,
  InvoiceProfileSetupSavePayload,
} from "@/types/invoice-profile.types";

/**
 * Hook to fetch invoice profile setup for current or specified org & branch.
 */
export function useInvoiceProfileSetupQuery(
  orgIdParam?: number | string,
  branchIdParam?: number | string
) {
  const accessUser = buildAccessUser();
  const orgId = orgIdParam ?? accessUser.orgId;
  const branchId = branchIdParam ?? accessUser.branchId;

  return useQuery<InvoiceProfileSetupData, Error>({
    queryKey: [invoiceProfileSetupQueryKey, orgId, branchId],
    queryFn: () => getInvoiceProfileSetup(orgId, branchId),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: Boolean(orgId && branchId),
  });
}

/**
 * Hook to fetch invoice profile setup by phone
 */
export function useInvoiceProfileSetupByPhoneQuery(phone?: string) {
  const accessUser = buildAccessUser();
  const targetPhone = phone || accessUser.phone;

  return useQuery<InvoiceProfileSetupData, Error>({
    queryKey: [invoiceProfileSetupQueryKey, "phone", targetPhone],
    queryFn: () => getInvoiceProfileSetupByPhone(targetPhone),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: Boolean(targetPhone),
  });
}

/**
 * Hook to save invoice profile setup
 */
export function useSaveInvoiceProfileSetupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: InvoiceProfileSetupSavePayload) => saveInvoiceProfileSetup(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [invoiceProfileSetupQueryKey] });
      showSuccessToast(res?.msg || "Invoice profile setup saved successfully");
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to save invoice profile setup");
    },
  });
}

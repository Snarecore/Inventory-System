import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { purchaseChallanSettingsQueryKey } from "@/config/query-key";
import {
  fetchPurchaseChallanSettings,
  savePurchaseChallanSettings,
} from "@/services/purchase-challan-settings-service";
import { showErrorToast, showSuccessToast } from "@/utils/toast-utils";
import type { PurchaseChallanSettings } from "@/types";

export const usePurchaseChallanSettingsQuery = (enabled = true) => {
  const query = useQuery({
    queryKey: [purchaseChallanSettingsQueryKey],
    queryFn: fetchPurchaseChallanSettings,
    enabled,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.error) {
      showErrorToast(query.error.message || "Failed to fetch purchase challan settings");
    }
  }, [query.error]);

  return query;
};

export const useSavePurchaseChallanSettingsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: savePurchaseChallanSettings,
    onSuccess: (_response, settings: PurchaseChallanSettings) => {
      showSuccessToast("Purchase challan settings saved successfully");
      queryClient.setQueryData([purchaseChallanSettingsQueryKey], {
        status: "Success",
        data: settings,
      });
      queryClient.invalidateQueries({ queryKey: [purchaseChallanSettingsQueryKey] });
    },
    onError: (error: Error) =>
      showErrorToast(error.message || "An error occurred while saving settings"),
  });
};

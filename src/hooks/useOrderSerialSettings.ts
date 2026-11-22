import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderSerialSettingsQueryKey } from "@/config/query-key";
import {
  getOrderSerialSettings,
  updateOrderSerialSetting,
} from "@/services/order-serial-service";
import { UpdateOrderSerialSettingPayload } from "@/types/order-serial.types";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";

/**
 * Hook to fetch order serial settings
 */
export function useOrderSerialSettingsQuery() {
  return useQuery({
    queryKey: [orderSerialSettingsQueryKey],
    queryFn: () => getOrderSerialSettings(),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to update an order serial setting (SALE or PURCHASE)
 */
export function useUpdateOrderSerialSettingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateOrderSerialSettingPayload) =>
      updateOrderSerialSetting(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [orderSerialSettingsQueryKey],
      });
      const typeLabel =
        variables.serialType.toUpperCase() === "SALE" ? "Sales" : "Purchase";
      showSuccessToast(`${typeLabel} serial settings updated successfully!`);
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to update order serial settings");
    },
  });
}

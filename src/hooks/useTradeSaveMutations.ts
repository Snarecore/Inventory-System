import { useMutation } from "@tanstack/react-query";
import { savePurchase } from "@/services/purchase-service";
import { saveSale } from "@/services/sales-service";
import { showSuccessToast } from "@/utils/toast-utils";

interface TradeSaveVariables {
  payload: Record<string, unknown>;
  isEditMode: boolean;
}

const notifyTradeSaveSuccess = (response: unknown) => {
  const result =
    response && typeof response === "object"
      ? (response as { msg?: string; message?: string })
      : undefined;
  showSuccessToast(result?.msg || result?.message || "Operation successful!");
};

export const useSaveSaleMutation = () =>
  useMutation({
    mutationFn: async ({ payload, isEditMode }: TradeSaveVariables) => ({
      success: true as const,
      data: await saveSale(payload, isEditMode),
    }),
    onSuccess: (result) => notifyTradeSaveSuccess(result.data),
  });

export const useSavePurchaseMutation = () =>
  useMutation({
    mutationFn: async ({ payload, isEditMode }: TradeSaveVariables) => ({
      success: true as const,
      data: await savePurchase(payload, isEditMode),
    }),
    onSuccess: (result) => notifyTradeSaveSuccess(result.data),
  });

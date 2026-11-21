import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSmsBundles,
  purchaseSmsBundle,
  sendSmsMessage,
  fetchSmsBalance,
  fetchSmsSendList,
} from "@/services/sms-service";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import { validatePaymentRedirectUrl } from "@/utils/payment-redirect";
import type { SmsBundleItem, SmsBalanceData, SmsHistoryItem } from "@/types";

export const SMS_QUERY_KEYS = {
  bundles: ["sms-bundles"] as const,
  balance: ["sms-balance"] as const,
  sendList: ["sms-send-list"] as const,
};

export function useSmsBundles() {
  return useQuery<SmsBundleItem[]>({
    queryKey: SMS_QUERY_KEYS.bundles,
    queryFn: fetchSmsBundles,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSmsBalance() {
  return useQuery<SmsBalanceData | null>({
    queryKey: SMS_QUERY_KEYS.balance,
    queryFn: fetchSmsBalance,
    staleTime: 60 * 1000,
  });
}

export function useSmsSendList() {
  return useQuery<SmsHistoryItem[]>({
    queryKey: SMS_QUERY_KEYS.sendList,
    queryFn: fetchSmsSendList,
    staleTime: 30 * 1000,
  });
}

export function usePurchaseSmsBundle() {
  return useMutation({
    mutationFn: purchaseSmsBundle,
    onSuccess: (result) => {
      if (result.success && result.data?.redirectUrl) {
        const validation = validatePaymentRedirectUrl(result.data.redirectUrl);
        if (validation.isValid) {
          showSuccessToast("Redirecting to payment gateway...");
          window.location.href = validation.url.toString();
        } else {
          showErrorToast(validation.message);
        }
      } else {
        showErrorToast(result.message ?? "Failed to purchase bundle.");
      }
    },
  });
}

export function useSendSms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendSmsMessage,
    onSuccess: (result) => {
      if (result.success) {
        showSuccessToast(result.message ?? "SMS sent successfully!");
        queryClient.invalidateQueries({ queryKey: SMS_QUERY_KEYS.balance });
        queryClient.invalidateQueries({ queryKey: SMS_QUERY_KEYS.sendList });
      } else {
        showErrorToast(result.message ?? "Failed to send SMS.");
      }
    },
  });
}

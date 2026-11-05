import { useQuery, useMutation } from "@tanstack/react-query";
import { pricingQueryKey, userSubscriptionQueryKey } from "@/config/query-key";
import {
  fetchPricing,
  fetchUserSubscription,
  initiatePackagePayment,
} from "@/services/package-service";
import type {
  PricingResponse,
  UserSubscription,
  PaymentInitiatePayload,
  PlanType,
} from "@/types";

/**
 * Hook to fetch Pricing Plans and Feature Groups
 */
export function usePricingQuery(type: PlanType = "BUSINESS") {
  return useQuery<PricingResponse>({
    queryKey: [pricingQueryKey, type],
    queryFn: () => fetchPricing(type),
    staleTime: 5 * 60 * 1000, // 5 minutes in-memory cache
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch Current User's active subscription info
 */
export function useUserSubscriptionQuery(userId?: string | number | null) {
  return useQuery<UserSubscription | null>({
    queryKey: [userSubscriptionQueryKey, userId],
    queryFn: () => fetchUserSubscription(userId),
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to initiate package payment
 */
export function useInitiatePackagePaymentMutation() {
  return useMutation({
    mutationFn: (payload: PaymentInitiatePayload) => initiatePackagePayment(payload),
  });
}


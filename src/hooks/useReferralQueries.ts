import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GLOBAL_STALE_TIME } from "@/api/query-client";
import {
  referralConfigQueryKey,
  referralSummaryQueryKey,
  referralMeQueryKey,
  referralBalanceQueryKey,
  referralPayoutAccountQueryKey,
  referralWithdrawalsQueryKey,
  referralEarningsQueryKey,
  referralTransactionsQueryKey,
} from "@/config/query-key";
import {
  fetchReferralConfig,
  fetchReferralSummary,
  fetchReferralMe,
  fetchWalletBalance,
  fetchPayoutAccount,
  fetchWithdrawals,
  fetchEarnings,
  fetchWalletTransactions,
  generateReferralCode,
  attributeReferrer,
  savePayoutAccount,
  requestWithdrawal,
  checkoutDebitFromWallet,
} from "@/services/referral-service";
import type {
  ReferralConfig,
  ReferralSummary,
  ReferralMe,
  WalletBalance,
  PayoutAccount,
  PaginatedResponse,
  WithdrawalItem,
  EarningItem,
  WalletTransactionItem,
  AttributePayload,
  SavePayoutAccountPayload,
  RequestWithdrawalPayload,
  CheckoutDebitPayload,
} from "@/types/referral.types";

/**
 * Fetch Referral Program Configuration
 */
export function useReferralConfigQuery() {
  return useQuery<ReferralConfig>({
    queryKey: [referralConfigQueryKey],
    queryFn: () => fetchReferralConfig(),
    staleTime: GLOBAL_STALE_TIME,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch Complete Referral Dashboard Summary
 */
export function useReferralSummaryQuery(userId?: string | number | null) {
  return useQuery<ReferralSummary>({
    queryKey: [referralSummaryQueryKey, userId],
    queryFn: () => fetchReferralSummary(userId as number | string),
    enabled: Boolean(userId),
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch Referral Me / Personal Snapshot
 */
export function useReferralMeQuery(userId?: string | number | null) {
  return useQuery<ReferralMe>({
    queryKey: [referralMeQueryKey, userId],
    queryFn: () => fetchReferralMe(userId as number | string),
    enabled: Boolean(userId),
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch Live Wallet Balances
 */
export function useReferralBalanceQuery(userId?: string | number | null) {
  return useQuery<WalletBalance>({
    queryKey: [referralBalanceQueryKey, userId],
    queryFn: () => fetchWalletBalance(userId as number | string),
    enabled: Boolean(userId),
    staleTime: 15 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch Saved Payout Account Details
 */
export function useReferralPayoutAccountQuery(userId?: string | number | null) {
  return useQuery<PayoutAccount | null>({
    queryKey: [referralPayoutAccountQueryKey, userId],
    queryFn: () => fetchPayoutAccount(userId as number | string),
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch Paginated Withdrawals List
 */
export function useReferralWithdrawalsQuery(
  userId?: string | number | null,
  page = 0,
  size = 20
) {
  return useQuery<PaginatedResponse<WithdrawalItem>>({
    queryKey: [referralWithdrawalsQueryKey, userId, page, size],
    queryFn: () => fetchWithdrawals(userId as number | string, page, size),
    enabled: Boolean(userId),
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch Paginated Commission Earnings
 */
export function useReferralEarningsQuery(
  userId?: string | number | null,
  options?: {
    page?: number;
    size?: number;
    type?: string;
    status?: string;
  }
) {
  return useQuery<PaginatedResponse<EarningItem>>({
    queryKey: [
      referralEarningsQueryKey,
      userId,
      options?.page ?? 0,
      options?.size ?? 20,
      options?.type ?? "ALL",
      options?.status ?? "ALL",
    ],
    queryFn: () => fetchEarnings(userId as number | string, options),
    enabled: Boolean(userId),
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch Paginated Wallet Transactions
 */
export function useReferralTransactionsQuery(
  userId?: string | number | null,
  page = 0,
  size = 20
) {
  return useQuery<PaginatedResponse<WalletTransactionItem>>({
    queryKey: [referralTransactionsQueryKey, userId, page, size],
    queryFn: () => fetchWalletTransactions(userId as number | string, page, size),
    enabled: Boolean(userId),
    refetchOnWindowFocus: false,
  });
}

/**
 * Mutation: Generate or Retrieve Referral Code
 */
export function useGenerateReferralCodeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number | string) => generateReferralCode(userId),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: [referralSummaryQueryKey, userId] });
      queryClient.invalidateQueries({ queryKey: [referralMeQueryKey, userId] });
    },
  });
}

/**
 * Mutation: Attribute New Signup / Referrer Code
 */
export function useAttributeReferrerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AttributePayload) => attributeReferrer(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [referralSummaryQueryKey, variables.userId] });
      queryClient.invalidateQueries({ queryKey: [referralMeQueryKey, variables.userId] });
    },
  });
}

/**
 * Mutation: Save or Update Payout Account (bKash/Nagad)
 */
export function useSavePayoutAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SavePayoutAccountPayload) => savePayoutAccount(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [referralPayoutAccountQueryKey, variables.userId] });
      queryClient.invalidateQueries({ queryKey: [referralSummaryQueryKey, variables.userId] });
    },
  });
}

/**
 * Mutation: Request Commission Withdrawal
 */
export function useRequestWithdrawalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RequestWithdrawalPayload) => requestWithdrawal(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [referralBalanceQueryKey, variables.userId] });
      queryClient.invalidateQueries({ queryKey: [referralSummaryQueryKey, variables.userId] });
      queryClient.invalidateQueries({ queryKey: [referralWithdrawalsQueryKey, variables.userId] });
      queryClient.invalidateQueries({ queryKey: [referralTransactionsQueryKey, variables.userId] });
    },
  });
}

/**
 * Mutation: Debit Commission for Package Purchase
 */
export function useCheckoutDebitFromWalletMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CheckoutDebitPayload) => checkoutDebitFromWallet(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [referralBalanceQueryKey, variables.userId] });
      queryClient.invalidateQueries({ queryKey: [referralSummaryQueryKey, variables.userId] });
      queryClient.invalidateQueries({ queryKey: [referralTransactionsQueryKey, variables.userId] });
    },
  });
}

import { getData, postData, putData } from "./api-service";
import apiConfig from "@/config/api.json";
import type {
  ReferralConfig,
  ReferralSummary,
  ReferralMe,
  WalletBalance,
  PayoutAccount,
  PaginatedResponse,
  EarningItem,
  WalletTransactionItem,
  WithdrawalItem,
  GenerateCodeResponse,
  AttributePayload,
  SavePayoutAccountPayload,
  RequestWithdrawalPayload,
  CheckoutDebitPayload,
} from "@/types/referral.types";

const REFERRAL_BASE_URL = (import.meta.env.VITE_REFERRAL_BASE_URL as string) || "";

/**
 * Currency conversion utilities:
 * In Bangladesh, 100 Poisha = 1 BDT (৳)
 */
export function poishaToTaka(poisha?: number | null): number {
  if (poisha == null || isNaN(Number(poisha))) return 0;
  return Number(poisha) / 100;
}

export function takaToPoisha(taka?: number | null): number {
  if (taka == null || isNaN(Number(taka))) return 0;
  return Math.round(Number(taka) * 100);
}

export function formatTaka(poishaOrTaka: number, isPoisha = true): string {
  const taka = isPoisha ? poishaToTaka(poishaOrTaka) : poishaOrTaka;
  return `৳${Number(taka || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * 1. GET /referral/config
 * Retrieves program rules, tier thresholds, minimum payouts and available payout methods
 */
export async function fetchReferralConfig(): Promise<ReferralConfig> {
  const res = (await getData<ReferralConfig>({
    url: apiConfig.referral.configUrl,
    baseUrl: REFERRAL_BASE_URL,
  })) as any;

  if (res?.error) {
    throw new Error(res?.msg || res?.message || "Failed to load referral config");
  }

  return res as ReferralConfig;
}

/**
 * 2. GET /referral/me?userId={{userId}}
 * Retrieves referral standing, tier, commission rates, and balances
 */
export async function fetchReferralMe(userId: number | string): Promise<ReferralMe> {
  if (!userId) {
    throw new Error("userId is required");
  }

  const res = (await getData<ReferralMe>({
    url: `${apiConfig.referral.meUrl}?userId=${encodeURIComponent(String(userId))}`,
    baseUrl: REFERRAL_BASE_URL,
  })) as any;

  if (res?.error) {
    throw new Error(res?.msg || res?.message || "Failed to load referral me");
  }

  return res as ReferralMe;
}

/**
 * 3. GET /referral/summary?userId={{userId}}
 * Retrieves full dashboard details including share links, tier status, earnings breakdown, and wallet
 */
export async function fetchReferralSummary(userId: number | string): Promise<ReferralSummary> {
  if (!userId) {
    throw new Error("userId is required");
  }

  const res = (await getData<ReferralSummary>({
    url: `${apiConfig.referral.summaryUrl}?userId=${encodeURIComponent(String(userId))}`,
    baseUrl: REFERRAL_BASE_URL,
  })) as any;

  if (res?.error) {
    throw new Error(res?.msg || res?.message || "Failed to load referral summary");
  }

  return res as ReferralSummary;
}

/**
 * 4. POST /referral/generate-code
 * Generates or retrieves the user's referral code
 */
export async function generateReferralCode(userId: number | string): Promise<GenerateCodeResponse> {
  if (!userId) {
    throw new Error("userId is required");
  }

  const res = (await postData<GenerateCodeResponse>({
    url: apiConfig.referral.generateCodeUrl,
    body: { userId: Number(userId) },
    baseUrl: REFERRAL_BASE_URL,
  })) as any;

  if (res?.error) {
    throw new Error(res?.msg || res?.message || "Failed to generate referral code");
  }

  return res as GenerateCodeResponse;
}

/**
 * 5. POST /referral/attribute
 * Links a newly registered account with a referrer's code
 */
export async function attributeReferrer(payload: AttributePayload): Promise<any> {
  if (!payload.userId || !payload.referralCode) {
    throw new Error("userId and referralCode are required");
  }

  const res = (await postData<any>({
    url: apiConfig.referral.attributeUrl,
    body: {
      userId: Number(payload.userId),
      referralCode: payload.referralCode.trim(),
    },
    baseUrl: REFERRAL_BASE_URL,
  })) as any;

  if (res?.error) {
    throw new Error(res?.msg || res?.message || "Failed to attribute referral code");
  }

  return res;
}

/**
 * 6. GET /referral/wallet/balance?userId={{userId}}
 * Retrieves live wallet balances: held, available, spendable, withdrawable
 */
export async function fetchWalletBalance(userId: number | string): Promise<WalletBalance> {
  if (!userId) {
    throw new Error("userId is required");
  }

  const res = (await getData<WalletBalance>({
    url: `${apiConfig.referral.walletBalanceUrl}?userId=${encodeURIComponent(String(userId))}`,
    baseUrl: REFERRAL_BASE_URL,
  })) as any;

  if (res?.error) {
    throw new Error(res?.msg || res?.message || "Failed to load wallet balance");
  }

  return res as WalletBalance;
}

/**
 * 7. POST /referral/wallet/checkout-debit
 * Deducts package purchase fee from user's earned commission balance
 */
export async function checkoutDebitFromWallet(payload: CheckoutDebitPayload): Promise<any> {
  if (!payload.userId || !payload.amountPoisha) {
    throw new Error("userId and positive amountPoisha are required");
  }

  const res = (await postData<any>({
    url: apiConfig.referral.walletCheckoutDebitUrl,
    body: {
      userId: Number(payload.userId),
      amountPoisha: Number(payload.amountPoisha),
    },
    baseUrl: REFERRAL_BASE_URL,
  })) as any;

  if (res?.error) {
    throw new Error(res?.msg || res?.message || "Failed to process wallet checkout debit");
  }

  return res;
}

/**
 * 8. GET /referral/payout-account?userId={{userId}}
 * Retrieves configured payout account (bKash/Nagad masked number)
 */
export async function fetchPayoutAccount(userId: number | string): Promise<PayoutAccount | null> {
  if (!userId) {
    return null;
  }

  const res = (await getData<PayoutAccount>({
    url: `${apiConfig.referral.payoutAccountUrl}?userId=${encodeURIComponent(String(userId))}`,
    baseUrl: REFERRAL_BASE_URL,
  })) as any;

  if (res?.error) {
    throw new Error(res?.msg || res?.message || "Failed to load payout account");
  }

  if (!res || !res.method) {
    return null;
  }

  return res as PayoutAccount;
}

/**
 * 9. PUT /referral/payout-account
 * Saves or updates payout account (bKash or Nagad)
 */
export async function savePayoutAccount(payload: SavePayoutAccountPayload): Promise<PayoutAccount> {
  if (!payload.userId || !payload.method || !payload.accountNumber) {
    throw new Error("userId, method, and accountNumber are required");
  }

  const res = (await putData<PayoutAccount>({
    url: apiConfig.referral.payoutAccountUrl,
    body: {
      userId: Number(payload.userId),
      method: payload.method,
      accountNumber: payload.accountNumber.trim(),
      ...(payload.accountName ? { accountName: payload.accountName.trim() } : {}),
    },
    baseUrl: REFERRAL_BASE_URL,
  })) as any;

  if (res?.error) {
    throw new Error(res?.msg || res?.message || "Failed to save payout account");
  }

  return res as PayoutAccount;
}

/**
 * 10. POST /referral/withdrawals
 * Submits withdrawal request with Idempotency-Key
 */
export async function requestWithdrawal(payload: RequestWithdrawalPayload): Promise<WithdrawalItem> {
  if (!payload.userId || !payload.amountPoisha) {
    throw new Error("userId and positive amountPoisha are required");
  }

  const idempotencyKey =
    payload.idempotencyKey ||
    `withdraw-${payload.userId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const res = (await postData<WithdrawalItem>({
    url: apiConfig.referral.withdrawalsUrl,
    body: {
      userId: Number(payload.userId),
      amountPoisha: Number(payload.amountPoisha),
      idempotencyKey,
    },
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
    baseUrl: REFERRAL_BASE_URL,
  })) as any;

  if (res?.error) {
    throw new Error(res?.msg || res?.message || "Failed to request withdrawal");
  }

  return res as WithdrawalItem;
}

/**
 * 11. GET /referral/withdrawals?userId={{userId}}&page=0&size=20
 * Retrieves paginated withdrawal requests and status history
 */
export async function fetchWithdrawals(
  userId: number | string,
  page = 0,
  size = 20
): Promise<PaginatedResponse<WithdrawalItem>> {
  if (!userId) {
    return {
      content: [],
      page: 0,
      size,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    };
  }

  const res = (await getData<PaginatedResponse<WithdrawalItem>>({
    url: `${apiConfig.referral.withdrawalsUrl}?userId=${encodeURIComponent(String(userId))}&page=${page}&size=${size}`,
    baseUrl: REFERRAL_BASE_URL,
  })) as any;

  if (res?.error) {
    throw new Error(res?.msg || res?.message || "Failed to load withdrawals list");
  }

  return res as PaginatedResponse<WithdrawalItem>;
}

/**
 * 12. GET /referral/earnings?userId={{userId}}&page=0&size=20
 * Supports filtering by type (e.g. RENEWAL, FIRST_SALE) and status (AVAILABLE, HELD, etc.)
 */
export async function fetchEarnings(
  userId: number | string,
  options?: {
    page?: number;
    size?: number;
    type?: string;
    status?: string;
  }
): Promise<PaginatedResponse<EarningItem>> {
  if (!userId) {
    return {
      content: [],
      page: 0,
      size: options?.size ?? 20,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    };
  }

  const params = new URLSearchParams();
  params.set("userId", String(userId));
  params.set("page", String(options?.page ?? 0));
  params.set("size", String(options?.size ?? 20));

  if (options?.type && options.type !== "ALL") {
    params.set("type", options.type);
  }
  if (options?.status && options.status !== "ALL") {
    params.set("status", options.status);
  }

  const res = (await getData<PaginatedResponse<EarningItem>>({
    url: `${apiConfig.referral.earningsUrl}?${params.toString()}`,
    baseUrl: REFERRAL_BASE_URL,
  })) as any;

  if (res?.error) {
    throw new Error(res?.msg || res?.message || "Failed to load earnings list");
  }

  return res as PaginatedResponse<EarningItem>;
}

/**
 * 13. GET /referral/wallet/transactions?userId={{userId}}&page=0&size=20
 * Retrieves wallet statement and ledger entries
 */
export async function fetchWalletTransactions(
  userId: number | string,
  page = 0,
  size = 20
): Promise<PaginatedResponse<WalletTransactionItem>> {
  if (!userId) {
    return {
      content: [],
      page: 0,
      size,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    };
  }

  const res = (await getData<PaginatedResponse<WalletTransactionItem>>({
    url: `${apiConfig.referral.walletTransactionsUrl}?userId=${encodeURIComponent(String(userId))}&page=${page}&size=${size}`,
    baseUrl: REFERRAL_BASE_URL,
  })) as any;

  if (res?.error) {
    throw new Error(res?.msg || res?.message || "Failed to load wallet transactions");
  }

  return res as PaginatedResponse<WalletTransactionItem>;
}

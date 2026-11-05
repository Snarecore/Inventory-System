import apiConfig from "@/config/api.json";
import { getData, postData } from "./api-service";
import type {
  PricingResponse,
  UserSubscription,
  PaymentInitiatePayload,
  PaymentInitiateResponse,
  PlanType,
} from "@/types";

const CMS_PUBLIC_BASE = import.meta.env.VITE_CMS_BASE_URL;
const CMS_API_ROOT = CMS_PUBLIC_BASE ? CMS_PUBLIC_BASE.replace(/\/public\/?$/, "") : "";

const PRICING_CACHE_KEY = "cashboi_pricing_cache_v1";


export const readCachedPricing = (type: PlanType = "BUSINESS"): PricingResponse | null => {
  try {
    const raw = localStorage.getItem(PRICING_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.[type] || null;
  } catch {
    return null;
  }
};

/**
 * Write pricing data to local cache
 */
export const writeCachedPricing = (type: PlanType, data: PricingResponse): void => {
  try {
    const raw = localStorage.getItem(PRICING_CACHE_KEY);
    const existing = raw ? JSON.parse(raw) : {};
    existing[type] = data;
    localStorage.setItem(PRICING_CACHE_KEY, JSON.stringify(existing));
  } catch {
    // Quota exceeded or private browsing
  }
};

export async function fetchPricing(type: PlanType = "BUSINESS"): Promise<PricingResponse> {
  const endpoint = `${apiConfig.packages.pricingUrl}?type=${type}`;
  try {
    const res: any = await getData<PricingResponse>({
      url: endpoint,
      baseUrl: CMS_PUBLIC_BASE,
      token: "",
    });

    if (res?.error || !res?.packages) {
      const cached = readCachedPricing(type);
      if (cached) return cached;
      throw new Error(res?.message || "Failed to load pricing packages");
    }

    writeCachedPricing(type, res);
    return res;
  } catch (err: any) {
    const cached = readCachedPricing(type);
    if (cached) return cached;
    throw err;
  }
}

/**
 * Fetch current user's active subscription status from CMS backend
 */
export async function fetchUserSubscription(
  userId?: string | number | null
): Promise<UserSubscription | null> {
  if (!userId) return null;

  const endpoint = `${apiConfig.packages.userSubscriptionUrl}?userId=${encodeURIComponent(String(userId))}`;
  try {
    const res: any = await getData<UserSubscription>({
      url: endpoint,
      baseUrl: CMS_PUBLIC_BASE,
      token: "",
    });

    if (res?.error) return null;
    return res;
  } catch (error) {
    console.error("Failed to load user subscription:", error);
    return null;
  }
}

export async function initiatePackagePayment(
  payload: PaymentInitiatePayload
): Promise<PaymentInitiateResponse> {
  try {
    const res: any = await postData<PaymentInitiateResponse>({
      url: apiConfig.packages.paymentInitiateUrl,
      body: payload,
      baseUrl: CMS_API_ROOT,
      token: "",
    });

    if (res?.error || res?.status === 400 || res?.status === "400") {
      const msg =
        res?.errorMessage ||
        res?.ErrorMessage ||
        res?.message ||
        "Payment initiation was rejected by gateway.";
      return { status: "Error", errorMessage: msg };
    }

    return res;
  } catch (error: any) {
    console.error("Payment initiation network error:", error);
    return {
      status: "Error",
      errorMessage: error?.message,
    };
  }
}

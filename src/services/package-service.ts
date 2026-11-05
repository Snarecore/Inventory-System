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

export async function fetchPricing(type: PlanType = "BUSINESS"): Promise<PricingResponse> {
  const endpoint = `${apiConfig.packages.pricingUrl}?type=${type}`;
  const res = await getData<PricingResponse>({
    url: endpoint,
    baseUrl: CMS_PUBLIC_BASE,
    token: "",
  });

  if ((res as any)?.error || !res?.packages) {
    throw new Error((res as any)?.message || "Failed to load pricing packages");
  }

  return res;
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

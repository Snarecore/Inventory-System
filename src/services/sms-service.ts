import { getData, postData } from "./api-service";
import apiConfig from "@/config/api.json";
import { buildAccessUser } from "@/utils/access-user";
import type {
  SmsBundleItem,
  SmsBundlePurchasePayload,
  SmsBundlePurchaseResponse,
  SendSmsPayload,
  SmsBalanceData,
  SmsSendBackendData,
} from "@/types";

/**
 * Fetch available SMS bundles from CMS public endpoint
 */
export async function fetchSmsBundles(): Promise<SmsBundleItem[]> {
  try {
    const res: any = await getData<SmsBundleItem[]>({
      url: apiConfig.sms.bundleListUrl,
      baseUrl: import.meta.env.VITE_CMS_BASE_URL,
      token: "",
    });

    if (res?.error) {
      console.error("Error fetching SMS bundles:", res?.message ?? res?.msg);
      return [];
    }

    return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
  } catch (error) {
    console.error("Error fetching SMS bundles:", error);
    return [];
  }
}

/**
 * Purchase SMS bundle via CMS endpoint and get EPS redirect URL
 */
export async function purchaseSmsBundle(payload: SmsBundlePurchasePayload): Promise<{
  success: boolean;
  message?: string;
  data?: SmsBundlePurchaseResponse;
}> {
  try {
    const res: any = await postData<SmsBundlePurchaseResponse>({
      url: apiConfig.sms.bundlePurchaseUrl,
      body: payload,
      baseUrl: import.meta.env.VITE_CMS_BASE_URL,
      token: "",
    });

    if (res?.error || res?.errorCode) {
      const msg = res?.errorMessage ?? res?.message ?? "Failed to initiate bundle purchase";
      return { success: false, message: msg, data: res };
    }

    if (!res?.redirectUrl) {
      return {
        success: false,
        message: res?.errorMessage ?? "Payment gateway link not received. Please try again.",
        data: res,
      };
    }

    return {
      success: true,
      message: "Purchase initiated successfully",
      data: res as SmsBundlePurchaseResponse,
    };
  } catch (error: any) {
    console.error("Error purchasing SMS bundle:", error);
    return { success: false, message: error?.message ?? "Network error while purchasing bundle" };
  }
}

/**
 * Send SMS via Cash Boi insert-sms-send endpoint
 */
export async function sendSmsMessage(payload: {
  phoneNumber: string;
  msg: string;
  type?: string;
}): Promise<{
  success: boolean;
  message?: string;
  data?: SmsSendBackendData;
}> {
  const access = buildAccessUser();

  const finalPayload: SendSmsPayload = {
    accessUser: {
      phone: access.phone,
      orgId: access.orgId,
      branchId: access.branchId,
    },
    type: payload.type ?? "Any",
    phoneNumber: payload.phoneNumber,
    msg: payload.msg,
  };

  const res: any = await postData({
    url: apiConfig.sms.insertSmsSendUrl,
    body: finalPayload,
  });

  if (res?.error || res?.status === "Error") {
    return {
      success: false,
      message: res?.message ?? res?.msg ?? "SMS sending failed. Please check inputs.",
      data: res,
    };
  }

  return {
    success: true,
    message: res?.message ?? res?.msg ?? "SMS sent successfully!",
    data: res?.data as SmsSendBackendData,
  };
}

/**
 * Fetch current verified SMS balance from Cash Boi backend
 */
export async function fetchSmsBalance(): Promise<SmsBalanceData | null> {
  try {
    const res: any = await postData({
      url: apiConfig.sms.getSmsBalanceUrl,
      body: { accessUser: buildAccessUser() },
    });

    if (res?.status === "Success" && res?.data) {
      return res.data as SmsBalanceData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching SMS balance:", error);
    return null;
  }
}

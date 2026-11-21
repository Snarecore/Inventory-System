import { getData, postData } from "./api-service";
import apiConfig from "@/config/api.json";
import { buildAccessUser } from "@/utils/access-user";
import { validatePaymentRedirectUrl } from "@/utils/payment-redirect";
import type {
  SmsBundleItem,
  SmsBundlePurchasePayload,
  SmsBundlePurchaseResponse,
  SendSmsPayload,
  SmsBalanceData,
  SmsSendBackendData,
  SmsHistoryItem,
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

    const validation = validatePaymentRedirectUrl(res?.redirectUrl);
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.message,
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

    if (res?.error || res?.status === "Error") {
      console.error("Error fetching SMS balance:", res?.msg || res?.message);
      return null;
    }

    const d = res?.data ?? res;
    if (d && typeof d === "object") {
      return {
        smsBalance: Number(d.smsBalance ?? d.balance ?? d.remainingBalance ?? 0),
        smsConsumed: Number(d.smsConsumed ?? d.consumed ?? d.totalSent ?? d.smsUsed ?? 0),
        smsPurchase: Number(d.smsPurchase ?? d.totalPurchase ?? d.purchase ?? 0),
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching SMS balance:", error);
    return null;
  }
}

/**
 * Safely parse backend date formats (ISO string, "YYYY-MM-DD HH:mm:ss", Jackson array, or epoch)
 */
function parseBackendDate(raw: any): string {
  if (!raw) return "";
  if (Array.isArray(raw)) {
    // Jackson LocalDateTime serialization: [year, month, day, hour, minute, second]
    const [y, m, d, h = 0, min = 0, s = 0] = raw;
    const date = new Date(y, m - 1, d, h, min, s);
    return isNaN(date.getTime()) ? "" : date.toISOString();
  }
  if (typeof raw === "number") {
    const millis = raw < 1e11 ? raw * 1000 : raw;
    const date = new Date(millis);
    return isNaN(date.getTime()) ? "" : date.toISOString();
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    // Handle "YYYY-MM-DD HH:mm:ss" format
    const replaced = trimmed.replace(" ", "T");
    const parsed2 = new Date(replaced);
    if (!isNaN(parsed2.getTime())) {
      return parsed2.toISOString();
    }
    return trimmed;
  }
  return "";
}

/**
 * Fetch list of sent SMS records from Cash Boi backend
 */
export async function fetchSmsSendList(): Promise<SmsHistoryItem[]> {
  try {
    const res: any = await postData({
      url: apiConfig.sms.getSmsSendListUrl,
      body: { accessUser: buildAccessUser() },
    });

    if (res?.error || String(res?.status).toLowerCase() === "error") {
      console.error("Error fetching SMS send list:", res?.msg || res?.message);
      return [];
    }

    const rawList = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.smsList)
      ? res.smsList
      : Array.isArray(res?.list)
      ? res.list
      : Array.isArray(res)
      ? res
      : [];

    return rawList.map((item: any, idx: number) => {
      const rawDate =
        item.addedDate ||
        item.added_date ||
        item.createdDate ||
        item.createdAt ||
        item.created_at ||
        item.createDate ||
        item.create_date ||
        item.sendDate ||
        item.send_date ||
        item.sentDate ||
        item.sent_date ||
        item.sentAt ||
        item.sent_at ||
        item.date ||
        item.dateTime ||
        item.date_time ||
        item.timestamp ||
        item.updateDate ||
        item.updatedAt ||
        item.updated_at;

      const sentAt = parseBackendDate(rawDate);

      return {
        id: String(item.id ?? item.smsId ?? item._id ?? idx + 1),
        recipientName:
          item.recipientName ||
          item.customerName ||
          item.supplierName ||
          item.partyName ||
          item.name ||
          item.phoneNumber ||
          item.phone ||
          "Direct",
        recipientPhone: item.phoneNumber || item.phone || item.recipientPhone || "",
        recipientType: (item.type || item.recipientType || "Direct") as any,
        message: item.msg || item.message || item.text || "",
        partsCount: Number(item.partsCount || item.segmentCount || item.segments || 1),
        creditsUsed: Number(item.creditsUsed || item.cost || item.partsCount || 1),
        sentAt,
        status: (item.status === "Success" || item.status === "Delivered" ? "Delivered" : item.status || "Delivered") as any,
      };
    });
  } catch (error) {
    console.error("Error fetching SMS send list:", error);
    return [];
  }
}


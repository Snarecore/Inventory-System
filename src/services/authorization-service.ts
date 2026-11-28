import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { getUserInfo } from "@/utils/auth-storage";
import { buildAccessUser } from "@/utils/access-user";
import type {
  VerifyPinPayload,
  VerifyPinResponse,
  NormalizedPinVerificationResult,
} from "@/types";

export const getVerifyPinEndpoint = (): string => {
  const rawUrl = (apiConfig as any).auth?.verifyPinUrl;
  return rawUrl.replace(/^\/+/, "");
};

/**
 * Normalizes and validates the server response for PIN verification.
 * Follows the Adapter / DTO pattern recommended for clean frontend architecture.
 */
export const normalizeVerifyPinResponse = (
  res: any
): NormalizedPinVerificationResult => {
  if (!res) {
    return {
      isValid: false,
      message: "No response received from verification server.",
    };
  }

  // Check explicit error flag
  if (res.error === true) {
    return {
      isValid: false,
      message: res.msg || res.message || "PIN verification failed.",
      raw: res,
    };
  }

  const statusStr = String(res.status || "").toLowerCase();

  // Failure statuses
  if (statusStr === "error" || statusStr === "failed" || statusStr === "fail") {
    return {
      isValid: false,
      message: res.msg || res.message || "Invalid PIN. Please try again.",
      raw: res,
    };
  }

  // Success statuses
  if (statusStr === "success" || res.isValid === true || res.success === true) {
    return {
      isValid: true,
      message: res.msg || res.message || "PIN verified successfully.",
      raw: res,
    };
  }

  // Default fallback check
  const isOk = !res.error && !res.msg?.toLowerCase().includes("wrong") && !res.msg?.toLowerCase().includes("error");
  return {
    isValid: isOk,
    message: res.msg || res.message || (isOk ? "PIN verified successfully." : "Invalid PIN."),
    raw: res,
  };
};

/**
 * Verifies user authorization PIN against the backend endpoint.
 *
 * Automatically pulls the active authenticated user's phone number if not explicitly passed.
 *
 * @param pin - The 4-digit PIN code to verify
 * @param phoneNumber - Optional override for phone number
 * @returns NormalizedPinVerificationResult with { isValid, message, raw }
 */
export async function verifyAuthorizationPin(
  pin: string,
  phoneNumber?: string,
  token?: string
): Promise<NormalizedPinVerificationResult> {
  const cleanPin = String(pin || "").trim();
  if (!cleanPin) {
    return {
      isValid: false,
      message: "Please enter your PIN.",
    };
  }

  // Resolve authenticated user phone number
  const userInfo = getUserInfo();
  const accessUser = buildAccessUser();
  const phone =
    phoneNumber ||
    userInfo?.phoneNumber ||
    userInfo?.phone ||
    accessUser?.phone ||
    "";

  if (!phone) {
    return {
      isValid: false,
      message: "User phone number not found in active session.",
    };
  }

  const url = getVerifyPinEndpoint();
  const body: VerifyPinPayload = {
    authentication: {
      phone_number: phone,
      pin: cleanPin,
    },
  };

  // Resolve active token (explicitly passed token, stored token, or userInfo token)
  const activeToken = token || userInfo?.token || undefined;

  try {
    const res: any = await postData<VerifyPinResponse>({
      url,
      body,
      token: activeToken,
    });

    return normalizeVerifyPinResponse(res);
  } catch (err: any) {
    return {
      isValid: false,
      message: err?.message || "Failed to connect to verification server.",
      raw: err,
    };
  }
}

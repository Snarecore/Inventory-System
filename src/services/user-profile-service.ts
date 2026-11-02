import { getData, postData, postFormData } from "./api-service";
import apiConfig from "@/config/api.json";
import { buildAccessUser } from "@/utils/access-user";
import { getUserInfo, setUserInfo } from "@/utils/auth-storage";
import type {
  UserProfileData,
  UpdateUserProfilePayload,
} from "@/types/user-profile.types";

/**
 * Normalizes phone number from explicit argument or local storage session
 */
export function getActiveUserPhone(phoneParam?: string): string {
  if (phoneParam && phoneParam.trim()) {
    return phoneParam.trim();
  }
  const userInfo = getUserInfo();
  return (userInfo?.phoneNumber || "").trim();
}

/**
 * Returns direct URL for user profile photo
 * Uses VITE_API_BASE_URL from .env and profileImageUrl from api.json
 */
export function getUserProfileImageUrl(phoneParam?: string): string {
  const phone = getActiveUserPhone(phoneParam);
  if (!phone) return "";

  const rawApiUrl = (import.meta.env.VITE_API_BASE_URL as string)?.replace(/\/+$/, "") || "";
  const imageEndpoint = apiConfig.userProfile.profileImageUrl;
  return `${rawApiUrl}/${imageEndpoint}/${encodeURIComponent(phone)}`;
}

/**
 * Fetches user profile by phone number (exact 24 backend fields)
 * Endpoint: GET /user-profile/phone/{phone}
 */
export async function getUserProfile(
  phoneParam?: string
): Promise<UserProfileData | null> {
  const phone = getActiveUserPhone(phoneParam);
  if (!phone) return null;

  const res = (await getData<any>({
    url: `${apiConfig.userProfile.userProfileUrl}/${encodeURIComponent(phone)}`,
  })) as any;

  if (res?.error) {
    throw new Error(res?.msg || "Failed to load user profile");
  }

  const rawData = res?.profile ?? res;
  if (!rawData || typeof rawData !== "object") return null;

  const profileData: UserProfileData = {
    id: rawData.id ?? null,
    accountType: rawData.accountType ?? null,
    fullName: rawData.fullName ?? "",
    phoneNumber: rawData.phoneNumber ?? phone,
    email: rawData.email ?? null,
    divisionId: rawData.divisionId ?? null,
    divisionName: rawData.divisionName ?? null,
    districtId: rawData.districtId ?? null,
    districtName: rawData.districtName ?? null,
    upazilaId: rawData.upazilaId ?? null,
    upazilaName: rawData.upazilaName ?? null,
    address: rawData.address ?? null,
    pin: rawData.pin ?? null,
    isInventory: rawData.isInventory ?? null,
    pinRequiredFor: rawData.pinRequiredFor ?? null,
    isSilentMode: rawData.isSilentMode ?? null,
    balanceCheckEnabled: rawData.balanceCheckEnabled ?? null,
    status: rawData.status ?? null,
    profileCompletionPercentage: rawData.profileCompletionPercentage ?? null,
    addedBy: rawData.addedBy ?? null,
    addedDate: rawData.addedDate ?? null,
    updatedBy: rawData.updatedBy ?? null,
    userId: rawData.userId ?? null,
    updatedDate: rawData.updatedDate ?? null,
  };

  return profileData;
}

/**
 * Uploads user profile photo
 * Endpoint: POST /upload or POST /files/upload
 */
export async function uploadUserProfilePhoto(
  file: File,
  phoneParam?: string
): Promise<any> {
  const phone = getActiveUserPhone(phoneParam);
  if (!phone) throw new Error("User phone number is required to upload photo");

  // 1. Primary /upload endpoint
  const formData = new FormData();
  formData.append("file", file);
  formData.append("phoneNumber", phone);
  formData.append("username", phone);
  formData.append("user", phone);

  try {
    const res = (await postFormData<any>({
      url: apiConfig.userProfile.imageUploadUrl,
      body: formData,
    })) as any;

    if (!res?.error) {
      return res;
    }
  } catch (err) {
    console.warn("Primary /upload failed, trying fallback files/upload:", err);
  }

  // 2. Fallback to files/upload
  const fallbackForm = new FormData();
  fallbackForm.append("file", file);
  fallbackForm.append("category", "user-profile");
  fallbackForm.append("fileRefNo", phone.replace(/\D/g, "").slice(-6) || "123456");
  fallbackForm.append("userName", phone);
  fallbackForm.append("subCategory", "avatar");

  const fallbackRes = (await postFormData<any>({
    url: "files/upload",
    body: fallbackForm,
  })) as any;

  if (fallbackRes?.error) {
    throw new Error(fallbackRes?.msg || fallbackRes?.message || "Failed to upload profile photo");
  }

  return fallbackRes;
}

/**
 * Updates user profile with exact 24 backend fields
 * Endpoint: POST /user-profile
 */
export async function updateUserProfile(
  payload: UpdateUserProfilePayload
): Promise<any> {
  const accessUser = buildAccessUser();

  const body = {
    accessUser: {
      phone: accessUser.phone || payload.phoneNumber,
      businessCode: accessUser.businessCode || "",
    },
    profile: payload,
  };

  const res = (await postData<any>({
    url: apiConfig.userProfile.userProfileSaveUrl,
    body,
  })) as any;

  if (res?.error) {
    throw new Error(res?.msg || res?.message || "Failed to update profile");
  }

  syncLocalStorageUser(payload.fullName, payload.pin);

  return res;
}

/**
 * Helper to sync updated name and pin to local storage
 */
function syncLocalStorageUser(fullName?: string, pin?: string | null) {
  try {
    const userInfo = getUserInfo();
    if (userInfo) {
      const updated = {
        ...userInfo,
        ...(fullName ? { fullName } : {}),
        ...(pin ? { pin } : {}),
      };
      setUserInfo(updated);
    }
  } catch (err) {
    console.error("Failed to sync updated user_info to localStorage:", err);
  }
}

/**
 * Request OTP sent to user's registered mobile number
 * Endpoint: POST /otp-send
 */
export async function sendOtp(phoneParam?: string): Promise<{ status: string; msg: string }> {
  const phone = getActiveUserPhone(phoneParam);
  const res = (await postData<any>({
    url: apiConfig.userProfile.otpSendUrl,
    body: { phone },
  })) as any;

  if (res?.error || res?.status === "Error" || res?.status === "Failed") {
    throw new Error(res?.msg || res?.message || "Failed to send OTP");
  }

  return res;
}

/**
 * Verify OTP received on user's registered mobile number
 * Endpoint: POST /otp-verify
 */
export async function verifyOtp(otp: string, phoneParam?: string): Promise<{ status: string; msg: string }> {
  const phone = getActiveUserPhone(phoneParam);
  const res = (await postData<any>({
    url: apiConfig.userProfile.otpVerifyUrl,
    body: { phone, otp },
  })) as any;

  if (res?.error || res?.status === "Error" || res?.status === "Failed") {
    throw new Error(res?.msg || res?.message || "Invalid OTP code");
  }

  return res;
}

/**
 * Updates user PIN through profile update workflow
 */
export async function updateUserPinWithProfile(
  newPin: string,
  existingProfile?: UserProfileData | null,
  phoneParam?: string
): Promise<any> {
  const phone = getActiveUserPhone(phoneParam);
  const profileToUpdate = existingProfile || (await getUserProfile(phone));

  if (!profileToUpdate) {
    throw new Error("Unable to retrieve profile to update PIN.");
  }

  const payload: UpdateUserProfilePayload = {
    ...profileToUpdate,
    phoneNumber: profileToUpdate.phoneNumber || phone,
    pin: newPin,
  };

  return await updateUserProfile(payload);
}

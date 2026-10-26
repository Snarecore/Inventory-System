import { getData, postData } from "./api-service";
import apiConfig from "@/config/api.json";
import { buildAccessUser } from "@/utils/access-user";
import type {
  BusinessProfileData,
  BusinessProfileSavePayload,
  BusinessProfileApiResponse,
  BusinessTypeItem,
} from "@/types/business.types";

/**
 * Fetch business profile by orgId and branchId.
 * Verified v4 endpoint: GET /business-profile/org/{orgId}/branch/{branchId}
 */
export async function getBusinessProfile(
  orgIdParam?: number | string,
  branchIdParam?: number | string
): Promise<BusinessProfileApiResponse> {
  const accessUser = buildAccessUser();
  const orgId = orgIdParam ?? accessUser.orgId;
  const branchId = branchIdParam ?? accessUser.branchId;

  if (!orgId || !branchId) {
    throw new Error("Business profile requires orgId and branchId.");
  }

  const endpoint = `${apiConfig.business.businessProfileUrl}/org/${orgId}/branch/${branchId}`;
  const response = (await getData<any>({ url: endpoint })) as any;

  if (response?.error || (typeof response?.status === "string" && response.status.toLowerCase() === "error")) {
    const errorMsg = response?.msg || response?.message || "Failed to load business profile.";
    throw new Error(errorMsg);
  }

  // Ensure businessLogoUrl is populated if backend returns null but businessLogoRefNo exists
  if (response?.data) {
    const apiBase = (import.meta.env.VITE_API_BASE_URL as string)?.replace(/\/+$/, "") || "";
    const rawRef = response.data.businessLogoRefNo || response.data.businessLogo || "";
    if (rawRef.includes("/files/file/")) {
      response.data.businessLogoUrl = rawRef;
      response.data.businessLogoRefNo = rawRef.split("/files/file/").pop() || rawRef;
    } else if (rawRef) {
      response.data.businessLogoUrl = `${apiBase}/files/file/${rawRef}`;
    }
  }

  return response as BusinessProfileApiResponse;
}

/**
 * Save / update business profile.
 * Endpoint: POST /business-profile-save
 * Strictly sends only verified keys (No ghost keys!):
 * - accessUser
 * - businessName
 * - businessType
 * - businessOwnerName
 * - businessPhone1
 * - businessPhone2
 * - businessEmail
 * - address
 * - website
 * - tradeLicenseNo
 * - tinNo
 * - binNo
 * - businessLogo
 * - description
 */
export async function saveBusinessProfile(
  payload: BusinessProfileSavePayload
): Promise<BusinessProfileApiResponse> {
  const accessUser = buildAccessUser();

  let cleanKey = payload.businessLogoRefNo?.trim() || payload.businessLogo?.trim() || "";
  if (cleanKey.includes("/files/file/")) {
    cleanKey = cleanKey.split("/files/file/").pop() || cleanKey;
  }
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string)?.replace(/\/+$/, "") || "";
  const fullLogoUrl =
    payload.businessLogoUrl?.trim() ||
    (cleanKey ? `${apiBase}/files/file/${cleanKey}` : "");

  const body = {
    accessUser,
    orgId: payload.orgId ? Number(payload.orgId) : accessUser.orgId,
    branchId: payload.branchId ? Number(payload.branchId) : accessUser.branchId,
    businessName: payload.businessName?.trim() || "",
    businessType: payload.businessType?.trim() || "",
    businessOwnerName: payload.businessOwnerName?.trim() || "",
    businessPhone1: payload.businessPhone1?.trim() || "",
    businessPhone2: payload.businessPhone2?.trim() || "",
    businessEmail: payload.businessEmail?.trim() || "",
    address: payload.address?.trim() || "",
    website: payload.website?.trim() || "",
    tradeLicenseNo: payload.tradeLicenseNo?.trim() || "",
    tinNo: payload.tinNo?.trim() || "",
    binNo: payload.binNo?.trim() || "",
    businessLogo: cleanKey,
    businessLogoRefNo: cleanKey,
    businessLogoUrl: fullLogoUrl,
    description: payload.description?.trim() || "",
  };

  const response = (await postData<any>({
    url: apiConfig.business.businessProfileSaveUrl,
    body,
  })) as any;

  if (response?.error || (typeof response?.status === "string" && response.status.toLowerCase() === "error")) {
    const errorMsg = response?.msg || response?.message || "Failed to save business profile.";
    throw new Error(errorMsg);
  }

  // Ensure businessLogoUrl is populated in response if backend returns null
  if (response?.data) {
    const savedKey = response.data.businessLogoRefNo || response.data.businessLogo || cleanKey;
    const cleanSaved = savedKey.includes("/files/file/")
      ? savedKey.split("/files/file/").pop() || savedKey
      : savedKey;
    response.data.businessLogoRefNo = cleanSaved;
    response.data.businessLogoUrl =
      fullLogoUrl || (cleanSaved ? `${apiBase}/files/file/${cleanSaved}` : "");
  }

  return response as BusinessProfileApiResponse;
}

/**
 * Fetch list of official business categories / types.
 * Endpoint: GET /get-business-types
 */
export async function getBusinessTypes(): Promise<BusinessTypeItem[]> {
  const response = (await getData<any>({
    url: apiConfig.business.businessTypesUrl,
  })) as any;

  if (Array.isArray(response)) {
    return response as BusinessTypeItem[];
  }

  if (Array.isArray(response?.data)) {
    return response.data as BusinessTypeItem[];
  }

  return [];
}

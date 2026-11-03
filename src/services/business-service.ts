import { getData, postData } from "./api-service";
import apiConfig from "@/config/api.json";
import { buildAccessUser } from "@/utils/access-user";
import { getFileViewUrl } from "./file-upload-service";
import type {
  BusinessProfileData,
  BusinessProfileSavePayload,
  BusinessTypeItem,
} from "@/types/business.types";

export async function getBusinessProfile(
  orgIdParam?: number | string,
  branchIdParam?: number | string
): Promise<BusinessProfileData | null> {
  const accessUser = buildAccessUser();
  const orgId = orgIdParam ?? accessUser.orgId;
  const branchId = branchIdParam ?? accessUser.branchId;

  if (!orgId || !branchId) return null;

  const res = (await getData<any>({
    url: `${apiConfig.business.businessProfileUrl}/org/${orgId}/branch/${branchId}`,
  })) as any;

  if (res?.error) {
    throw new Error(res?.msg || "Failed to load business profile");
  }

  const data: BusinessProfileData = res?.data ?? res;
  if (data) {
    const rawLogo = data.businessLogoRefNo || data.businessLogo || "";
    const cleanRef = rawLogo.replace(/.*\/files\/file\//, "").trim();
    data.businessLogoRefNo = cleanRef;
    data.businessLogoUrl = data.businessLogoUrl || (cleanRef ? getFileViewUrl(cleanRef) : "");
  }

  return data;
}

export async function saveBusinessProfile(
  payload: BusinessProfileSavePayload
): Promise<any> {
  const accessUser = buildAccessUser();
  const cleanLogo = (payload.businessLogoRefNo || payload.businessLogo || "")
    .replace(/.*\/files\/file\//, "")
    .trim();

  const body = {
    ...payload,
    accessUser,
    orgId: payload.orgId != null && payload.orgId !== "" ? Number(payload.orgId) : accessUser.orgId,
    branchId: payload.branchId != null && payload.branchId !== "" ? Number(payload.branchId) : accessUser.branchId,
    businessLogo: cleanLogo,
    businessLogoRefNo: cleanLogo,
    businessLogoUrl: cleanLogo ? getFileViewUrl(cleanLogo) : "",
  };

  const res = (await postData<any>({
    url: apiConfig.business.businessProfileSaveUrl,
    body,
  })) as any;

  if (res?.error) {
    throw new Error(res?.msg || "Failed to save business profile");
  }

  return res;
}

export async function getBusinessTypes(): Promise<BusinessTypeItem[]> {
  const res = (await getData<any>({
    url: apiConfig.business.businessTypesUrl,
  })) as any;

  return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
}

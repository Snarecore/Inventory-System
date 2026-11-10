import { postFormData } from "./api-service";
import { getUserInfo } from "@/utils/auth-storage";

export async function uploadBusinessLogo(file: File, phone?: string): Promise<string> {
  const userInfo = getUserInfo();
  const effectivePhone = phone?.trim() || userInfo?.phoneNumber;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", "business-logo");
  formData.append("fileRefNo", effectivePhone.replace(/\D/g, "").slice(-6) || "123456");
  formData.append("userName", effectivePhone);
  formData.append("subCategory", "");

  const res = (await postFormData<any>({
    url: "files/upload",
    body: formData,
  })) as any;

  const guid = res?.fileGUID || res?.data?.fileGUID || res?.data || "";
  if (res?.error || !guid) {
    throw new Error(res?.msg || res?.message || "Failed to upload business logo");
  }

  return typeof guid === "string" ? guid : guid.fileGUID || "";
}

export async function uploadEmployeePhoto(file: File, phone?: string): Promise<string> {
  // Uses identical category ("business-logo") and upload endpoint as Business Profile
  return uploadBusinessLogo(file, phone);
}

/**
 * Matches Business Profile base URL pattern: ${apiBase}/files/file/${guid}
 */
export function getFileViewUrl(fileGUIDOrUrl?: string | null): string {
  if (!fileGUIDOrUrl) return "";
  const trimmed = String(fileGUIDOrUrl).trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return "";

  if (/^(https?:|blob:|data:)/i.test(trimmed)) {
    return trimmed;
  }

  const cleanRef = trimmed.replace(/^.*\/files\/file\//, "").replace(/^\/+/, "");
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string)?.replace(/\/+$/, "") || "";
  return apiBase ? `${apiBase}/files/file/${cleanRef}` : cleanRef;
}
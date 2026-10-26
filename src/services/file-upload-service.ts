import { postFormData } from "./api-service";

export async function uploadBusinessLogo(file: File, phone?: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", "business-logo");
  formData.append("fileRefNo", phone?.replace(/\D/g, "").slice(-6) || "123456");
  formData.append("userName", phone || "01317020309");
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

/**
 * Converts a fileGUID or relative path to a full accessible image URL.
 */
export function getFileViewUrl(fileGUIDOrUrl?: string | null): string {
  if (!fileGUIDOrUrl) return "";
  const trimmed = fileGUIDOrUrl.trim();
  if (/^(https?:|blob:|data:)/i.test(trimmed)) {
    return trimmed;
  }
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string)?.replace(/\/+$/, "") || "";
  return apiBase ? `${apiBase}/files/file/${trimmed}` : trimmed;
}
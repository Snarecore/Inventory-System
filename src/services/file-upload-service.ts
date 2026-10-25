import { getStoredToken, getUserInfo, getStoredUser, getBusinessCode } from "@/utils/auth-storage";

export interface FileUploadResponse {
  storedName: string;
  fileGUID: string;
  message?: string;
  category?: string;
  status: "success" | "error" | string;
  fileId?: number;
  error?: boolean;
}

export interface UploadBusinessLogoOptions {
  file: File;
  category?: string;
  fileRefNo?: string;
  userName?: string;
  subCategory?: string;
}

/**
 * Generate fileRefNo using 6 digits from the user's mobile number.
 * Example: for mobile "01317020309" -> "020309" (last 6 digits).
 */
export function generateFileRefNo(phone?: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length >= 6) {
    return digits.slice(-6);
  }
  return (digits + "123456").slice(0, 6);
}

/**
 * Upload business logo image to the dedicated file upload endpoint.
 * Matches exact contract:
 * URL: https://itouch.stepserp.com/itouch_testing/api/files/upload
 * Method: POST (multipart/form-data)
 * Header: Authorization: Bearer <token>
 * Form keys: file, category='business-logo', fileRefNo, userName, subCategory=''
 */
export async function uploadBusinessLogo({
  file,
  category = "business-logo",
  fileRefNo,
  userName,
  subCategory = "",
}: UploadBusinessLogoOptions): Promise<FileUploadResponse> {
  const token = getStoredToken();
  const userInfo = getUserInfo();
  const storedUser = getStoredUser();

  const finalUserName =
    userName ||
    userInfo?.phone ||
    userInfo?.phoneNumber ||
    (userInfo as any)?.username ||
    (userInfo as any)?.userPhone ||
    storedUser?.id ||
    localStorage.getItem("phone") ||
    sessionStorage.getItem("phone") ||
    "01317020309";

  const finalFileRefNo =
    fileRefNo ||
    generateFileRefNo(finalUserName);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category || "business-logo");
  formData.append("fileRefNo", finalFileRefNo);
  formData.append("userName", finalUserName);
  formData.append("subCategory", subCategory ?? "");

  const apiBase =
    (import.meta.env.VITE_API_BASE_URL as string)?.replace(/\/+$/, "") || "";

  const uploadUrl =
    import.meta.env.VITE_IMAGE_BASE_URL ||
    (apiBase ? `${apiBase}/files/upload` : "");

  console.log("[LogoUpload] Uploading image to:", uploadUrl, {
    category,
    fileRefNo: finalFileRefNo,
    userName: finalUserName,
    fileName: file.name,
    fileSize: file.size,
  });

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = token.startsWith("Bearer ")
      ? token
      : `Bearer ${token}`;
  }

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("[LogoUpload] Failed:", response.status, errorText);
    throw new Error(
      `File upload failed (${response.status}): ${errorText || response.statusText}`
    );
  }

  const data: FileUploadResponse = await response.json();
  console.log("[LogoUpload] Upload successful:", data);
  return data;
}

/**
 * Constructs a full view URL from a fileGUID or relative URL.
 * Automatically adapts to the active API base URL (test vs live).
 */
export function getFileViewUrl(fileGUIDOrUrl?: string | null): string {
  if (!fileGUIDOrUrl) return "";
  const trimmed = fileGUIDOrUrl.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  const apiBase =
    (import.meta.env.VITE_API_BASE_URL as string)?.replace(/\/+$/, "") || "";

  return apiBase ? `${apiBase}/files/file/${trimmed}` : trimmed;
}

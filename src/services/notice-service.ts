import apiConfig from "@/config/api.json";
import { getData, postData } from "./api-service";
import type { NoticesResponse, MarkNoticeReadResponse } from "@/types";

const CMS_PUBLIC_BASE =
  import.meta.env.VITE_CMS_BASE_URL ||
  "https://apps-cashboi.stepserp.com/cashboi-cms/cms/api/public";

const EMPTY_NOTICES_RESPONSE: NoticesResponse = {
  totalElements: 0,
  totalPages: 0,
  page: 0,
  size: 20,
  items: [],
};

/**
 * Fetch paginated notices for a user from CMS public endpoint
 * GET /notices?userId={userId}&page={page}&size={size}
 */
export async function fetchNotices(
  userId?: string | number | null,
  page = 0,
  size = 20
): Promise<NoticesResponse> {
  if (!userId) return EMPTY_NOTICES_RESPONSE;

  const params = new URLSearchParams({
    userId: String(userId),
    page: String(page),
    size: String(size),
  });
  const endpoint = `${apiConfig.notices.listUrl}?${params.toString()}`;

  const res: any = await getData<NoticesResponse>({
    url: endpoint,
    baseUrl: CMS_PUBLIC_BASE,
    token: "",
  });

  if (res?.error) {
    throw new Error(res?.message || res?.msg || "Failed to load notices");
  }

  return {
    totalElements: Number(res?.totalElements ?? 0),
    totalPages: Number(res?.totalPages ?? 0),
    page: Number(res?.page ?? page),
    size: Number(res?.size ?? size),
    items: Array.isArray(res?.items) ? res.items : [],
  };
}

/**
 * Mark a notice as read for a user
 * POST /notices/{id}/read?userId={userId}
 */
export async function markNoticeAsRead(
  noticeId: number | string,
  userId?: string | number | null
): Promise<MarkNoticeReadResponse> {
  if (!userId) {
    return { success: false };
  }

  const params = new URLSearchParams({ userId: String(userId) });
  const endpoint = `${apiConfig.notices.markReadUrl}/${encodeURIComponent(
    String(noticeId)
  )}/read?${params.toString()}`;

  const res: any = await postData<MarkNoticeReadResponse>({
    url: endpoint,
    body: {},
    baseUrl: CMS_PUBLIC_BASE,
    token: "",
  });

  if (res?.error) {
    throw new Error(res?.message || res?.msg || "Failed to mark notice as read");
  }

  return {
    success: Boolean(res?.success ?? true),
  };
}

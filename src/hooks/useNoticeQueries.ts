import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { noticesQueryKey } from "@/config/query-key";
import { fetchNotices, markNoticeAsRead } from "@/services/notice-service";
import { getStoredUser, getUserInfo } from "@/utils/auth-storage";
import type { NoticesResponse } from "@/types";

/**
 * Resolve current userId for notice API calls
 */
export function getCurrentNoticeUserId(): string {
  const userInfo = getUserInfo();
  const storedUser = getStoredUser();
  const raw = (userInfo as any)?.userId ?? storedUser?.id ?? userInfo?.businessCode ?? "";
  return raw ? String(raw) : "";
}

/**
 * Hook to fetch paginated notices for the current user
 */
export function useNoticesQuery(
  userId?: string | number | null,
  page = 0,
  size = 20
) {
  return useQuery<NoticesResponse>({
    queryKey: [noticesQueryKey, userId, page, size],
    queryFn: () => fetchNotices(userId, page, size),
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to mark a notice as read and update cached notice lists
 */
export function useMarkNoticeReadMutation(userId?: string | number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noticeId: number | string) => markNoticeAsRead(noticeId, userId),
    onSuccess: (data, noticeId) => {
      if (!data?.success) return;

      queryClient.setQueriesData<NoticesResponse>(
        { queryKey: [noticesQueryKey] },
        (old) => {
          if (!old || !Array.isArray(old.items)) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              String(item.id) === String(noticeId) ? { ...item, read: true } : item
            ),
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: [noticesQueryKey] });
    },
  });
}

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { socialLinksQueryKey } from "@/config/query-key";
import { fetchSocialLinks } from "@/services/social-links-service";
import { normalizePaginatedResponse } from "@/utils/normalize-paginated-response";
import { showErrorToast } from "@/utils/toast-utils";

export const useSocialLinksQuery = (page: number, limit: number) => {
  const query = useQuery({
    queryKey: [socialLinksQueryKey, String(page)],
    queryFn: () => fetchSocialLinks(page, limit),
    refetchOnWindowFocus: false,
    staleTime: 30000,
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (query.error) {
      showErrorToast(query.error.message || "Failed to fetch social links");
    }
  }, [query.error]);

  const normalized = normalizePaginatedResponse(query.data, limit);
  return { ...query, data: normalized.data, pageCount: normalized.pageCount };
};

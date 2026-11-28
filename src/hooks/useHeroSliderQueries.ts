import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { heroSliderQueryKey } from "@/config/query-key";
import {
  deleteHeroSlider,
  fetchHeroSliders,
  saveHeroSlider,
  updateHeroSliderStatus,
} from "@/services/hero-slider-service";
import { normalizePaginatedResponse } from "@/utils/normalize-paginated-response";
import { showErrorToast, showSuccessToast } from "@/utils/toast-utils";

const getMessage = (response: unknown, fallback: string): string => {
  if (!response || typeof response !== "object") return fallback;
  const result = response as { msg?: string; message?: string };
  return result.msg || result.message || fallback;
};

export const useHeroSliderListQuery = <T,>(page: number, limit: number) => {
  const query = useQuery({
    queryKey: [heroSliderQueryKey, String(page)],
    queryFn: () => fetchHeroSliders(page, limit),
    refetchOnWindowFocus: false,
    staleTime: 30000,
    placeholderData: (previousData) => previousData,
  });

  const normalized = normalizePaginatedResponse<T>(query.data, limit);
  return { ...query, data: normalized.data, pageCount: normalized.pageCount };
};

export const useSaveHeroSliderMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, id }: { payload: Record<string, unknown>; id?: string }) =>
      saveHeroSlider(payload, id),
    onSuccess: (response) => {
      showSuccessToast(getMessage(response, "Operation successful!"));
      queryClient.invalidateQueries({ queryKey: [heroSliderQueryKey] });
    },
    onError: (error: Error) => showErrorToast(error.message || "Failed to save hero slider"),
  });
};

export const useUpdateHeroSliderStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: boolean }) =>
      updateHeroSliderStatus(id, status),
    onSuccess: (response) => {
      showSuccessToast(getMessage(response, "Operation successful!"));
      queryClient.invalidateQueries({ queryKey: [heroSliderQueryKey] });
    },
    onError: (error: Error) =>
      showErrorToast(error.message || "Failed to update hero slider status"),
  });
};

export const useDeleteHeroSliderMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteHeroSlider,
    onSuccess: (response) => {
      showSuccessToast(getMessage(response, "Deleted successfully!"));
      queryClient.invalidateQueries({ queryKey: [heroSliderQueryKey] });
    },
    onError: (error: Error) => showErrorToast(error.message || "Failed to delete hero slider"),
  });
};

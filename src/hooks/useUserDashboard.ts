import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { userDashboardQueryKey } from '@/config/query-key';
import { fetchUserDashboard } from '@/services/dashboard-service';
import type { UserDashboardData } from '@/pages/admin/main/admin-dashboard/types/dashboard.types';

/**
 * TanStack React Query hook for the "get-user-dashboard" endpoint.
 * Provides real-time KPI data, sales trends, asset breakdown, P&L, top customers, and top sale items.
 */
export const useUserDashboardQuery = (
  options?: Omit<UseQueryOptions<UserDashboardData, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<UserDashboardData, Error>({
    queryKey: [userDashboardQueryKey],
    queryFn: fetchUserDashboard,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

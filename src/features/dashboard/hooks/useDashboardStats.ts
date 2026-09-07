import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats } from '@/features/bookings/api/bookingsApi';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats-v2'],
    queryFn: fetchDashboardStats,
    staleTime: 2 * 60_000,
    refetchInterval: 3 * 60_000,
  });
}

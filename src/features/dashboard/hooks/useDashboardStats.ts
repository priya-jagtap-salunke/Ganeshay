import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats } from '@/features/bookings/api/bookingsApi';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats-v2'],
    queryFn: fetchDashboardStats,
    refetchInterval: 60_000,
  });
}

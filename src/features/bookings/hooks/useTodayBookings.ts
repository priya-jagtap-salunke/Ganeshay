import { useQuery } from '@tanstack/react-query';
import { fetchTodayBookings } from '../api/bookingsApi';

export function useTodayBookings() {
  return useQuery({
    queryKey: ['bookings', 'today'],
    queryFn: fetchTodayBookings,
    staleTime: 60_000,
    refetchInterval: 3 * 60_000,
  });
}

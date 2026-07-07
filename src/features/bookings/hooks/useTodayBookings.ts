import { useQuery } from '@tanstack/react-query';
import { fetchTodayBookings } from '../api/bookingsApi';

export function useTodayBookings() {
  return useQuery({
    queryKey: ['bookings', 'today'],
    queryFn: fetchTodayBookings,
    refetchInterval: 60_000,
  });
}

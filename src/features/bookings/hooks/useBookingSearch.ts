import { useQuery } from '@tanstack/react-query';
import { searchBookings } from '../api/bookingsApi';
import { useDebounce } from '@/hooks/useDebounce';

export function useBookingSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300);

  const { data, isFetching } = useQuery({
    queryKey: ['bookings', 'search', debouncedQuery],
    queryFn: () => searchBookings(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  return { results: data ?? [], isSearching: isFetching };
}

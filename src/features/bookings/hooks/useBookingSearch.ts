import { useQuery } from '@tanstack/react-query';
import { searchBookings } from '../api/bookingsApi';
import { useDebounce } from '@/hooks/useDebounce';

export function useBookingSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300);
  const canSearch = debouncedQuery.trim().length >= 1;

  const { data, isFetching } = useQuery({
    queryKey: ['bookings', 'search', debouncedQuery],
    queryFn: () => searchBookings(debouncedQuery),
    enabled: canSearch,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  return {
    results: canSearch ? (data ?? []) : [],
    isSearching: canSearch && isFetching,
  };
}

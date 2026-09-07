import { useQuery } from '@tanstack/react-query';
import { fetchBookingIdentityRows } from '../api/bookingsApi';
import { getBookedAgainIds } from '../utils/bookedAgain';

const QUERY_KEY = ['bookings', 'booked-again-ids'] as const;

/** Set of booking IDs that are a repeat for the same name + mobile. */
export function useBookedAgainIds() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const rows = await fetchBookingIdentityRows();
      return getBookedAgainIds(rows);
    },
    staleTime: 60_000,
  });
}

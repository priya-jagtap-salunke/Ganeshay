import { useQuery } from '@tanstack/react-query';
import { fetchCustomerList, fetchYearBookings } from '../api/reportsApi';

export function useYearBookings(year: number) {
  return useQuery({
    queryKey: ['reports', 'bookings', year],
    queryFn: () => fetchYearBookings(year),
  });
}

export function useCustomerList() {
  return useQuery({
    queryKey: ['reports', 'customers'],
    queryFn: fetchCustomerList,
  });
}

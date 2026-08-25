import { Router } from 'expo-router';

export type BookingReturnTo = 'dashboard' | 'reports' | 'search' | 'year';

const RETURN_ROUTES: Record<BookingReturnTo, string> = {
  dashboard: '/(app)/dashboard',
  reports: '/(app)/reports',
  search: '/(app)/booking/search',
  year: '/(app)/booking/year',
};

export function openBookingDetails(
  router: Router,
  bookingId: string,
  returnTo: BookingReturnTo = 'dashboard'
) {
  router.push({
    pathname: '/(app)/booking/[id]',
    params: { id: bookingId, returnTo },
  });
}

export function resolveBookingReturnRoute(returnTo?: string | string[]) {
  const key = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  if (key && key in RETURN_ROUTES) {
    return RETURN_ROUTES[key as BookingReturnTo];
  }
  return RETURN_ROUTES.dashboard;
}

export function closeBookingDetails(
  router: Router,
  returnTo?: string | string[]
) {
  router.replace(resolveBookingReturnRoute(returnTo));
}

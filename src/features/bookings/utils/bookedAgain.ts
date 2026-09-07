import { Booking } from '@/types/booking';
import { normalizeMobile } from '@/features/telecalling/utils/phoneNormalize';

export function normalizeCustomerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Stable key for matching the same customer (name + mobile). */
export function customerIdentityKey(
  customerName: string,
  mobile: string
): string {
  return `${normalizeCustomerName(customerName)}|${normalizeMobile(mobile)}`;
}

function bookingTime(booking: {
  booking_date?: string | null;
  created_at?: string | null;
}): number {
  const raw = booking.booking_date || booking.created_at || '';
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Booking IDs that are a repeat for the same name + mobile.
 * The earliest booking keeps a plain name; later ones are "booked again".
 */
export function getBookedAgainIds(
  bookings: Array<{
    id: string;
    customer_name: string;
    mobile: string;
    booking_date?: string | null;
    created_at?: string | null;
  }>
): Set<string> {
  const groups = new Map<string, typeof bookings>();

  for (const booking of bookings) {
    const mobile = normalizeMobile(booking.mobile);
    const name = normalizeCustomerName(booking.customer_name);
    if (!mobile || !name) continue;

    const identity = `${name}|${mobile}`;
    const list = groups.get(identity) ?? [];
    list.push(booking);
    groups.set(identity, list);
  }

  const again = new Set<string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => {
      const diff = bookingTime(a) - bookingTime(b);
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    });
    for (let i = 1; i < sorted.length; i++) {
      again.add(sorted[i].id);
    }
  }
  return again;
}

export function formatCustomerNameWithBookedAgain(
  customerName: string,
  bookedAgain: boolean
): string {
  const name = customerName.trim() || 'Customer';
  return bookedAgain ? `${name} (booked again)` : name;
}

/** Type helper when callers already have Booking[]. */
export function getBookedAgainIdsFromBookings(
  bookings: Booking[]
): Set<string> {
  return getBookedAgainIds(bookings);
}

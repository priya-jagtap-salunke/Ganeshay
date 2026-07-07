import { supabase } from '@/lib/supabase';
import { Booking } from '@/types/booking';

export interface YearlySummary {
  year: number;
  totalBookings: number;
  totalSales: number;
  advanceCollected: number;
  pendingAmount: number;
  deliveredCount: number;
}

export interface CustomerRecord {
  customerName: string;
  mobile: string;
  totalBookings: number;
  totalSpent: number;
  lastBookingDate: string;
  lastBookingId: string;
}

export function getAvailableReportYears(): number[] {
  const current = new Date().getFullYear();
  return [current - 2, current - 1, current, current + 1];
}

export async function fetchYearBookings(year: number): Promise<Booking[]> {
  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .gte('booking_date', start)
    .lt('booking_date', end)
    .order('booking_date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export function buildYearlySummary(
  year: number,
  bookings: Booking[]
): YearlySummary {
  return {
    year,
    totalBookings: bookings.length,
    totalSales: bookings.reduce((sum, b) => sum + Number(b.price), 0),
    advanceCollected: bookings.reduce((sum, b) => sum + Number(b.advance), 0),
    pendingAmount: bookings.reduce((sum, b) => sum + Number(b.pending), 0),
    deliveredCount: bookings.filter((b) => b.status === 'Delivered').length,
  };
}

export async function fetchCustomerList(): Promise<CustomerRecord[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('customer_name, mobile, price, booking_date, booking_number')
    .order('booking_date', { ascending: false });

  if (error) throw error;

  const map = new Map<string, CustomerRecord>();

  for (const row of data ?? []) {
    const key = row.mobile.trim();
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        customerName: row.customer_name,
        mobile: row.mobile,
        totalBookings: 1,
        totalSpent: Number(row.price),
        lastBookingDate: row.booking_date,
        lastBookingId: row.booking_number,
      });
      continue;
    }

    existing.totalBookings += 1;
    existing.totalSpent += Number(row.price);
    if (row.booking_date > existing.lastBookingDate) {
      existing.lastBookingDate = row.booking_date;
      existing.lastBookingId = row.booking_number;
      existing.customerName = row.customer_name;
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.customerName.localeCompare(b.customerName)
  );
}

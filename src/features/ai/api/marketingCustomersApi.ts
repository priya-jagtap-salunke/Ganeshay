import { supabase } from '@/lib/supabase';
import { getErrorMessage, getSupabaseConfigError } from '@/utils/errors';
import { MarketingCustomerPick } from '../types';

/**
 * Recent bookings for marketing personalization (vendor RLS scoped).
 * Compact fields only — used inside AI Hub Marketing, nowhere else.
 */
export async function fetchRecentMarketingCustomers(
  limit = 12
): Promise<MarketingCustomerPick[]> {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);

  const { data, error } = await supabase
    .from('bookings')
    .select(
      'customer_name, mobile, murti_name, murti_size, booking_date, pending'
    )
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 30));

  if (error) throw new Error(getErrorMessage(error));

  return (data ?? []).map((row) => ({
    customer_name: String(row.customer_name ?? ''),
    mobile: String(row.mobile ?? ''),
    murti_name: String(row.murti_name ?? ''),
    murti_size: row.murti_size ? String(row.murti_size) : null,
    booking_date: String(row.booking_date ?? ''),
    pending: Number(row.pending) || 0,
  }));
}

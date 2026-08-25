import { supabase } from '@/lib/supabase';
import { Booking, BookingFormData } from '@/types/booking';
import { normalizeMobile } from '@/features/telecalling/utils/phoneNormalize';
import {
  DEFAULT_MURTI_NAME,
  GANESH_CHATURTHI_DELIVERY_DATE,
} from '../constants';
import {
  persistMurtiPhoto,
  removeMurtiPhoto,
} from '../utils/murtiPhotoStorage';

export const DUPLICATE_BOOKING_MESSAGE =
  'Duplicate entry not allowed. A booking already exists for this customer name and contact number.';

function normalizeCustomerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function isDuplicateBookingConstraintError(error: {
  code?: string;
  message?: string;
}): boolean {
  if (error.code !== '23505') return false;
  const message = error.message ?? '';
  return /vendor_name_mobile|vendor_mobile|bookings_vendor_mobile|customer_name|mobile/i.test(
    message
  );
}

/**
 * True when this vendor already has a booking with the same mobile AND
 * the same customer name (either differing field allows a new booking).
 */
export async function bookingExistsForCustomer(
  customerName: string,
  mobile: string
): Promise<boolean> {
  const normalizedMobile = normalizeMobile(mobile);
  const normalizedName = normalizeCustomerName(customerName);
  if (!normalizedMobile || !normalizedName) return false;

  const { data, error } = await supabase
    .from('bookings')
    .select('id, mobile, customer_name')
    .ilike('mobile', `%${normalizedMobile}%`)
    .limit(100);

  if (error) throw error;

  return (data ?? []).some(
    (row) =>
      normalizeMobile(String(row.mobile ?? '')) === normalizedMobile &&
      normalizeCustomerName(String(row.customer_name ?? '')) === normalizedName
  );
}

export async function assertNoDuplicateBooking(
  customerName: string,
  mobile: string
): Promise<void> {
  const exists = await bookingExistsForCustomer(customerName, mobile);
  if (exists) {
    throw new Error(DUPLICATE_BOOKING_MESSAGE);
  }
}

export async function fetchNextBookingNumber(): Promise<string> {
  const { data, error } = await supabase.rpc('get_next_booking_number');
  if (error) throw error;
  return data as string;
}

export async function createBooking(
  formData: BookingFormData,
  bookingNumber: string
): Promise<Booking> {
  await assertNoDuplicateBooking(formData.customer_name, formData.mobile);

  const pending = formData.price - formData.advance;

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      booking_number: bookingNumber,
      customer_name: formData.customer_name,
      mobile: formData.mobile,
      address: formData.address ?? null,
      booking_date: formData.booking_date,
      delivery_date: formData.delivery_date ?? GANESH_CHATURTHI_DELIVERY_DATE,
      murti_name: formData.murti_name ?? DEFAULT_MURTI_NAME,
      murti_size: formData.murti_size ?? null,
      price: formData.price,
      advance: formData.advance,
      pending,
      payment_mode: formData.payment_mode || null,
      notes: formData.notes || null,
      status: 'Pending',
    })
    .select()
    .single();

  if (error) {
    if (isDuplicateBookingConstraintError(error)) {
      throw new Error(DUPLICATE_BOOKING_MESSAGE);
    }
    throw error;
  }

  const booking = data as Booking;
  const pendingPhoto = formData.murti_photo_uri;
  if (!pendingPhoto) return booking;

  try {
    const storedUri = await persistMurtiPhoto(booking.id, pendingPhoto);
    return updateBooking(booking.id, { murti_photo_uri: storedUri });
  } catch (photoError) {
    // Booking is saved; keep the captured URI so WhatsApp can still attach it.
    console.warn('Failed to persist murti photo', photoError);
    return { ...booking, murti_photo_uri: pendingPhoto };
  }
}

export async function updateBooking(
  id: string,
  updates: Partial<Booking>
): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchBookingById(id: string): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function searchBookings(query: string): Promise<Booking[]> {
  const q = query.trim();
  if (!q) return [];

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .or(
      `booking_number.ilike.%${q}%,customer_name.ilike.%${q}%,mobile.ilike.%${q}%`
    )
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data ?? [];
}

export async function fetchTodayBookings(): Promise<Booking[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('booking_date', today)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export interface DashboardStats {
  todayBookingsCount: number;
  totalBookingsCount: number;
  todayCollection: number;
  pendingAmount: number;
  deliveredCount: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const today = new Date().toISOString().split('T')[0];

  const { data: todayBookings, error: e1 } = await supabase
    .from('bookings')
    .select('advance, pending, status')
    .eq('booking_date', today);

  const { data: allPending, error: e2 } = await supabase
    .from('bookings')
    .select('pending')
    .eq('status', 'Pending');

  const { count: deliveredCount, error: e3 } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Delivered');

  const { data: totalRows, error: e4 } = await supabase
    .from('bookings')
    .select('id');

  if (e1 || e2 || e3 || e4) throw e1 || e2 || e3 || e4;

  const todayCollection =
    todayBookings?.reduce((sum, b) => sum + Number(b.advance), 0) ?? 0;
  const pendingAmount =
    allPending?.reduce((sum, b) => sum + Number(b.pending), 0) ?? 0;

  return {
    todayBookingsCount: todayBookings?.length ?? 0,
    totalBookingsCount: totalRows?.length ?? 0,
    todayCollection,
    pendingAmount,
    deliveredCount: deliveredCount ?? 0,
  };
}

export async function markDelivered(
  booking: Booking,
  amountReceived: number
): Promise<Booking> {
  const newAdvance = Number(booking.advance) + amountReceived;
  const newPending = Number(booking.price) - newAdvance;
  const status = newPending <= 0 ? 'Delivered' : 'Pending';

  return updateBooking(booking.id, {
    advance: newAdvance,
    pending: Math.max(0, newPending),
    status,
  });
}

export async function deleteBooking(id: string): Promise<void> {
  const existing = await fetchBookingById(id).catch(() => null);
  if (existing?.murti_photo_uri) {
    await removeMurtiPhoto(existing.murti_photo_uri);
  }

  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) throw error;
}

export async function updateBookingFromForm(
  id: string,
  formData: BookingFormData
): Promise<Booking> {
  const pending = formData.price - formData.advance;
  const existing = await fetchBookingById(id);

  let murtiPhotoUri = existing.murti_photo_uri;
  const nextPhoto = formData.murti_photo_uri;

  if (nextPhoto === null || nextPhoto === '') {
    if (existing.murti_photo_uri) {
      await removeMurtiPhoto(existing.murti_photo_uri);
    }
    murtiPhotoUri = null;
  } else if (nextPhoto && nextPhoto !== existing.murti_photo_uri) {
    if (existing.murti_photo_uri) {
      await removeMurtiPhoto(existing.murti_photo_uri);
    }
    murtiPhotoUri = await persistMurtiPhoto(id, nextPhoto);
  }

  return updateBooking(id, {
    customer_name: formData.customer_name,
    mobile: formData.mobile,
    booking_date: formData.booking_date,
    price: formData.price,
    advance: formData.advance,
    pending,
    payment_mode: formData.payment_mode || null,
    notes: formData.notes || null,
    murti_photo_uri: murtiPhotoUri,
  });
}

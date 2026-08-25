export type BookingStatus = 'Pending' | 'Delivered';
export type PaymentMode = 'Cash' | 'UPI' | 'Card';

export interface Booking {
  id: string;
  booking_number: string;
  customer_name: string;
  mobile: string;
  address: string | null;
  booking_date: string;
  delivery_date: string | null;
  murti_name: string;
  murti_size: string | null;
  /** Local file URI or data URI of the selected murti photo. */
  murti_photo_uri?: string | null;
  price: number;
  advance: number;
  pending: number;
  payment_mode: PaymentMode | null;
  notes: string | null;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}

export interface BookingFormData {
  customer_name: string;
  mobile: string;
  address?: string;
  booking_date: string;
  delivery_date?: string;
  murti_name?: string;
  murti_size?: string;
  murti_photo_uri?: string | null;
  price: number;
  advance: number;
  payment_mode?: PaymentMode;
  notes?: string;
}

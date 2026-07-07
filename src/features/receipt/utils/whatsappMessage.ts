import { Booking } from '@/types/booking';

function formatAmount(amount: number): string {
  return Number(amount).toLocaleString('en-IN');
}

export function buildWhatsAppMessage(booking: Booking): string {
  return `🙏 गणपती बाप्पा मोरया 🙏

Dear ${booking.customer_name},

Thank you for booking your Shree Ganesha Murti with Bappaji.com.

Your booking has been confirmed successfully.

Booking ID: ${booking.booking_number}

Total Amount: ₹${formatAmount(booking.price)}
Advance Paid: ₹${formatAmount(booking.advance)}
Pending Amount: ₹${formatAmount(booking.pending)}

Your booking receipt is attached with this message.

Thank you for choosing Bappaji.com.

Ganpati Bappa Morya! 🙏`;
}

/** Normalize mobile to WhatsApp format (country code, no + prefix). */
export function formatWhatsAppPhone(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');

  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  if (digits.startsWith('91')) {
    return digits;
  }

  return digits;
}

export function getWhatsAppWebUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function getWhatsAppAppUrl(phone: string, message: string): string {
  return `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
}

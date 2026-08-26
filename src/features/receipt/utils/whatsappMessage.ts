import { Booking } from '@/types/booking';

function formatAmount(amount: number): string {
  return Number(amount).toLocaleString('en-IN');
}

function formatMurtiLabel(booking: Booking): string {
  const name = (booking.murti_name ?? '').trim();
  const size = (booking.murti_size ?? '').trim();
  if (name && size) return `${name} / ${size}`;
  return name || size || '—';
}

export function buildWhatsAppMessage(
  booking: Booking,
  options?: { includeMurtiPhoto?: boolean }
): string {
  const attachmentLine = options?.includeMurtiPhoto
    ? 'Your booking receipt and murti photo are attached with this message.'
    : 'Your booking receipt is attached with this message.';

  return `🙏 गणपती बाप्पा मोरया 🙏

Dear ${booking.customer_name},

Thank you for booking your Shree Ganesha Murti with Bappaji.com.

Your booking has been confirmed successfully.

Booking ID: ${booking.booking_number}

Total Amount: ₹${formatAmount(booking.price)}
Advance Paid: ₹${formatAmount(booking.advance)}
Pending Amount: ₹${formatAmount(booking.pending)}

${attachmentLine}

Thank you for choosing Bappaji.com.

Ganpati Bappa Morya! 🙏`;
}

/** New Booking → Send on WhatsApp — Marathi confirmation with full booking details. */
export function buildNewBookingWhatsAppMessage(booking: Booking): string {
  const delivery = (booking.delivery_date ?? '').trim();
  const address = (booking.address ?? '').trim();
  const payment = (booking.payment_mode ?? '').trim();

  const extraLines = [
    delivery ? `📅 Delivery / Pickup: ${delivery}` : '',
    address ? `📍 Address: ${address}` : '',
    payment ? `💵 Payment: ${payment}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return `🌺🙏 गणपती बाप्पा मोरया! 🙏🌺

प्रिय ${booking.customer_name},

आपल्या घरच्या बाप्पांसाठी आमच्यावर विश्वास ठेवून Eco-Friendly मूर्तीची बुकिंग केल्याबद्दल मनापासून धन्यवाद! ❤️

आपल्या बुकिंगची संपूर्ण माहिती 👇

✨ Booking ID: ${booking.booking_number}
🪷 मूर्ती: ${formatMurtiLabel(booking)}
💰 Total Amount: ₹${formatAmount(booking.price)}
✅ Paid: ₹${formatAmount(booking.advance)}
💳 Balance Amount: ₹${formatAmount(booking.pending)}${
    extraLines ? `\n${extraLines}` : ''
  }

🧾 Invoice PDF या मेसेजसोबत पाठवत आहोत.

आता फक्त बाप्पांच्या आगमनाची वाट… ❤️
लवकरच आपल्या घरी बाप्पा विराजमान होवोत आणि सुख, समाधान व आनंद घेऊन येवोत! 🌺✨

आपल्या प्रेम आणि विश्वासाबद्दल पुन्हा एकदा धन्यवाद. 🙏

✨ गणेश चतुर्थीच्या मनःपूर्वक शुभेच्छा! ✨
गणपती बाप्पा मोरया! ❤️🙏

━━━━━━━━━━━━━━
🌿 Bappaji.com
📞 प्रिया साळुंके | 7972962917
━━━━━━━━━━━━━━`;
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

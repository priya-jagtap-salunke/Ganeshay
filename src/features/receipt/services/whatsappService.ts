import { Platform, Linking, Alert } from 'react-native';
import { Booking } from '@/types/booking';
import {
  buildNewBookingWhatsAppMessage,
  buildWhatsAppMessage,
  formatWhatsAppPhone,
  getWhatsAppWebUrl,
} from '../utils/whatsappMessage';
import {
  selectBusinessDocumentSettings,
  useSettingsStore,
} from '@/features/settings/store/settingsStore';
import {
  openDeviceWhatsAppApp,
  resolveInstalledWhatsAppApp,
  showWhatsAppMissingAlert,
} from '../utils/whatsappApp';
import { downloadMurtiPhotoOnWeb } from '@/features/bookings/utils/murtiPhotoStorage';

export type ShareReceiptWhatsAppOptions = {
  /** Use the New Booking Marathi template. */
  messageVariant?: 'default' | 'newBooking';
  /** @deprecated Attachments removed — kept for call-site compatibility. */
  receiptImageUri?: string;
};

function downloadPdfOnWeb(pdfUri: string, bookingNumber: string): void {
  if (typeof document === 'undefined' || !pdfUri) return;

  const anchor = document.createElement('a');
  anchor.href = pdfUri;
  anchor.download = `Receipt_${bookingNumber}.pdf`;
  anchor.click();
}

async function shareOnWeb(
  booking: Booking,
  pdfUri: string,
  phone: string,
  message: string
): Promise<void> {
  if (pdfUri) {
    downloadPdfOnWeb(pdfUri, booking.booking_number);
  }

  if (booking.murti_photo_uri) {
    downloadMurtiPhotoOnWeb(booking.murti_photo_uri, booking.booking_number);
  }

  const whatsAppUrl = getWhatsAppWebUrl(phone, message);
  if (typeof window !== 'undefined') {
    window.open(whatsAppUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  await Linking.openURL(whatsAppUrl);
}

/**
 * Opens WhatsApp for this booking's customer with the prepared message.
 * Deep link only — never Share / Open In (Message vs "Open in WhatsApp").
 */
export async function shareReceiptOnWhatsApp(
  booking: Booking,
  pdfUri: string,
  options?: ShareReceiptWhatsAppOptions
): Promise<void> {
  const phone = formatWhatsAppPhone(booking.mobile ?? '');
  const isNewBooking = options?.messageVariant === 'newBooking';
  const customerName = (booking.customer_name ?? '').trim();

  if (isNewBooking && !customerName) {
    Alert.alert(
      'Customer Name Missing',
      'This booking does not have a customer name. Please edit the booking and try again.'
    );
    return;
  }

  if (!phone || phone.length < 10) {
    Alert.alert(
      'Invalid Mobile',
      'This booking does not have a valid customer mobile number.'
    );
    return;
  }

  const vendorSettings = selectBusinessDocumentSettings(
    useSettingsStore.getState()
  );
  const message = (
    isNewBooking
      ? buildNewBookingWhatsAppMessage(booking, {
          displayName: vendorSettings.businessName,
          phone: vendorSettings.phone,
        })
      : buildWhatsAppMessage(booking, { includeMurtiPhoto: false })
  ).trim();

  if (!message) {
    Alert.alert(
      'Message Missing',
      'Could not build the booking WhatsApp message.'
    );
    return;
  }

  if (Platform.OS === 'web') {
    await shareOnWeb(booking, pdfUri || '', phone, message);
    return;
  }

  const appKind = await resolveInstalledWhatsAppApp();
  if (!appKind) {
    showWhatsAppMissingAlert();
    return;
  }

  await openDeviceWhatsAppApp(phone, message, appKind);
}

function validateBookingWhatsAppTarget(booking: Booking): string | null {
  if (!(booking.customer_name ?? '').trim()) {
    Alert.alert(
      'Customer Name Missing',
      'This booking does not have a customer name.'
    );
    return null;
  }
  const phone = formatWhatsAppPhone(booking.mobile ?? '');
  if (!phone || phone.length < 10) {
    Alert.alert(
      'Invalid Mobile',
      'This booking does not have a valid customer mobile number.'
    );
    return null;
  }
  return phone;
}

/** Predrafted booking details — opens this contact in WhatsApp directly. */
export async function shareNewBookingDetailsOnWhatsApp(
  booking: Booking
): Promise<void> {
  const phone = validateBookingWhatsAppTarget(booking);
  if (!phone) return;

  const message = buildNewBookingWhatsAppMessage(booking).trim();
  if (!message) {
    Alert.alert(
      'Message Missing',
      'Could not build the booking WhatsApp message.'
    );
    return;
  }

  if (Platform.OS === 'web') {
    const whatsAppUrl = getWhatsAppWebUrl(phone, message);
    if (typeof window !== 'undefined') {
      window.open(whatsAppUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    await Linking.openURL(whatsAppUrl);
    return;
  }

  const appKind = await resolveInstalledWhatsAppApp();
  if (!appKind) {
    showWhatsAppMissingAlert();
    return;
  }

  await openDeviceWhatsAppApp(phone, message, appKind);
}

/**
 * Legacy invoice entry — same as booking details (message deep link only).
 * Avoids Share / Open In which showed Message vs Open in WhatsApp.
 */
export async function shareNewBookingInvoicePdfOnWhatsApp(
  booking: Booking,
  _pdfUri: string
): Promise<void> {
  await shareNewBookingDetailsOnWhatsApp(booking);
}

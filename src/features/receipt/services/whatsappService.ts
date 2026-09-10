import { Platform, Linking, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Booking } from '@/types/booking';
import { getErrorMessage } from '@/utils/errors';
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
  type WhatsAppAppKind,
} from '../utils/whatsappApp';
import { shareWhatsAppMedia } from '../utils/whatsappMediaShare';
import { downloadMurtiPhotoOnWeb } from '@/features/bookings/utils/murtiPhotoStorage';

export type ShareReceiptWhatsAppOptions = {
  /** Use the New Booking Marathi template. */
  messageVariant?: 'default' | 'newBooking';
  /** @deprecated Message-only share ignores attachments. */
  receiptImageUri?: string;
};

function downloadPdfOnWeb(pdfUri: string, bookingNumber: string): void {
  if (typeof document === 'undefined' || !pdfUri) return;

  const anchor = document.createElement('a');
  anchor.href = pdfUri;
  anchor.download = `Receipt_${bookingNumber}.pdf`;
  anchor.click();
}

/**
 * Ensure a real on-disk PDF with size > 0 and a file:// URI ending in .pdf.
 */
async function ensureShareablePdfUri(
  pdfUri: string,
  bookingNumber: string
): Promise<string> {
  const source =
    pdfUri.startsWith('file://') || pdfUri.startsWith('content://')
      ? pdfUri
      : `file://${pdfUri}`;

  const sourceInfo = await FileSystem.getInfoAsync(source);
  if (!sourceInfo.exists || sourceInfo.isDirectory) {
    throw new Error('Invoice PDF was not found after generation.');
  }
  if (typeof sourceInfo.size === 'number' && sourceInfo.size < 64) {
    throw new Error('Invoice PDF is empty. Please try again.');
  }

  const verifyPdfHeader = async (path: string) => {
    try {
      const head = await FileSystem.readAsStringAsync(path, {
        encoding: FileSystem.EncodingType.Base64,
        length: 8,
        position: 0,
      });
      if (head && !head.startsWith('JVBERi')) {
        throw new Error('Generated invoice file is not a valid PDF.');
      }
    } catch (verifyError) {
      if (
        verifyError instanceof Error &&
        verifyError.message.includes('not a valid PDF')
      ) {
        throw verifyError;
      }
    }
  };

  if (/\.pdf$/i.test(source) || source.startsWith('content://')) {
    await verifyPdfHeader(source);
    return source.startsWith('file://') || source.startsWith('content://')
      ? source
      : `file://${source}`;
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('File cache is unavailable on this device.');
  }

  const downloadDir = `${cacheDir}Download/`;
  try {
    await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
  } catch {
    // Directory may already exist.
  }

  const safeNumber = bookingNumber.replace(/[^\w.-]+/g, '_');
  // Same on-disk name family as Download Receipt / View Receipt PDF.
  const destPath = `${downloadDir}Receipt_${safeNumber}.pdf`;

  const existing = await FileSystem.getInfoAsync(destPath);
  const sameSize =
    existing.exists &&
    !existing.isDirectory &&
    typeof existing.size === 'number' &&
    typeof sourceInfo.size === 'number' &&
    existing.size === sourceInfo.size;

  if (!sameSize) {
    await FileSystem.copyAsync({ from: source, to: destPath });
  }

  const info = await FileSystem.getInfoAsync(destPath);
  if (!info.exists || info.isDirectory) {
    throw new Error('Could not prepare the invoice PDF for WhatsApp.');
  }
  if (typeof info.size === 'number' && info.size < 64) {
    throw new Error(
      'Could not prepare the invoice PDF for WhatsApp (empty file).'
    );
  }

  await verifyPdfHeader(destPath);

  return destPath.startsWith('file://') ? destPath : `file://${destPath}`;
}

function isUserCancelledShare(error: unknown): boolean {
  const msg = (
    error instanceof Error ? error.message : String(error)
  ).toLowerCase();
  return (
    msg.includes('user did not share') ||
    msg.includes('user cancelled') ||
    msg.includes('user canceled') ||
    msg.includes('ecancelled') ||
    msg.includes('ecanceled')
  );
}

function isWhatsAppMissingError(error: unknown): boolean {
  const msg = (
    error instanceof Error ? error.message : String(error)
  ).toLowerCase();
  return (
    msg.includes('not installed') ||
    msg.includes('no activity found') ||
    msg.includes('activitynotfound') ||
    msg.includes('no activity')
  );
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
 * Message deep link only (no attachments).
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

async function attachInvoicePdf(params: {
  phone: string;
  appKind: WhatsAppAppKind;
  pdfUri: string;
  bookingNumber: string;
}): Promise<void> {
  const { phone, appKind, pdfUri, bookingNumber } = params;
  // Same filename convention as Download / View Receipt PDF.
  const pdfFilename = `Receipt_${bookingNumber}.pdf`;

  await shareWhatsAppMedia({
    title: `Receipt ${bookingNumber}`,
    phone,
    appKind,
    url: pdfUri,
    type: 'application/pdf',
    filename: pdfFilename,
    // Never caption — text path can drop the PDF.
    message: undefined,
    targetPhone: true,
  });
}

/**
 * Share the View Receipt PDF (generated via generateReceiptPdf) to WhatsApp.
 * Caller must pass the same PDF URI View Receipt uses — do not substitute
 * images or a simplified invoice layout.
 */
export async function shareNewBookingInvoicePdfOnWhatsApp(
  booking: Booking,
  pdfUri: string
): Promise<void> {
  const phone = validateBookingWhatsAppTarget(booking);
  if (!phone) return;

  if (!pdfUri) {
    Alert.alert(
      'Receipt PDF Failed',
      'Receipt PDF is missing. Please try again.'
    );
    return;
  }

  if (Platform.OS === 'web') {
    downloadPdfOnWeb(pdfUri, booking.booking_number);
    Alert.alert(
      'Receipt PDF Downloaded',
      'Attach the downloaded receipt PDF in WhatsApp.'
    );
    const whatsAppUrl = getWhatsAppWebUrl(phone, '');
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

  let shareablePdfUri: string;
  try {
    shareablePdfUri = await ensureShareablePdfUri(
      pdfUri,
      booking.booking_number
    );
  } catch (error) {
    console.warn('Could not prepare receipt PDF for WhatsApp', error);
    Alert.alert(
      'Receipt PDF Failed',
      getErrorMessage(error) ||
        'Could not prepare the receipt PDF for WhatsApp. Please try again.'
    );
    return;
  }

  try {
    await attachInvoicePdf({
      phone,
      appKind,
      pdfUri: shareablePdfUri,
      bookingNumber: booking.booking_number,
    });
  } catch (error) {
    if (isUserCancelledShare(error)) return;
    if (isWhatsAppMissingError(error)) {
      const alternate: WhatsAppAppKind =
        appKind === 'consumer' ? 'business' : 'consumer';
      try {
        await attachInvoicePdf({
          phone,
          appKind: alternate,
          pdfUri: shareablePdfUri,
          bookingNumber: booking.booking_number,
        });
        return;
      } catch {
        showWhatsAppMissingAlert();
        return;
      }
    }
    console.warn('Receipt PDF WhatsApp share failed', error);
    Alert.alert(
      'Share Receipt PDF',
      getErrorMessage(error) ||
        'Could not open WhatsApp with the receipt PDF. Please try again.'
    );
  }
}

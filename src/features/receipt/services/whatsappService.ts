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

/** Real receipts are far larger than an empty/corrupt PDF shell. */
const MIN_RECEIPT_PDF_BYTES = 2_048;

async function assertValidReceiptPdf(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists || info.isDirectory) {
    throw new Error('Receipt PDF was not found after generation.');
  }
  if (typeof info.size === 'number' && info.size < MIN_RECEIPT_PDF_BYTES) {
    throw new Error('Receipt PDF is empty. Please try again.');
  }

  try {
    const head = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.Base64,
      length: 8,
      position: 0,
    });
    // "%PDF" in base64 starts with "JVBERi"
    if (head && !head.startsWith('JVBERi')) {
      throw new Error('Generated receipt file is not a valid PDF.');
    }
  } catch (verifyError) {
    if (
      verifyError instanceof Error &&
      verifyError.message.includes('not a valid PDF')
    ) {
      throw verifyError;
    }
    // Some platforms ignore length/position — size check above still applies.
  }
}

/**
 * Copy the View Receipt PDF to a stable on-disk .pdf so the system share
 * sheet / WhatsApp treat it as a document (never image or blank attach).
 */
async function ensureShareablePdfUri(
  pdfUri: string,
  bookingNumber: string
): Promise<string> {
  const source =
    pdfUri.startsWith('file://') || pdfUri.startsWith('content://')
      ? pdfUri
      : `file://${pdfUri}`;

  await assertValidReceiptPdf(source);

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

  try {
    await FileSystem.deleteAsync(destPath, { idempotent: true });
  } catch {
    // ignore
  }
  await FileSystem.copyAsync({ from: source, to: destPath });
  await assertValidReceiptPdf(destPath);

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

/**
 * Share the View Receipt PDF as a real .pdf into THIS booking contact's chat.
 * Uses WhatsApp jid targeting — no system share sheet / contact picker.
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
        'Could not prepare the receipt PDF. Please try again.'
    );
    return;
  }

  const pdfFilename = `Receipt_${booking.booking_number}.pdf`;

  try {
    await shareWhatsAppMedia({
      title: `Receipt ${booking.booking_number}`,
      phone,
      appKind,
      url: shareablePdfUri,
      type: 'application/pdf',
      filename: pdfFilename,
      message: undefined,
      targetPhone: true,
      useInternalStorage: false,
      timeoutMs: 60_000,
    });
  } catch (error) {
    if (isUserCancelledShare(error)) return;
    const alternate: WhatsAppAppKind =
      appKind === 'consumer' ? 'business' : 'consumer';
    try {
      await shareWhatsAppMedia({
        title: `Receipt ${booking.booking_number}`,
        phone,
        appKind: alternate,
        url: shareablePdfUri,
        type: 'application/pdf',
        filename: pdfFilename,
        message: undefined,
        targetPhone: true,
        useInternalStorage: false,
        timeoutMs: 60_000,
      });
      return;
    } catch (retryError) {
      if (isUserCancelledShare(retryError)) return;
      console.warn('Receipt PDF share failed', retryError);
      Alert.alert(
        'Share Invoice PDF',
        getErrorMessage(error) ||
          'Could not share the receipt PDF. Please try again.'
      );
    }
  }
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

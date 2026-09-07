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
import {
  delay,
  waitForWhatsAppReady,
  WHATSAPP_STEP_DELAY_MS,
} from '../utils/whatsappTiming';
import {
  downloadMurtiPhotoOnWeb,
  ensureShareableMurtiPhotoUri,
} from '@/features/bookings/utils/murtiPhotoStorage';

export type ShareReceiptWhatsAppOptions = {
  /** Use the New Booking Marathi template. */
  messageVariant?: 'default' | 'newBooking';
  /**
   * Android: pre-rendered receipt PNG (preferred attach — WhatsApp drops PDFs).
   * Prepared by shareReceiptViaWhatsApp / generateReceiptShareImage.
   */
  receiptImageUri?: string;
};

const STEP_DELAY_MS = WHATSAPP_STEP_DELAY_MS;

function downloadPdfOnWeb(pdfUri: string, bookingNumber: string): void {
  if (typeof document === 'undefined') return;

  const anchor = document.createElement('a');
  anchor.href = pdfUri;
  anchor.download = `Receipt_${bookingNumber}.pdf`;
  anchor.click();
}

/**
 * Ensure a real on-disk PDF with size > 0 and a file:// URI.
 * Reuses the generated file when possible — copying on every Send made
 * invoice share look stuck on loading.
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
      // "%PDF" in base64 starts with "JVBERi"
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
      // Some platforms ignore length/position — skip strict check.
    }
  };

  // Already a local PDF — share in place (no multi-MB copy).
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

async function shareOptionalMurtiPhoto(params: {
  booking: Booking;
  phone: string;
  appKind: WhatsAppAppKind;
  murtiPhotoUri: string;
  /** When set, share murti + caption in one Intent (New Booking). */
  message?: string;
}): Promise<void> {
  try {
    const lower = params.murtiPhotoUri.toLowerCase();
    const imageType = lower.endsWith('.png')
      ? 'image/png'
      : lower.endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg';

    await shareWhatsAppMedia({
      title: `Murti Photo ${params.booking.booking_number}`,
      phone: params.phone,
      appKind: params.appKind,
      url: params.murtiPhotoUri,
      type: imageType,
      filename:
        imageType === 'image/png'
          ? `Murti_${params.booking.booking_number}.png`
          : `Murti_${params.booking.booking_number}.jpg`,
      message: params.message,
      // With caption, target the customer chat; follow-up attach prefers current chat on Android.
      targetPhone: Platform.OS !== 'android' || Boolean(params.message),
    });
  } catch (photoError) {
    if (isUserCancelledShare(photoError)) {
      if (params.message) throw photoError;
      return;
    }
    if (params.message) throw photoError;
    console.warn('Murti photo WhatsApp follow-up failed', photoError);
  }
}

/**
 * Attach receipt PNG — same Intent path that works for tele-calling banners.
 * Android: prefer current-chat (no jid) so the text draft is not wiped, then
 * retry with jid if needed.
 */
async function attachReceiptImage(params: {
  phone: string;
  appKind: WhatsAppAppKind;
  imageUri: string;
  imageFilename: string;
  imageTitle: string;
}): Promise<void> {
  const { phone, appKind, imageUri, imageFilename, imageTitle } = params;

  const share = (targetPhone: boolean) =>
    shareWhatsAppMedia({
      title: imageTitle,
      phone,
      appKind,
      url: imageUri,
      type: 'image/png',
      filename: imageFilename,
      targetPhone,
    });

  // Prefer current-chat attach after open, then customer jid (Android + iOS).
  try {
    await share(false);
  } catch (attachError) {
    if (isUserCancelledShare(attachError)) throw attachError;
    await share(true);
  }
}

/**
 * Attach an invoice/catalog PDF to WhatsApp.
 *
 * Android: open the customer's WhatsApp chat with the PDF attached.
 * iOS: open the customer's WhatsApp chat directly (no Messages vs WhatsApp sheet).
 */
async function attachReceiptPdf(params: {
  phone: string;
  appKind: WhatsAppAppKind;
  pdfUri: string;
  pdfFilename: string;
  pdfTitle: string;
  /** Unused — kept for call-site compatibility. */
  allowSystemShare?: boolean;
}): Promise<void> {
  const { phone, appKind, pdfUri, pdfFilename, pdfTitle } = params;

  try {
    await shareWhatsAppMedia({
      title: pdfTitle,
      phone,
      appKind,
      url: pdfUri,
      type: 'application/pdf',
      filename: pdfFilename,
      // Never caption PDF on Android — EXTRA_TEXT + EXTRA_STREAM often drops it.
      // On iOS this title is used as the chat draft when opening WhatsApp.
      message: Platform.OS === 'ios' ? pdfTitle : undefined,
      targetPhone: true,
    });
    return;
  } catch (attachError) {
    if (isUserCancelledShare(attachError)) throw attachError;
  }

  // Android retry with alternate targeting; never show a system share sheet.
  if (Platform.OS === 'android') {
    try {
      await shareWhatsAppMedia({
        title: pdfTitle,
        phone,
        appKind,
        url: pdfUri,
        type: 'application/pdf',
        filename: pdfFilename,
        targetPhone: true,
      });
      return;
    } catch (retryError) {
      if (isUserCancelledShare(retryError)) throw retryError;
    }
  }

  // Last resort: open the customer chat directly (no Messages / WhatsApp picker).
  await openDeviceWhatsAppApp(phone, pdfTitle, appKind);
}

/**
 * Android / iOS:
 *   - New Booking: Marathi predraft + invoice PDF only.
 *   - Other booking shares: message + receipt PNG.
 */
async function shareBookingMessageThenAttachments(params: {
  booking: Booking;
  phone: string;
  message: string;
  appKind: WhatsAppAppKind;
  pdfUri: string;
  receiptImageUri?: string;
  murtiPhotoUri?: string;
  /** New Booking: murti + message, then invoice PDF. */
  alsoAttachInvoicePdf?: boolean;
}): Promise<void> {
  const {
    booking,
    phone,
    message,
    appKind,
    pdfUri,
    receiptImageUri,
    murtiPhotoUri,
    alsoAttachInvoicePdf,
  } = params;
  const pdfFilename = `Invoice_${booking.booking_number}.pdf`;
  const pdfTitle = `Invoice ${booking.booking_number}`;
  const imageFilename = `Receipt_${booking.booking_number}.png`;
  const imageTitle = `Invoice ${booking.booking_number}`;
  const stepMs = 700;

  if (alsoAttachInvoicePdf) {
    // Message first, then PDF with jid (same as tele-calling catalog attach).
    await openDeviceWhatsAppApp(phone, message, appKind);
    await waitForWhatsAppReady();
    await delay(stepMs);
    await attachReceiptPdf({
      phone,
      appKind,
      pdfUri,
      pdfFilename,
      pdfTitle,
    });
    return;
  }

  // Same on Android + iOS: share receipt image with message when available.
  if (receiptImageUri) {
    try {
      await shareWhatsAppMedia({
        title: imageTitle,
        phone,
        appKind,
        url: receiptImageUri,
        type: 'image/png',
        filename: imageFilename,
        message,
        targetPhone: true,
      });
    } catch (combinedError) {
      if (isUserCancelledShare(combinedError)) throw combinedError;

      await openDeviceWhatsAppApp(phone, message, appKind);
      await waitForWhatsAppReady();
      await attachReceiptImage({
        phone,
        appKind,
        imageUri: receiptImageUri,
        imageFilename,
        imageTitle,
      });
    }
  } else {
    // Fallback: open chat, then attach invoice PDF (both platforms).
    await openDeviceWhatsAppApp(phone, message, appKind);
    await waitForWhatsAppReady();
    await delay(STEP_DELAY_MS);
    await attachReceiptPdf({
      phone,
      appKind,
      pdfUri,
      pdfFilename,
      pdfTitle,
    });
  }

  if (!murtiPhotoUri) return;
  await delay(STEP_DELAY_MS);
  await shareOptionalMurtiPhoto({
    booking,
    phone,
    appKind,
    murtiPhotoUri,
  });
}

async function shareOnWeb(
  booking: Booking,
  pdfUri: string,
  phone: string,
  message: string
): Promise<void> {
  downloadPdfOnWeb(pdfUri, booking.booking_number);

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

export async function shareReceiptOnWhatsApp(
  booking: Booking,
  pdfUri: string,
  options?: ShareReceiptWhatsAppOptions
): Promise<void> {
  const phone = formatWhatsAppPhone(booking.mobile ?? '');
  const isNewBooking = options?.messageVariant === 'newBooking';
  const hasMurtiPhoto = Boolean(booking.murti_photo_uri);
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
      : buildWhatsAppMessage(booking, { includeMurtiPhoto: hasMurtiPhoto })
  ).trim();
  const receiptImageUri = options?.receiptImageUri;

  if (!message) {
    Alert.alert(
      'Message Missing',
      'Could not build the booking WhatsApp message.'
    );
    return;
  }

  if (Platform.OS === 'web') {
    await shareOnWeb(booking, pdfUri, phone, message);
    return;
  }

  const appKind = await resolveInstalledWhatsAppApp();
  if (!appKind) {
    showWhatsAppMissingAlert();
    return;
  }

  let shareablePdfUri: string | null = null;
  // Invoice PDF needed when New Booking, or when receipt image is unavailable.
  const needsPdf = isNewBooking || !receiptImageUri;
  if (needsPdf) {
    try {
      shareablePdfUri = await ensureShareablePdfUri(
        pdfUri,
        booking.booking_number
      );
    } catch (error) {
      console.warn('Could not prepare invoice PDF for WhatsApp', error);
      if (isNewBooking || !receiptImageUri) {
        Alert.alert(
          'Invoice PDF Failed',
          'Could not prepare the invoice PDF. Opening WhatsApp with the booking message only.'
        );
        await openDeviceWhatsAppApp(phone, message, appKind);
        return;
      }
    }
  }

  if (!isNewBooking && !receiptImageUri) {
    Alert.alert(
      'Receipt Attach Failed',
      'Could not render the receipt image. Opening WhatsApp with the booking message only — please try again.'
    );
    await openDeviceWhatsAppApp(phone, message, appKind);
    return;
  }

  // Murti follow-up only for non–New Booking shares.
  let shareablePhotoUri: string | undefined;
  if (!isNewBooking && booking.murti_photo_uri) {
    try {
      shareablePhotoUri = await ensureShareableMurtiPhotoUri(
        booking.murti_photo_uri,
        booking.id
      );
    } catch (error) {
      console.warn('Could not prepare murti photo for WhatsApp share', error);
    }
  }

  const pdfForShare = shareablePdfUri ?? pdfUri;

  const runShare = (kind: WhatsAppAppKind) =>
    shareBookingMessageThenAttachments({
      booking,
      phone,
      message,
      appKind: kind,
      pdfUri: pdfForShare,
      receiptImageUri: isNewBooking ? undefined : receiptImageUri,
      murtiPhotoUri: isNewBooking ? undefined : shareablePhotoUri,
      alsoAttachInvoicePdf: isNewBooking,
    });

  try {
    await runShare(appKind);
  } catch (error) {
    if (isUserCancelledShare(error)) return;

    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg === 'RECEIPT_IMAGE_MISSING') {
      Alert.alert(
        'Receipt Attach Failed',
        'Could not render the receipt image for WhatsApp. The booking message may still be open — please try Share on WhatsApp again.'
      );
      return;
    }

    if (isWhatsAppMissingError(error)) {
      const alternate: WhatsAppAppKind =
        appKind === 'consumer' ? 'business' : 'consumer';
      try {
        await runShare(alternate);
        return;
      } catch {
        showWhatsAppMissingAlert();
        return;
      }
    }

    try {
      await openDeviceWhatsAppApp(phone, message, appKind);
      await waitForWhatsAppReady();
      if (isNewBooking) {
        if (pdfForShare) {
          await attachReceiptPdf({
            phone,
            appKind,
            pdfUri: pdfForShare,
            pdfFilename: `Invoice_${booking.booking_number}.pdf`,
            pdfTitle: `Invoice ${booking.booking_number}`,
          });
        }
        return;
      }
      if (receiptImageUri) {
        await attachReceiptImage({
          phone,
          appKind,
          imageUri: receiptImageUri,
          imageFilename: `Receipt_${booking.booking_number}.png`,
          imageTitle: `Invoice ${booking.booking_number}`,
        });
        return;
      }
      throw new Error('RECEIPT_IMAGE_MISSING');
    } catch (fallbackError) {
      if (isUserCancelledShare(fallbackError)) return;
      console.warn('WhatsApp booking share fallback failed', fallbackError);
      Alert.alert(
        'Share Failed',
        'The booking message opened in WhatsApp, but an attachment could not be sent. Please try Share on WhatsApp again.'
      );
    }
  }
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

/** New Booking button 1 — predrafted Marathi booking details only (no PDF). */
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
 * New Booking / booking detail — share the invoice receipt PDF into the
 * customer's WhatsApp chat (PDF attached, ready to send).
 */
export async function shareNewBookingInvoicePdfOnWhatsApp(
  booking: Booking,
  pdfUri: string
): Promise<void> {
  const phone = validateBookingWhatsAppTarget(booking);
  if (!phone) return;

  if (Platform.OS === 'web') {
    downloadPdfOnWeb(pdfUri, booking.booking_number);
    Alert.alert(
      'Invoice PDF Downloaded',
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
    console.warn('Could not prepare invoice PDF for WhatsApp', error);
    Alert.alert(
      'Invoice PDF Failed',
      getErrorMessage(error) ||
        'Could not prepare the invoice PDF for WhatsApp. Please try again.'
    );
    return;
  }

  const pdfFilename = `Invoice_${booking.booking_number}.pdf`;
  const pdfTitle = `Receipt ${booking.booking_number}`;

  try {
    await attachReceiptPdf({
      phone,
      appKind,
      pdfUri: shareablePdfUri,
      pdfFilename,
      pdfTitle,
    });
  } catch (error) {
    if (isUserCancelledShare(error)) return;
    if (isWhatsAppMissingError(error)) {
      const alternate: WhatsAppAppKind =
        appKind === 'consumer' ? 'business' : 'consumer';
      try {
        await attachReceiptPdf({
          phone,
          appKind: alternate,
          pdfUri: shareablePdfUri,
          pdfFilename,
          pdfTitle,
        });
        return;
      } catch {
        showWhatsAppMissingAlert();
        return;
      }
    }
    console.warn('Invoice PDF WhatsApp share failed', error);
    Alert.alert(
      'Share Invoice PDF',
      getErrorMessage(error) ||
        'Could not open WhatsApp with the receipt PDF. Please try again.'
    );
  }
}

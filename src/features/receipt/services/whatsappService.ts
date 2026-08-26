import { Platform, Linking, Alert } from 'react-native';
import { Booking } from '@/types/booking';
import {
  buildNewBookingWhatsAppMessage,
  buildWhatsAppMessage,
  formatWhatsAppPhone,
  getWhatsAppWebUrl,
} from '../utils/whatsappMessage';
import {
  openDeviceWhatsAppApp,
  resolveInstalledWhatsAppApp,
  showWhatsAppMissingAlert,
  whatsAppSocialForKind,
  type WhatsAppAppKind,
} from '../utils/whatsappApp';
import {
  downloadMurtiPhotoOnWeb,
  ensureShareableMurtiPhotoUri,
} from '@/features/bookings/utils/murtiPhotoStorage';

export type ShareReceiptWhatsAppOptions = {
  /** Use the New Booking Marathi template. */
  messageVariant?: 'default' | 'newBooking';
};

/** Same delay as tele-calling banner share. */
const STEP_DELAY_MS = 550;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function downloadPdfOnWeb(pdfUri: string, bookingNumber: string): void {
  if (typeof document === 'undefined') return;

  const anchor = document.createElement('a');
  anchor.href = pdfUri;
  anchor.download = `Receipt_${bookingNumber}.pdf`;
  anchor.click();
}

/**
 * Cache a copy with an explicit file:// URI.
 * react-native-share only treats file/content URIs as EXTRA_STREAM; otherwise
 * the path is stuffed into EXTRA_TEXT (the "file path in message" regression).
 */
async function ensureShareablePdfUri(
  pdfUri: string,
  bookingNumber: string
): Promise<string> {
  const FileSystem = await import('expo-file-system');
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('File cache is unavailable on this device.');
  }

  const safeNumber = bookingNumber.replace(/[^\w.-]+/g, '_');
  const destPath = `${cacheDir}Receipt_${safeNumber}_${Date.now()}.pdf`;
  await FileSystem.copyAsync({ from: pdfUri, to: destPath });

  const info = await FileSystem.getInfoAsync(destPath);
  if (!info.exists) {
    throw new Error('Could not prepare the invoice PDF for WhatsApp.');
  }

  return destPath.startsWith('file://') ? destPath : `file://${destPath}`;
}

function normalizeShareUrl(uri: string): string {
  const fileUrl =
    Platform.OS === 'android' ? uri : uri.replace('file://', '');
  return fileUrl.startsWith('file://') ? fileUrl : `file://${fileUrl}`;
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

type ShareMediaParams = {
  title: string;
  phone: string;
  appKind: WhatsAppAppKind;
  url: string;
  type: string;
  filename?: string;
  /**
   * Caption. Only safe when `url` is a real file:// attachment — otherwise
   * RN Share appends the path into EXTRA_TEXT.
   */
  message?: string;
  /**
   * Android: set false after openDeviceWhatsAppApp so RN Share does not restart
   * com.whatsapp.Conversation (that wipe clears the prefilled draft → PDF-only).
   */
  targetPhone?: boolean;
};

async function shareMediaToWhatsApp(params: ShareMediaParams): Promise<void> {
  const Share = (await import('react-native-share')).default;
  const social = whatsAppSocialForKind(Share, params.appKind);
  const targetPhone = params.targetPhone !== false;

  await Share.shareSingle({
    title: params.title,
    ...(params.message ? { message: params.message } : {}),
    social,
    ...(targetPhone ? { whatsAppNumber: params.phone } : {}),
    url: normalizeShareUrl(params.url),
    type: params.type,
    ...(params.filename ? { filename: params.filename } : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

async function shareOptionalMurtiPhoto(params: {
  booking: Booking;
  phone: string;
  appKind: WhatsAppAppKind;
  murtiPhotoUri: string;
}): Promise<void> {
  try {
    const lower = params.murtiPhotoUri.toLowerCase();
    const imageType = lower.endsWith('.png')
      ? 'image/png'
      : lower.endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg';

    await shareMediaToWhatsApp({
      title: `Murti Photo ${params.booking.booking_number}`,
      phone: params.phone,
      appKind: params.appKind,
      url: params.murtiPhotoUri,
      type: imageType,
      filename:
        imageType === 'image/png'
          ? `Murti_${params.booking.booking_number}.png`
          : `Murti_${params.booking.booking_number}.jpg`,
      targetPhone: true,
    });
  } catch (photoError) {
    if (isUserCancelledShare(photoError)) return;
    console.warn('Murti photo WhatsApp follow-up failed', photoError);
  }
}

/**
 * Android (primary): same pattern as tele-calling banner —
 *   1) openDeviceWhatsAppApp with full booking text
 *   2) delay
 *   3) shareSingle PDF into that chat
 *
 * Extra Android care for PDFs:
 * - Prefer share without whatsAppNumber so Conversation is not restarted
 *   (restart drops the text draft → PDF-only symptom).
 * - Still pass `message` as EXTRA_TEXT when the URI is a real file (caption
 *   on newer WhatsApp); never pass a non-file URL (path-in-text bug).
 *
 * iOS: try message+PDF in one shareSingle; fall back to two-step.
 *
 * No mid-flow "Attach PDF" alert — user stays in WhatsApp and taps Send.
 */
async function shareBookingMessageThenAttachments(params: {
  booking: Booking;
  phone: string;
  message: string;
  appKind: WhatsAppAppKind;
  pdfUri: string;
  murtiPhotoUri?: string;
}): Promise<void> {
  const { booking, phone, message, appKind, pdfUri, murtiPhotoUri } = params;
  const pdfFilename = `Receipt_${booking.booking_number}.pdf`;
  const pdfTitle = `Invoice ${booking.booking_number}`;

  if (Platform.OS === 'android') {
    await openDeviceWhatsAppApp(phone, message, appKind);
    await delay(STEP_DELAY_MS);

    try {
      await shareMediaToWhatsApp({
        title: pdfTitle,
        phone,
        appKind,
        url: pdfUri,
        type: 'application/pdf',
        filename: pdfFilename,
        message,
        targetPhone: false,
      });
    } catch (attachError) {
      if (isUserCancelledShare(attachError)) throw attachError;
      // Fall back to number-targeted media share (tele-calling style).
      await shareMediaToWhatsApp({
        title: pdfTitle,
        phone,
        appKind,
        url: pdfUri,
        type: 'application/pdf',
        filename: pdfFilename,
        message,
        targetPhone: true,
      });
    }
  } else {
    try {
      await shareMediaToWhatsApp({
        title: pdfTitle,
        phone,
        appKind,
        url: pdfUri,
        type: 'application/pdf',
        filename: pdfFilename,
        message,
        targetPhone: true,
      });
    } catch (combinedError) {
      if (isUserCancelledShare(combinedError)) throw combinedError;
      await openDeviceWhatsAppApp(phone, message, appKind);
      await delay(STEP_DELAY_MS);
      await shareMediaToWhatsApp({
        title: pdfTitle,
        phone,
        appKind,
        url: pdfUri,
        type: 'application/pdf',
        filename: pdfFilename,
        targetPhone: true,
      });
    }
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
  const phone = formatWhatsAppPhone(booking.mobile);
  const isNewBooking = options?.messageVariant === 'newBooking';
  const hasMurtiPhoto = Boolean(booking.murti_photo_uri);
  const message = (
    isNewBooking
      ? buildNewBookingWhatsAppMessage(booking)
      : buildWhatsAppMessage(booking, { includeMurtiPhoto: hasMurtiPhoto })
  ).trim();

  if (!phone) {
    Alert.alert(
      'Invalid Mobile',
      'This booking does not have a valid customer mobile number.'
    );
    return;
  }

  if (!message) {
    Alert.alert('Message Missing', 'Could not build the booking WhatsApp message.');
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

  let shareablePdfUri: string;
  try {
    shareablePdfUri = await ensureShareablePdfUri(
      pdfUri,
      booking.booking_number
    );
  } catch (error) {
    console.warn('Could not prepare invoice PDF for WhatsApp', error);
    Alert.alert(
      'PDF Attach Failed',
      'Could not prepare the invoice PDF. Opening WhatsApp with the booking message only.'
    );
    await openDeviceWhatsAppApp(phone, message, appKind);
    return;
  }

  let shareablePhotoUri: string | undefined;
  if (booking.murti_photo_uri) {
    try {
      shareablePhotoUri = await ensureShareableMurtiPhotoUri(
        booking.murti_photo_uri,
        booking.id
      );
    } catch (error) {
      console.warn('Could not prepare murti photo for WhatsApp share', error);
    }
  }

  const runShare = (kind: WhatsAppAppKind) =>
    shareBookingMessageThenAttachments({
      booking,
      phone,
      message,
      appKind: kind,
      pdfUri: shareablePdfUri,
      murtiPhotoUri: shareablePhotoUri,
    });

  try {
    await runShare(appKind);
  } catch (error) {
    if (isUserCancelledShare(error)) return;

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
      await delay(STEP_DELAY_MS);
      await shareMediaToWhatsApp({
        title: `Invoice ${booking.booking_number}`,
        phone,
        appKind,
        url: shareablePdfUri,
        type: 'application/pdf',
        filename: `Receipt_${booking.booking_number}.pdf`,
        message,
        targetPhone: true,
      });
    } catch (fallbackError) {
      if (isUserCancelledShare(fallbackError)) return;
      console.warn('WhatsApp booking share fallback failed', fallbackError);
      Alert.alert(
        'WhatsApp Error',
        'Could not open WhatsApp with the booking message and invoice. Please try again.'
      );
    }
  }
}

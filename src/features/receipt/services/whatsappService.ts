import { Platform, Linking, Alert } from 'react-native';
import { Booking } from '@/types/booking';
import {
  buildNewBookingWhatsAppMessage,
  buildWhatsAppMessage,
  formatWhatsAppPhone,
  getWhatsAppAppUrl,
  getWhatsAppWebUrl,
} from '../utils/whatsappMessage';
import {
  downloadMurtiPhotoOnWeb,
  ensureShareableMurtiPhotoUri,
} from '@/features/bookings/utils/murtiPhotoStorage';

export type ShareReceiptWhatsAppOptions = {
  /** Use the New Booking Marathi template + murti-first share order. */
  messageVariant?: 'default' | 'newBooking';
};

function downloadPdfOnWeb(pdfUri: string, bookingNumber: string): void {
  if (typeof document === 'undefined') return;

  const anchor = document.createElement('a');
  anchor.href = pdfUri;
  anchor.download = `Receipt_${bookingNumber}.pdf`;
  anchor.click();
}

async function ensureShareablePdfUri(
  pdfUri: string,
  bookingNumber: string
): Promise<string> {
  const FileSystem = await import('expo-file-system');
  const filename = `Receipt_${bookingNumber}.pdf`;
  const destPath = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.copyAsync({ from: pdfUri, to: destPath });
  return destPath;
}

function normalizeShareUrl(uri: string): string {
  const fileUrl =
    Platform.OS === 'android' ? uri : uri.replace('file://', '');
  return fileUrl.startsWith('file://') ? fileUrl : `file://${fileUrl}`;
}

async function isWhatsAppInstalled(): Promise<boolean> {
  try {
    return await Linking.canOpenURL('whatsapp://send');
  } catch {
    return false;
  }
}

function isUserCancelledShare(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes('user did not share') ||
    msg.includes('user cancelled') ||
    msg.includes('user canceled') ||
    msg.includes('ecancelled') ||
    msg.includes('ecanceled')
  );
}

function isWhatsAppMissingError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes('not installed') ||
    msg.includes('no activity found') ||
    msg.includes('activitynotfound')
  );
}

async function sharePdfViaReactNativeShare(
  booking: Booking,
  pdfUri: string,
  message: string,
  phone: string
): Promise<void> {
  const Share = (await import('react-native-share')).default;

  await Share.shareSingle({
    title: `Receipt ${booking.booking_number}`,
    message,
    url: normalizeShareUrl(pdfUri),
    type: 'application/pdf',
    social: Share.Social.WHATSAPP,
    whatsAppNumber: phone,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

async function shareImageViaReactNativeShare(
  booking: Booking,
  imageUri: string,
  phone: string,
  message?: string
): Promise<void> {
  const Share = (await import('react-native-share')).default;
  const lower = imageUri.toLowerCase();
  const type = lower.endsWith('.png')
    ? 'image/png'
    : lower.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';

  await Share.shareSingle({
    title: `Murti Photo ${booking.booking_number}`,
    message:
      message ?? `Murti photo for booking ${booking.booking_number}`,
    url: normalizeShareUrl(imageUri),
    type,
    social: Share.Social.WHATSAPP,
    whatsAppNumber: phone,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

async function shareFileFallback(
  uri: string,
  mimeType: string,
  dialogTitle: string
): Promise<void> {
  const Sharing = await import('expo-sharing');
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType,
      dialogTitle,
    });
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * New Booking WhatsApp: murti image + Marathi message + invoice PDF.
 * WhatsApp typically allows one attachment per share, so the reliable flow is:
 * 1) Murti image + full message to the customer number
 * 2) Invoice PDF to the same customer number
 */
async function shareNewBookingWhatsAppBundle(
  booking: Booking,
  phone: string,
  message: string,
  pdfUri: string,
  murtiPhotoUri: string
): Promise<void> {
  const Share = (await import('react-native-share')).default;
  const photoUrl = normalizeShareUrl(murtiPhotoUri);
  const pdfUrl = normalizeShareUrl(pdfUri);
  const lower = murtiPhotoUri.toLowerCase();
  const imageType = lower.endsWith('.png')
    ? 'image/png'
    : lower.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';

  // Step 1: Murti image + exact Marathi message (not PDF-only).
  await Share.shareSingle({
    title: `Murti Photo ${booking.booking_number}`,
    message,
    url: photoUrl,
    type: imageType,
    social: Share.Social.WHATSAPP,
    whatsAppNumber: phone,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  await delay(500);

  // Step 2: Invoice/Receipt PDF for the same booking + same customer.
  try {
    await Share.shareSingle({
      title: `Invoice ${booking.booking_number}`,
      message: '',
      url: pdfUrl,
      type: 'application/pdf',
      social: Share.Social.WHATSAPP,
      whatsAppNumber: phone,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  } catch (pdfError) {
    if (isUserCancelledShare(pdfError)) return;
    console.warn('Invoice PDF WhatsApp share failed', pdfError);
    await shareFileFallback(
      pdfUri,
      'application/pdf',
      'Share Invoice PDF with Customer'
    );
  }
}

async function shareNativeFallback(
  phone: string,
  message: string,
  pdfUri: string,
  murtiPhotoUri?: string
): Promise<void> {
  const hasWhatsApp = await isWhatsAppInstalled();
  if (!hasWhatsApp) {
    Alert.alert(
      'WhatsApp Not Installed',
      'WhatsApp is not installed on this device. Please install WhatsApp or use Download PDF to share manually.'
    );
    return;
  }

  // Prefer murti + message first when available, then invoice PDF.
  if (murtiPhotoUri) {
    await Linking.openURL(getWhatsAppAppUrl(phone, message));
    await shareFileFallback(
      murtiPhotoUri,
      'image/jpeg',
      'Share Murti Photo with Customer'
    );
    await delay(400);
    await shareFileFallback(pdfUri, 'application/pdf', 'Share Invoice PDF with Customer');
    return;
  }

  await Linking.openURL(getWhatsAppAppUrl(phone, message));
  await shareFileFallback(pdfUri, 'application/pdf', 'Attach Receipt PDF');
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
  const message = isNewBooking
    ? buildNewBookingWhatsAppMessage(booking)
    : buildWhatsAppMessage(booking, { includeMurtiPhoto: hasMurtiPhoto });

  if (Platform.OS === 'web') {
    await shareOnWeb(booking, pdfUri, phone, message);
    return;
  }

  const shareableUri = await ensureShareablePdfUri(
    pdfUri,
    booking.booking_number
  );

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

  try {
    if (isNewBooking) {
      if (!shareablePhotoUri) {
        Alert.alert(
          'Murti Photo Required',
          'Please capture or select the Murti photo on this booking so WhatsApp can send the photo, message, and invoice together.'
        );
        return;
      }

      await shareNewBookingWhatsAppBundle(
        booking,
        phone,
        message,
        shareableUri,
        shareablePhotoUri
      );
      return;
    }

    await sharePdfViaReactNativeShare(booking, shareableUri, message, phone);

    // WhatsApp typically accepts one media item per share; send the murti
    // photo as a follow-up share to the same customer chat.
    if (shareablePhotoUri) {
      try {
        await shareImageViaReactNativeShare(
          booking,
          shareablePhotoUri,
          phone
        );
      } catch (photoError) {
        if (isUserCancelledShare(photoError)) return;
        console.warn('Murti photo WhatsApp share failed', photoError);
        await shareFileFallback(
          shareablePhotoUri,
          'image/jpeg',
          'Share Murti Photo with Customer'
        );
      }
    }
  } catch (error) {
    if (isUserCancelledShare(error)) return;

    if (isWhatsAppMissingError(error)) {
      Alert.alert(
        'WhatsApp Not Installed',
        'Please install WhatsApp to share the receipt directly with your customer.'
      );
      return;
    }

    await shareNativeFallback(phone, message, shareableUri, shareablePhotoUri);
  }
}

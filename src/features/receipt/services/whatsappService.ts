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

async function shareViaWhatsAppApp(params: {
  title: string;
  message: string;
  phone: string;
  appKind: WhatsAppAppKind;
  url?: string;
  type?: string;
}): Promise<void> {
  const Share = (await import('react-native-share')).default;
  const social = whatsAppSocialForKind(Share, params.appKind);

  await Share.shareSingle({
    title: params.title,
    message: params.message,
    social,
    whatsAppNumber: params.phone,
    ...(params.url
      ? {
          url: normalizeShareUrl(params.url),
          type: params.type,
        }
      : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

/**
 * New Booking WhatsApp: murti image + Marathi message + invoice PDF.
 * Opens the installed WhatsApp / WhatsApp Business app only (not Messenger
 * or the system share sheet).
 */
async function shareNewBookingWhatsAppBundle(
  booking: Booking,
  phone: string,
  message: string,
  pdfUri: string,
  murtiPhotoUri: string,
  appKind: WhatsAppAppKind
): Promise<void> {
  const lower = murtiPhotoUri.toLowerCase();
  const imageType = lower.endsWith('.png')
    ? 'image/png'
    : lower.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';

  await shareViaWhatsAppApp({
    title: `Murti Photo ${booking.booking_number}`,
    message,
    phone,
    appKind,
    url: murtiPhotoUri,
    type: imageType,
  });

  await new Promise((resolve) => setTimeout(resolve, 500));

  try {
    await shareViaWhatsAppApp({
      title: `Invoice ${booking.booking_number}`,
      message: '',
      phone,
      appKind,
      url: pdfUri,
      type: 'application/pdf',
    });
  } catch (pdfError) {
    if (isUserCancelledShare(pdfError)) return;
    console.warn('Invoice PDF WhatsApp share failed', pdfError);
    // Last resort: open WhatsApp chat with text; user can attach PDF manually.
    await openDeviceWhatsAppApp(phone, message);
  }
}

async function shareNativeFallback(
  phone: string,
  message: string,
  pdfUri: string,
  murtiPhotoUri: string | undefined,
  appKind: WhatsAppAppKind
): Promise<void> {
  await openDeviceWhatsAppApp(phone, message);

  // Prefer package-targeted shareSingle over the system share sheet so Facebook
  // Messenger / other apps never appear as the destination.
  try {
    if (murtiPhotoUri) {
      const lower = murtiPhotoUri.toLowerCase();
      const imageType = lower.endsWith('.png')
        ? 'image/png'
        : lower.endsWith('.webp')
          ? 'image/webp'
          : 'image/jpeg';
      await shareViaWhatsAppApp({
        title: `Murti Photo`,
        message: '',
        phone,
        appKind,
        url: murtiPhotoUri,
        type: imageType,
      });
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    await shareViaWhatsAppApp({
      title: `Receipt`,
      message: '',
      phone,
      appKind,
      url: pdfUri,
      type: 'application/pdf',
    });
  } catch (error) {
    if (isUserCancelledShare(error)) return;
    console.warn('WhatsApp attachment fallback failed', error);
  }
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

  const appKind = await resolveInstalledWhatsAppApp();
  if (!appKind) {
    showWhatsAppMissingAlert();
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
        shareablePhotoUri,
        appKind
      );
      return;
    }

    await shareViaWhatsAppApp({
      title: `Receipt ${booking.booking_number}`,
      message,
      phone,
      appKind,
      url: shareableUri,
      type: 'application/pdf',
    });

    if (shareablePhotoUri) {
      try {
        await shareViaWhatsAppApp({
          title: `Murti Photo ${booking.booking_number}`,
          message: `Murti photo for booking ${booking.booking_number}`,
          phone,
          appKind,
          url: shareablePhotoUri,
          type: 'image/jpeg',
        });
      } catch (photoError) {
        if (isUserCancelledShare(photoError)) return;
        console.warn('Murti photo WhatsApp share failed', photoError);
      }
    }
  } catch (error) {
    if (isUserCancelledShare(error)) return;

    if (isWhatsAppMissingError(error)) {
      // Retry once with the other WhatsApp package if both might be present.
      const alternate: WhatsAppAppKind =
        appKind === 'consumer' ? 'business' : 'consumer';
      try {
        if (isNewBooking && shareablePhotoUri) {
          await shareNewBookingWhatsAppBundle(
            booking,
            phone,
            message,
            shareableUri,
            shareablePhotoUri,
            alternate
          );
          return;
        }
        await shareViaWhatsAppApp({
          title: `Receipt ${booking.booking_number}`,
          message,
          phone,
          appKind: alternate,
          url: shareableUri,
          type: 'application/pdf',
        });
        return;
      } catch {
        showWhatsAppMissingAlert();
        return;
      }
    }

    await shareNativeFallback(
      phone,
      message,
      shareableUri,
      shareablePhotoUri,
      appKind
    );
  }
}

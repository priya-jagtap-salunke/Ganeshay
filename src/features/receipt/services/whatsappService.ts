import { Platform, Linking, Alert } from 'react-native';
import { Booking } from '@/types/booking';
import {
  buildWhatsAppMessage,
  formatWhatsAppPhone,
  getWhatsAppAppUrl,
  getWhatsAppWebUrl,
} from '../utils/whatsappMessage';

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

async function isWhatsAppInstalled(): Promise<boolean> {
  try {
    return await Linking.canOpenURL('whatsapp://send');
  } catch {
    return false;
  }
}

async function shareViaReactNativeShare(
  booking: Booking,
  pdfUri: string,
  message: string,
  phone: string
): Promise<void> {
  const Share = (await import('react-native-share')).default;
  const fileUrl =
    Platform.OS === 'android' ? pdfUri : pdfUri.replace('file://', '');

  await Share.shareSingle({
    title: `Receipt ${booking.booking_number}`,
    message,
    url: fileUrl.startsWith('file://') ? fileUrl : `file://${fileUrl}`,
    type: 'application/pdf',
    social: Share.Social.WHATSAPP,
    whatsAppNumber: phone,
  });
}

async function shareNativeFallback(
  phone: string,
  message: string,
  pdfUri: string
): Promise<void> {
  const hasWhatsApp = await isWhatsAppInstalled();
  if (!hasWhatsApp) {
    Alert.alert(
      'WhatsApp Not Installed',
      'WhatsApp is not installed on this device. Please install WhatsApp or use Download PDF to share manually.'
    );
    return;
  }

  await Linking.openURL(getWhatsAppAppUrl(phone, message));

  const Sharing = await import('expo-sharing');
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Attach Receipt PDF',
    });
  }
}

async function shareOnWeb(
  booking: Booking,
  pdfUri: string,
  phone: string,
  message: string
): Promise<void> {
  downloadPdfOnWeb(pdfUri, booking.booking_number);

  const whatsAppUrl = getWhatsAppWebUrl(phone, message);
  if (typeof window !== 'undefined') {
    window.open(whatsAppUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  await Linking.openURL(whatsAppUrl);
}

export async function shareReceiptOnWhatsApp(
  booking: Booking,
  pdfUri: string
): Promise<void> {
  const phone = formatWhatsAppPhone(booking.mobile);
  const message = buildWhatsAppMessage(booking);

  if (Platform.OS === 'web') {
    await shareOnWeb(booking, pdfUri, phone, message);
    return;
  }

  const shareableUri = await ensureShareablePdfUri(
    pdfUri,
    booking.booking_number
  );

  try {
    await shareViaReactNativeShare(booking, shareableUri, message, phone);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);

    if (
      errMsg.toLowerCase().includes('not installed') ||
      errMsg.toLowerCase().includes('whatsapp')
    ) {
      Alert.alert(
        'WhatsApp Not Installed',
        'Please install WhatsApp to share the receipt directly with your customer.'
      );
      return;
    }

    await shareNativeFallback(phone, message, shareableUri);
  }
}

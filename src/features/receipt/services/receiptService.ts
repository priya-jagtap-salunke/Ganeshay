import { Platform, Alert } from 'react-native';
import { Booking } from '@/types/booking';
import { BusinessDocumentSettings } from '@/types/settings';
import { buildReceiptHtml } from '../templates/receiptHtml';
import { shareReceiptOnWhatsApp } from './whatsappService';
import {
  buildLogoMarkup,
  buildQrMarkup,
  sanitizeSettingsForNativePdf,
} from '../utils/receiptMarkup';
import { isWebBrowser, usesNativePdf } from '../utils/receiptPlatform';

/** Bump when invoice HTML changes so cached PDFs regenerate. */
const RECEIPT_TEMPLATE_VERSION = 14;

const pdfCache = new Map<string, string>();

function receiptCacheKey(bookingId: string): string {
  return `${bookingId}-v${RECEIPT_TEMPLATE_VERSION}`;
}

export function invalidateReceiptCache(bookingId: string): void {
  const key = receiptCacheKey(bookingId);
  const cached = pdfCache.get(key);
  if (Platform.OS === 'web' && cached?.startsWith('blob:')) {
    URL.revokeObjectURL(cached);
  }
  pdfCache.delete(key);
}

export function clearAllReceiptCache(): void {
  pdfCache.forEach((uri, key) => {
    if (Platform.OS === 'web' && uri.startsWith('blob:')) {
      URL.revokeObjectURL(uri);
    }
    pdfCache.delete(key);
  });
}

export function getCachedReceiptUri(bookingId: string): string | undefined {
  return pdfCache.get(receiptCacheKey(bookingId));
}

export function setCachedReceiptUri(bookingId: string, uri: string): void {
  pdfCache.set(receiptCacheKey(bookingId), uri);
}

function pdfSettingsForNative(
  settings: BusinessDocumentSettings
): BusinessDocumentSettings {
  return sanitizeSettingsForNativePdf(settings);
}

async function generateNativePdf(html: string): Promise<string> {
  try {
    const Print = await import('expo-print');
    const result = await Print.printToFileAsync({
      html,
      width: 595,
      height: 842,
      margins: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20,
      },
    });

    if (!result?.uri) {
      throw new Error('PDF file was not created on this device.');
    }

    return result.uri;
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : 'Unknown print error';
    if (Platform.OS === 'android') {
      throw new Error(
        `Could not create PDF on Android (${detail}). Rebuild and reinstall the app, then try again.`
      );
    }
    throw new Error(`Could not create PDF (${detail}).`);
  }
}

async function generateWebPdf(html: string): Promise<string> {
  const { generatePdfBlobUrlFromHtml } = await import('./webPdfGenerator');
  return generatePdfBlobUrlFromHtml(html);
}

export async function generateReceiptPdf(
  booking: Booking,
  settings: BusinessDocumentSettings
): Promise<string> {
  const cacheKey = receiptCacheKey(booking.id);
  const cached = pdfCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const forNativePdf = usesNativePdf();
  const pdfSettings = pdfSettingsForNative(settings);
  const qrMarkup = await buildQrMarkup(booking.booking_number, forNativePdf);
  const logoMarkup = await buildLogoMarkup(pdfSettings, forNativePdf);
  const html = buildReceiptHtml(
    booking,
    pdfSettings,
    qrMarkup,
    logoMarkup,
    forNativePdf
  );

  const uri = isWebBrowser()
    ? await generateWebPdf(html)
    : await generateNativePdf(html);

  pdfCache.set(cacheKey, uri);
  return uri;
}

/** Same HTML as PDF generation — for on-screen view (no print dialog). */
export async function buildReceiptViewHtml(
  booking: Booking,
  settings: BusinessDocumentSettings
): Promise<string> {
  const forNativePdf = usesNativePdf();
  const pdfSettings = pdfSettingsForNative(settings);
  const qrMarkup = await buildQrMarkup(booking.booking_number, forNativePdf);
  const logoMarkup = await buildLogoMarkup(pdfSettings, forNativePdf);
  return buildReceiptHtml(
    booking,
    pdfSettings,
    qrMarkup,
    logoMarkup,
    forNativePdf
  );
}

export async function prepareReceiptFile(
  pdfUri: string,
  bookingNumber: string
): Promise<string> {
  if (Platform.OS === 'web') {
    return pdfUri;
  }

  const FileSystem = await import('expo-file-system');
  const destPath = `${FileSystem.cacheDirectory}Receipt_${bookingNumber}.pdf`;
  await FileSystem.copyAsync({ from: pdfUri, to: destPath });
  return destPath;
}

/**
 * @deprecated View Receipt now opens ReceiptViewer screen (no print UI).
 * Kept for any legacy callers — opens PDF without print dialog where possible.
 */
export async function viewReceiptPdf(pdfUri: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.open(pdfUri, '_blank');
    }
    return;
  }

  // Do not call Print.printAsync — that shows the Print UI.
  // Prefer in-app ReceiptViewer via navigation. Fallback: system share/view.
  const Sharing = await import('expo-sharing');
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Receipt',
      UTI: 'com.adobe.pdf',
    });
    return;
  }

  const Linking = await import('expo-linking');
  await Linking.openURL(pdfUri);
}

export async function downloadReceiptPdf(
  pdfUri: string,
  bookingNumber: string
): Promise<string> {
  const filename = `Receipt_${bookingNumber}.pdf`;

  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      const anchor = document.createElement('a');
      anchor.href = pdfUri;
      anchor.download = filename;
      anchor.click();
    }
    return pdfUri;
  }

  const FileSystem = await import('expo-file-system');
  const destPath = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.copyAsync({ from: pdfUri, to: destPath });

  Alert.alert('Download Complete', `Receipt saved as ${filename}`);
  return destPath;
}

export async function shareReceipt(pdfUri: string, bookingNumber: string) {
  if (Platform.OS === 'web') {
    await downloadReceiptPdf(pdfUri, bookingNumber);
    Alert.alert(
      'Receipt Ready',
      'Your receipt PDF has been downloaded. You can attach it when sharing.'
    );
    return;
  }

  const Sharing = await import('expo-sharing');
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  const destPath = await prepareReceiptFile(pdfUri, bookingNumber);

  await Sharing.shareAsync(destPath, {
    mimeType: 'application/pdf',
    dialogTitle: `Share Receipt - ${bookingNumber}`,
    UTI: 'com.adobe.pdf',
  });
}

export async function shareReceiptViaWhatsApp(
  booking: Booking,
  pdfUri: string,
  options?: { messageVariant?: 'default' | 'newBooking' }
): Promise<void> {
  await shareReceiptOnWhatsApp(booking, pdfUri, options);
}

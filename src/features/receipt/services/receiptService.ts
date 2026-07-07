import { Platform, Alert } from 'react-native';
import QRCode from 'qrcode';
import { Booking } from '@/types/booking';
import { BusinessDocumentSettings } from '@/types/settings';
import { buildReceiptHtml } from '../templates/receiptHtml';
import { shareReceiptOnWhatsApp } from './whatsappService';

/** Bump when invoice HTML changes so cached PDFs regenerate. */
const RECEIPT_TEMPLATE_VERSION = 5;

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

async function generateQrDataUrl(bookingNumber: string): Promise<string> {
  return QRCode.toDataURL(bookingNumber, {
    width: 200,
    margin: 1,
    color: { dark: '#B22234', light: '#FFFAF5' },
  });
}

async function generateWebPdf(html: string): Promise<string> {
  const { generatePdfBlobUrlFromHtml } = await import('./webPdfGenerator');
  return generatePdfBlobUrlFromHtml(html);
}

async function generateNativePdf(html: string): Promise<string> {
  const Print = await import('expo-print');
  const { uri } = await Print.printToFileAsync({
    html,
    width: 595,
    height: 842,
  });
  return uri;
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

  const qrDataUrl = await generateQrDataUrl(booking.booking_number);
  const html = buildReceiptHtml(booking, settings, qrDataUrl);

  const uri =
    Platform.OS === 'web'
      ? await generateWebPdf(html)
      : await generateNativePdf(html);

  pdfCache.set(cacheKey, uri);
  return uri;
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

export async function viewReceiptPdf(pdfUri: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.open(pdfUri, '_blank');
    }
    return;
  }

  const Print = await import('expo-print');
  await Print.printAsync({ uri: pdfUri });
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
  pdfUri: string
): Promise<void> {
  await shareReceiptOnWhatsApp(booking, pdfUri);
}

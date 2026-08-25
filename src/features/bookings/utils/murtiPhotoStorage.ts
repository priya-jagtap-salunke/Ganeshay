import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const PHOTO_DIR = `${FileSystem.documentDirectory}murti-photos/`;
const MAX_WEB_PHOTO_BYTES = 4 * 1024 * 1024;

async function ensurePhotoDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

async function readUriAsBase64(uri: string): Promise<string> {
  if (uri.startsWith('data:')) {
    const commaIndex = uri.indexOf(',');
    return commaIndex >= 0 ? uri.slice(commaIndex + 1) : uri;
  }

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const commaIndex = result.indexOf(',');
        resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

function estimateBase64Bytes(base64: string): number {
  return Math.ceil((base64.length * 3) / 4);
}

function mimeFromUri(uri: string): string {
  if (uri.startsWith('data:')) {
    const match = /^data:([^;]+);/i.exec(uri);
    return match?.[1] ?? 'image/jpeg';
  }
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function extensionForMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

/** Persist a picked/captured murti photo for a booking and return the stored URI. */
export async function persistMurtiPhoto(
  bookingId: string,
  sourceUri: string
): Promise<string> {
  const mime = mimeFromUri(sourceUri);
  const base64 = await readUriAsBase64(sourceUri);

  if (Platform.OS === 'web') {
    if (estimateBase64Bytes(base64) > MAX_WEB_PHOTO_BYTES) {
      throw new Error('Photo is too large. Please use an image under 4 MB.');
    }
    return `data:${mime};base64,${base64}`;
  }

  await ensurePhotoDir();
  const dest = `${PHOTO_DIR}${bookingId}.${extensionForMime(mime)}`;

  if (sourceUri.startsWith('data:')) {
    await FileSystem.writeAsStringAsync(dest, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } else {
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
  }

  return dest;
}

export async function removeMurtiPhoto(storedUri: string | null | undefined): Promise<void> {
  if (!storedUri || storedUri.startsWith('data:') || Platform.OS === 'web') {
    return;
  }

  const info = await FileSystem.getInfoAsync(storedUri);
  if (info.exists) {
    await FileSystem.deleteAsync(storedUri, { idempotent: true });
  }
}

/** Ensure a stored murti photo URI is a shareable file path on device. */
export async function ensureShareableMurtiPhotoUri(
  storedUri: string,
  bookingId?: string
): Promise<string> {
  const safeId = (bookingId ?? 'share').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'share';

  if (storedUri.startsWith('data:')) {
    const mime = mimeFromUri(storedUri);
    const base64 = storedUri.split(',')[1] ?? '';
    const dest = `${FileSystem.cacheDirectory}murti-${safeId}.${extensionForMime(mime)}`;
    await FileSystem.writeAsStringAsync(dest, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return dest;
  }

  const dest = `${FileSystem.cacheDirectory}murti-${safeId}.${extensionForMime(mimeFromUri(storedUri))}`;
  await FileSystem.copyAsync({ from: storedUri, to: dest });
  return dest;
}

export function downloadMurtiPhotoOnWeb(storedUri: string, bookingNumber: string): void {
  if (typeof document === 'undefined') return;

  const anchor = document.createElement('a');
  anchor.href = storedUri;
  anchor.download = `Murti_${bookingNumber}.jpg`;
  anchor.click();
}

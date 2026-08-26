import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const BANNER_FILENAME = 'telecalling-banner.jpg';
const MAX_WEB_BANNER_BYTES = 4 * 1024 * 1024;

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

function mimeFromUri(uri: string, fallback = 'image/jpeg'): string {
  const lower = uri.toLowerCase();
  if (lower.startsWith('data:image/')) {
    const match = /^data:(image\/[a-z0-9.+-]+);/i.exec(uri);
    return match?.[1] ?? fallback;
  }
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.gif')) return 'image/gif';
  return fallback;
}

export async function persistTelecallingBanner(
  sourceUri: string
): Promise<string> {
  const base64 = await readUriAsBase64(sourceUri);
  const mime = mimeFromUri(sourceUri);

  if (Platform.OS === 'web') {
    if (estimateBase64Bytes(base64) > MAX_WEB_BANNER_BYTES) {
      throw new Error(
        'Banner image is too large for web storage. Please use a file under 4 MB.'
      );
    }
    return `data:${mime};base64,${base64}`;
  }

  const baseDir = FileSystem.documentDirectory;
  if (!baseDir) {
    throw new Error('File storage is unavailable on this device.');
  }
  const dest = `${baseDir}${BANNER_FILENAME}`;
  await FileSystem.writeAsStringAsync(dest, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return dest;
}

export async function removeTelecallingBanner(
  storedUri: string | null
): Promise<void> {
  if (!storedUri) return;
  if (storedUri.startsWith('data:') || Platform.OS === 'web') return;

  const info = await FileSystem.getInfoAsync(storedUri);
  if (info.exists) {
    await FileSystem.deleteAsync(storedUri, { idempotent: true });
  }
}

/** Write a shareable file URI for WhatsApp (handles data: and file paths). */
export async function ensureShareableTelecallingBannerUri(
  storedUri: string
): Promise<{ uri: string; type: string }> {
  const mime = mimeFromUri(storedUri);
  const ext =
    mime === 'image/png'
      ? 'png'
      : mime === 'image/webp'
        ? 'webp'
        : 'jpg';
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('File storage is unavailable on this device.');
  }
  // Unique name avoids stale cache / FileProvider conflicts on rapid re-sends.
  const dest = `${cacheDir}telecalling-banner-share-${Date.now()}.${ext}`;

  if (storedUri.startsWith('data:')) {
    const base64 = storedUri.split(',')[1] ?? '';
    if (!base64) {
      throw new Error('Tele-calling banner data is empty.');
    }
    await FileSystem.writeAsStringAsync(dest, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } else {
    const info = await FileSystem.getInfoAsync(storedUri);
    if (!info.exists) {
      throw new Error('Tele-calling banner file was not found on device.');
    }
    await FileSystem.copyAsync({ from: storedUri, to: dest });
  }

  const shared = await FileSystem.getInfoAsync(dest);
  if (!shared.exists) {
    throw new Error('Could not create a shareable tele-calling banner file.');
  }

  // react-native-share expects a file:// URI on Android.
  const uri = dest.startsWith('file://') ? dest : `file://${dest}`;
  return { uri, type: mime };
}

export function downloadTelecallingBannerOnWeb(storedUri: string): void {
  if (typeof document === 'undefined') return;
  const mime = mimeFromUri(storedUri);
  const ext = mime === 'image/png' ? 'png' : 'jpg';
  const anchor = document.createElement('a');
  anchor.href = storedUri;
  anchor.download = `Telecalling_Banner.${ext}`;
  anchor.click();
}

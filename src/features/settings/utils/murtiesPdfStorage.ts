import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const PDF_FILENAME = 'murties-catalog.pdf';
/** Web stores PDF as data URI — keep a modest limit. */
const MAX_WEB_PDF_BYTES = 25 * 1024 * 1024;
/** Native app stores the file on disk. */
export const MAX_NATIVE_MURTIES_PDF_BYTES = 150 * 1024 * 1024;

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

export async function persistMurtiesPdf(
  sourceUri: string,
  fileName: string
): Promise<{ uri: string; name: string }> {
  if (Platform.OS === 'web') {
    const base64 = await readUriAsBase64(sourceUri);
    if (estimateBase64Bytes(base64) > MAX_WEB_PDF_BYTES) {
      throw new Error(
        'PDF is too large for web storage. Please use a file under 25 MB, or upload from the Android/iOS app (up to 150 MB).'
      );
    }
    return {
      uri: `data:application/pdf;base64,${base64}`,
      name: fileName,
    };
  }

  const baseDir = FileSystem.documentDirectory;
  if (!baseDir) {
    throw new Error('File storage is unavailable on this device.');
  }
  const dest = `${baseDir}${PDF_FILENAME}`;

  // Prefer copy for large catalogs — base64 round-trip OOMs above ~20–30 MB.
  if (sourceUri.startsWith('data:')) {
    const base64 = sourceUri.split(',')[1] ?? '';
    if (!base64) {
      throw new Error('PDF data is empty.');
    }
    if (estimateBase64Bytes(base64) > MAX_NATIVE_MURTIES_PDF_BYTES) {
      throw new Error('PDF is too large. Please use a file under 150 MB.');
    }
    await FileSystem.writeAsStringAsync(dest, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } else {
    const info = await FileSystem.getInfoAsync(sourceUri);
    if (!info.exists || info.isDirectory) {
      throw new Error('Selected PDF was not found.');
    }
    if (
      typeof info.size === 'number' &&
      info.size > MAX_NATIVE_MURTIES_PDF_BYTES
    ) {
      throw new Error('PDF is too large. Please use a file under 150 MB.');
    }
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
  }

  const saved = await FileSystem.getInfoAsync(dest);
  if (!saved.exists || (typeof saved.size === 'number' && saved.size < 64)) {
    throw new Error('Could not save the catalog PDF.');
  }

  // Drop any cached share copy so the next Send uses this upload.
  try {
    const cacheDir = FileSystem.cacheDirectory;
    if (cacheDir) {
      await FileSystem.deleteAsync(`${cacheDir}Download/murties-catalog-share.pdf`, {
        idempotent: true,
      });
    }
  } catch {
    // ignore cache cleanup failures
  }

  return { uri: dest, name: fileName };
}

export async function removeMurtiesPdf(storedUri: string | null): Promise<void> {
  if (!storedUri) return;

  if (storedUri.startsWith('data:') || Platform.OS === 'web') {
    return;
  }

  const info = await FileSystem.getInfoAsync(storedUri);
  if (info.exists) {
    await FileSystem.deleteAsync(storedUri, { idempotent: true });
  }
}

export async function ensureShareableMurtiesPdfUri(
  storedUri: string
): Promise<string> {
  // Already a local .pdf — share in place. Large catalogues (50–150 MB) must
  // not be copied on every Send; that made the button spin for a long time.
  if (!storedUri.startsWith('data:')) {
    const info = await FileSystem.getInfoAsync(storedUri);
    if (!info.exists || info.isDirectory) {
      throw new Error('Murties PDF file was not found on device.');
    }
    if (typeof info.size === 'number' && info.size < 64) {
      throw new Error('Could not create a shareable murties PDF file.');
    }
    if (/\.pdf$/i.test(storedUri)) {
      return storedUri.startsWith('file://')
        ? storedUri
        : `file://${storedUri}`;
    }

    // Force a .pdf path so WhatsApp never sees a wrong extension.
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      throw new Error('File storage is unavailable on this device.');
    }
    const downloadDir = `${cacheDir}Download/`;
    try {
      await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
    } catch {
      // may exist
    }
    const dest = `${downloadDir}murties-catalog-share.pdf`;
    await FileSystem.copyAsync({ from: storedUri, to: dest });
    return dest.startsWith('file://') ? dest : `file://${dest}`;
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('File storage is unavailable on this device.');
  }

  const downloadDir = `${cacheDir}Download/`;
  try {
    await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
  } catch {
    // May already exist.
  }

  // Stable path so we rewrite data: URIs only once (not every Send).
  const dest = `${downloadDir}murties-catalog-share.pdf`;
  const existing = await FileSystem.getInfoAsync(dest);
  if (
    existing.exists &&
    !existing.isDirectory &&
    typeof existing.size === 'number' &&
    existing.size >= 64
  ) {
    return dest.startsWith('file://') ? dest : `file://${dest}`;
  }

  const base64 = storedUri.split(',')[1] ?? '';
  if (!base64) {
    throw new Error('Murties PDF data is empty.');
  }
  await FileSystem.writeAsStringAsync(dest, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const shared = await FileSystem.getInfoAsync(dest);
  if (!shared.exists || (typeof shared.size === 'number' && shared.size < 64)) {
    throw new Error('Could not create a shareable murties PDF file.');
  }

  return dest.startsWith('file://') ? dest : `file://${dest}`;
}

export function downloadMurtiesPdfOnWeb(
  storedUri: string,
  fileName: string
): void {
  if (typeof document === 'undefined') return;

  const anchor = document.createElement('a');
  anchor.href = storedUri;
  anchor.download = fileName || 'Ganesha_Murties_Catalog.pdf';
  anchor.click();
}

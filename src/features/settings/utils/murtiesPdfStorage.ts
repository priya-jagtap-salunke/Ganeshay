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

async function assertPdfMagic(fileUri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(fileUri);
  // length/position is not honored on every device — reading a 50–150 MB
  // catalogue as base64 OOMs and makes Save/Send look like they "failed".
  if (typeof info.size === 'number' && info.size > 256_000) {
    return;
  }
  try {
    const head = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      length: 8,
      position: 0,
    });
    // "%PDF" in base64 starts with "JVBERi"
    if (head && head.length >= 6 && !head.startsWith('JVBERi')) {
      throw new Error(
        'Catalogue file is not a valid PDF. Re-upload the PDF in Settings.'
      );
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes('not a valid pdf')
    ) {
      throw error;
    }
    // Ignore platforms that cannot peek at file headers.
  }
}

/** Remove cached share copies so Send always uses the latest Settings PDF. */
export async function clearMurtiesPdfShareCache(): Promise<void> {
  if (Platform.OS === 'web') return;
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) return;

  const downloadDir = `${cacheDir}Download/`;
  const known = [
    `${downloadDir}murties-catalog-share.pdf`,
    `${downloadDir}Ganesha_Murties_Catalog.pdf`,
  ];
  for (const path of known) {
    try {
      await FileSystem.deleteAsync(path, { idempotent: true });
    } catch {
      // ignore
    }
  }
}

/**
 * Persist the complete Catalogue PDF to durable on-device storage.
 * Verifies size + PDF header so partial/corrupt saves are rejected.
 */
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
    if (!base64.startsWith('JVBERi')) {
      throw new Error('Selected file is not a valid PDF.');
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

  try {
    await FileSystem.deleteAsync(dest, { idempotent: true });
  } catch {
    // ignore
  }

  let expectedSize: number | null = null;

  // Prefer copy for large catalogs — base64 round-trip OOMs above ~20–30 MB.
  if (sourceUri.startsWith('data:')) {
    const base64 = sourceUri.split(',')[1] ?? '';
    if (!base64) {
      throw new Error('PDF data is empty.');
    }
    if (!base64.startsWith('JVBERi')) {
      throw new Error('Selected file is not a valid PDF.');
    }
    expectedSize = estimateBase64Bytes(base64);
    if (expectedSize > MAX_NATIVE_MURTIES_PDF_BYTES) {
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
    if (typeof info.size === 'number') {
      expectedSize = info.size;
      if (info.size < 64) {
        throw new Error('Selected PDF is empty or incomplete.');
      }
      if (info.size > MAX_NATIVE_MURTIES_PDF_BYTES) {
        throw new Error('PDF is too large. Please use a file under 150 MB.');
      }
    }
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
  }

  const saved = await FileSystem.getInfoAsync(dest);
  if (!saved.exists || saved.isDirectory) {
    throw new Error('Could not save the catalog PDF.');
  }
  if (typeof saved.size === 'number' && saved.size < 64) {
    try {
      await FileSystem.deleteAsync(dest, { idempotent: true });
    } catch {
      // ignore
    }
    throw new Error(
      'Catalogue PDF did not save completely. Please upload the full PDF again.'
    );
  }
  if (
    expectedSize != null &&
    typeof saved.size === 'number' &&
    saved.size < expectedSize * 0.9
  ) {
    try {
      await FileSystem.deleteAsync(dest, { idempotent: true });
    } catch {
      // ignore
    }
    throw new Error(
      'Catalogue PDF save was incomplete. Please upload the full PDF again in one go.'
    );
  }

  try {
    await assertPdfMagic(dest);
  } catch (error) {
    try {
      await FileSystem.deleteAsync(dest, { idempotent: true });
    } catch {
      // ignore
    }
    throw error;
  }

  // Drop cached share copies so the next Send uses this complete upload.
  await clearMurtiesPdfShareCache();

  return {
    uri: dest.startsWith('file://') ? dest : `file://${dest}`,
    name: fileName,
  };
}

export async function removeMurtiesPdf(storedUri: string | null): Promise<void> {
  if (!storedUri) return;

  if (storedUri.startsWith('data:') || Platform.OS === 'web') {
    await clearMurtiesPdfShareCache();
    return;
  }

  const info = await FileSystem.getInfoAsync(storedUri);
  if (info.exists) {
    await FileSystem.deleteAsync(storedUri, { idempotent: true });
  }
  // Also remove canonical path if Settings held a different URI.
  const baseDir = FileSystem.documentDirectory;
  if (baseDir) {
    try {
      await FileSystem.deleteAsync(`${baseDir}${PDF_FILENAME}`, {
        idempotent: true,
      });
    } catch {
      // ignore
    }
  }
  await clearMurtiesPdfShareCache();
}

/**
 * Canonical on-disk path for the Settings catalogue (native).
 * Survives URI drift in AsyncStorage as long as the file was saved once.
 */
export function getCanonicalMurtiesPdfUri(): string | null {
  if (Platform.OS === 'web') return null;
  const baseDir = FileSystem.documentDirectory;
  if (!baseDir) return null;
  const path = `${baseDir}${PDF_FILENAME}`;
  return path.startsWith('file://') ? path : `file://${path}`;
}

/**
 * Resolve the Settings catalogue URI to a real existing file.
 * Prefers the stored URI; falls back to the canonical document file.
 */
export async function resolvePersistedMurtiesPdfUri(
  storedUri: string | null | undefined
): Promise<string | null> {
  if (Platform.OS === 'web') {
    return storedUri?.trim() ? storedUri : null;
  }

  if (storedUri?.startsWith('data:')) {
    return storedUri;
  }

  if (storedUri) {
    try {
      const info = await FileSystem.getInfoAsync(storedUri);
      if (
        info.exists &&
        !info.isDirectory &&
        typeof info.size === 'number' &&
        info.size >= 64
      ) {
        return storedUri.startsWith('file://')
          ? storedUri
          : `file://${storedUri}`;
      }
    } catch {
      // fall through to canonical
    }
  }

  const canonical = getCanonicalMurtiesPdfUri();
  if (!canonical) return null;
  try {
    const info = await FileSystem.getInfoAsync(canonical);
    if (
      info.exists &&
      !info.isDirectory &&
      typeof info.size === 'number' &&
      info.size >= 64
    ) {
      return canonical;
    }
  } catch {
    // missing
  }
  return null;
}

/**
 * Resolve the Settings catalogue to a real on-disk .pdf URI for WhatsApp.
 * Always prefers the complete persisted Settings file.
 */
export async function ensureShareableMurtiesPdfUri(
  storedUri: string
): Promise<string> {
  const resolved = await resolvePersistedMurtiesPdfUri(storedUri);
  if (!resolved) {
    throw new Error(
      'Catalogue PDF was not found. Upload it again in Settings.'
    );
  }

  const verifyPdf = async (fileUri: string): Promise<string> => {
    const normalized = fileUri.startsWith('file://')
      ? fileUri
      : `file://${fileUri}`;
    const info = await FileSystem.getInfoAsync(normalized);
    if (!info.exists || info.isDirectory) {
      throw new Error(
        'Catalogue PDF was not found. Upload it again in Settings.'
      );
    }
    if (typeof info.size === 'number' && info.size < 64) {
      throw new Error(
        'Catalogue PDF is empty or incomplete. Upload the full PDF in Settings.'
      );
    }
    await assertPdfMagic(normalized);
    return normalized;
  };

  // Already a local .pdf — share from a cache/Download copy so RN Share's
  // FileProvider (cache-path only) can expose it to WhatsApp.
  if (!resolved.startsWith('data:')) {
    const info = await FileSystem.getInfoAsync(resolved);
    if (!info.exists || info.isDirectory) {
      throw new Error(
        'Catalogue PDF was not found. Upload it again in Settings.'
      );
    }
    if (typeof info.size === 'number' && info.size < 64) {
      throw new Error(
        'Catalogue PDF is empty or incomplete. Upload the full PDF in Settings.'
      );
    }

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

    // Reuse share copy when it already matches the Settings file size.
    const existing = await FileSystem.getInfoAsync(dest);
    const sameSize =
      existing.exists &&
      !existing.isDirectory &&
      typeof existing.size === 'number' &&
      typeof info.size === 'number' &&
      existing.size === info.size;

    if (!sameSize) {
      try {
        await FileSystem.deleteAsync(dest, { idempotent: true });
      } catch {
        // ignore
      }
      await FileSystem.copyAsync({ from: resolved, to: dest });
      const copied = await FileSystem.getInfoAsync(dest);
      if (
        typeof info.size === 'number' &&
        typeof copied.size === 'number' &&
        copied.size < info.size * 0.9
      ) {
        throw new Error(
          'Could not prepare the complete catalogue PDF. Try again.'
        );
      }
    }
    return verifyPdf(dest);
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

  const dest = `${downloadDir}murties-catalog-share.pdf`;
  const base64 = resolved.split(',')[1] ?? '';
  if (!base64) {
    throw new Error('Catalogue PDF data is empty. Upload it again in Settings.');
  }
  if (!base64.startsWith('JVBERi')) {
    throw new Error(
      'Catalogue file is not a valid PDF. Re-upload the PDF in Settings.'
    );
  }

  try {
    await FileSystem.deleteAsync(dest, { idempotent: true });
  } catch {
    // ignore
  }
  await FileSystem.writeAsStringAsync(dest, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return verifyPdf(dest);
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

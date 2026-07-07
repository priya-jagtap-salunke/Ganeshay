import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const PDF_FILENAME = 'murties-catalog.pdf';
const MAX_WEB_PDF_BYTES = 8 * 1024 * 1024;

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
  const base64 = await readUriAsBase64(sourceUri);

  if (Platform.OS === 'web') {
    if (estimateBase64Bytes(base64) > MAX_WEB_PDF_BYTES) {
      throw new Error('PDF is too large for web storage. Please use a file under 8 MB.');
    }
    return {
      uri: `data:application/pdf;base64,${base64}`,
      name: fileName,
    };
  }

  const dest = `${FileSystem.documentDirectory}${PDF_FILENAME}`;
  await FileSystem.writeAsStringAsync(dest, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

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
  if (storedUri.startsWith('data:')) {
    const base64 = storedUri.split(',')[1] ?? '';
    const dest = `${FileSystem.cacheDirectory}${PDF_FILENAME}`;
    await FileSystem.writeAsStringAsync(dest, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return dest;
  }

  const dest = `${FileSystem.cacheDirectory}${PDF_FILENAME}`;
  await FileSystem.copyAsync({ from: storedUri, to: dest });
  return dest;
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

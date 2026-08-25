import * as FileSystem from 'expo-file-system';
import QRCode from 'qrcode';

const CACHE_PREFIX = 'receipt-pdf-';
const MAX_LOGO_DATA_URI_LENGTH = 350_000;
const LOGO_IMG_STYLE =
  'height:52px;max-height:52px;max-width:180px;display:block;';

/** Write a base64 data URI image to cache and return a file URI. */
export async function writeDataUriImageToCache(
  dataUri: string,
  filename: string
): Promise<string> {
  const comma = dataUri.indexOf(',');
  const base64 = comma >= 0 ? dataUri.slice(comma + 1) : dataUri;
  const uri = `${FileSystem.cacheDirectory}${CACHE_PREFIX}${filename}`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return normalizeFileUri(uri);
}

function normalizeFileUri(path: string): string {
  if (path.startsWith('file://')) return path;
  return `file://${path}`;
}

function guessImageMime(uri: string, contentType?: string | null): string {
  const header = contentType?.split(';')[0]?.trim().toLowerCase();
  if (
    header === 'image/jpeg' ||
    header === 'image/jpg' ||
    header === 'image/png' ||
    header === 'image/webp'
  ) {
    return header === 'image/jpg' ? 'image/jpeg' : header;
  }

  const lower = uri.toLowerCase();
  if (lower.includes('.png') || lower.includes('image/png')) return 'image/png';
  if (lower.includes('.webp') || lower.includes('image/webp')) return 'image/webp';
  return 'image/jpeg';
}

/** True when the string is a raster data URI small enough for PDF HTML. */
export function isAndroidSafeRasterLogo(logo: string | null): logo is string {
  if (!logo) return false;
  if (logo.length > MAX_LOGO_DATA_URI_LENGTH) return false;
  return /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(logo);
}

function isResolvableLogoUri(logo: string): boolean {
  return (
    isAndroidSafeRasterLogo(logo) ||
    logo.startsWith('file://') ||
    logo.startsWith('content://') ||
    /^https?:\/\//i.test(logo)
  );
}

async function fileUriToDataUri(uri: string): Promise<string | null> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const dataUri = `data:${guessImageMime(uri)};base64,${base64}`;
  return isAndroidSafeRasterLogo(dataUri) ? dataUri : null;
}

async function httpUrlToDataUri(url: string): Promise<string | null> {
  const dest = `${FileSystem.cacheDirectory}${CACHE_PREFIX}logo-fetch.tmp`;
  const download = await FileSystem.downloadAsync(url, dest);
  if (download.status < 200 || download.status >= 300) {
    return null;
  }

  const base64 = await FileSystem.readAsStringAsync(download.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const mime = guessImageMime(
    url,
    download.headers?.['Content-Type'] ?? download.headers?.['content-type']
  );
  const dataUri = `data:${mime};base64,${base64}`;
  return isAndroidSafeRasterLogo(dataUri) ? dataUri : null;
}

/**
 * Convert vendor logo (data URI, file://, content://, or http) into a
 * printable base64 data URI. Returns null when unusable.
 */
export async function resolveLogoToPrintableDataUri(
  businessLogo: string | null
): Promise<string | null> {
  if (!businessLogo || !isResolvableLogoUri(businessLogo)) {
    return null;
  }

  if (isAndroidSafeRasterLogo(businessLogo)) {
    return businessLogo;
  }

  if (businessLogo.startsWith('data:')) {
    return null;
  }

  try {
    if (
      businessLogo.startsWith('file://') ||
      businessLogo.startsWith('content://')
    ) {
      return await fileUriToDataUri(businessLogo);
    }

    if (/^https?:\/\//i.test(businessLogo)) {
      return await httpUrlToDataUri(businessLogo);
    }
  } catch {
    return null;
  }

  return null;
}

/** QR as pure HTML table — works reliably in Android expo-print WebView. */
export function buildNativeQrHtmlTable(text: string): string {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const cell = 2;
  let rows = '';

  for (let y = 0; y < size; y++) {
    let cells = '';
    for (let x = 0; x < size; x++) {
      const dark = qr.modules.get(x, y);
      cells += `<td style="width:${cell}px;height:${cell}px;background-color:${
        dark ? '#7B1E1E' : '#FFF8E8'
      };padding:0;margin:0;font-size:0;line-height:0;"></td>`;
    }
    rows += `<tr>${cells}</tr>`;
  }

  return `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #D4AF37;">${rows}</table>`;
}

/**
 * Vendor logo only — inline base64 data URI (expo-print WebView cannot load
 * arbitrary file:// cache paths). Empty string when unset or unusable.
 */
export async function buildNativeLogoMarkup(
  businessLogo: string | null
): Promise<string> {
  const dataUri = await resolveLogoToPrintableDataUri(businessLogo);
  if (!dataUri) {
    return '';
  }

  return `<img src="${dataUri}" alt="Logo" style="${LOGO_IMG_STYLE}" />`;
}

export function nativePdfHtmlShell(htmlBody: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:4px;background-color:#FFF8E8;font-family:Arial,Helvetica,sans-serif;color:#3E2723;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
${htmlBody}
</body>
</html>`;
}

import QRCode from 'qrcode';
import { BusinessDocumentSettings } from '@/types/settings';

const QR_OPTIONS = {
  width: 120,
  margin: 1,
  color: { dark: '#7B1E1E', light: '#FFF8E8' },
} as const;

const MAX_LOGO_DATA_URI_LENGTH = 350_000;
const LOGO_IMG_STYLE =
  'height:52px;max-height:52px;max-width:180px;display:block;';

/** Browser PDF QR — canvas PNG data URL. */
export async function buildQrMarkup(
  text: string,
  _forNativePdf = false
): Promise<string> {
  const dataUrl = await QRCode.toDataURL(text, QR_OPTIONS);
  return `<img src="${dataUrl}" alt="QR" style="width:56px;height:56px;display:block;" />`;
}

function isPrintableDataUriLogo(logo: string): boolean {
  if (logo.length > MAX_LOGO_DATA_URI_LENGTH) return false;
  return /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(logo);
}

async function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Fetch/convert logo to an inlined data URI usable by html2pdf. */
async function resolveLogoToPrintableDataUri(
  businessLogo: string | null
): Promise<string | null> {
  if (!businessLogo) return null;

  if (isPrintableDataUriLogo(businessLogo)) {
    return businessLogo;
  }

  if (businessLogo.startsWith('data:')) {
    return null;
  }

  if (
    !businessLogo.startsWith('blob:') &&
    !/^https?:\/\//i.test(businessLogo) &&
    !businessLogo.startsWith('file://')
  ) {
    return null;
  }

  try {
    const response = await fetch(businessLogo);
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUri = await blobToDataUri(blob);
    return isPrintableDataUriLogo(dataUri) ? dataUri : null;
  } catch {
    return null;
  }
}

/** Browser PDF logo — vendor raster inlined as data URI; empty when unset. */
export async function buildLogoMarkup(
  settings: BusinessDocumentSettings,
  _forNativePdf = false
): Promise<string> {
  const dataUri = await resolveLogoToPrintableDataUri(settings.businessLogo);
  if (!dataUri) {
    return '';
  }

  return `<img src="${dataUri}" alt="Business logo" style="${LOGO_IMG_STYLE}" />`;
}

const MURTI_IMG_STYLE =
  'width:140px;max-width:140px;height:140px;max-height:140px;object-fit:cover;display:block;border:1.5px solid #D4AF37;';
const MAX_MURTI_DATA_URI_LENGTH = 1_200_000;

function isPrintableDataUriImage(uri: string, maxLength: number): boolean {
  if (uri.length > maxLength) return false;
  return /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(uri);
}

/** Downscale large camera photos so they fit html2pdf payload limits. */
async function compressImageBlobForPdf(blob: Blob): Promise<string | null> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return null;
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = objectUrl;
    });

    const attempts: { maxEdge: number; quality: number }[] = [
      { maxEdge: 560, quality: 0.55 },
      { maxEdge: 420, quality: 0.45 },
      { maxEdge: 280, quality: 0.35 },
    ];

    for (const attempt of attempts) {
      const scale = Math.min(1, attempt.maxEdge / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.drawImage(img, 0, 0, width, height);
      const dataUri = canvas.toDataURL('image/jpeg', attempt.quality);
      if (isPrintableDataUriImage(dataUri, MAX_MURTI_DATA_URI_LENGTH)) {
        return dataUri;
      }
    }
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
  return null;
}

/** Browser PDF murti photo — inlined data URI; empty when unset. */
export async function buildMurtiPhotoMarkup(
  murtiPhotoUri: string | null | undefined,
  _forNativePdf = false
): Promise<string> {
  if (!murtiPhotoUri) return '';

  try {
    let dataUri: string | null = null;
    if (isPrintableDataUriImage(murtiPhotoUri, MAX_MURTI_DATA_URI_LENGTH)) {
      dataUri = murtiPhotoUri;
    } else if (murtiPhotoUri.startsWith('data:')) {
      const response = await fetch(murtiPhotoUri);
      if (!response.ok) return '';
      dataUri = await compressImageBlobForPdf(await response.blob());
    } else if (
      murtiPhotoUri.startsWith('blob:') ||
      /^https?:\/\//i.test(murtiPhotoUri) ||
      murtiPhotoUri.startsWith('file://')
    ) {
      const response = await fetch(murtiPhotoUri);
      if (!response.ok) return '';
      const blob = await response.blob();
      const converted = await blobToDataUri(blob);
      dataUri = isPrintableDataUriImage(converted, MAX_MURTI_DATA_URI_LENGTH)
        ? converted
        : await compressImageBlobForPdf(blob);
    }
    if (!dataUri) return '';
    return `<img src="${dataUri}" alt="Murti" style="${MURTI_IMG_STYLE}" />`;
  } catch {
    return '';
  }
}

export function sanitizeSettingsForNativePdf(
  settings: BusinessDocumentSettings
): BusinessDocumentSettings {
  return settings;
}

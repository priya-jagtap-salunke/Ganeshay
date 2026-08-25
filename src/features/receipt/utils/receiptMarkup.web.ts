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

export function sanitizeSettingsForNativePdf(
  settings: BusinessDocumentSettings
): BusinessDocumentSettings {
  return settings;
}

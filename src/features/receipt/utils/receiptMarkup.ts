import { BusinessDocumentSettings } from '@/types/settings';
import {
  buildNativeLogoMarkup,
  buildNativeQrHtmlTable,
} from './nativePdfAssets';

/** Default/native-safe markup (Metro uses receiptMarkup.native.ts / .web.ts). */
export async function buildQrMarkup(
  text: string,
  _forNativePdf = true
): Promise<string> {
  return buildNativeQrHtmlTable(text);
}

/** Vendor logo only — empty when unset (native-safe raster path). */
export async function buildLogoMarkup(
  settings: BusinessDocumentSettings,
  _forNativePdf = true
): Promise<string> {
  return buildNativeLogoMarkup(settings.businessLogo);
}

/** Keep logo for resolution in buildLogoMarkup; do not strip URIs early. */
export function sanitizeSettingsForNativePdf(
  settings: BusinessDocumentSettings
): BusinessDocumentSettings {
  return settings;
}

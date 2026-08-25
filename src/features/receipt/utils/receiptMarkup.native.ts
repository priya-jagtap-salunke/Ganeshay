import { BusinessDocumentSettings } from '@/types/settings';
import {
  buildNativeLogoMarkup,
  buildNativeQrHtmlTable,
} from './nativePdfAssets';

/** Native PDF QR — pure HTML table, no canvas. */
export async function buildQrMarkup(
  text: string,
  _forNativePdf = true
): Promise<string> {
  return buildNativeQrHtmlTable(text);
}

/** Native PDF logo — printable data URI only; empty when unset. */
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

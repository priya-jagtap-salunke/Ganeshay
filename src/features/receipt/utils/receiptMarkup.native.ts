import { BusinessDocumentSettings } from '@/types/settings';
import {
  buildNativeLogoMarkup,
  buildNativeMurtiPhotoMarkup,
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

/** Native PDF murti photo — printable data URI; empty when unset. */
export async function buildMurtiPhotoMarkup(
  murtiPhotoUri: string | null | undefined,
  _forNativePdf = true
): Promise<string> {
  return buildNativeMurtiPhotoMarkup(murtiPhotoUri);
}

/** Keep logo for resolution in buildLogoMarkup; do not strip URIs early. */
export function sanitizeSettingsForNativePdf(
  settings: BusinessDocumentSettings
): BusinessDocumentSettings {
  return settings;
}

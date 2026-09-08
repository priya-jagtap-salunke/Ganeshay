import { Platform, Linking, Alert } from 'react-native';
import { BusinessSettings } from '@/types/settings';
import {
  formatWhatsAppPhone,
  getWhatsAppWebUrl,
} from '@/features/receipt/utils/whatsappMessage';
import {
  openDeviceWhatsAppApp,
  resolveInstalledWhatsAppApp,
  showWhatsAppMissingAlert,
  type WhatsAppAppKind,
} from '@/features/receipt/utils/whatsappApp';
import { shareWhatsAppMedia } from '@/features/receipt/utils/whatsappMediaShare';
import {
  delay,
  waitForWhatsAppReady,
} from '@/features/receipt/utils/whatsappTiming';
import { buildStallDetailsWhatsAppMessage } from '../utils/stallDetailsWhatsAppMessage';
import {
  downloadMurtiesPdfOnWeb,
  ensureShareableMurtiesPdfUri,
} from '@/features/settings/utils/murtiesPdfStorage';
import {
  downloadTelecallingBannerOnWeb,
  ensureShareableTelecallingBannerUri,
} from '@/features/settings/utils/telecallingBannerStorage';

const ANDROID_STEP_DELAY_MS = 550;

function isUserCancelledShare(error: unknown): boolean {
  const msg = (
    error instanceof Error ? error.message : String(error)
  ).toLowerCase();
  return (
    msg.includes('user did not share') ||
    msg.includes('user cancelled') ||
    msg.includes('user canceled') ||
    msg.includes('ecancelled') ||
    msg.includes('ecanceled')
  );
}

function isWhatsAppMissingError(error: unknown): boolean {
  const msg = (
    error instanceof Error ? error.message : String(error)
  ).toLowerCase();
  return (
    msg.includes('not installed') ||
    msg.includes('no activity') ||
    msg.includes('activitynotfound')
  );
}

function bannerFilename(type: string): string {
  if (type === 'image/png') return 'telecalling-banner.png';
  if (type === 'image/webp') return 'telecalling-banner.webp';
  return 'telecalling-banner.jpg';
}

async function shareMediaOnly(params: {
  phone: string;
  appKind: WhatsAppAppKind;
  url: string;
  type: string;
  filename: string;
  title?: string;
  targetPhone?: boolean;
}): Promise<void> {
  await shareWhatsAppMedia({
    title: params.title ?? 'Stall Enquiry Details',
    phone: params.phone,
    appKind: params.appKind,
    url: params.url,
    type: params.type,
    filename: params.filename,
    targetPhone: params.targetPhone,
  });
}

/**
 * Android only: open chat with text, then attach banner (+ optional PDF)
 * via package-locked Intent (no system chooser).
 */
async function shareAndroidMessageThenBanner(params: {
  phone: string;
  message: string;
  appKind: WhatsAppAppKind;
  banner: { uri: string; type: string };
  pdfUri?: string;
}): Promise<void> {
  await openDeviceWhatsAppApp(params.phone, params.message, params.appKind);
  await waitForWhatsAppReady();

  try {
    await shareMediaOnly({
      phone: params.phone,
      appKind: params.appKind,
      url: params.banner.uri,
      type: params.banner.type,
      filename: bannerFilename(params.banner.type),
      targetPhone: true,
    });
  } catch (attachError) {
    if (isUserCancelledShare(attachError)) throw attachError;
    await shareMediaOnly({
      phone: params.phone,
      appKind: params.appKind,
      url: params.banner.uri,
      type: params.banner.type,
      filename: bannerFilename(params.banner.type),
      targetPhone: true,
    });
  }

  if (params.pdfUri) {
    await delay(ANDROID_STEP_DELAY_MS);
    try {
      await shareMediaOnly({
        phone: params.phone,
        appKind: params.appKind,
        url: params.pdfUri,
        type: 'application/pdf',
        filename: 'Ganesha_Murties_Catalog.pdf',
        targetPhone: true,
      });
    } catch (pdfError) {
      if (isUserCancelledShare(pdfError)) return;
      console.warn('Murties PDF follow-up share failed', pdfError);
    }
  }
}

async function shareAndroidMessageThenPdf(params: {
  phone: string;
  message: string;
  appKind: WhatsAppAppKind;
  pdfUri: string;
}): Promise<void> {
  await openDeviceWhatsAppApp(params.phone, params.message, params.appKind);
  await waitForWhatsAppReady();

  try {
    await shareMediaOnly({
      phone: params.phone,
      appKind: params.appKind,
      url: params.pdfUri,
      type: 'application/pdf',
      filename: 'Ganesha_Murties_Catalog.pdf',
      targetPhone: true,
    });
  } catch (attachError) {
    if (isUserCancelledShare(attachError)) throw attachError;
    throw attachError;
  }
}

async function shareOnWeb(
  phone: string,
  message: string,
  settings: BusinessSettings
): Promise<void> {
  if (settings.telecallingBannerUri) {
    downloadTelecallingBannerOnWeb(settings.telecallingBannerUri);
  }
  if (settings.murtiesPdfUri) {
    downloadMurtiesPdfOnWeb(
      settings.murtiesPdfUri,
      settings.murtiesPdfName || 'Ganesha_Murties_Catalog.pdf'
    );
  }

  const whatsAppUrl = getWhatsAppWebUrl(phone, message);
  if (typeof window !== 'undefined') {
    window.open(whatsAppUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  await Linking.openURL(whatsAppUrl);
}

export interface StallDetailsShareRecipient {
  mobile: string;
  customerName?: string | null;
  callDate?: string | null;
}

/**
 * Tele-calling Send:
 * Opens WhatsApp / WhatsApp Business for this contact with predrafted text.
 *
 * iOS: deep link only (`whatsapp://`) — never file Share / Open In
 * (that sheet shows Message + Open in WhatsApp).
 *
 * Android: same deep link, then optional banner/PDF via package Intent.
 */
export async function shareStallDetailsOnWhatsApp(
  recipient: StallDetailsShareRecipient,
  settings: BusinessSettings
): Promise<void> {
  const phone = formatWhatsAppPhone(recipient.mobile);
  const message = buildStallDetailsWhatsAppMessage(settings, {
    customerName: recipient.customerName,
    callDate: recipient.callDate,
  }).trim();

  if (!phone) {
    Alert.alert('Invalid Mobile', 'Customer mobile number is missing or invalid.');
    return;
  }

  if (!message) {
    Alert.alert(
      'Message Missing',
      'Set a Tele-calling message in Settings, then try Send again.'
    );
    return;
  }

  if (Platform.OS === 'web') {
    await shareOnWeb(phone, message, settings);
    return;
  }

  const installedApp = await resolveInstalledWhatsAppApp();
  if (!installedApp) {
    showWhatsAppMissingAlert();
    return;
  }

  // iOS: text deep link only. Never prepare/share banner or PDF here —
  // UIDocumentInteractionController Open In lists Message + WhatsApp.
  if (Platform.OS === 'ios') {
    try {
      await openDeviceWhatsAppApp(phone, message, installedApp);
    } catch (error) {
      if (isWhatsAppMissingError(error)) {
        const alternate: WhatsAppAppKind =
          installedApp === 'consumer' ? 'business' : 'consumer';
        try {
          await openDeviceWhatsAppApp(phone, message, alternate);
          return;
        } catch {
          showWhatsAppMissingAlert();
          return;
        }
      }
      console.warn('WhatsApp tele-calling open failed', error);
      Alert.alert(
        'WhatsApp Error',
        'Could not open WhatsApp with the stall details. Please try again.'
      );
    }
    return;
  }

  const hasBanner = Boolean(settings.telecallingBannerUri);
  const hasPdf = Boolean(settings.murtiesPdfUri);

  let shareableBanner: { uri: string; type: string } | undefined;
  if (hasBanner && settings.telecallingBannerUri) {
    try {
      shareableBanner = await ensureShareableTelecallingBannerUri(
        settings.telecallingBannerUri
      );
    } catch (error) {
      console.warn('Could not prepare tele-calling banner for WhatsApp', error);
      Alert.alert(
        'Banner Attach Failed',
        'Could not prepare the banner image. The message will still open in WhatsApp.'
      );
    }
  }

  let shareablePdfUri: string | undefined;
  if (hasPdf && settings.murtiesPdfUri) {
    try {
      shareablePdfUri = await ensureShareableMurtiesPdfUri(settings.murtiesPdfUri);
    } catch (error) {
      console.warn('Could not prepare murties PDF for WhatsApp share', error);
      Alert.alert(
        'PDF Attach Failed',
        'Could not prepare the catalog PDF. The message will still open in WhatsApp.'
      );
    }
  }

  const runShare = async (appKind: WhatsAppAppKind) => {
    if (!shareableBanner) {
      if (shareablePdfUri) {
        await shareAndroidMessageThenPdf({
          phone,
          message,
          appKind,
          pdfUri: shareablePdfUri,
        });
        return;
      }

      await openDeviceWhatsAppApp(phone, message, appKind);
      return;
    }

    await shareAndroidMessageThenBanner({
      phone,
      message,
      appKind,
      banner: shareableBanner,
      pdfUri: shareablePdfUri,
    });
  };

  try {
    await runShare(installedApp);
  } catch (error) {
    if (isUserCancelledShare(error)) return;

    if (isWhatsAppMissingError(error)) {
      const alternate: WhatsAppAppKind =
        installedApp === 'consumer' ? 'business' : 'consumer';
      try {
        await runShare(alternate);
        return;
      } catch {
        showWhatsAppMissingAlert();
        return;
      }
    }

    // Last resort on Android: open chat with text only (never a system chooser).
    try {
      await openDeviceWhatsAppApp(phone, message, installedApp);
    } catch (fallbackError) {
      if (isUserCancelledShare(fallbackError)) return;
      console.warn('WhatsApp tele-calling fallback failed', fallbackError);
      Alert.alert(
        'WhatsApp Error',
        'Could not open WhatsApp with the stall details. Please try again.'
      );
    }
  }
}

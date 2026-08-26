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
  whatsAppSocialForKind,
  type WhatsAppAppKind,
} from '@/features/receipt/utils/whatsappApp';
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

function normalizeShareUrl(uri: string): string {
  const fileUrl =
    Platform.OS === 'android' ? uri : uri.replace('file://', '');
  return fileUrl.startsWith('file://') ? fileUrl : `file://${fileUrl}`;
}

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function shareViaReactNativeShare(params: {
  message: string;
  phone: string;
  appKind: WhatsAppAppKind;
  url?: string;
  type?: string;
  filename?: string;
  /**
   * Android: omit after openDeviceWhatsAppApp so Conversation isn't restarted
   * (restart clears the prefilled draft).
   */
  targetPhone?: boolean;
}): Promise<void> {
  const Share = (await import('react-native-share')).default;
  const social = whatsAppSocialForKind(Share, params.appKind);
  const targetPhone = params.targetPhone !== false;

  await Share.shareSingle({
    title: 'Stall Enquiry Details',
    message: params.message,
    social,
    ...(targetPhone ? { whatsAppNumber: params.phone } : {}),
    ...(params.url
      ? {
          url: normalizeShareUrl(params.url),
          type: params.type,
          ...(params.filename ? { filename: params.filename } : {}),
        }
      : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

function bannerFilename(type: string): string {
  if (type === 'image/png') return 'telecalling-banner.png';
  if (type === 'image/webp') return 'telecalling-banner.webp';
  return 'telecalling-banner.jpg';
}

/**
 * Android reliably drops captions when shareSingle includes an image.
 * Open the customer chat with the pre-drafted text first, then attach the
 * banner into that same chat via shareSingle (image-only).
 * Omit whatsAppNumber on the first media attach so Conversation isn't restarted.
 */
async function shareAndroidMessageThenBanner(params: {
  phone: string;
  message: string;
  appKind: WhatsAppAppKind;
  banner: { uri: string; type: string };
  pdfUri?: string;
}): Promise<void> {
  await openDeviceWhatsAppApp(params.phone, params.message, params.appKind);
  await delay(ANDROID_STEP_DELAY_MS);

  try {
    await shareViaReactNativeShare({
      message: '',
      phone: params.phone,
      appKind: params.appKind,
      url: params.banner.uri,
      type: params.banner.type,
      filename: bannerFilename(params.banner.type),
      targetPhone: false,
    });
  } catch (attachError) {
    if (isUserCancelledShare(attachError)) throw attachError;
    await shareViaReactNativeShare({
      message: '',
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
      await shareViaReactNativeShare({
        message: '',
        phone: params.phone,
        appKind: params.appKind,
        url: params.pdfUri,
        type: 'application/pdf',
        filename: 'Ganesha_Murties_Catalog.pdf',
        targetPhone: false,
      });
    } catch (pdfError) {
      if (isUserCancelledShare(pdfError)) return;
      console.warn('Murties PDF follow-up share failed', pdfError);
    }
  }
}

/**
 * Android message + PDF only (no banner): continuous draft — open chat, delay,
 * attach PDF without restarting Conversation. No mid-flow Attach PDF alert.
 */
async function shareAndroidMessageThenPdf(params: {
  phone: string;
  message: string;
  appKind: WhatsAppAppKind;
  pdfUri: string;
}): Promise<void> {
  await openDeviceWhatsAppApp(params.phone, params.message, params.appKind);
  await delay(ANDROID_STEP_DELAY_MS);

  try {
    await shareViaReactNativeShare({
      message: params.message,
      phone: params.phone,
      appKind: params.appKind,
      url: params.pdfUri,
      type: 'application/pdf',
      filename: 'Ganesha_Murties_Catalog.pdf',
      targetPhone: false,
    });
  } catch (attachError) {
    if (isUserCancelledShare(attachError)) throw attachError;
    await shareViaReactNativeShare({
      message: params.message,
      phone: params.phone,
      appKind: params.appKind,
      url: params.pdfUri,
      type: 'application/pdf',
      filename: 'Ganesha_Murties_Catalog.pdf',
      targetPhone: true,
    });
  }
}

/** iOS / combined share: message + banner in one shareSingle when possible. */
async function shareMessageAndBannerTogether(params: {
  phone: string;
  message: string;
  appKind: WhatsAppAppKind;
  banner: { uri: string; type: string };
  pdfUri?: string;
}): Promise<void> {
  await shareViaReactNativeShare({
    message: params.message,
    phone: params.phone,
    appKind: params.appKind,
    url: params.banner.uri,
    type: params.banner.type,
    filename: bannerFilename(params.banner.type),
  });

  if (params.pdfUri) {
    await delay(ANDROID_STEP_DELAY_MS);
    try {
      await shareViaReactNativeShare({
        message: '',
        phone: params.phone,
        appKind: params.appKind,
        url: params.pdfUri,
        type: 'application/pdf',
        filename: 'Ganesha_Murties_Catalog.pdf',
      });
    } catch (pdfError) {
      if (isUserCancelledShare(pdfError)) return;
      console.warn('Murties PDF follow-up share failed', pdfError);
    }
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
 * Tele-calling Send Details:
 * Opens installed WhatsApp / WhatsApp Business directly, prefills the stall
 * message, attaches the settings banner image (primary), then optional PDF.
 *
 * Android: message via package intent, then banner via shareSingle (image-only).
 * iOS: shareSingle with message + image when possible; two-step on failure.
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

  const hasBanner = Boolean(settings.telecallingBannerUri);
  const hasPdf = Boolean(settings.murtiesPdfUri);

  if (Platform.OS === 'web') {
    await shareOnWeb(phone, message, settings);
    return;
  }

  const installedApp = await resolveInstalledWhatsAppApp();
  if (!installedApp) {
    showWhatsAppMissingAlert();
    return;
  }

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
    // Message only (no banner): open chat with prefilled text.
    if (!shareableBanner) {
      if (shareablePdfUri) {
        if (Platform.OS === 'android') {
          await shareAndroidMessageThenPdf({
            phone,
            message,
            appKind,
            pdfUri: shareablePdfUri,
          });
          return;
        }

        await openDeviceWhatsAppApp(phone, message, appKind);
        await delay(ANDROID_STEP_DELAY_MS);
        await shareViaReactNativeShare({
          message: '',
          phone,
          appKind,
          url: shareablePdfUri,
          type: 'application/pdf',
          filename: 'Ganesha_Murties_Catalog.pdf',
        });
        return;
      }

      await openDeviceWhatsAppApp(phone, message, appKind);
      return;
    }

    // Banner + message
    if (Platform.OS === 'android') {
      await shareAndroidMessageThenBanner({
        phone,
        message,
        appKind,
        banner: shareableBanner,
        pdfUri: shareablePdfUri,
      });
      return;
    }

    // iOS: try combined shareSingle first (caption often survives).
    try {
      await shareMessageAndBannerTogether({
        phone,
        message,
        appKind,
        banner: shareableBanner,
        pdfUri: shareablePdfUri,
      });
    } catch (combinedError) {
      if (isUserCancelledShare(combinedError)) throw combinedError;
      // Fall back to message-first, then image.
      await openDeviceWhatsAppApp(phone, message, appKind);
      await delay(ANDROID_STEP_DELAY_MS);
      await shareViaReactNativeShare({
        message: '',
        phone,
        appKind,
        url: shareableBanner.uri,
        type: shareableBanner.type,
        filename: bannerFilename(shareableBanner.type),
      });
      if (shareablePdfUri) {
        await delay(ANDROID_STEP_DELAY_MS);
        try {
          await shareViaReactNativeShare({
            message: '',
            phone,
            appKind,
            url: shareablePdfUri,
            type: 'application/pdf',
            filename: 'Ganesha_Murties_Catalog.pdf',
          });
        } catch (pdfError) {
          if (isUserCancelledShare(pdfError)) return;
          console.warn('Murties PDF follow-up share failed', pdfError);
        }
      }
    }
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

    // Last resort: always get the message into the chat; retry banner if possible.
    try {
      await openDeviceWhatsAppApp(phone, message, installedApp);
      if (shareableBanner) {
        await delay(ANDROID_STEP_DELAY_MS);
        await shareViaReactNativeShare({
          message: '',
          phone,
          appKind: installedApp,
          url: shareableBanner.uri,
          type: shareableBanner.type,
          filename: bannerFilename(shareableBanner.type),
        });
      }
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

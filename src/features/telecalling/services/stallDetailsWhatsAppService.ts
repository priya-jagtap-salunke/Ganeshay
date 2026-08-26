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

async function shareViaReactNativeShare(params: {
  message: string;
  phone: string;
  appKind: WhatsAppAppKind;
  url?: string;
  type?: string;
}): Promise<void> {
  const Share = (await import('react-native-share')).default;
  const social = whatsAppSocialForKind(Share, params.appKind);

  await Share.shareSingle({
    title: 'Stall Enquiry Details',
    message: params.message,
    social,
    whatsAppNumber: params.phone,
    ...(params.url
      ? {
          url: normalizeShareUrl(params.url),
          type: params.type,
        }
      : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

async function shareNativeFallback(
  phone: string,
  message: string,
  appKind: WhatsAppAppKind,
  banner?: { uri: string; type: string },
  pdfUri?: string
): Promise<void> {
  await openDeviceWhatsAppApp(phone, message);

  try {
    if (banner) {
      await shareViaReactNativeShare({
        message: '',
        phone,
        appKind,
        url: banner.uri,
        type: banner.type,
      });
    }
    if (pdfUri) {
      await shareViaReactNativeShare({
        message: '',
        phone,
        appKind,
        url: pdfUri,
        type: 'application/pdf',
      });
    }
  } catch (error) {
    console.warn('WhatsApp attachment fallback failed', error);
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
 */
export async function shareStallDetailsOnWhatsApp(
  recipient: StallDetailsShareRecipient,
  settings: BusinessSettings
): Promise<void> {
  const phone = formatWhatsAppPhone(recipient.mobile);
  const message = buildStallDetailsWhatsAppMessage(settings, {
    customerName: recipient.customerName,
    callDate: recipient.callDate,
  });
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
    // Primary: pre-drafted message + banner image together.
    if (shareableBanner) {
      await shareViaReactNativeShare({
        message,
        phone,
        appKind,
        url: shareableBanner.uri,
        type: shareableBanner.type,
      });
    } else if (shareablePdfUri) {
      await shareViaReactNativeShare({
        message,
        phone,
        appKind,
        url: shareablePdfUri,
        type: 'application/pdf',
      });
      return;
    } else {
      await shareViaReactNativeShare({ message, phone, appKind });
      return;
    }

    // Optional follow-up: murties PDF when banner was already sent with message.
    if (shareablePdfUri) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        await shareViaReactNativeShare({
          message: '',
          phone,
          appKind,
          url: shareablePdfUri,
          type: 'application/pdf',
        });
      } catch (pdfError) {
        if (isUserCancelledShare(pdfError)) return;
        console.warn('Murties PDF follow-up share failed', pdfError);
      }
    }
  };

  try {
    await runShare(installedApp);
  } catch (error) {
    if (isUserCancelledShare(error)) return;

    const errMsg = error instanceof Error ? error.message : String(error);
    const lower = errMsg.toLowerCase();

    if (lower.includes('not installed') || lower.includes('no activity')) {
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

    await shareNativeFallback(
      phone,
      message,
      installedApp,
      shareableBanner,
      shareablePdfUri
    );
  }
}

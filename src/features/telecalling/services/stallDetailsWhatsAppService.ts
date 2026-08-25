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

async function shareViaReactNativeShare(
  message: string,
  phone: string,
  appKind: WhatsAppAppKind,
  pdfUri?: string
): Promise<void> {
  const Share = (await import('react-native-share')).default;
  const social = whatsAppSocialForKind(Share, appKind);

  const payload: {
    title: string;
    message: string;
    social: typeof social;
    whatsAppNumber: string;
    url?: string;
    type?: string;
  } = {
    title: 'Stall Enquiry Details',
    message,
    social,
    whatsAppNumber: phone,
  };

  if (pdfUri) {
    const fileUrl =
      Platform.OS === 'android'
        ? pdfUri
        : pdfUri.replace('file://', '');
    payload.url = fileUrl.startsWith('file://') ? fileUrl : `file://${fileUrl}`;
    payload.type = 'application/pdf';
  }

  await Share.shareSingle(payload);
}

async function shareNativeFallback(
  phone: string,
  message: string,
  appKind: WhatsAppAppKind,
  pdfUri?: string
): Promise<void> {
  await openDeviceWhatsAppApp(phone, message);

  if (!pdfUri) return;

  try {
    await shareViaReactNativeShare('', phone, appKind, pdfUri);
  } catch (error) {
    console.warn('WhatsApp PDF fallback failed', error);
  }
}

async function shareOnWeb(
  phone: string,
  message: string,
  settings: BusinessSettings
): Promise<void> {
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
 * Opens installed WhatsApp / WhatsApp Business directly (not Facebook Messenger
 * or the system share sheet), prefills the stall message, attaches murties PDF.
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

  let shareablePdfUri: string | undefined;
  if (hasPdf && settings.murtiesPdfUri) {
    try {
      shareablePdfUri = await ensureShareableMurtiesPdfUri(settings.murtiesPdfUri);
    } catch (error) {
      console.warn('Could not prepare murties PDF for WhatsApp share', error);
      Alert.alert(
        'PDF Attach Failed',
        'Could not prepare the catalog PDF. The message will still open in WhatsApp without the attachment.'
      );
    }
  }

  try {
    await shareViaReactNativeShare(
      message,
      phone,
      installedApp,
      shareablePdfUri
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const lower = errMsg.toLowerCase();

    if (
      lower.includes('user did not share') ||
      lower.includes('user cancelled') ||
      lower.includes('user canceled') ||
      lower.includes('ecancelled') ||
      lower.includes('ecanceled')
    ) {
      return;
    }

    if (lower.includes('not installed') || lower.includes('no activity')) {
      const alternate: WhatsAppAppKind =
        installedApp === 'consumer' ? 'business' : 'consumer';
      try {
        await shareViaReactNativeShare(
          message,
          phone,
          alternate,
          shareablePdfUri
        );
        return;
      } catch {
        showWhatsAppMissingAlert();
        return;
      }
    }

    await shareNativeFallback(phone, message, installedApp, shareablePdfUri);
  }
}

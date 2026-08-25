import { Platform, Linking, Alert } from 'react-native';
import { BusinessSettings } from '@/types/settings';
import { Enquiry } from '@/types/enquiry';
import {
  formatWhatsAppPhone,
  getWhatsAppAppUrl,
  getWhatsAppWebUrl,
} from '@/features/receipt/utils/whatsappMessage';
import { buildStallDetailsWhatsAppMessage } from '../utils/enquiryWhatsAppMessage';
import {
  downloadMurtiesPdfOnWeb,
  ensureShareableMurtiesPdfUri,
} from '@/features/settings/utils/murtiesPdfStorage';

const WHATSAPP_PACKAGE = 'com.whatsapp';
const WHATSAPP_BUSINESS_PACKAGE = 'com.whatsapp.w4b';

type WhatsAppAppKind = 'consumer' | 'business';

async function isWhatsAppSchemeAvailable(): Promise<boolean> {
  try {
    return await Linking.canOpenURL('whatsapp://send');
  } catch {
    return false;
  }
}

/** Prefer Messenger if installed; otherwise WhatsApp Business. */
async function resolveInstalledWhatsAppApp(): Promise<WhatsAppAppKind | null> {
  if (Platform.OS === 'android') {
    try {
      const Share = (await import('react-native-share')).default;
      const consumer = await Share.isPackageInstalled(WHATSAPP_PACKAGE);
      if (consumer.isInstalled) return 'consumer';
      const business = await Share.isPackageInstalled(WHATSAPP_BUSINESS_PACKAGE);
      if (business.isInstalled) return 'business';
      return null;
    } catch {
      // Fall through to scheme check
    }
  }

  const schemeOk = await isWhatsAppSchemeAvailable();
  return schemeOk ? 'consumer' : null;
}

/**
 * Open the device WhatsApp app (compose/chat) with phone + prefilled text.
 * Uses the WhatsApp package that is actually installed (Messenger or Business).
 */
async function openDeviceWhatsAppApp(
  phone: string,
  message: string
): Promise<void> {
  const appUrl = getWhatsAppAppUrl(phone, message);
  const encodedText = encodeURIComponent(message);
  const installed = await resolveInstalledWhatsAppApp();

  if (!installed) {
    Alert.alert(
      'WhatsApp Not Installed',
      'Please install WhatsApp or WhatsApp Business to send stall details.'
    );
    return;
  }

  if (Platform.OS === 'android') {
    const packageName =
      installed === 'business' ? WHATSAPP_BUSINESS_PACKAGE : WHATSAPP_PACKAGE;
    const intentUrl =
      `intent://send?phone=${phone}&text=${encodedText}` +
      `#Intent;scheme=whatsapp;package=${packageName};end`;

    try {
      await Linking.openURL(intentUrl);
      return;
    } catch {
      // Fall through to whatsapp://
    }
  }

  await Linking.openURL(appUrl);
}

async function shareViaReactNativeShare(
  message: string,
  phone: string,
  appKind: WhatsAppAppKind,
  pdfUri?: string
): Promise<void> {
  const Share = (await import('react-native-share')).default;
  const social =
    appKind === 'business'
      ? Share.Social.WHATSAPPBUSINESS
      : Share.Social.WHATSAPP;

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
  pdfUri?: string
): Promise<void> {
  await openDeviceWhatsAppApp(phone, message);

  if (pdfUri) {
    const Sharing = await import('expo-sharing');
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Attach Murties Catalog PDF',
      });
    }
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
 * Shared Send Details flow for Enquiries and Tele-calling:
 * - Opens whichever WhatsApp is installed (Messenger or Business)
 * - Prefills the settings enquiry message
 * - Attaches the settings murties catalog PDF when uploaded
 * Never auto-sends — user confirms in WhatsApp.
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
    Alert.alert(
      'WhatsApp Not Installed',
      'Please install WhatsApp or WhatsApp Business to send stall details.'
    );
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
      // If the preferred app failed, try the other WhatsApp package once.
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
        Alert.alert(
          'WhatsApp Not Installed',
          'Please install WhatsApp or WhatsApp Business to send stall details.'
        );
        return;
      }
    }

    await shareNativeFallback(phone, message, shareablePdfUri);
  }
}

/**
 * Enquiries → Send Details — same flow as Tele-calling Send:
 * installed WhatsApp + settings message + settings PDF.
 */
export async function shareEnquiryOnWhatsApp(
  enquiry: Enquiry,
  settings: BusinessSettings
): Promise<void> {
  await shareStallDetailsOnWhatsApp(
    {
      mobile: enquiry.mobile,
      customerName: enquiry.customer_name,
      callDate: enquiry.call_date,
    },
    settings
  );
}

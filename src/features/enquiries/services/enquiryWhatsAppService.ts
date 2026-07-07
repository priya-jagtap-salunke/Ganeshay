import { Platform, Linking, Alert } from 'react-native';
import { BusinessSettings } from '@/types/settings';
import { Enquiry } from '@/types/enquiry';
import {
  formatWhatsAppPhone,
  getWhatsAppAppUrl,
  getWhatsAppWebUrl,
} from '@/features/receipt/utils/whatsappMessage';
import { buildEnquiryWhatsAppMessage } from '../utils/enquiryWhatsAppMessage';
import {
  downloadMurtiesPdfOnWeb,
  ensureShareableMurtiesPdfUri,
} from '@/features/settings/utils/murtiesPdfStorage';

async function isWhatsAppInstalled(): Promise<boolean> {
  try {
    return await Linking.canOpenURL('whatsapp://send');
  } catch {
    return false;
  }
}

async function shareViaReactNativeShare(
  message: string,
  phone: string,
  pdfUri?: string
): Promise<void> {
  const Share = (await import('react-native-share')).default;
  const payload: {
    title: string;
    message: string;
    social: typeof Share.Social.WHATSAPP;
    whatsAppNumber: string;
    url?: string;
    type?: string;
  } = {
    title: 'Stall Enquiry Details',
    message,
    social: Share.Social.WHATSAPP,
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
  const hasWhatsApp = await isWhatsAppInstalled();
  if (!hasWhatsApp) {
    Alert.alert(
      'WhatsApp Not Installed',
      'Please install WhatsApp to send stall details to this enquiry.'
    );
    return;
  }

  await Linking.openURL(getWhatsAppAppUrl(phone, message));

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

export async function shareEnquiryOnWhatsApp(
  enquiry: Enquiry,
  settings: BusinessSettings
): Promise<void> {
  const phone = formatWhatsAppPhone(enquiry.mobile);
  const message = buildEnquiryWhatsAppMessage(settings, enquiry);
  const hasPdf = Boolean(settings.murtiesPdfUri);

  if (Platform.OS === 'web') {
    await shareOnWeb(phone, message, settings);
    return;
  }

  let shareablePdfUri: string | undefined;
  if (hasPdf && settings.murtiesPdfUri) {
    shareablePdfUri = await ensureShareableMurtiesPdfUri(settings.murtiesPdfUri);
  }

  try {
    await shareViaReactNativeShare(message, phone, shareablePdfUri);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);

    if (
      errMsg.toLowerCase().includes('not installed') ||
      errMsg.toLowerCase().includes('whatsapp')
    ) {
      const installed = await isWhatsAppInstalled();
      if (!installed) {
        Alert.alert(
          'WhatsApp Not Installed',
          'Please install WhatsApp to send stall details to this enquiry.'
        );
        return;
      }
    }

    await shareNativeFallback(phone, message, shareablePdfUri);
  }
}

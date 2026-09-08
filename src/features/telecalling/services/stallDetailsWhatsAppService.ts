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
} from '@/features/receipt/utils/whatsappApp';
import { buildStallDetailsWhatsAppMessage } from '../utils/stallDetailsWhatsAppMessage';
import { downloadMurtiesPdfOnWeb } from '@/features/settings/utils/murtiesPdfStorage';
import { downloadTelecallingBannerOnWeb } from '@/features/settings/utils/telecallingBannerStorage';

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
 * Opens WhatsApp / WhatsApp Business directly for this contact with the
 * predrafted message. Never uses Share / Open In (those show Message vs
 * "Open in WhatsApp").
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

  // Deep link only — no Share.shareSingle / UIDocumentInteractionController.
  await openDeviceWhatsAppApp(phone, message, installedApp);
}

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
import { buildStallDetailsWhatsAppMessage } from '@/features/telecalling/utils/stallDetailsWhatsAppMessage';
import { useSettingsStore } from '@/features/settings/store/settingsStore';

export interface TeleMessagingShareRecipient {
  mobile: string;
  customerName?: string | null;
}

/** Website shared instead of Catalogue PDF (Tele-Messaging Send). */
export const BAPPAJI_WEBSITE_URL = 'https://bappaji.com/';

/** Latest Settings for predraft message (stall / location text). */
function resolveLiveSettings(
  settings?: BusinessSettings | null
): BusinessSettings {
  const live = useSettingsStore.getState();
  return {
    ...live,
    ...(settings ?? {}),
  };
}

/**
 * Open WhatsApp with the Settings pre-drafted stall / location message only.
 */
export async function sharePredraftedMessageOnWhatsApp(
  recipient: TeleMessagingShareRecipient,
  settings: BusinessSettings
): Promise<void> {
  const phone = formatWhatsAppPhone(recipient.mobile);
  const resolved = resolveLiveSettings(settings);
  const message = buildStallDetailsWhatsAppMessage(resolved, {
    customerName: recipient.customerName,
  }).trim();

  if (!phone) {
    Alert.alert('Invalid Mobile', 'Customer mobile number is missing or invalid.');
    return;
  }

  if (!message) {
    Alert.alert(
      'Message Missing',
      'Set the Tele-calling / enquiry message in Settings, then try again.'
    );
    return;
  }

  if (Platform.OS === 'web') {
    const url = getWhatsAppWebUrl(phone, message);
    const opened = await Linking.canOpenURL(url);
    if (!opened) {
      Alert.alert('WhatsApp', 'Could not open WhatsApp Web.');
      return;
    }
    await Linking.openURL(url);
    return;
  }

  const installedApp = await resolveInstalledWhatsAppApp();
  if (!installedApp) {
    showWhatsAppMissingAlert();
    return;
  }

  await openDeviceWhatsAppApp(phone, message, installedApp);
}

/**
 * Tele-Messaging → Send website:
 * Opens WhatsApp directly to THIS contact with https://bappaji.com/
 * (no share sheet / contact picker). Replaces Catalogue PDF.
 * @returns true when WhatsApp launched successfully
 */
export async function shareWebsiteOnWhatsApp(
  recipient: TeleMessagingShareRecipient
): Promise<boolean> {
  const phone = formatWhatsAppPhone(recipient.mobile);
  const message = BAPPAJI_WEBSITE_URL;

  if (!phone) {
    Alert.alert('Invalid Mobile', 'Customer mobile number is missing or invalid.');
    return false;
  }

  if (Platform.OS === 'web') {
    const url = getWhatsAppWebUrl(phone, message);
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      Alert.alert('WhatsApp', 'Could not open WhatsApp Web.');
      return false;
    }
  }

  const installedApp = await resolveInstalledWhatsAppApp();
  if (!installedApp) {
    showWhatsAppMissingAlert();
    return false;
  }

  await openDeviceWhatsAppApp(phone, message, installedApp);
  return true;
}
